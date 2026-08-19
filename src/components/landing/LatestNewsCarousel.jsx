import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Newspaper, Play } from "lucide-react";
import BlobImage from "@/components/shared/BlobImage";
import CarouselNavButton from "@/components/landing/CarouselNavButton";
import { ELECTRIC_BLUE, MARUTI_BLUE } from "@/components/landing/landingTheme";
import {
  LOOPING_CAROUSEL_EASE,
  useLoopingCarousel,
} from "@/hooks/useLoopingCarousel";
import { cn } from "@/lib/utils";

/** Matches the Tone at the Top carousel on LandingPage2. */
const SLIDE_MS = 650;

function OverlayArrow({ direction, onClick, className }) {
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous news image" : "Next news image"}
      onClick={onClick}
      className={cn(
        "flex size-10 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50",
        className,
      )}
    >
      {direction === "prev" ? (
        <ChevronLeft className="size-5" />
      ) : (
        <ChevronRight className="size-5" />
      )}
    </button>
  );
}

function OutlineArrow({ direction, onClick }) {
  return (
    <CarouselNavButton
      direction={direction}
      onClick={onClick}
      size="sm"
      variant="outline"
      label={direction === "prev" ? "Previous news image" : "Next news image"}
    />
  );
}

function GradientDots({ total, active, onSelect }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Go to news image ${index + 1}`}
          aria-current={index === active ? "true" : undefined}
          onClick={() => onSelect(index)}
          className={cn(
            "rounded-full transition-all",
            index === active
              ? "h-3.5 w-7 bg-gradient-to-r from-[#8b5cf6] to-[#2563eb]"
              : "size-3.5 bg-gradient-to-r from-[#8b5cf6]/15 to-[#2563eb]/15",
          )}
        />
      ))}
    </div>
  );
}

function NewsSlideMedia({ slide, imageClassName, interactive, onActivate }) {
  const body = slide?.image ? (
    <BlobImage
      src={slide.image}
      alt={slide.title || "Latest news"}
      className={cn("absolute inset-0 size-full object-contain", imageClassName)}
      loading="eager"
      decoding="async"
    />
  ) : (
    <div className="flex size-full items-center justify-center bg-[#f5f5f5] text-sm text-black/40">
      No image available
    </div>
  );

  if (interactive) {
    return (
      <button
        type="button"
        aria-label={`Open ${slide?.title || "latest news image"}`}
        onClick={onActivate}
        className="relative h-full w-full min-w-0 shrink-0 grow-0 basis-full overflow-hidden rounded-3xl cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-inset"
      >
        {body}
      </button>
    );
  }

  return (
    <div className="relative h-full w-full min-w-0 shrink-0 grow-0 basis-full overflow-hidden">
      {body}
    </div>
  );
}

/**
 * @param {object} props
 * @param {Array<{id:string,image:string,title?:string,category?:string,description?:string}>} props.slides
 * @param {'detailed'|'image-only'} [props.variant]
 * @param {() => void} [props.onExplore]
 * @param {(slide: object, index: number) => void} [props.onSlideClick]
 * @param {string} [props.className]
 * @param {string} [props.imageClassName]
 * @param {number} [props.autoPlayMs]
 * @param {string} [props.titleClassName]
 * @param {boolean} [props.showHeader]
 */
export default function LatestNewsCarousel({
  slides = [],
  variant = "detailed",
  onExplore,
  onSlideClick,
  className,
  imageClassName,
  autoPlayMs = 6000,
  titleClassName,
  showHeader = true,
}) {
  const total = slides.length;
  const {
    trackIndex,
    logicalIndex,
    enableTransition,
    resumeVersion,
    canLoop,
    next,
    prev,
    goToLogical,
    onTransitionEnd,
    buildTrackItems,
  } = useLoopingCarousel({ total, slideMs: SLIDE_MS });

  const trackSlides = buildTrackItems(slides);
  const current = total > 0 ? slides[logicalIndex] : null;
  const canCarousel = total > 1;

  useEffect(() => {
    if (!canCarousel || !autoPlayMs) return undefined;
    if (document.hidden) return undefined;
    const timer = setTimeout(() => next(), autoPlayMs);
    return () => clearTimeout(timer);
  }, [autoPlayMs, canCarousel, logicalIndex, next, resumeVersion]);

  const trackStyle = {
    transform: `translate3d(-${trackIndex * 100}%, 0, 0)`,
    transition: enableTransition
      ? `transform ${SLIDE_MS}ms ${LOOPING_CAROUSEL_EASE}`
      : "none",
  };

  if (!current) {
    return (
      <div className={cn("flex h-full min-h-0 flex-col", className)}>
        {showHeader ? (
          <div className="flex min-w-0 items-center gap-3 px-6 pt-6">
            <Newspaper className="size-7 shrink-0" style={{ color: MARUTI_BLUE }} />
            <h2
              className={cn(
                "min-w-0 whitespace-nowrap text-[40px] font-extrabold leading-none",
                titleClassName,
              )}
              style={{ color: MARUTI_BLUE }}
            >
              Latest News &amp; Announcements
            </h2>
          </div>
        ) : null}
        <p className="m-6 rounded-2xl border border-dashed border-[#d9d9d9] bg-white/70 px-5 py-10 text-center text-sm text-black/50">
          No news or announcements available
        </p>
      </div>
    );
  }

  const hasTextContent = Boolean(
    current.category || current.title || current.description,
  );

  if (variant === "image-only") {
    return (
      <div className={cn("flex h-full min-h-0 flex-col gap-5", className)}>
        {showHeader ? (
          <div className="flex shrink-0 items-center gap-3">
            <Newspaper className="size-8 shrink-0 text-[#171c8f]" strokeWidth={1.75} />
            <h2
              className={cn(
                "text-[40px] font-extrabold leading-none text-[#171c8f]",
                titleClassName,
              )}
            >
              Latest News &amp; Announcements
            </h2>
          </div>
        ) : null}

        <div className="flex min-h-0 w-full flex-1 flex-col gap-5">
          <div className="min-h-0 w-full flex-1 overflow-hidden rounded-3xl bg-[#f5f7fb]">
            <div
              className="flex h-full w-full will-change-transform"
              style={trackStyle}
              onTransitionEnd={onTransitionEnd}
            >
              {trackSlides.map((slide, slideIndex) => {
                // Map track position back to real index for click handlers.
                let realIndex = slideIndex;
                if (canLoop) {
                  if (slideIndex === 0) realIndex = total - 1;
                  else if (slideIndex === trackSlides.length - 1) realIndex = 0;
                  else realIndex = slideIndex - 1;
                }
                const interactive = typeof onSlideClick === "function";
                return (
                  <NewsSlideMedia
                    key={`${slide.id || realIndex}-track-${slideIndex}`}
                    slide={slide}
                    imageClassName={imageClassName}
                    interactive={interactive}
                    onActivate={() => onSlideClick?.(slide, realIndex)}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex h-[46px] shrink-0 items-center justify-between">
            {canCarousel ? (
              <>
                <OutlineArrow direction="prev" onClick={prev} />
                <GradientDots total={total} active={logicalIndex} onSelect={goToLogical} />
                <OutlineArrow direction="next" onClick={next} />
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {showHeader ? (
        <div className="flex min-w-0 items-center gap-3 px-6 pt-6">
          <Newspaper className="size-7 shrink-0" style={{ color: MARUTI_BLUE }} />
          <h2
            className={cn(
              "min-w-0 whitespace-nowrap text-[40px] font-extrabold leading-none",
              titleClassName,
            )}
            style={{ color: MARUTI_BLUE }}
          >
            Latest News &amp; Announcements
          </h2>
        </div>
      ) : null}

      <div className="relative mt-5 aspect-video w-full shrink-0 overflow-hidden bg-[#f5f7fb]">
        <div className={cn("absolute inset-0 overflow-hidden", imageClassName)}>
          <div
            className="flex h-full w-full will-change-transform"
            style={trackStyle}
            onTransitionEnd={onTransitionEnd}
          >
            {trackSlides.map((slide, slideIndex) => (
              <NewsSlideMedia
                key={`${slide.id || slideIndex}-detail-${slideIndex}`}
                slide={slide}
                imageClassName={imageClassName}
                interactive={false}
              />
            ))}
          </div>

          {canCarousel ? (
            <>
              <OverlayArrow
                direction="prev"
                onClick={prev}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2"
              />
              <OverlayArrow
                direction="next"
                onClick={next}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2"
              />
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                {slides.map((slide, slideIndex) => (
                  <button
                    key={slide.id || slideIndex}
                    type="button"
                    aria-label={`Go to news image ${slideIndex + 1}`}
                    aria-current={slideIndex === logicalIndex ? "true" : undefined}
                    onClick={() => goToLogical(slideIndex)}
                    className={cn(
                      "h-2.5 rounded-full transition",
                      slideIndex === logicalIndex
                        ? "w-6 bg-white"
                        : "w-2.5 bg-white/55 hover:bg-white/80",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {hasTextContent ? (
        <div className="px-6 pb-6 pt-5">
          {current.title ? (
            <h3 className="mt-2 text-3xl font-bold leading-tight text-[#171c4d]">
              {current.title}
            </h3>
          ) : null}
          {current.description ? (
            <p className="mt-3 text-base font-normal leading-7 text-black/70">
              {current.description}
            </p>
          ) : null}
          {typeof onExplore === "function" ? (
            <button
              type="button"
              onClick={() => onExplore(current)}
              className="mt-4 inline-flex items-center gap-2 text-lg font-semibold transition hover:underline"
              style={{ color: ELECTRIC_BLUE }}
            >
              <Play className="size-5 fill-current" />
              Explore Now
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
