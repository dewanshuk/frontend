import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Paperclip, Upload, X, XCircle } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { uploadBulkApplicabilityFile, getBulkApplicabilityHistory } from "@/api/orchestration"
import CenterToast from "@/components/shared/CenterToast"

const HISTORY_PAGE_SIZE = 5

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-25"

function StatusBanner({ status, errorMessage }) {
  if (status === "idle") return null

  if (status === "uploading") {
    return (
      <div className="mt-4 rounded-2xl bg-amber-100 px-6 py-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/60">
          <div className="h-8 w-8 rounded-full border-[4px] border-slate-300 border-t-amber-500 animate-spin" />
        </div>
        <div className="text-sm font-semibold text-slate-800">In Progress</div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="mt-4 rounded-2xl bg-emerald-100 px-6 py-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/60">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 ecp-icon-bounce" />
        </div>
        <div className="text-sm font-semibold text-slate-800">Uploaded</div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-3">
        <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
        <p className="text-sm text-rose-700">{errorMessage || "Update failed. Please try again."}</p>
      </div>
    )
  }

  return null
}

function HistoryStatusBadge({ status }) {
  const map = {
    SUCCESS:    "bg-emerald-100 text-emerald-700",
    COMPLETED:  "bg-emerald-100 text-emerald-700",
    FAILED:     "bg-rose-100 text-rose-700",
    ERROR:      "bg-rose-100 text-rose-700",
    PROCESSING: "bg-amber-100 text-amber-700",
    PENDING:    "bg-gray-100 text-gray-600",
  }
  const cls = map[(status || "").toUpperCase()] ?? "bg-gray-100 text-gray-600"
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", cls)}>
      {status ?? "—"}
    </span>
  )
}

