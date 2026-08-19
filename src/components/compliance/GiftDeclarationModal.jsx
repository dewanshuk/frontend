import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Upload, X } from "lucide-react"
import { generateSimilarRequestsFromCreateResult, raiseComplianceGift } from "@/api/complianceApi"

const STATUS_OPTIONS = [
  { value: "to_be_given", label: "To be given" },
  { value: "already_given", label: "Already given" },
  { value: "to_be_received", label: "To be received" },
  { value: "already_received", label: "Already received" },
]

const ALLOWED_FILE_TYPES = [
  "image/png",
  "application/pdf",
  "image/jpeg",
  "image/gif",
  "image/bmp",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/tiff",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]

const ALLOWED_EXTENSIONS = [
  ".png",
  ".pdf",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ppt",
  ".pptx",
  ".tiff",
  ".xlsx",
  ".xls",
  ".csv",
]

const MAX_ATTACHMENTS = 6
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024
const ALLOWED_TYPES_HINT =
  "Allowed: png, pdf, jpg, jpeg, gif, bmp, ppt, pptx, tiff, xlsx, xls, csv"
const ATTACHMENT_LIMIT_HINT = "Upto 6 Attachments. 30 MB max per file."

const MAX_TITLE_WORDS = 50
const MAX_DESCRIPTION_WORDS = 500

const countWords = (value) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

const clampToMaxWords = (value, maxWords) => {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length <= maxWords) return value
  return words.slice(0, maxWords).join(" ")
}

const INITIAL_FORM = {
  title: "",
  description: "",
  status: "to_be_given",
  fromToPerson: "",
  fromToOrganization: "",
  approxValueInr: "",
  ringiApprovalTaken: "yes",
  ringiNumber: "",
}

