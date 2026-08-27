import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ChevronDown, X } from "lucide-react";
import { getOrchestrationLinkedOptions } from "../api/orchestration";

/**
 * LinkedItemPicker
 *
 * Both modes use debounced server-side search (350 ms).
 *
 * paginated={false}  — page_size=100, no Load More. Results replace on
 *   each search. Good for moderate lists.
 *
 * paginated={true}   — page_size=20, "Load More" appends next pages.
 *   Good for very large lists.
 *
 * In both modes the initial list loads as soon as documentType is set
 * (empty search = all items up to page_size).
 */
export default function LinkedItemPicker({
  documentType,
  value,
  onSelect,
  disabled = false,
  paginated = false,
  excludeId = null,
  excludeIds = [],
  placeholder = "Select linked item",
  inputClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const rootRef = useRef(null);
  const tokenRef = useRef(null);

  const PAGE_SIZE = paginated ? 20 : 100;

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync display when value is cleared externally
  useEffect(() => {
    if (!value) setSearch("");
  }, [value]);

  // ── Core fetch (shared by both modes) ────────────────────────────────────
  const fetchOptions = useCallback(
    (searchTerm, nextPage, append = false) => {
      if (!documentType) return;

      const token = Symbol();
      tokenRef.current = token;
      setLoading(true);

      getOrchestrationLinkedOptions({
        document_type: documentType,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        page: nextPage,
        page_size: PAGE_SIZE,
        ...(excludeId != null && { exclude_id: excludeId }),
      })
        .then((res) => {
          if (tokenRef.current !== token) return;
          const items = res?.data || [];
          setOptions((prev) => (append ? [...prev, ...items] : items));
          setTotal(res?.total ?? 0);
          setPage(nextPage);
        })
        .catch(() => {
          if (tokenRef.current !== token) return;
          if (!append) setOptions([]);
        })
        .finally(() => {
          if (tokenRef.current === token) setLoading(false);
        });
    },
    [documentType, excludeId, PAGE_SIZE],
  );

  // Reset + load initial page when documentType changes
  useEffect(() => {
    setOptions([]);
    setTotal(0);
    setPage(1);
    setSearch("");
    if (documentType) fetchOptions("", 1, false);
  }, [documentType, fetchOptions]);

  // Debounced re-fetch on search input change
  useEffect(() => {
    const timer = setTimeout(() => fetchOptions(search, 1, false), 600);
    return () => clearTimeout(timer);
  }, [search, fetchOptions]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasMore = paginated && options.length < total;
  const displayValue = value ? value.name : search;
  const allExcluded = new Set([
    ...(excludeId != null ? [excludeId] : []),
    ...(Array.isArray(excludeIds) ? excludeIds : []),
  ]);
  const visibleOptions = allExcluded.size > 0
    ? options.filter((item) => !allExcluded.has(item.id))
    : options;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelect = (item) => {
    onSelect(item);
    setSearch("");
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
    setSearch("");
  };

  const handleLoadMore = () => fetchOptions(search, page + 1, true);

  return (
    <div className="relative" ref={rootRef}>
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled || !documentType}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            onSelect(null);
          }}
          className={`w-full px-3 py-2 pr-16 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed ${inputClassName}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {loading && (
            <Loader2 size={16} className="animate-spin text-blue-500" />
          )}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {open && !disabled && documentType && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {visibleOptions.length === 0 && !loading ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              {search.length > 0 && search.length < 3
                ? "Type at least 3 characters to search…"
                : "No results found"}
            </div>
          ) : (
            <>
              {visibleOptions.map((item, i) => (
                <div
                  key={item.id ?? i}
                  onClick={() => handleSelect(item)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{item.name}</span>
                  {item.document_type && (
                    <span className="shrink-0 text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                      {item.document_type}
                    </span>
                  )}
                </div>
              ))}

              {/* Load More — paginated mode only */}
              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1 border-t disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    `Load more (${options.length} of ${total})`
                  )}
                </button>
              )}

              {loading && options.length > 0 && (
                <div className="flex justify-center py-2">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

