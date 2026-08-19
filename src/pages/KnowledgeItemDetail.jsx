import { useState, useEffect, useLayoutEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { MetadataSection } from "@/components/knowledgeHub/MetadataSection"
import { FileViewer } from "@/components/knowledgeHub/FileViewer"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { getKnowledgeItemDetail as getKnowledgeItemDetailApi, getDocumentHubDetail } from "@/api/hubApi"
import {
  getKnowledgeHubBasePath,
  isLandingKnowledgeHubPath,
} from "@/lib/appNavigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/shared/Tooltip"

const HEADING_MAX_CHARS = 80
const BREADCRUMB_MAX_CHARS = 40

function TruncatedText({
  text,
  maxChars,
  className,
  style,
  as: Comp = "span",
  tooltipSide = "bottom",
}) {
  const full = String(text ?? "")
  const needsTruncate = full.length > maxChars
  const display = needsTruncate ? `${full.slice(0, maxChars).trimEnd()}...` : full

  if (!needsTruncate) {
    return (
      <Comp className={className} style={style}>
        {display}
      </Comp>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Comp className={cn("cursor-default", className)} style={style}>
            {display}
          </Comp>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-md break-words">
          {full}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const MIME_BY_EXTENSION = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pps: "application/vnd.ms-powerpoint",
  ppsx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
}

const guessMimeType = (fileName = "", fileType = "") => {
  const normalizedFileType = String(fileType).toUpperCase()
  if (normalizedFileType === "IMAGE") return "image/jpeg"
  if (normalizedFileType === "PRESENTATION" || normalizedFileType === "PPT") {
    const extension = String(fileName).split(".").pop()?.toLowerCase()
    if (extension === "ppt") return "application/vnd.ms-powerpoint"
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  }

  const extension = String(fileName).split(".").pop()?.toLowerCase()
  if (extension && MIME_BY_EXTENSION[extension]) {
    return MIME_BY_EXTENSION[extension]
  }

  return "application/octet-stream"
}

const toDisplayDocumentType = (rawType) => {
  const s = String(rawType ?? "").trim()
  if (!s) return s
  if (s.toLowerCase().includes("training")) return "Training Resources"
  if (s.toLowerCase().includes("regulation") || s.toLowerCase().includes("law")) return "Law & Regulation"
  return s
}

const mapApiItemToViewModel = (apiItem) => {
  const linkedItems = Array.isArray(apiItem?.linked_document_details)
    ? apiItem.linked_document_details.map((linked) => ({
        id: linked.id,
        heading: linked.name,
        type: toDisplayDocumentType(linked.document_type),
        routeType: linked.document_type,
      }))
    : []

  const downloadAllowed = apiItem?.download_allowed === true
  const documents = Array.isArray(apiItem?.files)
    ? apiItem.files.map((file) => ({
        id: file.id,
        name: file.name,
        type: guessMimeType(file.name, file.file_type),
        url: file.file_url,
        downloadAllowed,
      }))
    : []

  return {
    id: apiItem?.id,
    name: apiItem?.name ?? "Untitled",
    type: toDisplayDocumentType(apiItem?.document_type ?? "N/A"),
    routeType: apiItem?.document_type ?? "N/A",
    owner: apiItem?.owner ?? apiItem?.applicability_type ?? "N/A",
    legislation: apiItem?.legislation_name ?? apiItem?.legislation_id ?? "N/A",
    subLegislation: apiItem?.sub_legislation_name ?? apiItem?.sub_legislation_id ?? "N/A",
    description: apiItem?.summary ?? "",
    linkedItems,
    version:
      typeof apiItem?.version === "string"
        ? apiItem.version
        : apiItem?.current_media_version != null
        ? `v${apiItem.current_media_version}.${apiItem?.current_revision_number ?? 0}`
        : "N/A",
    uploadedBy: apiItem?.created_by ?? "N/A",
    uploadedOn: apiItem?.created_at ?? "N/A",
    downloadAllowed,
    tags: Array.isArray(apiItem?.tags) ? apiItem.tags : [],
    documents,
  }
}

export default function KnowledgeItemDetail({ variant = "default" }) {
  const { type, uuid } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isLanding = variant === "landing" || isLandingKnowledgeHubPath(location.pathname)
  const hubBase = getKnowledgeHubBasePath({ landing: isLanding })
  const [item, setItem] = useState(null)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [isMetadataCollapsed, setIsMetadataCollapsed] = useState(() => {
    const fromParam = type ? String(decodeURIComponent(type)).toLowerCase() : ""
    return fromParam.includes("flyer")
  })
  const [errorMessage, setErrorMessage] = useState("")

  const isFlyerType = (() => {
    const fromParam = type ? String(decodeURIComponent(type)).toLowerCase() : ""
    const fromItem = String(item?.type ?? "").toLowerCase()
    return fromParam.includes("flyer") || fromItem.includes("flyer")
  })()

  useEffect(() => {
    setIsMetadataCollapsed(isFlyerType)
  }, [uuid, isFlyerType])

  useEffect(() => {
    const loadItemDetail = async () => {
      console.log("uuid", uuid);
      if (!uuid) return

      try {
        setErrorMessage("")
        // Reset selected document before loading new item to ensure clean state
        setSelectedDocument(null)
        const [detailResponse, hubResponse] = await Promise.all([
          getKnowledgeItemDetailApi(uuid, "document"),
          getDocumentHubDetail(uuid),
        ])
        const mappedItem = mapApiItemToViewModel(detailResponse?.data ?? hubResponse?.data)
        setItem(mappedItem)
        if (mappedItem.documents.length > 0) {
          setSelectedDocument(mappedItem.documents[0].id)
        } else {
          setSelectedDocument(null)
        }
      } catch (error) {
        setItem(null)
        setSelectedDocument(null)
        setErrorMessage(error?.message || "Failed to load knowledge item.")
      }
    }

    loadItemDetail()
  }, [uuid]);

  useLayoutEffect(() => {
    if (typeof document !== "undefined") {
      const scrollContainer = document.querySelector("main") || document.scrollingElement || document.body
      if (typeof scrollContainer.scrollTo === "function") {
        scrollContainer.scrollTo({ top: 0, left: 0, behavior: "auto" })
      } else if (typeof scrollContainer.scrollTop !== "undefined") {
        scrollContainer.scrollTop = 0
      }
    }
  }, [uuid, type, location.pathname])

  if (!item) {
    return (
      <div className="min-h-full w-full max-w-full min-w-0 bg-[var(--sds-bg-subtle)] p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">{errorMessage || "Loading knowledge item..."}</p>
          <p className="text-xs text-muted-foreground">Type: {type}, ID: {uuid}</p>
        </div>
      </div>
    )
  }

  const decodedType = type ? toDisplayDocumentType(decodeURIComponent(type)) : null
  const categoryLabel = decodedType || ""
  const breadcrumbTrail = location.state?.breadcrumbTrail ?? []
  const knowledgeHubPath = location.state?.returnToHubPath ?? hubBase
  const categoryPath = type
    ? `${hubBase}?type=${encodeURIComponent(toDisplayDocumentType(decodeURIComponent(type)))}`
    : knowledgeHubPath
  const fallbackHubPath = type
    ? `${hubBase}?type=${encodeURIComponent(toDisplayDocumentType(decodeURIComponent(type)))}`
    : hubBase
  const returnHubPath = location.state?.returnToHubPath ?? fallbackHubPath

  const handleBack = () => {
    if (breadcrumbTrail.length > 0) {
      const parentCrumb = breadcrumbTrail[breadcrumbTrail.length - 1]
      navigate(parentCrumb.path, {
        replace: true,
        state: {
          breadcrumbTrail: breadcrumbTrail.slice(0, -1),
          returnToHubPath: location.state?.returnToHubPath,
        },
      })
      return
    }

    if (location.state?.returnToHubPath) {
      navigate(location.state.returnToHubPath, { replace: true })
      return
    }

    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(returnHubPath, { replace: true })
  }

  const handleBreadcrumbNavigate = (path, nextTrail = []) => {
    navigate(path, {
      replace: true,
      state: {
        breadcrumbTrail: nextTrail,
        returnToHubPath: location.state?.returnToHubPath,
      },
    })
  }

  return (
    <div className="min-h-full w-full max-w-full min-w-0 bg-[var(--sds-bg-subtle)]">
      <div
        className="border-b backdrop-blur sticky z-30 bg-[var(--sds-bg-subtle)]"
      >
        <div className="w-full max-w-full min-w-0 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-3 min-w-0 max-w-full">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--sds-text-tertiary)] min-w-0">
              <button
                type="button"
                onClick={() => navigate(knowledgeHubPath, { replace: true })}
                className="shrink-0 text-[var(--sds-text-tertiary)] hover:text-[var(--sds-text-default)]"
              >
                Knowledge Hub
              </button>
              <span className="shrink-0">{`>`}</span>
              {type ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbNavigate(categoryPath, [])}
                    className="shrink-0 text-[var(--sds-text-tertiary)] hover:text-[var(--sds-text-default)]"
                  >
                    {categoryLabel}
                  </button>
                  <span className="shrink-0">{`>`}</span>
                </>
              ) : null}
              {breadcrumbTrail.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbNavigate(crumb.path, breadcrumbTrail.slice(0, index))}
                    className="min-w-0 text-[var(--sds-text-tertiary)] hover:text-[var(--sds-text-default)]"
                  >
                    <TruncatedText text={crumb.label} maxChars={BREADCRUMB_MAX_CHARS} />
                  </button>
                  <span className="shrink-0">{`>`}</span>
                </span>
              ))}
              <TruncatedText
                text={item.name}
                maxChars={BREADCRUMB_MAX_CHARS}
                className="min-w-0 font-medium text-[var(--sds-text-default)]"
              />
            </div>
            <div className="flex items-center gap-4 min-w-0 max-w-full">
              <Button
                variant="link"
                onClick={handleBack}
                aria-label="Go back"
                className="flex items-center gap-1 shrink-0 bg-blue-300 no-underline rounded-md px-2 py-1 m-0 h-auto transition-colors duration-150 hover:bg-blue-500 hover:text-white hover:no-underline"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Back</span>
              </Button>
              <TruncatedText
                text={item.name}
                maxChars={HEADING_MAX_CHARS}
                as="h1"
                className="text-2xl font-semibold min-w-0"
                style={{ color: "var(--sds-text-default)" }}
              />
            </div>
          </div>
            
          </div>
        </div>
      </div>

      <div className="w-full max-w-full min-w-0 px-6 py-6 pb-8 flex-1 bg-[var(--sds-bg-subtle)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Side - Metadata Section
              h-0 min-h-full keeps this column from growing the row; it matches FileViewer height. */}
          <div className={cn(
            "col-span-1 flex min-h-0 transition-all duration-300 lg:h-0 lg:min-h-full",
            isMetadataCollapsed ? "lg:col-span-1 lg:max-w-12" : "lg:col-span-4"
          )}>
            <MetadataSection 
              item={item} 
              onCollapseChange={setIsMetadataCollapsed}
              breadcrumbTrail={breadcrumbTrail}
              defaultCollapsed={isFlyerType}
            />
          </div>

          {/* Right Side - File Viewer */}
          <div className={cn(
            "col-span-1 flex min-h-0 min-w-0 transition-all duration-300",
            isMetadataCollapsed ? "lg:col-span-11" : "lg:col-span-8"
          )}>
            <FileViewer
              documents={item.documents}
              selectedDocument={selectedDocument}
              onSelectDocument={setSelectedDocument}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
