import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useNavigate, useLocation } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Download, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import CenterToast from "@/components/shared/CenterToast"
import { getComplianceDashboard, exportComplianceDashboard } from "@/api/complianceApi"
import { getComplianceAssignRole } from "@/api/userManagementApi"

import ComplianceStatsRow from "@/components/compliance/ComplianceStatsRow"
import ComplianceFilterModal, {
  EMPTY_COMPLIANCE_FILTERS,
  countActiveComplianceFilters,
  normalizeComplianceFilters,
} from "@/components/compliance/ComplianceFilterModal"
import RaiseQueryModal from "@/components/compliance/RaiseQueryModal"
import RaiseComplaintModal from "@/components/compliance/RaiseComplaintModal"
import GiftDeclarationModal from "@/components/compliance/GiftDeclarationModal"
import AnnualDeclarationRespondModal from "@/components/compliance/AnnualDeclarationRespondModal"
import SelfDeclarationRespondModal from "@/components/compliance/SelfDeclarationRespondModal"
import GiftDeclarationRespondModal from "@/components/compliance/GiftDeclarationRespondModal"
import QueryRespondModal from "@/components/compliance/QueryRespondModal"
import ComplaintRespondModal from "@/components/compliance/ComplaintRespondModal"
import AssignAdminModal from "@/components/compliance/AssignAdminModal"
import LandingSectionPanel from "@/components/landing/LandingSectionPanel"
import { landingShellInnerClassName } from "@/components/landing/landingTheme"
import {
  getComplianceBasePath,
  isLandingCompliancePath,
} from "@/lib/appNavigation"

/* ---------------------------------- utils --------------------------------- */

const inputBoxStyle = {
  borderColor: "var(--sds-border-default)",
  backgroundColor: "var(--sds-bg-default)",
}

function TruncatedCell({ value, className }) {
  const text = String(value ?? "")
  return (
    <div className={cn("whitespace-normal break-words", className)} title={text}>
      {text || "-"}
    </div>
  )
}

/** Full text always visible; wraps to additional lines instead of truncating. */
function WrappedCell({ value, className }) {
  const text = String(value ?? "").trim()
  return (
    <div className={cn("whitespace-normal break-words leading-[1.4]", className)}>
      {text || "-"}
    </div>
  )
}

function StatusPill({ value, className, widthClass = "w-28" }) {
  const text = String(value ?? "").trim() || "-"
  return (
    <div className="flex justify-center">
      <span
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-base font-semibold leading-[1.4]",
          widthClass,
          className,
        )}
      >
        {text}
      </span>
    </div>
  )
}

function SubTypePill({ value }) {
  const text = String(value ?? "").trim() || "-"
  return (
    <div className="flex justify-center">
      <span
        className={cn(
          "inline-flex w-fit max-w-full items-center justify-center rounded-lg px-4 py-2 text-base font-semibold leading-[1.4]",
          "whitespace-normal break-words text-center",
          "bg-[#EBF0FF] text-[#3A65E1]",
        )}
        title={text}
      >
        {text}
      </span>
    </div>
  )
}

function ResponseStatusPill({ value }) {
  const raw = String(value ?? "").trim()
  const key = raw.toLowerCase()
  let colorClass = "bg-gray-100 text-gray-700"

  if (key.includes("overdue")) {
    colorClass = "bg-[#FDE2E1] text-[#C52822]"
  } else if (key.includes("due")) {
    colorClass = "bg-[#FFF4D2] text-[#B1790D]"
  } else if (key.includes("complete") || key.includes("closed") || key.includes("responded")) {
    colorClass = "bg-emerald-100 text-emerald-700"
  }

  return <StatusPill value={raw || "-"} widthClass="w-28" className={colorClass} />
}

function OverallStatusPill({ value }) {
  const raw = String(value ?? "").trim()
  const key = raw.toLowerCase().replace(/_/g, "-")
  let colorClass = "bg-gray-100 text-gray-700"

  if (key.includes("progress") || key.includes("pending") || key.includes("in-progress")) {
    colorClass = "bg-[#FFF4D2] text-[#B1790D]"
  } else if (key.includes("complete") || key.includes("closed") || key.includes("done")) {
    colorClass = "bg-emerald-100 text-emerald-700"
  } else if (key.includes("overdue")) {
    colorClass = "bg-[#FDE2E1] text-[#C52822]"
  }

  const display = raw.replace(/_/g, "-") || "-"
  return <StatusPill value={display} widthClass="w-32" className={colorClass} />
}

const isAnnualDeclarationType = (type) =>
  String(type ?? "").toLowerCase().includes("annual")

const isSelfDeclarationType = (type) =>
  String(type ?? "").toLowerCase().includes("self")

const isGiftDeclarationType = (type) =>
  String(type ?? "").toLowerCase().includes("gift")

