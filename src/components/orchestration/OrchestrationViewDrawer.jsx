import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { getOrchestrationItemDetail, getItemRevisions, getItemRevisionSnapshot } from "../../api/orchestration";
import moment from "moment";
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from "../../constant";
import { DATE_FORMAT_MOMENT } from "../../config";

const statusStyles = {
  ACTIVE: "bg-green-100 text-green-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  INACTIVE: "bg-gray-200 text-gray-600",
};

const formatValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "N/A";
  }

  return value || "N/A";
};

const formatDrawerDate = (value) => {
  if (!value) return "N/A";

  const m = moment(value);
  if (!m.isValid()) return value;
  return m.format(DATE_FORMAT_MOMENT).toUpperCase();
};

const formatRevisionDate = (value) => {
  if (!value) return "--/--/--";
  const m = moment(value);
  if (!m.isValid()) return value;
  return m.format(DATE_FORMAT_MOMENT).toUpperCase();
};

const getFileExtension = (fileName = "") => {
  const normalizedName = String(fileName).toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");

  return lastDotIndex >= 0 ? normalizedName.slice(lastDotIndex) : "";
};

const getEventFileType = (fileItem) => {
  const fileType = String(fileItem?.file_type || "").toUpperCase();

  if (fileType === "IMAGE") {
    return "photo";
  }

  if (fileType === "VIDEO") {
    return "video";
  }

  const fileName =
    fileItem?.original_filename || fileItem?.name || fileItem?.file?.name || "";
  const fileExtension = getFileExtension(fileName);

  if (IMAGE_EXTENSIONS.includes(fileExtension)) {
    return "photo";
  }

  if (VIDEO_EXTENSIONS.includes(fileExtension)) {
    return "video";
  }

  return null;
};

const getEventMediaSummary = (files = []) => {
  let photoCount = 0;
  let videoCount = 0;

  files.forEach((fileItem) => {
    const fileCategory = getEventFileType(fileItem);

    if (fileCategory === "photo") {
      photoCount += 1;
    }

    if (fileCategory === "video") {
      videoCount += 1;
    }
  });

  const parts = [];

  if (photoCount > 0) {
    parts.push(`${photoCount} Photo${photoCount === 1 ? "" : "s"}`);
  }

  if (videoCount > 0) {
    parts.push(`${videoCount} Video${videoCount === 1 ? "" : "s"}`);
  }

  return parts.length > 0 ? parts.join("; ") : "N/A";
};

const formatFileSize = (sizeInBytes) => {
  if (sizeInBytes == null) return "N/A";
  const bytes = Number(sizeInBytes);
  if (Number.isNaN(bytes)) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = -1;
  do {
    value = value / 1024;
    i++;
  } while (value >= 1024 && i < units.length - 1);
  const display = value >= 100 ? Math.round(value) : Number(value.toFixed(1));
  return `${display} ${units[i]}`;
};

const formatEventDateRange = (item) => {
  const eventDates = item?.event_dates;

  if (Array.isArray(eventDates) && eventDates.length >= 2) {
    return `${formatDrawerDate(eventDates[0])} to ${formatDrawerDate(eventDates[1])}`;
  }

  if (Array.isArray(eventDates) && eventDates.length === 1) {
    return formatDrawerDate(eventDates[0]);
  }

  const startDate = item?.start_date;
  const endDate = item?.end_date;

  if (startDate && endDate) {
    return `${formatDrawerDate(startDate)} to ${formatDrawerDate(endDate)}`;
  }

  if (startDate) {
    return formatDrawerDate(startDate);
  }

  return "N/A";
};

const normalizeRevisionNumber = (value) => {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickNonEmpty = (...values) => {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text !== "") return text;
  }
  return null;
};

const unwrapApiPayload = (response) => {
  if (!response) return null;
  // Prefer nested `.data` when it looks like an entity; otherwise use the response itself.
  const nested = response?.data;
  if (
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    (nested.version != null ||
      nested.name != null ||
      nested.id != null ||
      nested.current_revision_number != null ||
      nested.revision_number != null)
  ) {
    return nested;
  }
  if (
    typeof response === "object" &&
    !Array.isArray(response) &&
    (response.version != null ||
      response.name != null ||
      response.id != null ||
      response.current_revision_number != null ||
      response.revision_number != null)
  ) {
    return response;
  }
  return nested ?? response;
};

