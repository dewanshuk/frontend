import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const primaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-600";

const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600/10 px-4 text-sm font-medium text-[#2563eb] transition-colors hover:bg-blue-600/15";

const secondaryButtonDisabledClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600/10 px-4 text-sm font-medium text-[#2563eb] cursor-not-allowed opacity-60";

export const AUDIT_SEARCH_TYPE_OPTIONS = [
  { value: "quick", label: "Quick" },
  { value: "detail", label: "Detail" },
];

const formatSearchTypeLabel = (value) => {
  const match = AUDIT_SEARCH_TYPE_OPTIONS.find(
    (option) => option.value === value,
  );
  if (match) return match.label;
  const text = String(value || "quick");
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Compact search-type select shown beside the search field.
 * Values stay lowercase for the API; labels use capital first letter.
 */
function SearchTypeSelect({ value = "quick", onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const selectedLabel = formatSearchTypeLabel(value);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 min-w-[108px] items-center justify-between gap-2 rounded-lg border border-[#d9d9d9] bg-white px-3 text-sm font-medium text-[#1e1e1e] transition hover:border-[#2563eb]/50 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Search type"
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[#2563eb] transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-full overflow-hidden rounded-lg border border-[#d9d9d9] bg-white py-1 shadow-lg"
        >
          {AUDIT_SEARCH_TYPE_OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange?.(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-sm transition hover:bg-blue-50",
                    selected
                      ? "bg-blue-50 font-semibold text-[#2563eb]"
                      : "font-medium text-[#1e1e1e]",
                  )}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default function AuditActionBar({
  searchQuery,
  onSearchChange,
  searchType = "quick",
  onSearchTypeChange,
  onCreateAuditClick,
  onFilterClick,
  onExportClick,
  canCreateAudit = false,
  canExport = false,
  isExporting = false,
  appliedFiltersCount = 0,
}) {
  const exportLooksDisabled = !canExport || isExporting;

  return (
    <div className="flex flex-col gap-4 py-4 font-sans lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 max-w-xl flex-1 flex-wrap items-center gap-2 sm:flex-nowrap">
        <SearchTypeSelect value={searchType} onChange={onSearchTypeChange} />

        <div className="flex h-9 min-w-0 w-full flex-1 items-center gap-2 overflow-hidden rounded border border-[#d9d9d9] bg-white px-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Search Audits..."
            className="h-full w-full border-0 bg-transparent text-sm font-normal text-[#1e1e1e] outline-none placeholder:text-[#b3b3b3]"
            autoComplete="off"
            spellCheck={false}
            maxLength={120}
          />
          <Search className="size-4 shrink-0 text-[#2563eb]" strokeWidth={2} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canCreateAudit ? (
          <button
            type="button"
            onClick={onCreateAuditClick}
            className={primaryButtonClass}
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            New Audit
          </button>
        ) : null}

        <button
          type="button"
          onClick={onExportClick}
          disabled={isExporting}
          aria-disabled={exportLooksDisabled}
          className={
            exportLooksDisabled
              ? secondaryButtonDisabledClass
              : secondaryButtonClass
          }
        >
          <img
            src="/assets/icons/orch/export.svg"
            alt=""
            className="size-4 shrink-0"
          />
          {isExporting ? "Exporting..." : "Export"}
        </button>

        <button
          type="button"
          onClick={onFilterClick}
          className={`${secondaryButtonClass} relative`}
          aria-label={
            appliedFiltersCount > 0
              ? `Filters, ${appliedFiltersCount} applied`
              : "Filters"
          }
        >
          <img
            src="/assets/icons/orch/filters.svg"
            alt=""
            className="size-4 shrink-0"
          />
          Filters
          {appliedFiltersCount > 0 ? (
            <span className="absolute -top-2 -right-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
              {appliedFiltersCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
