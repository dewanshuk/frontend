import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Multi-select dropdown with tags, in-panel search, and checkboxes.
 * Options come from `fetchOptions(searchTerm)` (async) for API-backed lists.
 * Panel is portaled to document.body so it sits above scrollable modals.
 *
 * Value shape: `Array<{ id: string|number, name: string }>`
 *
 * @param {object} props
 * @param {Array<{id: string|number, name: string}>} [props.values]
 * @param {(next: Array<{id: string|number, name: string}>) => void} props.onChange
 * @param {(searchTerm: string) => Promise<Array<{id: string|number, name: string}>>} props.fetchOptions
 * @param {string} [props.placeholder]
 * @param {string} [props.searchPlaceholder]
 * @param {string|null} [props.highlightValue] Exclusive “All”-style option id/name
 * @param {number} [props.minSearchLength] Hint empty state when search is too short (default 0)
 * @param {number} [props.debounceMs]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.fetchOnOpenOnly] If true, only fetches when the panel opens (search filters client-side)
 * @param {boolean} [props.portal] Portal panel to body (default true)
 * @param {number} [props.panelZIndex]
 * @param {number} [props.maxSelections] Cap number of selected items (0/undefined = unlimited)
 * @param {boolean} [props.hasError] Highlight trigger border when validation failed
 * @param {string} [props.className]
 */
