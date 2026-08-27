import { genericApi, buildQueryString } from "./axiosInstance"

const toCamel = (s) => String(s).replace(/_([a-z])/g, (_, c) => c.toUpperCase())

function transformKeys(obj) {
  if (obj == null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(transformKeys)

  const out = {}
  for (const k of Object.keys(obj)) {
    out[toCamel(k)] = transformKeys(obj[k])
  }
  return out
}

const unwrapCompliancePayload = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw
  }

  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    return { ...raw, ...unwrapCompliancePayload(raw.data) }
  }

  return raw
}

/** Normalize conversation arrays from GET /api/compliance/conversation/{record_id}. */
export const extractConversationEntries = (payload) => {
  const data = unwrapCompliancePayload(payload)
  if (!data) return []
  if (Array.isArray(data)) return data

  const candidates = [
    data.conversation,
    data.messages,
    data.history,
    data.responses,
    data.thread,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
    if (
      candidate &&
      typeof candidate === "object" &&
      Array.isArray(candidate.conversation)
    ) {
      return candidate.conversation
    }
    if (
      candidate &&
      typeof candidate === "object" &&
      Array.isArray(candidate.messages)
    ) {
      return candidate.messages
    }
  }

  return []
}

/** True when a date field from the backend is non-empty. */
const isPresentBackendDate = (value) => {
  if (value === undefined || value === null) return false
  if (typeof value === "string" && !String(value).trim()) return false
  return true
}

/**
 * Read Created On from backend respond/detail payloads only (no list-row fallbacks).
 * Supports common API aliases before/after camelCase transform.
 */
export const pickBackendCreatedOn = (...sources) => {
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue
    const candidates = [
      source.createdOn,
      source.created_on,
      source.createdAt,
      source.created_at,
      source.createdDate,
      source.created_date,
      source.submittedOn,
      source.submitted_on,
    ]
    for (const candidate of candidates) {
      if (isPresentBackendDate(candidate)) return candidate
    }
  }
  return undefined
}

/**
 * Read Closure Date from backend respond/detail payloads only (no list-row fallbacks).
 * Supports common API aliases before/after camelCase transform.
 */
export const pickBackendClosureDate = (...sources) => {
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue
    const candidates = [
      source.closureDate,
      source.closure_date,
      source.closedAt,
      source.closed_at,
      source.closedOn,
      source.closed_on,
      source.completedOn,
      source.completed_on,
      source.completionDate,
      source.completion_date,
    ]
    for (const candidate of candidates) {
      if (isPresentBackendDate(candidate)) return candidate
    }
  }
  return undefined
}

const isPresentBackendText = (value) => {
  if (value === undefined || value === null) return false
  return String(value).trim() !== ""
}

/**
 * Read closing remarks from backend respond/detail payloads.
 * Self-declaration GET uses `remarks` / `closingRemarks`; conversation APIs use `closureRemarks`.
 */
export const pickBackendClosureRemarks = (...sources) => {
  for (const source of sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue
    const candidates = [
      source.closureRemarks,
      source.closure_remarks,
      source.closingRemarks,
      source.closing_remarks,
      source.closeRemarks,
      source.close_remarks,
      source.closureRemark,
      source.closure_remark,
      source.remarks,
    ]
    for (const candidate of candidates) {
      if (isPresentBackendText(candidate)) return String(candidate).trim()
    }
  }
  return undefined
}

/** Preserve record details when conversation is a nested object wrapper. */
export const normalizeComplianceConversationResponse = (rawPayload) => {
  const data = unwrapCompliancePayload(rawPayload)
  if (!data) return { conversation: [] }
  if (Array.isArray(data)) return { conversation: data }

  const result = { ...data }
  let entries = []
  const conversationNode = data.conversation
  let conversationEnvelope = null

  if (Array.isArray(conversationNode)) {
    entries = conversationNode
  } else if (conversationNode && typeof conversationNode === "object") {
    const { conversation: nestedConversation, messages: nestedMessages, ...envelope } =
      conversationNode
    conversationEnvelope = envelope
    Object.assign(result, envelope)
    if (Array.isArray(nestedConversation)) {
      entries = nestedConversation
    } else if (Array.isArray(nestedMessages)) {
      entries = nestedMessages
    }
  }

  if (entries.length === 0) {
    entries = extractConversationEntries(data)
  }

  const detailSources = [data.details, data.record, data.metadata].filter(
    (value) => value && typeof value === "object" && !Array.isArray(value),
  )
  detailSources.forEach((source) => {
    Object.assign(result, source)
  })

  result.conversation = entries

  // Canonicalize dates from backend field aliases (root → envelope → details → merge result).
  // Do not derive from conversation message timestamps or dashboard list rows.
  const dateSources = [data, conversationEnvelope, ...detailSources, result]
  const createdOn = pickBackendCreatedOn(...dateSources)
  const closureDate = pickBackendClosureDate(...dateSources)
  const closureRemarks = pickBackendClosureRemarks(...dateSources)
  if (createdOn !== undefined) result.createdOn = createdOn
  if (closureDate !== undefined) result.closureDate = closureDate
  if (closureRemarks !== undefined) result.closureRemarks = closureRemarks

  return result
}

