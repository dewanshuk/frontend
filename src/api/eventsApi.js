import moment from "moment";
import { DATE_FORMAT_MOMENT } from "../config";
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from "../constant";
import { docEventsApi } from "./axiosInstance";

const PLACEHOLDER_MEDIA = [
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80",
];

const MOCK_EVENTS = [
  {
    id: "mock-event-1",
    title: "Compliance Month",
    categoryLabel: "Compliance Webinar",
    date: "06/JAN/2026",
    tags: ["Gifting", "Compliance", "Policy"],
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    media: [
      { id: "m1", type: "image", url: PLACEHOLDER_MEDIA[0] },
      { id: "m2", type: "image", url: PLACEHOLDER_MEDIA[1] },
      { id: "m3", type: "video", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", thumbnailUrl: PLACEHOLDER_MEDIA[2] },
    ],
    likes: 50,
    remainingMediaCount: 44,
  },
  {
    id: "mock-event-2",
    title: "Annual Ethics Townhall",
    categoryLabel: "Leadership Connect",
    date: "18/FEB/2026",
    tags: ["Ethics", "Leadership"],
    description:
      "Join leaders across divisions for a discussion on ethical decision-making, reporting channels, and upcoming policy updates for the financial year.",
    media: [
      { id: "m2-1", type: "image", url: PLACEHOLDER_MEDIA[1] },
      { id: "m2-2", type: "image", url: PLACEHOLDER_MEDIA[0] },
      { id: "m2-3", type: "video", url: PLACEHOLDER_MEDIA[2], thumbnailUrl: PLACEHOLDER_MEDIA[2] },
    ],
    likes: 32,
    remainingMediaCount: 0,
  },
];

const getFileExtension = (fileName = "") => {
  const normalized = String(fileName).toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex) : "";
};

const getMediaType = (fileItem) => {
  const fileType = String(fileItem?.file_type || "").toUpperCase();
  if (fileType === "IMAGE") return "image";
  if (fileType === "VIDEO") return "video";

  const fileName = fileItem?.original_filename || fileItem?.name || "";
  const extension = getFileExtension(fileName);
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (VIDEO_EXTENSIONS.includes(extension)) return "video";
  return "image";
};

const formatEventDate = (value) => {
  if (!value) return "";
  const parsed = moment(value);
  if (!parsed.isValid()) return String(value);
  return parsed.format(DATE_FORMAT_MOMENT).toUpperCase();
};

const formatEventDateRange = (eventDates = [], fallbackDate) => {
  const normalizedDates = (Array.isArray(eventDates) ? eventDates : [])
    .map((value) => formatEventDate(value))
    .filter(Boolean);

  if (normalizedDates.length >= 2) {
    const startDate = normalizedDates[0];
    const endDate = normalizedDates[normalizedDates.length - 1];
    return `${startDate} - ${endDate}`;
  }

  if (normalizedDates.length === 1) {
    return `${normalizedDates[0]} - ${normalizedDates[0]}`;
  }

  const fallback = formatEventDate(fallbackDate);
  return fallback ? `${fallback} - ${fallback}` : "";
};

const mapFileToMedia = (fileItem, index) => ({
  id: String(fileItem?.id ?? `file-${index}`),
  type: getMediaType(fileItem),
  url: fileItem?.file_url || fileItem?.url || fileItem?.thumbnail_url || null,
  thumbnailUrl: fileItem?.thumbnail_url || fileItem?.file_url || fileItem?.url || null,
  caption: String(fileItem?.caption || "").trim(),
});

const mapToEvent = (item, detail) => {
  const source = detail || item || {};
  const files = Array.isArray(source.files)
    ? source.files
    : Array.isArray(source.preview_media)
      ? source.preview_media
    : Array.isArray(source.media)
      ? source.media
      : [];
  const eventDates = Array.isArray(source.event_dates) ? source.event_dates : [];

  return {
    id: String(source.id ?? item?.id ?? ""),
    title: source.event_name || source.name || "Untitled Event",
    subEventName: source.sub_event_name || source.subEventName || "",
    categoryLabel: source.sub_event_name || source.document_type || "Event",
    date: formatEventDateRange(eventDates, source.created_at || source.updated_at),
    tags: Array.isArray(source.tags) ? source.tags : [],
    description: source.summary || source.description || "",
    media: files.map(mapFileToMedia),
    likes: Number(source.like_count ?? source.likes_count ?? source.likes ?? 0) || 0,
    isLiked: Boolean(
      source.liked_by_me ?? source.is_liked ?? source.liked ?? source.user_liked ?? false,
    ),
    remainingMediaCount: Number(source.remaining_media_count ?? source.remainingMediaCount ?? 0) || 0,
  };
};

export const getEventsFeed = async ({ page = 1, page_size = 10, search } = {}) => {
  try {
    const response = await docEventsApi.get("/api/doc-events/events-page", {
      params: {
        page,
        page_size,
        ...(search?.trim() ? { search: search.trim() } : {}),
      },
    });
    const data = response?.data ?? {};
    const items = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];

    if (items.length === 0) {
      return {
        data: [],
        total: Number(data?.total ?? data?.count ?? 0),
      };
    }

    const mappedEvents = items.map((item) => mapToEvent(item, item));
    return {
      data: mappedEvents,
      total: Number(data?.total ?? data?.count ?? mappedEvents.length),
    };
  } catch {
    throw new Error("Unable to load events.");
  }
};

export const likeEvent = async (eventId) => {
  if (!eventId) return null;
  const response = await docEventsApi.post(
    `/api/doc-events/events-page/${encodeURIComponent(eventId)}/like`,
    {},
  );
  return response?.data;
};

export const dislikeEvent = async (eventId) => {
  if (!eventId) return null;
  const response = await docEventsApi.delete(
    `/api/doc-events/events-page/${encodeURIComponent(eventId)}/like`,
  );
  return response?.data;
};

export const getEventById = async (eventId) => {
  const mockEvent = MOCK_EVENTS.find((event) => event.id === eventId);
  if (mockEvent) return mockEvent;

  if (!eventId) return null;

  const response = await docEventsApi.get(
    `/api/doc-events/events-page/event/${encodeURIComponent(eventId)}`,
  );
  const payload = response?.data ?? {};
  const detail = payload?.data ?? payload;
  if (detail?.id == null) return null;
  return mapToEvent(detail, detail);
};
