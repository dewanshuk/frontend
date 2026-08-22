/**
 * Compliance Helpdesk URL state management utilities.
 * Provides a single source of truth for parsing and building compliance URLs.
 *
 * URL Pattern: /compliance?type={type}&id={id}&mode={mode}&tab={tab}[&annualType=COBCE|COI]
 *               [&filter_<key>=...][&search=...][&page=N][&pageSize=N]
 *
 * Examples:
 * - /compliance?tab=due-to-respond
 * - /compliance?tab=all&filter_type=query,gift&filter_response_status=Overdue
 * - /compliance?tab=all&search=EMP123&page=2&pageSize=25
 * - /compliance?type=query&id=123&mode=view&tab=due-to-respond
 * - /compliance?type=annual&id=456&mode=respond&annualType=COBCE&tab=all
 * - /compliance?type=self-declaration&id=789&mode=view&tab=all
 */

import { normalizeAnnualDeclarationType } from "./annualDeclarationUtils"

// Compliance types that can be opened in modals
export const COMPLIANCE_TYPES = {
  QUERY: "query",
  COMPLAINT: "complaint",
  GIFT: "gift",
  SELF_DECLARATION: "self-declaration",
  ANNUAL: "annual",
}

// Valid tabs
export const COMPLIANCE_TABS = {
  DUE_TO_RESPOND: "due-to-respond",
  ALL: "all",
}

// Default tab
export const DEFAULT_TAB = COMPLIANCE_TABS.DUE_TO_RESPOND

// Valid modes
export const COMPLIANCE_MODES = {
  VIEW: "view",
  RESPOND: "respond",
}

// Filter keys that hold arrays of values (serialized comma-separated)
export const MULTI_VALUE_FILTER_KEYS = [
  "type",
  "sub_type",
  "response_status",
  "overall_status",
]

// Filter keys that hold a single scalar value (date range bounds)
export const SINGLE_VALUE_FILTER_KEYS = [
  "updated_on_start",
  "updated_on_end",
  "response_due_start",
  "response_due_end",
]

export const FILTER_PARAM_KEYS = [...MULTI_VALUE_FILTER_KEYS, ...SINGLE_VALUE_FILTER_KEYS]

// Default page size, omitted from the URL when unchanged
export const DEFAULT_PAGE_SIZE = 10

/**
 * Normalize a compliance type string to a known type.
 */
export const normalizeComplianceType = (value) => {
  const raw = String(value ?? "").toLowerCase().trim()

  if (raw.includes("query") || raw === "queries") return COMPLIANCE_TYPES.QUERY
  if (raw.includes("complaint")) return COMPLIANCE_TYPES.COMPLAINT
  if (raw.includes("gift")) return COMPLIANCE_TYPES.GIFT
  if (raw.includes("self")) return COMPLIANCE_TYPES.SELF_DECLARATION
  if (raw.includes("annual")) return COMPLIANCE_TYPES.ANNUAL

  return null
}

/**
 * Normalize a tab string to a known tab.
 */
export const normalizeTab = (value) => {
  const raw = String(value ?? "").toLowerCase().trim()
  if (raw === "all") return COMPLIANCE_TABS.ALL
  return COMPLIANCE_TABS.DUE_TO_RESPOND
}

/**
 * Normalize a mode string to a known mode.
 */
export const normalizeMode = (value) => {
  const raw = String(value ?? "").toLowerCase().trim()
  if (raw === "view") return COMPLIANCE_MODES.VIEW
  return COMPLIANCE_MODES.RESPOND
}

/**
 * Check if a status indicates completion.
 */
export const isCompletedStatus = (status) => {
  const key = String(status ?? "").toLowerCase().replace(/_/g, "-")
  return key.includes("complete") || key.includes("closed") || key.includes("done")
}

/**
 * Parse URL search params into compliance state.
 *
 * @param {string} search - URL search string (e.g., "?type=query&id=123&mode=view&tab=all")
 * @returns {Object} Parsed state object
 */
