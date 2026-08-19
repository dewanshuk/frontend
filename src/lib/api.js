const DEFAULT_TIMEOUT_MS = 30_000

function withTimeout(signal, timeoutMs) {
  if (!timeoutMs) return signal
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const onAbort = () => controller.abort()
  if (signal) signal.addEventListener('abort', onAbort, { once: true })

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)
      if (signal) signal.removeEventListener('abort', onAbort)
    },
  }
}

export async function apiFetch(
  path,
  { method = 'GET', baseUrl = import.meta.env.VITE_API_BASE_URL ?? '', headers, body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  const url = `${baseUrl}${path}`
  const timeout = withTimeout(signal, timeoutMs)

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : null),
        ...(headers ?? null),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: timeout?.signal ?? signal,
    })

    const contentType = res.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json')
    const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '')

    if (!res.ok) {
      const message =
        (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
        (typeof payload === 'string' && payload) ||
        `Request failed (${res.status})`
      const err = new Error(message)
      err.status = res.status
      err.payload = payload
      throw err
    }

    return payload
  } finally {
    timeout?.cleanup?.()
  }
}


