import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DATE_FORMAT_MOMENT, toDisplayDateString } from "../../config";
import SearchableSelect from "../searchable-select";
const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const currentSystemYear = new Date().getFullYear();
const monthOptions = Array.from({ length: 12 }).map((_, index) => ({
  value: index,
  label: new Date(0, index).toLocaleString("default", { month: "short" }),
}));
const MAX_YEAR = 2050;
/** Compact popup size — never inherit input `width="100%"`. */
const CALENDAR_POPUP_WIDTH_PX = 280;
/** Approx popup height for flip calculations before paint. */
const CALENDAR_POPUP_HEIGHT_PX = 360;
const yearOptions = Array.from({ length: MAX_YEAR - (currentSystemYear - 100) + 1 }).map((_, index) => {
  const year = currentSystemYear - 100 + index;
  return {
    value: year,
    label: String(year),
  };
});

/**
 * Pick open direction from available viewport space.
 * @param {DOMRect} triggerRect
 * @param {"auto"|"bottom"|"top"|"left"|"right"} preferred
 * @param {{ width?: number, height?: number, gap?: number, pad?: number }} sizes
 * @returns {"bottom"|"top"|"left"|"right"}
 */
export function resolveCalendarOpenSide(
  triggerRect,
  preferred = "auto",
  {
    width = CALENDAR_POPUP_WIDTH_PX,
    height = CALENDAR_POPUP_HEIGHT_PX,
    gap = 8,
    pad = 8,
  } = {},
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const space = {
    bottom: vh - triggerRect.bottom - gap - pad,
    top: triggerRect.top - gap - pad,
    right: vw - triggerRect.right - gap - pad,
    left: triggerRect.left - gap - pad,
  };

  const fits = {
    bottom: space.bottom >= height * 0.55,
    top: space.top >= height * 0.55,
    right: space.right >= width,
    left: space.left >= width,
  };

  const preference = String(preferred || "auto").toLowerCase();
  if (
    preference !== "auto" &&
    ["bottom", "top", "left", "right"].includes(preference) &&
    (fits[preference] || space[preference] >= Math.max(...Object.values(space)) - 1)
  ) {
    // Honor explicit preference when it still has usable room.
    if (fits[preference] || space[preference] > 80) return preference;
  }

  // Prefer vertical placement (bottom → top), then horizontal (right → left).
  if (fits.bottom && space.bottom >= space.top) return "bottom";
  if (fits.top) return "top";
  if (fits.bottom) return "bottom";
  if (fits.right && space.right >= space.left) return "right";
  if (fits.left) return "left";
  if (fits.right) return "right";

  // Fallback: side with the most free space.
  let best = "bottom";
  let bestVal = space.bottom;
  for (const side of ["top", "right", "left"]) {
    if (space[side] > bestVal) {
      best = side;
      bestVal = space[side];
    }
  }
  return best;
}

/**
 * Fixed-position styles for a portaled calendar popup.
 */
export function buildCalendarPopupStyle(
  triggerRect,
  side,
  {
    width = CALENDAR_POPUP_WIDTH_PX,
    height = CALENDAR_POPUP_HEIGHT_PX,
    gap = 8,
    pad = 8,
    popupShift = 0,
    measuredHeight,
  } = {},
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const popupHeight = measuredHeight || height;

  const style = {
    position: "fixed",
    pointerEvents: "auto",
    zIndex: 99999,
    width,
    minWidth: width,
    maxWidth: width,
    boxSizing: "border-box",
  };

  const clampLeft = (left) =>
    Math.min(Math.max(pad, left), Math.max(pad, vw - width - pad));

  if (side === "top") {
    style.bottom = vh - triggerRect.top + gap;
    style.maxHeight = Math.max(120, triggerRect.top - gap - pad);
    // Prefer aligning to trigger start; flip to end if it would overflow right.
    if (triggerRect.left + width > vw - pad) {
      style.right = Math.max(pad, vw - triggerRect.right);
    } else {
      style.left = clampLeft(triggerRect.left);
    }
  } else if (side === "left") {
    style.right = vw - triggerRect.left + gap;
    style.maxWidth = Math.max(160, triggerRect.left - gap - pad);
    const top = Math.min(
      triggerRect.top,
      Math.max(pad, vh - popupHeight - pad),
    );
    style.top = Math.max(pad, top);
    style.maxHeight = Math.max(120, vh - style.top - pad);
  } else if (side === "right") {
    style.left = triggerRect.right + gap;
    style.maxWidth = Math.max(160, vw - triggerRect.right - gap - pad);
    const top = Math.min(
      triggerRect.top,
      Math.max(pad, vh - popupHeight - pad),
    );
    style.top = Math.max(pad, top);
    style.maxHeight = Math.max(120, vh - style.top - pad);
  } else {
    // bottom (default)
    style.top = triggerRect.bottom + gap;
    style.maxHeight = Math.max(120, vh - triggerRect.bottom - gap - pad);
    if (triggerRect.left + width > vw - pad) {
      style.right = Math.max(pad, vw - triggerRect.right);
    } else {
      style.left = clampLeft(triggerRect.left);
    }
  }

  if (popupShift) {
    style.transform = `translateX(-${popupShift}px)`;
  }

  return style;
}