export const parseComplianceUrl = (search) => {
  const params = new URLSearchParams(search)

  const type = normalizeComplianceType(params.get("type"))
  const id = String(params.get("id") || "").trim()
  const mode = normalizeMode(params.get("mode"))
  const tab = normalizeTab(params.get("tab"))
  const annualType = type === COMPLIANCE_TYPES.ANNUAL
    ? normalizeAnnualDeclarationType(params.get("annualType"))
    : null

  // Parse filter parameters
  const filters = {}

  MULTI_VALUE_FILTER_KEYS.forEach((key) => {
    const value = params.get(`filter_${key}`)
    if (value) {
      // Multi-value filters are comma-separated
      filters[key] = value.split(",").map((v) => v.trim()).filter(Boolean)
    }
  })

  SINGLE_VALUE_FILTER_KEYS.forEach((key) => {
    const value = String(params.get(`filter_${key}`) || "").trim()
    if (value) {
      filters[key] = value
    }
  })

  // Parse list view params (search + pagination)
  const searchQuery = String(params.get("search") || "").trim()
  const parsedPage = Number.parseInt(params.get("page"), 10)
  const parsedPageSize = Number.parseInt(params.get("pageSize"), 10)

  return {
    type,
    id,
    mode,
    tab,
    annualType,
    filters: Object.keys(filters).length > 0 ? filters : null,
    search: searchQuery,
    // 1-based page number, null when absent/invalid
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : null,
    pageSize: Number.isFinite(parsedPageSize) && parsedPageSize > 0 ? parsedPageSize : null,
  }
}

/**
 * Build a compliance URL from state parameters.
 *
 * @param {Object} options - URL state options
 * @param {string} options.basePath - Base path (default: "/compliance")
 * @param {string} options.type - Compliance type (query, annual, etc.)
 * @param {string} options.id - Item ID
 * @param {string} options.mode - Mode (view or respond)
 * @param {string} options.tab - Tab (due-to-respond or all)
 * @param {string} options.annualType - Annual declaration type (COBCE or COI)
 * @param {Object} options.filters - Filter state object
 * @returns {string} Complete URL path with query params
 */
export const buildComplianceUrl = ({
  basePath = "/compliance",
  type = null,
  id = null,
  mode = null,
  tab = DEFAULT_TAB,
  annualType = null,
  filters = null,
  search = null,
  page = null,
  pageSize = null,
} = {}) => {
  const params = new URLSearchParams()

  // Always include tab for consistency
  params.set("tab", normalizeTab(tab))

  // Add item details if provided
  if (type && id) {
    params.set("type", normalizeComplianceType(type) || type)
    params.set("id", String(id).trim())
    if (mode) {
      params.set("mode", normalizeMode(mode))
    }

    // Add annual type if applicable
    if (type === COMPLIANCE_TYPES.ANNUAL && annualType) {
      params.set("annualType", normalizeAnnualDeclarationType(annualType))
    }
  }

  // Add filters if provided (empty arrays / blank values are omitted)
  if (filters && typeof filters === "object") {
    FILTER_PARAM_KEYS.forEach((key) => {
      const value = filters[key]
      if (Array.isArray(value)) {
        const cleaned = value.map((v) => String(v).trim()).filter(Boolean)
        if (cleaned.length > 0) params.set(`filter_${key}`, cleaned.join(","))
      } else if (value !== null && value !== undefined && String(value).trim()) {
        params.set(`filter_${key}`, String(value).trim())
      }
    })
  }

  // Add list view params (search + pagination)
  const searchValue = String(search ?? "").trim()
  if (searchValue) params.set("search", searchValue)

  const pageNumber = Number(page)
  if (Number.isFinite(pageNumber) && pageNumber > 1) params.set("page", String(pageNumber))

  const pageSizeNumber = Number(pageSize)
  if (Number.isFinite(pageSizeNumber) && pageSizeNumber > 0 && pageSizeNumber !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(pageSizeNumber))
  }

  // Commas are legal in a query string; keep multi-value filters readable.
  return `${basePath}?${params.toString().replace(/%2C/g, ",")}`
}

/**
 * Build a compliance URL for opening a specific item.
 * Auto-determines mode based on status if not provided.
 *
 * @param {Object} item - Compliance item/row object
 * @param {Object} options - Additional options
 * @returns {string} Complete URL path
 */
export const buildComplianceItemUrl = (
  item,
  {
    mode = null,
    tab = null,
    basePath = "/compliance",
    filters = null,
    search = null,
    page = null,
    pageSize = null,
  } = {},
) => {
  if (!item) return basePath

  const type = normalizeComplianceType(item.type)
  const id = String(item.requestId || item.request_id || item.id || "").trim()

  if (!type || !id) return basePath

  // Auto-determine mode based on status if not explicitly provided
  let resolvedMode = mode
  if (!resolvedMode) {
    const status = item.overallStatus || item.overall_status || item.status
    resolvedMode = isCompletedStatus(status)
      ? COMPLIANCE_MODES.VIEW
      : COMPLIANCE_MODES.RESPOND
  }

  const annualType = type === COMPLIANCE_TYPES.ANNUAL
    ? normalizeAnnualDeclarationType(item.annualType || item.annual_type || item.subType || item.sub_type)
    : null

  return buildComplianceUrl({
    basePath,
    type,
    id,
    mode: resolvedMode,
    tab: tab || DEFAULT_TAB,
    annualType,
    filters,
    search,
    page,
    pageSize,
  })
}
