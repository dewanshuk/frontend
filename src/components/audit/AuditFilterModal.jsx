import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormik } from "formik";
import { ChevronDown, X } from "lucide-react";

import DateRangePicker from "@/atoms/date-range-picker";
import SearchableMultiSelectPicker from "@/atoms/searchable-multi-select-picker";
import {
  listAuditDepartmentOptions,
  listAuditNameOptions,
} from "@/api/audit";
import { cn } from "@/lib/utils";

export const AUDIT_FILTER_INITIAL_VALUES = {
  status: "",
  departments: [],
  audit_names: [],
  /** Range string: "DD/MMM/YYYY - DD/MMM/YYYY" (audit start date filter) */
  start_date: "",
  /** Range string: "DD/MMM/YYYY - DD/MMM/YYYY" (audit end date filter) */
  end_date: "",
  /** Kept for KPI tile filters on the dashboard */
  due_for_me: false,
  overdue_for_me: false,
};

/** Count of active modal/KPI filter criteria (for Filters button badge). */
export const countAppliedAuditFilters = (filters = {}) => {
  let count = 0;

  const status = Array.isArray(filters.status)
    ? filters.status[0]
    : filters.status;
  if (status && String(status).trim() && String(status) !== "All") {
    count += 1;
  }

  if (Array.isArray(filters.departments) && filters.departments.length > 0) {
    count += 1;
  }
  if (Array.isArray(filters.audit_names) && filters.audit_names.length > 0) {
    count += 1;
  }
  if (String(filters.start_date || "").trim()) count += 1;
  if (String(filters.end_date || "").trim()) count += 1;
  // date_range alone (without discrete start/end) still counts as one criterion
  if (
    !String(filters.start_date || "").trim() &&
    !String(filters.end_date || "").trim() &&
    String(filters.date_range || "").trim()
  ) {
    count += 1;
  }
  if (filters.due_for_me) count += 1;
  if (filters.overdue_for_me) count += 1;

  return count;
};

const STATUS_OPTIONS = ["Draft", "In-Progress", "Completed"];

const DATE_RANGE_FIELDS = [
  { key: "start_date", label: "Start Date" },
  { key: "end_date", label: "End Date" },
];

const parseDateRangeValue = (value) => {
  const parts = String(value || "")
    .split(/\s*-\s*/)
    .map((part) => part?.trim())
    .filter(Boolean);
  return { from: parts[0] || "", to: parts[1] || "" };
};

const isCompleteDateRangeValue = (value) => {
  if (!value || !String(value).trim()) return true;
  const { from, to } = parseDateRangeValue(value);
  return Boolean(from && to);
};

const validateAuditDateRanges = (values) => {
  const errors = {};
  DATE_RANGE_FIELDS.forEach(({ key, label }) => {
    const value = values?.[key];
    if (!value || !String(value).trim()) return;
    if (!isCompleteDateRangeValue(value)) {
      errors[key] = `Please select a full ${label} range (start and end date).`;
    }
  });
  return errors;
};

const normalizePickerValues = (value) => {
  if (!Array.isArray(value)) {
    if (!value) return [];
    if (typeof value === "string") return [{ id: value, name: value }];
    return value?.id != null || value?.name != null
      ? [{ id: value.id ?? value.name, name: value.name ?? String(value.id) }]
      : [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") return { id: item, name: item };
      if (!item) return null;
      const id = item.id ?? item.name;
      const name = item.name ?? String(item.id ?? "");
      if (!id && !name) return null;
      return { id, name };
    })
    .filter(Boolean);
};

const toNameList = (value) =>
  normalizePickerValues(value)
    .map((item) => String(item.name || item.id || "").trim())
    .filter(Boolean)
    .filter((name) => name !== "All");

