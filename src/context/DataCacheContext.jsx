import { createContext, useContext, useState, useCallback } from 'react'

const DataCacheContext = createContext(null)

export const DataCacheProvider = ({ children }) => {
  const [cache, setCache] = useState({})

  const set = useCallback((key, data) => {
    setCache((prev) => ({ ...prev, [key]: { data, ts: Date.now() } }))
  }, [])

  const get = useCallback(
    (key, maxAgeMs = 60_000) => {
      const entry = cache[key]
      if (!entry) return null
      if (Date.now() - entry.ts > maxAgeMs) return null
      return entry.data
    },
    [cache]
  )

  const invalidate = useCallback((key) => {
    setCache((prev) => {
      const next = { ...prev }
      if (key) {
        delete next[key]
      } else {
        return {}
      }
      return next
    })
  }, [])

  return (
    <DataCacheContext.Provider value={{ set, get, invalidate }}>
      {children}
    </DataCacheContext.Provider>
  )
}

export const useDataCache = () => useContext(DataCacheContext)
