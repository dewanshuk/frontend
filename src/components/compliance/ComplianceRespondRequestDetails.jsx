import { ChevronUp, FileText } from "lucide-react"
import {
  pickBackendCreatedOn,
  pickBackendClosureDate,
  pickBackendClosureRemarks,
} from "@/api/complianceApi"

// Keep the date helpers for fallback parsing if needed, but UI will prefer
// raw backend values when present (show as-is per new API contract).
export const formatDisplayDate = (value) => {
  if (!value) return "-"
  try {
    const text = String(value)
    return text || "-"
  } catch (e) {
    return "-"
  }
}

export const formatStatusLabel = (status) => {
  if (!status) return "-"
  return String(status).replace(/_/g, "-")
}

export const getStatusDotClass = (status) => {
  const s = String(status ?? "").toLowerCase()
  if (s.includes("progress") || s.includes("pending")) return "bg-orange-500"
  if (s.includes("complete") || s.includes("closed") || s.includes("done")) return "bg-emerald-500"
  if (s.includes("overdue")) return "bg-red-500"
  return "bg-gray-400"
}

const DetailField = ({ label, children }) => (
  <div className="min-w-0">
    <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
    <div className="text-sm text-black break-words [overflow-wrap:anywhere]">{children ?? "-"}</div>
  </div>
)

/**
 * Collapsible Request Details panel shared by Gift / Query / Complaint respond modals.
 * Expects conversation API payload fields (already flattened via normalizeComplianceConversationResponse).
 * Created On / Closure Date come only from backend detail fields (not list-row data).
 */
export default function ComplianceRespondRequestDetails({
  open,
  onOpenChange,
  isLoading = false,
  loadError = "",
  record = null,
  typeLabel = "-",
  subTypeLabel = "-",
}) {
  const statusLabel = formatStatusLabel(record?.status)
  // Prefer raw values from details when available; fall back to pickers.
  const createdOnRaw =
    record?.details?.createdOn ?? record?.details?.created_on ?? pickBackendCreatedOn(record)
  const closureDateRaw =
    record?.details?.closureDate ?? record?.details?.closure_date ?? pickBackendClosureDate(record)

  const createdByRaw =
    record?.details?.actor_name ??
    record?.actor_name ??
    record?.actorName ??
    record?.details?.createdBy ??
    record?.createdBy
  const closedByRaw =
    record?.details?.closed_by_name ??
    record?.closed_by_name ??
    record?.closedBy
  const closureRemarksRaw = pickBackendClosureRemarks(
    record?.details,
    record,
  )

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onOpenChange?.(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2 text-black">
          <FileText className="h-4 w-4" />
          <span className="text-sm font-semibold">Request Details</span>
        </div>
        <ChevronUp
          className={`h-4 w-4 text-black transition-transform ${open ? "" : "rotate-180"}`}
        />
      </button>

      {open ? (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          {isLoading ? (
            <div className="py-6 text-sm text-black">Loading request details...</div>
          ) : loadError ? (
            <div className="py-6 text-sm text-rose-600">{loadError}</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-5">
                <DetailField label="Created By">{createdByRaw ? String(createdByRaw) : "-"}</DetailField>
                <DetailField label="Created On">{createdOnRaw ? String(createdOnRaw) : "-"}</DetailField>
                <DetailField label="Type">{typeLabel}</DetailField>
                <DetailField label="Sub-Type">{subTypeLabel || "-"}</DetailField>
                <DetailField label="Status">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${getStatusDotClass(record?.status)}`} />
                    {statusLabel}
                  </span>
                </DetailField>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-5">
                <DetailField label="Pending at">
                  {record?.pendingAt != null && record?.pendingAt !== ""
                    ? String(record.pendingAt)
                    : "-"}
                </DetailField>
                <DetailField label="Closed By">{closedByRaw ? String(closedByRaw) : "-"}</DetailField>
                <DetailField label="Closure Date">{closureDateRaw ? String(closureDateRaw) : "-"}</DetailField>
                {closureRemarksRaw ? (
                  <DetailField label="Closure Remarks">{String(closureRemarksRaw)}</DetailField>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
