import { useEffect, useMemo, useState } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import "@/components/orchestration/addTrainingDatePicker.css"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { DATE_FORMAT_DATEFNS } from "@/config"

const EMPTY_FILTERS = {
  trainingName: "",
  financialYear: "",
  assignedDate: null,
  dueDate: null,
  closureDate: null,
}

const DATE_RANGE_FIELDS = [
  { key: "assignedDate", label: "Training Assigned Date" },
  { key: "dueDate", label: "Training Due Date" },
  { key: "closureDate", label: "Activity Closure Date" },
]

function isCompleteDateRange(range) {
  if (!range) return true
  const hasFrom = Boolean(range.from)
  const hasTo = Boolean(range.to)
  return hasFrom === hasTo
}

function validateDateRanges(filters) {
  const errors = {}

  DATE_RANGE_FIELDS.forEach(({ key, label }) => {
    const range = filters?.[key]
    if (!range) return

    const hasFrom = Boolean(range.from)
    const hasTo = Boolean(range.to)

    if (hasFrom !== hasTo) {
      errors[key] = `Please select a full ${label} range (start and end date).`
      return
    }

    if (hasFrom && hasTo && range.from > range.to) {
      errors[key] = `${label}: start date cannot be after end date.`
    }
  })

  return errors
}

function DateRangePickerField({
  value,
  onChange,
  placeholder = "Select start & end dates",
  hasError = false,
}) {
  return (
    <div className="relative">
      <ReactDatePicker
        selected={value?.from ?? null}
        onChange={(dates) => {
          const [start, end] = dates ?? []
          onChange(start || end ? { from: start ?? undefined, to: end ?? undefined } : null)
        }}
        startDate={value?.from ?? null}
        endDate={value?.to ?? null}
        selectsRange
        isClearable={false}
        shouldCloseOnSelect={false}
        dateFormat={DATE_FORMAT_DATEFNS}
        placeholderText={placeholder}
        className={cn(
          "h-10 w-full min-w-[350px] rounded-md border bg-background px-3 py-2 pr-9 text-sm uppercase ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          hasError ? "border-red-500" : "border-input",
          !value?.from && !value?.to && "text-muted-foreground",
        )}
        popperClassName="z-[140] ecp-datepicker-popper"
        calendarClassName="ecp-datepicker-calendar"
        popperPlacement="right-start"
        showPopperArrow={false}
      />
      <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
    </div>
  )
}

export default function FilterTrainingModal({ open, onOpenChange, currentFilters, onApply }) {
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [errors, setErrors] = useState({})

  const financialYearOptions = useMemo(() => {
    const today = new Date()
    const currentFYStart = (today.getMonth() + 1) >= 4 ? today.getFullYear() : today.getFullYear() - 1
    const toFYLabel = (start) => `${start}-${String(start + 1).slice(-2)}`
    return [-2, -1, 0, 1].map((offset) => toFYLabel(currentFYStart + offset))
  }, [])

  useEffect(() => {
    if (!open) return
    setDraft(currentFilters ?? EMPTY_FILTERS)
    setErrors({})
  }, [open, currentFilters])

  const updateDraft = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    setErrors((prevErrors) => {
      const nextErrors = { ...prevErrors }
      Object.entries(patch).forEach(([key, value]) => {
        if (nextErrors[key] && isCompleteDateRange(value)) {
          delete nextErrors[key]
        }
      })
      return nextErrors
    })
  }

  const handleApply = () => {
    const nextErrors = validateDateRanges(draft)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    onApply?.(draft)
  }

  const handleReset = () => {
    setDraft(EMPTY_FILTERS)
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm text-slate-600">Training Name</Label>
            <Select
              value={draft.trainingName}
              onChange={(e) => updateDraft({ trainingName: e.target.value })}
            >
              <option value="">All</option>
              <option value="POSH Training">POSH Training</option>
              <option value="Compliance Training">Compliance Training</option>
              <option value="Cyber Security Training">Cyber Security Training</option>
              <option value="New Joiner Training">New Joiner Training</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-slate-600">Financial Year</Label>
            <Select
              value={draft.financialYear}
              onChange={(e) => updateDraft({ financialYear: e.target.value })}
            >
              <option value="">All</option>
              {financialYearOptions.map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-slate-600">Training Due Date</Label>
            <DateRangePickerField
              value={draft.dueDate}
              onChange={(v) => updateDraft({ dueDate: v ?? null })}
              hasError={Boolean(errors.dueDate)}
            />
            {errors.dueDate ? (
              <small className="text-red-500">{errors.dueDate}</small>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-slate-600">Training Assigned Date</Label>
            <DateRangePickerField
              value={draft.assignedDate}
              onChange={(v) => updateDraft({ assignedDate: v ?? null })}
              hasError={Boolean(errors.assignedDate)}
            />
            {errors.assignedDate ? (
              <small className="text-red-500">{errors.assignedDate}</small>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-slate-600">Activity Closure Date</Label>
            <DateRangePickerField
              value={draft.closureDate}
              onChange={(v) => updateDraft({ closureDate: v ?? null })}
              hasError={Boolean(errors.closureDate)}
            />
            {errors.closureDate ? (
              <small className="text-red-500">{errors.closureDate}</small>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            className="text-purple-600 font-medium"
            onClick={handleReset}
          >
            Reset Filters
          </button>

          <Button
            type="button"
            className="rounded-lg bg-purple-600 text-white hover:bg-purple-300 hover:text-purple-700 px-8"
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
