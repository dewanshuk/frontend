import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  X,
} from "lucide-react";
import BlobImage from "../shared/BlobImage";
import EventTruncatedText from "./EventTruncatedText";
import { cn, markdownToDisplayHtml } from "@/lib/utils";

const ENTER_MS = 500;
const EXIT_MS = 350;

// Expanded panel chrome: 61px header + 69px footer, borders included. The 16:9
// media area is measured from the panel width, so the width has to be capped by
// the height left after this chrome or the media outgrows the panel.
const EXPANDED_CHROME_HEIGHT = 130;
const EXPANDED_MAX_WIDTH = 1100;
const EXPANDED_HEIGHT_PERCENT = 92;

function MediaViewer({
  currentItem,
  isVideo,
  isPlaying,
  onPlay,
  videoRef,
  onEnded,
  expanded = false,
}) {
  const previewSource = currentItem.thumbnailUrl || currentItem.url;
  const expandedImageSource = currentItem.url || currentItem.thumbnailUrl;
  const imageSource =
    expanded && !isVideo ? expandedImageSource : previewSource;

  return (
    <>
      {isVideo && isPlaying ? (
        <video
          ref={videoRef}
          src={currentItem.url}
          poster={currentItem.thumbnailUrl || currentItem.url}
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-contain"
          onContextMenu={(event) => event.preventDefault()}
          onEnded={onEnded}
        />
      ) : (
        <>
          <BlobImage
            src={imageSource}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
          />
          {isVideo ? (
            <button
              type="button"
              onClick={onPlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
              aria-label="Play video"
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition-transform hover:scale-105",
                  expanded ? "h-20 w-20" : "h-16 w-16",
                )}
              >
                <Play
                  className={cn(
                    "fill-current",
                    expanded ? "ml-1 h-8 w-8" : "ml-1 h-7 w-7",
                  )}
                />
              </span>
            </button>
          ) : null}
        </>
      )}
    </>
  );
}

function MediaNavButton({ direction, onClick, className = "" }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow transition hover:bg-black/55",
        direction === "prev" ? "left-2" : "right-2",
        className,
      )}
      aria-label={direction === "prev" ? "Previous media" : "Next media"}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function MediaFrame({
  expanded = false,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  hideOverlayNav = false,
  children,
  className = "",
}) {
  const navButtons = hideOverlayNav ? null : (
    <>
      {hasPrev ? <MediaNavButton direction="prev" onClick={onPrev} /> : null}
      {hasNext ? <MediaNavButton direction="next" onClick={onNext} /> : null}
    </>
  );

  if (!expanded) {
    return (
      <div className={cn("relative w-full", className)}>
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-900">
          {children}
        </div>
        {navButtons}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-gray-900",
        className,
      )}
    >
      {children}
      {navButtons}
    </div>
  );
}

