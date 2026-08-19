import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import EventGalleryCard from "@/components/events/EventGalleryCard";
import EventMediaModal from "@/components/events/EventMediaModal";
import EventTruncatedText from "@/components/events/EventTruncatedText";
import DesktopScaleCanvas from "@/components/landing/DesktopScaleCanvas";
import { LandingEventsBody } from "@/components/landing/LandingEventsShell";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { getEventById } from "@/api/eventsApi";
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
  const [page, setPage] = useState(1);
  const contentScrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      try {
        setIsLoading(true);
        setError("");
        setPage(1);
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

  const playableMedia = useMemo(
    () =>
      galleryMedia.filter((item) => item?.url || item?.thumbnailUrl),
    [galleryMedia],
  );

  const totalPages = Math.max(1, Math.ceil(galleryMedia.length / GALLERY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = galleryMedia.slice(
    (currentPage - 1) * GALLERY_PAGE_SIZE,
    currentPage * GALLERY_PAGE_SIZE,
  );

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

  const handlePageChange = useCallback((nextPage) => {
    setPage(nextPage);
    if (isLanding) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [isLanding]);

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

  const header = (
    <div className="mb-8 flex flex-wrap items-center gap-4">
      <Button
        variant="link"
        onClick={() => navigate(galleryBase)}
        aria-label="Go back"
        className="flex h-auto items-center gap-1 shrink-0 rounded-md bg-blue-300 px-2 py-1 m-0 no-underline transition-colors duration-150 hover:bg-blue-500 hover:text-white hover:no-underline"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back</span>
      </Button>

      {isLoading ? null : (
        <EventTruncatedText
          text={galleryTitle}
          as="h1"
          className="min-w-0 text-2xl font-semibold leading-[1.2] tracking-[-0.48px] text-[#1e1e1e]"
        />
      )}
    </div>
  );

  const galleryBody = (
    <>
      {isLoading ? (
        <div
          className="flex min-h-[320px] items-center justify-center"
          role="status"
          aria-label="Loading gallery"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2563eb]" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#d9d9d9] bg-white p-8 text-center text-lg text-red-600">
          {error}
        </div>
      ) : galleryMedia.length === 0 ? (
        <div className="rounded-2xl border border-[#d9d9d9] bg-white p-8 text-center text-lg text-[#757575]">
          No media available.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-x-5 gap-y-7">
            {pageItems.map((item, index) => (
              <EventGalleryCard
                key={item.id || `gallery-${index}`}
                item={item}
                onClick={() => handleOpenMedia(item)}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-10 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );

  if (isLanding) {
    return (
      <>
        {/* Keep modal outside the scale canvas so fixed + blur cover the viewport
            the same way as the Gallery feed. */}
        <LandingEventsBody>
          <DesktopScaleCanvas>
            {header}
            {galleryBody}
          </DesktopScaleCanvas>
        </LandingEventsBody>
        {mediaModal}
      </>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-secondary"
      style={{ backgroundColor: "var(--sds-bg-secondary)" }}
    >
      <div className="w-full shrink-0 bg-secondary">
        <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
          {header}
        </div>
      </div>

      <div className="container mx-auto flex min-h-0 max-w-6xl flex-1 flex-col px-4 pb-6 md:pb-8">
        <div
          ref={contentScrollRef}
          className="min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-white/70 p-4 pr-5 shadow-sm md:p-6 md:pr-8"
          style={{ borderColor: "var(--sds-border-default)" }}
        >
          {galleryBody}
        </div>
      </div>

      {mediaModal}
    </div>
  );
}
