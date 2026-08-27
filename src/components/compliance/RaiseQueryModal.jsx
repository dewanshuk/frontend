import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Upload, X } from "lucide-react"
import * as yup from "yup"
import { generateSimilarRequestsFromCreateResult, raiseComplianceQuery } from "@/api/complianceApi"

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

/** Query type radios — API values (display matches labels). */
const QUERY_TYPE_OPTIONS = [
  { value: "COBCE", label: "COBCE" },
  { value: "COI", label: "COI" },
  { value: "ComplyShield", label: "Complyshield" },
  { value: "Gift", label: "Gift" },
  { value: "R5.18", label: "R5.18" },
  { value: "Other", label: "Other" },
]

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

const validationSchema = yup.object({
  queryType: yup.string().required("Please select a query type"),
  title: yup
    .string()
    .trim()
    .required("Please enter a title")
    .test(
      "max-words",
      `Title cannot exceed ${MAX_TITLE_WORDS} words`,
      (value) => countWords(value) <= MAX_TITLE_WORDS,
    ),
  description: yup
    .string()
    .trim()
    .required("Please enter a description")
    .test(
      "max-words",
      `Description cannot exceed ${MAX_DESCRIPTION_WORDS} words`,
      (value) => countWords(value) <= MAX_DESCRIPTION_WORDS,
    ),
})

export default function RaiseQueryModal({ open, onOpenChange, onSuccess }) {
  const fileInputRef = useRef(null)
  const [queryId, setQueryId] = useState("0001")
  const [queryType, setQueryType] = useState("COBCE")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
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

  // Generate unique Query ID on mount
useEffect(() => {
    const id = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    setQueryId(id);
}, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setQueryType("COBCE")
      setTitle("")
      setDescription("")
      setUploadedFiles([])
      setDragActive(false)
      setErrors({})
      setConfirmSubmitOpen(false)
      setConfirmClearOpen(false)
      setStatusPopup({ open: false, type: "success", title: "", message: "" })
    }
      if (window.location.pathname.includes("/compliai")) {
    setQueryType("Other");
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
    setQueryId(id)
    setQueryType("COBCE")
    setTitle("")
    setDescription("")
    setUploadedFiles([])
    setErrors({})
  }

  const handleSubmitQuery = async () => {
    try {
      await validationSchema.validate(
        {
          queryType,
          title,
          description,
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
      const normalizedQueryType =
        queryType === "Others" ? "Other" : String(queryType || "").trim()
      const result = await raiseComplianceQuery({
        queryType: normalizedQueryType,
        title: title.trim(),
        description: description.trim(),
        files: uploadedFiles,
      })
      await generateSimilarRequestsFromCreateResult(result)

      setStatusPopup({
        open: true,
        type: "success",
        title: "Query submitted",
        message: result?.details ?? "Query submitted successfully!",
      })
    } catch (error) {
      console.error("Failed to submit query", error)
      setStatusPopup({
        open: true,
        type: "error",
        title: "Submission failed",
        message: error?.message ?? "Failed to submit query. Please try again.",
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
          <DialogTitle>Ask a Query</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmitQuery()
          }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-2">
          {/* Query Type */}
          <div className="mt-2 space-y-1">
            <label className="text-xs font-semibold text-black">Query Type</label>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
              {QUERY_TYPE_OPTIONS.map((type) => (
                <label
                  key={type.value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="queryType"
                    value={type.value}
                    checked={queryType === type.value}
                    onChange={(e) => {
                      setQueryType(e.target.value)
                      if (errors.queryType) {
                        setErrors((prev) => ({ ...prev, queryType: "" }))
                      }
                    }}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{type.label}</span>
                </label>
              ))}
            </div>
            {errors.queryType ? (
              <p className="mt-1 text-xs text-red-600">{errors.queryType}</p>
            ) : null}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">
              Title (max. {MAX_TITLE_WORDS} words)
            </label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(clampToMaxWords(e.target.value, MAX_TITLE_WORDS))
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: "" }))
                }
              }}
              placeholder="Type here..."
              className={`bg-white ${errors.title ? "border-red-500" : ""}`}
            />
            {errors.title ? <p className="text-xs text-red-600 mt-1">{errors.title}</p> : null}
            <div className="text-xs text-slate-500">
              {countWords(title)} / {MAX_TITLE_WORDS} words
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-black">
              Description (max. {MAX_DESCRIPTION_WORDS} words)
            </label>
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(clampToMaxWords(e.target.value, MAX_DESCRIPTION_WORDS))
                if (errors.description) {
                  setErrors((prev) => ({ ...prev, description: "" }))
                }
              }}
              placeholder="Type here..."
              rows={5}
              className={`min-h-0 resize-none bg-white focus-visible:outline-none ${
                errors.description ? "border-red-500" : ""
              }`}
            />
            {errors.description ? <p className="text-xs text-red-600 mt-1">{errors.description}</p> : null}
            <div className="text-xs text-slate-500">
              {countWords(description)} / {MAX_DESCRIPTION_WORDS} words
            </div>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-black">Upload Supporting Document/s</label>
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

        {/* Footer Actions */}
        <div className="mt-6 flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <Button
            type="button"
            onClick={handleClearForm}
            disabled={isSubmitting}
            className="bg-red-100 text-red-600 hover:bg-red-200"
          >
            Clear Form
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? "Submitting..." : "Submit Query"}
          </Button>
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
                Are you sure you want to submit this query?
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