function StatusSelect({ value = "", onChange, placeholder = "select" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelStyle, setPanelStyle] = useState(null);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);

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

    // Status sits low in the filter modal — always open upward so the
    // list overlays the modal content instead of expanding scroll height.
    setPanelStyle({
      position: "fixed",
      left,
      width,
      bottom: window.innerHeight - rect.top + gap,
      top: "auto",
      zIndex: 200,
      maxHeight: Math.min(240, Math.max(120, rect.top - viewportPad)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    updatePanelPosition();
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 50);

    const handler = (event) => {
      const inTrigger = rootRef.current?.contains(event.target);
      const inPanel = panelRef.current?.contains(event.target);
      if (!inTrigger && !inPanel) setOpen(false);
    };

    const onReposition = () => updatePanelPosition();

    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePanelPosition]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return STATUS_OPTIONS;
    return STATUS_OPTIONS.filter((option) =>
      option.toLowerCase().includes(query),
    );
  }, [search]);

  const panel =
    open && panelStyle ? (
      <div
        ref={panelRef}
        style={panelStyle}
        className="flex w-full flex-col overflow-hidden rounded-lg border border-[#d9d9d9] bg-white shadow-lg"
      >
        <div className="border-b p-2">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search…"
            className="w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
        <div className="overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-2.5 text-sm text-gray-400">
              No results found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange?.(option === value ? "" : option);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50",
                  option === value && "bg-blue-50 font-medium text-blue-700",
                )}
              >
                {option}
              </button>
            ))
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-[#d9d9d9] bg-white px-4 py-2 text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            "truncate text-lg leading-[1.4]",
            value ? "text-[#1e1e1e]" : "text-[#b3b3b3]",
          )}
        >
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="shrink-0 text-purple-500" />
      </button>
      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}

