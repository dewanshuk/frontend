import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import EventGalleryCard from "@/components/events/EventGalleryCard";
import EventMediaModal from "@/components/events/EventMediaModal";
import EventTruncatedText from "@/components/events/EventTruncatedText";
import DesktopScaleCanvas from "@/components/landing/DesktopScaleCanvas";
import { LandingEventsBody } from "@/components/landing/LandingEventsShell";
import { Button } from "@/components/ui/button";
import { getEventById } from "@/api/eventsApi";
import { GALLERY_PAGE_BACKGROUND } from "@/components/events/galleryTheme";
import { getGalleryBasePath, isLandingGalleryPath } from "@/lib/appNavigation";

const GALLERY_PAGE_SIZE = 12;

const getEventDisplayTitle = (event) => {
  const eventName = String(event?.title || "").trim();
  const subEventName = String(
    event?.subEventName ||
      (event?.categoryLabel && event.categoryLabel !== "Event"
        ? event.categoryLabel
        : ""),
  ).trim();

  if (!eventName) return "Event";
  if (!subEventName || subEventName.toLowerCase() === eventName.toLowerCase()) {
    return eventName;
  }
  return `${eventName} – ${subEventName}`;
};

export default function EventGallery({ variant = "default" }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding =
    variant === "landing" || isLandingGalleryPath(location.pathname);
  const galleryBase = getGalleryBasePath({ landing: isLanding });
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewerState, setViewerState] = useState(null);
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE);
  const contentScrollRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!isLoading) {
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTo({ top: 0, behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }, [isLoading]);

  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      try {
        setIsLoading(true);
        setError("");
        setVisibleCount(GALLERY_PAGE_SIZE);
        const response = await getEventById(eventId);
        if (!cancelled) {
          if (!response) {
            setError("Event not found.");
            setEvent(null);
            return;
          }
          setEvent(response);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load gallery.");
          setEvent(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const galleryMedia = useMemo(
    () => (Array.isArray(event?.media) ? event.media : []),
    [event?.media],
  );

  const visibleItems = galleryMedia.slice(0, visibleCount);
  const hasMore = visibleCount < galleryMedia.length;

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const root = isLanding ? null : contentScrollRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + GALLERY_PAGE_SIZE); },
      { root, threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleItems.length, isLanding]);

  const handleOpenMedia = useCallback(
    (item) => {
      if (!item?.url && !item?.thumbnailUrl) return;

      const allMedia = (
        Array.isArray(event?.media) ? event.media : []
      ).filter((mediaItem) => mediaItem?.url || mediaItem?.thumbnailUrl);

      if (allMedia.length === 0) return;

      let index = allMedia.findIndex(
        (mediaItem) =>
          mediaItem === item ||
          (mediaItem?.id != null &&
            item?.id != null &&
            String(mediaItem.id) === String(item.id)),
      );

      if (index < 0 && item?.url) {
        index = allMedia.findIndex((mediaItem) => mediaItem?.url === item.url);
      }

      if (index < 0) {
        index = allMedia.findIndex(
          (mediaItem) =>
            mediaItem?.thumbnailUrl &&
            mediaItem.thumbnailUrl === item.thumbnailUrl,
        );
      }

      setViewerState({
        title: getEventDisplayTitle(event),
        description: event?.description,
        media: allMedia,
        index: index >= 0 ? index : 0,
      });
    },
    [event],
  );

  const galleryTitle = getEventDisplayTitle(event);

  const mediaModal = (
    <EventMediaModal
      open={Boolean(viewerState)}
      title={viewerState?.title}
      description={viewerState?.description}
      media={viewerState?.media || []}
      currentIndex={viewerState?.index || 0}
      onIndexChange={(index) =>
        setViewerState((current) =>
          current ? { ...current, index } : current,
        )
      }
      onClose={() => setViewerState(null)}
    />
  );

  const header = isLanding ? (
    <div className="mb-10">
      <Button
        variant="link"
        onClick={() => navigate(galleryBase)}
        aria-label="Go back"
        className="mb-6 flex h-auto items-center gap-1.5 shrink-0 rounded-full border border-[#cfe3f0] bg-white/80 px-4 py-2 m-0 text-[#20505c] no-underline shadow-[0_4px_14px_rgba(15,47,87,0.08)] backdrop-blur-sm transition-all duration-200 hover:border-[#a7ece5] hover:bg-white hover:text-[#0f2f57] hover:no-underline"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back to Gallery</span>
      </Button>

      {!isLoading && (
        <div>
          <div className="mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#2563eb] to-[#2dd4bf]" />
          <EventTruncatedText
            text={galleryTitle}
            as="h1"
            className="min-w-0 text-5xl font-bold leading-tight tracking-tight text-[#0f2f57]"
          />
          {galleryMedia.length > 0 && (
            <p className="mt-2 text-lg text-[#4a7f87]">{galleryMedia.length} items</p>
          )}
        </div>
      )}
    </div>
  ) : (
    <div className="mb-8 flex flex-wrap items-center gap-4">
      <Button
        variant="link"
        onClick={() => navigate(galleryBase)}
        aria-label="Go back"
        className="flex h-auto items-center gap-1 shrink-0 rounded-md border border-[#a7ece5] bg-[#ccfbf1] px-2 py-1 m-0 text-[#0f766e] no-underline transition-colors duration-150 hover:bg-[#14b8a6] hover:text-white hover:no-underline"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back</span>
      </Button>

      {isLoading ? null : (
        <EventTruncatedText
          text={galleryTitle}
          as="h1"
          className="min-w-0 text-2xl font-semibold leading-[1.2] tracking-[-0.48px] text-[#0f2f57]"
        />
      )}
    </div>
  );

  const gridClass = isLanding
    ? "grid grid-cols-4 gap-4"
    : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";

  const galleryBody = (
    <>
      {isLoading ? (
        <div
          className="flex min-h-[320px] items-center justify-center"
          role="status"
          aria-label="Loading gallery"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#14b8a6]" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#cfe3f0] bg-white/75 p-8 text-center text-lg text-[#b91c1c] backdrop-blur-sm">
          {error}
        </div>
      ) : galleryMedia.length === 0 ? (
        <div className="rounded-2xl border border-[#cfe3f0] bg-white/75 p-8 text-center text-lg text-[#20505c] backdrop-blur-sm">
          No media available.
        </div>
      ) : (
        <>
          <div className={gridClass}>
            {visibleItems.map((item, index) => (
              <EventGalleryCard
                key={item.id || `gallery-${index}`}
                item={item}
                onClick={() => handleOpenMedia(item)}
                animationDelay={index * 60}
                large={isLanding}
              />
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="mt-10 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#14b8a6]" />
            </div>
          )}
        </>
      )}
    </>
  );

  if (isLanding) {
    return (
      <>
        <div style={{ background: GALLERY_PAGE_BACKGROUND }}>
          <LandingEventsBody>
            <DesktopScaleCanvas>
              {header}
              <div className="relative overflow-hidden rounded-3xl border border-[#cfe3f0] bg-white/70 p-8 shadow-[0_10px_34px_rgba(15,47,87,0.1)] backdrop-blur-sm">
                {/* Corner tints so the panel reads as lit rather than flat. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#2563eb]/[0.07] blur-[80px]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#2dd4bf]/10 blur-[80px]"
                />
                <div className="relative">{galleryBody}</div>
              </div>
            </DesktopScaleCanvas>
          </LandingEventsBody>
        </div>
        {mediaModal}
      </>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={{ background: GALLERY_PAGE_BACKGROUND }}
    >
      <div className="w-full shrink-0" style={{ background: "transparent" }}>
        <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
          {header}
        </div>
      </div>

      <div className="container mx-auto flex min-h-0 max-w-6xl flex-1 flex-col px-4 pb-6 md:pb-8">
        <div
          ref={contentScrollRef}
          className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[#cfe3f0] bg-white/70 p-4 pr-5 shadow-[0_10px_34px_rgba(15,47,87,0.1)] backdrop-blur-sm md:p-6 md:pr-8"
        >
          {galleryBody}
        </div>
      </div>

      {mediaModal}
    </div>
  );
}
