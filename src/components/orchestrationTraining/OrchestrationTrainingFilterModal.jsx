import { useEffect, useMemo, useState, useCallback } from "react";
import { useFormik } from "formik";
import { X } from "lucide-react";
import DateRangePicker from "../../atoms/date-range-picker";
import MultiSelectDropdown from "../../atoms/multi-select-dropdown";
import SearchableMultiSelectPicker from "../../atoms/searchable-multi-select-picker";
import { getTrainings } from "../../api/trainingApi";

const createFinancialYearLabel = (startYear) =>
  `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;

export const TRAINING_FILTER_INITIAL_VALUES = {
  training_name: [],
  financial_year: [],
  due_date: "",
  assigned_date: "",
  closure_date: "",
};

/** Keep first occurrence of each training name (case-insensitive). */
const uniqueTrainingsByName = (items = []) => {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const name = String(item?.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
};

const DATE_RANGE_FIELDS = [
  { key: "assigned_date", label: "Training Assigned Date" },
  { key: "due_date", label: "Training Due Date" },
  { key: "closure_date", label: "Activity Closure Date" },
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

const validateTrainingDateRanges = (values) => {
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

/** Normalize UI draft vs applied filters so "All"/empty defaults aren't treated as dirty. */
const normalizeTrainingFiltersForCompare = (filters) => {
  const base = { ...TRAINING_FILTER_INITIAL_VALUES, ...(filters || {}) };

  let trainingName = Array.isArray(base.training_name) ? base.training_name : [];
  if (
    trainingName.length === 0 ||
    trainingName.some((item) => String(item?.id ?? item) === "All")
  ) {
    trainingName = [];
  } else {
    trainingName = trainingName
      .map((item) => String(item?.id ?? item?.name ?? item))
      .filter(Boolean)
      .sort();
  }

  let financialYear = Array.isArray(base.financial_year)
    ? base.financial_year
    : base.financial_year
      ? [base.financial_year]
      : [];
  financialYear = financialYear
    .filter((year) => year && year !== "All")
    .map(String)
    .sort();

  return {
    training_name: trainingName,
    financial_year: financialYear,
    due_date: base.due_date || "",
    assigned_date: base.assigned_date || "",
    closure_date: base.closure_date || "",
  };
};

const areTrainingFiltersEqual = (left, right) =>
  JSON.stringify(normalizeTrainingFiltersForCompare(left)) ===
  JSON.stringify(normalizeTrainingFiltersForCompare(right));

function TrainingNamePicker({
  values: valuesProp,
  onChange,
  placeholder = "Select training names",
  highlightValue,
}) {
  const fetchOptions = useCallback(async (searchTerm) => {
    const res = await getTrainings({
      page_number: 1,
      limit: 100,
      ...(searchTerm.length >= 3 && { search: searchTerm }),
      order_by: ["training_name"],
    });
    const items = Array.isArray(res)
      ? res
      : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data)
          ? res.data
          : [];
    return uniqueTrainingsByName(
      items
        .map((item) => ({
          id:
            item?.id ??
            item?.training_id ??
            item?.trainingId ??
            item?.name ??
            item?.training_name,
          name:
            item?.training_name ??
            item?.trainingName ??
            item?.name ??
            String(item?.id ?? ""),
        }))
        .filter((item) => item?.name),
    );
  }, []);

  return (
    <SearchableMultiSelectPicker
      values={valuesProp}
      onChange={onChange}
      fetchOptions={fetchOptions}
      placeholder={placeholder}
      highlightValue={highlightValue}
      minSearchLength={3}
      debounceMs={600}
    />
  );
}

export default function OrchestrationTrainingFilterModal({
  currentFilters,
  onApply,
  isOpen,
  setIsOpen,
}) {
  const financialYearOptions = useMemo(() => {
    const today = new Date();
    const currentFinancialYearStart =
      today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    const years = Array.from({ length: 11 }, (_, index) =>
      createFinancialYearLabel(currentFinancialYearStart - 5 + index)
    );
    // Provide explicit "All" option that maps to no filter when applied
    return ["All", ...years];
  }, []);

  const initialFormValues = useMemo(() => {
    const base = { ...TRAINING_FILTER_INITIAL_VALUES, ...(currentFilters || {}) };

    const computedFinancialYear = Array.isArray(base.financial_year)
      ? base.financial_year
      : base.financial_year
      ? [base.financial_year]
      : [];

    const computedTrainingName = (() => {
      if (Array.isArray(base.training_name)) {
        if (base.training_name.length === 0) {
          // Default to 'All' selected in the UI when no training names provided
          return [{ id: "All", name: "All" }];
        }
        return base.training_name
          .map((v) => (typeof v === "string" ? { id: v, name: v } : v ?? null))
          .filter(Boolean);
      }

      if (base.training_name) {
        return typeof base.training_name === "string"
          ? [{ id: base.training_name, name: base.training_name }]
          : [];
      }

      return [{ id: "All", name: "All" }];
    })();

    return {
      ...base,
      financial_year: computedFinancialYear,
      training_name: computedTrainingName,
    };
  }, [currentFilters]);

  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [dateRangeErrors, setDateRangeErrors] = useState({});

  const { values, setFieldValue, submitForm, resetForm } = useFormik({
    initialValues: initialFormValues,
    enableReinitialize: true,
    onSubmit: (formValues) => {
      const dateErrors = validateTrainingDateRanges(formValues);
      if (Object.keys(dateErrors).length > 0) {
        setDateRangeErrors(dateErrors);
        return;
      }
      setDateRangeErrors({});

      const payload = { ...formValues };
      if (Array.isArray(payload.financial_year) && payload.financial_year.includes("All")) {
        // selecting 'All' means do not filter by year
        payload.financial_year = [];
      }

      // If training_name includes the special "All" id, treat it as no filter
      if (Array.isArray(payload.training_name) && payload.training_name.some((t) => String(t?.id ?? t) === "All")) {
        payload.training_name = [];
      }

      onApply?.(payload);
      setIsOpen(false);
    },
  });

  const hasUnsavedChanges = !areTrainingFiltersEqual(values, currentFilters);

  useEffect(() => {
    if (!isOpen) {
      setDiscardConfirmOpen(false);
      setDateRangeErrors({});
    }
  }, [isOpen]);

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

  const requestClose = () => {
    if (hasUnsavedChanges) {
      setDiscardConfirmOpen(true);
      return;
    }
    resetForm({ values: initialFormValues });
    setIsOpen(false);
  };

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false);
    resetForm({ values: initialFormValues });
    setIsOpen(false);
  };

  const [trainingNameOptions, setTrainingNameOptions] = useState([]);
  const [trainingNameLoading, setTrainingNameLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setTrainingNameLoading(true);
    // (async () => {
    //   try {
    //     const res = await getTrainings({
    //       page: 1,
    //       page_size: 100,
    //       order_by: ["training_name"],
    //     });
    //     const items = Array.isArray(res)
    //       ? res
    //       : Array.isArray(res?.items)
    //       ? res.items
    //       : Array.isArray(res?.data)
    //       ? res.data
    //       : [];
    //     const names = [...new Set(items.map((i) => i.training_name).filter(Boolean))].sort();
    //     if (!cancelled) setTrainingNameOptions(names);
    //   } catch (e) {
    //     // silent
    //   } finally {
    //     if (!cancelled) setTrainingNameLoading(false);
    //   }
    // })();

    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={requestClose}
      />
      <div className="relative bg-white w-[700px] mx-4 rounded-2xl shadow-xl p-6 animate-[fadeIn_.2s_ease-out] h-[550px] flex flex-col">
        <div className="flex justify-between items-center pb-2">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-md p-1 hover:border hover:border-gray-400 text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 mt-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Training Name */}
            <div className="flex flex-col">
              <label className="mb-1.5 text-sm font-semibold">Training Name</label>
              <div className="mt-2">
                <TrainingNamePicker
                  values={values.training_name || []}
                  onChange={(selected) => setFieldValue("training_name", selected)}
                  placeholder="Select training names"
                  highlightValue="All"
                />
              </div>
            </div>

            {/* Financial Year */}
            <div>
              <label className="text-sm font-semibold">Financial Year</label>
              <div className="mt-2">
                <MultiSelectDropdown
                  options={financialYearOptions}
                  value={values.financial_year || []}
                  onChange={(arr) => {
                    const next = Array.isArray(arr) ? arr : [];
                    if (next.includes("All")) {
                      // If 'All' selected, keep only 'All'
                      setFieldValue("financial_year", ["All"]);
                    } else {
                      // Otherwise ensure 'All' is not present
                      setFieldValue("financial_year", next.filter((v) => v !== "All"));
                    }
                  }}
                  placeholder="All"
                  getSelectedText={(selected) =>
                    selected && selected.length > 0 ? selected.join(", ") : "All"
                  }
                  highlightValue="All"
                  className="w-full"
                />
              </div>
            </div>

            {/* Training Assigned Date */}
            <div>
              <label className="mb-2 block text-sm font-semibold">Training Assigned Date</label>
              <DateRangePicker
                value={values.assigned_date}
                onChange={(val) => updateDateRangeField("assigned_date", val)}
                showIcon
                emitPartialSelection
                inputClassName={dateRangeErrors.assigned_date ? "border-red-500" : ""}
              />
              {dateRangeErrors.assigned_date ? (
                <small className="mt-1 block text-red-500">{dateRangeErrors.assigned_date}</small>
              ) : null}
            </div>

            {/* Training Due Date */}
            <div>
              <label className="mb-2 block text-sm font-semibold">Training Due Date</label>
              <DateRangePicker
                value={values.due_date}
                onChange={(val) => updateDateRangeField("due_date", val)}
                showIcon
                emitPartialSelection
                inputClassName={dateRangeErrors.due_date ? "border-red-500" : ""}
              />
              {dateRangeErrors.due_date ? (
                <small className="mt-1 block text-red-500">{dateRangeErrors.due_date}</small>
              ) : null}
            </div>

            {/* Activity Closure Date */}
            <div>
              <label className="mb-2 block text-sm font-semibold">Activity Closure Date</label>
              <DateRangePicker
                value={values.closure_date}
                onChange={(val) => updateDateRangeField("closure_date", val)}
                showIcon
                placement="top"
                emitPartialSelection
                inputClassName={dateRangeErrors.closure_date ? "border-red-500" : ""}
              />
              {dateRangeErrors.closure_date ? (
                <small className="mt-1 block text-red-500">{dateRangeErrors.closure_date}</small>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer — always pinned at bottom */}
        <div className="flex justify-between items-center pt-4 mt-4">
          <button
            type="button"
            onClick={() => {
              // Reset UI to modal defaults (select 'All' for training_name) but clear external filters
              setDateRangeErrors({});
              resetForm({ values: initialFormValues });
              onApply?.(TRAINING_FILTER_INITIAL_VALUES);
              setIsOpen(false);
            }}
            className="text-purple-600 font-bold"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={submitForm}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold"
          >
            Apply Filters
          </button>
        </div>

        {discardConfirmOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <h3 className="text-lg font-semibold">Discard filter changes?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Your unsaved filter selections will be lost if you close this modal.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDiscardConfirmOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
