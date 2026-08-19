import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ChevronDown, X, Check } from "lucide-react";
import { getOrchestrationLinkedOptions } from "../api/orchestration";
import { normaliseDocTypeLabel } from "../lib/utils";

const normalizeDocTypeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_/-]+/g, " ")
    .replace(/\s+/g, " ");

const expandDocTypeKeys = (value) => {
  const key = normalizeDocTypeKey(value);
  if (!key) return new Set();
  const keys = new Set([key]);
  if (key.endsWith("s")) keys.add(key.slice(0, -1));
  else keys.add(`${key}s`);
  return keys;
};

const typesOverlap = (a, b) => {
  const left = expandDocTypeKeys(a);
  if (left.size === 0) return false;
  for (const key of expandDocTypeKeys(b)) {
    if (left.has(key)) return true;
  }
  return false;
};

/** Map an API item onto one of the active query type values. */
const resolveDocType = (item, activeTypes = []) => {
  if (!Array.isArray(activeTypes) || activeTypes.length === 0) {
    return item?._docType ?? item?.document_type ?? item?.type_label ?? null;
  }
  if (activeTypes.length === 1) return activeTypes[0];

  const candidates = [
    item?._docType,
    item?.document_type,
    item?.type_label,
    item?.type,
  ].filter(Boolean);

  for (const type of activeTypes) {
    if (candidates.some((candidate) => typesOverlap(candidate, type))) {
      return type;
    }
  }

  return item?._docType ?? item?.document_type ?? item?.type_label ?? null;
};

/**
 * LinkedItemMultiPicker
 *
 * Supports both:
 *   documentType  (string) — single type, backward compatible
 *   documentTypes (string[]) — multiple types, parallel API calls per type
 *
 * Items are tagged with `_docType` (the query type) so callers can split
 * event IDs from document IDs when building payloads.
 */
export default function LinkedItemMultiPicker({
  documentType,
  documentTypes,
  values: valuesProp,
  onChange,
  disabled = false,
  placeholder = "Select document names",
  isBulkUpdate = false,
}) {
  const values = valuesProp ?? [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const rootRef = useRef(null);
  const tokenRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalise to an array of type strings; prefer documentTypes if provided
  const activeTypes = documentTypes ?? (documentType ? [documentType] : []);
  const activeTypesKey = activeTypes.join(",");

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search box when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  // ── Fetch per type so each option is tagged with `_docType` ───────────────
  const fetchOptions = useCallback(
    (searchTerm) => {
      const types = activeTypesKey.split(",").filter(Boolean);
      if (types.length === 0) return;

      const token = Symbol();
      tokenRef.current = token;
      setLoading(true);

      const queryExtras = {
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        page: 1,
        page_size: 100,
        is_bulk: isBulkUpdate,
      };

      Promise.all(
        types.map((type) =>
          getOrchestrationLinkedOptions({
            types: [type],
            ...queryExtras,
          })
            .then((res) =>
              (res?.data || []).map((item) => ({
                ...item,
                _docType: type,
              })),
            )
            .catch(() => []),
        ),
      )
        .then((groups) => {
          if (tokenRef.current !== token) return;
          const byId = new Map();
          groups.flat().forEach((item) => {
            if (item?.id == null) return;
            if (!byId.has(item.id)) byId.set(item.id, item);
          });
          setOptions([...byId.values()]);
        })
        .catch(() => {
          if (tokenRef.current !== token) return;
          setOptions([]);
        })
        .finally(() => {
          if (tokenRef.current === token) setLoading(false);
        });
    },
    [activeTypesKey, isBulkUpdate],
  );

  // Reset + initial load when active types change
  useEffect(() => {
    setOptions([]);
    setSearch("");
    if (activeTypesKey) fetchOptions("");
  }, [activeTypesKey, fetchOptions]);

  // Debounced re-fetch on search change
  useEffect(() => {
    const timer = setTimeout(() => fetchOptions(search), 600);
    return () => clearTimeout(timer);
  }, [search, fetchOptions]);

  // Backfill `_docType` on selected values from loaded options (once per id)
  useEffect(() => {
    if (typeof onChange !== "function" || values.length === 0 || options.length === 0) {
      return;
    }

    let changed = false;
    const nextValues = values.map((selected) => {
      if (selected?._docType) return selected;
      const match = options.find((o) => o.id === selected.id);
      if (!match?._docType) return selected;
      changed = true;
      return { ...selected, _docType: match._docType };
    });

    if (changed) onChange(nextValues);
  }, [options, values, onChange]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isSelected = (id) => values.some((v) => v.id === id);

  const toggle = (item) => {
    if (isSelected(item.id)) {
      onChange(values.filter((v) => v.id !== item.id));
    } else {
      const tagged = {
        ...item,
        _docType: item._docType ?? resolveDocType(item, activeTypes),
      };
      onChange([...values, tagged]);
    }
  };

  const removeTag = (id, e) => {
    e.stopPropagation();
    onChange(values.filter((v) => v.id !== id));
  };

  const isDisabled = disabled || !activeTypesKey;

  return (
    <div className="relative" ref={rootRef}>
      {/* ── Trigger ───────────────────────────────────────────────────────── */}
      <div
        onClick={() => !isDisabled && setOpen((o) => !o)}
        className={`min-h-[42px] w-full border rounded-lg px-3 py-2 flex flex-wrap gap-1 items-center
          ${isDisabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "bg-white cursor-pointer hover:border-blue-400"}`}
      >
        {values.length === 0 ? (
          <span className="text-sm text-gray-400 select-none flex-1">{placeholder}</span>
        ) : (
          values.map((v) => (
            <span
              key={v.id}
              className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs rounded-full px-2 py-0.5"
            >
              <span className="max-w-[160px] truncate">({v.id}) {v.name}</span>
              <button
                type="button"
                onClick={(e) => removeTag(v.id, e)}
                className="hover:text-blue-900 flex-shrink-0"
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <div className="ml-auto flex items-center gap-1 pl-1 flex-shrink-0">
          {loading && <Loader2 size={14} className="animate-spin text-blue-500" />}
          <ChevronDown size={18} className="shrink-0 text-purple-500" />
        </div>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {open && !isDisabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg flex flex-col max-h-64">

          {/* Search box */}
          <div className="p-2 border-b flex-shrink-0">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Options */}
          <div className="overflow-y-auto flex-1">
            {options.length === 0 && !loading ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                {search.length > 0 && search.length < 3
                  ? "Type at least 3 characters to search…"
                  : "No results found"}
              </div>
            ) : (
              options.map((item, i) => {
                const selected = isSelected(item.id);
                return (
                  <div
                    key={`${item.document_type}-${item.id ?? i}`}
                    onClick={() => toggle(item)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${selected ? "bg-blue-50/60" : ""}`}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                    >
                      {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="truncate">({item.id}) {item.name}</span>
                    {item.type_label && (
                      <span className="ml-auto shrink-0 text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                        {normaliseDocTypeLabel(item.type_label)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
            {loading && (
              <div className="flex justify-center py-2">
                <Loader2 size={14} className="animate-spin text-blue-400" />
              </div>
            )}
          </div>

          {/* Footer: count + clear */}
          {values.length > 0 && (
            <div className="border-t px-3 py-1.5 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
              <span>{values.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-blue-600 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