/**
 * Build query params for compliance dashboard and export APIs.
 */
export function buildComplianceDashboardParams({
  tab = "pending",
  search = "",
  page,
  page_size,
  type,
  sub_type,
  response_status,
  overall_status,
  updated_on_start,
  updated_on_end,
  response_due_start,
  response_due_end,
  includePagination = true,
} = {}) {
  const params = { tab }

  if (includePagination) {
    if (page != null) params.page = page
    if (page_size != null) params.page_size = page_size
  }

  const q = typeof search === "string" ? search.trim() : ""
  if (q.length >= 3) params.search = q

  if (Array.isArray(type) && type.length > 0) {
    params.type = type.map((value) => String(value).trim()).filter(Boolean)
  } else if (typeof type === "string" && type.trim()) {
    params.type = [type.trim()]
  }

  const multiValueFields = [
    ["sub_type", sub_type],
    ["response_status", response_status],
    ["overall_status", overall_status],
  ]

  multiValueFields.forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      params[key] = value.map((item) => String(item).trim()).filter(Boolean)
      return
    }
    if (typeof value === "string" && value.trim()) {
      params[key] = [value.trim()]
    }
  })

  const dateValues = {
    updated_on_start,
    updated_on_end,
    response_due_start,
    response_due_end,
  }

  Object.entries(dateValues).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      params[key] = value.trim()
    }
  })

  return params
}

/**
 * Fetch compliance dashboard data.
 */
export const getComplianceDashboard = async (options = {}) => {
  const params = buildComplianceDashboardParams(options)
  const resp = await genericApi.get(`/api/compliance/dashboard?${buildQueryString(params)}`)
  const data = resp.data || {}

  return {
    ...data,
    items: Array.isArray(data.items) ? data.items.map(transformKeys) : data.items,
    summary: data.summary ? transformKeys(data.summary) : data.summary,
    pageSize: data.page_size ?? data.pageSize ?? undefined,
  }
}

/**
 * Export compliance dashboard records to xlsx using the same filters as dashboard.
 */
export const exportComplianceDashboard = async (options = {}) => {
  const params = buildComplianceDashboardParams({ ...options, includePagination: false })
  const resp = await genericApi.get(`/api/compliance/dashboard/export?${buildQueryString(params)}`, {
    responseType: "blob",
  })
  return resp
}

