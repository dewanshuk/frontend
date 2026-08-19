import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Full-screen image viewer for flyer items (Figma 2311-52048).
 * Shows title, main image with prev/next, close and fullscreen controls.
 */
export function FullScreenImageViewer({
  title,
  images = [],
  currentIndex = 0,
  onIndexChange,
  onClose,
  className,
}) {
  const safeIndex = Math.max(0, Math.min(currentIndex, images.length - 1))
  const currentImage = images[safeIndex]
  const hasPrev = images.length > 1 && safeIndex > 0
  const hasNext = images.length > 1 && safeIndex < images.length - 1

  const goPrev = () => {
    if (hasPrev && onIndexChange) onIndexChange(safeIndex - 1)
  }

  const goNext = () => {
    if (hasNext && onIndexChange) onIndexChange(safeIndex + 1)
  }

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.()
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [safeIndex, images.length])

  const imageUrl = typeof currentImage === "string" ? currentImage : currentImage?.url
  const imageAlt = typeof currentImage === "object" ? currentImage?.name : title

  if (!imageUrl) {
    return null
  }

  return (
    <div
      className={cn("fixed inset-0 z-50 flex flex-col backdrop-blur-sm", className)}
      style={{ backgroundColor: "rgba(249, 244, 236, 0.98)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Inner card (Figma: white #fefefe, rounded 20px, shadow) */}
      <div
        className="relative flex flex-col flex-1 m-4 rounded-[var(--sds-radius-lg)] overflow-hidden shadow-sds-viewer min-h-0"
        style={{ backgroundColor: "var(--sds-viewer-bg)" }}
      >
        {/* Title top-left */}
        <div className="absolute left-10 top-6 z-10">
          <p className="text-2xl font-medium" style={{ color: "var(--sds-text-default)" }}>
            {title}
          </p>
        </div>

        {/* Close button top-right (Figma: tertiary-button, rounded 40px, border subtle) */}
        <Button
          variant="outline"
          size="icon"
          className="absolute right-6 top-6 z-10 h-12 w-12 rounded-[40px]"
          style={{ borderColor: "var(--sds-border-subtle)" }}
          onClick={onClose}
          aria-label="Close viewer"
        >
          <X className="h-5 w-5" style={{ color: "var(--sds-icon-brand)" }} />
        </Button>

        {/* Image area with nav arrows */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 pt-20 pb-20">
          <img
            src={imageUrl}
            alt={imageAlt ?? title}
            className="max-h-full max-w-full object-contain"
          />

          {hasPrev && (
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-1/2 h-[34px] w-[34px] -translate-y-1/2 rounded-full shadow-md"
              style={{ borderColor: "var(--sds-border-subtle)", backgroundColor: "rgba(255,255,255,0.9)" }}
              onClick={goPrev}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" style={{ color: "var(--sds-icon-brand)" }} />
            </Button>
          )}
          {hasNext && (
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-1/2 h-[34px] w-[34px] -translate-y-1/2 rounded-full shadow-md"
              style={{ borderColor: "var(--sds-border-subtle)", backgroundColor: "rgba(255,255,255,0.9)" }}
              onClick={goNext}
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" style={{ color: "var(--sds-icon-brand)" }} />
            </Button>
          )}
        </div>

        {/* Fullscreen / expand button bottom-right (Figma: tertiary style) */}
        <div className="absolute bottom-6 right-6">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-[40px]"
            style={{ borderColor: "var(--sds-border-subtle)" }}
            aria-label="Expand view"
            onClick={() => {
              const img = document.querySelector('[aria-label="Image viewer"] img')
              if (img) {
                try {
                  img.requestFullscreen?.()
                } catch {
                  window.open(imageUrl, "_blank")
                }
              }
            }}
          >
            <Maximize2 className="h-6 w-6" style={{ color: "var(--sds-icon-brand)" }} />
          </Button>
        </div>
      </div>
    </div>
  )
}