export default function GiftDeclarationModal({ open, onOpenChange, onShowToast, onSuccess }) {
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    type: "error",
    title: "",
    message: "",
  })

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM)
      setUploadedFiles([])
      setDragActive(false)
      setErrors({})
      setConfirmClearOpen(false)
      setStatusPopup({ open: false, type: "error", title: "", message: "" })
    }
  }, [open])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }))
    }
  }

  const validateFile = (file) => {
    return (
      ALLOWED_FILE_TYPES.includes(file.type) ||
      ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    )
  }

  const handleFileSelect = (files) => {
    const fileList = Array.from(files)
    const typeValidFiles = fileList.filter(validateFile)

    if (typeValidFiles.length !== fileList.length) {
      setStatusPopup({
        open: true,
        type: "error",
        title: "Invalid file type",
        message: `Only files with these extensions are allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      })
    }

    const sizeValidFiles = typeValidFiles.filter((file) => file.size <= MAX_FILE_SIZE_BYTES)
    if (sizeValidFiles.length !== typeValidFiles.length) {
      setStatusPopup({
        open: true,
        type: "error",
        title: "File too large",
        message: ATTACHMENT_LIMIT_HINT,
      })
    }

    if (sizeValidFiles.length === 0) return

    setUploadedFiles((prev) => {
      const remaining = Math.max(0, MAX_ATTACHMENTS - prev.length)
      if (remaining <= 0) {
        setStatusPopup({
          open: true,
          type: "error",
          title: "Attachment limit",
          message: ATTACHMENT_LIMIT_HINT,
        })
        return prev
      }
      if (sizeValidFiles.length > remaining) {
        setStatusPopup({
          open: true,
          type: "error",
          title: "Attachment limit",
          message: ATTACHMENT_LIMIT_HINT,
        })
      }
      return [...prev, ...sizeValidFiles.slice(0, remaining)]
    })
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setUploadedFiles([])
    setDragActive(false)
    setErrors({})
  }

  const handleClearForm = () => {
    setConfirmClearOpen(true)
  }

  const handleConfirmClear = () => {
    setConfirmClearOpen(false)
    resetForm()
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!form.title.trim()) {
      nextErrors.title = "Please enter a title"
    } else if (countWords(form.title) > MAX_TITLE_WORDS) {
      nextErrors.title = `Title cannot exceed ${MAX_TITLE_WORDS} words`
    }

    if (!form.description.trim()) {
      nextErrors.description = "Please enter a description"
    } else if (countWords(form.description) > MAX_DESCRIPTION_WORDS) {
      nextErrors.description = `Description cannot exceed ${MAX_DESCRIPTION_WORDS} words`
    }

    if (!form.fromToPerson.trim()) {
      nextErrors.fromToPerson = "Please enter From/To (Person)"
    }

    if (!form.fromToOrganization.trim()) {
      nextErrors.fromToOrganization = "Please enter From/To (Organization)"
    }

    if (!form.approxValueInr.trim()) {
      nextErrors.approxValueInr = "Please enter Approx Value (INR)"
    }

    if (form.ringiApprovalTaken === "yes" && !form.ringiNumber.trim()) {
      nextErrors.ringiNumber = "Please enter Ringi Number"
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmitDeclaration = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const result = await raiseComplianceGift({
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        person: form.fromToPerson.trim(),
        organization: form.fromToOrganization.trim(),
        approxValueINR: Number(form.approxValueInr),
        portalApprovalTaken: form.ringiApprovalTaken,
        portalNumber: form.ringiApprovalTaken === "yes" ? form.ringiNumber.trim() : "",
        files: uploadedFiles,
      })
      await generateSimilarRequestsFromCreateResult(result)

      onShowToast?.("success", result?.details ?? "Gift declaration submitted successfully!")
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to submit gift declaration", error)
      onShowToast?.("error", error?.message ?? "Failed to submit gift declaration. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSubmitDisabled =
    isSubmitting ||
    !form.title.trim() ||
    !form.description.trim() ||
    !form.fromToPerson.trim() ||
    !form.fromToOrganization.trim() ||
    !form.approxValueInr.trim() ||
    (form.ringiApprovalTaken === "yes" && !form.ringiNumber.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl w-full max-h-[95vh] bg-white flex flex-col overflow-hidden"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Gift Declaration</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">
              Title (max. {MAX_TITLE_WORDS} words)
            </label>
            <Input
              value={form.title}
              onChange={(e) =>
                updateField("title", clampToMaxWords(e.target.value, MAX_TITLE_WORDS))
              }
              placeholder="Type here..."
              className={`bg-white ${errors.title ? "border-red-500" : ""}`}
            />
            {errors.title ? <p className="text-xs text-red-600 mt-1">{errors.title}</p> : null}
            <div className="text-xs text-slate-500">
              {countWords(form.title)} / {MAX_TITLE_WORDS} words
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">
              Description (max. {MAX_DESCRIPTION_WORDS} words)
            </label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                updateField(
                  "description",
                  clampToMaxWords(e.target.value, MAX_DESCRIPTION_WORDS),
                )
              }
              placeholder="Type here..."
              rows={5}
              className={`min-h-0 resize-none bg-white focus-visible:outline-none ${
                errors.description ? "border-red-500" : ""
              }`}
            />
            {errors.description ? (
              <p className="text-xs text-red-600 mt-1">{errors.description}</p>
            ) : null}
            <div className="text-xs text-slate-500">
              {countWords(form.description)} / {MAX_DESCRIPTION_WORDS} words
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">Status</label>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {STATUS_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="giftStatus"
                    value={option.value}
                    checked={form.status === option.value}
                    onChange={() => updateField("status", option.value)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">From/To (Person)</label>
            <Input
              value={form.fromToPerson}
              onChange={(e) => updateField("fromToPerson", e.target.value)}
              placeholder="Type here..."
              className={`bg-white ${errors.fromToPerson ? "border-red-500" : ""}`}
            />
            {errors.fromToPerson ? (
              <p className="text-xs text-red-600 mt-1">{errors.fromToPerson}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">From/To (Organization)</label>
            <Input
              value={form.fromToOrganization}
              onChange={(e) => updateField("fromToOrganization", e.target.value)}
              placeholder="Type here..."
              className={`bg-white ${errors.fromToOrganization ? "border-red-500" : ""}`}
            />
            {errors.fromToOrganization ? (
              <p className="text-xs text-red-600 mt-1">{errors.fromToOrganization}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">Approx Value (INR)</label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.approxValueInr}
              onChange={(e) => {
                const next = e.target.value
                if (next === "" || /^\d*\.?\d*$/.test(next)) {
                  updateField("approxValueInr", next)
                }
              }}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault()
              }}
              placeholder="Type here..."
              className={`bg-white ${errors.approxValueInr ? "border-red-500" : ""}`}
            />
            {errors.approxValueInr ? (
              <p className="text-xs text-red-600 mt-1">{errors.approxValueInr}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">Ringi Approval Taken</label>
            <div className="flex items-center gap-4 pt-1">
              {[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ringiApprovalTaken"
                    value={option.value}
                    checked={form.ringiApprovalTaken === option.value}
                    onChange={() => updateField("ringiApprovalTaken", option.value)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {form.ringiApprovalTaken === "yes" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-black">Ringi Number</label>
              <Input
                value={form.ringiNumber}
                onChange={(e) => updateField("ringiNumber", e.target.value)}
                placeholder="Type here..."
                className={`bg-white ${errors.ringiNumber ? "border-red-500" : ""}`}
              />
              {errors.ringiNumber ? (
                <p className="text-xs text-red-600 mt-1">{errors.ringiNumber}</p>
              ) : null}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-black">Upload Supporting Document/s</label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive ? "border-blue-600 bg-blue-50" : "border-blue-400 bg-blue-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                accept={ALLOWED_EXTENSIONS.join(",")}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-blue-600" />
                <p className="text-sm text-slate-700">
                  Drag & Drop your files here or{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-slate-500">
                  Ringi copy, Ringi attachments, Gift photo etc.
                </p>
                <p className="text-xs text-slate-500">{ALLOWED_TYPES_HINT}</p>
                <p className="text-xs text-slate-500">{ATTACHMENT_LIMIT_HINT}</p>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                <div className="text-xs font-semibold text-slate-700">Uploaded Files:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md"
                    >
                      <span className="text-xs text-slate-700 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700 flex-shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            onClick={handleClearForm}
            disabled={isSubmitting}
            className="bg-red-100 text-red-600 hover:bg-red-200"
          >
            Clear Form
          </Button>

          <Button
            type="button"
            onClick={handleSubmitDeclaration}
            disabled={isSubmitDisabled}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? "Submitting..." : "Submit Declaration"}
          </Button>
        </div>

        {confirmClearOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <h3 className="text-[18px] font-semibold text-gray-900">Clear Form</h3>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to clear all form data?
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {statusPopup.open ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <h3 className="text-[18px] font-semibold text-red-700">{statusPopup.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{statusPopup.message}</p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setStatusPopup({ open: false, type: "error", title: "", message: "" })
                  }
                  className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
