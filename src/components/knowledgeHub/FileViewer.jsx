import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileImage, Presentation, Download, FileText, FileSpreadsheet, File, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import useUI from "@/hooks/useUI"
import * as XLSX from "xlsx"
import * as UTIF from "utif"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import "./pdfTextLayer.css"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

const SUPPORTED_TYPES = {
  "image/png": { icon: FileImage, label: "PNG" },
  "image/jpeg": { icon: FileImage, label: "JPEG" },
  "image/jpg": { icon: FileImage, label: "JPG" },
  "image/gif": { icon: FileImage, label: "GIF" },
  "image/bmp": { icon: FileImage, label: "BMP" },
  "image/tiff": { icon: FileImage, label: "TIFF" },
  "image/webp": { icon: FileImage, label: "WEBP" },
  "application/pdf": { icon: FileText, label: "PDF" },
  "application/msword": { icon: FileText, label: "DOC" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { icon: FileText, label: "DOCX" },
  "application/vnd.ms-excel": { icon: FileSpreadsheet, label: "XLS" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { icon: FileSpreadsheet, label: "XLSX" },
  "application/vnd.ms-powerpoint": { icon: Presentation, label: "PPT" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { icon: Presentation, label: "PPTX" },
}

const isImageType = (type) => {
  return type.startsWith("image/")
}

const isTIFFType = (type) => {
  return type === "image/tiff" || type === "image/tif"
}

const isPDFType = (type) => {
  return type === "application/pdf"
}

const buildPdfViewerSrc = (url, canDownload) => {
  if (canDownload) {
    return `${url}#page=1&toolbar=1&navpanes=1&scrollbar=1`
  }

  // Hide toolbar and navpanes when downloads not allowed
  return `${url}#page=1&toolbar=0&navpanes=0&scrollbar=1`
}

const blockContextMenu = (event) => {
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Browser PDF viewers run inside an iframe, so the app-wide `contextmenu` listener
 * in main.jsx does not see right-clicks on the PDF. Try attaching inside the frame
 * when same-origin; otherwise FileViewer uses a pass-through overlay.
 */
const attachContextMenuGuardToIframe = (iframe) => {
  if (!iframe) return () => {}

  const handler = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const tryAttach = () => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) return false
      doc.addEventListener("contextmenu", handler, true)
      doc.body?.addEventListener("contextmenu", handler, true)
      doc.querySelectorAll("embed, object, iframe").forEach((node) => {
        node.addEventListener("contextmenu", handler, true)
      })
      return true
    } catch {
      return false
    }
  }

  if (tryAttach()) {
    return () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        doc?.removeEventListener("contextmenu", handler, true)
        doc?.body?.removeEventListener("contextmenu", handler, true)
      } catch {
        // ignore cross-origin teardown
      }
    }
  }

  let attempts = 0
  const intervalId = window.setInterval(() => {
    attempts += 1
    if (tryAttach() || attempts >= 12) {
      window.clearInterval(intervalId)
    }
  }, 250)

  return () => window.clearInterval(intervalId)
}

/**
 * Office PPT embed is cross-origin; a full-area click-through shield steals
 * mousedown from prev/next controls. Cover only the slide canvas and leave the
 * bottom chrome + side gutters free so navigation keeps working.
 */
function PresentationContextMenuShield() {
  return (
    <div
      aria-hidden
      className="absolute bottom-16 left-14 right-14 top-0 z-10"
      onContextMenu={blockContextMenu}
      onMouseDown={(event) => {
        if (event.button === 2) {
          blockContextMenu(event)
        }
      }}
    />
  )
}

const PDF_MAX_SCALE = 1.5
const PDF_CONTAINER_PADDING = 32 // matches the p-4 on the scroll container
// Canvases are kept only for pages near the viewport. Eagerly rasterising every
// page of a long PDF exhausts the browser canvas memory budget, after which
// Chrome silently blanks or refuses further canvases (pages appear missing).
const PDF_MAX_LIVE_CANVASES = 8

/**
 * Renders PDF pages with pdf.js so we own scrolling and can block right-click.
 * Browser PDF iframes cannot do both: an overlay blocks scroll, and without an
 * overlay right-click reaches the plugin.
 *
 * Every page gets a correctly sized placeholder up front, so scroll height and
 * page count are complete immediately; pixels are rasterised lazily as pages
 * approach the viewport and released once they scroll far away.
 */
