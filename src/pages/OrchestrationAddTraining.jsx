import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { DATE_FORMAT_DATEFNS } from "../config"
import { FileSpreadsheet, Link as LinkIcon, UploadCloud, X } from "lucide-react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import * as XLSX from "xlsx"

import AddTrainingModal from "@/components/orchestration/AddTrainingModal"
import FilterTrainingModal from "@/components/orchestration/FilterTrainingModal"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"
import CenterToast from "@/components/shared/CenterToast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/shared/Tooltip"
import { createTraining, downloadTrainingFile, downloadTrainingTemplate, getTrainings, uploadTrainingData } from "@/api/trainingApi"
import { cn } from "@/lib/utils"

function formatShort(date) {
  if (!date) return "-"
  return format(date, DATE_FORMAT_DATEFNS).toUpperCase()
}

function formatTimestamp(date) {
  if (!date) return "-"
  return format(date, `${DATE_FORMAT_DATEFNS} hh:mm:ss a`).toUpperCase()
}

function formatUpdatedBy(value) {
  if (!value || value === "-") return "-"
  const match = String(value).match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (!match) return value
  return (
    <span className="block leading-normal">
      <span className="block">{match[1]}</span>
      <span className="block">({match[2]})</span>
    </span>
  )
}

const getColumnWidthStyle = (size, meta = {}) => ({
  width: size,
  minWidth: size,
  maxWidth: size,
  ...(meta?.isLeftSticky ? { left: meta.left } : {}),
})

const getStickyColumnClass = (meta = {}, variant = "body") => {
  const headerBg = variant === "header" ? "bg-[#f5f5f5]" : "bg-white group-hover:bg-gray-50"
  const zIndex = variant === "header" ? "z-30" : "z-20"

  if (meta?.isSticky) {
    return `sticky right-0 ${headerBg} ${zIndex} shadow-[-8px_0_16px_rgba(0,0,0,0.08),inset_0_-1px_0_0_#e5e7eb]`
  }

  if (meta?.isLeftSticky) {
    const shadow = meta?.isLastLeftSticky
      ? "shadow-[8px_0_24px_rgba(0,0,0,0.08),inset_0_-1px_0_0_#e5e7eb]"
      : "shadow-[inset_0_-1px_0_0_#e5e7eb]"
    return `sticky ${headerBg} ${zIndex} ${shadow}`
  }

  return ""
}

function formatApiDate(date) {
  return format(date, "yyyy-MM-dd")
}

