import { useState } from "react"
import { Link2 } from "lucide-react"
import { openComplianceFileDownload } from "@/api/complianceApi"

export const getComplianceFileLabel = (file, index = 0) => {
  if (!file) return `Uploaded File ${index + 1}`
  if (typeof file === "string") {
    const parts = file.split(/[/\\]/)
    return parts[parts.length - 1] || `Uploaded File ${index + 1}`
  }
  return (
    file.name ||
    file.fileName ||
    file.filename ||
    file.originalName ||
    file.original_name ||
    `Uploaded File ${index + 1}`
  )
}

export const getComplianceFilePath = (file) => {
  if (!file) return ""
  if (typeof file === "string") return file.trim()
  return String(
    file.path ||
      file.filePath ||
      file.file_path ||
      file.blobPath ||
      file.blob_path ||
      file.storagePath ||
      file.storage_path ||
      file.fileUrl ||
      file.file_url ||
      file.url ||
      file.href ||
      "",
  ).trim()
}

/**
 * Renders conversation attachment chips and downloads via
 * GET /api/compliance/querys/files?path=...
 * Never navigates in-app (avoids blank SPA shell pages from relative paths).
 */
export default function ComplianceAttachmentChips({ files, onError }) {
  const [downloadingKey, setDownloadingKey] = useState("")

  if (!Array.isArray(files) || files.length === 0) return null

  const handleDownload = async (event, file, fileIndex) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()

    const path = getComplianceFilePath(file)
    if (!path) {
      onError?.("File path is missing.")
      return
    }

    // In-app relative paths open the SPA shell — treat as storage keys only for API.
    // Absolute http(s) / blob URLs are still handled inside openComplianceFileDownload.
    const key = `${path}-${fileIndex}`
    if (downloadingKey) return

    setDownloadingKey(key)
    try {
      await openComplianceFileDownload(path)
    } catch (error) {
      console.error(error)
      onError?.(error?.message || "Unable to download file. Please try again.")
    } finally {
      setDownloadingKey("")
    }
  }

  return (
    <div>
      <div className="font-semibold">Attachment:</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {files.map((file, fileIndex) => {
          const label = getComplianceFileLabel(file, fileIndex)
          const path = getComplianceFilePath(file)
          const key = `${path || label}-${fileIndex}`
          const isDownloading = downloadingKey === key
          const chipClass =
            "inline-flex items-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs text-black hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"

          return (
            <button
              key={key}
              type="button"
              onClick={(event) => handleDownload(event, file, fileIndex)}
              disabled={!path || Boolean(downloadingKey)}
              className={chipClass}
              title={path || label}
            >
              {isDownloading ? "Downloading..." : label}
              <Link2 className="h-3.5 w-3.5 text-blue-600" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