export default function EventMediaModal({
  open,
  title,
  description,
  media = [],
  currentIndex = 0,
  initialExpanded = false,
  disableCollapse = false,
  /** When set (e.g. 60), the expanded panel fits inside that % of the viewport. */
  expandedViewportPercent,
  /** Overrides the height budget so the panel may use more height than width. */
  expandedViewportHeightPercent,
  /** Hides the arrows drawn over the image; the footer controls stay. */
  hideOverlayNav = false,
  onIndexChange,
  onClose,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [cached, setCached] = useState({
    title: "",
    description: "",
    media: [],
    currentIndex: 0,
  });
  const videoRef = useRef(null);
  const exitTimerRef = useRef(null);
  const enterFrameRef = useRef(0);
  const onCloseRef = useRef(onClose);
  const onIndexChangeRef = useRef(onIndexChange);
  const navStateRef = useRef({ open: false, hasPrev: false, hasNext: false, safeIndex: 0 });

  useEffect(() => {
    onCloseRef.current = onClose;
    onIndexChangeRef.current = onIndexChange;
  }, [onClose, onIndexChange]);

  // Keep last open content so exit animation doesn't blank out.
  useEffect(() => {
    if (!open) return;
    setCached({
      title: title || "",
      description: description || "",
      media: Array.isArray(media) ? media : [],
      currentIndex: currentIndex || 0,
    });
  }, [open, title, description, media, currentIndex]);

  // Smooth enter / exit without hard mount flash.
  useEffect(() => {
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (enterFrameRef.current) {
      window.cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = 0;
    }

    if (open) {
      setIsExpanded(Boolean(initialExpanded || disableCollapse));
      setVisible(true);
      setEntered(false);
      enterFrameRef.current = window.requestAnimationFrame(() => {
        enterFrameRef.current = window.requestAnimationFrame(() => {
          setEntered(true);
        });
      });
      return undefined;
    }

    setEntered(false);
    exitTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setIsPlaying(false);
      setIsExpanded(false);
    }, EXIT_MS);

    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (enterFrameRef.current) {
        window.cancelAnimationFrame(enterFrameRef.current);
        enterFrameRef.current = 0;
      }
    };
  }, [open, initialExpanded, disableCollapse]);

  const activeTitle = open ? title : cached.title;
  const activeDescription = open ? description : cached.description;
  const activeMedia = open ? media : cached.media;
  const activeIndex = open ? currentIndex : cached.currentIndex;

  const playableMedia = (activeMedia || []).filter(
    (item) => item?.url || item?.thumbnailUrl,
  );
  const safeIndex = Math.max(
    0,
    Math.min(activeIndex, Math.max(playableMedia.length - 1, 0)),
  );
  const currentItem = playableMedia[safeIndex];
  const isVideo = currentItem?.type === "video";
  const hasPrev = safeIndex > 0;
  const hasNext = safeIndex < playableMedia.length - 1;

  navStateRef.current = { open, hasPrev, hasNext, safeIndex };

  // Same approach as Orchestration Add Document: keep page scroll frozen without
  // mutating root overflow (that jumps the landing viewport under CSS zoom).
  useEffect(() => {
    if (!visible) return undefined;

    const preventBackgroundScroll = (event) => {
      if (event.target instanceof Element) {
        const panel = event.target.closest("[data-event-media-modal-panel]");
        let node = event.target;
        while (panel && node && panel.contains(node)) {
          const style = window.getComputedStyle(node);
          const canScroll =
            /(auto|scroll)/.test(style.overflowY) &&
            node.scrollHeight > node.clientHeight;
          if (canScroll) return;
          if (node === panel) break;
          node = node.parentElement;
        }
      }
      event.preventDefault();
    };

    document.addEventListener("wheel", preventBackgroundScroll, {
      passive: false,
    });
    document.addEventListener("touchmove", preventBackgroundScroll, {
      passive: false,
    });

    return () => {
      document.removeEventListener("wheel", preventBackgroundScroll);
      document.removeEventListener("touchmove", preventBackgroundScroll);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;

    const handleKeyDown = (event) => {
      const nav = navStateRef.current;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (!nav.open) return;
      if (event.key === "ArrowLeft" && nav.hasPrev) {
        onIndexChangeRef.current?.(nav.safeIndex - 1);
      }
      if (event.key === "ArrowRight" && nav.hasNext) {
        onIndexChangeRef.current?.(nav.safeIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  useEffect(() => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [safeIndex, currentItem?.url]);

  if (!visible || !currentItem) return null;

  const handlePlay = () => {
    setIsPlaying(true);
    window.requestAnimationFrame(() => {
      videoRef.current?.play?.().catch(() => {
        setIsPlaying(false);
      });
    });
  };

  const handleToggleExpand = () => {
    if (disableCollapse && isExpanded) return;
    setIsExpanded((current) => !current);
  };

  const goPrev = () => {
    if (!hasPrev) return;
    onIndexChange?.(safeIndex - 1);
  };

  const goNext = () => {
    if (!hasNext) return;
    onIndexChange?.(safeIndex + 1);
  };

  const mediaViewerProps = {
    currentItem,
    isVideo,
    isPlaying,
    onPlay: handlePlay,
    videoRef,
    onEnded: () => setIsPlaying(false),
  };

  const toPercent = (value) =>
    typeof value === "number" && value > 0 && value <= 100 ? value : null;
  const viewportPercent = toPercent(expandedViewportPercent);
  const viewportHeightPercent =
    toPercent(expandedViewportHeightPercent) ?? viewportPercent;
  // Widest panel that still lets the 16:9 media and the chrome fit the height
  // budget, so the ratio never has to be traded away to avoid clipping.
  const expandedWidth = (limits, heightPercent) => {
    const heightLimit = `calc((${heightPercent}vh - ${EXPANDED_CHROME_HEIGHT}px) * 16 / 9)`;
    return `min(${[...limits, heightLimit].join(", ")})`;
  };

  const expandedPanelStyle = viewportPercent
    ? {
        width: expandedWidth([`${viewportPercent}vw`], viewportHeightPercent),
        maxWidth: `${viewportPercent}vw`,
        maxHeight: `${viewportHeightPercent}vh`,
      }
    : {
        width: expandedWidth(
          ["94vw", `${EXPANDED_MAX_WIDTH}px`],
          EXPANDED_HEIGHT_PERCENT,
        ),
      };

  // Portalled to <body> so the overlay escapes the landing shell's CSS `zoom`.
  // Inside that zoom, `fixed inset-0` and viewport units resolve against a
  // scaled box instead of the screen, which offset the panel and pushed the
  // footer past the bottom edge on large displays.
  const overlay = (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center overflow-auto",
        "transition-opacity ease-out",
        entered ? "opacity-100" : "opacity-0",
      )}
      style={{ transitionDuration: `${entered ? ENTER_MS : EXIT_MS}ms` }}
      role="dialog"
      aria-modal="true"
      aria-label={activeTitle}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          "relative my-0 flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl",
          viewportPercent ? "mx-0" : "mx-4 w-full max-h-[min(95%,820px)]",
          // Width/height stay un-animated: height is `auto` and cannot
          // interpolate, so animating width alone reads as a glitch on expand.
          "transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)]",
          entered ? "scale-100 opacity-100" : "scale-[0.985] opacity-0",
          isExpanded ? null : "max-w-[min(92vw,960px)]",
        )}
        style={{
          transitionDuration: `${entered ? ENTER_MS : EXIT_MS}ms`,
          ...(isExpanded ? expandedPanelStyle : undefined),
        }}
        data-event-media-modal-panel
        data-viewport-percent={viewportPercent || undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <EventTruncatedText
            text={activeTitle}
            as="h2"
            className="min-w-0 flex-1 truncate text-lg font-bold text-gray-900"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isExpanded ? (
          <>
            {/* Media area is itself 16:9, so a 16:9 asset fills it edge to edge.
                The panel width is capped to the viewport height budget, which is
                what keeps this ratio from overflowing the panel. */}
            <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-gray-900">
              <MediaFrame
                expanded
                hasPrev={hasPrev}
                hasNext={hasNext}
                onPrev={goPrev}
                onNext={goNext}
                hideOverlayNav={hideOverlayNav}
              >
                <MediaViewer {...mediaViewerProps} expanded />
              </MediaFrame>
            </div>

            <div className="relative shrink-0 border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!hasPrev}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="min-w-[4.5rem] text-center text-sm font-medium text-gray-600">
                  {safeIndex + 1}/{playableMedia.length}
                </p>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!hasNext}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next media"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {!disableCollapse ? (
                <button
                  type="button"
                  onClick={handleToggleExpand}
                  className="absolute right-6 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
                  aria-label="Exit expanded view"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="min-h-0 overflow-y-auto overscroll-contain lg:overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="flex flex-col bg-gray-50 p-4 md:p-6">
                <MediaFrame
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                  onPrev={goPrev}
                  onNext={goNext}
                  hideOverlayNav={hideOverlayNav}
                >
                  <MediaViewer {...mediaViewerProps} />
                </MediaFrame>

                <div className="mt-4 flex shrink-0 items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goPrev}
                      disabled={!hasPrev}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous media"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="min-w-[4.5rem] text-center text-sm font-medium text-gray-600">
                      {safeIndex + 1}/{playableMedia.length}
                    </p>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!hasNext}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next media"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleExpand}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
                    aria-label="Expand media"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 border-t border-gray-200 lg:border-l lg:border-t-0">
                <div className="overflow-y-auto overscroll-contain p-6 lg:absolute lg:inset-0">
                  <h3 className="text-base font-bold text-gray-900">
                    Description
                  </h3>
                  <p
                    className="mt-4 text-sm leading-7 text-gray-600"
                    dangerouslySetInnerHTML={{
                      __html: markdownToDisplayHtml(activeDescription) || "No description available.",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}