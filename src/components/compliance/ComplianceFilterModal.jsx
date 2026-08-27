import { useEffect, useRef, useState } from "react"
import * as Yup from "yup"
import Select from "react-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DateRangePicker from "@/atoms/date-range-picker"

export const COMPLIANCE_TYPE_OPTIONS = [
  { value: "annual_declarations", label: "Annual Declaration" },
  { value: "self_declarations", label: "Self Declaration" },
  { value: "query", label: "Query" },
  // { value: "gift", label: "Gift Declaration" },
  // { value: "complaint", label: "Complaint" },
]

export const COMPLIANCE_SUB_TYPE_OPTIONS = [
  { value: "Gift", label: "Gift" },
  { value: "Annual", label: "Annual Declaration" },
  { value: "Self", label: "Self Declaration" },
  { value: "COBCE", label: "COBCE" },
  { value: "COI", label: "COI" },
  { value: "ComplyShield", label: "Complyshield" },
  { value: "R5.18", label: "R5.18" },
  { value: "Other", label: "Other" },
]

export const COMPLIANCE_RESPONSE_STATUS_OPTIONS = [
  { value: "Due", label: "Due" },
  { value: "Overdue", label: "Overdue" },
  { value: "Completed", label: "Completed" },
]

export const COMPLIANCE_OVERALL_STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Completed", label: "Completed" },
  { value: "Draft", label: "Draft" },
]

export const EMPTY_COMPLIANCE_FILTERS = {
  type: [],
  sub_type: [],
  response_status: [],
  overall_status: [],
  updated_on_start: undefined,
  updated_on_end: undefined,
  response_due_start: undefined,
  response_due_end: undefined,
}

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

const complianceFiltersSchema = Yup.object({
  updated_on_start: Yup.string().nullable(),
  updated_on_end: Yup.string().nullable(),
  response_due_start: Yup.string().nullable(),
  response_due_end: Yup.string().nullable(),
})
  .test(
    "updated-on-date-range",
    "",
    requireCompleteDateRange("updated_on_start", "updated_on_end", "updated_on", "Updated On"),
  )
  .test(
    "response-due-date-range",
    "",
    requireCompleteDateRange(
      "response_due_start",
      "response_due_end",
      "response_due",
      "Response Due Date",
    ),
  )

const convertToApiDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return undefined
  const [day, monthPart, year] = dateStr.trim().split("/")
  if (!day || !monthPart || !year) return undefined

  let month = monthPart
  if (!/^[0-9]+$/.test(monthPart)) {
    const parsed = new Date(`${monthPart} 1, ${year}`)
    if (isNaN(parsed.getTime())) return undefined
    month = String(parsed.getMonth() + 1).padStart(2, "0")
  } else {
    month = String(Number(monthPart)).padStart(2, "0")
  }

  return `${year}-${month}-${day.padStart(2, "0")}`
}

const convertFromApiDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return undefined
  const [year, month, day] = dateStr.trim().split("-")
  if (!day || !month || !year) return undefined
  const monthShort = new Date(Number(year), Number(month) - 1, 1).toLocaleString("default", {
    month: "short",
  })
  return `${day.padStart(2, "0")}/${monthShort}/${year}`
}

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

const formatDraftDateRangeValue = (fromApi, toApi) => {
  if (fromApi && toApi) {
    return `${convertFromApiDate(fromApi)} - ${convertFromApiDate(toApi)}`
  }
  if (fromApi) return convertFromApiDate(fromApi) || ""
  if (toApi) return convertFromApiDate(toApi) || ""
  return ""
}

const filterSelectMenuPortalStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 99999, pointerEvents: "auto" }),
  menu: (base) => ({ ...base, pointerEvents: "auto" }),
}

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

export function normalizeComplianceFilters(filters = {}) {
  return {
    ...EMPTY_COMPLIANCE_FILTERS,
    ...filters,
    type: [...(filters?.type ?? [])],
    sub_type: [...(filters?.sub_type ?? [])],
    response_status: [...(filters?.response_status ?? [])],
    overall_status: [...(filters?.overall_status ?? [])],
  }
}

export function countActiveComplianceFilters(filters = {}) {
  let count = 0
  if (Array.isArray(filters.type) && filters.type.length > 0) count += 1
  if (Array.isArray(filters.sub_type) && filters.sub_type.length > 0) count += 1
  if (Array.isArray(filters.response_status) && filters.response_status.length > 0) count += 1
  if (Array.isArray(filters.overall_status) && filters.overall_status.length > 0) count += 1
  if (filters.updated_on_start || filters.updated_on_end) count += 1
  if (filters.response_due_start || filters.response_due_end) count += 1
  return count
}

export function complianceFiltersEqual(a, b) {
  const keys = Object.keys(EMPTY_COMPLIANCE_FILTERS)
  for (const key of keys) {
    const av = a?.[key]
    const bv = b?.[key]

    if (Array.isArray(av) || Array.isArray(bv)) {
      const aa = [...(av ?? [])].sort().join("\0")
      const bb = [...(bv ?? [])].sort().join("\0")
      if (aa !== bb) return false
      continue
    }

    if ((av ?? "") !== (bv ?? "")) return false
  }
  return true
}

