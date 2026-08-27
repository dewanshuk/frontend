import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, MessageSquare, Paperclip } from "lucide-react"
import Loader from "@/atoms/loader"
import ComplianceRespondRequestDetails from "@/components/compliance/ComplianceRespondRequestDetails"
import ComplianceSimilarRequests from "@/components/compliance/ComplianceSimilarRequests"
import ComplianceAttachmentChips from "@/components/compliance/ComplianceAttachmentChips"
import {
  formatComplaintTypeLabel,
  getComplaintDetailsFromPayload,
  getConversationActorNameClass,
  getConversationEntryActor,
  getConversationEntryDateTime,
  getConversationEntryMessageText,
  getInitialConversationDetailsText,
} from "@/components/compliance/complianceConversationViewUtils"
import {
  closeComplianceRecord,
  getComplianceConversation,
  respondToComplianceRecord,
} from "@/api/complianceApi"

const SUBMIT_THROTTLE_MS = 2000
const RESPONSE_HISTORY_TEXT_CLASS =
  "whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed"

export default function ComplaintRespondModal({
  open,
  onOpenChange,
  onBack,
  request,
  onShowToast,
  onSuccess,
  readOnly = false,
  onViewSimilarRequest,
}) {
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [conversationData, setConversationData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [responseText, setResponseText] = useState("")
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [markCompleteOpen, setMarkCompleteOpen] = useState(false)
  const [closeRemarks, setCloseRemarks] = useState("")
  const fileInputRef = useRef(null)
  const submitLockRef = useRef(false)
  const lastSubmitAtRef = useRef(0)

  const recordId = request?.requestId || request?.id || ""

  const loadConversation = useCallback(async (id) => {
    const data = await getComplianceConversation(id)
    setConversationData(data)
    return data
  }, [])

  useEffect(() => {
    if (!open) {
      setDetailsOpen(true)
      setConversationData(null)
      setLoadError("")
      setResponseText("")
      setAttachedFiles([])
      setIsSubmitting(false)
      setMarkCompleteOpen(false)
      setCloseRemarks("")
      submitLockRef.current = false
      lastSubmitAtRef.current = 0
      return
    }

    if (!recordId) {
      setLoadError("Request ID is missing.")
      return
    }

    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      setLoadError("")
      try {
        await loadConversation(recordId)
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setConversationData(null)
          const message = err?.message || "Unable to load complaint conversation."
          setLoadError(message)
          onShowToast?.("error", message)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, recordId, loadConversation, onShowToast])

  const conversationEntries = useMemo(() => {
    const list = conversationData?.conversation
    return Array.isArray(list) ? list : []
  }, [conversationData])

  const firstEntry = conversationEntries[0] ?? {}
  const complaintDetails = useMemo(
    () =>
      getComplaintDetailsFromPayload(
        { ...(conversationData ?? {}), subType: request?.subType },
        firstEntry,
      ),
    [conversationData, firstEntry, request?.subType],
  )
  const displayRequestId = conversationData?.id || recordId || "-"
  const typeLabel = request?.type || "Complaint"
  const subTypeLabel =
    request?.subType ||
    formatComplaintTypeLabel(conversationData?.complaintType || conversationData?.subType) ||
    complaintDetails.complaintType ||
    "-"

  const runThrottledAction = async (action) => {
    const now = Date.now()
    if (submitLockRef.current || now - lastSubmitAtRef.current < SUBMIT_THROTTLE_MS) {
      return false
    }

    submitLockRef.current = true
    lastSubmitAtRef.current = now
    setIsSubmitting(true)

    try {
      await action()
      return true
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleFilePick = (files) => {
    const next = Array.from(files || [])
    if (!next.length) return
    setAttachedFiles((prev) => [...prev, ...next])
  }

  const removeAttachedFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmitResponse = async () => {
    const text = responseText.trim()
    if (!text) return

    const id = displayRequestId
    if (!id || id === "-") {
      onShowToast?.("error", "Request ID is missing.")
      return
    }

    try {
      const didRun = await runThrottledAction(async () => {
        const result = await respondToComplianceRecord({
          recordId: id,
          message: text,
          files: attachedFiles,
        })
        onShowToast?.(
          "success",
          result?.status || result?.details || result?.message || "Response submitted successfully.",
        )
        setResponseText("")
        setAttachedFiles([])
        await loadConversation(id)
        onSuccess?.()
      })

      if (!didRun) {
        onShowToast?.("warning", "Please wait before submitting again.")
      }
    } catch (err) {
      console.error(err)
      onShowToast?.("error", err?.message || "Unable to submit response. Please try again.")
    }
  }

  const handleMarkComplete = async () => {
    const remarks = closeRemarks.trim()
    if (!remarks) return

    const id = displayRequestId
    if (!id || id === "-") {
      onShowToast?.("error", "Request ID is missing.")
      return
    }

    try {
      const didRun = await runThrottledAction(async () => {
        const result = await closeComplianceRecord(id, { remarks })
        onShowToast?.(
          "success",
          result?.status || result?.details || result?.message || "Marked as complete.",
        )
        setMarkCompleteOpen(false)
        setCloseRemarks("")
        onSuccess?.()
        onOpenChange(false)
      })

      if (!didRun) {
        onShowToast?.("warning", "Please wait before submitting again.")
      }
    } catch (err) {
      console.error(err)
      onShowToast?.("error", err?.message || "Unable to mark as complete. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="w-screen max-w-none h-screen m-0 p-0 rounded-none border-0 bg-[#F3F4F6] overflow-hidden flex flex-col translate-x-[-50%] translate-y-[-50%]"
      >
        <DialogTitle className="sr-only">Complaint Respond</DialogTitle>

        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="mx-auto w-full max-w-6xl space-y-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (onBack ? onBack() : onOpenChange(false))}
                className="inline-flex items-center gap-1 shrink-0 rounded-md bg-blue-300 px-2 py-1 text-sm font-medium text-black transition-colors duration-150 hover:bg-blue-500 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <h1 className="text-xl font-semibold text-black">Request ID {displayRequestId}</h1>
            </div>

            <ComplianceRespondRequestDetails
              open={detailsOpen}
              onOpenChange={setDetailsOpen}
              isLoading={isLoading}
              loadError={loadError}
              record={conversationData}
              typeLabel={typeLabel}
              subTypeLabel={subTypeLabel}
            />

            <ComplianceSimilarRequests
              requestId={recordId}
              onViewDetail={onViewSimilarRequest}
            />

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2 text-black">
                <MessageSquare className="h-4 w-4" />
                <h2 className="text-sm font-semibold">Response History</h2>
              </div>

              {isLoading ? (
                <div className="flex min-h-[180px] items-center justify-center py-8">
                  <Loader />
                </div>
              ) : loadError ? (
                <div className="py-6 text-sm text-rose-600">{loadError}</div>
              ) : (
                <div className="space-y-5">
                  {conversationEntries.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-black">
                      No responses yet.
                    </div>
                  ) : (
                    conversationEntries.map((entry, index) => {
                      const actorLabel = getConversationEntryActor(entry).toUpperCase()
                      const files = Array.isArray(entry?.files) ? entry.files : []
                      const isInitialEntry = index === 0
                      const detailsText = getInitialConversationDetailsText(entry, "complaint")
                      const messageText = getConversationEntryMessageText(entry)

                      return (
                        <div key={`${entry?.actorId || entry?.actor_id || "entry"}-${entry?.dateTime || entry?.date_time || index}`}>
                          <div className="mb-2 text-xs font-medium tracking-wide">
                            <span className={getConversationActorNameClass(entry?.actor)}>{actorLabel}</span>
                            <span className="text-[#6B7280]">{' '}| {getConversationEntryDateTime(entry)}</span>
                          </div>
                          <div className="rounded-xl border border-[#E4DFF7] bg-[#F3F0FF] p-4">
                            <div className="space-y-3 text-sm text-black">
                              {isInitialEntry ? (
                                <>
                                  <div>
                                    <span className="font-semibold">Declaration Type: </span>
                                    <span>Complaint</span>
                                  </div>
                                  <div>
                                    <div className="font-semibold">Details:</div>
                                    <div className={`mt-1 ${RESPONSE_HISTORY_TEXT_CLASS}`}>
                                      {detailsText || "-"}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className={RESPONSE_HISTORY_TEXT_CLASS}>
                                  {messageText || "-"}
                                </div>
                              )}
                              <ComplianceAttachmentChips
                                files={files}
                                onError={(message) => onShowToast?.("error", message)}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}

                  {!readOnly ? (
                  <div className="pt-2">
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Type your response here"
                      disabled={isSubmitting || isLoading}
                      className="min-h-[140px] rounded-xl border-gray-300 bg-white text-sm text-black placeholder:text-gray-400"
                    />

                    {attachedFiles.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {attachedFiles.map((file, index) => (
                          <span
                            key={`${file.name}-${index}`}
                            className="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs text-black"
                          >
                            {file.name}
                            <button
                              type="button"
                              onClick={() => removeAttachedFile(index)}
                              disabled={isSubmitting}
                              className="text-rose-600 hover:text-rose-700"
                              aria-label={`Remove ${file.name}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            handleFilePick(e.target.files)
                            e.target.value = ""
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click?.()}
                          disabled={isSubmitting || isLoading}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-black disabled:opacity-50"
                          aria-label="Attach files"
                          title="Attach files"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button
                          type="button"
                          onClick={handleSubmitResponse}
                          disabled={isSubmitting || isLoading || !responseText.trim()}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {isSubmitting && !markCompleteOpen ? "Submitting..." : "Submit Response"}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setMarkCompleteOpen(true)}
                          disabled={isSubmitting || isLoading}
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Mark as Complete
                        </Button>
                      </div>
                    </div>
                  </div>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </div>

        {!readOnly && markCompleteOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <h3 className="text-[18px] font-semibold text-gray-900">Mark as Complete</h3>
              <p className="mt-2 text-sm text-gray-600">
                Add closing remarks before marking this record as complete.
              </p>
              <Textarea
                value={closeRemarks}
                onChange={(e) => setCloseRemarks(e.target.value)}
                placeholder="Type closing remarks"
                disabled={isSubmitting}
                className="mt-4 min-h-[120px] rounded-xl border-gray-300 bg-white text-sm text-black placeholder:text-gray-400"
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isSubmitting) return
                    setMarkCompleteOpen(false)
                    setCloseRemarks("")
                  }}
                  disabled={isSubmitting}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={isSubmitting || !closeRemarks.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