const getVersionLabel = (item, fallbackItem) => {
  const fromItem = pickNonEmpty(
    item?.version,
    item?.current_media_version,
    item?.media_version,
    item?.document_version,
    item?.current_version,
  );
  if (fromItem) return fromItem;

  const revisionNumber = pickNonEmpty(
    item?.current_revision_number,
    item?.revision_number,
    item?.minor_version,
  );
  if (revisionNumber) return revisionNumber;

  return (
    pickNonEmpty(
      fallbackItem?.version,
      fallbackItem?.current_media_version,
      fallbackItem?.current_version,
    ) || "N/A"
  );
};

const getRevisionOptionId = (revision, index) =>
  revision?.id ||
  revision?.revision_id ||
  revision?.uuid ||
  revision?.document_id ||
  `revision-${index}`;

const mapRevisionOption = (revision, fallbackItem, index) => {
  const revisionNumber = normalizeRevisionNumber(
    revision?.current_revision_number ??
      revision?.revision_number ??
      revision?.minor_version ??
      fallbackItem?.current_revision_number,
  );
  const label =
    revision?.label ||
    revision?.version_label ||
    (revisionNumber != null ? `Revision ${revisionNumber}` : "Revision");
  const dateValue =
    revision?.updated_at ||
    revision?.updated_on ||
    revision?.created_at ||
    revision?.date ||
    fallbackItem?.updated_at;

  return {
    id: getRevisionOptionId(revision, index),
    revisionNumber,
    label,
    dateLabel: formatRevisionDate(dateValue),
    searchText: `${label} ${formatRevisionDate(dateValue)}`.toLowerCase(),
    raw: revision,
  };
};

const getRevisionOptions = (item, fallbackItem) => {
  const revisionCollections = [
    item?.revisions,
    item?.revision_history,
    item?.revisionHistory,
    item?.media_versions,
    item?.versions,
  ];
  const revisions = revisionCollections.find(Array.isArray) || [];

  if (revisions.length > 0) {
    return revisions.map((revision, index) =>
      mapRevisionOption(revision, fallbackItem ?? item, index),
    );
  }

  return [
    mapRevisionOption(
      {
        ...item,
        id: item?.id ?? fallbackItem?.id ?? "current-revision",
        current_media_version:
          item?.current_media_version ?? fallbackItem?.current_media_version,
        current_revision_number:
          item?.current_revision_number ?? fallbackItem?.current_revision_number,
        updated_at: item?.updated_at ?? fallbackItem?.updated_at,
        label: `Revision ${
          item?.current_revision_number ?? fallbackItem?.current_revision_number ?? 1
        }`,
      },
      fallbackItem,
      0,
    ),
  ];
};

const mapItemForDrawer = (item, fallbackItem, itemMetadata = null) => {
  const metadata = itemMetadata ?? fallbackItem ?? item;

  return {
  id: item?.id ?? fallbackItem?.id ?? "N/A",
  name: item?.name ?? fallbackItem?.name ?? "N/A",
  status: item?.status ?? fallbackItem?.status ?? "N/A",
  type: item?.document_type ?? fallbackItem?.document_type ?? "N/A",
  version: getVersionLabel(item, fallbackItem),
  updatedBy:
    item?.updated_by ??
    fallbackItem?.updated_by ??
    item?.created_by ??
    "N/A",
  updatedOn:
    item?.updated_at ??
    fallbackItem?.updated_at ??
    item?.created_at ??
    "N/A",
  owner: item?.owner ?? fallbackItem?.owner ?? "N/A",
  applicability:
    item?.applicability_type ?? fallbackItem?.applicability_type ?? "N/A",
  nextReviewDate:
    item?.next_review_date ?? fallbackItem?.next_review_date ?? "N/A",
  tags: Array.isArray(item?.tags)
    ? item.tags
    : Array.isArray(fallbackItem?.tags)
      ? fallbackItem.tags
      : [],
  description: item?.summary ?? item?.description ?? "N/A",
  changeRemarks:
    item?.change_remarks ?? fallbackItem?.change_remarks ?? "N/A",
  files: Array.isArray(item?.files) ? item.files : [],
  eventName:
    item?.event_name ??
    item?.name ??
    fallbackItem?.event_name ??
    fallbackItem?.name ??
    "N/A",
  subEventName: item?.sub_event_name ?? fallbackItem?.sub_event_name ?? "N/A",
  eventDateRange: formatEventDateRange(item ?? fallbackItem),
  uploadedBy:
    item?.uploaded_by ??
    item?.created_by ??
    fallbackItem?.uploaded_by ??
    fallbackItem?.created_by ??
    "N/A",
  uploadedFilesSummary: getEventMediaSummary(
    Array.isArray(item?.files) ? item.files : [],
  ),
  deactivateRemarks:
    metadata?.deactivate_remarks ??
    metadata?.deactivation_remarks ??
    "N/A",
  deactivatedBy: metadata?.deactivated_by ?? "N/A",
  deactivatedOn: metadata?.deactivated_at ?? "N/A",
  linkedDocuments: (() => {
    const raw =
      item?.linked_document_details ??
      item?.linked_documents ??
      item?.linked_items ??
      fallbackItem?.linked_document_details ??
      fallbackItem?.linked_documents ??
      fallbackItem?.linked_items ??
      [];
    if (!Array.isArray(raw)) return [];
    return raw.map((d) => ({
      id: d?.id ?? d?.document_id ?? d?.item_id ?? null,
      name: d?.name ?? d?.document_name ?? d?.title ?? "",
      type: d?.document_type ?? d?.type ?? d?.item_type ?? "",
    })).filter((d) => d.id || d.name);
  })(),
  };
};

