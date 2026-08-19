import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import EventCard from "@/components/events/EventCard";
import EventMediaModal from "@/components/events/EventMediaModal";
import { LandingEventsBody, LandingEventsHero } from "@/components/landing/LandingEventsShell";
import DesktopScaleCanvas from "@/components/landing/DesktopScaleCanvas";
import { dislikeEvent, getEventById, getEventsFeed, likeEvent } from "@/api/eventsApi";
import { getGalleryBasePath } from "@/lib/appNavigation";

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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreEvents();
      },
      {
        root: isLanding ? null : listScrollRef.current,
        rootMargin: "320px 0px",
        threshold: 0.01,
      },
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
              ? "h-12 w-full rounded-xl border-[#d9d9d9] bg-white pr-11 text-lg focus-visible:ring-[#171c8f]/20"
              : "h-11 border-gray-300 bg-white pr-11 text-sm focus:border-gray-300 focus:outline-none focus:ring-0"
          }
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600"
          aria-label="Search gallery"
        >
          <Search className="h-5 w-5" />
        </button>
      </form>
      {/* <p className="mt-1 text-xs text-[#757575]">
        You can search upto 500 characters.
      </p> */}
    </div>
  );

  const loadingCards = (
    <div className="space-y-7 px-[1px]">
      {[0, 1, 2].map((index) => (
        <div
          key={`events-loading-${index}`}
          className="rounded-2xl border border-[#d9d9d9] bg-white px-[54px] py-6"
        >
          <div className="space-y-5">
            <div className="h-7 w-3/5 animate-pulse rounded-md bg-gray-200" />
            <div className="flex gap-2">
              <div className="h-7 w-24 animate-pulse rounded-md bg-gray-200" />
              <div className="h-7 w-20 animate-pulse rounded-md bg-gray-200" />
            </div>
            <div className="h-6 w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-6 w-4/5 animate-pulse rounded-md bg-gray-200" />
            <div className="grid grid-cols-3 gap-5">
              {[0, 1, 2].map((mediaIndex) => (
                <div
                  key={`events-loading-media-${index}-${mediaIndex}`}
                  className="aspect-video animate-pulse rounded-2xl bg-gray-200"
                />
              ))}
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 text-sm text-[#757575]">
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
        <div className="rounded-2xl border bg-white p-8 text-center text-sm text-red-600">
          <p>{error}</p>
          <button
            type="button"
            className="mt-3 rounded-md border border-[#171c8f] px-3 py-1 text-sm font-medium text-[#171c8f]"
            onClick={retrySearch}
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">
          {searchQuery
            ? "No gallery items match your search."
            : "No gallery items available at the moment. Please check back later."}
        </div>
      ) : (
        <div className="space-y-7 px-[1px]">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onOpenMedia={handleOpenMedia}
              onViewAllMedia={handleViewAllMedia}
              onToggleLike={handleToggleLike}
              isLikeUpdating={Boolean(likeUpdatingMap[event.id])}
            />
          ))}
          <div
            ref={loadMoreRef}
            className="flex min-h-10 items-center justify-center text-sm text-[#757575]"
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
        <LandingEventsHero sticky>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <h1 className="shrink-0 text-[40px] font-bold leading-tight text-[#171c4d]">
              Gallery
            </h1>
            <div className="w-full min-w-0 max-w-[520px] lg:ml-auto">
              {searchField}
            </div>
          </div>
        </LandingEventsHero>
        {/* Shell gutters stay outside the scale canvas so the left edge matches the navbar logo. */}
        <LandingEventsBody>
          <DesktopScaleCanvas>{eventsList}</DesktopScaleCanvas>
        </LandingEventsBody>
        {mediaModal}
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-secondary">
      <div className="w-full shrink-0 py-6 md:py-8">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold tracking-tight">
            Gallery
          </h1>
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
