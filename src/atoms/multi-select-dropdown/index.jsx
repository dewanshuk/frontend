import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const toOption = (option) => {
  if (typeof option === "string") {
    return { value: option, label: option };
  }

  return {
    value: option?.value ?? "",
    label: option?.label ?? option?.value ?? "",
  };
};

const MultiSelectDropdown = ({
  options = [],
  value = [],
  onChange,
  placeholder = "select",
  getSelectedText,
  emptyStateText = "No options",
  className = "",
  showSelectAll = false,
  highlightValue,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef(null);

  const normalizedOptions = useMemo(
    () => options.map(toOption).filter((option) => option.value && option.label),
    [options],
  );

  const filteredOptions = useMemo(
    () =>
      search.trim()
        ? normalizedOptions.filter((o) =>
            o.label.toLowerCase().includes(search.toLowerCase()),
          )
        : normalizedOptions,
    [normalizedOptions, search],
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedValues = Array.isArray(value) ? value : [];
  const selectedText =
    typeof getSelectedText === "function"
      ? getSelectedText(selectedValues)
      : selectedValues.length === 0
      ? placeholder
      : `${selectedValues.length} selected`;

  const allSelected =
    normalizedOptions.length > 0 &&
    normalizedOptions.every((o) => selectedValues.includes(o.value));

  const toggleOption = (optionValue) => {
    let nextValues;
    const isSelected = selectedValues.includes(optionValue);

    if (isSelected) {
      nextValues = selectedValues.filter((item) => item !== optionValue);
    } else {
      // If a highlightValue (e.g., "All") is provided:
      // - selecting the highlightValue should make it exclusive (clear others)
      // - selecting any other option should remove the highlightValue if present
      if (highlightValue && optionValue === highlightValue) {
        nextValues = [highlightValue];
      } else if (highlightValue && selectedValues.includes(highlightValue)) {
        nextValues = [...selectedValues.filter((item) => item !== highlightValue), optionValue];
      } else {
        nextValues = [...selectedValues, optionValue];
      }
    }

    onChange?.(nextValues);
  };

  const toggleAll = () => {
    onChange?.(allSelected ? [] : normalizedOptions.map((o) => o.value));
  };

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <div
        onClick={() => setOpen((prevOpen) => !prevOpen)}
        className="min-h-[42px] w-full border rounded-lg bg-white px-3 py-2 flex justify-between items-center cursor-pointer hover:border-blue-400"
      >
        <span
          className={`text-sm select-none ${
            selectedValues.length === 0 ? "text-gray-400" : "text-gray-700"
          }`}
        >
          {selectedText}
        </span>

        <ChevronDown size={18} className="shrink-0 text-purple-500" />
      </div>

      {open && (
        <div className="absolute mt-2 w-full bg-white border rounded-lg shadow z-10 max-h-60 overflow-y-auto">
          {/* Search input */}
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search…"
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          {/* All option */}
          {showSelectAll && !search.trim() && (
            <label className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer border-b font-medium text-sm ${highlightValue === "All" ? "bg-yellow-50 text-yellow-700" : ""}`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
              <span>All</span>
            </label>
          )}
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-sm text-gray-500">{emptyStateText}</div>
          ) : (
            filteredOptions.map(({ value: optionValue, label: optionLabel }) => {
              const optionClassName = `flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm ${highlightValue === optionValue ? "bg-yellow-50 text-yellow-700 font-semibold" : ""}`;
              return (
                <label
                  key={optionValue}
                  className={optionClassName}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(optionValue)}
                    onChange={() => toggleOption(optionValue)}
                  />

                  <span>{optionLabel}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
