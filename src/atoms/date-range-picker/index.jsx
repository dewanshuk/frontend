import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import { DATE_FORMAT_MOMENT, toDisplayDateString } from "../../config";
import { cn } from "@/lib/utils";
import SearchableSelect from "../searchable-select";
import {
  buildCalendarPopupStyle,
  resolveCalendarOpenSide,
} from "../calendar";

const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const OVERLAY_Z_INDEX = 99999;
const POPUP_HEIGHT_ESTIMATE = 400;
/** Compact calendar width (day grid + padding) — do not stretch to the field width. */
const CALENDAR_WIDTH_PX = 280;

const MONTH_OPTIONS = Array.from({ length: 12 }).map((_, index) => ({
  value: index,
  label: new Date(0, index).toLocaleString("default", { month: "short" }),
}));

const currentSystemYear = new Date().getFullYear();
const MAX_YEAR = 2050;
const YEAR_OPTIONS = Array.from(
  { length: MAX_YEAR - (currentSystemYear - 100) + 1 },
).map((_, index) => {
  const year = currentSystemYear - 100 + index;
  return { value: year, label: String(year) };
});

const formatDate = (date) => {
  if (!date || isNaN(date.getTime())) return "";
  return toDisplayDateString(moment(date).format(DATE_FORMAT_MOMENT));
};

/** Dedicated body mount node so the calendar is never a descendant of any modal. */
const getPortalRoot = () => {
  const id = "ecp-date-range-picker-root";
  let root = document.getElementById(id);
  if (!root) {
    root = document.createElement("div");
    root.id = id;
    document.body.appendChild(root);
  }
  return root;
};

