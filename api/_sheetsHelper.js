/**
 * Google Sheets API helper — used by all serverless API routes.
 * This file is NEVER exposed to the browser.
 * All credentials are read from server-side environment variables.
 */

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

// ─── JWT / OAuth token generation ─────────────────────────────────────────────

/**
 * Build a signed JWT for Google Service Account and exchange it for an access token.
 * We do this manually (no google-auth-library) to keep the bundle tiny.
 */
async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !rawKey) {
    throw new Error('Google service account credentials are not configured.')
  }

  // Normalise escaped newlines that Vercel sometimes stores as literal \n
  const privateKeyPem = cleanPrivateKey(rawKey)

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  const headerB64 = encode(header)
  const payloadB64 = encode(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  // Import the PEM private key
  const keyData = pemToBinary(privateKeyPem)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Sign
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const signatureB64 = arrayBufferToBase64Url(signatureBuffer)
  const jwt = `${signingInput}.${signatureB64}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Failed to get Google access token: ${err}`)
  }

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

/**
 * Robustly cleans the private key from environment variable.
 * Handles all common formats:
 *  - Wrapped in quotes: "-----BEGIN..." or '-----BEGIN...'
 *  - Literal \n characters (escaped newlines stored as two chars)
 *  - Actual newlines (multiline value pasted directly)
 *  - Mixed formats
 */
function cleanPrivateKey(raw) {
  let key = raw

  // Remove surrounding quotes if present (single or double)
  if ((key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1)
  }

  // Replace literal \n (two characters: backslash + n) with actual newlines
  key = key.replace(/\\n/g, '\n')

  // Normalize any \r\n or \r to \n
  key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Ensure the key has proper structure with newlines around the base64 content
  // This handles cases where the header/footer got merged with the content
  key = key
    .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
    .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')

  // Collapse any double newlines that the above may have introduced
  key = key.replace(/\n+/g, '\n').trim()

  return key
}

function pemToBinary(pem) {
  // Extract only the base64 content between the header and footer lines
  const lines = pem.split('\n')
  const base64Lines = lines.filter(
    (line) =>
      line.trim() !== '' &&
      !line.includes('-----BEGIN') &&
      !line.includes('-----END')
  )
  const base64 = base64Lines.join('')

  // Validate — base64 should only contain these characters
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw new Error(
      `Private key contains invalid characters. Please check GOOGLE_PRIVATE_KEY format in your environment variables. ` +
      `Found unexpected characters in base64 content.`
    )
  }

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// ─── Core Sheets operations ───────────────────────────────────────────────────

/**
 * Read all values from a sheet tab.
 * Returns { headers: string[], rows: string[][] }
 */
export async function readSheet(spreadsheetId, sheetName) {
  const token = await getAccessToken()
  const range = encodeURIComponent(`${sheetName}!A:ZZ`)
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to read sheet ${sheetName}: ${err}`)
  }

  const data = await res.json()
  const values = data.values || []
  if (values.length === 0) return { headers: [], rows: [] }

  const headers = values[0]
  const rows = values.slice(1)
  return { headers, rows }
}

/**
 * Append a new row to a sheet.
 */
export async function appendRow(spreadsheetId, sheetName, rowValues) {
  const token = await getAccessToken()
  const range = encodeURIComponent(`${sheetName}!A:A`)
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowValues] }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to append row to ${sheetName}: ${err}`)
  }

  return await res.json()
}

/**
 * Update a specific row by 1-based row index.
 */
export async function updateRow(spreadsheetId, sheetName, rowIndex, rowValues) {
  const token = await getAccessToken()
  const range = encodeURIComponent(`${sheetName}!A${rowIndex}:ZZ${rowIndex}`)
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=RAW`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowValues] }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to update row in ${sheetName}: ${err}`)
  }

  return await res.json()
}

/**
 * Ensure a sheet (tab) exists; if not, create it.
 * Also ensures the header row is present.
 */
export async function ensureSheet(spreadsheetId, sheetName, headers) {
  const token = await getAccessToken()

  // Get spreadsheet metadata
  const metaRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meta = await metaRes.json()
  const existingSheets = (meta.sheets || []).map((s) => s.properties.title)

  if (!existingSheets.includes(sheetName)) {
    // Create the sheet tab
    await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      }),
    })

    // Write headers
    await appendRow(spreadsheetId, sheetName, headers)
  }
}

// Helper: convert headers + data object to ordered row array
export function objectToRow(headers, obj) {
  return headers.map((h) => {
    const v = obj[h]
    if (v === null || v === undefined) return ''
    return String(v)
  })
}

// Helper: convert headers + row array to object
export function rowToObject(headers, row) {
  const obj = {}
  headers.forEach((h, i) => {
    obj[h] = row[i] !== undefined ? row[i] : ''
  })
  return obj
}