export const raiseComplianceQuery = async ({ queryType, title, description, files = [] } = {}) => {
  const formData = new FormData()
  formData.append("queryType", queryType)
  formData.append("title", title)
  formData.append("description", description)

  if (Array.isArray(files)) {
    files.forEach((file) => {
      if (file instanceof File) {
        formData.append("files", file)
      }
    })
  }

  const resp = await genericApi.post("/api/compliance/query", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return resp.data
}

export const raiseComplianceComplaint = async ({ complaintType, complaintDetails, files = [] } = {}) => {
  const formData = new FormData()
  formData.append("complaintType", complaintType)
  formData.append("complaintDetails", complaintDetails)

  if (Array.isArray(files)) {
    files.forEach((file) => {
      if (file instanceof File) {
        formData.append("files", file)
      }
    })
  }

  const resp = await genericApi.post("/api/compliance/complaint", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return resp.data
}

export const raiseComplianceGift = async ({
  title,
  description,
  status,
  person,
  organization,
  approxValueINR,
  portalApprovalTaken,
  portalNumber = "",
  files = [],
} = {}) => {
  const formData = new FormData()
  formData.append("title", title ?? "")
  formData.append("description", description ?? "")
  formData.append("status", status)
  formData.append("person", person)
  formData.append("organization", organization)
  formData.append("approxValueINR", approxValueINR)
  formData.append("portalApprovalTaken", portalApprovalTaken)

  const trimmedPortalNumber = typeof portalNumber === "string" ? portalNumber.trim() : ""
  if (trimmedPortalNumber) {
    formData.append("portalNumber", trimmedPortalNumber)
  }

  if (Array.isArray(files)) {
    files.forEach((file) => {
      if (file instanceof File) {
        formData.append("files", file)
      }
    })
  }

  const resp = await genericApi.post("/api/compliance/gift", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return resp.data
}

/**
 * Save annual declaration responses (draft or submit).
 * POST /api/compliance/declarations/save-declaration/{declaration_id}
 */
export const saveAnnualDeclaration = async ({
  declarationId,
  status,
  responses = [],
  files = [],
} = {}) => {
  const id = String(declarationId ?? "").trim()
  if (!id) {
    throw new Error("declaration_id is required")
  }

  const normalizedStatus = String(status ?? "").trim().toLowerCase()
  if (normalizedStatus !== "draft" && normalizedStatus !== "submit") {
    throw new Error('status must be "draft" or "submit"')
  }

  if (!Array.isArray(responses)) {
    throw new Error("responses must be an array")
  }

  try {
    // Build multipart/form-data: responses JSON + file attachments
    const form = new FormData()
    form.append("status", normalizedStatus)
    form.append("responses", JSON.stringify(responses))

    if (Array.isArray(files)) {
      files.forEach((file) => {
        if (file instanceof File) {
          form.append("files", file)
        }
      })
    }

    const resp = await genericApi.post(
      `/api/compliance/declarations/save-declaration/${encodeURIComponent(id)}?status=${encodeURIComponent(normalizedStatus)}`,
      form,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    )
    return resp.data
  } catch (error) {
    throw buildApiError(error, "Failed to save annual declaration.")
  }
}

/**
 * Fetch saved annual declaration responses (e.g. draft restore).
 * GET /api/compliance/declarations/declaration-responses/{declaration_id}
 */
export const getAnnualDeclarationResponses = async (declarationId) => {
  const id = String(declarationId ?? "").trim()
  if (!id) {
    throw new Error("declaration_id is required")
  }

  try {
    const resp = await genericApi.get(
      `/api/compliance/declarations/declaration-responses/${encodeURIComponent(id)}`,
    )
    const raw = resp.data || {}
    const payload =
      raw?.data && typeof raw.data === "object" && !Array.isArray(raw.data)
        ? raw.data
        : raw
    return transformKeys(payload)
  } catch (error) {
    throw buildApiError(error, "Failed to load annual declaration responses.")
  }
}

export const saveSelfDeclaration = async ({
  declaration_type,
  status,
  subType,
  id,
  description,
  rows,
  formData,
  files = [],
} = {}) => {
  const form = new FormData()
  form.append("declaration_type", declaration_type)
  form.append("status", status)
  form.append("subType", subType)

  if (id) {
    form.append("id", id)
  }

  if (description) {
    form.append("description", description)
  }

  if (rows) {
    form.append("rows", typeof rows === "string" ? rows : JSON.stringify(rows))
  }

  if (formData) {
    form.append("formData", typeof formData === "string" ? formData : JSON.stringify(formData))
  }

  if (Array.isArray(files)) {
    files.forEach((file) => {
      if (file instanceof File) {
        form.append("files", file)
      }
    })
  }

  const resp = await genericApi.post("/api/compliance/self-declaration", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return resp.data
}

/**
 * Fetch a self-declaration record by request/record id for the respond modal.
 * GET /api/compliance/self-declaration/{recordId}
 */
export const getSelfDeclaration = async (recordId) => {
  const id = String(recordId ?? "").trim()
  if (!id) {
    throw new Error("record_id is required")
  }

  const resp = await genericApi.get(`/api/compliance/self-declaration/${encodeURIComponent(id)}`)
  const raw = resp.data || {}
  const payload =
    raw?.data && typeof raw.data === "object" && !Array.isArray(raw.data)
      ? raw.data
      : raw
  // Flatten nested conversation envelope so createdOn / closureDate surface from the API.
  return normalizeComplianceConversationResponse(transformKeys(payload))
}

/**
 * Add a response to a compliance record.
 * POST /api/compliance/respond/{recordId} (multipart/form-data)
 */
export const respondToComplianceRecord = async ({
  recordId,
  message,
  files = [],
} = {}) => {
  const id = String(recordId ?? "").trim()
  if (!id) {
    throw new Error("record_id is required")
  }

  const form = new FormData()
  form.append("message", String(message ?? "").trim())

  if (Array.isArray(files)) {
    files.forEach((file) => {
      if (file instanceof File) {
        form.append("files", file)
      }
    })
  }

  const resp = await genericApi.post(
    `/api/compliance/respond/${encodeURIComponent(id)}`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  )

  return resp.data
}

/**
 * Fetch conversation history for a compliance record (e.g. Gift Declaration).
 * GET /api/compliance/conversation/{recordId}
 */
export const getComplianceConversation = async (recordId) => {
  const id = String(recordId ?? "").trim()
  if (!id) {
    throw new Error("record_id is required")
  }

  try {
    const resp = await genericApi.get(`/api/compliance/conversation/${encodeURIComponent(id)}`)
    return normalizeComplianceConversationResponse(transformKeys(resp.data || {}))
  } catch (error) {
    throw buildApiError(error, "Failed to load conversation.")
  }
}

/**
 * Close / mark a compliance record as complete.
 * POST /api/compliance/close/{recordId}
 * Content-Type: application/x-www-form-urlencoded
 * Body: remarks (string)
 */
export const closeComplianceRecord = async (recordId, { remarks } = {}) => {
  const id = String(recordId ?? "").trim()
  if (!id) {
    throw new Error("record_id is required")
  }

  const trimmedRemarks = String(remarks ?? "").trim()
  if (!trimmedRemarks) {
    throw new Error("remarks is required")
  }

  const params = new URLSearchParams()
  params.append("remarks", trimmedRemarks)

  try {
    const resp = await genericApi.post(
      `/api/compliance/close/${encodeURIComponent(id)}`,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    )
    return resp.data
  } catch (error) {
    throw buildApiError(error, "Failed to mark record as complete.")
  }
}

const buildApiError = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail ?? error?.payload?.detail
  let message = fallbackMessage

  if (typeof detail === "string" && detail.trim()) {
    message = detail
  } else if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    message = typeof first === "string" ? first : first?.msg || fallbackMessage
  } else if (error?.message) {
    message = error.message
  }

  const enhancedError = new Error(message)
  enhancedError.status = error?.response?.status ?? error?.status
  enhancedError.payload = error?.response?.data ?? error?.payload
  return enhancedError
}

/**
 * View a compliance query with conversation history.
 * GET /api/compliance/query/{query_id}
 */
export const getComplianceQuery = async (queryId) => {
  const id = String(queryId ?? "").trim()
  if (!id) {
    throw new Error("query_id is required")
  }

  try {
    const resp = await genericApi.get(`/api/compliance/query/${encodeURIComponent(id)}`)
    return transformKeys(resp.data || {})
  } catch (error) {
    throw buildApiError(error, "Failed to load query details.")
  }
}

/**
 * Respond to a compliance query.
 * POST /api/compliance/query/{query_id}/respond (multipart/form-data)
 */
export const respondToComplianceQuery = async ({
  queryId,
  message,
  files = [],
} = {}) => {
  const id = String(queryId ?? "").trim()
  if (!id) {
    throw new Error("query_id is required")
  }

  const trimmedMessage = String(message ?? "").trim()
  if (!trimmedMessage) {
    throw new Error("message is required")
  }

  const form = new FormData()
  form.append("message", trimmedMessage)

  if (Array.isArray(files)) {
    files.forEach((file) => {
      if (file instanceof File) {
        form.append("files", file)
      }
    })
  }

  try {
    const resp = await genericApi.post(
      `/api/compliance/query/${encodeURIComponent(id)}/respond`,
      form,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    )
    return resp.data
  } catch (error) {
    throw buildApiError(error, "Failed to submit query response.")
  }
}

/**
 * Close a compliance query (same unified close API as other record types).
 * POST /api/compliance/close/{query_id} (application/x-www-form-urlencoded)
 * Body: remarks
 */
export const closeComplianceQuery = async ({ queryId, remarks, comment } = {}) => {
  return closeComplianceRecord(queryId, { remarks: remarks ?? comment })
}

/**
 * Download a compliance attachment by storage path.
 * GET /api/compliance/querys/files?path=...
 */
export const downloadComplianceFile = async (path) => {
  const filePath = String(path ?? "").trim()
  if (!filePath) {
    throw new Error("path is required")
  }

  try {
    const resp = await genericApi.get("/api/compliance/querys/files", {
      params: { path: filePath },
      responseType: "blob",
    })
    return resp
  } catch (error) {
    throw buildApiError(error, "Failed to download file.")
  }
}

const extractFileNameFromPath = (path) => {
  const text = String(path ?? "").trim()
  if (!text) return "download"
  const parts = text.split(/[/\\]/)
  return parts[parts.length - 1] || "download"
}

const extractFileNameFromDisposition = (disposition) => {
  const value = String(disposition ?? "")
  const utfMatch = value.match(/filename\*=(?:UTF-8''|utf-8'')([^;]+)/i)
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].trim().replace(/^["']|["']$/g, ""))
    } catch {
      return utfMatch[1].trim().replace(/^["']|["']$/g, "")
    }
  }
  const plainMatch = value.match(/filename=(?:["']?)([^"';]+)/i)
  if (plainMatch?.[1]) return plainMatch[1].trim()
  return null
}

/**
 * Assign an admin to a compliance record.
 * PUT /api/compliance/assign/{recordId}
 * Body: { staff_id }
 */
export const assignComplianceAdmin = async ({ recordId, staffId } = {}) => {
  const id = String(recordId ?? "").trim()
  if (!id) {
    throw new Error("record_id is required")
  }

  const staff_id = String(staffId ?? "").trim()
  if (!staff_id) {
    throw new Error("staff_id is required")
  }

  try {
    const resp = await genericApi.put(
      `/api/compliance/assign/${encodeURIComponent(id)}`,
      { staff_id },
    )
    return resp.data
  } catch (error) {
    throw buildApiError(error, "Failed to assign admin.")
  }
}

/**
 * Read request_id from a create/submit API payload (query, complaint, gift, self-declaration).
 */
export const pickCreatedRequestId = (payload) => {
  const root = unwrapCompliancePayload(payload)
  const sources = []
  if (root && typeof root === "object" && !Array.isArray(root)) {
    sources.push(root)
    if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
      sources.push(root.data)
    }
  }

  const keys = [
    "request_id",
    "requestId",
    "record_id",
    "recordId",
    "query_id",
    "queryId",
    "complaint_id",
    "complaintId",
    "id",
  ]

  for (const source of sources) {
    for (const key of keys) {
      const value = String(source?.[key] ?? "").trim()
      if (value) return value
    }
  }

  return ""
}

/**
 * Kick off similar-request generation after a record is created.
 * POST /api/compliance/generate-similar-requests
 * Body: { request_id }
 */
export const generateSimilarRequests = async (requestId) => {
  const id = String(requestId ?? "").trim()
  if (!id) {
    throw new Error("request_id is required")
  }

  try {
    const resp = await genericApi.post("/api/compliance/generate-similar-requests", {
      request_id: id,
    })
    return resp.data
  } catch (error) {
    throw buildApiError(error, "Failed to generate similar requests.")
  }
}

/**
 * Generate similar requests from a create API response without failing the create flow.
 */
export const generateSimilarRequestsFromCreateResult = async (createResult) => {
  const requestId = pickCreatedRequestId(createResult)
  if (!requestId) {
    console.warn("Skipping generate-similar-requests: request_id missing from create response")
    return null
  }

  try {
    return await generateSimilarRequests(requestId)
  } catch (error) {
    console.error("Failed to generate similar requests", error)
    return null
  }
}

/**
 * Fetch similar requests for a compliance record.
 * GET /api/compliance/similar-requests/{requestId}
 */
export const getSimilarRequests = async (requestId) => {
  const id = String(requestId ?? "").trim()
  if (!id) {
    throw new Error("request_id is required")
  }

  try {
    const resp = await genericApi.get(
      `/api/compliance/similar-requests/${encodeURIComponent(id)}`,
    )
    const data = unwrapCompliancePayload(resp.data || {})
    const list =
      (Array.isArray(data) ? data : null) ??
      data?.similar_requests ??
      data?.similarRequests ??
      []

    return Array.isArray(list) ? list.map(transformKeys) : []
  } catch (error) {
    throw buildApiError(error, "Failed to load similar requests.")
  }
}

/**
 * Fetch a compliance file by path and trigger a browser download.
 * Never navigates to the path as a page URL (that opens a blank app shell).
 */
export const openComplianceFileDownload = async (path) => {
  const filePath = String(path ?? "").trim()
  if (!filePath) {
    throw new Error("path is required")
  }

  // Prefer the files API for everything that is not an external CDN/blob URL
  // (keeps prior authenticated download behavior for storage keys).
  let apiPath = filePath
  const isAbsoluteHttp = /^https?:\/\//i.test(filePath)

  if (isAbsoluteHttp) {
    try {
      const parsed = new URL(filePath)
      const appOrigin =
        typeof window !== "undefined" ? window.location.origin : ""

      // Same-origin absolute URLs would open the SPA shell if used as links —
      // strip to path and download via API instead.
      if (appOrigin && parsed.origin === appOrigin) {
        apiPath =
          `${parsed.pathname}${parsed.search}`.replace(/^\//, "") ||
          parsed.pathname.replace(/^\//, "")
      } else {
        // External host (e.g. Azure SAS): open directly, no SPA routing.
        const anchor = document.createElement("a")
        anchor.href = filePath
        anchor.target = "_blank"
        anchor.rel = "noopener noreferrer"
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        return { fileName: extractFileNameFromPath(filePath) }
      }
    } catch {
      // Invalid absolute URL — fall through with raw path for the files API.
    }
  }

  // Storage keys: keep original form when possible; strip only a single leading slash
  // so "/foo/bar" and "foo/bar" both work for APIs that reject double-slash styles.
  const candidates = []
  const trimmed = String(apiPath || "").trim()
  if (trimmed) candidates.push(trimmed)
  if (trimmed.startsWith("/")) {
    candidates.push(trimmed.replace(/^\/+/, ""))
  } else if (trimmed) {
    candidates.push(`/${trimmed}`)
  }

  let response
  let lastError
  for (const candidate of candidates) {
    try {
      response = await downloadComplianceFile(candidate)
      if (response?.data instanceof Blob) break
    } catch (error) {
      lastError = error
    }
  }

  if (!(response?.data instanceof Blob)) {
    if (lastError) throw lastError
    throw new Error("Invalid file response.")
  }

  const blob = response.data

  // HTML or JSON blob usually means auth/error page — do not treat as a file download.
  const contentType = String(
    response?.headers?.["content-type"] || blob.type || "",
  ).toLowerCase()
  if (
    contentType.includes("application/json") ||
    contentType.includes("text/html")
  ) {
    const text = await blob.text()
    let message = "Unable to download file."
    if (contentType.includes("application/json")) {
      try {
        const parsed = JSON.parse(text)
        message =
          parsed?.message || parsed?.detail || parsed?.error || message
      } catch {
        // ignore parse failure
      }
    }
    throw new Error(String(message))
  }

  const fileName =
    extractFileNameFromDisposition(response.headers?.["content-disposition"]) ||
    extractFileNameFromPath(trimmed || filePath)

  const blobUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = blobUrl
  anchor.download = fileName
  anchor.rel = "noopener"
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Keep blob URL briefly so the download can start; never navigate with it.
  window.setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl)
  }, 60_000)

  return { fileName }
}

export default {
  getComplianceDashboard,
  exportComplianceDashboard,
  buildComplianceDashboardParams,
  raiseComplianceQuery,
  raiseComplianceComplaint,
  raiseComplianceGift,
  saveAnnualDeclaration,
  getAnnualDeclarationResponses,
  saveSelfDeclaration,
  getSelfDeclaration,
  getComplianceConversation,
  extractConversationEntries,
  normalizeComplianceConversationResponse,
  pickBackendCreatedOn,
  pickBackendClosureDate,
  pickBackendClosureRemarks,
  respondToComplianceRecord,
  closeComplianceRecord,
  getComplianceQuery,
  respondToComplianceQuery,
  closeComplianceQuery,
  downloadComplianceFile,
  openComplianceFileDownload,
  assignComplianceAdmin,
  pickCreatedRequestId,
  generateSimilarRequests,
  generateSimilarRequestsFromCreateResult,
  getSimilarRequests,
}