const isQueryType = (type) => {
  const key = String(type ?? "").toLowerCase()
  return key.includes("query") || key === "queries"
}

const isComplaintType = (type) => {
  const key = String(type ?? "").toLowerCase()
  return key.includes("complaint")
}

const getRespondModalKind = (type) => {
  if (isAnnualDeclarationType(type)) return "annual"
  if (isSelfDeclarationType(type)) return "self"
  if (isGiftDeclarationType(type)) return "gift"
  if (isQueryType(type)) return "query"
  if (isComplaintType(type)) return "complaint"
  return null
}

function isOverallStatusCompleted(status) {
  const key = String(status ?? "").toLowerCase().replace(/_/g, "-")
  return key.includes("complete") || key.includes("closed") || key.includes("done")
}

function isDraftStatus(row) {
  const candidates = [row?.responseStatus, row?.overallStatus, row?.status]
  return candidates.some((value) =>
    String(value ?? "").trim().toLowerCase().includes("draft"),
  )
}

const FILTER_SESSION_KEY = "complianceHelpdeskFilterState"

const TILE_FILTER_MAP = {
  "Total Due to Respond": { field: "response_status", values: ["Due"], group: "status" },
  "Total Overdue to Respond": { field: "response_status", values: ["Overdue"], group: "status" },
  "Total Completed": { field: "overall_status", values: ["Completed"], group: "status" },
  "Total In Progress": { field: "overall_status", values: ["Pending"], group: "status" },
  "Annual Declarations": { field: "type", values: ["annual_declarations"], group: "type" },
  "Gift Declarations": { field: "type", values: ["gift"], group: "type" },
  "Self Declarations": { field: "type", values: ["self_declarations"], group: "type" },
  Queries: { field: "type", values: ["query"], group: "type" },
  Complaints: { field: "type", values: ["complaint"], group: "type" },
}

const STATUS_TILE_TITLES = new Set(
  Object.entries(TILE_FILTER_MAP)
    .filter(([, config]) => config.group === "status")
    .map(([title]) => title),
)

const EMPTY_SELECTED_TILES = { status: null, type: null }

function normalizeSelectedTiles(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      status: STATUS_TILE_TITLES.has(value.status) ? value.status : null,
      type:
        value.type && TILE_FILTER_MAP[value.type]?.group === "type" ? value.type : null,
    }
  }

  // Backward compatibility for older session shape that stored a single tile title.
  if (typeof value === "string" && TILE_FILTER_MAP[value]) {
    const group = TILE_FILTER_MAP[value].group
    return {
      status: group === "status" ? value : null,
      type: group === "type" ? value : null,
    }
  }

  return { ...EMPTY_SELECTED_TILES }
}

function deriveSelectedTilesFromFilters(filters = {}) {
  const normalized = normalizeComplianceFilters(filters)
  const result = { ...EMPTY_SELECTED_TILES }

  for (const [title, mapping] of Object.entries(TILE_FILTER_MAP)) {
    const filterValues = [...(normalized[mapping.field] ?? [])].sort()
    const tileValues = [...mapping.values].sort()
    const matches =
      filterValues.length === tileValues.length &&
      filterValues.every((value, index) => value === tileValues[index])

    if (matches) {
      result[mapping.group] = title
    }
  }

  return result
}

function loadComplianceFilterSession() {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(FILTER_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.error("Failed to restore compliance filters from session:", error)
    return null
  }
}

/* ------------------------------- main page --------------------------------- */

