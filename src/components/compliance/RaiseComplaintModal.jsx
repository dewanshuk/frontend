import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"
import * as yup from "yup"
import { generateSimilarRequestsFromCreateResult, raiseComplianceComplaint } from "@/api/complianceApi"

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

const MAX_WORDS = 500
const validationSchema = yup.object({
  complaintType: yup.string().required("Please select a complaint type"),
  complaintDetails: yup
    .string()
    .trim()
    .required("Please enter complaint details")
    .test(
      "max-words",
      `Complaint details cannot exceed ${MAX_WORDS} words`,
      (value) => {
        const count = String(value || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
        return count <= MAX_WORDS
      },
    ),
})

export default function RaiseComplaintModal({ open, onOpenChange, onSuccess }) {
  const fileInputRef = useRef(null)
  const [complaintId, setComplaintId] = useState("0001")
  const [complaintType, setComplaintType] = useState("COBCE")
  const [complaintDetails, setComplaintDetails] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
  })

  // Generate unique Complaint ID on mount
  useEffect(() => {
    const id = String(Math.floor(Math.random() * 10000)).padStart(4, "0")
    setComplaintId(id)
  }, [])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setComplaintType("COBCE")
      setComplaintDetails("")
      setUploadedFiles([])
      setDragActive(false)
      setErrors({})
      setConfirmSubmitOpen(false)
      setConfirmClearOpen(false)
      setStatusPopup({ open: false, type: "success", title: "", message: "" })
    }
  }, [open])

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

    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClearForm = () => {
    setConfirmClearOpen(true)
  }

  const handleConfirmClear = () => {
    setConfirmClearOpen(false)
    const id = String(Math.floor(Math.random() * 10000)).padStart(4, "0")
    setComplaintId(id)
    setComplaintType("COBCE")
    setComplaintDetails("")
    setUploadedFiles([])
    setErrors({})
  }

  const countWords = (text) => {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length
  }

  const handleDetailsChange = (value) => {
    const words = value.trim().split(/\s+/).filter(Boolean)
    if (words.length <= MAX_WORDS) {
      setComplaintDetails(value)
      if (errors.complaintDetails) {
        setErrors((prev) => ({ ...prev, complaintDetails: "" }))
      }
    } else {
      // trim to MAX_WORDS words
      setComplaintDetails(words.slice(0, MAX_WORDS).join(" "))
    }
  }

  const handleSubmitComplaint = async () => {
    try {
      await validationSchema.validate(
        {
          complaintType,
          complaintDetails,
        },
        { abortEarly: false },
      )
      setErrors({})
    } catch (validationError) {
      if (validationError instanceof yup.ValidationError) {
        const nextErrors = {}
        validationError.inner.forEach((error) => {
          if (!error.path || nextErrors[error.path]) return
          nextErrors[error.path] = error.message
        })
        setErrors(nextErrors)
        return
      }
    }

    setConfirmSubmitOpen(true)
  }

  const handleConfirmSubmission = async () => {
    setConfirmSubmitOpen(false)
    setIsSubmitting(true)
    try {
      const normalizedType = complaintType === "Others" ? "Other" : complaintType
      const result = await raiseComplianceComplaint({
        complaintType: normalizedType,
        complaintDetails: complaintDetails.trim(),
        files: uploadedFiles,
      })
      await generateSimilarRequestsFromCreateResult(result)

      setStatusPopup({
        open: true,
        type: "success",
        title: "Complaint submitted",
        message: result?.details ?? "Complaint submitted successfully!",
      })
    } catch (error) {
      console.error("Failed to submit complaint", error)
      setStatusPopup({
        open: true,
        type: "error",
        title: "Submission failed",
        message: error?.message ?? "Failed to submit complaint. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeStatusPopup = () => {
    const shouldCloseModal = statusPopup.type === "success"
    setStatusPopup({ open: false, type: "success", title: "", message: "" })
    if (shouldCloseModal) {
      onSuccess?.()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden bg-white"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Raise a Complaint</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmitComplaint()
          }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-2">
          {/* Complaint ID and Complaint Type in one row */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* Complaint Type Radio Buttons */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-black">Complaints Type</label>
              <div className="flex items-center gap-4 pt-1">
                {["COBCE", "COI", "Others"].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="complaintType"
                      value={type}
                      checked={complaintType === type}
                      onChange={(e) => {
                        setComplaintType(e.target.value)
                        if (errors.complaintType) {
                          setErrors((prev) => ({ ...prev, complaintType: "" }))
                        }
                      }}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-700">{type}</span>
                  </label>
                ))}
              </div>
              {errors.complaintType ? (
                <p className="text-xs text-red-600 mt-1">{errors.complaintType}</p>
              ) : null}
            </div>
          </div>

          {/* Complaint Details */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">Complaint Details (max. 500 words)</label>
            <textarea
              value={complaintDetails}
              onChange={(e) => handleDetailsChange(e.target.value)}
              placeholder="Type here..."
              rows={6}
              className={`w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-0 focus:border-slate-300 ${
                errors.complaintDetails ? "border-red-500" : "border-slate-300"
              }`}
            />
            {errors.complaintDetails ? (
              <p className="text-xs text-red-600 mt-1">{errors.complaintDetails}</p>
            ) : null}
            <div className="text-xs text-slate-500">{countWords(complaintDetails)} / {MAX_WORDS} words</div>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-black">Upload Supporting Evidence</label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              role="button"
              tabIndex={0}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? "border-blue-600 bg-blue-50" : "border-blue-400 bg-blue-50"}`}
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
                <p className="text-xs text-slate-500">{ALLOWED_TYPES_HINT}</p>
                <p className="text-xs text-slate-500">{ATTACHMENT_LIMIT_HINT}</p>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                <div className="text-xs font-semibold text-slate-700">Uploaded Files:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
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

        {/* Footer Actions */}
        <div className="mt-6 flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <Button type="button" onClick={handleClearForm} disabled={isSubmitting} className="bg-red-100 text-red-600 hover:bg-red-200">Clear Form</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">{isSubmitting ? "Submitting..." : "Submit Complaint"}</Button>
        </div>
        </form>

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

        {confirmSubmitOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <h3 className="text-[18px] font-semibold text-gray-900">Submission Confirmation</h3>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to submit this complaint?
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmission}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {statusPopup.open ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <h3
                className={`text-[18px] font-semibold ${
                  statusPopup.type === "error" ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {statusPopup.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{statusPopup.message}</p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={closeStatusPopup}
                  className={`rounded-md px-4 py-2 text-sm text-white ${
                    statusPopup.type === "error"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
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
