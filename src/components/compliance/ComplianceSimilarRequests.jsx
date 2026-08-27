import { useEffect, useState } from "react"
import { ChevronUp, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSimilarRequests } from "@/api/complianceApi"
import { formatDisplayDate } from "@/components/compliance/ComplianceRespondRequestDetails"

/**
 * Collapsible Similar Request panel shared by Gift / Query / Complaint / Self Declaration respond views.
 * Half-width vs Request Details / Response History; View Detail opens the row in view mode.
 */
export default function ComplianceSimilarRequests({
  requestId,
  onViewDetail,
}) {
  const [open, setOpen] = useState(true)
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const id = String(requestId ?? "").trim()
    if (!id || id === "-") {
      setRows([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const list = await getSimilarRequests(id)
        if (cancelled) return
        setRows(Array.isArray(list) ? list : [])
      } catch (error) {
        console.error(error)
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [requestId])

  const handleViewDetail = (item) => {
    const similarId = String(item?.requestId ?? item?.request_id ?? "").trim()
    if (!similarId || typeof onViewDetail !== "function") return
    onViewDetail({
      requestId: similarId,
      type: item?.type ?? "",
      subType: item?.subType ?? item?.sub_type ?? "",
      createdOn: item?.createdOn ?? item?.created_on ?? item?.createdAt ?? "",
    })
  }

  if (isLoading || rows.length === 0) return null

  return (
    <section className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:w-1/2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2 text-black">
          <FileText className="h-4 w-4" />
          <span className="text-sm font-semibold">Similar Request</span>
        </div>
        <ChevronUp
          className={`h-4 w-4 text-black transition-transform ${open ? "" : "rotate-180"}`}
        />
      </button>

      {open ? (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#f5f5f5]">
                <tr>
                  <th className="border-b border-[#d9d9d9] px-4 py-3 text-left text-sm font-medium text-black">
                    Request ID
                  </th>
                  <th className="border-b border-[#d9d9d9] px-4 py-3 text-left text-sm font-medium text-black">
                    Created At
                  </th>
                  <th className="border-b border-[#d9d9d9] px-4 py-3 text-left text-sm font-medium text-black">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item, index) => {
                  const similarId = String(item?.requestId ?? item?.request_id ?? "").trim()
                  const createdAt = item?.createdOn ?? item?.created_on ?? item?.createdAt ?? ""
                  return (
                    <tr key={similarId || `similar-${index}`}>
                      <td className="border-b border-[#d9d9d9] px-4 py-3 text-sm text-[#1e1e1e]">
                        {similarId || "-"}
                      </td>
                      <td className="border-b border-[#d9d9d9] px-4 py-3 text-sm text-[#1e1e1e]">
                        {formatDisplayDate(createdAt)}
                      </td>
                      <td className="border-b border-[#d9d9d9] px-4 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!similarId}
                          onClick={() => handleViewDetail(item)}
                          className="h-8 rounded-full border-0 bg-blue-100 px-4 text-sm font-medium text-blue-600 hover:bg-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          View Detail
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