const DateRangePicker = ({
  value,
  onChange,
  inputClassName,
  className = "w-full",
  showIcon = false,
  placeholder = "Start & End Dates",
  minDate = null,
  /** `"auto"` picks top/bottom/left/right from free viewport space. */
  placement = "auto",
  /** @deprecated Always overlays via document body portal. */
  portalContainer: _portalContainer = null,
  emitPartialSelection = false,
}) => {
  const initialStartDate = useMemo(() => {
    const parts = String(value || "")
      .split(/\s*-\s*/)
      .map((part) => part.trim());
    return parts[0] ? moment(parts[0], DATE_FORMAT_MOMENT).toDate() : null;
  }, [value]);

  const initialEndDate = useMemo(() => {
    const parts = String(value || "")
      .split(/\s*-\s*/)
      .map((part) => part.trim());
    return parts[1] ? moment(parts[1], DATE_FORMAT_MOMENT).toDate() : null;
  }, [value]);

  const getDefaultViewDate = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (minDate && today < minDate) return new Date(minDate);
    return today;
  }, [minDate]);

  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState(null);

  useEffect(() => {
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  useEffect(() => {
    setPortalRoot(getPortalRoot());
  }, []);

  // When the calendar opens, show the selected start month/year, otherwise current month/year.
  useEffect(() => {
    if (!open) return;

    const viewDate =
      startDate && !isNaN(startDate.getTime())
        ? startDate
        : getDefaultViewDate();

    setCurrentMonth(viewDate.getMonth());
    setCurrentYear(viewDate.getFullYear());
  }, [open, startDate, getDefaultViewDate]);

  const ref = useRef(null);
  const popupRef = useRef(null);
  const [popupPosition, setPopupPosition] = useState(null);

  const minYear = minDate ? minDate.getFullYear() : YEAR_OPTIONS[0]?.value;
  const yearOptions = useMemo(
    () => YEAR_OPTIONS.filter((opt) => opt.value >= minYear),
    [minYear],
  );

  const monthOptions = useMemo(() => {
    if (!minDate || currentYear > minDate.getFullYear()) return MONTH_OPTIONS;
    return MONTH_OPTIONS.filter((opt) => opt.value >= minDate.getMonth());
  }, [minDate, currentYear]);

  const updatePopupPosition = useCallback(() => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const measuredHeight = popupRef.current?.offsetHeight || 0;
    const side = resolveCalendarOpenSide(rect, placement, {
      width: CALENDAR_WIDTH_PX,
      height: measuredHeight || POPUP_HEIGHT_ESTIMATE,
    });
    const style = buildCalendarPopupStyle(rect, side, {
      width: CALENDAR_WIDTH_PX,
      height: POPUP_HEIGHT_ESTIMATE,
      measuredHeight: measuredHeight || undefined,
    });
    // Date-range overlay uses high z-index shared with modal stacking contexts.
    style.zIndex = OVERLAY_Z_INDEX;
    setPopupPosition(style);
  }, [placement]);

  // Block scroll on the modal/page while the overlay calendar is open.
  useEffect(() => {
    if (!open || !ref.current) return undefined;

    const locked = [];
    let el = ref.current.parentElement;
    while (el && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      if (
        /(auto|scroll|overlay)/.test(style.overflowY) ||
        /(auto|scroll|overlay)/.test(style.overflow)
      ) {
        locked.push({
          el,
          overflow: el.style.overflow,
          overflowY: el.style.overflowY,
          overflowX: el.style.overflowX,
        });
        el.style.setProperty("overflow", "hidden", "important");
        el.style.setProperty("overflow-y", "hidden", "important");
        el.style.setProperty("overflow-x", "hidden", "important");
      }
      el = el.parentElement;
    }

    const isInsideOverlay = (target) => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          "[data-date-range-picker-popup], [data-searchable-select]",
        ),
      );
    };

    const preventBackgroundScroll = (event) => {
      if (isInsideOverlay(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("wheel", preventBackgroundScroll, {
      passive: false,
      capture: true,
    });
    document.addEventListener("touchmove", preventBackgroundScroll, {
      passive: false,
      capture: true,
    });

    return () => {
      locked.forEach(({ el: node, overflow, overflowY, overflowX }) => {
        node.style.overflow = overflow;
        node.style.overflowY = overflowY;
        node.style.overflowX = overflowX;
      });
      document.removeEventListener("wheel", preventBackgroundScroll, {
        capture: true,
      });
      document.removeEventListener("touchmove", preventBackgroundScroll, {
        capture: true,
      });
    };
  }, [open]);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const generateCalendar = () => {
    const dates = [];
    for (let i = firstDay - 1; i >= 0; i--)
      dates.push({ day: prevMonthDays - i, current: false });
    for (let i = 1; i <= daysInMonth; i++)
      dates.push({ day: i, current: true });
    while (dates.length % 7 !== 0)
      dates.push({
        day: dates.length - daysInMonth - firstDay + 1,
        current: false,
      });
    return dates;
  };

  const changeMonth = (dir) => {
    let m = currentMonth + dir;
    let y = currentYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    if (minDate) {
      const candidate = new Date(y, m, 1);
      const minMonthStart = new Date(
        minDate.getFullYear(),
        minDate.getMonth(),
        1,
      );
      if (candidate < minMonthStart) return;
    }
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  const handleMonthChange = (selectedMonth) => {
    const nextMonth = Number(selectedMonth);
    if (
      minDate &&
      currentYear === minDate.getFullYear() &&
      nextMonth < minDate.getMonth()
    ) {
      return;
    }
    setCurrentMonth(nextMonth);
  };

  const handleYearChange = (selectedYear) => {
    const nextYear = Number(selectedYear);
    if (minDate && nextYear < minDate.getFullYear()) return;

    let nextMonth = currentMonth;
    if (
      minDate &&
      nextYear === minDate.getFullYear() &&
      nextMonth < minDate.getMonth()
    ) {
      nextMonth = minDate.getMonth();
    }
    setCurrentYear(nextYear);
    setCurrentMonth(nextMonth);
  };

  const handleDateClick = (day) => {
    const clicked = new Date(currentYear, currentMonth, day);
    if (minDate && clicked < minDate) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(clicked);
      setEndDate(null);
      if (emitPartialSelection && onChange) onChange(formatDate(clicked));
      return;
    }
    if (clicked < startDate) {
      setStartDate(clicked);
      setEndDate(null);
      if (emitPartialSelection && onChange) onChange(formatDate(clicked));
      return;
    }

    setEndDate(clicked);
    setOpen(false);
    if (onChange) onChange(`${formatDate(startDate)} - ${formatDate(clicked)}`);
  };

  const isInRange = (day) => {
    if (!startDate || !endDate) return false;
    const date = new Date(currentYear, currentMonth, day);
    return date > startDate && date < endDate;
  };

  const calendarDays = generateCalendar();

  useEffect(() => {
    if (!open) return undefined;

    updatePopupPosition();
    const raf = requestAnimationFrame(() => updatePopupPosition());

    const handleClickOutside = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (ref.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      if (target.closest?.("[data-searchable-select]")) return;

      setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [open, updatePopupPosition]);

  const displayValue =
    startDate && endDate
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : startDate
        ? formatDate(startDate)
        : "";

  const canGoPrev = !(
    minDate &&
    currentYear === minDate.getFullYear() &&
    currentMonth <= minDate.getMonth()
  );

  const overlay =
    open && popupPosition && portalRoot
      ? createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: OVERLAY_Z_INDEX,
              pointerEvents: "none",
            }}
            aria-hidden={false}
          >
            <div
              ref={popupRef}
              data-date-range-picker-popup
              style={{
                position: "fixed",
                pointerEvents: "auto",
                ...popupPosition,
              }}
              onMouseDown={(event) => event.stopPropagation()}
              className="w-[280px] max-w-[280px] box-border overflow-visible rounded-2xl bg-gray-100 p-3 shadow-2xl"
            >
              <div className="relative z-20 mb-4 flex min-w-0 items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  disabled={!canGoPrev}
                  className="shrink-0 rounded p-1 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1">
                  <div className="min-w-0 flex-1">
                    <SearchableSelect
                      options={monthOptions}
                      value={currentMonth}
                      onChange={handleMonthChange}
                      placeholder="Month"
                      disablePortal
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <SearchableSelect
                      options={yearOptions}
                      value={currentYear}
                      onChange={handleYearChange}
                      placeholder="Year"
                      disablePortal
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="shrink-0 rounded p-1 hover:bg-gray-200"
                  title="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="relative z-0 mb-2 grid grid-cols-7 text-sm text-gray-500">
                {days.map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>

              <div className="relative z-0 grid grid-cols-7 gap-0 text-center">
                {calendarDays.map((d, i) => {
                  const date = new Date(currentYear, currentMonth, d.day);
                  const isPast = d.current && minDate && date < minDate;
                  const inRange = d.current && isInRange(d.day);
                  const startSelected =
                    d.current &&
                    startDate &&
                    date.toDateString() === startDate.toDateString();
                  const endSelected =
                    d.current &&
                    endDate &&
                    date.toDateString() === endDate.toDateString();
                  const selected = startSelected || endSelected;

                  const baseClasses =
                    "h-9 w-full flex items-center justify-center text-sm";
                  const disabledClasses =
                    !d.current || isPast
                      ? "text-gray-300 cursor-not-allowed"
                      : "cursor-pointer";

                  let stateClasses = "rounded-none";
                  if (selected) {
                    if (startSelected && endSelected) {
                      stateClasses = "bg-purple-600 text-white rounded-lg";
                    } else if (startSelected) {
                      stateClasses = "bg-purple-600 text-white rounded-l-lg";
                    } else if (endSelected) {
                      stateClasses = "bg-purple-600 text-white rounded-r-lg";
                    } else {
                      stateClasses = "bg-purple-600 text-white rounded-lg";
                    }
                  } else if (inRange) {
                    stateClasses = "bg-purple-200 text-purple-800 rounded-none";
                  }

                  const hoverClass =
                    !isPast && d.current ? "hover:bg-gray-200" : "";

                  return (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (d.current && !isPast) handleDateClick(d.day);
                      }}
                      disabled={!d.current || isPast}
                      className={`${baseClasses} ${disabledClasses} ${stateClasses} ${hoverClass}`}
                    >
                      <span className="select-none">{d.day}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          portalRoot,
        )
      : null;

  return (
    <div className={cn("relative", className)} ref={ref}>
      <input
        readOnly
        value={displayValue}
        onClick={() => {
          updatePopupPosition();
          setOpen(true);
        }}
        placeholder={placeholder}
        className={cn(
          "w-full cursor-pointer rounded-lg border border-[#d9d9d9] bg-white px-4 py-2 text-lg leading-[1.4] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:outline-none focus:ring-0",
          showIcon && "pr-10",
          inputClassName,
        )}
      />
      {showIcon && (
        <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-500" />
      )}
      {overlay}
    </div>
  );
};

export default DateRangePicker;