export default function OrchestrationBulkUploadModal({ isOpen, setIsOpen, onUploadSuccess }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState("")
  const [comments, setComments] = useState("")
  const [commentsError, setCommentsError] = useState("")
  const [status, setStatus] = useState("idle") // idle | uploading | success
  const [toastMsg, setToastMsg] = useState({ open: false, variant: "success", message: "" })

  const [history, setHistory] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(false)

  const accept = useMemo(() => [".xls", ".xlsx", ".csv"], [])
  const totalPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE))

  const isValidFile = (f) => {
    if (!f) return false
    const ext = "." + f.name.split(".").pop().toLowerCase()
    return accept.includes(ext)
  }

  const fetchHistory = useCallback(async (page) => {
    setHistoryLoading(true)
    setHistoryError(false)
    try {
      const res = await getBulkApplicabilityHistory({ page, page_size: HISTORY_PAGE_SIZE })
      setHistory(res?.data ?? res?.items ?? [])
      setHistoryTotal(res?.total ?? 0)
    } catch {
      setHistory([])
      setHistoryTotal(0)
      setHistoryError(true)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setFile(null)
    setFileError("")
    setComments("")
    setCommentsError("")
    setStatus("idle")
    setHistoryPage(1)
    setHistoryError(false)
    fetchHistory(1)
  }, [isOpen, fetchHistory])

  useEffect(() => {
    if (!isOpen) return
    if (status !== "success") return
    const t = window.setTimeout(() => {
      setIsOpen(false)
    }, 3000)
    return () => window.clearTimeout(t)
  }, [isOpen, setIsOpen, status])

  useEffect(() => {
    // Close any toast originating from this modal when the modal is closed
    if (isOpen) return
    setToastMsg(p => ({ ...p, open: false }))
  }, [isOpen, setToastMsg])

  const onPickFile = (f) => {
    if (!f) return
    if (!isValidFile(f)) {
      setFileError(`Invalid file type. Only ${accept.join(", ")} files are allowed.`)
      setFile(null)
      return
    }
    setFileError("")
    setFile(f)
    setStatus("idle")
  }

  const onBrowse = () => inputRef.current?.click()

  const onDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const f = e.dataTransfer?.files?.[0]
    onPickFile(f)
  }

  const onUpload = async () => {
    if (!file) return
    if (!comments.trim()) {
      setCommentsError("Remarks is required.")
      return
    }
    setCommentsError("")
    setStatus("uploading")
    try {
      await uploadBulkApplicabilityFile({ file, change_remarks: comments || undefined })
      setStatus("success")
      onUploadSuccess?.()
      setToastMsg({ open: true, variant: "success", message: "File uploaded successfully!" })
      // Refresh history after successful upload
      fetchHistory(1)
      setHistoryPage(1)
    } catch (err) {
      console.error("Bulk upload failed:", err)
      setStatus("idle")
      setToastMsg({ open: true, variant: "error", message: "Update failed. Please try again." })
    }
  }

  const goToPage = (page) => {
    setHistoryPage(page)
    fetchHistory(page)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <CenterToast
        open={toastMsg.open}
        variant={toastMsg.variant}
        message={toastMsg.message}
        onClose={() => setToastMsg(p => ({ ...p, open: false }))}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Box */}
      <div className="relative w-full max-w-[880px] mx-4 rounded-2xl bg-white p-6 shadow-xl animate-[fadeIn_.2s_ease-out] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-xl font-semibold">Visibility Filter (Bulk update)</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-md border border-transparent p-1 text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Remarks */}
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-2">Remarks*</div>
            <textarea
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-sm outline-none",
                "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300",
                commentsError ? "border-red-500" : ""
              )}
              placeholder="Type here..."
              rows={2}
              value={comments}
              onChange={(e) => {
                setComments(e.target.value)
                if (commentsError && e.target.value.trim()) setCommentsError("")
              }}
              disabled={status === "uploading"}
            />
            {commentsError && <p className="mt-1 text-sm text-red-500">{commentsError}</p>}
          </div>

          {/* Upload Template */}
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Upload Template</div>
            <div
              className={cn(
                "rounded-2xl border-2 border-dashed border-blue-500/80 bg-slate-50",
                "px-6 py-4 text-center"
              )}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onClick={onBrowse}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onBrowse() }}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white">
                <img src="/assets/icons/upload-box-icon.png" alt="upload" className="h-22 w-22" />
              </div>
              <div className="text-sm text-slate-800">
                Drag &amp; Drop your files here or{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={(e) => { e.stopPropagation(); onBrowse() }}
                >
                  browse
                </button>
              </div>
              <div className="mt-1 text-xs text-slate-400">({accept.join(", ")} files only)</div>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={accept.join(",")}
                onChange={(e) => { onPickFile(e.target.files?.[0]); e.target.value = "" }}
              />
            </div>
            {fileError && <p className="mt-2 text-sm text-red-500">{fileError}</p>}

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 font-semibold text-blue-600">
                <Paperclip className="h-6 w-6 shrink-0" />
                <span className="truncate text-lg leading-[1.4]">{file ? file.name : ""}</span>
              </div>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={!file || status === "uploading"}
                onClick={onUpload}
              >
                {status === "uploading" ? (
                  <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Upload className="h-6 w-6 shrink-0" />
                )}
                {status === "uploading" ? "Updating..." : "Update"}
              </button>
            </div>

            <StatusBanner status={status} />
          </div>

          {/* Upload History */}
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Upload History</div>
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-y-auto max-h-[260px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Request ID</th>
                      <th className="px-4 py-3 text-left font-medium">File</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Uploaded At</th>
                      <th className="px-4 py-3 text-right font-medium">Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center">
                          <div className="flex justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          </div>
                        </td>
                      </tr>
                    ) : historyError ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4">
                          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                            <span className="text-sm text-red-700">Unable to load this page.</span>
                            <button
                              type="button"
                              onClick={() => fetchHistory(historyPage)}
                              className="ml-4 text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
                            >
                              Retry
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No upload history found.</td>
                      </tr>
                    ) : (
                      history.map((row, i) => (
                        <tr key={row?.id ?? row?.request_id ?? i} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{row?.request_id ?? row?.id ?? "—"}</td>
                          <td className="px-4 py-3 max-w-[180px] truncate text-gray-700">{row?.file_name ?? row?.filename ?? "—"}</td>
                          <td className="px-4 py-3"><HistoryStatusBadge status={row?.status} /></td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row?.created_at ?? row?.uploaded_at ?? "—"}</td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {row?.records_total != null ? (
                              <span>
                                <span className="text-emerald-600 font-medium">{row?.records_success ?? 0}</span>
                                {" / "}
                                {row?.records_total}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination — inside the border, always visible */}
              <div className="flex items-center justify-center border-t bg-white px-4 py-3">
                <Pagination
                  currentPage={historyPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  disabled={historyLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