export default function SearchableMultiSelectPicker({
  values: valuesProp,
  onChange,
  fetchOptions,
  placeholder = "select",
  searchPlaceholder = "Search…",
  highlightValue = null,
  minSearchLength = 0,
  debounceMs = 600,
  disabled = false,
  fetchOnOpenOnly = false,
  portal = true,
  panelZIndex = 200,
  maxSelections = 0,
  hasError = false,
  className,
}) {
  const values = valuesProp ?? [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const tokenRef = useRef(null);
  const cacheRef = useRef(null);

  const updatePanelPosition = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const viewportPad = 8;
    const width = Math.max(rect.width, 160);
    let left = rect.left;
    if (left + width > window.innerWidth - viewportPad) {
      left = Math.max(viewportPad, window.innerWidth - width - viewportPad);
    }

    const preferredMax = 256;
    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
    const spaceAbove = rect.top - gap - viewportPad;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;

    if (openUp) {
      setPanelStyle({
        position: "fixed",
        left,
        width,
        bottom: window.innerHeight - rect.top + gap,
        top: "auto",
        zIndex: panelZIndex,
        maxHeight: Math.min(preferredMax, Math.max(120, spaceAbove)),
      });
    } else {
      setPanelStyle({
        position: "fixed",
        left,
        width,
        top: rect.bottom + gap,
        bottom: "auto",
        zIndex: panelZIndex,
        maxHeight: Math.min(preferredMax, Math.max(120, spaceBelow)),
      });
    }
  }, [panelZIndex]);

  useEffect(() => {
    if (!open) return undefined;

    const handler = (event) => {
      const inTrigger = rootRef.current?.contains(event.target);
      const inPanel = panelRef.current?.contains(event.target);
      if (!inTrigger && !inPanel) setOpen(false);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return undefined;
    }

    updatePanelPosition();
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 50);
    const onReposition = () => updatePanelPosition();

    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePanelPosition]);

  const loadOptions = useCallback(
    async (searchTerm) => {
      if (typeof fetchOptions !== "function") {
        setOptions([]);
        return;
      }

      const query = String(searchTerm || "").trim();
      if (minSearchLength > 0 && query.length < minSearchLength) {
        setOptions([]);
        setLoading(false);
        return;
      }

      const token = Symbol();
      tokenRef.current = token;
      setLoading(true);

      try {
        let mapped;

        if (fetchOnOpenOnly && cacheRef.current) {
          const query = String(searchTerm || "")
            .trim()
            .toLowerCase();
          mapped = query
            ? cacheRef.current.filter((item) =>
                String(item.name || "")
                  .toLowerCase()
                  .includes(query),
              )
            : [...cacheRef.current];
        } else {
          mapped = await fetchOptions(String(searchTerm || "").trim());
          if (!Array.isArray(mapped)) mapped = [];
          // Never inject synthetic options — only API results
          mapped = mapped
            .map((item) => {
              if (!item) return null;
              if (typeof item === "string") {
                const name = item.trim();
                return name ? { id: name, name } : null;
              }
              const id = item.id ?? item.name;
              const name = String(item.name ?? item.id ?? "").trim();
              if (!name && (id == null || id === "")) return null;
              return { id: id ?? name, name: name || String(id) };
            })
            .filter(Boolean);
          if (fetchOnOpenOnly) {
            cacheRef.current = mapped;
          }
        }

        if (tokenRef.current !== token) return;

        if (highlightValue) {
          const exists = mapped.some(
            (item) => String(item.id) === String(highlightValue),
          );
          if (!exists) {
            mapped = [
              { id: highlightValue, name: String(highlightValue) },
              ...mapped,
            ];
          }
        }

        setOptions(mapped);
      } catch {
        if (tokenRef.current !== token) return;
        // Fail closed: empty list, no static placeholders
        setOptions(
          highlightValue
            ? [{ id: highlightValue, name: String(highlightValue) }]
            : [],
        );
        if (fetchOnOpenOnly) {
          cacheRef.current = highlightValue
            ? [{ id: highlightValue, name: String(highlightValue) }]
            : [];
        }
      } finally {
        if (tokenRef.current === token) setLoading(false);
      }
    },
    [fetchOnOpenOnly, fetchOptions, highlightValue, minSearchLength],
  );

  useEffect(() => {
    if (!open) return;
    cacheRef.current = null;
    setOptions([]);
    setSearch("");
    loadOptions("");
  }, [open, loadOptions]);

  useEffect(() => {
    if (!open) return;

    if (fetchOnOpenOnly) {
      if (!cacheRef.current) return;
      const query = String(search || "")
        .trim()
        .toLowerCase();
      let mapped = query
        ? cacheRef.current.filter((item) =>
            String(item.name || "")
              .toLowerCase()
              .includes(query),
          )
        : [...cacheRef.current];
      if (highlightValue) {
        const exists = mapped.some(
          (item) => String(item.id) === String(highlightValue),
        );
        if (!exists) {
          mapped = [
            { id: highlightValue, name: String(highlightValue) },
            ...mapped,
          ];
        }
      }
      setOptions(mapped);
      return;
    }

    const timer = setTimeout(() => loadOptions(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, open, loadOptions, debounceMs, fetchOnOpenOnly, highlightValue]);

  const isSelected = (id) =>
    values.some((value) => String(value?.id ?? value) === String(id));

  const toggle = (item) => {
    const itemId = item.id;
    if (isSelected(itemId)) {
      onChange?.(
        values.filter((value) => String(value?.id ?? value) !== String(itemId)),
      );
      return;
    }

    if (
      maxSelections > 0 &&
      values.length >= maxSelections &&
      !(highlightValue && String(itemId) === String(highlightValue))
    ) {
      return;
    }

    if (highlightValue && String(itemId) === String(highlightValue)) {
      onChange?.([{ id: highlightValue, name: String(highlightValue) }]);
      return;
    }

    if (
      highlightValue &&
      values.some((value) => String(value?.id ?? value) === String(highlightValue))
    ) {
      onChange?.([
        ...values.filter(
          (value) => String(value?.id ?? value) !== String(highlightValue),
        ),
        { id: item.id, name: item.name },
      ]);
      return;
    }

    onChange?.([...values, { id: item.id, name: item.name }]);
  };

  const removeTag = (id, event) => {
    event.stopPropagation();
    onChange?.(
      values.filter((value) => String(value?.id ?? value) !== String(id)),
    );
  };

  const panelContent =
    open && !disabled && (!portal || panelStyle) ? (
      <div
        ref={panelRef}
        style={portal ? panelStyle : undefined}
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-lg border border-[#d9d9d9] bg-white shadow-lg",
          !portal && "absolute z-50 mt-1 max-h-64",
        )}
      >
        <div className="flex-shrink-0 border-b p-2">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
            {options.length === 0 && !loading ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                {search.length > 0 &&
                minSearchLength > 0 &&
                search.length < minSearchLength
                  ? `Type at least ${minSearchLength} characters to search…`
                  : "No results found"}
              </div>
            ) : (
              options.map((item) => {
                const selected = isSelected(item.id);
                const atMax =
                  maxSelections > 0 &&
                  values.length >= maxSelections &&
                  !selected;
                return (
                  <div
                    key={String(item.id)}
                    onClick={() => {
                      if (atMax) return;
                      toggle(item);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50",
                      selected && "bg-blue-50/60",
                      atMax && "cursor-not-allowed opacity-40 hover:bg-white",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2",
                        selected
                          ? "border-blue-600 bg-blue-600"
                          : "border-gray-300",
                      )}
                    >
                      {selected ? (
                        <Check size={10} className="text-white" strokeWidth={3} />
                      ) : null}
                    </div>
                    <span className="truncate">{item.name}</span>
                  </div>
                );
              })
            )}
            {loading ? (
              <div className="flex justify-center py-2">
                <Loader2 size={14} className="animate-spin text-blue-400" />
              </div>
            ) : null}
          </div>
          {values.length > 0 || maxSelections > 0 ? (
            <div className="flex flex-shrink-0 items-center justify-between px-3 py-1.5 text-xs text-gray-500">
              <span>
                {values.length}
                {maxSelections > 0 ? ` / ${maxSelections}` : ""} selected
              </span>
              {values.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onChange?.([])}
                  className="text-blue-600 hover:underline"
                >
                  Clear all
                </button>
              ) : null}
            </div>
          ) : null}
      </div>
    ) : null;

  return (
    <div className={cn("relative w-full", className)} ref={rootRef}>
      <div
        onClick={() => !disabled && setOpen((current) => !current)}
        className={cn(
          "flex min-h-[42px] w-full flex-wrap items-center gap-1 rounded-lg border bg-white px-4 py-2",
          hasError ? "border-red-500" : "border-[#d9d9d9]",
          disabled
            ? "cursor-not-allowed bg-gray-100 opacity-60"
            : "cursor-pointer hover:border-blue-400",
        )}
      >
        {values.length === 0 ? (
          <span className="flex-1 select-none text-base text-[#b3b3b3]">
            {placeholder}
          </span>
        ) : (
          values.map((value) => (
            <span
              key={value.id}
              className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
            >
              <span className="max-w-[120px] truncate">{value.name}</span>
              <button
                type="button"
                onClick={(event) => removeTag(value.id, event)}
                className="flex-shrink-0 hover:text-blue-900"
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <div className="ml-auto flex flex-shrink-0 items-center gap-1 pl-1">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-blue-500" />
          ) : null}
          <ChevronDown size={16} className="text-[#8b5cf6]" />
        </div>
      </div>

      {portal && typeof document !== "undefined" && panelContent
        ? createPortal(panelContent, document.body)
        : panelContent}
    </div>
  );
}