export default function ComplianceHelpdesk({ variant = "default" }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isLanding = variant === "landing" || isLandingCompliancePath(location.pathname)
  const complianceBase = getComplianceBasePath({ landing: isLanding })
  const sessionState = useMemo(() => loadComplianceFilterSession(), [])
  const initialAppliedFilters = useMemo(
    () => normalizeComplianceFilters(sessionState?.appliedFilters),
    [sessionState],
  )

  const [rows, setRows] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [pagination, setPagination] = useState(() => ({
    pageIndex:
      Number.isFinite(sessionState?.pagination?.pageIndex) && sessionState.pagination.pageIndex >= 0
        ? sessionState.pagination.pageIndex
        : 0,
    pageSize:
      Number.isFinite(sessionState?.pagination?.pageSize) && sessionState.pagination.pageSize > 0
        ? sessionState.pagination.pageSize
        : 10,
  }))

  const [searchQuery, setSearchQuery] = useState(() =>
    typeof sessionState?.searchQuery === "string" ? sessionState.searchQuery : "",
  )
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() => {
    const initial = typeof sessionState?.searchQuery === "string" ? sessionState.searchQuery.trim() : ""
    return initial.length >= 3 ? initial : ""
  })
  const [searchField, setSearchField] = useState("Staff ID")
  const [selectedTab, setSelectedTab] = useState(() =>
    sessionState?.selectedTab === "Due to Respond" ? "Due to Respond" : "Due to Respond",
  )
  const [selectedTiles, setSelectedTiles] = useState(() =>
    deriveSelectedTilesFromFilters(initialAppliedFilters),
  )

  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [hasLoadedRows, setHasLoadedRows] = useState(false)

  const [raiseQueryOpen, setRaiseQueryOpen] = useState(false)
  const [raiseComplaintOpen, setRaiseComplaintOpen] = useState(false)
  const [giftDeclarationOpen, setGiftDeclarationOpen] = useState(false)
  const [respondStack, setRespondStack] = useState([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignRequest, setAssignRequest] = useState(null)
  const [respondOpenedFromDeepLink, setRespondOpenedFromDeepLink] = useState(false)
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)
  const switchingRespondModalRef = useRef(false)

  const currentRespondFrame = respondStack.length > 0 ? respondStack[respondStack.length - 1] : null
  const respondRequest = currentRespondFrame?.request ?? null
  const respondMode = currentRespondFrame?.mode ?? "respond"
  const isRespondReadOnly = respondMode === "view"
  const respondModalKind = currentRespondFrame ? getRespondModalKind(respondRequest?.type) : null
  const annualDeclarationOpen = respondModalKind === "annual"
  const selfDeclarationOpen = respondModalKind === "self"
  const giftDeclarationRespondOpen = respondModalKind === "gift"
  const queryRespondOpen = respondModalKind === "query"
  const complaintRespondOpen = respondModalKind === "complaint"

  const beginRespondModalSwitch = () => {
    switchingRespondModalRef.current = true
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      switchingRespondModalRef.current = false
    }, 50)
    return () => window.clearTimeout(id)
  }, [respondStack])

  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState(() => initialAppliedFilters)
  const [apiSummary, setApiSummary] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  const [toast, setToast] = useState({
    open: false,
    variant: "success",
    message: "",
  })

  const activeFilterCount = useMemo(
    () => countActiveComplianceFilters(appliedFilters),
    [appliedFilters],
  )

  // Flash toast after redirect from Self Declaration (or other flows that pass location.state.flashToast)
  useEffect(() => {
    const flash = location.state?.flashToast
    if (!flash?.message) return

    setToast({
      open: true,
      variant: flash.variant === "error" ? "error" : "success",
      message: String(flash.message),
    })

    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} })
  }, [location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    if (typeof window === "undefined") return

    window.sessionStorage.setItem(
      FILTER_SESSION_KEY,
      JSON.stringify({
        appliedFilters,
        selectedTiles,
        selectedTab,
        searchQuery,
        pagination,
      }),
    )
  }, [appliedFilters, selectedTiles, selectedTab, searchQuery, pagination])

  // Deep-link from Quick Actions: /compliance?action=gift|complaint|query|self
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const action = String(params.get("action") || "").toLowerCase().trim()
    if (!action) return

    if (action === "self") {
      navigate(`${complianceBase}/self-declaration`, { replace: true })
      return
    }

    if (action === "query") setRaiseQueryOpen(true)
    else if (action === "complaint") setRaiseComplaintOpen(true)
    else if (action === "gift") setGiftDeclarationOpen(true)
    else return

    params.delete("action")
    const nextSearch = params.toString()
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true },
    )
  }, [complianceBase, location.pathname, location.search, navigate])

  const complianceStats = useMemo(() => {
    const s = apiSummary
    const isAllTab = selectedTab === "All"

    if (s) {
      const primaryStats = isAllTab
        ? [
            { title: "Total Completed", value: s.totalCompleted ?? s.total_completed ?? 0 },
            { title: "Total In Progress", value: s.totalInProgress ?? s.total_in_progress ?? 0 },
          ]
        : [
            { title: "Total Due to Respond", value: s.totalDue ?? s.total_due ?? 0 },
            { title: "Total Overdue to Respond", value: s.totalOverdue ?? s.total_overdue ?? 0 },
          ]

      return [
        ...primaryStats,
        { title: "Annual Declarations", value: s.annualDeclarations ?? s.annual_declarations ?? 0 },
        // { title: "Gift Declarations", value: s.gifts ?? s.gift_declarations ?? 0 },
        { title: "Self Declarations", value: s.selfDeclarations ?? s.self_declarations ?? 0 },
        { title: "Queries", value: s.queries ?? 0 },
        // { title: "Complaints", value: s.complaints ?? 0 },
      ]
    }

    // fallback to counts based on current rows
    const totalDueToRespond = rows.filter((r) => r.responseStatus && String(r.responseStatus).toLowerCase().includes("due")).length
    const totalOverdueToRespond = rows.filter((r) => r.responseDueDate && new Date(r.responseDueDate) < new Date()).length
    const totalCompleted = rows.filter((r) => String(r.overallStatus).toLowerCase().includes("complet") || String(r.overallStatus).toLowerCase() === "closed").length
    const totalInProgress = rows.filter((r) => {
      const status = String(r.overallStatus).toLowerCase()
      return status.includes("progress") || status.includes("pending") || status.includes("open")
    }).length
    const annualDeclarations = rows.filter((r) => String(r.type).toLowerCase().includes("annual")).length
    const giftDeclarations = rows.filter((r) => String(r.type).toLowerCase().includes("gift")).length
    const selfDeclarations = rows.filter((r) => String(r.type).toLowerCase().includes("self")).length
    const queries = rows.filter((r) => String(r.type).toLowerCase().includes("query") || String(r.type).toLowerCase().includes("request")).length
    const complaints = rows.filter((r) => String(r.type).toLowerCase().includes("complaint")).length

    const primaryStats = isAllTab
      ? [
          { title: "Total Completed", value: totalCompleted },
          { title: "Total In Progress", value: totalInProgress },
        ]
      : [
          { title: "Total Due to Respond", value: totalDueToRespond },
          { title: "Total Overdue to Respond", value: totalOverdueToRespond },
        ]

    return [
      ...primaryStats,
      { title: "Annual Declarations", value: annualDeclarations },
      // { title: "Gift Declarations", value: giftDeclarations },
      { title: "Self Declarations", value: selfDeclarations },
      { title: "Queries", value: queries },
      // { title: "Complaints", value: complaints },
    ]
  }, [selectedTab, apiSummary, rows])

  const sortByApiValue = searchField === "Staff ID" ? "staff_id" : searchField === "Name" ? "username" : "email"

  const downloadBlobResponse = (response, fallbackFileName) => {
    const blobUrl = window.URL.createObjectURL(response.data)
    const disposition = response.headers?.["content-disposition"] || ""
    const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/)
    const fileName = fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : fallbackFileName

    const anchor = document.createElement("a")
    anchor.href = blobUrl
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(blobUrl)
  }

  const buildDashboardRequestOptions = useCallback(
    ({ includePagination = true } = {}) => ({
      tab: selectedTab === "Due to Respond" ? "pending" : "all",
      search: debouncedSearchQuery,
      ...(includePagination
        ? { page: pagination.pageIndex + 1, page_size: pagination.pageSize }
        : {}),
      type: appliedFilters.type,
      sub_type: appliedFilters.sub_type,
      response_status: appliedFilters.response_status,
      overall_status: appliedFilters.overall_status,
      updated_on_start: appliedFilters.updated_on_start,
      updated_on_end: appliedFilters.updated_on_end,
      response_due_start: appliedFilters.response_due_start,
      response_due_end: appliedFilters.response_due_end,
    }),
    [selectedTab, debouncedSearchQuery, pagination.pageIndex, pagination.pageSize, appliedFilters]
  )

  const handleExport = async () => {
    if (isExporting) return

    if (!hasExportableData) {
      setToast({ open: true, variant: "error", message: "Nothing to export" })
      return
    }

    setIsExporting(true)
    try {
      const response = await exportComplianceDashboard(buildDashboardRequestOptions({ includePagination: false }))
      downloadBlobResponse(response, "compliance_dashboard_export.xlsx")
      setToast({ open: true, variant: "success", message: "Export downloaded successfully." })
    } catch (error) {
      console.error("Failed to export compliance dashboard", error)
      setToast({
        open: true,
        variant: "error",
        message: error?.message ?? "Failed to export dashboard.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Debounce search; only pass `search` to the API when trimmed length is at least 3.
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length >= 3) {
      const id = window.setTimeout(() => setDebouncedSearchQuery(trimmed), 400)
      return () => window.clearTimeout(id)
    }
    setDebouncedSearchQuery("")
  }, [searchQuery])

  // When search changes, restart from the first page.
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearchQuery])

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [selectedTab, appliedFilters])

  // Fetch paginated requests from API.
  useEffect(() => {
    let cancelled = false

    const mapApiItem = (item) => ({
      requestId: item?.requestId ?? item?.request_id ?? "",
      reference_id: item?.reference_id ?? item?.referenceId ?? "",
      type: item?.type ?? "",
      subType: item?.subType ?? item?.sub_type ?? "",
      responseStatus: item?.responseStatus ?? item?.response_status ?? "",
      overallStatus: item?.overallStatus ?? item?.overall_status ?? "",
      status: item?.status ?? "",
      updatedOn: item?.updatedOn ?? item?.updated_on ?? "",
      responseDueDate: item?.responseDueDate ?? item?.response_due_date ?? "",
      updatedBy: item?.updatedBy ?? item?.updated_by ?? "",
      pendingAt: item?.pendingAt ?? item?.pending_at ?? "",
      assignedTo: item?.assignedTo ?? item?.assigned_to ?? "",
      closedAt: item?.closedAt ?? item?.closed_at ?? "",
      closedBy: item?.closedBy ?? item?.closed_by ?? "",
    })

    const run = async () => {
      setIsUsersLoading(true)
      try {
        const data = await getComplianceDashboard(buildDashboardRequestOptions())

        if (cancelled) return

        setApiSummary(data.summary ?? null)

        const items = Array.isArray(data.items) ? data.items : []
        setRows(items.map(mapApiItem))

        const totalFromApi = Number(data.total ?? 0)
        setTotalUsers(totalFromApi || items.length)
      } catch (e) {
        console.error("Failed to load compliance dashboard", e)
        setToast({ open: true, variant: "error", message: "Unable to load Compliance Helpdesk. Please refresh" })
      } finally {
        if (!cancelled) {
          setIsUsersLoading(false)
          setHasLoadedRows(true)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [
    buildDashboardRequestOptions,
    pagination.pageIndex,
    pagination.pageSize,
    dashboardRefreshKey,
  ])

  const refreshDashboard = useCallback(() => {
    setDashboardRefreshKey((key) => key + 1)
  }, [])

  const openRespondFlow = useCallback(
    (row, { mode = "respond", push = false } = {}) => {
      if (!row) return

      const isView = mode === "view"
      if (isView && isAnnualDeclarationType(row.type)) return

      if (isSelfDeclarationType(row.type) && !isView && isDraftStatus(row)) {
        const draftId = String(row.requestId || "").trim()
        if (!draftId) {
          setToast({
            open: true,
            variant: "error",
            message: "Request ID is missing for this draft.",
          })
          return
        }
        navigate(`${complianceBase}/self-declaration?id=${encodeURIComponent(draftId)}`)
        return
      }

      const kind = getRespondModalKind(row.type)
      if (!kind) {
        setToast({
          open: true,
          variant: "warning",
          message: `${isView ? "View" : "Respond"} flow for type "${row.type || "Unknown"}" is not available yet.`,
        })
        return
      }

      const frame = { request: row, mode: isView ? "view" : "respond" }
      beginRespondModalSwitch()
      setRespondStack((prev) => (push && prev.length > 0 ? [...prev, frame] : [frame]))
    },
    [complianceBase, navigate],
  )

  const handleRespond = useCallback(
    (row) => openRespondFlow(row, { mode: "respond" }),
    [openRespondFlow],
  )

  const handleView = useCallback(
    (row) => openRespondFlow(row, { mode: "view" }),
    [openRespondFlow],
  )

  const dismissRespondFlow = useCallback(() => {
    beginRespondModalSwitch()
    setRespondStack([])
    setRespondOpenedFromDeepLink(false)
  }, [])

  const closeRespondModal = useCallback(
    (next) => {
      if (next) return
      if (switchingRespondModalRef.current) return
      dismissRespondFlow()
    },
    [dismissRespondFlow],
  )

  const handleViewSimilarRequest = useCallback(
    (similar) => {
      const requestId = String(similar?.requestId ?? similar?.request_id ?? "").trim()
      if (!requestId) return

      const matched = rows.find((row) => String(row.requestId) === requestId)
      const nextRow = matched || {
        requestId,
        type: similar?.type || respondRequest?.type || "",
        subType: similar?.subType || similar?.sub_type || respondRequest?.subType || "",
      }

      openRespondFlow(nextRow, { mode: "view", push: true })
    },
    [openRespondFlow, respondRequest, rows],
  )

  const handleAssign = useCallback((row) => {
    if (!row || isAnnualDeclarationType(row.type)) return
    const role = getComplianceAssignRole(row.type)
    if (!role) {
      setToast({
        open: true,
        variant: "warning",
        message: `Assign is not available for type "${row.type || "Unknown"}".`,
      })
      return
    }
    setAssignRequest(row)
    setAssignOpen(true)
  }, [])

  // Deep-link from Recent Activities: /compliance?requestId=...&type=...&subType=...
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestId = String(params.get("requestId") || "").trim()
    if (!requestId || !hasLoadedRows) return

    setRespondOpenedFromDeepLink(true)
    const matchedRow = rows.find((row) => String(row.requestId) === requestId)
    handleRespond(
      matchedRow || {
        requestId,
        type: String(params.get("type") || "").trim(),
        subType: String(params.get("subType") || "").trim(),
      },
    )

    params.delete("requestId")
    params.delete("type")
    params.delete("subType")
    const nextSearch = params.toString()
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true },
    )
  }, [handleRespond, hasLoadedRows, location.pathname, location.search, navigate, rows])

  const handleRespondBack = () => {
    if (respondStack.length > 1) {
      beginRespondModalSwitch()
      setRespondStack((prev) => prev.slice(0, -1))
      return
    }
    if (respondOpenedFromDeepLink) {
      setRespondOpenedFromDeepLink(false)
      beginRespondModalSwitch()
      setRespondStack([])
      navigate(-1)
      return
    }
    dismissRespondFlow()
  }

  const handleApplyFilters = (nextFilters) => {
    const normalized = normalizeComplianceFilters(nextFilters)
    setAppliedFilters(normalized)
    setSelectedTiles(deriveSelectedTilesFromFilters(normalized))
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleResetFilters = () => {
    const empty = normalizeComplianceFilters(EMPTY_COMPLIANCE_FILTERS)
    setAppliedFilters(empty)
    setSelectedTiles(deriveSelectedTilesFromFilters(empty))
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const emptyStateMessage = (() => {
    if (debouncedSearchQuery) return "No results found"
    if (activeFilterCount > 0) return "No Items Found, try clearing filters."
    return "No results found"
  })()

  const hasExportableData = totalUsers > 0 && rows.length > 0

  const handleTileClick = (cardTitle) => {
    const mapping = TILE_FILTER_MAP[cardTitle]
    if (!mapping) return

    const group = mapping.group
    const isDeselecting = selectedTiles[group] === cardTitle
    const nextGroupSelection = isDeselecting ? null : cardTitle
    const nextValues = nextGroupSelection ? [...mapping.values] : []

    setSelectedTiles((prev) => ({
      ...prev,
      [group]: nextGroupSelection,
    }))

    setAppliedFilters((prev) => {
      const next = {
        ...prev,
        [mapping.field]: nextValues,
      }

      // Switching between Due/Overdue and Completed/In Progress uses different fields.
      // Clear the other status field so only the active status tile filter remains.
      if (group === "status") {
        if (mapping.field === "response_status") {
          next.overall_status = []
        } else if (mapping.field === "overall_status") {
          next.response_status = []
        }
      }

      return normalizeComplianceFilters(next)
    })
    setPagination((p) => ({ ...p, pageIndex: 0 }))

    // After applying the tile filter, move focus to the table for the user
    // so they can see filtered results immediately.
    // Use a short timeout so state updates complete and table layout is ready.
    setTimeout(() => {
      try {
        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        tableRef.current?.focus()
      } catch (e) {
        /* ignore */
      }
    }, 120)
  }

  const selectedTileKeys = useMemo(
    () => [selectedTiles.status, selectedTiles.type].filter(Boolean),
    [selectedTiles],
  )

  const tableRef = useRef(null)

  /* ------------------------------- columns --------------------------------- */

  const columns = useMemo(
    () => [
      { accessorKey: "requestId", header: "Request ID", size: 240, cell: ({ getValue }) => <WrappedCell value={getValue()} /> },
      { accessorKey: "type", header: "Type", size: 140, cell: ({ getValue }) => <TruncatedCell value={getValue()} /> },
      {
        accessorKey: "subType",
        header: "Sub-Type",
        size: 200,
        cell: ({ getValue }) => <SubTypePill value={getValue()} />,
      },
      {
        accessorKey: "responseStatus",
        header: "Response Status",
        size: 160,
        cell: ({ getValue }) => <ResponseStatusPill value={getValue()} />,
      },
      {
        accessorKey: "overallStatus",
        header: "Overall Status",
        size: 150,
        cell: ({ getValue }) => <OverallStatusPill value={getValue()} />,
      },
      { accessorKey: "updatedOn", header: "Created On", size: 150, cell: ({ getValue }) => <TruncatedCell value={getValue()} /> },
      { accessorKey: "responseDueDate", header: "Response Due Date", size: 170, cell: ({ getValue }) => <TruncatedCell value={getValue()} /> },
      { accessorKey: "updatedBy", header: "Created By", size: 160, cell: ({ getValue }) => <WrappedCell value={getValue()} /> },
      { accessorKey: "pendingAt", header: "Pending At", size: 140, cell: ({ getValue }) => <WrappedCell value={getValue()} /> },
      { accessorKey: "assignedTo", header: "Assigned To", size: 140, cell: ({ getValue }) => <WrappedCell value={getValue()} /> },
      { accessorKey: "closedBy", header: "Closed By", size: 140, cell: ({ getValue }) => <TruncatedCell value={getValue()} /> },
      { accessorKey: "closedAt", header: "Closure Date", size: 140, cell: ({ getValue }) => <TruncatedCell value={getValue()} /> },
      {
        id: "actions",
        header: () => <div className="text-center">Actions</div>,
        size: 280,
        meta: { isSticky: true },
        cell: ({ row }) => {
          const completed = isOverallStatusCompleted(row.original?.overallStatus)
          const isAnnual = isAnnualDeclarationType(row.original?.type)
          const viewDisabled = isAnnual
          const assignDisabled = completed || isAnnual
          const unassigned = row.original?.assignedTo === null || row.original?.assignedTo === undefined || String(row.original?.assignedTo).trim() === ""
          // Disable Respond on "All" tab. On "Due to Respond", disable when unassigned
          // except annual declarations, which are never assigned.
          const respondDisabled =
            completed ||
            selectedTab === "All" ||
            (selectedTab === "Due to Respond" && unassigned && !isAnnual)

          const actionBtnClass = (enabled) =>
            cn(
              "h-9 px-3 text-sm font-medium",
              enabled
                ? "bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-600"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60",
            )

          return (
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={viewDisabled}
                className={actionBtnClass(!viewDisabled)}
                onClick={() => handleView(row.original)}
              >
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={assignDisabled}
                className={actionBtnClass(!assignDisabled)}
                onClick={() => handleAssign(row.original)}
              >
                Assign
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={respondDisabled}
                className={actionBtnClass(!respondDisabled)}
                onClick={() => handleRespond(row.original)}
              >
                Respond
              </Button>
            </div>
          )
        },
      },
    ],
    [handleAssign, handleRespond, handleView, selectedTab]
  )

  const tableMinWidth = useMemo(
    () => columns.reduce((sum, column) => sum + (column.size || 120), 0),
    [columns],
  )

  /* ----------------------------- table logic ------------------------------- */

  const pageCount = Math.max(1, Math.ceil(totalUsers / pagination.pageSize))
  const derivedPageCount = pageCount

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: derivedPageCount,
    state: { pagination },
    onPaginationChange: setPagination,
  })

  /* -------------------------------- render --------------------------------- */

  const shellClass = isLanding
    ? landingShellInnerClassName("pb-16 pt-8")
    : "min-h-full w-full max-w-full min-w-0 overflow-x-hidden bg-secondary p-4 sm:p-5"
  const contentWidthClass = "w-full min-w-0 max-w-full"

  const body = (
    <>
      {!isLanding && (
        <h1 className="mb-4 text-xl font-semibold">Compliance HelpDesk</h1>
      )}
        {/* search */}
        <div className="mb-4 flex w-full min-w-0 max-w-full flex-wrap items-center gap-3">
          <div
            className="flex h-9 min-w-0 flex-1 basis-full items-center gap-2 rounded border px-3 sm:basis-72 sm:max-w-md"
            style={inputBoxStyle}
          >
            <Input
              placeholder="Search Requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-full border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
            <Search className="h-4 w-4 shrink-0 text-blue-600" />
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
            {[
              { label: "+ Ask a Query", action: () => setRaiseQueryOpen(true) },
              // { label: "+ Raise a Complaint", action: () => setRaiseComplaintOpen(true) },
              // { label: "+ Gift Declaration", action: () => setGiftDeclarationOpen(true) },
              { label: "+ Self Declaration", action: () => navigate(`${complianceBase}/self-declaration`) },
            ].map(({ label, action }) => (
              <Button
                key={label}
                type="button"
                onClick={action}
                className="h-9 px-3 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* tabs: Due to Respond / All */}
        <div className={`mb-4 ${contentWidthClass} bg-white`}>
          <div className="border-b border-slate-200">
            <div className="flex gap-2 overflow-x-auto">
              {[["Due to Respond", "Due to Respond"], ["All", "All"]].map(([key, label]) => {
                const isSelected = selectedTab === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTab(key)}
                    className={cn(
                      "shrink-0 px-4 py-2 text-sm font-medium rounded-t-md sm:text-base",
                      isSelected
                        ? "text-blue-600 bg-blue-100 border-b-2 border-blue-600"
                        : "text-slate-500 bg-white"
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        {/* Stats row - shows counts for the selected tab */}
        <ComplianceStatsRow
          items={complianceStats}
          selectedKeys={selectedTileKeys}
          onCardClick={handleTileClick}
        />
        <div className={`mb-4 flex ${contentWidthClass} justify-end gap-2`}>
          <Button
            type="button"
            className={cn(
              "h-9 px-4 text-sm font-medium",
              isExporting || !hasExportableData
                ? "cursor-not-allowed bg-blue-100 text-blue-400 opacity-70 hover:text-blue-400 hover:bg-blue-100"
                : "bg-blue-100 text-blue-600 hover:text-blue-600 hover:bg-blue-200",
            )}
            onClick={handleExport}
            disabled={isExporting}
            aria-disabled={isExporting || !hasExportableData}
          >
            <Download className="h-4 w-4 text-blue-600" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
          <Button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className="relative h-9 gap-2 px-4 text-sm font-medium bg-blue-100 text-blue-600 hover:bg-blue-200"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>
        {/* TABLE */}
        <div ref={tableRef} tabIndex={-1} className={`${contentWidthClass} overflow-hidden rounded-xl border border-slate-200 bg-white`}>
          <div className="h-3 bg-white" />
          <div className="w-full min-w-0 max-w-full overflow-x-auto bg-white">
          <table
            className="w-full table-fixed border-collapse"
            style={{ minWidth: tableMinWidth }}
          >
            <thead className="bg-secondary">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      style={{ width: h.getSize() }}
                      className={cn(
                        "h-14 border-b border-[#d9d9d9] bg-[#f5f5f5] px-3 py-3 text-center text-base font-medium leading-[1.4] text-black sm:px-4",
                        h.column.columnDef.meta?.isSticky &&
                          "compliance-sticky-actions-header sticky right-0 z-30 bg-[#f5f5f5] pl-[10px] pr-[10px] text-center",
                      )}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {isUsersLoading && table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllLeafColumns().length}
                    className="sticky left-0 px-4 py-6 text-center text-base text-[#757575] bg-white"
                  >
                    Loading...
                  </td>
                </tr>
              ) : null}

              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={cn(
                          "border-b border-[#d9d9d9] px-3 py-3 text-center text-base font-normal leading-[1.4] text-[#1e1e1e] sm:px-4",
                          cell.column.columnDef.meta?.isSticky &&
                            "compliance-sticky-actions-cell sticky right-0 z-20 overflow-visible bg-white px-[10px]",
                        )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}

              {!isUsersLoading && table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllLeafColumns().length}
                    className="sticky left-0 px-4 py-6 text-center text-base text-[#757575] bg-white"
                  >
                    {emptyStateMessage}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        </div>

        {/* pagination */}
        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-center px-4 py-4">
          <Pagination
            currentPage={table.getState().pagination.pageIndex + 1}
            totalPages={table.getPageCount()}
            onPageChange={(page) => table.setPageIndex(page - 1)}
            disabled={isUsersLoading}
          />
        </div>

        <ComplianceFilterModal
          open={filterModalOpen}
          onOpenChange={setFilterModalOpen}
          appliedFilters={appliedFilters}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
        />

        <AnnualDeclarationRespondModal
          open={annualDeclarationOpen}
          onBack={handleRespondBack}
          onOpenChange={closeRespondModal}
          request={respondRequest}
          onShowToast={(variant, message) => setToast({ open: true, variant, message })}
          onSuccess={refreshDashboard}
        />

        <SelfDeclarationRespondModal
          open={selfDeclarationOpen}
          onBack={handleRespondBack}
          onOpenChange={closeRespondModal}
          request={respondRequest}
          readOnly={isRespondReadOnly}
          onViewSimilarRequest={handleViewSimilarRequest}
          onShowToast={(variant, message) => setToast({ open: true, variant, message })}
          onSuccess={refreshDashboard}
        />

        <GiftDeclarationRespondModal
          open={giftDeclarationRespondOpen}
          onBack={handleRespondBack}
          onOpenChange={closeRespondModal}
          request={respondRequest}
          readOnly={isRespondReadOnly}
          onViewSimilarRequest={handleViewSimilarRequest}
          onShowToast={(variant, message) => setToast({ open: true, variant, message })}
          onSuccess={refreshDashboard}
        />

        <QueryRespondModal
          open={queryRespondOpen}
          onBack={handleRespondBack}
          onOpenChange={closeRespondModal}
          request={respondRequest}
          readOnly={isRespondReadOnly}
          onViewSimilarRequest={handleViewSimilarRequest}
          onShowToast={(variant, message) => setToast({ open: true, variant, message })}
          onSuccess={refreshDashboard}
        />

        <ComplaintRespondModal
          open={complaintRespondOpen}
          onBack={handleRespondBack}
          onOpenChange={closeRespondModal}
          request={respondRequest}
          readOnly={isRespondReadOnly}
          onViewSimilarRequest={handleViewSimilarRequest}
          onShowToast={(variant, message) => setToast({ open: true, variant, message })}
          onSuccess={refreshDashboard}
        />

        <AssignAdminModal
          open={assignOpen}
          onOpenChange={(next) => {
            setAssignOpen(next)
            if (!next) setAssignRequest(null)
          }}
          request={assignRequest}
          role={getComplianceAssignRole(assignRequest?.type)}
          onShowToast={(variant, message) => setToast({ open: true, variant, message })}
          onSuccess={refreshDashboard}
        />

        <RaiseQueryModal
          open={raiseQueryOpen}
          onOpenChange={setRaiseQueryOpen}
          onSuccess={refreshDashboard}
        />
        <RaiseComplaintModal
          open={raiseComplaintOpen}
          onOpenChange={setRaiseComplaintOpen}
          onSuccess={refreshDashboard}
        />
        <GiftDeclarationModal
          open={giftDeclarationOpen}
          onOpenChange={setGiftDeclarationOpen}
          onShowToast={(variant, message) => setToast({ open: true, variant, message })}
          onSuccess={refreshDashboard}
        />

      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </>
  )

  if (isLanding) {
    return (
      <div className={shellClass}>
        <LandingSectionPanel className="min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 md:p-8 lg:p-10">
          {body}
        </LandingSectionPanel>
      </div>
    )
  }

  return <div className={shellClass}>{body}</div>
}
