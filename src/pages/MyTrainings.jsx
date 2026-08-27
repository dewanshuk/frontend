import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Filter, Search, Link2, Download, X } from "lucide-react"
import Select from "react-select"
import * as Yup from "yup"

import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import CenterToast from "@/components/shared/CenterToast"
import MyTrainingStatsCard from "@/components/training/MyTrainingStatsCard"
import DateRangePicker from "@/atoms/date-range-picker"
import { getUserTrainings, getUserTrainingMetadata, exportUserTrainings } from "@/api/trainingApi"
import LandingSectionPanel from "@/components/landing/LandingSectionPanel"
import { landingShellInnerClassName } from "@/components/landing/landingTheme"
import { LANDING_V2_BASE } from "@/lib/appNavigation"
import { useLocation } from "react-router-dom"

/* ---------------------------------- utils --------------------------------- */

const inputBoxStyle = {
  borderColor: "var(--sds-border-default)",
  backgroundColor: "var(--sds-bg-default)",
}

const STATUS_OPTIONS = [
  { value: "Completed", label: "Completed" },
  { value: "Due", label: "Due" },
  { value: "Overdue", label: "Overdue" },
]

const toFYLabel = (startYear) => `${startYear}-${String(startYear + 1).slice(-2)}`

const buildFinancialYearOptions = () => {
  const today = new Date()
  const currentFYStart = (today.getMonth() + 1) >= 4 ? today.getFullYear() : today.getFullYear() - 1
  // 2 past FYs + current + next — mirrors Add Training options while keeping historical data filterable
  return [-2, -1, 0, 1].map((offset) => {
    const label = toFYLabel(currentFYStart + offset)
    return { value: label, label }
  })
}

const FINANCIAL_YEAR_OPTIONS = buildFinancialYearOptions()

const requireCompleteDateRange = (fromKey, toKey, path, label) =>
  function validateDateRange(value) {
    const from = value?.[fromKey]
    const to = value?.[toKey]
    const hasFrom = Boolean(from)
    const hasTo = Boolean(to)

    if (hasFrom !== hasTo) {
      return this.createError({
        path,
        message: `Please select a full ${label} range (start and end date).`,
      })
    }

    return true
  }

const trainingFiltersSchema = Yup.object({
  training_due_date_from: Yup.string().nullable(),
  training_due_date_to: Yup.string().nullable(),
  training_assigned_date_from: Yup.string().nullable(),
  training_assigned_date_to: Yup.string().nullable(),
  actual_completion_date_from: Yup.string().nullable(),
  actual_completion_date_to: Yup.string().nullable(),
})
  .test(
    "training-due-date-range",
    "",
    requireCompleteDateRange(
      "training_due_date_from",
      "training_due_date_to",
      "training_due_date",
      "Training Due Date",
    ),
  )
  .test(
    "training-assigned-date-range",
    "",
    requireCompleteDateRange(
      "training_assigned_date_from",
      "training_assigned_date_to",
      "training_assigned_date",
      "Training Assigned Date",
    ),
  )
  .test(
    "actual-completion-date-range",
    "",
    requireCompleteDateRange(
      "actual_completion_date_from",
      "actual_completion_date_to",
      "actual_completion_date",
      "Actual Completion Date",
    ),
  )

const parseDateRangePickerValue = (value) => {
  const parts = String(value || "")
    .split(/\s*-\s*/)
    .map((part) => part?.trim())
    .filter(Boolean)

  return {
    from: parts[0],
    to: parts[1],
  }
}

/** Portaled menus / calendars sit outside DialogContent; don't treat them as "outside" dismiss. */
const isFilterDialogPortalTarget = (target) => {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      [
        ".react-select__menu",
        ".react-select__menu-portal",
        "[data-date-range-picker-popup]",
        "[data-searchable-select]",
        "#ecp-date-range-picker-root",
      ].join(", "),
    ),
  )
}

const filterSelectMenuPortalStyles = {
  // Radix modal Dialog sets body { pointer-events: none }; portaled menus must opt back in.
  // z-index above DialogContent (z-[110]) so the menu stays clickable/scrollable.
  menuPortal: (base) => ({ ...base, zIndex: 99999, pointerEvents: "auto" }),
  menu: (base) => ({ ...base, pointerEvents: "auto" }),
}

