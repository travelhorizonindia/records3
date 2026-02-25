/**
 * Generic Sheets proxy.
 * GET  /api/sheets?sheet=Vehicles           → returns all non-deleted rows
 * GET  /api/sheets?sheet=Vehicles&all=true  → returns all rows including deleted
 * POST /api/sheets?sheet=Vehicles           → append a new row
 * PUT  /api/sheets?sheet=Vehicles           → update an existing row (body must include id/enquiryId)
 *
 * Row identity:
 *  - For EnquiriesBookings, the primary key is `enquiryId`
 *  - For all other sheets, the primary key is `id`
 */

import { readSheet, appendRow, updateRow, objectToRow, rowToObject, ensureSheet } from './_sheetsHelper.js'
import { SHEET_CONFIG, setCors } from './_config.js'

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { sheet, all } = req.query

  if (!sheet || !SHEET_CONFIG[sheet]) {
    return res.status(400).json({ message: `Unknown sheet: ${sheet}` })
  }

  const config = SHEET_CONFIG[sheet]
  const spreadsheetId = config.spreadsheetId()
  const { headers } = config
  const pkField = sheet === 'EnquiriesBookings' ? 'enquiryId' : 'id'

  if (!spreadsheetId || spreadsheetId.includes('<')) {
    return res.status(500).json({
      message: `Spreadsheet ID for "${sheet}" is not configured. Please set the environment variable in Vercel.`,
    })
  }

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      await ensureSheet(spreadsheetId, sheet, headers)
      const { headers: sheetHeaders, rows } = await readSheet(spreadsheetId, sheet)

      // Use sheet headers if they exist, fall back to config headers
      const effectiveHeaders = sheetHeaders.length > 0 ? sheetHeaders : headers

      const objects = rows
        .map((row) => rowToObject(effectiveHeaders, row))
        .filter((obj) => all === 'true' || obj.isDeleted !== 'true')

      // Always return an array, never null
      return res.status(200).json({ data: objects || [], headers: effectiveHeaders })
    }

    // ── POST (create) ─────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      await ensureSheet(spreadsheetId, sheet, headers)
      const body = req.body
      const row = objectToRow(headers, body)
      await appendRow(spreadsheetId, sheet, row)
      return res.status(201).json({ success: true, data: body })
    }

    // ── PUT (update) ──────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const body = req.body
      const pkValue = body[pkField]

      if (!pkValue) {
        return res.status(400).json({ message: `Missing primary key field: ${pkField}` })
      }

      await ensureSheet(spreadsheetId, sheet, headers)
      const { headers: sheetHeaders, rows } = await readSheet(spreadsheetId, sheet)
      const effectiveHeaders = sheetHeaders.length > 0 ? sheetHeaders : headers

      const pkIndex = effectiveHeaders.indexOf(pkField)
      if (pkIndex === -1) {
        return res.status(500).json({ message: `Primary key ${pkField} not found in headers` })
      }

      // Find the row index (1-based, accounting for header row = row 1, first data row = row 2)
      const rowIndex = rows.findIndex((row) => row[pkIndex] === pkValue)
      if (rowIndex === -1) {
        return res.status(404).json({ message: `Record with ${pkField}=${pkValue} not found` })
      }

      // Merge existing with update
      const existing = rowToObject(effectiveHeaders, rows[rowIndex])
      const merged = { ...existing, ...body }
      const updatedRow = objectToRow(effectiveHeaders, merged)

      // rowIndex is 0-based among data rows; +2 for 1-based + header row
      await updateRow(spreadsheetId, sheet, rowIndex + 2, updatedRow)
      return res.status(200).json({ success: true, data: merged })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (err) {
    console.error(`[sheets API] Error on sheet=${sheet} method=${req.method}:`, err)
    // Return empty data instead of crashing the frontend
    if (req.method === 'GET') {
      return res.status(200).json({ data: [], headers, error: err.message })
    }
    return res.status(500).json({ message: err.message || 'Internal server error' })
  }
}
