import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import EventCard from "@/components/events/EventCard";
import EventMediaModal from "@/components/events/EventMediaModal";
import { landingShellInnerClassName } from "@/components/landing/landingTheme";
import DesktopScaleCanvas from "@/components/landing/DesktopScaleCanvas";
import { dislikeEvent, getEventById, getEventsFeed, likeEvent } from "@/api/eventsApi";
import { getGalleryBasePath } from "@/lib/appNavigation";
import { cn } from "@/lib/utils";
import {
  GALLERY_PAGE_BACKGROUND,
} from "@/components/events/galleryTheme";

const EVENTS_PAGE_SIZE = 20;
const EVENTS_SEARCH_MAX_CHARS = 500;

const getEventsListStateKey = (isLanding) =>
  `ecp:events-list-state:${isLanding ? "landing" : "default"}`;

const readEventsListState = (isLanding) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(getEventsListStateKey(isLanding));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeEventsListState = (isLanding, state) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      getEventsListStateKey(isLanding),
      JSON.stringify(state),
    );
  } catch {
    // ignore quota / private mode failures
  }
};

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

/**
 * Decorative header art for the landing Gallery hero.
 *
 * Painted with low-alpha tints only (no opaque gradients) so it dissolves into
 * the hero gradient instead of reading as a pasted illustration — same
 * treatment as the Knowledge Hub hero art.
 */