export default function AuditFilterModal({
  currentFilters,
  onApply,
  isOpen,
  setIsOpen,
}) {
  const [dateRangeErrors, setDateRangeErrors] = useState({});
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [auditNameOptions, setAuditNameOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState("");

  /** Prefetch picklists as soon as the filter modal opens so Network shows the calls. */
  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    const loadPicklists = async () => {
      setOptionsLoading(true);
      setOptionsError("");
      try {
        const [departments, auditNames] = await Promise.all([
          listAuditDepartmentOptions(),
          listAuditNameOptions(),
        ]);
        if (cancelled) return;
        setDepartmentOptions(Array.isArray(departments) ? departments : []);
        setAuditNameOptions(Array.isArray(auditNames) ? auditNames : []);
      } catch {
        if (cancelled) return;
        setDepartmentOptions([]);
        setAuditNameOptions([]);
        setOptionsError("Unable to load filter options. Please try again.");
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    };

    loadPicklists();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setDateRangeErrors({});
  }, [isOpen]);

  const initialFormValues = useMemo(() => {
    const base = { ...AUDIT_FILTER_INITIAL_VALUES, ...(currentFilters || {}) };
    const statusValue = Array.isArray(base.status)
      ? base.status[0] || ""
      : base.status || "";

    return {
      ...base,
      status: statusValue === "All" ? "" : statusValue,
      departments: normalizePickerValues(base.departments),
      audit_names: normalizePickerValues(base.audit_names),
      start_date: base.start_date || "",
      end_date: base.end_date || "",
      due_for_me: Boolean(base.due_for_me),
      overdue_for_me: Boolean(base.overdue_for_me),
    };
  }, [currentFilters]);

  const { values, setFieldValue, submitForm, resetForm } = useFormik({
    initialValues: initialFormValues,
    enableReinitialize: true,
    onSubmit: (formValues) => {
      const rangeErrors = validateAuditDateRanges(formValues);
      if (Object.keys(rangeErrors).length > 0) {
        setDateRangeErrors(rangeErrors);
        return;
      }
      setDateRangeErrors({});

      const start_date = String(formValues.start_date || "").trim();
      const end_date = String(formValues.end_date || "").trim();
      const departments = toNameList(formValues.departments);
      const audit_names = toNameList(formValues.audit_names);

      onApply?.({
        ...AUDIT_FILTER_INITIAL_VALUES,
        status: formValues.status || "",
        departments,
        audit_names,
        start_date,
        end_date,
        due_for_me: Boolean(formValues.due_for_me),
        overdue_for_me: Boolean(formValues.overdue_for_me),
      });
      setIsOpen(false);
    },
  });

  const updateDateRangeField = (key, val) => {
    setFieldValue(key, val || "");
    setDateRangeErrors((prev) => {
      if (!prev[key]) return prev;
      if (isCompleteDateRangeValue(val) || !val) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev;
    });
  };

  const fetchAuditNameOptions = useCallback(async (searchTerm = "") => {
    // Prefer values already loaded when the modal opened (API-backed).
    let source = auditNameOptions;
    if (!source.length) {
      source = await listAuditNameOptions();
    }
    const query = String(searchTerm || "").trim().toLowerCase();
    if (!query) return source;
    return source.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(query),
    );
  }, [auditNameOptions]);

  const fetchDepartmentOptions = useCallback(async (searchTerm = "") => {
    let source = departmentOptions;
    // Always hit the API if cache is empty so Network always shows a request.
    if (!source.length) {
      source = await listAuditDepartmentOptions();
      setDepartmentOptions(source);
    }
    const query = String(searchTerm || "").trim().toLowerCase();
    if (!query) return source;
    return source.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(query),
    );
  }, [departmentOptions]);

  const handleClose = () => {
    setDateRangeErrors({});
    resetForm({ values: initialFormValues });
    setIsOpen(false);
  };

  const handleReset = () => {
    setDateRangeErrors({});
    resetForm({ values: AUDIT_FILTER_INITIAL_VALUES });
    onApply?.({ ...AUDIT_FILTER_INITIAL_VALUES });
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-visible rounded-2xl bg-white p-8 shadow-xl animate-[fadeIn_.2s_ease-out] sm:p-10">
        <div className="mb-6 flex shrink-0 items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-[-0.48px] text-[#1e1e1e]">
            Filters
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex size-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close filters"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-visible pr-1">
          {optionsError ? (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {optionsError}
            </p>
          ) : null}
          {optionsLoading ? (
            <p className="mb-4 text-sm text-[#757575]">Loading filter options…</p>
          ) : null}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e1e1e]">
                Audit Name
              </label>
              <SearchableMultiSelectPicker
                values={values.audit_names}
                onChange={(next) => setFieldValue("audit_names", next)}
                fetchOptions={fetchAuditNameOptions}
                fetchOnOpenOnly
                portal
                panelZIndex={200}
                placeholder={optionsLoading ? "Loading…" : "select"}
                searchPlaceholder="Search audit names…"
                debounceMs={200}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e1e1e]">
                Department Name
              </label>
              <SearchableMultiSelectPicker
                values={values.departments}
                onChange={(next) => setFieldValue("departments", next)}
                fetchOptions={fetchDepartmentOptions}
                fetchOnOpenOnly
                portal
                panelZIndex={200}
                placeholder={optionsLoading ? "Loading…" : "select"}
                searchPlaceholder="Search departments…"
                debounceMs={200}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e1e1e]">
                Start Date
              </label>
              <DateRangePicker
                value={values.start_date}
                onChange={(val) => updateDateRangeField("start_date", val)}
                showIcon
                emitPartialSelection
                placeholder="Start & End Dates"
                inputClassName={
                  dateRangeErrors.start_date ? "border-red-500" : ""
                }
              />
              {dateRangeErrors.start_date ? (
                <small className="mt-1 block text-red-500">
                  {dateRangeErrors.start_date}
                </small>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e1e1e]">
                End Date
              </label>
              <DateRangePicker
                value={values.end_date}
                onChange={(val) => updateDateRangeField("end_date", val)}
                showIcon
                emitPartialSelection
                placeholder="Start & End Dates"
                inputClassName={
                  dateRangeErrors.end_date ? "border-red-500" : ""
                }
              />
              {dateRangeErrors.end_date ? (
                <small className="mt-1 block text-red-500">
                  {dateRangeErrors.end_date}
                </small>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e1e1e]">
                Status
              </label>
              <StatusSelect
                value={values.status}
                onChange={(next) => setFieldValue("status", next)}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg px-2 py-3 text-base font-bold text-purple-600 transition hover:bg-purple-50"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={submitForm}
            className="min-w-[160px] rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-3 text-base font-bold text-white transition hover:from-purple-600 hover:to-purple-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
