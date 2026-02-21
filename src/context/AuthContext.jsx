import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const SESSION_KEY = 'thi_session'

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
    // Call our serverless API to validate credentials
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
    const sessionUser = { username: data.username, role: data.role }
    setUser(sessionUser)
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser))
    return sessionUser
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