function GalleryHeroArt({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 380 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft background blooms */}
      <circle cx="320" cy="30" r="60" fill="rgba(37,99,235,0.06)" />
      <circle cx="280" cy="140" r="40" fill="rgba(45,212,191,0.08)" />

      {/* Camera */}
      <g>
        <rect x="258" y="52" width="76" height="56" rx="10" fill="rgba(37,99,235,0.14)" />
        <rect x="278" y="44" width="26" height="10" rx="4" fill="rgba(37,99,235,0.18)" />
        <circle cx="296" cy="80" r="19" fill="rgba(45,212,191,0.24)" />
        <circle cx="296" cy="80" r="11" fill="rgba(45,212,191,0.4)" />
        <circle cx="296" cy="80" r="4" fill="rgba(255,255,255,0.6)" />
        <rect x="264" y="58" width="10" height="5" rx="2.5" fill="rgba(255,255,255,0.5)" />
        {/* Flash burst */}
        <path d="M296 30 v-8" stroke="rgba(45,212,191,0.5)" strokeWidth="2" strokeLinecap="round" />
        <path d="M266 40 l-6 -6" stroke="rgba(45,212,191,0.4)" strokeWidth="2" strokeLinecap="round" />
        <path d="M326 40 l6 -6" stroke="rgba(45,212,191,0.4)" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Photo stack */}
      <rect x="158" y="78" width="58" height="68" rx="5" fill="rgba(37,99,235,0.1)" transform="rotate(-7 187 112)" />
      <rect x="166" y="72" width="58" height="68" rx="5" fill="rgba(37,99,235,0.15)" transform="rotate(-3 195 106)" />
      <rect x="174" y="66" width="58" height="68" rx="5" fill="rgba(255,255,255,0.5)" stroke="rgba(37,99,235,0.2)" strokeWidth="1" />
      {/* Landscape inside the top photo */}
      <circle cx="192" cy="83" r="6" fill="rgba(45,212,191,0.55)" />
      <path d="M180 116 L196 98 L208 110 L216 102 L226 116 L226 126 L180 126 Z" fill="rgba(37,99,235,0.22)" />
      <rect x="180" y="130" width="30" height="2" rx="1" fill="rgba(37,99,235,0.25)" />

      {/* Play / video tile */}
      <g transform="translate(100, 108)">
        <rect x="0" y="0" width="52" height="42" rx="8" fill="rgba(239,68,68,0.1)" />
        <path d="M20 12 L36 21 L20 30 Z" fill="rgba(239,68,68,0.35)" />
      </g>

      {/* Floating accents */}
      <circle cx="140" cy="52" r="6" fill="rgba(37,99,235,0.25)" />
      <circle cx="340" cy="130" r="5" fill="rgba(45,212,191,0.35)" />
      <circle cx="120" cy="168" r="4" fill="rgba(236,72,153,0.2)" />
      <circle cx="352" cy="82" r="3" fill="rgba(37,99,235,0.3)" />

      {/* Sparkles */}
      <path d="M330 162 l0 -6 l0 12 l0 -6 l-6 0 l12 0 l-6 0" stroke="rgba(45,212,191,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M150 92 l0 -4 l0 8 l0 -4 l-4 0 l8 0 l-4 0" stroke="rgba(37,99,235,0.4)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export default function Events({ variant = "default" }) {
  const isLanding = variant === "landing";
  const navigate = useNavigate();
  const savedStateRef = useRef(null);
  if (savedStateRef.current === null) {
    savedStateRef.current = readEventsListState(isLanding);
  }
  const savedState = savedStateRef.current;

  const [searchInput, setSearchInput] = useState(
    () => String(savedState?.searchInput ?? savedState?.searchQuery ?? ""),
  );
  const [searchQuery, setSearchQuery] = useState(
    () => String(savedState?.searchQuery ?? ""),
  );
  const [searchRunId, setSearchRunId] = useState(0);
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [likeUpdatingMap, setLikeUpdatingMap] = useState({});
  const [viewerState, setViewerState] = useState(null);
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);
  const loadMoreRef = useRef(null);
  const listScrollRef = useRef(null);
  const eventMediaCacheRef = useRef({});
  const activeSearchRef = useRef(searchQuery);
  const pendingScrollRef = useRef(
    Number.isFinite(savedState?.scrollY) ? Number(savedState.scrollY) : null,
  );
  const pendingPageRef = useRef(
    Number.isFinite(savedState?.page) && savedState.page > 1
      ? Math.floor(savedState.page)
      : 1,
  );
  const restoreDoneRef = useRef(false);
  const getScrollTop = useCallback(() => {
    if (isLanding) return window.scrollY || window.pageYOffset || 0;
    return listScrollRef.current?.scrollTop ?? 0;
  }, [isLanding]);

  const setScrollTop = useCallback(
    (value) => {
      const next = Math.max(0, Number(value) || 0);
      if (isLanding) {
        window.scrollTo({ top: next, left: 0, behavior: "auto" });
        return;
      }
      if (listScrollRef.current) {
        listScrollRef.current.scrollTop = next;
      }
    },
    [isLanding],
  );

  const persistListState = useCallback(
    (overrides = {}) => {
      writeEventsListState(isLanding, {
        searchInput,
        searchQuery,
        scrollY: getScrollTop(),
        page,
        ...overrides,
      });
    },
    [getScrollTop, isLanding, page, searchInput, searchQuery],
  );

  useEffect(() => {
    let cancelled = false;
    activeSearchRef.current = searchQuery;

    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setIsLoadingMore(false);
        setError("");
        setLoadMoreError("");

        const targetPage = Math.max(1, pendingPageRef.current || 1);
        pendingPageRef.current = 1;
        const pageSize = EVENTS_PAGE_SIZE * targetPage;

        const response = await getEventsFeed({
          page: 1,
          page_size: pageSize,
          search: searchQuery,
        });
        if (!cancelled) {
          const nextEvents = response?.data || [];
          setEvents(nextEvents);
          setTotal(Number(response?.total) || nextEvents.length);
          setPage(Math.max(1, Math.ceil(nextEvents.length / EVENTS_PAGE_SIZE) || 1));
        }
      } catch {
        if (!cancelled) {
          setEvents([]);
          setTotal(0);
          setPage(1);
          setError("Unable to load Gallery. Please refresh.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [searchQuery, searchRunId]);

  useLayoutEffect(() => {
    if (isLoading || restoreDoneRef.current) return;
    if (pendingScrollRef.current == null) {
      restoreDoneRef.current = true;
      return;
    }

    const target = pendingScrollRef.current;
    pendingScrollRef.current = null;
    restoreDoneRef.current = true;

    // Wait for layout (and LandingV2Shell scroll-to-top) to settle.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setScrollTop(target);
        persistListState({ scrollY: target });
      });
    });
  }, [isLoading, events.length, persistListState, setScrollTop]);

  useEffect(() => {
    persistListState();
  }, [persistListState]);

  const hasMore = events.length < total;

  const loadMoreEvents = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore) return;

    const requestedSearch = searchQuery;
    const nextPage = page + 1;

    try {
      setIsLoadingMore(true);
      setLoadMoreError("");
      const response = await getEventsFeed({
        page: nextPage,
        page_size: EVENTS_PAGE_SIZE,
        search: requestedSearch,
      });

      if (activeSearchRef.current !== requestedSearch) return;

      const incomingEvents = response?.data || [];
      setEvents((current) => {
        const knownIds = new Set(current.map((event) => event.id));
        return [
          ...current,
          ...incomingEvents.filter((event) => !knownIds.has(event.id)),
        ];
      });
      if (incomingEvents.length === 0) {
        setTotal(events.length);
      } else {
        setTotal((current) => Number(response?.total) || current);
      }
      setPage(nextPage);
    } catch {
      if (activeSearchRef.current === requestedSearch) {
        setLoadMoreError("Unable to load more gallery items.");
      }
    } finally {
      if (activeSearchRef.current === requestedSearch) {
        setIsLoadingMore(false);
      }
    }
  }, [events.length, hasMore, isLoading, isLoadingMore, page, searchQuery]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore || isLoading || isLoadingMore) return undefined;

    const root = isLanding ? null : listScrollRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreEvents();
      },
      { root, rootMargin: "320px 0px", threshold: 0.01 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLanding, isLoading, isLoadingMore, loadMoreEvents]);

  const openEventMediaViewer = useCallback(async (event, startIndex = 0) => {
    if (!event?.id || isLoadingViewer) return;

    const eventId = String(event.id);
    const resolvePlayable = (source, index) => {
      const allMedia = Array.isArray(source?.media) ? source.media : [];
      const playableMedia = allMedia.filter(
        (item) => item?.url || item?.thumbnailUrl,
      );
      if (playableMedia.length === 0) {
        return { playableMedia: [], playableIndex: 0 };
      }

      let playableIndex = 0;
      for (let i = 0, seen = 0; i < allMedia.length; i += 1) {
        if (!(allMedia[i]?.url || allMedia[i]?.thumbnailUrl)) continue;
        if (i >= index) {
          playableIndex = seen;
          break;
        }
        seen += 1;
        playableIndex = seen;
      }

      return {
        playableMedia,
        playableIndex: Math.min(playableIndex, playableMedia.length - 1),
      };
    };

    const initial = resolvePlayable(event, startIndex);
    if (initial.playableMedia.length === 0 && !eventMediaCacheRef.current[eventId]) {
      // Still try detail API when feed has no preview media.
    } else if (initial.playableMedia.length > 0) {
      setViewerState({
        title: getEventDisplayTitle(event),
        description: event.description,
        media: initial.playableMedia,
        index: initial.playableIndex,
        eventId,
      });
    }

    let detail = eventMediaCacheRef.current[eventId] || null;
    if (!detail) {
      setIsLoadingViewer(true);
      try {
        detail = await getEventById(eventId);
        if (detail) {
          eventMediaCacheRef.current[eventId] = detail;
          setEvents((current) =>
            current.map((item) =>
              String(item.id) === eventId
                ? {
                    ...item,
                    media: detail.media,
                    description: detail.description || item.description,
                    remainingMediaCount: 0,
                  }
                : item,
            ),
          );
        }
      } catch {
        detail = null;
      } finally {
        setIsLoadingViewer(false);
      }
    }

    const source = detail || event;
    const resolved = resolvePlayable(source, startIndex);
    if (resolved.playableMedia.length === 0) return;

    setViewerState({
      title: getEventDisplayTitle(source),
      description: source.description || event.description,
      media: resolved.playableMedia,
      index: resolved.playableIndex,
      eventId,
    });
  }, [isLoadingViewer]);

  const handleOpenMedia = (event, startIndex = 0) => {
    openEventMediaViewer(event, startIndex);
  };

  const handleToggleLike = useCallback(async (eventItem) => {
    const eventId = eventItem?.id;
    if (!eventId || likeUpdatingMap[eventId]) return;

    const currentlyLiked = Boolean(eventItem.isLiked);
    const nextLiked = !currentlyLiked;

    setLikeUpdatingMap((current) => ({ ...current, [eventId]: true }));
    setEvents((current) =>
      current.map((event) =>
        String(event.id) === String(eventId)
          ? {
              ...event,
              isLiked: nextLiked,
              likes: Math.max(0, Number(event.likes ?? 0) + (nextLiked ? 1 : -1)),
            }
          : event,
      ),
    );

    try {
      if (nextLiked) {
        await likeEvent(eventId);
      } else {
        await dislikeEvent(eventId);
      }
    } catch {
      setEvents((current) =>
        current.map((event) =>
          String(event.id) === String(eventId)
            ? {
                ...event,
                isLiked: currentlyLiked,
                likes: Math.max(0, Number(event.likes ?? 0) + (currentlyLiked ? 1 : -1)),
              }
            : event,
        ),
      );
    } finally {
      setLikeUpdatingMap((current) => {
        const next = { ...current };
        delete next[eventId];
        return next;
      });
    }
  }, [likeUpdatingMap]);

  const handleViewAllMedia = (event) => {
    if (!event?.id) return;
    persistListState({
      searchInput,
      searchQuery,
      scrollY: getScrollTop(),
      page,
    });
    // +N overflow tile always opens the full gallery page.
    navigate(`${getGalleryBasePath({ landing: true })}/${event.id}/gallery`);
  };

  const runSearch = useCallback(() => {
    const normalizedQuery = searchInput.trim().slice(0, EVENTS_SEARCH_MAX_CHARS);
    pendingScrollRef.current = null;
    pendingPageRef.current = 1;
    restoreDoneRef.current = true;
    setSearchInput(normalizedQuery);
    setSearchQuery(normalizedQuery);
    setSearchRunId((current) => current + 1);
    writeEventsListState(isLanding, {
      searchInput,
      searchQuery: normalizedQuery,
      scrollY: 0,
      page: 1,
    });
    setScrollTop(0);
  }, [isLanding, searchInput, setScrollTop]);

  const retrySearch = useCallback(() => {
    setSearchRunId((current) => current + 1);
  }, []);

  const searchField = (
    <div className="max-w-full">
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
      >
        <Search
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7fa8]",
            isLanding ? "h-5 w-5" : "h-5 w-5",
          )}
        />
        <Input
          value={searchInput}
          onChange={(event) =>
            setSearchInput(event.target.value.slice(0, EVENTS_SEARCH_MAX_CHARS))
          }
          placeholder="Search Gallery..."
          aria-label="Search gallery"
          maxLength={EVENTS_SEARCH_MAX_CHARS}
          className={
            isLanding
              ? "h-14 w-full rounded-full border-transparent bg-white pl-12 pr-16 text-lg text-[#0f2f57] placeholder:text-[#7aa8ad] shadow-[0_2px_12px_rgba(16,24,40,0.08)] ring-1 ring-[#b9dfe4] transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-[#2563eb]/40"
              : "h-11 border-[#b9dfe4] bg-white pr-11 text-sm text-[#20505c] placeholder:text-[#7aa8ad] focus:border-[#5eead4] focus:outline-none focus:ring-0"
          }
        />
        {isLanding ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-white shadow-sm"
            style={{ backgroundImage: "linear-gradient(140deg, #2563eb 0%, #0d9488 100%)" }}
          >
            <Search className="h-5 w-5" strokeWidth={2.2} />
          </span>
        ) : (
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0d9488] transition hover:text-[#0f766e]"
            aria-label="Search gallery"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
      </form>
      {/* <p className="mt-1 text-xs text-[#757575]">
        You can search upto 500 characters.
      </p> */}
    </div>
  );

  const loadingCards = (
    <div className="space-y-5">
      {[0, 1, 2].map((index) => (
        <div key={`events-loading-${index}`} className="overflow-hidden rounded-2xl border border-[#cfe3f0] bg-white/75 shadow-[0_6px_22px_rgba(15,47,87,0.08)] backdrop-blur-sm">
          {/* header skeleton */}
          <div className="flex items-center gap-3 border-b border-[#dcebf4] px-6 py-4">
            <div className="h-11 w-11 animate-pulse rounded-full bg-[#d3e6f2]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 animate-pulse rounded bg-[#d3e6f2]" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-[#e3f0f7]" />
            </div>
          </div>
          {/* body skeleton */}
          <div className="space-y-4 px-6 py-5">
            <div className="flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#d3e6f2]" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-[#d3e6f2]" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-[#e3f0f7]" />
              <div className="h-4 w-full animate-pulse rounded bg-[#e3f0f7]" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-[#e3f0f7]" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((mediaIndex) => (
                <div key={`events-loading-media-${index}-${mediaIndex}`} className="aspect-video animate-pulse rounded-xl bg-[#d3e6f2]" />
              ))}
            </div>
          </div>
          {/* footer skeleton */}
          <div className="flex items-center gap-4 border-t border-[#dcebf4] px-6 py-3">
            <div className="h-7 w-16 animate-pulse rounded-full bg-[#d3e6f2]" />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 text-sm text-[#4a7f87]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading gallery...</span>
      </div>
    </div>
  );

  const eventsList = (
    <>
      {isLoading ? (
        loadingCards
      ) : error ? (
        <div className="rounded-2xl border border-[#cfe3f0] bg-white/75 p-8 text-center text-sm text-[#b91c1c] shadow-[0_6px_22px_rgba(15,47,87,0.08)] backdrop-blur-sm">
          <p>{error}</p>
          <button
            type="button"
            className="mt-3 rounded-md border border-[#5eead4] px-3 py-1 text-sm font-medium text-[#0f766e] transition hover:bg-[#f0fdfa]"
            onClick={retrySearch}
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-[#cfe3f0] bg-white/75 p-8 text-center text-sm text-[#20505c] shadow-[0_6px_22px_rgba(15,47,87,0.08)] backdrop-blur-sm">
          {searchQuery
            ? "No gallery items match your search."
            : "No gallery items available at the moment. Please check back later."}
        </div>
      ) : (
        <div className="space-y-5 px-[1px]">
          {events.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              onOpenMedia={handleOpenMedia}
              onViewAllMedia={handleViewAllMedia}
              onToggleLike={handleToggleLike}
              isLikeUpdating={Boolean(likeUpdatingMap[event.id])}
              animationDelay={index * 80}
            />
          ))}
          <div
            ref={loadMoreRef}
            className="flex min-h-10 items-center justify-center text-sm text-[#4a7f87]"
            aria-live="polite"
          >
            {isLoadingMore
              ? "Loading more gallery items..."
              : loadMoreError
                ? loadMoreError
                : hasMore
                  ? "Scroll to load more"
                  : "You’ve reached the end"}
          </div>
        </div>
      )}
    </>
  );

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

  if (isLanding) {
    return (
      <>
        <div className="min-h-screen" style={{ background: GALLERY_PAGE_BACKGROUND }}>
          <div className={landingShellInnerClassName("pb-16 pt-8 md:pt-10")}>
            {/* Hero section — flows into body like FAQ page */}
            <div className="relative overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-2 z-0 hidden select-none md:block lg:-right-4"
              >
                <GalleryHeroArt className="h-[200px] w-auto opacity-90" />
              </div>

              <div className="relative z-[1] max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight text-[#1a1f36] md:text-4xl lg:text-[42px]">
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ color: "black" }}
                  >
                    Gallery
                  </span>
                </h1>

                <div aria-hidden="true" className="mt-3 flex items-center gap-1.5">
                  <span
                    className="h-1 w-16 rounded-full"
                    style={{ backgroundImage: "linear-gradient(90deg, #2563eb 0%, #2dd4bf 100%)" }}
                  />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" />
                </div>

                <div className="mt-7 max-w-xl md:max-w-2xl">
                  {searchField}
                </div>
              </div>
            </div>

            {/* Event list — seamless continuation */}
            <div className="mt-9 md:mt-10">
              <DesktopScaleCanvas>
                <div className="min-h-screen px-2 py-4">
                  {eventsList}
                </div>
              </DesktopScaleCanvas>
            </div>
          </div>
        </div>
        {mediaModal}
      </>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden"
      style={{ background: GALLERY_PAGE_BACKGROUND }}
    >
      <div className="w-full shrink-0 py-6 md:py-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-6 w-[3px] rounded-full bg-gradient-to-b from-[#2563eb] to-[#14b8a6]" />
            <h1 className="text-xl font-semibold tracking-tight text-[#0f2f57]">
              Gallery
            </h1>
          </div>
          {searchField}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col pb-6 md:pb-8">
        <div
          ref={listScrollRef}
          className="min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto pr-4"
        >
          {eventsList}
        </div>
      </div>

      {mediaModal}
    </div>
  );
}
