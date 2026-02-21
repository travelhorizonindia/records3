import { v4 as uuidv4 } from 'uuid'

// Generate UUID
export const generateId = () => uuidv4()

// Generate Enquiry ID: YYMMDDEXXX
export const generateEnquiryId = (existingIds = []) => {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `${yy}${mm}${dd}E`

  const todaysIds = existingIds.filter((id) => id && id.startsWith(prefix))
  const maxSerial = todaysIds.reduce((max, id) => {
    const serial = parseInt(id.replace(prefix, ''), 10)
    return isNaN(serial) ? max : Math.max(max, serial)
  }, 0)

  return `${prefix}${String(maxSerial + 1).padStart(3, '0')}`
}

// Generate Booking ID: YYMMBNNN
export const generateBookingId = (existingIds = []) => {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `${yy}${mm}B`

  const monthIds = existingIds.filter((id) => id && id.startsWith(prefix))
  const maxSerial = monthIds.reduce((max, id) => {
    const serial = parseInt(id.replace(prefix, ''), 10)
    return isNaN(serial) ? max : Math.max(max, serial)
  }, 0)

  return `${prefix}${String(maxSerial + 1).padStart(3, '0')}`
}

// Get system timestamps for record creation
export const getCreateMeta = (username) => ({
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: username,
  updatedBy: username,
  isDeleted: false,
})

// Get system timestamps for record update
export const getUpdateMeta = (username) => ({
  updatedAt: new Date().toISOString(),
  updatedBy: username,
})

// Format date for display
export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// Format datetime for display
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// Format currency
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

// Calculate days until date (negative = already expired)
export const daysUntil = (dateStr) => {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

// Check if a date is within next N days
export const isWithinDays = (dateStr, days) => {
  const d = daysUntil(dateStr)
  return d !== null && d <= days
}

// Convert row array + headers to object
export const rowToObject = (headers, row) => {
  const obj = {}
  headers.forEach((h, i) => {
    obj[h] = row[i] !== undefined ? row[i] : ''
  })
  return obj
}

// Convert object to row array using headers order
export const objectToRow = (headers, obj) => {
  return headers.map((h) => {
    const val = obj[h]
    if (val === null || val === undefined) return ''
    return String(val)
  })
}

// Simple debounce
export const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// Today's date as YYYY-MM-DD
export const todayISO = () => new Date().toISOString().split('T')[0]

// Check if date string is today
export const isToday = (dateStr) => {
  if (!dateStr) return false
  return dateStr.split('T')[0] === todayISO()
}

// Check if datetime is within next N days (inclusive of today)
export const isWithinNextDays = (dateStr, n) => {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const future = new Date(today)
  future.setDate(future.getDate() + n)
  return d >= today && d <= future
}
