import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const SESSION_KEY = 'thi_session'

// ─── Local dev fallback ───────────────────────────────────────────────────────
// When running with plain `npm run dev` (Vite only, no serverless runtime),
// the /api/* routes don't exist. This inline validator reads the hardcoded
// dev credentials below and skips the network call entirely.
//
// On Vercel (or `vercel dev`), VITE_DEV_AUTH is NOT set, so the real
// /api/auth/login serverless function is used instead.
//
// TO USE: create a .env file in the project root with:
//   VITE_DEV_AUTH=true
//   VITE_DEV_USERS=admin:admin123:admin,staff:staff123:staff
//
// Format: username:password:role  (comma-separated for multiple users)
// ─────────────────────────────────────────────────────────────────────────────

function localDevLogin(username, password) {
  const raw = import.meta.env.VITE_DEV_USERS || ''
  const users = raw.split(',').map((u) => u.trim()).filter(Boolean)

  for (const entry of users) {
    const [u, p, role] = entry.split(':')
    if (u === username && p === password) {
      return { username: u, role: role || 'staff' }
    }
  }
  throw new Error('Invalid username or password')
}

const IS_LOCAL_DEV = import.meta.env.VITE_DEV_AUTH === 'true'

// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (username, password) => {
    let sessionUser

    if (IS_LOCAL_DEV) {
      // Local dev: validate inline without any network call
      sessionUser = localDevLogin(username, password)
    } else {
      // Production / vercel dev: call the real serverless function
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Login failed')
      }

      const data = await res.json()
      sessionUser = { username: data.username, role: data.role }
    }

    setUser(sessionUser)
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser))
    return sessionUser
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const isAdmin = user?.role === 'admin'
  const isViewer = user?.role === 'viewer'

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isViewer }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}