import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'

/**
 * Minimal API query hook:
 * - handles loading/error/data
 * - aborts in-flight request on param change/unmount
 * - supports manual refetch
 */
export function useApiQuery(key, queryFn, { enabled = true } = {}) {
  const [state, setState] = useState({
    data: null,
    error: null,
    isLoading: Boolean(enabled),
  })

  const keyString = useMemo(() => JSON.stringify(key ?? null), [key])
  const abortRef = useRef(null)

  const run = async () => {
    if (!enabled) return

    abortRef.current?.abort?.()
    const controller = new AbortController()
    abortRef.current = controller

    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const data = await queryFn({ signal: controller.signal, apiFetch })
      setState({ data, error: null, isLoading: false })
      return data
    } catch (err) {
      if (err?.name === 'AbortError') return
      setState({ data: null, error: err, isLoading: false })
    }
  }

  useEffect(() => {
    run()
    return () => abortRef.current?.abort?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyString, enabled])

  return {
    ...state,
    refetch: run,
  }
}


