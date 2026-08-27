import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Check, ChevronDown, Filter, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import CenterToast from "@/components/shared/CenterToast"
import {
  listUsers,
  updateUser,
  getFilterOptions,
  buildListUsersFilterBody,
} from "@/api/userManagementApi"

/* ---------------------------------- utils --------------------------------- */

const ROLE_OPTIONS = [
  "Employee",
  "Policy Admin",
  "KH Admin",
  "Master Admin",
  "Chief Compliance Officer",
  "Audit Lead",
  "Query Lead",
  "Complaint Lead",
  "COBCE/COI/Gift Lead",
].sort((a, b) => a.localeCompare(b))

function formatFilterFieldHeading(dataKey) {
  return String(dataKey ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function filterSelectionsEqual(a, b, keys) {
  for (const k of keys) {
    const aa = [...(a?.[k] ?? [])].sort().join("\0")
    const bb = [...(b?.[k] ?? [])].sort().join("\0")
    if (aa !== bb) return false
  }
  return true
}

// If business rules require at least one base role, keep it here.
const REQUIRED_ROLES = ["Employee"]

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
  if (user?.is_chief_compliance_officer) roles.push("Chief Compliance Officer")
  if (user?.is_audit_lead) roles.push("Audit Lead")
  if (user?.is_query_lead) roles.push("Query Lead")
  if (user?.is_complaint_lead) roles.push("Complaint Lead")
  if (user?.is_cobce_coi_gift_lead) roles.push("COBCE/COI/Gift Lead")

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
  const active = String(value).toLowerCase() === "active"
  return (
    <span
      className={cn(
        "inline-flex min-w-[95px] items-center justify-center rounded-lg px-4 py-2 text-[18px] font-semibold leading-[1.4] whitespace-nowrap",
        active ? "bg-green-400/15 text-[#009951]" : "bg-[#f5f5f5] text-[#757575]"
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

function MappedRolesCell({ roles }) {
  const roleList = Array.isArray(roles) ? roles : []
  const [expanded, setExpanded] = useState(false)
  const COLLAPSED_COUNT = 2

  if (roleList.length === 0) {
    return <span className="text-[#757575]">-</span>
  }

  const canExpand = roleList.length > COLLAPSED_COUNT
  const visibleRoles = expanded || !canExpand ? roleList : roleList.slice(0, COLLAPSED_COUNT)
  const hiddenCount = roleList.length - COLLAPSED_COUNT

  return (
    <div className="min-w-0" title={roleList.join(", ")}>
      <div className={cn("flex items-center gap-1.5", expanded ? "flex-wrap" : "flex-nowrap")}>
        {visibleRoles.map((role) => (
          <span
            key={role}
            className="inline-flex shrink-0 items-center rounded-md border border-[#d9d9d9] bg-white px-3 py-1 text-[18px] font-medium leading-[1.4] text-[rgba(0,0,0,0.75)] whitespace-nowrap"
          >
            {role}
          </span>
        ))}
        {canExpand ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((prev) => !prev)
            }}
            className="inline-flex shrink-0 items-center rounded-md border border-transparent bg-[#8b5cf6]/10 px-3 py-1 text-[18px] font-medium leading-[1.4] text-[#8b5cf6] whitespace-nowrap hover:bg-[#8b5cf6]/15"
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : `+${hiddenCount}`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function handleNestedScrollWheel(event) {
  const el = event.currentTarget
  const { scrollTop, scrollHeight, clientHeight } = el
  const canScroll = scrollHeight > clientHeight
  if (!canScroll) return

  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1
  const scrollingUp = event.deltaY < 0
  const scrollingDown = event.deltaY > 0

  if ((scrollingUp && !atTop) || (scrollingDown && !atBottom)) {
    el.scrollTop += event.deltaY
    event.preventDefault()
    event.stopPropagation()
  }
}

function RoleSelectDropdown({ selected, onSelectionChange, portalContainer }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return ROLE_OPTIONS
    return ROLE_OPTIONS.filter((option) => option.toLowerCase().includes(normalizedQuery))
  }, [query])

  const toggleOption = (option) => {
    const nextSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onSelectionChange(nextSelected)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-between rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-black shadow-none hover:bg-white hover:text-black focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="text-slate-500">Select</span>
          <ChevronDown className="h-4 w-4 text-black opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer}
        className="w-[var(--radix-popover-trigger-width)] border border-slate-300 bg-white p-2 z-[200]"
        align="start"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to Search"
          className="mb-2 h-9 border-slate-300 bg-white text-sm text-black focus-visible:ring-0"
        />
        <div className="max-h-36 overflow-y-auto overscroll-contain" onWheel={handleNestedScrollWheel}>
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-4 text-sm text-slate-500">No options available</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  onClick={() => toggleOption(option)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border",
                      isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-transparent"
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{option}</span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function OptionsMultiSelect({ options, selected, onSelectionChange, disabled, portalContainer }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const safeOptions = Array.isArray(options) ? options : []

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return safeOptions
    return safeOptions.filter((option) => String(option).toLowerCase().includes(normalizedQuery))
  }, [query, safeOptions])

  const toggleOption = (option) => {
    const nextSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onSelectionChange(nextSelected)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-10 w-full justify-between rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-black shadow-none hover:bg-white hover:text-black focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-60"
        >
          <span className="text-slate-500">Select</span>
          <ChevronDown className="h-4 w-4 text-black opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer}
        className="w-[var(--radix-popover-trigger-width)] border border-slate-300 bg-white p-2 z-[200]"
        align="start"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to Search"
          className="mb-2 h-9 border-slate-300 bg-white text-sm text-black focus-visible:ring-0"
        />
        <div className="max-h-60 overflow-y-auto overscroll-contain" onWheel={handleNestedScrollWheel}>
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-4 text-sm text-slate-500">No options available</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.includes(option)
              return (
                <button
                  key={String(option)}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  onClick={() => toggleOption(option)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border",
                      isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-transparent"
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{option}</span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ------------------------------- main page --------------------------------- */

export default function UserManagement() {
  const [rows, setRows] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [userTypeFilter, setUserTypeFilter] = useState("Admins")

  const [isUsersLoading, setIsUsersLoading] = useState(false)

  const [editRoleOpen, setEditRoleOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [originalRoles, setOriginalRoles] = useState([])
  const [originalTitle, setOriginalTitle] = useState("")
  const [formRoles, setFormRoles] = useState([])
  const [formTitle, setFormTitle] = useState("")
  const [isSavingRoles, setIsSavingRoles] = useState(false)
  const [roleRuleMessage, setRoleRuleMessage] = useState("")

  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [discardFilterConfirmOpen, setDiscardFilterConfirmOpen] = useState(false)
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false)
  const [filterOptionsData, setFilterOptionsData] = useState(null)
  const [appliedFilterSelections, setAppliedFilterSelections] = useState({})
  const [draftFilterSelections, setDraftFilterSelections] = useState({})

  const filterDialogRef = useRef(null)
  const editRoleDialogRef = useRef(null)

  const [toast, setToast] = useState({
    open: false,
    variant: "success",
    message: "",
  })

  const roleApiValue = userTypeFilter === "Admins" ? "admins" : userTypeFilter === "Employees" ? "employee" : "all"
  const sortByApiValue = "staff_id"

  // Debounce search; only pass `q` to the API when trimmed length is at least 3.
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length >= 2) {
      const id = window.setTimeout(() => setDebouncedSearchQuery(trimmed), 400)
      return () => window.clearTimeout(id)
    }
    setDebouncedSearchQuery("")
  }, [searchQuery])

  // When search/role/sort changes, restart from the first page.
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearchQuery, userTypeFilter])

  // Fetch paginated users from API.
  useEffect(() => {
    let cancelled = false

    const mapApiUser = (u) => {
      const roles = deriveRolesFromUserFlags(u)
      return {
        staffId: u?.staff_id ?? u?.staffId ?? u?.id ?? "",
        name: u?.username ?? u?.name ?? u?.user_name ?? "",
        email: u?.email ?? u?.user_email ?? "",
        status: u?.status ?? (u?.is_active ? "Active" : "inactive"),
        organizationType: u?.organizationType ?? u?.organization_type ?? "",
        organizationVertical: u?.organizationVertical ?? u?.organization_vertical ?? "",
        divisionCluster: u?.divisionCluster ?? u?.division_cluster ?? "",
        division: u?.division ?? "",
        department: u?.department ?? "",
        designation: u?.designation ?? u?.title ?? "",
        roles,
        mappedRoles: roles.join(", "),
      }
    }

    const run = async () => {
      setIsUsersLoading(true)
      try {
        const filtersBody = buildListUsersFilterBody({
          q: debouncedSearchQuery,
          role: roleApiValue,
          sort_by: sortByApiValue,
          selectionsByDataKey: appliedFilterSelections,
        })

        const { users, total } = await listUsers({
          page: pagination.pageIndex + 1,
          page_size: pagination.pageSize,
          filters: filtersBody,
        })

        if (cancelled) return
        setRows(users.map(mapApiUser))
        setTotalUsers(total ?? 0)
      } catch (e) {
        if (cancelled) return
        const isSearch = debouncedSearchQuery.trim().length >= 2
        setToast({
          open: true,
          variant: "error",
          message: isSearch ? "Search unavailable. Please retry." : "Unable to load users. Please retry.",
        })
      } finally {
        if (cancelled) return
        setIsUsersLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [
    debouncedSearchQuery,
    pagination.pageIndex,
    pagination.pageSize,
    roleApiValue,
    sortByApiValue,
    appliedFilterSelections,
  ])

  useEffect(() => {
    if (!editRoleOpen || !editUser) return
    const nextRoles = normalizeRolesFromApi(editUser?.roles)
    const nextTitle = editUser.designation ?? ""
    const uniqRoles = Array.from(new Set(nextRoles)).sort((a, b) => a.localeCompare(b))
    setOriginalRoles(uniqRoles)
    setFormRoles(uniqRoles)
    setOriginalTitle(nextTitle)
    setFormTitle(nextTitle)
    setRoleRuleMessage("")
  }, [editRoleOpen, editUser])

  const hasRoleChanges = !rolesEqual(formRoles, originalRoles)
  const hasTitleChanges = formTitle !== originalTitle
  const hasFormChanges = hasRoleChanges || hasTitleChanges

  const attemptSetFormRoles = (nextRoles) => {
    const uniq = Array.from(new Set(nextRoles))

    if (REQUIRED_ROLES.length > 0) {
      const requiredRemaining = uniq.filter((r) => REQUIRED_ROLES.includes(r))
      const requiredOriginalRemaining = originalRoles.filter((r) => REQUIRED_ROLES.includes(r))

      // Prevent removing the last required role(s).
      if (requiredOriginalRemaining.length > 0 && requiredRemaining.length === 0) {
        setRoleRuleMessage("At least one required role must remain")
        return
      }
    }

    setRoleRuleMessage("")
    setFormRoles(uniq)
  }

  const handleClearForm = () => {
    setFormRoles(originalRoles)
    setRoleRuleMessage("")
  }

  const handleSubmitRoles = async () => {
    if (!editUser || !hasFormChanges) return
    setIsSavingRoles(true)
    setRoleRuleMessage("")

    try {
      const nextStatus = String(editUser.status ?? "active").toLowerCase() === "inactive" ? "inactive" : "active"

      const payload = {
        status: nextStatus,
        is_master_admin: formRoles.includes("Master Admin"),
        is_policy_hub_admin: formRoles.includes("Policy Admin"),
        is_knowledge_hub_admin: formRoles.includes("KH Admin"),
        is_chief_compliance_officer: formRoles.includes("Chief Compliance Officer"),
        is_audit_lead: formRoles.includes("Audit Lead"),
        is_query_lead: formRoles.includes("Query Lead"),
        is_complaint_lead: formRoles.includes("Complaint Lead"),
        is_cobce_coi_gift_lead: formRoles.includes("COBCE/COI/Gift Lead"),
      }

      const response = await updateUser({ staff_id: editUser.staffId, payload })

      const nextTitle = formTitle.trim()
      const nextMappedRoles = formRoles.join(", ")

      setRows((prev) =>
        prev.map((u) =>
          u.staffId === editUser.staffId
            ? { ...u, roles: formRoles, status: nextStatus, designation: nextTitle, mappedRoles: nextMappedRoles }
            : u
        )
      )

      setToast({
        open: true,
        variant: "success",
        message: response?.message ?? "User updated successfully.",
      })
      setEditRoleOpen(false)
    } catch {
      setToast({ open: true, variant: "error", message: "Couldn’t save. Please retry." })
      // Keep modal open and preserve edits for retry.
    } finally {
      setIsSavingRoles(false)
    }
  }

  const openEditRoleModal = (user) => {
    if (!user) return
    setEditUser(user)
    setEditRoleOpen(true)
  }

  const activeFilterCount = useMemo(
    () =>
      Object.values(appliedFilterSelections).filter(
        (value) =>
          (Array.isArray(value) && value.length > 0) ||
          (typeof value === "string" && value.trim() !== "")
      ).length,
    [appliedFilterSelections]
  )

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

  const openFilterModal = async () => {
    setFilterModalOpen(true)
    setFilterOptionsLoading(true)
    setFilterOptionsData(null)
    setDraftFilterSelections({ ...appliedFilterSelections })
    try {
      const data = await getFilterOptions()
      const keys = Object.keys(data || {})
      const initialDraft = {}
      keys.forEach((k) => {
        initialDraft[k] = appliedFilterSelections[k] ? [...appliedFilterSelections[k]] : []
      })
      setFilterOptionsData(data)
      setDraftFilterSelections(initialDraft)
    } catch {
      setToast({
        open: true,
        variant: "error",
        message: "Couldn’t load filter options. Please retry.",
      })
      setFilterModalOpen(false)
    } finally {
      setFilterOptionsLoading(false)
    }
  }

  const requestCloseFilterModal = (nextOpen) => {
    if (!nextOpen && isFilterDraftDirty()) {
      setDiscardFilterConfirmOpen(true)
      return
    }
    setFilterModalOpen(nextOpen)
    if (!nextOpen) {
      setFilterOptionsData(null)
    }
  }

  const handleConfirmDiscardFilterChanges = () => {
    setDiscardFilterConfirmOpen(false)
    setFilterModalOpen(false)
    setFilterOptionsData(null)
  }

  const handleCancelDiscardFilterChanges = () => {
    setDiscardFilterConfirmOpen(false)
  }

  const handleSubmitFilters = () => {
    setAppliedFilterSelections({ ...draftFilterSelections })
    setPagination((p) => ({ ...p, pageIndex: 0 }))
    setFilterModalOpen(false)
    setFilterOptionsData(null)
  }

  const handleResetFilters = () => {
    setDraftFilterSelections({})
    setAppliedFilterSelections({})
    setPagination((p) => ({ ...p, pageIndex: 0 }))
    setFilterModalOpen(false)
    setFilterOptionsData(null)
  }

  /* ------------------------------- columns --------------------------------- */

  const columns = useMemo(
    () => [
      {
        accessorKey: "staffId",
        header: "Staff ID",
        size: 150,
        meta: { stickyLeft: true, stickyLeftOffset: 0 },
      },
      {
        accessorKey: "name",
        header: "Name",
        size: 240,
        meta: { stickyLeft: true, stickyLeftOffset: 150 },
        cell: ({ getValue }) => <TruncatedCell value={getValue()} />,
      },
      {
        accessorKey: "email",
        header: "Email Address",
        size: 320,
        meta: { stickyLeft: true, stickyLeftOffset: 390, stickyLeftEdge: true },
        cell: ({ getValue }) => <TruncatedCell value={getValue()} />,
      },
      {
        accessorKey: "status",
        header: () => <div className="text-center">Status</div>,
        size: 139,
        cell: ({ getValue }) => (
          <div className="flex justify-center">
            <StatusPill value={getValue()} />
          </div>
        ),
      },

      {
        accessorKey: "organizationType",
        header: () => <div className="text-center">Organization Type</div>,
        size: 200,
        cell: ({ getValue }) => (
          <div className="text-center">
            {getValue()}
          </div>
        ),
      },

      {
        accessorKey: "organizationVertical",
        header: () => <div className="text-center">Organization Vertical</div>,
        size: 220,
        cell: ({ getValue }) => (
          <div className="text-center">
            {getValue()}
          </div>
        ),
      },

      { accessorKey: "divisionCluster", header: "Division Cluster", size: 200 },
      {
        accessorKey: "division",
        header: "Division",
        size: 200,
        cell: ({ getValue }) => <TruncatedCell value={getValue()} />,
      },
      {
        accessorKey: "department",
        header: "Department",
        size: 200,
        cell: ({ getValue }) => <TruncatedCell value={getValue()} />,
      },
      {
        accessorKey: "designation",
        header: "Designation",
        size: 200,
        cell: ({ getValue }) => <TruncatedCell value={getValue()} />,
      },
      {
        accessorKey: "mappedRoles",
        header: "Mapped Role/s",
        size: 420,
        meta: { allowOverflow: true },
        cell: ({ row }) => <MappedRolesCell roles={row.original.roles} />,
      },
      {
        id: "actions",
        header: () => <div className="text-center">Actions</div>,
        size: 160,
        meta: { isSticky: true },
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Button
              size="sm"
              variant="outline"
              className="h-auto max-w-full whitespace-nowrap rounded-lg border-0 bg-blue-600/10 px-3 py-1 text-[18px] font-normal leading-[1.4] text-[#2563eb] shadow-none hover:bg-blue-600/15 hover:text-[#2563eb]"
              onClick={() => openEditRoleModal(row.original)}
            >
              Edit Role/s
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const tableMinWidth = useMemo(
    () => columns.reduce((sum, column) => sum + (column.size || 150), 0),
    [columns]
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

  return (
    <div className="min-h-full w-full max-w-full min-w-0 overflow-x-hidden bg-secondary p-4 font-sans sm:p-5 md:px-6 lg:px-8">
      <h1 className="mb-5 text-2xl font-semibold leading-[1.2] tracking-[-0.48px] text-[#1e1e1e]">
        User Management
      </h1>
        {/* search */}
        <div className="mb-10 flex w-full min-w-0 max-w-full flex-wrap items-center gap-3">
          <div className="flex h-10 w-full max-w-[440px] min-w-0 flex-1 basis-[440px] items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-3 sm:max-w-[440px]">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-full min-w-0 border-0 bg-transparent p-0 text-base leading-[1.4] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus-visible:ring-0"
            />
            <Search className="size-5 shrink-0 text-[#2563eb]" />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {["All", "Admins", "Employees"].map((filter) => {
              const isSelected = userTypeFilter === filter
              return (
                <Button
                  key={filter}
                  type="button"
                  onClick={() => setUserTypeFilter(filter)}
                  className={cn(
                    "h-10 min-w-[104px] rounded-lg px-5 text-base font-semibold leading-[1.4] shadow-none",
                    isSelected
                      ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                      : "bg-blue-600/10 text-[#2563eb] hover:bg-blue-600/15"
                  )}
                >
                  {filter}
                </Button>
              )
            })}
          </div>

          <div className="ml-auto flex shrink-0 items-center">
            <Button
              type="button"
              onClick={openFilterModal}
              className="relative flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600/10 px-5 text-base font-semibold leading-[1.4] text-[#2563eb] shadow-none hover:bg-blue-600/15"
            >
              <Filter className="size-5 shrink-0" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#2563eb] px-1 text-[10px] font-bold leading-none text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-white font-sans shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05),inset_0_1px_3px_0px_rgba(0,0,0,0.06)]">
          <div className="h-3 bg-white" />

          <div className="w-full min-w-0 max-w-full overflow-x-auto bg-white">
          <table
            className="w-full table-fixed border-separate border-spacing-0"
            style={{ minWidth: tableMinWidth }}
          >
            <thead className="bg-[#f5f5f5]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const meta = h.column.columnDef.meta
                    return (
                    <th
                      key={h.id}
                      style={{
                        width: h.getSize(),
                        ...(meta?.stickyLeft
                          ? { left: meta.stickyLeftOffset ?? 0 }
                          : null),
                      }}
                      className={cn(
                        "border-b border-[#d9d9d9] bg-[#f5f5f5] py-3 pl-[22px] pr-[10px] text-left text-base font-medium leading-[1.4] text-black whitespace-nowrap",
                        meta?.stickyLeft &&
                          "sticky z-30 bg-[#f5f5f5]",
                        meta?.stickyLeftEdge &&
                          "shadow-[8px_0px_32px_0px_rgba(0,0,0,0.05),inset_0_-1px_0_0_#d9d9d9]",
                        meta?.isSticky &&
                          "sticky right-0 z-30 bg-[#f5f5f5] pl-[10px] pr-[10px] text-center shadow-[-8px_0px_32px_0px_rgba(0,0,0,0.05),inset_0_-1px_0_0_#d9d9d9]"
                      )}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                    )
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {isUsersLoading && table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllLeafColumns().length}
                    className="bg-white px-[22px] py-6 text-center text-base text-[#757575]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : null}

              {table.getRowModel().rows.map((row, rowIndex) => {
                const isLastRow = rowIndex === table.getRowModel().rows.length - 1
                return (
                <tr key={row.id} className="group min-h-[68px]">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta
                    return (
                    <td
                      key={cell.id}
                      style={
                        meta?.stickyLeft
                          ? { left: meta.stickyLeftOffset ?? 0 }
                          : undefined
                      }
                      className={cn(
                        "bg-white py-3 pl-[22px] pr-[10px] text-base font-normal text-[#1e1e1e] group-hover:bg-[#fafafa]",
                        !isLastRow && "border-b border-[#d9d9d9]",
                        meta?.allowOverflow
                          ? "overflow-visible align-middle"
                          : "overflow-hidden",
                        meta?.stickyLeft &&
                          cn(
                            "sticky z-20 bg-white group-hover:bg-[#fafafa]",
                            meta?.stickyLeftEdge &&
                              (!isLastRow
                                ? "shadow-[8px_0px_32px_0px_rgba(0,0,0,0.05),inset_0_-1px_0_0_#d9d9d9]"
                                : "shadow-[8px_0px_32px_0px_rgba(0,0,0,0.05)]")
                          ),
                        meta?.isSticky &&
                          cn(
                            "sticky right-0 z-20 overflow-visible bg-white px-[10px] shadow-[-8px_0px_32px_0px_rgba(0,0,0,0.05)] group-hover:bg-[#fafafa]",
                            !isLastRow && "shadow-[-8px_0px_32px_0px_rgba(0,0,0,0.05),inset_0_-1px_0_0_#d9d9d9]"
                          )
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                    )
                  })}
                </tr>
                )
              })}

              {!isUsersLoading && table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllLeafColumns().length}
                    className="bg-white px-[22px] py-6 text-center text-base text-[#757575]"
                  >
                    No users found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        </div>

        {/* pagination */}
        <div className="mt-4 flex shrink-0 flex-wrap justify-center gap-2">
          <Button variant="ghost" className="hover:bg-transparent hover:text-black" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            ← Previous
          </Button>
          {Array.from({ length: table.getPageCount() }).map((_, i) => {
            const isSelected = table.getState().pagination.pageIndex === i
            return (
              <Button
                key={i}
                onClick={() => table.setPageIndex(i)}
                variant={isSelected ? "default" : "outline"}
                className={
                  isSelected
                    ? "hover:bg-primary hover:text-primary-foreground"
                    : "hover:bg-slate-100 hover:text-foreground"
                }
              >
                {i + 1}
              </Button>
            )
          })}
          <Button variant="ghost" className="hover:bg-transparent hover:text-black" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next →
          </Button>
        </div>

        <Dialog open={filterModalOpen} onOpenChange={requestCloseFilterModal}>
          <DialogContent
            ref={filterDialogRef}
            className="flex h-[85vh] max-w-[calc(100vw-2rem)] flex-col overflow-hidden bg-white sm:max-w-2xl"
          >
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
            </DialogHeader>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
              onWheel={handleNestedScrollWheel}
            >
              {filterOptionsLoading ? (
                <div className="py-10 text-center text-sm text-slate-600">Loading filter options...</div>
              ) : filterOptionsData ? (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {[...Object.keys(filterOptionsData)]
                    .sort()
                    .map((dataKey) => (
                      <div key={dataKey} className="space-y-1">
                        <div className="text-xs font-semibold text-black">
                          {formatFilterFieldHeading(dataKey)}
                        </div>
                        <OptionsMultiSelect
                          options={filterOptionsData[dataKey]}
                          selected={draftFilterSelections[dataKey] ?? []}
                          onSelectionChange={(next) =>
                            setDraftFilterSelections((prev) => ({ ...prev, [dataKey]: next }))
                          }
                          disabled={filterOptionsLoading}
                          portalContainer={filterDialogRef}
                        />
                        {(draftFilterSelections[dataKey] ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {(draftFilterSelections[dataKey] ?? []).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700"
                              >
                                {tag}
                                <button
                                  type="button"
                                  className="rounded-full p-0.5 text-red-600 hover:bg-red-100 hover:text-red-700"
                                  onClick={() =>
                                    setDraftFilterSelections((prev) => ({
                                      ...prev,
                                      [dataKey]: (prev[dataKey] ?? []).filter((x) => x !== tag),
                                    }))
                                  }
                                  aria-label={`Remove ${tag}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-slate-500">No filter options available.</div>
              )}
            </div>

            <div className="mt-6 flex shrink-0 items-center justify-between gap-3">
              <Button
                type="button"
                onClick={handleResetFilters}
                disabled={filterOptionsLoading || !filterOptionsData}
                className="bg-white text-purple-600 hover:underline hover:bg-white"
              >
                Reset Filters
              </Button>
              <Button
                type="button"
                onClick={handleSubmitFilters}
                disabled={filterOptionsLoading || !filterOptionsData}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                Apply filters
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
          <DialogContent
            ref={editRoleDialogRef}
            className="flex h-[85vh] max-w-md flex-col overflow-hidden bg-white"
          >
            <DialogHeader>
              <DialogTitle>Edit Role/s</DialogTitle>
            </DialogHeader>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
              onWheel={handleNestedScrollWheel}
            >
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-black">Staff ID</div>
                <Input
                  value={editUser?.staffId ?? ""}
                  readOnly
                  onFocus={(e) => e.target.blur()}
                  className="bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-black">Name</div>
                <Input
                  value={editUser?.name ?? ""}
                  readOnly
                  onFocus={(e) => e.target.blur()}
                  className="bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none"
                />
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <div className="text-xs font-semibold text-black">Title</div>
              <Input
                value={formTitle}
                readOnly
                onFocus={(e) => e.target.blur()}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Optional title"
                className="bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none"
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-black">Select Role/s</div>
              <RoleSelectDropdown
                selected={formRoles}
                onSelectionChange={attemptSetFormRoles}
                portalContainer={editRoleDialogRef}
              />
              {roleRuleMessage ? <div className="text-xs text-rose-600">{roleRuleMessage}</div> : null}

              <div className="flex flex-wrap gap-2 pt-1">
                {formRoles.length === 0 ? (
                  <div className="text-xs text-slate-500">No roles assigned</div>
                ) : (
                  formRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700"
                    >
                      {role}
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-red-600 hover:bg-red-100 hover:text-red-700"
                        onClick={() => attemptSetFormRoles(formRoles.filter((r) => r !== role))}
                        aria-label={`Remove ${role}`}
                        title={REQUIRED_ROLES.length > 0 && REQUIRED_ROLES.includes(role) ? "At least one required role must remain" : "Remove"}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
            </div>

            <div className="mt-6 flex shrink-0 items-center justify-between gap-3">
              <Button
                type="button"
                onClick={handleClearForm}
                disabled={isSavingRoles}
                className="bg-red-100 text-red-600 hover:bg-red-200"
              >
                Clear Form
              </Button>

              <Button
                type="button"
                onClick={handleSubmitRoles}
                disabled={!hasFormChanges || isSavingRoles}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isSavingRoles ? "Saving..." : "Submit Changes"}
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

      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  )
}