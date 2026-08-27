import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

const MARUTI_BLUE = "#171c8f";
const MENU_Z_INDEX = 100000;
/** Shared so field value and dropdown options stay the same size. */
const FIELD_TEXT_CLASS = "text-sm leading-5 font-normal";

/**
 * Compact searchable single-select used in calendar / date-range headers.
 * Option menu is portaled to document.body by default so it never expands modal layout.
 * Pass `disablePortal` when already inside a portaled calendar so the menu stacks
 * above the day grid instead of fighting the calendar overlay for pointer events.
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder,
  className = "",
  disablePortal = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState(null);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const selectedOption = options.find(
    (option) => String(option.value) === String(value),
  );
  const selectedLabel = selectedOption?.label || "";
  // While the input still shows the selected label, keep the full list visible.
  const normalizedQuery = query.trim().toLowerCase();
  const filterActive =
    open &&
    normalizedQuery.length > 0 &&
    normalizedQuery !== selectedLabel.toLowerCase();
  const filteredOptions = filterActive
    ? options.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery),
      )
    : options;

  const updateMenuPosition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const menuMaxHeight = 160;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < menuMaxHeight + gap && rect.top > spaceBelow;

    if (disablePortal) {
      if (openAbove) {
        setMenuStyle({
          position: "absolute",
          left: 0,
          width: "100%",
          bottom: "100%",
          marginBottom: gap,
          maxHeight: menuMaxHeight,
          zIndex: 50,
        });
        return;
      }

      setMenuStyle({
        position: "absolute",
        left: 0,
        width: "100%",
        top: "100%",
        marginTop: gap,
        maxHeight: menuMaxHeight,
        zIndex: 50,
      });
      return;
    }

    if (openAbove) {
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: Math.max(rect.width, 88),
        bottom: window.innerHeight - rect.top + gap,
        maxHeight: menuMaxHeight,
        zIndex: MENU_Z_INDEX,
      });
      return;
    }

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 88),
      top: rect.bottom + gap,
      maxHeight: menuMaxHeight,
      zIndex: MENU_Z_INDEX,
    });
  }, [disablePortal]);

  const openMenu = () => {
    const label =
      options.find((option) => String(option.value) === String(value))?.label ||
      "";
    setQuery(label);
    updateMenuPosition();
    setOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const closeMenu = () => {
    setOpen(false);
    setQuery("");
    setMenuStyle(null);
  };

  useEffect(() => {
    if (!open) return undefined;

    updateMenuPosition();

    const handleClickOutside = (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      const inTrigger = Boolean(ref.current?.contains(target));
      const inMenu = Boolean(menuRef.current?.contains(target));
      if (!inTrigger && !inMenu) closeMenu();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    // Scroll selected option into the middle of the dropdown (years start at ~1926).
    const frame = requestAnimationFrame(() => {
      const menuEl = menuRef.current;
      const selectedEl = menuEl?.querySelector(
        '[data-searchable-select-option][data-selected="true"]',
      );
      if (!menuEl || !selectedEl) return;
      const nextTop =
        selectedEl.offsetTop -
        menuEl.clientHeight / 2 +
        selectedEl.offsetHeight / 2;
      menuEl.scrollTop = Math.max(0, nextTop);
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition, value, filteredOptions.length]);

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        data-searchable-select
        style={menuStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        className="pointer-events-auto overflow-y-auto rounded-md border bg-white shadow-lg"
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                key={option.value}
                type="button"
                data-searchable-select-option
                data-selected={isSelected ? "true" : "false"}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(option.value);
                  closeMenu();
                }}
                className={`w-full px-2 py-1 text-left hover:bg-gray-100 ${FIELD_TEXT_CLASS} ${
                  isSelected ? "bg-blue-50 font-medium text-blue-700" : ""
                }`}
              >
                {option.label}
              </button>
            );
          })
        ) : (
          <div className={`px-2 py-1 text-gray-400 ${FIELD_TEXT_CLASS}`}>
            No results found
          </div>
        )}
      </div>
    ) : null;

  return (
    <div
      className={`relative min-w-[88px] ${className}`.trim()}
      ref={ref}
      data-searchable-select
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        onFocus={() => {
          if (!open) openMenu();
        }}
        onClick={() => {
          if (!open) openMenu();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) {
            updateMenuPosition();
            setOpen(true);
          }
        }}
        className={`w-full rounded-md border bg-white px-2 py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-[#171c8f]/40 ${FIELD_TEXT_CLASS}`}
      />
      <button
        type="button"
        aria-label={open ? "Close options" : "Open options"}
        aria-expanded={open}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded"
      >
        <ChevronDown className="h-4 w-4" style={{ color: MARUTI_BLUE }} />
      </button>

      {menu && (disablePortal ? menu : createPortal(menu, document.body))}
    </div>
  );
}