const FILTER_SESSION_KEY = "myTrainingsFilterState"

// Helper function to convert DD/MMM/YYYY (or DD/MM/YYYY) to YYYY-MM-DD
const convertToApiDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return undefined
  const [day, monthPart, year] = dateStr.trim().split("/")
  if (!day || !monthPart || !year) return undefined

  let month = monthPart;
  // monthPart may be numeric (01) or short name (Jan)
  if (!/^[0-9]+$/.test(monthPart)) {
    const parsed = new Date(`${monthPart} 1, ${year}`)
    if (isNaN(parsed.getTime())) return undefined
    month = String(parsed.getMonth() + 1).padStart(2, "0")
  } else {
    month = String(Number(monthPart)).padStart(2, "0")
  }

  return `${year}-${month}-${day.padStart(2, "0")}`
}

// Helper function to convert YYYY-MM-DD to DD/MMM/YYYY
const convertFromApiDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return undefined
  const [year, month, day] = dateStr.trim().split("-")
  if (!day || !month || !year) return undefined
  const m = Number(month) - 1
  const monthShort = new Date(Number(year), m, 1).toLocaleString("default", { month: "short" })
  return `${day.padStart(2, "0")}/${monthShort}/${year}`
}

const formatDraftDateRangeValue = (fromApi, toApi) => {
  if (fromApi && toApi) {
    return `${convertFromApiDate(fromApi)} - ${convertFromApiDate(toApi)}`
  }
  if (fromApi) {
    return convertFromApiDate(fromApi) || ""
  }
  if (toApi) {
    return convertFromApiDate(toApi) || ""
  }
  return ""
}



function filterSelectionsEqual(a, b, keys) {
  for (const k of keys) {
    const aa = [...(a?.[k] ?? [])].sort().join("\0")
    const bb = [...(b?.[k] ?? [])].sort().join("\0")
    if (aa !== bb) return false
  }
  return true
}

function normalizeRolesFromApi(rolesLike) {
  if (Array.isArray(rolesLike)) return rolesLike.filter(Boolean)
  if (typeof rolesLike === "string") return rolesLike.split(",").map((r) => r.trim()).filter(Boolean)
  return []
}

function deriveRolesFromUserFlags(user) {
  const roles = ["Employee"]

  if (user?.is_policy_hub_admin) roles.push("Policy Admin")
  if (user?.is_knowledge_hub_admin) roles.push("KH Admin")
  if (user?.is_master_admin) roles.push("Master Admin")

  // Keep unique while preserving insertion order.
  return Array.from(new Set(roles))
}

function normalizeRoleArray(roles) {
  return Array.isArray(roles) ? [...roles].sort() : []
}

function rolesEqual(a, b) {
  const aa = normalizeRoleArray(a)
  const bb = normalizeRoleArray(b)
  if (aa.length !== bb.length) return false
  return aa.every((v, i) => v === bb[i])
}

/* ------------------------------- status pill ------------------------------- */

function StatusPill({ value }) {
  const normalized = String(value ?? "").trim().toLowerCase()
  const styles = {
    completed: "bg-emerald-100 text-emerald-800",
    due: "bg-amber-100 text-amber-800",
    overdue: "bg-rose-100 text-rose-800",
    "not completed": "bg-rose-100 text-rose-800",
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-24 justify-center rounded-lg px-4 py-2 text-base font-semibold leading-[1.4]",
        styles[normalized] ?? "bg-slate-200 text-slate-600"
      )}
    >
      {value}
    </span>
  )
}

function TruncatedCell({ value, className }) {
  const text = String(value ?? "")
  return (
    <div className={cn("truncate", className)} title={text}>
      {text || "-"}
    </div>
  )
}

/* ------------------------------- main page --------------------------------- */

