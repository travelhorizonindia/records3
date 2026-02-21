/**
 * Base HTTP client for talking to our Vercel serverless API routes.
 * All Google Sheets operations go through /api/sheets
 */

const BASE = ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const err = await res.json()
      message = err.message || message
    } catch {}
    throw new Error(message)
  }

  return res.json()
}

// ── Sheets CRUD ────────────────────────────────────────────────────────────────

export const sheetsAPI = {
  getAll: (sheet) => request(`/api/sheets?sheet=${encodeURIComponent(sheet)}`),

  create: (sheet, data) =>
    request(`/api/sheets?sheet=${encodeURIComponent(sheet)}`, {
      method: 'POST',
      body: data,
    }),

  update: (sheet, data) =>
    request(`/api/sheets?sheet=${encodeURIComponent(sheet)}`, {
      method: 'PUT',
      body: data,
    }),
}

export default sheetsAPI
