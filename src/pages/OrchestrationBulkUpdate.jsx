import { useCallback, useEffect, useMemo, useState } from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import moment from "moment"
import { Pagination } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { DATE_FORMAT_MOMENT } from "@/config"
import OrchestrationBulkUploadModal from "@/components/orchestration/OrchestrationBulkUploadModal"
import OrchestrationDocumentTypeModal from "@/components/orchestration/OrchestrationDocumentTypeModal"
import CenterToast from "@/components/shared/CenterToast"
import DetailModal from "@/components/shared/DetailModal"
import OrchestrationBreadcrumb from "@/components/shared/OrchestrationBreadcrumb"
import {
  downloadBulkApplicabilityTemplate,
  getBulkApplicabilityHistory,
} from "@/api/orchestration"
import { useBackendUser } from "@/lib/UserContext"
import usePermissions from "@/lib/permissions"

const PAGE_SIZE = 10

function formatDisplayDate(value) {
  if (value == null || value === "") return "—"
  const parsed = moment(value)
  return parsed.isValid() ? parsed.format(DATE_FORMAT_MOMENT).toUpperCase() : String(value)
}

// Map display labels → API enum values (from the allowed list)
const DOCUMENT_TYPE_OPTIONS = [
  { label: "Policy",                          value: "Policy" },
  { label: "Guidance Notes",                  value: "Guidance Note" },
  { label: "Law & Regulation",                 value: "Law Regulation" },
  { label: "Training Resources",              value: "Training Material" },
  { label: "Flyers",                          value: "Flyer" },
  { label: "FAQ",                             value: "FAQ" },
  { label: "Events",                          value: "Events" },
  { label: "Announcements",                   value: "Latest News and Announcements" },
  { label: "Early Warnings",                          value: "EWS" },
]

function mapApiStatus(apiStatus) {
  const s = String(apiStatus || "").toUpperCase()
  if (s === "COMPLETED") return "Uploaded"
  if (s === "FAILED") return "Failed"
  return "In-Progress"
}

function statusBadgeProps(status) {
  if (status === "In-Progress") {
    return { className: "bg-[#fff1c2] text-[#bf6a02]", label: "In-Progress" }
  }
  if (status === "Uploaded") {
    return { className: "bg-[rgba(74,222,128,0.15)] text-[#009951]", label: "Uploaded" }
  }
  return { className: "bg-[#fdd3d0] text-[#c00f0c]", label: "Failed" }
}