function MultiSelectField({ label, options, selected, onChange }) {
  const safeSelected = Array.isArray(selected) ? selected : []
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-black">{label}</label>
      <Select
        isMulti
        options={options}
        value={options.filter((option) => safeSelected.includes(option.value))}
        onChange={(next) =>
          onChange(next && next.length > 0 ? next.map((item) => item.value) : [])
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
  )
}

export default function ComplianceFilterModal({
  open,
  onOpenChange,
  appliedFilters,
  onApplyFilters,
  onResetFilters,
}) {
  const filterDialogRef = useRef(null)
  const [draftFilters, setDraftFilters] = useState(EMPTY_COMPLIANCE_FILTERS)
  const [filterErrors, setFilterErrors] = useState({})
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraftFilters(normalizeComplianceFilters(appliedFilters))
    setFilterErrors({})
    setDiscardConfirmOpen(false)
  }, [open, appliedFilters])

  const updateArrayField = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }))
  }

  const requestClose = (nextOpen) => {
    if (!nextOpen && !complianceFiltersEqual(draftFilters, appliedFilters)) {
      setDiscardConfirmOpen(true)
      return
    }
    onOpenChange(nextOpen)
  }

  const handleReset = () => {
    const empty = normalizeComplianceFilters(EMPTY_COMPLIANCE_FILTERS)
    setDraftFilters(empty)
    setFilterErrors({})
    if (typeof onResetFilters === "function") {
      onResetFilters()
    } else {
      onApplyFilters(empty)
    }
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    try {
      await complianceFiltersSchema.validate(draftFilters, { abortEarly: false })
      setFilterErrors({})
      onApplyFilters(normalizeComplianceFilters(draftFilters))
      onOpenChange(false)
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

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent
          ref={filterDialogRef}
          className="flex h-[85vh] max-w-2xl flex-col bg-white"
          onPointerDownOutside={(event) => {
            if (isFilterDialogPortalTarget(event.target)) event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (isFilterDialogPortalTarget(event.target)) event.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 pl-1">
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <MultiSelectField
                label="Type"
                options={COMPLIANCE_TYPE_OPTIONS}
                selected={draftFilters.type}
                onChange={(next) => updateArrayField("type", next)}
              />
              <MultiSelectField
                label="Sub-Type"
                options={COMPLIANCE_SUB_TYPE_OPTIONS}
                selected={draftFilters.sub_type}
                onChange={(next) => updateArrayField("sub_type", next)}
              />
              <MultiSelectField
                label="Response Status"
                options={COMPLIANCE_RESPONSE_STATUS_OPTIONS}
                selected={draftFilters.response_status}
                onChange={(next) => updateArrayField("response_status", next)}
              />
              <MultiSelectField
                label="Overall Status"
                options={COMPLIANCE_OVERALL_STATUS_OPTIONS}
                selected={draftFilters.overall_status}
                onChange={(next) => updateArrayField("overall_status", next)}
              />

              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Updated On</label>
                <DateRangePicker
                  portalContainer={filterDialogRef}
                  emitPartialSelection
                  value={formatDraftDateRangeValue(
                    draftFilters.updated_on_start,
                    draftFilters.updated_on_end,
                  )}
                  onChange={(value) => {
                    const { from, to } = parseDateRangePickerValue(value)
                    setDraftFilters((prev) => ({
                      ...prev,
                      updated_on_start: convertToApiDate(from) || undefined,
                      updated_on_end: convertToApiDate(to) || undefined,
                    }))
                    setFilterErrors((prev) => ({ ...prev, updated_on: undefined }))
                  }}
                  className="w-full"
                  inputClassName={`text-sm ${filterErrors.updated_on ? "border-red-500" : ""}`}
                  showIcon
                />
                {filterErrors.updated_on ? (
                  <small className="text-red-500">{filterErrors.updated_on}</small>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Response Due Date</label>
                <DateRangePicker
                  portalContainer={filterDialogRef}
                  emitPartialSelection
                  value={formatDraftDateRangeValue(
                    draftFilters.response_due_start,
                    draftFilters.response_due_end,
                  )}
                  onChange={(value) => {
                    const { from, to } = parseDateRangePickerValue(value)
                    setDraftFilters((prev) => ({
                      ...prev,
                      response_due_start: convertToApiDate(from) || undefined,
                      response_due_end: convertToApiDate(to) || undefined,
                    }))
                    setFilterErrors((prev) => ({ ...prev, response_due: undefined }))
                  }}
                  className="w-full"
                  inputClassName={`text-sm ${filterErrors.response_due ? "border-red-500" : ""}`}
                  showIcon
                />
                {filterErrors.response_due ? (
                  <small className="text-red-500">{filterErrors.response_due}</small>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              onClick={handleReset}
              className="bg-white text-purple-600 hover:bg-white hover:underline"
            >
              Reset Filters
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-purple-500 text-white hover:bg-purple-600"
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
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
              onClick={() => setDiscardConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setDiscardConfirmOpen(false)
                onOpenChange(false)
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