// helper: format date based on format string
const formatWithPattern = (date, format) => {
  if (!date) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const mmm = new Date(date.getFullYear(), date.getMonth(), 1).toLocaleString("default", { month: "short" });
  const yyyy = date.getFullYear();

  // Replace MMM before MM to avoid collisions
  const formatted = format
    .replace("DD", dd)
    .replace("MMM", mmm)
    .replace("MM", mm)
    .replace("YYYY", yyyy);

  return format.includes("MMM") ? toDisplayDateString(formatted) : formatted;
};

// helper: parse string to date
const parseFromPattern = (value, format) => {
  try {
    let day, month, year;

    if (format === DATE_FORMAT_MOMENT) {
      [day, month, year] = value.split("/");

      // month may be numeric (01) or short name (Jan)
      if (!/^[0-9]+$/.test(month)) {
        const matched = monthOptions.find(
          (opt) => opt.label.toLowerCase() === String(month).toLowerCase(),
        );
        if (matched) {
          month = String(matched.value + 1);
        } else {
          const parsed = new Date(`${month} 1, ${year}`);
          if (!isNaN(parsed.getTime())) {
            month = String(parsed.getMonth() + 1);
          } else {
            return null;
          }
        }
      }
    } else if (format === "MM/DD/YYYY") {
      [month, day, year] = value.split("/");
    } else if (format === "YYYY-MM-DD") {
      [year, month, day] = value.split("-");
    }

    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

function HeaderSelect({ value, onChange, children, minWidthClass }) {
  return (
    <div className={`relative ${minWidthClass}`}>
      <select
        value={value}
        onChange={onChange}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundImage: "none",
        }}
        className="h-9 w-full appearance-none rounded-md border bg-white px-3 py-2 pr-9 text-sm leading-5"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
    </div>
  );
}

