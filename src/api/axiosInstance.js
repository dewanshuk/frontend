import axios from 'axios'
import { getAccessToken, isAzureAdEnabled } from '../lib/auth'

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const extractErrorDetail = (detail) => {
  if (typeof detail === 'string' && detail.trim()) return detail

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first === 'string' && first.trim()) return first
    if (typeof first?.msg === 'string' && first.msg.trim()) return first.msg
  }

  return null
}

const parseBlobErrorData = async (data) => {
  if (!(data instanceof Blob)) return data

  const contentType = data.type || ''
  if (!contentType.includes('application/json')) return data

  try {
    const text = await data.text()
    return text ? JSON.parse(text) : data
  } catch {
    return data
  }
}

const attachInterceptors = (instance) => {
  // Attach JWT bearer token to every request.
  // Prefer MSAL silent token acquisition; fall back to localStorage 'token'.
  instance.interceptors.request.use(
    async (config) => {
      let token = null

      if (isAzureAdEnabled()) {
        token = await getAccessToken()
      }

      if (!token && typeof window !== 'undefined') {
        token = window.localStorage?.getItem?.('token') ?? null
      }

      if (token) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  // Handle errors globally for all axios requests.
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status
      const rawData = error?.response?.data ?? error?.response
      const data = await parseBlobErrorData(rawData)
      const detailMessage = extractErrorDetail(data?.detail)
      const message =
        data?.message ??
        data?.error ??
        detailMessage ??
        (typeof data === 'string' ? data : null) ??
        error?.message ??
        'Request failed'

      console.log('axios message', error?.response?.data)
      if (status === 401 && typeof window !== 'undefined') {
        window.localStorage?.removeItem?.('token')
      }

      console.error('Axios request error:', { status, message, data })

      const err = error instanceof Error ? error : new Error(message)
      err.status = status
      err.payload = data
      err.message = message

      return Promise.reject(err)
    },
  )

  return instance
}

export const createApiClient = (baseURL = DEFAULT_API_BASE_URL) =>
  attachInterceptors(
    axios.create({
      baseURL,
      timeout: 90000,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  )

export const genericApi = createApiClient(
  import.meta.env.VITE_GENERIC_API_BASE_URL ?? DEFAULT_API_BASE_URL,
)

export const docEventsApi = createApiClient(
  import.meta.env.VITE_DOC_EVENTS_API_BASE_URL ?? DEFAULT_API_BASE_URL,
)

export const userManagementApi = createApiClient(
  import.meta.env.VITE_USER_MANAGEMENT_API_BASE_URL ?? DEFAULT_API_BASE_URL,
)

export const trainingApi = createApiClient(
  import.meta.env.VITE_TRAINING_API_BASE_URL ?? DEFAULT_API_BASE_URL,
)

export const complianceApi = createApiClient(
  import.meta.env.VITE_COMPLIANCE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
)

export const auditApi = createApiClient(
  import.meta.env.VITE_AUDIT_API_BASE_URL ??
    import.meta.env.VITE_COMPLIANCE_API_BASE_URL ??
    DEFAULT_API_BASE_URL,
)

const axiosInstance = genericApi

const isNil = (v) => v === undefined || v === null

// Convert a plain query object into a query-string.
// - Omits `undefined`/`null` values.
// - Supports `array<string>` by repeating the key: `doc_types=a&doc_types=b`.
export const buildQueryString = (query = {}) => {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (isNil(value)) return

    if (Array.isArray(value)) {
      value
        .filter((v) => !isNil(v))
        .forEach((v) => params.append(key, String(v)))
      return
    }

    params.set(key, String(value))
  })

  return params.toString()
}

// Append the serialized query-string to a URL (if any).
export const withQueryString = (url, query) => {
  const queryString = buildQueryString(query)
  return queryString ? `${url}?${queryString}` : url
}

// Shared GET helper so API modules don't duplicate query serialization logic.
export const apiGet = (url, { query, ...config } = {}) =>
  axiosInstance.get(withQueryString(url, query), config)

export const docEventsApiGet = (url, { query, ...config } = {}) =>
  docEventsApi.get(withQueryString(url, query), config)

export default axiosInstance