export default function MyTrainings({ variant = "default" }) {
  const location = useLocation()
  const isLanding =
    variant === "landing" ||
    location.pathname === `${LANDING_V2_BASE}/trainings` ||
    location.pathname.startsWith(`${LANDING_V2_BASE}/trainings/`)

  const [rows, setRows] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [trainingStats, setTrainingStats] = useState({
    totalAssigned: 0,
    overdue: 0,
    due: 0,
    completed: 0,
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [loadError, setLoadError] = useState(null) // 'api' | 'search' | null

  const [editRoleOpen, setEditRoleOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [originalRoles, setOriginalRoles] = useState([])
  const [originalTitle, setOriginalTitle] = useState("")
  const [formRoles, setFormRoles] = useState([])
  const [formTitle, setFormTitle] = useState("")
  const [isSavingRoles, setIsSavingRoles] = useState(false)
  const [roleRuleMessage, setRoleRuleMessage] = useState("")
  const [didSubmitRoles, setDidSubmitRoles] = useState(false)

  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [discardFilterConfirmOpen, setDiscardFilterConfirmOpen] = useState(false)
  const [appliedFilterSelections, setAppliedFilterSelections] = useState({})
  const [draftFilterSelections, setDraftFilterSelections] = useState({})
  const [filterErrors, setFilterErrors] = useState({})
  const [selectedTile, setSelectedTile] = useState("Total Assigned")
  const tableAnchorRef = useRef(null)
  const filterDialogRef = useRef(null)

  const [toast, setToast] = useState({
    open: false,
    variant: "success",
    message: "",
  })
  const [isExporting, setIsExporting] = useState(false)

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

  const handleExportTrainings = async () => {
    if (isExporting) return
    if (totalUsers === 0) {
      setToast({ open: true, variant: "destructive", message: "Nothing to export" })
      return
    }
    setIsExporting(true)

    try {
      const activeSearch = searchQuery.trim().length >= 2 ? searchQuery.trim() : ""
      const payload = {
        ...(activeSearch ? { search: activeSearch, training_name: [activeSearch] } : {}),
        ...(Array.isArray(appliedFilterSelections.status) && appliedFilterSelections.status.length > 0
          ? { status: appliedFilterSelections.status }
          : {}),
        ...(Array.isArray(appliedFilterSelections.financial_year) && appliedFilterSelections.financial_year.length > 0
          ? { financial_year: appliedFilterSelections.financial_year }
          : {}),
        ...(appliedFilterSelections.training_assigned_date_from
          ? { training_assigned_date_from: appliedFilterSelections.training_assigned_date_from }
          : {}),
        ...(appliedFilterSelections.training_assigned_date_to
          ? { training_assigned_date_to: appliedFilterSelections.training_assigned_date_to }
          : {}),
        ...(appliedFilterSelections.training_due_date_from
          ? { training_due_date_from: appliedFilterSelections.training_due_date_from }
          : {}),
        ...(appliedFilterSelections.training_due_date_to
          ? { training_due_date_to: appliedFilterSelections.training_due_date_to }
          : {}),
        ...(appliedFilterSelections.actual_completion_date_from
          ? { activity_closure_date_from: appliedFilterSelections.actual_completion_date_from }
          : {}),
        ...(appliedFilterSelections.actual_completion_date_to
          ? { activity_closure_date_to: appliedFilterSelections.actual_completion_date_to }
          : {}),
      }

      const response = await exportUserTrainings(
        Object.keys(payload).length ? payload : {},
      )
      downloadBlobResponse(response, "training_export.xlsx")
      setToast({ open: true, variant: "success", message: "Export started successfully." })
    } catch (error) {
      console.error("Failed to export trainings:", error)
      setToast({
        open: true,
        variant: "destructive",
        message: error?.message || "Failed to export trainings.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Debounce search; wait 300ms after user stops typing before triggering API call.
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length >= 2) {
      const id = window.setTimeout(() => setDebouncedSearchQuery(trimmed), 300)
      return () => window.clearTimeout(id)
    }
    setDebouncedSearchQuery("")
  }, [searchQuery])

  // When the search query changes, restart from the first page.
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearchQuery])

  useEffect(() => {
    let cancelled = false

    const fetchTrainingMetadata = async () => {
      try {
        const response = await getUserTrainingMetadata()
        if (cancelled) return

        const totalAssigned = Number(response.Total_Assigned ?? response.total_assigned ?? 0)
        const completed = Number(response.Completed ?? response.completed ?? 0)
        const due = Number(response.Due ?? response.due ?? 0)
        const overdue = Number(response.Overdue ?? response.overdue ?? 0)

        setTrainingStats({
          totalAssigned,
          overdue,
          due,
          completed,
        })
      } catch (error) {
        console.error("Failed to load training metadata:", error)
      }
    }

    fetchTrainingMetadata()

    return () => {
      cancelled = true
    }
  }, [])

  // Fetch paginated training items from the user training API.
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setIsUsersLoading(true)
      setLoadError(null)
      try {
          const page_number = pagination.pageIndex + 1
        const payload = {
          training_name: debouncedSearchQuery || undefined,
          limit: pagination.pageSize,
          page_number,
          status: appliedFilterSelections.status || undefined,
          financial_year: appliedFilterSelections.financial_year || undefined,
          training_assigned_date_from: appliedFilterSelections.training_assigned_date_from || undefined,
          training_assigned_date_to: appliedFilterSelections.training_assigned_date_to || undefined,
          training_due_date_from: appliedFilterSelections.training_due_date_from || undefined,
          training_due_date_to: appliedFilterSelections.training_due_date_to || undefined,
          actual_completion_date_from: appliedFilterSelections.actual_completion_date_from || undefined,
          actual_completion_date_to: appliedFilterSelections.actual_completion_date_to || undefined,
        }

        // Remove undefined values from payload
        const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value
          }
          return acc
        }, {})

        const response = await getUserTrainings(cleanPayload)

        if (cancelled) return

        setRows(
          (response.items || []).map((item) => ({
            trainingName: item.training_name ?? "",
            financialYear: item.financial_year ?? "",
            // BE now returns display dates (e.g. 16/JUL/2026); render as-is
            trainingAssignedDate: item.training_assigned_date ?? "",
            trainingDueDate: item.training_due_date ?? "",
            status: item.status ?? "",
            actualCompletionDate: item.actual_completion_date ?? "",
            trainingLink: item.training_link ?? "",
          })),
        )
        setTotalUsers(Number.isFinite(response.total) ? response.total : 0)
      } catch (error) {
        if (cancelled) return
        // Determine if error is from search or API
        const isSearchError = debouncedSearchQuery.trim().length >= 2
        setLoadError(isSearchError ? 'search' : 'api')
      } finally {
        if (cancelled) return
        setIsUsersLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [debouncedSearchQuery, pagination.pageIndex, pagination.pageSize, appliedFilterSelections])

  useEffect(() => {
    if (!editRoleOpen || !editUser) return
    const nextRoles = normalizeRolesFromApi(editUser?.roles)
    const nextTitle = editUser.designation ?? ""
    const uniqRoles = Array.from(new Set(nextRoles))
    setOriginalRoles(uniqRoles)
    setFormRoles(uniqRoles)
    setOriginalTitle(nextTitle)
    setFormTitle(nextTitle)
    setRoleRuleMessage("")
    setDidSubmitRoles(false)
  }, [editRoleOpen, editUser])

  const hasRoleChanges = !rolesEqual(formRoles, originalRoles)
  const hasTitleChanges = formTitle !== originalTitle
  const hasFormChanges = hasRoleChanges || hasTitleChanges

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (Array.isArray(appliedFilterSelections.status) && appliedFilterSelections.status.length > 0) count++
    if (Array.isArray(appliedFilterSelections.financial_year) && appliedFilterSelections.financial_year.length > 0) count++
    if (appliedFilterSelections.training_assigned_date_from || appliedFilterSelections.training_assigned_date_to) count++
    if (appliedFilterSelections.training_due_date_from || appliedFilterSelections.training_due_date_to) count++
    if (appliedFilterSelections.actual_completion_date_from || appliedFilterSelections.actual_completion_date_to) count++
    return count
  }, [appliedFilterSelections])

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(debouncedSearchQuery) ||
      Boolean(selectedTile && selectedTile !== "Total Assigned") ||
      Object.keys(appliedFilterSelections).some((key) => {
        const val = appliedFilterSelections[key]
        return (
          (Array.isArray(val) && val.length > 0) ||
          (typeof val === "string" && val.trim() !== "")
        )
      })
    )
  }, [appliedFilterSelections, debouncedSearchQuery, selectedTile])

  const filterDraftDirtyKeys = useMemo(() => {
    return Array.from(
      new Set([...Object.keys(draftFilterSelections), ...Object.keys(appliedFilterSelections)])
    )
  }, [draftFilterSelections, appliedFilterSelections])

  const isFilterDraftDirty = useCallback(() => {
    return !filterSelectionsEqual(
      draftFilterSelections,
      appliedFilterSelections,
      filterDraftDirtyKeys.length ? filterDraftDirtyKeys : Object.keys(draftFilterSelections)
    )
  }, [draftFilterSelections, appliedFilterSelections, filterDraftDirtyKeys])

  const openFilterModal = () => {
    setFilterModalOpen(true)
    setFilterErrors({})
    setDraftFilterSelections({ ...appliedFilterSelections })
  }

  const requestCloseFilterModal = (nextOpen) => {
    if (!nextOpen && isFilterDraftDirty()) {
      setDiscardFilterConfirmOpen(true)
      return
    }
    setFilterModalOpen(nextOpen)
  }

  const handleConfirmDiscardFilterChanges = () => {
    setDiscardFilterConfirmOpen(false)
    setFilterModalOpen(false)
  }

  const handleCancelDiscardFilterChanges = () => {
    setDiscardFilterConfirmOpen(false)
  }

  const handleSubmitFilters = async () => {
    try {
      await trainingFiltersSchema.validate(draftFilterSelections, { abortEarly: false })
      setFilterErrors({})
      setAppliedFilterSelections({ ...draftFilterSelections })
      setSelectedTile(null)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
      setFilterModalOpen(false)
    } catch (err) {
      if (err?.name === "ValidationError") {
        const nextErrors = {}
        if (Array.isArray(err.inner) && err.inner.length > 0) {
          err.inner.forEach((issue) => {
            if (issue.path) nextErrors[issue.path] = issue.message
          })
        } else if (err.path) {
          nextErrors[err.path] = err.message
        }
        setFilterErrors(nextErrors)
        return
      }
      throw err
    }
  }

  const handleResetFilters = () => {
    // Clear draft and applied selections, reset tiles and pagination immediately
    setDraftFilterSelections({})
    setFilterErrors({})
    setSelectedTile("Total Assigned")
    setAppliedFilterSelections({})
    setPagination((p) => ({ ...p, pageIndex: 0 }))
    setFilterModalOpen(false)
  }

  const handleFilterCancelClick = () => {
    requestCloseFilterModal(false)
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const savedState = window.sessionStorage.getItem(FILTER_SESSION_KEY)
      if (!savedState) return

      const parsed = JSON.parse(savedState)
      if (parsed?.appliedFilterSelections) {
        setAppliedFilterSelections(parsed.appliedFilterSelections)
        setDraftFilterSelections(parsed.appliedFilterSelections)
      }
      if (parsed?.draftFilterSelections) {
        setDraftFilterSelections(parsed.draftFilterSelections)
      }
      if (parsed?.selectedTile) {
        setSelectedTile(parsed.selectedTile)
      }
      if (typeof parsed?.searchQuery === "string") {
        setSearchQuery(parsed.searchQuery)
        if (parsed.searchQuery.trim().length >= 2) {
          setDebouncedSearchQuery(parsed.searchQuery.trim())
        }
      }
      if (parsed?.pagination) {
        setPagination((prev) => ({
          pageIndex:
            Number.isFinite(parsed.pagination.pageIndex) && parsed.pagination.pageIndex >= 0
              ? parsed.pagination.pageIndex
              : prev.pageIndex,
          pageSize:
            Number.isFinite(parsed.pagination.pageSize) && parsed.pagination.pageSize > 0
              ? parsed.pagination.pageSize
              : prev.pageSize,
        }))
      }
    } catch (error) {
      console.error("Failed to restore training filters from session:", error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const stateToSave = {
      appliedFilterSelections,
      draftFilterSelections,
      selectedTile,
      searchQuery,
      pagination,
    }

    window.sessionStorage.setItem(FILTER_SESSION_KEY, JSON.stringify(stateToSave))
  }, [appliedFilterSelections, draftFilterSelections, selectedTile, searchQuery, pagination])

  const handleTileClick = (cardTitle) => {
    const nextSelected = selectedTile === cardTitle ? null : cardTitle
    const nextStatus = cardTitle === "Total Assigned" || nextSelected === null ? undefined : [cardTitle]

    setSelectedTile(nextSelected)
    setAppliedFilterSelections((prev) => ({ ...prev, status: nextStatus }))
    setDraftFilterSelections((prev) => ({ ...prev, status: nextStatus }))
    setPagination((p) => ({ ...p, pageIndex: 0 }))

    if (tableAnchorRef.current) {
      tableAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  /* ------------------------------- columns --------------------------------- */

const columns = useMemo(
  () => [
    {
      accessorKey: "trainingName",
      header: "Training Name",
      size: 160,
      cell: ({ getValue }) => (
          <TruncatedCell
            value={getValue()}
            className="max-w-[180px]"
          />
        ),
    },
    {
      accessorKey: "financialYear",
      header: "Financial Year",
      size: 120,
      meta: { align: "center" },
      cell: ({ getValue }) => (
        <TruncatedCell value={getValue()} className="max-w-40 mx-auto" />
      ),
    },
    {
      accessorKey: "trainingAssignedDate",
      header: "Training Assigned Date",
      size: 160,
      meta: { align: "center" },
      cell: ({ getValue }) => (
        <TruncatedCell value={getValue()} className="max-w-56 mx-auto" />
      ),
    },
    {
      accessorKey: "trainingDueDate",
      header: "Training Due Date",
      size: 160,
      meta: { align: "center" },
      cell: ({ getValue }) => (
        <TruncatedCell value={getValue()} className="max-w-56 mx-auto" />
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 140,
      meta: { align: "center" },
      cell: ({ getValue }) => (
        <StatusPill value={getValue()} />
      ),
    },
    {
      accessorKey: "actualCompletionDate",
      header: "Actual Completion Date",
      size: 160,
      meta: { align: "center" },
      cell: ({ getValue }) => (
        <TruncatedCell value={getValue()} className="max-w-56 mx-auto" />
      ),
    },
{
  accessorKey: "trainingLink",
  header: "Training Link",
  size: 120,
  meta: { align: "center" },
  cell: ({ getValue }) => {
    const url = getValue();

    if (!url) {
      return <span className="text-slate-400">—</span>;
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800"
        title={url}
      >
        <Link2 size={16} />
        <span>Link</span>
      </a>
    );
  },
}
  ],
  []
);

  const tableMinWidth = useMemo(
    () => columns.reduce((sum, column) => sum + (column.size || 120), 0),
    [columns],
  )

  /* ----------------------------- table logic ------------------------------- */

  const pageCount = Math.max(1, Math.ceil(totalUsers / pagination.pageSize))

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange: setPagination,
  })

  /* -------------------------------- render --------------------------------- */

  const shellClass = isLanding
    ? landingShellInnerClassName("pb-16 pt-8")
    : "min-h-full w-full max-w-full min-w-0 overflow-x-hidden bg-secondary p-4 sm:p-5"

  const body = (
    <>
      {!isLanding ? (
        <h1 className="mb-4 text-xl font-semibold">My e-Module Trainings</h1>
      ) : null}

        {/* search */}
        <div className="mb-4 flex w-full min-w-0 max-w-full flex-wrap items-center gap-3">
          <div
            className="flex h-9 min-w-0 flex-1 basis-full items-center gap-2 rounded border px-3 sm:basis-72 sm:max-w-md"
            style={inputBoxStyle}
          >
            <Input
              placeholder="Search e-Module Trainings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-full border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
            <Search className="h-4 w-4 shrink-0 text-blue-600" />
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleExportTrainings}
              disabled={isExporting}
              aria-disabled={isExporting || totalUsers === 0}
              className={cn(
                "flex h-9 items-center gap-2 px-4 text-sm font-medium",
                isExporting || totalUsers === 0
                  ? "cursor-not-allowed bg-blue-100 text-blue-400 opacity-70"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
              )}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>

            <Button
              type="button"
              onClick={openFilterModal}
              className="relative flex h-9 items-center gap-2 bg-blue-100 px-4 text-sm font-medium text-blue-600 hover:bg-blue-200"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="mb-4 w-full min-w-0 max-w-full">
          <MyTrainingStatsCard
            stats={trainingStats}
            selectedKey={selectedTile}
            onCardClick={handleTileClick}
          />
        </div>

        {/* TABLE */}
        <div
          ref={tableAnchorRef}
          className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <div className="h-3 bg-white" />

          <div className="w-full min-w-0 max-w-full overflow-x-auto bg-white">
            <table
              className="w-full table-fixed border-collapse"
              style={{ minWidth: tableMinWidth }}
            >
              <thead className="bg-secondary">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => {
                      const isCenter = h.column.columnDef.meta?.align === "center";

                      return (
                        <th
                          key={h.id}
                          style={{ width: h.getSize() }}
                          className={cn(
                            "h-14 border-b border-[#d9d9d9] bg-[#f5f5f5] px-3 py-3 text-base font-medium leading-[1.4] text-black sm:px-4",
                            isCenter ? "text-center" : "text-left",
                            h.column.columnDef.meta?.isSticky &&
                              "sticky right-0 z-30 border-l border-slate-400 bg-red-50 shadow-[-12px_0_14px_-10px_rgba(15,23,42,0.35)]"
                          )}
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext()
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {isUsersLoading && table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      className="sticky left-0 bg-white px-4 py-6 text-center text-base text-[#757575]"
                    >
                      Loading trainings...
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      className="px-4 py-6 text-center text-base text-[#757575]"
                    >
                      {loadError === "search"
                        ? "Search unavailable. Please retry."
                        : loadError === "api"
                        ? "Unable to load trainings"
                        : debouncedSearchQuery
                        ? "No Items Match Your Search"
                        : hasActiveFilters
                        ? "No Items Found, try clearing filters."
                        : "No Results Found"}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => {
                        const isCenter =
                          cell.column.columnDef.meta?.align === "center";

                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "h-14 border-b border-[#d9d9d9] px-3 py-3 text-base font-normal leading-[1.4] text-[#1e1e1e] sm:px-4",
                              isCenter ? "text-center" : "text-left"
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* pagination */}
        <div className="mt-4 flex items-center justify-center shrink-0 px-4 py-4">
          <Pagination
            currentPage={table.getState().pagination.pageIndex + 1}
            totalPages={table.getPageCount()}
            onPageChange={(page) => table.setPageIndex(page - 1)}
          />
        </div>

      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />

      <Dialog open={filterModalOpen} onOpenChange={requestCloseFilterModal}>
        <DialogContent
          ref={filterDialogRef}
          className="flex h-[85vh] max-w-[calc(100vw-2rem)] flex-col bg-white sm:max-w-2xl"
          onPointerDownOutside={(event) => {
            if (isFilterDialogPortalTarget(event.target)) event.preventDefault()
          }}
          onFocusOutside={(event) => {
            if (isFilterDialogPortalTarget(event.target)) event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (isFilterDialogPortalTarget(event.target)) event.preventDefault()
          }}
        >
          <DialogHeader className="">
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pl-1 pr-4">
            {/* Status Field - 1st Row */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
              <label className="text-sm font-semibold text-black">Status</label>
              <Select
                isMulti
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.filter((option) =>
                  Array.isArray(draftFilterSelections.status) && draftFilterSelections.status.includes(option.value)
                )}
                onChange={(selected) =>
                  setDraftFilterSelections((prev) => ({
                    ...prev,
                    status: selected && selected.length > 0 ? selected.map((item) => item.value) : undefined,
                  }))
                }
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="All"
                noOptionsMessage={() => "No options available"}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="fixed"
                styles={filterSelectMenuPortalStyles}
              />
              </div>
            </div>

            {/* 2nd Row - Financial Year and Training Assigned Date */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Financial Year</label>
                <Select
                  isMulti
                  options={FINANCIAL_YEAR_OPTIONS}
                  value={FINANCIAL_YEAR_OPTIONS.filter((option) =>
                    Array.isArray(draftFilterSelections.financial_year) && draftFilterSelections.financial_year.includes(option.value)
                  )}
                  onChange={(selected) =>
                    setDraftFilterSelections((prev) => ({
                      ...prev,
                      financial_year: selected && selected.length > 0 ? selected.map((item) => item.value) : undefined,
                    }))
                  }
                  className="react-select-container"
                  classNamePrefix="react-select"
                  placeholder="All"
                  noOptionsMessage={() => "No options available"}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                  menuPosition="fixed"
                  styles={filterSelectMenuPortalStyles}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Training Assigned Date</label>
                <DateRangePicker
                  portalContainer={filterDialogRef}
                  emitPartialSelection
                  value={formatDraftDateRangeValue(
                    draftFilterSelections.training_assigned_date_from,
                    draftFilterSelections.training_assigned_date_to,
                  )}
                  onChange={(value) => {
                    const { from, to } = parseDateRangePickerValue(value)
                    setDraftFilterSelections((prev) => ({
                      ...prev,
                      training_assigned_date_from: convertToApiDate(from) || undefined,
                      training_assigned_date_to: convertToApiDate(to) || undefined,
                    }))
                    setFilterErrors((prev) => ({ ...prev, training_assigned_date: undefined }))
                  }}
                  className="w-full"
                  inputClassName={`text-sm ${filterErrors.training_assigned_date ? "border-red-500" : ""}`}
                  showIcon
                />
                {filterErrors.training_assigned_date ? (
                  <small className="text-red-500">{filterErrors.training_assigned_date}</small>
                ) : null}
              </div>
            </div>

            {/* 3rd Row - Training Due Date and Actual Completion Date */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Training Due Date</label>
                <DateRangePicker
                  portalContainer={filterDialogRef}
                  emitPartialSelection
                  value={formatDraftDateRangeValue(
                    draftFilterSelections.training_due_date_from,
                    draftFilterSelections.training_due_date_to,
                  )}
                  onChange={(value) => {
                    const { from, to } = parseDateRangePickerValue(value)
                    setDraftFilterSelections((prev) => ({
                      ...prev,
                      training_due_date_from: convertToApiDate(from) || undefined,
                      training_due_date_to: convertToApiDate(to) || undefined,
                    }))
                    setFilterErrors((prev) => ({ ...prev, training_due_date: undefined }))
                  }}
                  className="w-full"
                  inputClassName={`text-sm ${filterErrors.training_due_date ? "border-red-500" : ""}`}
                  showIcon
                />
                {filterErrors.training_due_date ? (
                  <small className="text-red-500">{filterErrors.training_due_date}</small>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Actual Completion Date</label>
                <DateRangePicker
                  portalContainer={filterDialogRef}
                  emitPartialSelection
                  value={formatDraftDateRangeValue(
                    draftFilterSelections.actual_completion_date_from,
                    draftFilterSelections.actual_completion_date_to,
                  )}
                  onChange={(value) => {
                    const { from, to } = parseDateRangePickerValue(value)
                    setDraftFilterSelections((prev) => ({
                      ...prev,
                      actual_completion_date_from: convertToApiDate(from) || undefined,
                      actual_completion_date_to: convertToApiDate(to) || undefined,
                    }))
                    setFilterErrors((prev) => ({ ...prev, actual_completion_date: undefined }))
                  }}
                  className="w-full"
                  inputClassName={`text-sm ${filterErrors.actual_completion_date ? "border-red-500" : ""}`}
                  showIcon
                />
                {filterErrors.actual_completion_date ? (
                  <small className="text-red-500">{filterErrors.actual_completion_date}</small>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              onClick={handleResetFilters}
              className="bg-slate-100 text-purple-600 bg-white hover:underline hover:bg-white"
            >
              Reset Filters
            </Button>
            <Button
              type="button"
              onClick={handleSubmitFilters}
              className="mr-5 bg-purple-500 text-white hover:bg-purple-600"
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={discardFilterConfirmOpen} onOpenChange={setDiscardFilterConfirmOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Discard filter changes?</DialogTitle>
          </DialogHeader>
          <div className="pb-5 text-sm text-slate-600">
            Your unsaved filter selections will be lost if you close the filters.
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDiscardFilterChanges}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDiscardFilterChanges}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )

  if (isLanding) {
    return (
      <div
        className="min-h-full w-full"
        style={{ background: "linear-gradient(100deg, #f3f7ff 0%, #e8f6fc 45%, #e9faf8 100%)" }}
      >
        <div className={shellClass}>
          <LandingSectionPanel className="min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6 md:p-8 lg:p-10">
            {body}
          </LandingSectionPanel>
        </div>
      </div>
    )
  }

  return <div className={shellClass}>{body}</div>
}