const Calendar = ({
  format = DATE_FORMAT_MOMENT,
  value: inputValue,
  onChange: setInputValue,
  onBlur: onBlurProp,
  width = "100%",
  showIcon = false,
  iconClassName = "text-purple-500",
  searchableMonth = true,
  searchableYear = true,
  inputClassName = "",
  minDate,
  maxDate,
  /**
   * Preferred open direction. Use `"auto"` (default) to pick bottom/top/left/right
   * based on free viewport space. Still accepts fixed `"bottom"|"top"|"left"|"right"`.
   */
  openFrom = "auto",
  // popupShift: number of pixels to shift popup left (positive moves left)
  popupShift = 0,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  /** Prevents Radix Dialog focus-restore from immediately reopening the popup after a date pick. */
  const suppressOpenRef = useRef(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const resolvedWidth = typeof width === "number" ? `${width}px` : width;

  const generateCalendar = (viewYear, viewMonth) => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    const dates = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      dates.push({ day: prevMonthDays - i, current: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      dates.push({ day: i, current: true });
    }

    while (dates.length % 7 !== 0) {
      dates.push({ day: dates.length - daysInMonth - firstDay + 1, current: false });
    }

    return dates;
  };

  const [fixedPopupStyle, setFixedPopupStyle] = useState(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setFixedPopupStyle(null);
      return;
    }

    const calc = () => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const measuredHeight = popupRef.current?.offsetHeight || 0;
      const side = resolveCalendarOpenSide(rect, openFrom, {
        width: CALENDAR_POPUP_WIDTH_PX,
        height: measuredHeight || CALENDAR_POPUP_HEIGHT_PX,
      });
      setFixedPopupStyle(
        buildCalendarPopupStyle(rect, side, {
          width: CALENDAR_POPUP_WIDTH_PX,
          height: CALENDAR_POPUP_HEIGHT_PX,
          measuredHeight: measuredHeight || undefined,
          popupShift,
        }),
      );
    };

    calc();
    // Re-measure after paint so flip uses real popup height.
    const raf = requestAnimationFrame(calc);
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
    };
  }, [open, openFrom, popupShift]);

  const getMonthBoundsForYear = (forYear) => {
    const minM =
      minDate && forYear === minDate.getFullYear() ? minDate.getMonth() : 0;
    const maxM =
      maxDate && forYear === maxDate.getFullYear() ? maxDate.getMonth() : 11;
    return { minM, maxM };
  };

  /** Keep month inside the allowed range for a year (FY end year → Jan–Mar, etc.). */
  const resolveYearMonth = (forYear, forMonth, { snapToStartWhenPastMax = false } = {}) => {
    const { minM, maxM } = getMonthBoundsForYear(forYear);
    let nextMonth = forMonth;
    if (nextMonth < minM) nextMonth = minM;
    else if (nextMonth > maxM) nextMonth = snapToStartWhenPastMax ? minM : maxM;
    return new Date(forYear, nextMonth, 1);
  };

  /**
   * Clamp a view date into [minDate, maxDate], including across years.
   * Needed when Due/Closure min jumps to next calendar year after Assigned is set
   * (e.g. view still on Jul 2026 while minDate is 16 Jan 2027).
   */
  const clampToAllowedRange = (date) => {
    if (!date) return date;
    const next = new Date(date.getFullYear(), date.getMonth(), 1);
    const minMonthStart = minDate
      ? new Date(minDate.getFullYear(), minDate.getMonth(), 1)
      : null;
    const maxMonthStart = maxDate
      ? new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
      : null;
    // Callers can hand us an impossible window (min after max). Settle on the
    // minimum instead of bouncing the view between the two bounds forever.
    if (minMonthStart && maxMonthStart && minMonthStart > maxMonthStart) {
      return minMonthStart;
    }
    if (minMonthStart && next < minMonthStart) return minMonthStart;
    if (maxMonthStart && next > maxMonthStart) return maxMonthStart;
    return resolveYearMonth(next.getFullYear(), next.getMonth());
  };

  const changeMonth = (direction) => {
    // When the current month is outside allowed [minDate,maxDate] bounds (common in constrained FY),
    // clamp navigation to the active allowed month before applying the arrow.
    const { minM: visibleMinMonth, maxM: visibleMaxMonth } =
      getMonthBoundsForYear(year);
    const activeMonth =
      month < visibleMinMonth || month > visibleMaxMonth
        ? visibleMinMonth
        : month;

    const newDate = new Date(year, activeMonth + direction, 1);
    const clamped = clampToAllowedRange(newDate);

    if (
      clamped.getFullYear() === year &&
      clamped.getMonth() === activeMonth &&
      (newDate.getFullYear() !== year || newDate.getMonth() !== activeMonth)
    ) {
      return;
    }
    setCurrentDate(clamped);
  };

  const handleYearChange = (selectedYear) => {
    const newYear = Number(selectedYear);
    // When jumping to a year where the current month is invalid (e.g. Jul → FY end year),
    // land on the first valid month (January), not the last (March).
    setCurrentDate(resolveYearMonth(newYear, month, { snapToStartWhenPastMax: true }));
  };

  const handleMonthChange = (selectedMonth) => {
    setCurrentDate(resolveYearMonth(year, Number(selectedMonth)));
  };

  const effMaxYear = maxDate ? maxDate.getFullYear() : MAX_YEAR;
  const effMaxMonth = maxDate ? maxDate.getMonth() : 11;
  const effMinYear = minDate ? minDate.getFullYear() : currentSystemYear - 100;
  const effMinMonth = minDate ? minDate.getMonth() : 0;
  const viewBeforeMin =
    Boolean(minDate) &&
    (year < effMinYear || (year === effMinYear && month < effMinMonth));
  const viewAfterMax =
    Boolean(maxDate) &&
    (year > effMaxYear || (year === effMaxYear && month > effMaxMonth));
  // Allow navigating into the valid range when the current view is outside it
  // (e.g. empty due date still showing "today" while minDate is next FY).
  const canGoNext =
    viewBeforeMin ||
    !(year > effMaxYear || (year === effMaxYear && month >= effMaxMonth));
  const canGoPrev =
    viewAfterMax ||
    !(year < effMinYear || (year === effMinYear && month <= effMinMonth));

  useEffect(() => {
    const handleClickOutside = (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;

      const clickedInside = Boolean(wrapperRef.current?.contains(target));
      const clickedPopup = Boolean(popupRef.current?.contains(target));
      const clickedSearchableSelect = Boolean(
        target.closest?.("[data-searchable-select]"),
      );

      if (clickedInside || clickedPopup || clickedSearchableSelect) return;

      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timestamp deps avoid resetting the month/year view when parents pass new Date
  // instances with the same bounds on every render.
  const minTime = minDate?.getTime() ?? null;
  const maxTime = maxDate?.getTime() ?? null;

  // Sync selected date from the controlled input. Snap the *view* only when
  // the stored value (or format) changes — never when min/max object identity
  // changes alone (that used to yank navigation back to the selected month).
  useEffect(() => {
    const parsed = parseFromPattern(inputValue, format);
    setSelectedDate(parsed);
    if (parsed) {
      setCurrentDate(clampToAllowedRange(parsed));
      return;
    }
    // Empty value: land in the nearest allowed month for constrained FYs.
    setCurrentDate((prev) => clampToAllowedRange(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: value/format only
  }, [format, inputValue]);

  // Keep the displayed month inside [minDate, maxDate] without using selectedDate.
  useEffect(() => {
    setCurrentDate((prev) => {
      const clamped = clampToAllowedRange(prev);
      if (
        !clamped ||
        (clamped.getFullYear() === prev.getFullYear() &&
          clamped.getMonth() === prev.getMonth())
      ) {
        return prev;
      }
      return clamped;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clamp on view/bounds only
  }, [year, month, minTime, maxTime]);

  const minDay = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : null;

  const maxDay = maxDate
    ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
    : null;

  // When minDate/maxDate are set, restrict years and months shown in the header.
  const visibleYearOptions = yearOptions.filter((opt) => {
    if (minDate && opt.value < minDate.getFullYear()) return false;
    if (maxDate && opt.value > maxDate.getFullYear()) return false;
    return true;
  });

  const { minM: visibleMinMonth, maxM: visibleMaxMonth } = getMonthBoundsForYear(year);
  const visibleMonthOptions = monthOptions.filter(
    (opt) => opt.value >= visibleMinMonth && opt.value <= visibleMaxMonth,
  );
  // Keep <select value> / grid in sync with allowed months so we never show Jan
  // while still rendering an out-of-range month (e.g. July) with every day disabled.
  const viewMonth =
    month < visibleMinMonth || month > visibleMaxMonth ? visibleMinMonth : month;
  const calendarDays = generateCalendar(year, viewMonth);

  const isDisabled = (day, isCurrent) => {
    if (!isCurrent) return true;
    const d = new Date(year, viewMonth, day);
    if (minDay && d < minDay) return true;
    if (maxDay && d > maxDay) return true;
    return false;
  };

  const handleDateSelect = (day) => {
    if (isDisabled(day, true)) return;
    const date = new Date(year, viewMonth, day);
    const formatted = formatWithPattern(date, format);
    setSelectedDate(date);
    setInputValue(formatted);
    suppressOpenRef.current = true;
    setOpen(false);
    // Blur after select so the field focuses out (Dialog may re-focus the input once).
    requestAnimationFrame(() => {
      inputRef.current?.blur();
      onBlurProp?.();
      window.setTimeout(() => {
        suppressOpenRef.current = false;
      }, 150);
    });
  };

  const handleInputBlur = () => {
    if (suppressOpenRef.current) {
      onBlurProp?.();
      return;
    }
    const parsed = parseFromPattern(inputValue, format);
    if (parsed) {
      if (minDay && parsed < minDay) {
        setInputValue("");
        setSelectedDate(null);
        onBlurProp?.();
        return;
      }
      if (maxDay && parsed > maxDay) {
        setInputValue("");
        setSelectedDate(null);
        onBlurProp?.();
        return;
      }
      // Update the stored selection only. Do not setCurrentDate — focusing the
      // month/year dropdown blurs this input and would otherwise snap the view
      // back to the selected date (e.g. 07/AUG/2026) while navigating FY 2027.
      setSelectedDate(parsed);
    }
    onBlurProp?.();
  };

  return (
    <div className="relative" ref={wrapperRef} style={{ width: resolvedWidth }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => {
          if (suppressOpenRef.current) {
            // Dialog focus trap may restore focus after a pick — keep the field blurred.
            inputRef.current?.blur();
            return;
          }
          setOpen(true);
        }}
        onBlur={handleInputBlur}
        placeholder="Select Date"
        className={`w-full mt-1 rounded-lg border bg-white px-3 py-2 normal-case placeholder:normal-case focus:outline-none focus:ring-1 focus:ring-blue-400 ${
          showIcon ? "pr-10" : ""
        } ${inputClassName}`}
      />
      {showIcon && (
        <CalendarIcon
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${iconClassName}`}
        />
      )}

      {open &&
        fixedPopupStyle &&
        createPortal(
          <div
            ref={popupRef}
            data-date-range-picker-popup
            className="pointer-events-auto box-border w-[280px] max-w-[280px] overflow-auto rounded-2xl bg-gray-100 p-3 shadow-2xl"
            style={fixedPopupStyle}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
          <div className="relative z-20 mb-4 flex min-w-0 items-center justify-between gap-2">
              <div className="flex-shrink-0">
                <button type="button" onClick={() => changeMonth(-1)} disabled={!canGoPrev} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 flex-1 items-center justify-center min-w-0 px-2">
                <div className="flex-1 min-w-0 mr-3">
                  {searchableMonth ? (
                    <SearchableSelect
                      options={visibleMonthOptions}
                      value={viewMonth}
                      onChange={handleMonthChange}
                      placeholder="Month"
                      disablePortal
                    />
                  ) : (
                    <div className="min-w-0">
                      <HeaderSelect
                        value={viewMonth}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        minWidthClass="min-w-[88px]"
                      >
                        {visibleMonthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </HeaderSelect>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {searchableYear ? (
                    <SearchableSelect
                      options={visibleYearOptions}
                      value={year}
                      onChange={handleYearChange}
                      placeholder="Year"
                      disablePortal
                    />
                  ) : (
                    <div className="min-w-0">
                      <HeaderSelect
                        value={year}
                        onChange={(e) => handleYearChange(e.target.value)}
                        minWidthClass="min-w-[88px]"
                      >
                        {visibleYearOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </HeaderSelect>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0">
                <button type="button" onClick={() => changeMonth(1)} disabled={!canGoNext} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

          <div className="relative z-0 mb-2 grid grid-cols-7 text-center text-sm text-gray-500">
            {days.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="relative z-0 grid grid-cols-7 gap-2 text-center">
            {calendarDays.map((date, idx) => {
              const disabled = isDisabled(date.day, date.current);
              const isSelected =
                selectedDate &&
                date.current &&
                selectedDate.getDate() === date.day &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getFullYear() === year;
              return (
                <button
                  type="button"
                  key={idx}
                  onMouseDown={(e) => {
                    // Prevent button focus / Dialog focus churn; select on mousedown like stable pickers.
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled) handleDateSelect(date.day);
                  }}
                  disabled={disabled}
                  className={`py-2 rounded-lg text-sm transition
                    ${disabled ? "text-gray-300 cursor-not-allowed" : "text-black"}
                    ${isSelected
                      ? "bg-purple-600 text-white"
                      : disabled ? "" : "hover:bg-gray-200"
                    }`}
                >
                  {date.day}
                </button>
              );
            })}
          </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Calendar;
