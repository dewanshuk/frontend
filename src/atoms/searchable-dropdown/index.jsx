import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Searchable single-select for long option lists / long labels.
 * Keeps the menu within the field width with scroll + truncation.
 */
const SearchableDropdown = ({
  options = [],
  placeholder = "Select",
  /** @deprecated prefer value/label shaped options */
  searchKey = null,
  /** @deprecated prefer value/label shaped options */
  optionLabelKey = null,
  value: selected,
  onSelect: setSelected,
  onChange,
  disabled = false,
  inputClassName = "",
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchInputRef = useRef(null);

  const normalizedOptions = useMemo(() => {
    return (options || []).map((opt, index) => {
      if (opt == null) return null;
      if (typeof opt !== "object") {
        return { value: String(opt), label: String(opt), raw: opt };
      }
      const value = opt.value ?? opt.id ?? index;
      const label =
        opt.label ??
        (optionLabelKey ? opt[optionLabelKey] : null) ??
        opt.name ??
        String(value);
      return { value: String(value), label: String(label), raw: opt };
    }).filter(Boolean);
  }, [options, optionLabelKey]);

  const selectedValue =
    selected && typeof selected === "object"
      ? String(selected.value ?? selected.id ?? "")
      : selected == null || selected === ""
        ? ""
        : String(selected);

  const selectedOption =
    normalizedOptions.find((opt) => opt.value === selectedValue) ?? null;

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter((opt) => {
      const haystack = searchKey && opt.raw && typeof opt.raw === "object"
        ? String(opt.raw[searchKey] ?? opt.label)
        : opt.label;
      return haystack.toLowerCase().includes(q);
    });
  }, [normalizedOptions, search, searchKey]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const commitSelection = (option) => {
    if (onChange) {
      onChange(option ? option.value : "");
    } else if (setSelected) {
      setSelected(option ? option.raw : null);
    }
    setSearch("");
    setOpen(false);
  };

  return (
    <div className={cn("relative min-w-0 w-full max-w-full", className)} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-[42px] w-full max-w-full items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-4 py-2 text-left text-lg leading-[1.4] text-[#1e1e1e]",
          disabled
            ? "cursor-not-allowed bg-gray-100 opacity-60"
            : "cursor-pointer hover:border-blue-400",
          inputClassName,
        )}
      >
        {selectedOption ? (
          <span className="min-w-0 flex-1 truncate" title={selectedOption.label}>
            {selectedOption.label}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[#b3b3b3]">{placeholder}</span>
        )}
        {selectedOption && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              commitSelection(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                commitSelection(null);
              }
            }}
            className="inline-flex shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </span>
        ) : null}
        <ChevronDown size={16} className="shrink-0 text-gray-400" />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 z-50 mt-1 flex max-h-64 w-full max-w-full flex-col overflow-hidden rounded-lg border border-[#d9d9d9] bg-white shadow-lg">
          <div className="shrink-0 border-b border-[#ececec] p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-[#d9d9d9] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">No results found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === selectedValue;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => commitSelection(opt)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50",
                      isSelected && "bg-blue-50/70",
                    )}
                  >
                    <span className="min-w-0 flex-1 break-words">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SearchableDropdown;
