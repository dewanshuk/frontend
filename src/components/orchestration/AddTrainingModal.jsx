import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import "@/components/orchestration/addTrainingDatePicker.css"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { DATE_FORMAT_DATEFNS } from "@/config"

function RequiredMark() {
  return <span className="text-rose-600">*</span>
}

function DatePickerField({ value, onChange, placeholder = "Select date", className }) {
  return (
    <div className="relative">
      <ReactDatePicker
        selected={value}
        onChange={(selectedDate) => onChange(selectedDate ?? null)}
        dateFormat={DATE_FORMAT_DATEFNS}
        placeholderText={placeholder}
        className={cn(
          "h-10 w-full min-w-[350px] rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm uppercase ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !value && "text-muted-foreground",
          className
        )}
        showYearDropdown
        scrollableYearDropdown
        popperClassName="z-[140] ecp-datepicker-popper"
        calendarClassName="ecp-datepicker-calendar"
        popperPlacement="right-start"
        showPopperArrow={false}
      />
      <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
    </div>
  )
}

export default function AddTrainingModal({ open, onOpenChange, onSubmit }) {
  console.log('AddTrainingModal....')
  const financialYearOptions = useMemo(() => {
    const today = new Date()
    const month = today.getMonth() + 1 // 1-indexed
    const year = today.getFullYear()
    const currentFYStart = month >= 4 ? year : year - 1
    const toFYLabel = (startYear) => `${startYear}-${String(startYear + 1).slice(-2)}`
    return [toFYLabel(currentFYStart), toFYLabel(currentFYStart + 1)]
  }, [])

  const [trainingName, setTrainingName] = useState("")
  const [financialYear, setFinancialYear] = useState(financialYearOptions[0] ?? "")
  const [assignedDate, setAssignedDate] = useState(() => new Date());
  const [dueDate, setDueDate] = useState(null)
  const [closureDate, setClosureDate] = useState(null)
  const [trainingLink, setTrainingLink] = useState("")

  const canSubmit =
    trainingName.trim().length > 0 &&
    financialYear.trim().length > 0 &&
    !!assignedDate &&
    !!dueDate &&
    !!closureDate &&
    trainingLink.trim().length > 0

  useEffect(() => {
    if (!open) return
    setTrainingName("")
    setFinancialYear(financialYearOptions[0] ?? "")
    setAssignedDate(new Date())
    setDueDate(null)
    setClosureDate(null)
    setTrainingLink("")
    // financialYearOptions is derived solely from the current date and never
    // meaningfully changes during a modal's lifetime. Including it caused React
    // (Strict Mode dev) to re-run this effect on every re-render that produced
    // a new array reference, silently resetting all date fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    await onSubmit({
      trainingName: trainingName.trim(),
      financialYear: financialYear.trim(),
      assignedDate,
      dueDate,
      closureDate,
      trainingLink: trainingLink.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Training KPIs</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Training Name <RequiredMark />
              </Label>
              <Input value={trainingName} onChange={(e) => setTrainingName(e.target.value)} placeholder="Enter training name" />
            </div>

            <div className="space-y-2">
              <Label>
                Financial Year <RequiredMark />
              </Label>
              <Select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
                {financialYearOptions.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Training Assigned Date <RequiredMark />
              </Label>
              <DatePickerField value={assignedDate} onChange={setAssignedDate} />
            </div>

            <div className="space-y-2">
              <Label>
                Training Due Date <RequiredMark />
              </Label>
              <DatePickerField value={dueDate} onChange={setDueDate} />
            </div>

            <div className="space-y-2">
              <Label>
                Activity Closure Date <RequiredMark />
              </Label>
              <DatePickerField value={closureDate} onChange={setClosureDate} />
            </div>

            <div className="space-y-2">
              <Label>
                Training Link <RequiredMark />
              </Label>
              <Input value={trainingLink} onChange={(e) => setTrainingLink(e.target.value)} placeholder="insert training link here..." />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              className="rounded-lg bg-blue-600 text-white hover:bg-blue-300 hover:text-blue-700 disabled:opacity-50"
              disabled={!canSubmit}
            >
              Add Training
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

