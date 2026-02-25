import { useState, useEffect, useCallback } from 'react'

export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: [], loading: true, error: null })

  const execute = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await asyncFn()
      // Always fall back to [] if the response is null/undefined
      setState({ data: data ?? [], loading: false, error: null })
    } catch (err) {
      setState({ data: [], loading: false, error: err.message || 'An error occurred' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    execute()
  }, [execute])

  return { ...state, refetch: execute }
}

export function useAsyncCallback(asyncFn) {
  const [state, setState] = useState({ loading: false, error: null })

  const execute = useCallback(
    async (...args) => {
      setState({ loading: true, error: null })
      try {
        const result = await asyncFn(...args)
        setState({ loading: false, error: null })
        return result
      } catch (err) {
        setState({ loading: false, error: err.message || 'An error occurred' })
        throw err
      }
    },
    [asyncFn]
  )

  return [execute, state]
}