function ViewActionButton({ onClick, children = "View" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-blue-600/10 px-3 py-1 text-lg text-[#2563eb] transition hover:bg-blue-600/15"
    >
      {children}
    </button>
  )
}

const columnHelper = createColumnHelper()

export default function OrchestrationBulkUpdate() {
  const backendUser = useBackendUser()
  const perms = usePermissions({ backendUser })

  // Same role-to-document-type mapping used in the Add Document modal
  const DOC_TYPE_ROLE_MAP = [
    { keywords: ["policy"],                     roles: ["Policy Admin", "Policy Hub Admin"] },
    { keywords: ["guidance"],                   roles: ["Policy Admin", "Policy Hub Admin"] },
    { keywords: ["law", "regulation"],          roles: ["Policy Admin", "Policy Hub Admin"] },
    { keywords: ["training"],                   roles: ["KH Admin", "Knowledge Hub Admin"] },
    { keywords: ["faq"],                        roles: ["KH Admin", "Knowledge Hub Admin"] },
    { keywords: ["flyer"],                      roles: ["KH Admin", "Knowledge Hub Admin"] },
    { keywords: ["ews", "early warning"],       roles: ["KH Admin", "Knowledge Hub Admin"] },
    { keywords: ["news", "announcement"],       roles: ["KH Admin", "Knowledge Hub Admin"] },
    { keywords: ["event"],                      roles: ["KH Admin", "Knowledge Hub Admin"] },
  ]

  const filteredDocumentTypeOptions = useMemo(() => {
    return DOCUMENT_TYPE_OPTIONS.filter((opt) => {
      const lower = String(opt.label ?? opt.value ?? "").toLowerCase()
      const match = DOC_TYPE_ROLE_MAP.find((entry) =>
        entry.keywords.some((kw) => lower.includes(kw))
      )
      if (!match) return true
      return perms?.hasAnyRole?.(match.roles) ?? true
    })
  }, [perms?.roles])
  const [currentPage, setCurrentPage] = useState(1)
  const [isDocTypeModalOpen, setIsDocTypeModalOpen] = useState(false)
  const [selectedDocTypes, setSelectedDocTypes] = useState([])
  const [selectedDocIds, setSelectedDocIds] = useState([])
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [detailModal, setDetailModal] = useState({ open: false, title: "", content: "" })
  const [toast, setToast] = useState({ open: false, variant: "success", message: "" })

  const [rows, setRows] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [historyError, setHistoryError] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  const closeToast = () => setToast((t) => ({ ...t, open: false }))

  const showToast = (variant, message) => {
    setToast({ open: true, variant, message })
    window.setTimeout(() => {
      setToast((t) => (t.open ? { ...t, open: false } : t))
    }, 2400)
  }

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setHistoryError(false)
    try {
      const result = await getBulkApplicabilityHistory({ page: currentPage, page_size: PAGE_SIZE })
      const items = result?.data ?? []
      const total = result?.total ?? 0
      setRows(items)
      setTotal(total)
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)))
    } catch (err) {
      console.error("Failed to fetch bulk applicability history:", err)
      setHistoryError(true)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const openDetail = useCallback(
    (title, content) => setDetailModal({ open: true, title, content }),
    [],
  )
  const closeDetail = () => setDetailModal((p) => ({ ...p, open: false }))

  const handleFileClick = useCallback(async (rowId) => {
    setDownloadingId(rowId)
    try {
      const result = await getBulkApplicabilityHistory({ request_id: rowId })
      const items = result?.data ?? []
      const record = Array.isArray(items) ? items[0] : items
      const freshUrl = record?.file_sas_url
      if (freshUrl) {
        window.open(freshUrl, "_blank", "noopener,noreferrer")
      } else {
        showToast("error", "File URL is not available yet.")
      }
    } catch (err) {
      console.error("Failed to fetch file URL:", err)
      showToast("error", "Failed to retrieve file link.")
    } finally {
      setDownloadingId(null)
    }
  }, [])

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Request ID",
        size: 120,
        cell: ({ getValue }) => String(getValue()).padStart(4, "0"),
      }),
      columnHelper.accessor("updated_by", {
        header: "Updated By",
        size: 160,
        cell: ({ getValue }) => getValue() ?? "—",
      }),
      columnHelper.accessor("updated_on", {
        header: "Updated On",
        size: 160,
        cell: ({ getValue }) => formatDisplayDate(getValue()),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        size: 160,
        cell: ({ getValue }) => {
          const displayStatus = mapApiStatus(getValue())
          const badge = statusBadgeProps(displayStatus)
          return (
            <span
              className={cn(
                "inline-flex min-w-[128px] items-center justify-center rounded-lg px-4 py-2 text-lg font-semibold whitespace-nowrap",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: "bulkUpload",
        header: () => (
          <span className="inline-flex items-center justify-center gap-2.5">
            <img src="/assets/icons/orch/bulk-upload-header.svg" alt="" className="size-6 shrink-0" />
            Bulk Upload
          </span>
        ),
        size: 181,
        cell: ({ row }) => {
          const name = row.original.file_name ?? null
          const id = row.original.id
          const isDownloading = downloadingId === id
          if (!name) return <span className="text-slate-300">—</span>
          return (
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleFileClick(id)}
              className="inline-flex max-w-[180px] items-center justify-center gap-2.5 text-lg text-[#2563eb] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? (
                <span className="inline-block h-6 w-6 flex-shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
              ) : (
                <img src="/assets/icons/orch/paperclip.svg" alt="" className="size-6 shrink-0" />
              )}
              <span className="truncate">{name}</span>
            </button>
          )
        },
      }),
      columnHelper.display({
        id: "errorView",
        header: "Error View",
        size: 148,
        cell: ({ row }) => {
          const displayStatus = mapApiStatus(row.original.status)
          const errorContent = row.original.error ?? "No error details available."
          return (
            <div className="flex justify-center">
              {displayStatus === "Failed" ? (
                <ViewActionButton onClick={() => openDetail("Error Details", errorContent)} />
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: "changeComments",
        header: () => (
          <span className="block leading-normal">
            Remarks
          </span>
        ),
        size: 148,
        cell: ({ row }) => {
          const remarks = row.original.change_remarks ?? ""
          return (
            <div className="flex justify-center">
              {remarks ? (
                <ViewActionButton onClick={() => openDetail("Remarks", remarks)} />
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </div>
          )
        },
      }),
    ],
    [openDetail, handleFileClick, downloadingId],
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: { pageIndex: currentPage - 1, pageSize: PAGE_SIZE },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: currentPage - 1, pageSize: PAGE_SIZE })
          : updater
      setCurrentPage(next.pageIndex + 1)
    },
  })

  const handleDownloadTemplateClick = () => {
    setSelectedDocTypes([])
    setSelectedDocIds([])
    setIsDocTypeModalOpen(true)
  }

  const handleSubmitDownload = async () => {
    setIsDocTypeModalOpen(false)
    try {
      const eventIds = selectedDocIds.filter((i) => String(i.type_label ?? i.document_type ?? "").toUpperCase() === "EVENTS").map((i) => i.id)
      const docIds = selectedDocIds.filter((i) => String(i.type_label ?? i.document_type ?? "").toUpperCase() !== "EVENTS").map((i) => i.id)
      const payload =
        selectedDocIds.length === 0
          ? { mode: "ALL", selected_types: selectedDocTypes }
          : {
              mode: "SPECIFIC",
              ...(docIds.length > 0 && { document_ids: docIds }),
              ...(eventIds.length > 0 && { event_ids: eventIds }),
            }

      const response = await downloadBulkApplicabilityTemplate(payload)
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const disposition = response.headers?.["content-disposition"]
      const filename =
        disposition?.match(/filename[^;=\n]*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/i)?.[3]?.trim() ??
        disposition?.match(/filename="?([^";\n]+)"?/i)?.[1]?.trim() ??
        `template_${selectedDocTypes.join("_").replace(/\s+/g, "_") || "download"}.xlsx`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast("success", "Excel File downloaded successfully!")
    } catch (err) {
      console.error("Template download failed:", err)
      showToast("error", "Template download failed. Please try again.")
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--sds-bg-subtle)]">
      <div className="flex min-h-0 w-full flex-1 flex-col py-6 md:py-8">
        <OrchestrationBreadcrumb currentPage="Visibility Filter (Bulk update)" />
        {/* <h1 className="text-xl font-semibold tracking-tight mb-4">Visibility Filter (Bulk update)</h1> */}
        <div className="flex w-full shrink-0 items-center justify-between gap-3 py-4">
          <button
            type="button"
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold text-white transition hover:bg-blue-600"
          >
            <img src="/assets/icons/orch/bulk-upload.svg" alt="" className="size-6 shrink-0" />
            Bulk Upload
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplateClick}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600/15 px-6 py-3 text-lg font-semibold text-blue-600 transition hover:bg-blue-600/20"
          >
            <img src="/assets/icons/orch/download-template.svg" alt="" className="size-6 shrink-0" />
            Download Template
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white shadow-sm">
          <div className="flex shrink-0 items-center gap-2 px-6 py-5">
            <img src="/assets/icons/orch/upload-history-files.svg" alt="" className="size-6 shrink-0" />
            <h2 className="text-xl font-medium leading-[1.4] text-[#1e1e1e]">Upload History</h2>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1100px] table-fixed border-collapse text-lg">
              <thead className="sticky top-0 z-10 bg-[#f5f5f5]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-y border-[#d9d9d9]">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-3 py-3 text-center text-lg font-medium whitespace-nowrap text-black"
                        style={{ width: header.getSize(), minWidth: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-5 py-10 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : historyError ? (
                  <tr>
                    <td colSpan={columns.length} className="px-5 py-6">
                      <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <span className="text-sm text-red-700">Unable to load this page.</span>
                        <button
                          type="button"
                          onClick={fetchHistory}
                          className="ml-4 text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-5 py-10 text-center text-slate-400">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#d9d9d9] last:border-b-0 hover:bg-slate-50/60">
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-4 text-center align-middle text-lg text-[#1e1e1e]"
                          style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex shrink-0 items-center justify-center border-t border-[#d9d9d9] py-4">
            <Pagination
              currentPage={table.getState().pagination.pageIndex + 1}
              totalPages={table.getPageCount()}
              onPageChange={(page) => table.setPageIndex(page - 1)}
            />
          </div>
        </div>
      </div>

      <OrchestrationDocumentTypeModal
        isOpen={isDocTypeModalOpen}
        onClose={() => setIsDocTypeModalOpen(false)}
        docTypeOptions={filteredDocumentTypeOptions}
        selectedDocTypes={selectedDocTypes}
        onDocTypesChange={setSelectedDocTypes}
        selectedDocIds={selectedDocIds}
        onDocIdsChange={setSelectedDocIds}
        onSubmit={handleSubmitDownload}
      />

      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={closeToast}
      />

      <OrchestrationBulkUploadModal
        isOpen={isBulkUploadOpen}
        setIsOpen={setIsBulkUploadOpen}
        onUploadSuccess={fetchHistory}
      />

      <DetailModal isOpen={detailModal.open} title={detailModal.title} onClose={closeDetail}>
        {detailModal.content}
      </DetailModal>
    </div>
  )
}