function parseApiDate(dateString) {
  if (!dateString) return null
  const parsed = new Date(dateString)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function downloadXlsx({ filename, rows, columns }) {
  const data = rows.map((r) => {
    const out = {}
    columns.forEach((c) => {
      out[c.label] = typeof c.value === "function" ? c.value(r) : r[c.key]
    })
    return out
  })

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Training KPIs")
  XLSX.writeFile(workbook, filename)
}

function UploadDataDialog({ open, onOpenChange, onUpload, isUploading }) {
  const dropRef = useRef(null)
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const resetFile = () => setFile(null)

  const handleClose = () => {
    resetFile()
    onOpenChange(false)
  }

  const handleFileSelect = (selected) => {
    if (selected) setFile(selected)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) handleFileSelect(dropped)
  }

  const handleSubmit = async () => {
    if (!file) return
    await onUpload(file)
    resetFile()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Data</DialogTitle>
        </DialogHeader>

        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
          }`}
        >
          <UploadCloud className="h-10 w-10 text-blue-400" />
          {file ? (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="max-w-[260px] truncate">{file.name}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-slate-200"
                onClick={(e) => { e.stopPropagation(); resetFile() }}
                aria-label="Remove file"
              >
                <X className="h-3 w-3 text-slate-500" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">
                Drag &amp; drop or <span className="text-blue-600 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400">Supports .xlsx, .xls, .csv</p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { handleFileSelect(e.target.files?.[0]); e.target.value = "" }}
        />

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleSubmit}
            disabled={!file || isUploading}
          >
            {isUploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function OrchestrationAddTraining() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [refreshListKey, setRefreshListKey] = useState(0)

  const [activeModal, setActiveModal] = useState(null)
  const [toast, setToast] = useState({ open: false, variant: "success", message: "" })
  const [selectedTrainingId, setSelectedTrainingId] = useState(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const scheduleModalChange = (nextModal) => {
    window.requestAnimationFrame(() => setActiveModal(nextModal))
  }

  const [rows, setRows] = useState([])

  const exportColumns = useMemo(
    () => [
      { key: "id", label: "S. No.", value: (r) => r.id },
      { key: "trainingName", label: "Training Name", value: (r) => r.trainingName },
      { key: "financialYear", label: "Financial Year", value: (r) => r.financialYear },
      { key: "assignedDate", label: "Training Assigned Date", value: (r) => formatShort(r.assignedDate) },
      { key: "dueDate", label: "Training Due Date", value: (r) => formatShort(r.dueDate) },
      { key: "closureDate", label: "Activity Closure Date", value: (r) => formatShort(r.closureDate) },
      { key: "uploadedBy", label: "Updated By", value: (r) => r.uploadedBy },
      { key: "uploadedOn", label: "Last Updated On", value: (r) => (r.uploadedOn ? formatTimestamp(r.uploadedOn) : "-") },
      { key: "lastUploadedDataFile", label: "Last Uploaded Data", value: (r) => r.lastUploadedDataFile },
      { key: "trainingLink", label: "Training Link", value: (r) => r.trainingLink },
    ],
    []
  )

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "S. No.",
        value: (r) => r.id,
        width: 100,
        nowrap: true,
        align: "center",
        sticky: { isLeftSticky: true, left: 0 },
      },
      {
        key: "trainingName",
        label: "Training Name",
        value: (r) => r.trainingName,
        width: 200,
        nowrap: true,
        align: "left",
        sticky: { isLeftSticky: true, left: 100 },
      },
      {
        key: "financialYear",
        label: "Financial Year",
        value: (r) => r.financialYear,
        width: 170,
        nowrap: true,
        align: "center",
        sticky: { isLeftSticky: true, left: 300, isLastLeftSticky: true },
      },
      {
        key: "assignedDate",
        label: "Training Assigned Date",
        value: (r) => formatShort(r.assignedDate),
        width: 164,
        align: "center",
      },
      {
        key: "dueDate",
        label: "Training Due Date",
        value: (r) => formatShort(r.dueDate),
        width: 164,
        align: "center",
      },
      {
        key: "closureDate",
        label: "Activity Closure Date",
        value: (r) => formatShort(r.closureDate),
        width: 164,
        align: "center",
      },
      {
        key: "uploadedBy",
        label: "Updated By",
        value: (r) => formatUpdatedBy(r.uploadedBy),
        width: 164,
        align: "center",
      },
      {
        key: "uploadedOn",
        label: "Last Updated On",
        value: (r) => formatTimestamp(r.uploadedOn),
        width: 202,
        align: "center",
      },
      {
        key: "lastUploadedDataFile",
        label: "Last Uploaded Data",
        value: (r) => (
          <button
            type="button"
            className="inline-flex items-center justify-center p-0.5 hover:opacity-80"
            onClick={() => handleTrainingFileDownload(r.id)}
            aria-label={`Download uploaded data for ${r.id}`}
          >
            <img src="/icons/excelIcon.png" alt="" className="size-6" />
          </button>
        ),
        width: 178,
        align: "center",
      },
      {
        key: "actions",
        label: "Actions",
        value: (r) => (
          <div className="flex items-center justify-center gap-2.5 whitespace-nowrap">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center hover:opacity-80"
                    onClick={() => triggerUploadPicker(r.id)}
                    aria-label={`Upload for ${r.id}`}
                  >
                    <img src="/assets/icons/orch/training-action-upload.svg" alt="" className="size-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white">Upload Data</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center hover:opacity-80"
                    onClick={handleTemplateDownload}
                    aria-label={`Download template for ${r.id}`}
                  >
                    <img src="/assets/icons/orch/training-action-download.svg" alt="" className="size-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white">Download Template</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
        width: 164,
        align: "center",
      },
      {
        key: "trainingLink",
        label: "Training Link",
        value: (r) =>
          r.trainingLink ? (
            <a
              href={r.trainingLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[#2563eb] underline hover:opacity-90"
            >
              <LinkIcon className="h-4 w-4" />
              Link
            </a>
          ) : (
            "-"
          ),
        width: 174,
        align: "center",
        sticky: { isSticky: true },
      },
    ],
    // showToast is stable enough for closures; values only used on click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [filters, setFilters] = useState({
    trainingName: "",
    financialYear: "",
    assignedDate: null,
    dueDate: null,
    closureDate: null,
  })

  const totalPages = Math.max(1, hasNextPage ? currentPage + 1 : currentPage)

  const tableColumns = useMemo(() => {
    return columns.map((c) => {
      const base = {
        id: c.key,
        header: c.label,
        size: c.width ?? undefined,
        meta: {
          ...(c.sticky || {}),
          nowrap: c.nowrap,
          align: c.align || "left",
        },
        cell: ({ row }) => c.value(row.original),
      }

      if (c.key === "actions") {
        return { ...base, accessorFn: () => null }
      }

      return { ...base, accessorKey: c.key }
    })
  }, [columns])

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const scheduleToastChange = (updater) => {
    window.requestAnimationFrame(() => {
      setToast(updater)
    })
  }
  const closeToast = () => scheduleToastChange((t) => ({ ...t, open: false }))
  const showToast = (variant, message) => {
    scheduleToastChange({ open: true, variant, message })
    window.setTimeout(() => {
      scheduleToastChange((t) => (t.open ? { ...t, open: false } : t))
    }, 2400)
  }

  const handleExport = () => {
    if (rows.length === 0) {
      showToast("destructive", "Nothing to export")
      return
    }
    const now = new Date()
    const filename = `training_kpis_${format(now, "yyyy-MM-dd")}.xlsx`
    downloadXlsx({ filename, rows, columns: exportColumns })
    scheduleModalChange(null)
    showToast("success", "Excel File downloaded successfully!")
  }

  const triggerUploadPicker = (trainingId) => {
    setSelectedTrainingId(trainingId)
    setUploadDialogOpen(true)
  }

  const handleDialogUpload = async (file) => {
    if (!file || !selectedTrainingId) return
    setIsUploading(true)
    try {
      const response = await uploadTrainingData(selectedTrainingId, file)
      setUploadDialogOpen(false)
      showToast("success", response?.message || "Training data uploaded successfully.")
      setRefreshListKey((prev) => prev + 1)
    } catch (error) {
      showToast("error", error?.message || "Failed to upload training data.")
    } finally {
      setIsUploading(false)
      setSelectedTrainingId(null)
    }
  }

  const handleTemplateDownload = async () => {
    try {
      const response = await downloadTrainingTemplate()
      const blobUrl = window.URL.createObjectURL(response.data)
      const disposition = response.headers?.["content-disposition"] || ""
      const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/)
      const fileName = fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : "training_template.xlsx"

      const anchor = document.createElement("a")
      anchor.href = blobUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      window.URL.revokeObjectURL(blobUrl)
      showToast("success", "Template downloaded successfully.")
    } catch (error) {
      showToast("error", error?.message || "Failed to download template.")
    }
  }

  const handleTrainingFileDownload = async (trainingId) => {
    try {
      const response = await downloadTrainingFile(trainingId)
      const blobUrl = window.URL.createObjectURL(response.data)
      const disposition = response.headers?.["content-disposition"] || ""
      const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/)
      const fileName = fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : `${trainingId}_training_data.xlsx`

      const anchor = document.createElement("a")
      anchor.href = blobUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      window.URL.revokeObjectURL(blobUrl)
      showToast("success", "Training file downloaded successfully.")
    } catch (error) {
      console.log("error", error);
      showToast("error", error?.message || "Failed to download training file.")
    }
  }

  useEffect(() => {
    const loadTrainings = async () => {
      try {
        const queryParams = {
          TrainingName: filters.trainingName || undefined,
          FinancialYear: filters.financialYear || undefined,
          TrainingAssignedStartDate: filters.assignedDate?.from ? formatApiDate(filters.assignedDate.from) : undefined,
          TrainingAssignedEndDate: filters.assignedDate?.to ? formatApiDate(filters.assignedDate.to) : undefined,
          TrainingDueStartDate: filters.dueDate?.from ? formatApiDate(filters.dueDate.from) : undefined,
          TrainingDueEndDate: filters.dueDate?.to ? formatApiDate(filters.dueDate.to) : undefined,
          ActivityClosureStartDate: filters.closureDate?.from ? formatApiDate(filters.closureDate.from) : undefined,
          ActivityClosureEndDate: filters.closureDate?.to ? formatApiDate(filters.closureDate.to) : undefined,
          pageNo: currentPage,
          limit: pageSize,
        }

        const response = await getTrainings(queryParams)
        const list = Array.isArray(response) ? response : []

        const mappedRows = list.map((item) => ({
          id: item.training_id || "-",
          trainingName: item.training_name || "-",
          financialYear: item.financial_year || "-",
          assignedDate: parseApiDate(item.training_assigned_date),
          dueDate: parseApiDate(item.training_due_date),
          closureDate: parseApiDate(item.activity_closure_date),
          uploadedBy: item.updated_by || "-",
          uploadedOn: item.last_updated_on ? new Date(item.last_updated_on) : null,
          lastUploadedDataFile: item.last_uploaded_file || "",
          trainingLink: item.training_link || "",
        }))

        setRows(mappedRows)
        setHasNextPage(list.length === pageSize)
      } catch (error) {
        setRows([])
        setHasNextPage(false)
        showToast("error", error?.message || "Failed to fetch trainings.")
      }
    }

    // loadTrainings()
    // showToast and format helpers are stable for this use-case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, filters, refreshListKey])

  const handleAddTraining = async (payload) => {
    try {
      const requestPayload = {
        training_name: payload.trainingName,
        financial_year: payload.financialYear,
        training_assigned_date: formatApiDate(payload.assignedDate),
        training_due_date: formatApiDate(payload.dueDate),
        activity_closure_date: formatApiDate(payload.closureDate),
        training_link: payload.trainingLink,
      }

      const response = await createTraining(requestPayload)
      scheduleModalChange(null)
      setCurrentPage(1)
      setRefreshListKey((prev) => prev + 1)
      showToast("success", response?.Message || "Training successfully added.")
    } catch (error) {
      showToast("error", error?.message || "Failed to create training.")
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] w-[calc(100vw-5rem)] px-6 max-w-full min-w-0 min-h-0 flex-col overflow-hidden bg-[var(--sds-bg-subtle)]">
      <div className="w-full flex min-h-0 max-w-full flex-1 flex-col min-w-0 px-5 py-4 md:py-4">
        <div className="flex items-center justify-between gap-3 py-4">
          <button
            type="button"
            onClick={() => scheduleModalChange("add")}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold text-white transition hover:bg-blue-600"
          >
            <img src="/assets/icons/orch/add-training.svg" alt="" className="size-6 shrink-0" />
            Add Training
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={rows.length === 0}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600/10 px-6 py-3 text-lg font-semibold text-blue-600 transition hover:bg-blue-600/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <img src="/assets/icons/orch/export.svg" alt="" className="size-6 shrink-0" />
              Export
            </button>

            <button
              type="button"
              onClick={() => scheduleModalChange("filters")}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600/10 px-6 py-3 text-lg font-semibold text-blue-600 transition hover:bg-blue-600/15"
            >
              <img src="/assets/icons/orch/filters.svg" alt="" className="size-6 shrink-0" />
              Filters
            </button>
          </div>
        </div>

        <div className="mt-4 flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white shadow-sm">
          <div className="min-h-0 w-full max-w-full flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[1860px] table-fixed border-separate border-spacing-0 text-lg">
              <thead className="bg-[#f5f5f5]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-[#d9d9d9]">
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta || {}
                      const align = meta.align === "center" ? "text-center" : "text-left"

                      return (
                        <th
                          key={header.id}
                          className={cn(
                            "border-b border-[#d9d9d9] px-3 py-3 text-lg font-medium text-black",
                            align,
                            meta.nowrap && "whitespace-nowrap",
                            getStickyColumnClass(meta, "header"),
                          )}
                          style={getColumnWidthStyle(header.getSize(), meta)}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={tableColumns.length}>
                      No training data found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="group border-b border-[#d9d9d9] last:border-b-0 hover:bg-gray-50">
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta || {}
                        const align = meta.align === "center" ? "text-center" : "text-left"

                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "border-b border-[#d9d9d9] px-3 py-4 text-lg text-[#1e1e1e]",
                              align,
                              meta.nowrap ? "whitespace-nowrap" : "break-words whitespace-normal",
                              getStickyColumnClass(meta, "body"),
                            )}
                            style={getColumnWidthStyle(cell.column.getSize(), meta)}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex shrink-0 items-center justify-center border-t border-[#d9d9d9] px-5 py-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      </div>

      <AddTrainingModal
        open={activeModal === "add"}
        onOpenChange={(open) => scheduleModalChange(open ? "add" : null)}
        onSubmit={handleAddTraining}
      />

      <FilterTrainingModal
        open={activeModal === "filters"}
        onOpenChange={(open) => scheduleModalChange(open ? "filters" : null)}
        currentFilters={filters}
        onApply={(appliedFilters) => {
          setFilters(appliedFilters)
          setCurrentPage(1)
          scheduleModalChange(null)
        }}
      />

      <UploadDataDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open)
          if (!open) setSelectedTrainingId(null)
        }}
        onUpload={handleDialogUpload}
        isUploading={isUploading}
      />

      <CenterToast open={toast.open} variant={toast.variant} message={toast.message} onClose={closeToast} />
    </div>
  )
}