function ProtectedPdfCanvas({ url, className, onLoad, onError }) {
  const containerRef = useRef(null)
  const onLoadRef = useRef(onLoad)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onLoadRef.current = onLoad
    onErrorRef.current = onError
  }, [onLoad, onError])

  useEffect(() => {
    if (!url) return undefined

    let cancelled = false
    let loadingTask = null
    let pdfDocument = null
    let observer = null
    let scale = 1
    const pages = new Map() // pageNumber -> page state
    const renderedOrder = []

    const releasePage = (pageNumber) => {
      const state = pages.get(pageNumber)
      if (!state?.rendered) return
      // Zeroing the dimensions drops the backing store immediately instead of
      // waiting on GC, which is what keeps long documents within budget.
      if (state.canvas) {
        state.canvas.width = 0
        state.canvas.height = 0
      }
      state.canvas = null
      state.textLayer?.cancel()
      state.textLayer = null
      state.rendered = false
      state.element.replaceChildren()
    }

    const trimLiveCanvases = (keepPageNumber) => {
      while (renderedOrder.length > PDF_MAX_LIVE_CANVASES) {
        const candidateIndex = renderedOrder.findIndex((pageNumber) => pageNumber !== keepPageNumber)
        if (candidateIndex === -1) return
        const [pageNumber] = renderedOrder.splice(candidateIndex, 1)
        releasePage(pageNumber)
      }
    }

    const renderPage = async (pageNumber) => {
      const state = pages.get(pageNumber)
      if (!state || cancelled || state.rendered || state.rendering) return
      state.rendering = true

      try {
        const page = await pdfDocument.getPage(pageNumber)
        if (cancelled) return

        const viewport = page.getViewport({ scale: state.scale })
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        const canvas = document.createElement("canvas")
        canvas.width = Math.floor(viewport.width * ratio)
        canvas.height = Math.floor(viewport.height * ratio)
        canvas.className = "block h-full w-full"
        canvas.style.backgroundColor = "#ffffff"

        const context = canvas.getContext("2d", { alpha: false })
        state.task = page.render({
          canvasContext: context,
          canvas,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        })
        await state.task.promise
        if (cancelled) {
          canvas.width = 0
          canvas.height = 0
          return
        }

        state.element.replaceChildren(canvas)
        state.canvas = canvas
        state.rendered = true
        renderedOrder.push(pageNumber)
        trimLiveCanvases(pageNumber)

        // Invisible text layer over the canvas raster so the browser's native
        // find-in-page (Ctrl+F) can locate and select text on the page.
        try {
          const textLayerDiv = document.createElement("div")
          textLayerDiv.className = "textLayer"
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: page.streamTextContent(),
            container: textLayerDiv,
            viewport,
          })
          state.textLayer = textLayer
          state.element.appendChild(textLayerDiv)
          await textLayer.render()
        } catch (textErr) {
          if (textErr?.name !== "AbortException") {
            console.error(`PDF page ${pageNumber} text layer failed:`, textErr)
          }
        }
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Protected PDF page ${pageNumber} render failed:`, err)
        }
      } finally {
        state.task = null
        state.rendering = false
      }
    }

    const createPlaceholder = (pageNumber, viewport) => {
      const element = document.createElement("div")
      element.className = "relative mx-auto mb-3 bg-white shadow"
      element.style.width = `${Math.round(viewport.width)}px`
      element.style.height = `${Math.round(viewport.height)}px`
      element.dataset.pdfPage = String(pageNumber)
      pages.set(pageNumber, {
        element,
        scale,
        canvas: null,
        task: null,
        textLayer: null,
        rendered: false,
        rendering: false,
      })
      return element
    }

    const renderPdf = async () => {
      const container = containerRef.current
      if (!container) return

      container.replaceChildren()

      try {
        loadingTask = pdfjsLib.getDocument({ url, withCredentials: false })
        pdfDocument = await loadingTask.promise
        if (cancelled) return

        const availableWidth = Math.max((container.clientWidth || 832) - PDF_CONTAINER_PADDING, 240)
        const firstPage = await pdfDocument.getPage(1)
        if (cancelled) return

        const unscaled = firstPage.getViewport({ scale: 1 })
        scale = Math.min(PDF_MAX_SCALE, availableWidth / unscaled.width)

        // Show page 1 straight away, then lay out the rest.
        container.appendChild(createPlaceholder(1, firstPage.getViewport({ scale })))
        await renderPage(1)
        if (cancelled) return
        onLoadRef.current?.()

        for (let pageNumber = 2; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber)
          if (cancelled) return
          container.appendChild(createPlaceholder(pageNumber, page.getViewport({ scale })))
        }

        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const pageNumber = Number(entry.target.dataset.pdfPage)
              if (!pageNumber) return
              if (entry.isIntersecting) {
                renderPage(pageNumber)
              }
            })
          },
          { root: container, rootMargin: "150% 0px" },
        )
        pages.forEach((state) => observer.observe(state.element))
      } catch (err) {
        console.error("Protected PDF render failed:", err)
        if (!cancelled) {
          onErrorRef.current?.()
        }
      }
    }

    renderPdf()

    return () => {
      cancelled = true
      observer?.disconnect()
      pages.forEach((state) => {
        state.task?.cancel?.()
        state.textLayer?.cancel()
        if (state.canvas) {
          state.canvas.width = 0
          state.canvas.height = 0
        }
      })
      pages.clear()
      renderedOrder.length = 0
      // Destroying the loading task tears down the document and its worker port.
      loadingTask?.destroy?.()
    }
  }, [url])

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto bg-[#2a2a2a] p-4", className)}
      onContextMenu={blockContextMenu}
    />
  )
}

const isWordType = (type) => {
  return type === "application/msword" || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

const isExcelType = (type) => {
  return type === "application/vnd.ms-excel" || type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

const isPresentationType = (type, fileName = "") => {
  if (type?.includes("presentation") || type?.includes("powerpoint")) return true
  const extension = String(fileName).split(".").pop()?.toLowerCase()
  return extension === "ppt" || extension === "pptx" || extension === "pps" || extension === "ppsx"
}

// Helper to check if URL is a local file (not publicly accessible)
const isLocalFile = (url) => {
  if (!url) return false
  // Check if it's a relative path or localhost
  return url.startsWith('/') || url.startsWith('./') || url.includes('localhost') || url.includes('127.0.0.1')
}

// Helper to get full URL for local files
const getFullUrl = (url) => {
  if (isLocalFile(url) && url.startsWith('/')) {
    // For local files, use the current origin
    return `${window.location.origin}${url}`
  }
  return url
}

// Helper to get Office Online viewer URL (for Word, Excel, PowerPoint)
const getOfficeViewerUrl = (url, canDownload = true) => {
  const fullUrl = getFullUrl(url)
  const encodedUrl = encodeURIComponent(fullUrl)
  const baseUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`

  if (canDownload) {
    return baseUrl
  }

  // Best-effort view-only flags for Office embed (no official PPT equivalent to PDF toolbar=0).
  return `${baseUrl}&wdPrint=0&wdDownloadButton=False&wdHideHeaders=True`
}

// Helper to get Google Docs viewer URL (fallback for documents)
const getGoogleDocsViewerUrl = (url) => {
  const fullUrl = getFullUrl(url)
  const encodedUrl = encodeURIComponent(fullUrl)
  return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`
}

export function FileViewer({ documents, selectedDocument, onSelectDocument }) {
  const currentDocument = documents.find((doc) => doc.id === selectedDocument)
  const [imageZoom, setImageZoom] = useState(1)
  const [imageError, setImageError] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [excelData, setExcelData] = useState(null)
  const [excelError, setExcelError] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [tiffImageUrl, setTiffImageUrl] = useState(null)
  const [tiffError, setTiffError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfCanvasFailed, setPdfCanvasFailed] = useState(false)
  const iframeRef = useRef(null)
  const iframeContextMenuCleanupRef = useRef(null)
  const timeoutRef = useRef(null)
  const viewerContainerRef = useRef(null)
  const { error, Toast } = useUI()

  useEffect(
    () => () => {
      iframeContextMenuCleanupRef.current?.()
      iframeContextMenuCleanupRef.current = null
    },
    [],
  )

  const handleIframeLoad = () => {
    setIsLoading(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    iframeContextMenuCleanupRef.current?.()
    iframeContextMenuCleanupRef.current = attachContextMenuGuardToIframe(iframeRef.current)
  }

  useEffect(() => {
    if (imageError || tiffError) {
      error("This item is unavailable")
    }
  }, [imageError, tiffError, error])

  useEffect(() => {
    setPdfCanvasFailed(false)
  }, [currentDocument?.id, currentDocument?.url])

  const handleDocumentSelect = (docId) => {
    // Single selection - just set the selected document
    onSelectDocument(docId)
    setImageZoom(1) // Reset zoom when switching documents
    setImageError(false) // Reset error state
    setIframeError(false) // Reset iframe error state
    setPdfCanvasFailed(false)
    setIsLoading(true) // Reset loading state
    setExcelData(null) // Reset Excel data
    setExcelError(false) // Reset Excel error
    setPreviewUrl(null) // Reset preview URL
    setTiffImageUrl(null) // Reset TIFF image
    setTiffError(false) // Reset TIFF error
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  // For local image/PDF files that force browser download, fetch as blob and preview via object URL.
  // For remote signed URLs (for example Azure Blob SAS), avoid client-side fetch to prevent CORS failures.
  useEffect(() => {
    if (!currentDocument?.url) {
      setPreviewUrl(null)
      return
    }

    const canInlinePreview = isImageType(currentDocument.type) || isPDFType(currentDocument.type)
    if (!canInlinePreview) {
      setPreviewUrl(null)
      return
    }

    const fullUrl = getFullUrl(currentDocument.url)
    if (!isLocalFile(fullUrl)) {
      setPreviewUrl(fullUrl)
      return
    }

    let objectUrl = null
    let isCancelled = false

    fetch(fullUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch preview: ${response.status}`)
        }
        return response.blob()
      })
      .then((blob) => {
        if (isCancelled) return
        objectUrl = window.URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      })
      .catch(() => {
        if (!isCancelled) {
          setPreviewUrl(null)
        }
      })

    return () => {
      isCancelled = true
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl)
      }
    }
  }, [currentDocument?.id, currentDocument?.url, currentDocument?.type])

  // Fetch and parse Excel files
  useEffect(() => {
    if (currentDocument && isExcelType(currentDocument.type) && isLocalFile(currentDocument.url)) {
      setIsLoading(true)
      setExcelError(false)
      const fullUrl = getFullUrl(currentDocument.url)
      
      fetch(fullUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch Excel file")
          }
          return response.arrayBuffer()
        })
        .then((data) => {
          try {
            const workbook = XLSX.read(data, { type: "array" })
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" })
            setExcelData({
              sheetName: firstSheetName,
              data: jsonData,
              sheetNames: workbook.SheetNames,
            })
            setIsLoading(false)
          } catch (error) {
            console.error("Error parsing Excel file:", error)
            setExcelError(true)
            setIsLoading(false)
          }
        })
        .catch((error) => {
          console.error("Error loading Excel file:", error)
          setExcelError(true)
          setIsLoading(false)
        })
    } else if (currentDocument && isExcelType(currentDocument.type) && !isLocalFile(currentDocument.url)) {
      // For non-local files, reset Excel data and use iframe viewer
      setExcelData(null)
    }
  }, [currentDocument?.id, currentDocument?.url])

  // Fetch and decode TIFF files
  useEffect(() => {
    if (currentDocument && isTIFFType(currentDocument.type)) {
      setIsLoading(true)
      setTiffError(false)
      const fullUrl = getFullUrl(currentDocument.url)
      
      fetch(fullUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch TIFF file: ${response.status} ${response.statusText}`)
          }
          return response.arrayBuffer()
        })
        .then((data) => {
          try {
            if (!data || data.byteLength === 0) {
              throw new Error("TIFF file is empty")
            }
            
            const ifds = UTIF.decode(data)
            if (!ifds || ifds.length === 0) {
              throw new Error("No image data found in TIFF file - file may be corrupted or not a valid TIFF")
            }
            
            const ifd = ifds[0]
            const width = ifd.width
            const height = ifd.height
            
            if (!width || !height || width <= 0 || height <= 0) {
              throw new Error(`Invalid TIFF dimensions: ${width}x${height}`)
            }
            
            // Decode the image data to RGBA
            UTIF.decodeImage(data, ifd)
            const rgba = UTIF.toRGBA8(ifd)
            
            if (!rgba || rgba.length === 0) {
              throw new Error("Failed to decode TIFF image data")
            }
            
            // Create canvas to render TIFF
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            
            if (!ctx) {
              throw new Error("Failed to get canvas context")
            }
            
            // Create ImageData from RGBA array
            const imageData = ctx.createImageData(width, height)
            imageData.data.set(rgba)
            ctx.putImageData(imageData, 0, 0)
            
            // Convert canvas to data URL
            const dataUrl = canvas.toDataURL('image/png')
            if (!dataUrl || dataUrl === 'data:,') {
              throw new Error("Failed to convert canvas to image")
            }
            
            setTiffImageUrl(dataUrl)
            setIsLoading(false)
          } catch (error) {
            console.error("Error decoding TIFF file:", error)
            console.error("Error details:", {
              message: error.message,
              stack: error.stack,
              fileName: currentDocument.name,
              fileUrl: fullUrl
            })
            setTiffError(true)
            setIsLoading(false)
          }
        })
        .catch((error) => {
          console.error("Error loading TIFF file:", error)
          console.error("Fetch error details:", {
            message: error.message,
            fileName: currentDocument.name,
            fileUrl: fullUrl
          })
          setTiffError(true)
          setIsLoading(false)
        })
    } else if (currentDocument && !isTIFFType(currentDocument.type)) {
      // Reset TIFF data for non-TIFF files
      setTiffImageUrl(null)
    }
  }, [currentDocument?.id, currentDocument?.url])

  // Set timeout to detect if iframe fails to load (iframes don't have reliable onError)
  useEffect(() => {
    // Skip Excel files if they're local (we handle them separately)
    const isLocalExcel = currentDocument && isExcelType(currentDocument.type) && isLocalFile(currentDocument.url)
    const isProtectedPdfCanvas =
      currentDocument &&
      isPDFType(currentDocument.type) &&
      !pdfCanvasFailed

    if (isProtectedPdfCanvas) {
      // pdf.js canvas viewer — no iframe timeout
      setIsLoading(true)
      setIframeError(false)
      return undefined
    }

    if (currentDocument && (isPDFType(currentDocument.type) || isWordType(currentDocument.type) || isPresentationType(currentDocument.type, currentDocument.name) || (isExcelType(currentDocument.type) && !isLocalExcel))) {
      setIsLoading(true)
      setIframeError(false)
      // Set a timeout - if iframe doesn't load in 10 seconds, show error
      const timeoutId = setTimeout(() => {
        setIsLoading((prevLoading) => {
          if (prevLoading) {
            setIframeError(true)
            return false
          }
          return prevLoading
        })
      }, 10000)
      timeoutRef.current = timeoutId

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    } else if (!isLocalExcel) {
      setIsLoading(false)
    }
  }, [currentDocument?.id, currentDocument?.url, currentDocument?.type, currentDocument?.downloadAllowed, pdfCanvasFailed])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const canDownload = currentDocument?.downloadAllowed === true

  const handleDownload = () => {
    if (!canDownload || !currentDocument?.url) return

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a')
    link.href = currentDocument.url
    link.download = currentDocument.name
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleZoomReset = () => {
    setImageZoom(1)
  }

  const handleFullscreen = async () => {
    const element = viewerContainerRef.current
    if (!element) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (element.requestFullscreen) {
        await element.requestFullscreen()
      }
    } catch (err) {
      console.error("Failed to toggle fullscreen:", err)
    }
  }

  const currentDocumentIndex = documents.findIndex((doc) => doc.id === selectedDocument)
  const currentFileNumber = currentDocumentIndex >= 0 ? currentDocumentIndex + 1 : 1
  const totalFiles = documents.length

  const handlePrevDocument = () => {
    if (currentDocumentIndex > 0) {
      handleDocumentSelect(documents[currentDocumentIndex - 1].id)
    }
  }

  const handleNextDocument = () => {
    if (currentDocumentIndex < documents.length - 1) {
      handleDocumentSelect(documents[currentDocumentIndex + 1].id)
    }
  }

  if (!currentDocument) {
    return (
      <Card className="p-6 rounded-[var(--sds-radius-sm)] border" style={{ borderColor: "var(--sds-border-default)", backgroundColor: "var(--sds-bg-default)" }}>
        <div className="flex items-center justify-center h-96">
          <p style={{ color: "var(--sds-text-tertiary)" }}>Select a document to view</p>
        </div>
      </Card>
    )
  }

  const fileType = SUPPORTED_TYPES[currentDocument.type] || { icon: File, label: "FILE" }
  const FileIcon = fileType.icon
  const renderUrl = previewUrl || currentDocument.url
  const isPdfDocument = isPDFType(currentDocument.type)
  const isImageDocument = isImageType(currentDocument.type)
  const showImageZoomControls =
    isImageDocument &&
    !imageError &&
    (!isTIFFType(currentDocument.type) || (!tiffError && !isLoading && Boolean(tiffImageUrl)))

  const renderImageZoomControls = () => (
    <div
      className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-md border px-2 py-1 shadow-sm"
      style={{ borderColor: "var(--sds-border-default)", backgroundColor: "var(--sds-bg-default)" }}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={handleZoomOut}
        disabled={imageZoom <= 0.5}
        className="h-8 w-8 rounded-md hover:bg-blue-100 hover:text-blue-600"
        aria-label="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="flex items-center px-2 text-sm" style={{ color: "var(--sds-text-default)" }}>
        {Math.round(imageZoom * 100)}%
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={handleZoomIn}
        disabled={imageZoom >= 3}
        className="h-8 w-8 rounded-md hover:bg-blue-100 hover:text-blue-600"
        aria-label="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      {imageZoom !== 1 ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomReset}
          className="h-8 px-3 rounded-md hover:bg-blue-100 hover:text-blue-600"
        >
          Reset
        </Button>
      ) : null}
    </div>
  )

  const renderDocumentViewer = () => {
    if (isImageType(currentDocument.type)) {
      // Handle TIFF files separately
      if (isTIFFType(currentDocument.type)) {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-[600px]">
              <p style={{ color: "var(--sds-text-tertiary)" }}>Loading TIFF image...</p>
            </div>
          )
        }

        if (tiffError || !tiffImageUrl) {
          return (
            <div className="flex flex-col items-center justify-center space-y-4 min-h-[600px]">
              <FileIcon className="h-24 w-24" style={{ color: "var(--sds-text-tertiary)" }} />
              <div className="text-center">
                <p className="font-medium" style={{ color: "var(--sds-text-default)" }}>{currentDocument.name}</p>
                <p className="text-sm mt-2" style={{ color: "var(--sds-text-tertiary)" }}>
                  This item is unavailable.
                </p>
              </div>
            </div>
          )
        }

        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative" style={{ transform: `scale(${imageZoom})`, transition: "transform 0.2s" }}>
              <img
                src={tiffImageUrl}
                alt={currentDocument.name}
                className="max-w-full max-h-[600px] object-contain rounded shadow-lg"
              />
            </div>
          </div>
        )
      }

      // Handle other image types (PNG, JPEG, GIF, BMP, etc.)
      if (imageError) {
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <FileIcon className="h-24 w-24" style={{ color: "var(--sds-text-tertiary)" }} />
            <div className="text-center">
              <p className="font-medium" style={{ color: "var(--sds-text-default)" }}>{currentDocument.name}</p>
              <p className="text-sm mt-2" style={{ color: "var(--sds-text-tertiary)" }}>
                This item is unavailable.
              </p>
            </div>
          </div>
        )
      }
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative" style={{ transform: `scale(${imageZoom})`, transition: "transform 0.2s" }}>
            <img
              src={renderUrl}
              alt={currentDocument.name}
              className="max-w-full max-h-[600px] object-contain rounded shadow-lg"
              onError={() => setImageError(true)}
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
      )
    }

    if (isPDFType(currentDocument.type)) {
      if (iframeError && pdfCanvasFailed) {
        return (
          <div className={cn("flex flex-col items-center justify-center space-y-4", isFullscreen ? "h-full min-h-0" : "min-h-[600px]")}>
            <FileIcon className="h-24 w-24" style={{ color: "var(--sds-text-tertiary)" }} />
            <div className="text-center">
              <p className="font-medium" style={{ color: "var(--sds-text-default)" }}>{currentDocument.name}</p>
              <p className="text-sm mt-2" style={{ color: "var(--sds-text-tertiary)" }}>
                PDF viewer failed to load. Please use the download button below.
              </p>
            </div>
          </div>
        )
      }

      const useProtectedCanvas = !pdfCanvasFailed

      return (
        <div
          className={cn(
            "relative flex w-full flex-col overflow-hidden",
            isFullscreen ? "h-full min-h-0 flex-1" : "min-h-[600px]"
          )}
          onContextMenu={blockContextMenu}
        >
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
              <p className="text-white/80">Loading PDF...</p>
            </div>
          )}
          {useProtectedCanvas ? (
            <ProtectedPdfCanvas
              key={`${currentDocument.id}-protected-canvas`}
              url={renderUrl}
              className={cn(
                "w-full flex-1",
                isFullscreen ? "h-full min-h-0" : "min-h-[600px] max-h-[calc(100vh-260px)]"
              )}
              onLoad={() => {
                setIsLoading(false)
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current)
                }
              }}
              onError={() => {
                // CORS / load failure — fall back to iframe so viewing still works
                setPdfCanvasFailed(true)
                setIsLoading(true)
              }}
            />
          ) : (
            <iframe
              key={`${currentDocument.id}-${canDownload ? "downloadable" : "protected-iframe"}`}
              ref={iframeRef}
              src={buildPdfViewerSrc(renderUrl, canDownload)}
              className={cn(
                "w-full flex-1 border-0",
                isFullscreen ? "h-full min-h-0" : "h-full min-h-[600px]"
              )}
              title={currentDocument.name}
              style={{ backgroundColor: "#2a2a2a" }}
              onLoad={handleIframeLoad}
            />
          )}
        </div>
      )
    }

    if (isWordType(currentDocument.type)) {
      // For local files, Office Online viewer won't work - show download option directly
      if (isLocalFile(currentDocument.url) || iframeError) {
        return (
          <div className="flex flex-col items-center justify-center space-y-4 min-h-[600px]">
            <FileIcon className="h-24 w-24" style={{ color: "var(--sds-text-tertiary)" }} />
            <div className="text-center">
              <p className="font-medium" style={{ color: "var(--sds-text-default)" }}>{currentDocument.name}</p>
              <p className="text-sm mt-2" style={{ color: "var(--sds-text-tertiary)" }}>
                {isLocalFile(currentDocument.url) 
                  ? "Word documents cannot be previewed in the browser. Please download to open in Word."
                  : "Document viewer failed to load. Please download the file to view it."}
              </p>
            </div>
          </div>
        )
      }
      return (
        <div className="w-full h-full min-h-[600px] relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--sds-bg-subtle)" }}>
              <p style={{ color: "var(--sds-text-tertiary)" }}>Loading document...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            key={`${currentDocument.id}-${canDownload ? "downloadable" : "protected"}`}
            src={getOfficeViewerUrl(currentDocument.url, canDownload)}
            className="w-full h-full min-h-[600px] border-0"
            title={currentDocument.name}
            style={{ backgroundColor: "var(--sds-bg-subtle)" }}
            onLoad={() => {
              setIsLoading(false)
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
              }
            }}
          />

        </div>
      )
    }

    if (isExcelType(currentDocument.type)) {
      // For local files, parse and display Excel content
      if (isLocalFile(currentDocument.url)) {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-[600px]">
              <p style={{ color: "var(--sds-text-tertiary)" }}>Loading Excel file...</p>
            </div>
          )
        }

        if (excelError) {
          return (
            <div className="flex flex-col items-center justify-center space-y-4 min-h-[600px]">
              <FileIcon className="h-24 w-24" style={{ color: "var(--sds-text-tertiary)" }} />
              <div className="text-center">
                <p className="font-medium" style={{ color: "var(--sds-text-default)" }}>{currentDocument.name}</p>
                <p className="text-sm mt-2" style={{ color: "var(--sds-text-tertiary)" }}>
                  Failed to load Excel file. Please download to open in Excel.
                </p>
              </div>
            </div>
          )
        }

        if (excelData && excelData.data) {
          return (
            <div className="w-full h-full min-h-[600px] flex flex-col overflow-hidden p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium" style={{ color: "var(--sds-text-default)" }}>
                    {excelData.sheetName}
                  </h3>
                  {excelData.sheetNames.length > 1 && (
                    <p className="text-xs mt-1" style={{ color: "var(--sds-text-tertiary)" }}>
                      Sheet 1 of {excelData.sheetNames.length}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-x-auto border rounded" style={{ borderColor: "var(--sds-border-default)" }}>
                <table className="min-w-full border-collapse">
                  <tbody>
                    {excelData.data.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="border px-3 py-2 text-sm"
                            style={{
                              borderColor: "var(--sds-border-default)",
                              color: "var(--sds-text-default)",
                              backgroundColor: rowIndex === 0 ? "var(--sds-bg-subtle)" : "var(--sds-bg-default)",
                              fontWeight: rowIndex === 0 ? "600" : "400",
                            }}
                          >
                            {cell || ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        // Fallback if no data
        return (
          <div className="flex flex-col items-center justify-center space-y-4 min-h-[600px]">
            <FileIcon className="h-24 w-24" style={{ color: "var(--sds-text-tertiary)" }} />
            <div className="text-center">
              <p className="font-medium" style={{ color: "var(--sds-text-default)" }}>{currentDocument.name}</p>
              <p className="text-sm mt-2" style={{ color: "var(--sds-text-tertiary)" }}>
                Unable to preview Excel file. Please download to open in Excel.
              </p>
            </div>
          </div>
        )
      }

      // For non-local files, use iframe viewer
      if (iframeError) {
        return (
          <div className="flex flex-col items-center justify-center space-y-4 min-h-[600px]">
            <FileIcon className="h-24 w-24" style={{ color: "var(--sds-text-tertiary)" }} />
            <div className="text-center">
              <p className="font-medium" style={{ color: "var(--sds-text-default)" }}>{currentDocument.name}</p>
              <p className="text-sm mt-2" style={{ color: "var(--sds-text-tertiary)" }}>
                Spreadsheet viewer failed to load. Please download the file to view it.
              </p>

            </div>
          </div>
        )
      }
      return (
        <div className="w-full h-full min-h-[600px] relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--sds-bg-subtle)" }}>
              <p style={{ color: "var(--sds-text-tertiary)" }}>Loading spreadsheet...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            key={`${currentDocument.id}-${canDownload ? "downloadable" : "protected"}`}
            src={getOfficeViewerUrl(currentDocument.url, canDownload)}
            className="w-full h-full min-h-[600px] border-0"
            title={currentDocument.name}
            style={{ backgroundColor: "var(--sds-bg-subtle)" }}
            onLoad={() => {
              setIsLoading(false)
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
              }
            }}
          />

        </div>
      )
    }

    if (isPresentationType(currentDocument.type, currentDocument.name)) {
      if (isLocalFile(currentDocument.url) || iframeError) {
        return (
          <div className="flex flex-col items-center justify-center space-y-4 min-h-[600px]">
            <FileIcon className="h-24 w-24" style={{ color: "var(--sds-text-tertiary)" }} />
            <div className="text-center">
              <p className="font-medium" style={{ color: "var(--sds-text-default)" }}>{currentDocument.name}</p>
              <p className="text-sm mt-2" style={{ color: "var(--sds-text-tertiary)" }}>
                {isLocalFile(currentDocument.url)
                  ? "Presentation files cannot be previewed in the browser. Please download to open in PowerPoint."
                  : "Presentation viewer failed to load. Please download the file to view it."}
              </p>
            </div>
          </div>
        )
      }
      return (
        <div
          className={cn("relative w-full", isFullscreen ? "h-full min-h-0 flex-1" : "h-full min-h-[600px]")}
          onContextMenu={blockContextMenu}
        >
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ backgroundColor: "var(--sds-bg-subtle)" }}>
              <p style={{ color: "var(--sds-text-tertiary)" }}>Loading presentation...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            key={`${currentDocument.id}-${canDownload ? "downloadable" : "protected"}`}
            src={getOfficeViewerUrl(currentDocument.url, canDownload)}
            className={cn(
              "w-full border-0",
              isFullscreen ? "h-full min-h-0" : "h-full min-h-[600px]"
            )}
            title={currentDocument.name}
            style={{ backgroundColor: "var(--sds-bg-subtle)" }}
            onLoad={handleIframeLoad}
          />
          {/* Leave bottom chrome free so Office prev/next keep working */}
          <PresentationContextMenuShield />
          {!canDownload ? (
            <div
              className="absolute bottom-0 right-0 z-20 h-6 w-48"
              style={{
                backgroundColor: "#444444"
              }}
              aria-hidden="true"
              onContextMenu={blockContextMenu}
            />
          ) : null}
        </div>
      )
    }

    // Default fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <FileIcon className="h-24 w-24" style={{ color: "var(--sds-text-tertiary)" }} />
        <div className="text-center">
          <p className="font-medium" style={{ color: "var(--sds-text-default)" }}>{currentDocument.name}</p>
          <p className="text-sm mt-2" style={{ color: "var(--sds-text-tertiary)" }}>
            This file type cannot be previewed. Please download to view.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <Card
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--sds-radius-sm)] border"
        style={{ borderColor: "var(--sds-border-default)", backgroundColor: "var(--sds-bg-default)" }}
      >
        <div
          ref={viewerContainerRef}
          className={cn(
            "relative flex min-h-0 flex-1 flex-col",
            isFullscreen && "h-full min-h-screen bg-[var(--sds-bg-default)]"
          )}
          style={{ backgroundColor: isPdfDocument ? "#2a2a2a" : "var(--sds-bg-subtle)" }}
        >
          <div
            className="shrink-0 border-b px-6 py-3"
            style={{ borderColor: "var(--sds-border-default)", backgroundColor: "var(--sds-bg-default)" }}
          >
            <p
              className="break-words text-sm font-medium [overflow-wrap:anywhere]"
              style={{ color: "var(--sds-text-default)" }}
              title={currentDocument.name}
            >
              {currentDocument.name}
            </p>
          </div>

          <div
            className={cn(
              "relative flex min-h-0 flex-1",
              isFullscreen ? "items-stretch" : "min-h-[600px] items-center justify-center",
              isPdfDocument || isFullscreen ? "p-0" : "p-8"
            )}
          >
            {showImageZoomControls ? renderImageZoomControls() : null}
            {renderDocumentViewer()}
          </div>

          <div
            className="shrink-0 border-t px-6 py-3"
            style={{ borderColor: "var(--sds-border-default)", backgroundColor: "var(--sds-bg-default)" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevDocument}
                  disabled={currentDocumentIndex <= 0}
                  className="h-8 w-8 shrink-0 rounded-md hover:bg-blue-100 hover:text-blue-600"
                  aria-label="Previous file"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span
                  className="shrink-0 whitespace-nowrap text-sm font-medium"
                  style={{ color: "var(--sds-text-default)" }}
                >
                  {currentFileNumber}/{totalFiles}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextDocument}
                  disabled={currentDocumentIndex >= documents.length - 1}
                  className="h-8 w-8 shrink-0 rounded-md hover:bg-blue-100 hover:text-blue-600"
                  aria-label="Next file"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {canDownload ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-[40px] border-[var(--sds-border-subtle)]"
                  >
                    <Download className="h-4 w-4" style={{ color: "var(--sds-icon-brand)" }} />
                    Download
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFullscreen}
                  className="h-8 w-8 shrink-0 rounded-md hover:bg-blue-100 hover:text-blue-600"
                  aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
                  title={isFullscreen ? "Minimize" : "Maximize"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" style={{ color: "var(--sds-icon-brand)" }} />
                  ) : (
                    <Maximize2 className="h-4 w-4" style={{ color: "var(--sds-icon-brand)" }} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Toast />
    </div>
  )
}