const getItemType = (src) =>
  src?.item_type ||
  (String(src?.document_type || "").toLowerCase() === "event" ? "event" : "document");

export default function OrchestrationViewDrawer({ isOpen, item, onClose }) {
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [revisions, setRevisions] = useState([]);
  const [revisionsFetched, setRevisionsFetched] = useState(false);
  const [revisionsError, setRevisionsError] = useState("");
  const [revisionSnapshot, setRevisionSnapshot] = useState(null);
  const [isRevisionLoading, setIsRevisionLoading] = useState(false);
  const [isRevisionMenuOpen, setIsRevisionMenuOpen] = useState(false);
  const [revisionSearch, setRevisionSearch] = useState("");
  const [selectedRevisionId, setSelectedRevisionId] = useState(null);
  const revisionMenuRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    const loadAll = async () => {
      if (!isOpen || !item?.id) {
        if (isCurrent) {
          setDetail(null);
          setRevisions([]);
          setRevisionsFetched(false);
          setRevisionSnapshot(null);
          setError("");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError("");
      setRevisionsError("");

      try {
        const itemType = getItemType(item);

        // Fetch the item detail first. If it fails, surface the error and stop.
        try {
          const detailRes = await getOrchestrationItemDetail({ item_id: item.id, item_type: itemType });
          if (isCurrent) {
            setDetail(detailRes?.data ?? null);
          }
        } catch (detailError) {
          if (isCurrent) {
            setDetail(null);
            setRevisions([]);
            setRevisionsFetched(false);
            setError(detailError?.message || "Failed to load item details.");
          }
          if (isCurrent) setIsLoading(false);
          return;
        }

        // Then fetch revisions; if revisions fail, keep detail visible and show a revision-specific error.
        try {
          const revisionsRes = await getItemRevisions({ item_id: item.id, item_type: itemType });
          if (isCurrent) {
            const revs = Array.isArray(revisionsRes?.data) ? revisionsRes.data : [];
            setRevisions(revs);
            setRevisionsFetched(true);
            setRevisionsError("");
          }
        } catch (revsError) {
          if (isCurrent) {
            setRevisions([]);
            setRevisionsFetched(true);
            setRevisionsError(revsError?.message || "Unable to load revision history.");
          }
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadAll();

    return () => {
      isCurrent = false;
    };
  }, [isOpen, item]);

  useEffect(() => {
    if (!isRevisionMenuOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (
        revisionMenuRef.current &&
        !revisionMenuRef.current.contains(event.target)
      ) {
        setIsRevisionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRevisionMenuOpen]);

  const revisionOptions = useMemo(() => {
    // If API returned revisions, use them. If API explicitly returned an empty list, treat as no revisions.
    if (revisions.length > 0) {
      return revisions.map((rev, index) => mapRevisionOption(rev, item, index));
    }
    if (revisionsFetched && revisions.length === 0) {
      return [];
    }

    // Fall back to extracting revision info from the detail object when revisions were not fetched.
    return getRevisionOptions(detail, item);
  }, [revisions, revisionsFetched, detail, item]);

  // Helper to extract a timestamp from a revision/raw object for sorting
  const getRevisionTimestamp = (revision) => {
    const raw = revision?.raw ?? revision ?? {};
    const candidates = [raw?.updated_at, raw?.updated_on, raw?.created_at, raw?.date];
    for (const c of candidates) {
      if (!c) continue;
      const ts = Date.parse(c);
      if (!Number.isNaN(ts)) return ts;
    }
    return NaN;
  };

  useEffect(() => {
    // Reset search/menu/snapshot whenever revisionOptions change
    setRevisionSearch("");
    setIsRevisionMenuOpen(false);
    setRevisionSnapshot(null);

    if (!revisionOptions || revisionOptions.length === 0) {
      setSelectedRevisionId(null);
      return;
    }

    // Prefer revision with the highest numeric revisionNumber, otherwise fall back to latest date
    const withNumbers = revisionOptions.filter((r) => typeof r.revisionNumber === "number");
    let preferred = null;

    if (withNumbers.length > 0) {
      preferred = withNumbers.reduce((acc, cur) => {
        if (!acc) return cur;
        if (cur.revisionNumber > acc.revisionNumber) return cur;
        if (cur.revisionNumber < acc.revisionNumber) return acc;
        // tie-breaker: use latest timestamp
        const aTs = getRevisionTimestamp(acc);
        const bTs = getRevisionTimestamp(cur);
        if (Number.isNaN(aTs)) return cur;
        if (Number.isNaN(bTs)) return acc;
        return bTs > aTs ? cur : acc;
      }, null);
    } else {
      preferred = revisionOptions.reduce((acc, cur) => {
        if (!acc) return cur;
        const aTs = getRevisionTimestamp(acc);
        const bTs = getRevisionTimestamp(cur);
        if (Number.isNaN(aTs)) return cur;
        if (Number.isNaN(bTs)) return acc;
        return bTs > aTs ? cur : acc;
      }, null);
    }

    if (!preferred) preferred = revisionOptions[0];

    setSelectedRevisionId(preferred?.id ?? null);

    // Auto-load snapshot only when revisions API returned a non-empty array — otherwise do not auto-fetch.
    if (revisionsFetched && revisions.length > 0 && preferred?.revisionNumber != null && item?.id) {
      let cancelled = false;
      setIsRevisionLoading(true);

      getItemRevisionSnapshot({
        item_id: item.id,
        revision_number: preferred.revisionNumber,
        item_type: getItemType(item),
      })
        .then((res) => {
          if (!cancelled) setRevisionSnapshot(unwrapApiPayload(res));
        })
        .catch(() => {
          if (!cancelled) setRevisionSnapshot(null);
        })
        .finally(() => {
          if (!cancelled) setIsRevisionLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    return; 
  }, [revisionOptions, item]);

  const selectedRevision = useMemo(
    () =>
      revisionOptions.find((revision) => revision.id === selectedRevisionId) ||
      revisionOptions[0] ||
      null,
    [revisionOptions, selectedRevisionId],
  );

  const filteredRevisionOptions = useMemo(() => {
    const normalizedSearch = revisionSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return revisionOptions;
    }

    return revisionOptions.filter((revision) =>
      revision.searchText.includes(normalizedSearch),
    );
  }, [revisionOptions, revisionSearch]);

  const drawerItem = useMemo(() => {
    const source = revisionSnapshot ?? selectedRevision?.raw ?? detail;
    const mapped = mapItemForDrawer(source, item, detail ?? item);

    // Version must follow the selected revision/snapshot. Do not keep the list-row
    // version when a revision is active but its payload omitted `version`.
    const versionSource = revisionSnapshot ?? selectedRevision?.raw ?? detail;
    const version = getVersionLabel(
      versionSource,
      selectedRevision ? undefined : item,
    );

    return {
      ...mapped,
      version,
    };
  }, [detail, item, selectedRevision, revisionSnapshot]);

  const isInactive = String(drawerItem.status).toUpperCase() === "INACTIVE";
  const isEvent = useMemo(
    () =>
      [detail, item, revisionSnapshot, selectedRevision?.raw].some(
        (source) => source && getItemType(source) === "event",
      ),
    [detail, item, revisionSnapshot, selectedRevision],
  );

  const statusClassName =
    statusStyles[String(drawerItem.status).toUpperCase()] ||
    "bg-gray-200 text-gray-600";

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 right-0 z-50 h-full w-full max-w-[640px] overflow-hidden rounded-r-none rounded-tl-[24px] rounded-bl-[24px] border border-[#E5E7EB] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-[105%]"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E5E7EB] px-7 my-6 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-[10px] px-4 py-2 text-[15px] font-semibold ${statusClassName}`}
              >
                {formatValue(drawerItem.status)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#737373] transition hover:bg-[#F5F5F5] hover:text-[#262626]"
            aria-label="Close drawer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="h-[calc(100%-93px)] overflow-y-auto px-7 pb-6 mt-6">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <div className="space-y-7">
              <div className="sticky top-0 z-10 bg-white pb-4 pt-0 shadow-sm">
                <div ref={revisionMenuRef}>
                  <p className="text-[16px] font-semibold leading-6 text-[#262626]">
                    Select System Revision
                  </p>
                  <div className="relative mt-2 w-full max-w-[284px]">
                    <button
                      type="button"
                      onClick={() => setIsRevisionMenuOpen((current) => !current)}
                      className="flex w-full items-center justify-between rounded-[12px] border border-[#D4D4D8] bg-white px-4 py-3 text-left text-[15px] text-[#262626] shadow-sm transition hover:border-[#A1A1AA]"
                      aria-expanded={isRevisionMenuOpen}
                      aria-label="Select system revision"
                    >
                      <span className="min-w-0 truncate font-medium flex items-center gap-2">
                        {revisionsError ? "Unable to load revision history" : (revisionsFetched && revisionOptions.length === 0) ? "No revisions" : (selectedRevision?.label || "Revision 1")}
                        {isRevisionLoading && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 flex-shrink-0" />
                        )}
                      </span>
                      <span className="ml-4 flex items-center gap-3 pl-3 text-[#737373]">
                        <span className="text-[15px] font-medium">
                          {selectedRevision?.dateLabel || "--/--/--"}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isRevisionMenuOpen ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </span>
                    </button>

                    {isRevisionMenuOpen ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[16px] border border-[#E4E4E7] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                        <div className="border-b border-[#F1F5F9] px-4 py-3">
                          <div className="flex items-center gap-2 border-b border-[#E4E4E7] pb-2 text-[#8B5CF6]">
                            <input
                              type="text"
                              value={revisionSearch}
                              onChange={(event) =>
                                setRevisionSearch(event.target.value)
                              }
                              placeholder="Search"
                              className="w-full border-none bg-transparent text-[15px] text-[#262626] outline-none placeholder:text-[#A1A1AA]"
                            />
                            <Search className="h-4 w-4" />
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto py-1">
                          {revisionsError ? (
                            <div className="px-4 py-3 text-sm text-red-700">
                              <div>{revisionsError}</div>
                              <button
                                type="button"
                                onClick={async () => {
                                  setRevisionsError("");
                                  setIsRevisionLoading(true);
                                  try {
                                    const res = await getItemRevisions({ item_id: item.id, item_type: getItemType(item) });
                                    setRevisions(Array.isArray(res?.data) ? res.data : []);
                                    setRevisionsFetched(true);
                                  } catch (e) {
                                    setRevisions([]);
                                    setRevisionsFetched(true);
                                    setRevisionsError(e?.message || "Unable to load revision history.");
                                  } finally {
                                    setIsRevisionLoading(false);
                                  }
                                }}
                                className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                              >
                                Retry
                              </button>
                            </div>
                          ) : filteredRevisionOptions.length > 0 ? (
                            filteredRevisionOptions.map((revision) => (
                              <button
                                key={revision.id}
                                type="button"
                                onClick={async () => {
                                  setSelectedRevisionId(revision.id);
                                  setIsRevisionMenuOpen(false);
                                  setRevisionSearch("");
                                  setRevisionSnapshot(null); // clear stale snapshot immediately

                                  if (revision.revisionNumber != null) {
                                    setIsRevisionLoading(true);
                                    try {
                                      const res = await getItemRevisionSnapshot({
                                        item_id: item.id,
                                        revision_number: revision.revisionNumber,
                                        item_type: getItemType(item),
                                      });
                                      setRevisionSnapshot(unwrapApiPayload(res));
                                    } catch {
                                      setRevisionSnapshot(null);
                                    } finally {
                                      setIsRevisionLoading(false);
                                    }
                                  }
                                }}
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-[15px] transition ${
                                  revision.id === selectedRevision?.id
                                    ? "bg-[#F8FAFC] text-[#262626]"
                                    : "text-[#262626] hover:bg-[#FAFAFA]"
                                }`}
                              >
                                <span className="font-medium">{revision.label}</span>
                                <span className="text-[#52525B]">
                                  {revision.dateLabel}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="px-4 py-3 text-[15px] text-[#A1A1AA]">
                              No revisions found
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {isInactive ? (
                  <div className="mt-4 rounded-[12px] border border-[#E5E7EB] px-5 py-4">
                    <p className="text-[16px] font-semibold leading-6 text-[#262626]">
                      Deactivation Details
                    </p>
                    <p className="mt-3 text-[15px] leading-6 text-[#262626]">
                      {formatValue(drawerItem.deactivateRemarks)}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-6">
                      <Field label="Deactivated By" value={drawerItem.deactivatedBy} />
                      <Field
                        label="Deactivated On"
                        value={drawerItem.deactivatedOn}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

            {isEvent ? (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <Field label="Event Name" value={drawerItem.eventName} />
                  <Field label="Sub-Event Name" value={drawerItem.subEventName} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[16px] font-semibold leading-6 text-[#262626]">
                      Uploaded Files
                    </p>
                    <p
                      className={`mt-1 text-[15px] leading-6 ${
                        drawerItem.uploadedFilesSummary !== "N/A"
                          ? "text-[#2563EB] underline underline-offset-2"
                          : "text-[#262626]"
                      }`}
                    >
                      {drawerItem.uploadedFilesSummary}
                    </p>
                  </div>
                  <Field label="Event Dates" value={drawerItem.eventDateRange} />
                </div>

                <Field label="Applicability" value={drawerItem.applicability} />
                <Field label="Type" value={drawerItem.type} />
                <Field label="Uploaded By" value={drawerItem.updatedBy} />
              </>
            ) : (
              <>
                <Field label="Name" value={drawerItem.name} />

                <div>
                  <p className="text-[16px] font-semibold leading-6 text-[#262626]">
                    Uploaded File
                  </p>
                  {drawerItem.files.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {drawerItem.files.map((fileItem) => (
                        <a
                          key={fileItem.id || fileItem.name}
                          href={fileItem.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block break-all text-[15px] leading-6 text-[#2563EB]"
                        >
                          {fileItem.name}
                          <span className="ml-2 text-[15px] leading-6 text-[#2563EB]">({formatFileSize(fileItem.size_bytes ?? fileItem.size ?? fileItem.file?.size)})</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[15px] leading-6 text-[#262626]">N/A</p>
                  )}
                </div>

                <Field label="Applicability" value={drawerItem.applicability} />
                <Field label="Type" value={drawerItem.type} />
                <Field label="Version" value={drawerItem.version} />
                <Field label="Owner" value={drawerItem.owner} />
                <Field label="Updated By" value={drawerItem.updatedBy} />
                <Field label="Updated On" value={drawerItem.updatedOn} />
                <Field label="Next Review Date" value={drawerItem.nextReviewDate} />
              </>
            )}

            <TagsSection tags={drawerItem.tags} />

            <TextSection label="Description" value={drawerItem.description} />
            <TextSection label="Change Remarks" value={drawerItem.changeRemarks} />
            {!isEvent && (
              <LinkedDocumentsSection linkedDocuments={drawerItem.linkedDocuments} />
            )}
          </div>
          )}
        </div>
      </div>
    </>
  );
}

function TagsSection({ tags }) {
  return (
    <div>
      <p className="text-[16px] font-semibold leading-6 text-[#262626]">Tags</p>
      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[8px] bg-[#8B5CF626] px-3 py-1.5 text-[13px] font-medium text-[#7C3AED]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-[15px] leading-6 text-[#262626]">N/A</p>
      )}
    </div>
  );
}

function markdownToDisplayHtml(md) {
  if (!md) return "";

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function processInline(text) {
    let result = "";
    let remaining = text;
    while (remaining.length > 0) {
      const boldIdx = remaining.indexOf("**");
      const italicIdx = remaining.indexOf("_");
      const hasBold = boldIdx !== -1 && remaining.indexOf("**", boldIdx + 2) !== -1;
      const hasItalic = italicIdx !== -1 && remaining.indexOf("_", italicIdx + 1) !== -1;
      if (!hasBold && !hasItalic) { result += escapeHtml(remaining).replace(/\n/g, "<br/>"); break; }
      const nextBold = hasBold ? boldIdx : Infinity;
      const nextItalic = hasItalic ? italicIdx : Infinity;
      if (nextBold <= nextItalic) {
        result += escapeHtml(remaining.slice(0, nextBold)).replace(/\n/g, "<br/>");
        remaining = remaining.slice(nextBold + 2);
        const closeIdx = remaining.indexOf("**");
        if (closeIdx === -1) { result += "**" + escapeHtml(remaining).replace(/\n/g, "<br/>"); break; }
        result += `<strong>${processInline(remaining.slice(0, closeIdx))}</strong>`;
        remaining = remaining.slice(closeIdx + 2);
      } else {
        result += escapeHtml(remaining.slice(0, nextItalic)).replace(/\n/g, "<br/>");
        remaining = remaining.slice(nextItalic + 1);
        const closeIdx = remaining.indexOf("_");
        if (closeIdx === -1) { result += "_" + escapeHtml(remaining).replace(/\n/g, "<br/>"); break; }
        result += `<em>${processInline(remaining.slice(0, closeIdx))}</em>`;
        remaining = remaining.slice(closeIdx + 1);
      }
    }
    return result;
  }

  return processInline(md);
}

function TextSection({ label, value }) {
  const displayValue = formatValue(value);
  const isNA = displayValue === "N/A";

  return (
    <div className="min-w-0">
      <p className="text-[16px] font-semibold leading-6 text-[#262626]">{label}</p>
      {isNA ? (
        <p className="mt-1 text-[15px] leading-6 text-[#262626]">N/A</p>
      ) : (
        <p
          className="mt-1 text-[15px] leading-6 text-[#262626] whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: markdownToDisplayHtml(displayValue) }}
        />
      )}
    </div>
  );
}

function LinkedDocumentsSection({ linkedDocuments }) {
  if (!Array.isArray(linkedDocuments) || linkedDocuments.length === 0) {
    return (
      <div>
        <p className="text-[16px] font-semibold leading-6 text-[#262626]">Linked Documents</p>
        <p className="mt-1 text-[15px] leading-6 text-[#262626]">N/A</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[16px] font-semibold leading-6 text-[#262626]">Linked Documents</p>
      <div className="mt-2 space-y-2">
        {linkedDocuments.map((doc, i) => (
          <div
            key={doc.id ?? i}
            className="flex items-center gap-3 rounded-[10px] border border-[#E5E7EB] px-4 py-2.5"
          >
            <span className="min-w-0 flex-1 text-[15px] leading-6 text-[#262626] truncate" title={doc.name}>
              {doc.id ? <span className="font-medium text-[#52525B] mr-2">#{doc.id}</span> : null}
              {doc.name || "—"}
            </span>
            {doc.type ? (
              <span className="shrink-0 rounded-md bg-purple-100 px-2 py-0.5 text-[12px] font-medium text-purple-600">
                {doc.type}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  const displayValue =
    label === "Updated On" ||
    label === "Next Review Date" ||
    label === "Deactivated On"
      ? formatDrawerDate(value)
      : formatValue(value);
  const shouldTruncate = ["Name", "Event Name", "Sub-Event Name"].includes(label);

  return (
    <div className="min-w-0">
      <p className="text-[16px] font-semibold leading-6 text-[#262626]">
       {label}
      </p>
      <p
       className={`mt-1 text-[15px] leading-6 text-[#262626] ${
         shouldTruncate ? "truncate" : ""
       }`}
       title={shouldTruncate ? displayValue : undefined}
      >
       {displayValue}
      </p>
    </div>
  );
}
