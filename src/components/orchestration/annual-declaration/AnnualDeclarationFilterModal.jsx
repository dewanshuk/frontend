import { useEffect, useMemo, useState } from "react";

import DateRangePicker from "@/atoms/date-range-picker";
import Loader from "@/atoms/loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  calendarInputClass,
  dialogContentClass,
  dialogHeaderClass,
  dialogPortalOutsideProps,
  dialogTitleClass,
  fieldGroupClass,
  fieldLabelClass,
  filterApplyButtonClass,
  filterResetButtonClass,
  footerClass,
  formGridClass,
  selectClass,
} from "./annualDeclarationModalStyles";

const EMPTY_FILTERS = {
  declarationName: "",
  financialYear: "",
  dueDate: "",
  assignedDate: "",
  closureDate: "",
};

const normalizeAnnualFilters = (filters) => {
  const base = { ...EMPTY_FILTERS, ...(filters || {}) };
  return {
    declarationName: String(base.declarationName || "").trim(),
    financialYear: String(base.financialYear || "").trim(),
    dueDate: String(base.dueDate || "").trim(),
    assignedDate: String(base.assignedDate || "").trim(),
    closureDate: String(base.closureDate || "").trim(),
  };
};

const areAnnualFiltersEqual = (left, right) =>
  JSON.stringify(normalizeAnnualFilters(left)) === JSON.stringify(normalizeAnnualFilters(right));

const DATE_RANGE_FIELDS = [
  { key: "assignedDate", label: "Assigned Date" },
  { key: "dueDate", label: "Due Date" },
  { key: "closureDate", label: "Activity Closure Date" },
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

const validateAnnualDateRanges = (filters) => {
  const errors = {};
  DATE_RANGE_FIELDS.forEach(({ key, label }) => {
    const value = filters?.[key];
    if (!value || !String(value).trim()) return;
    if (!isCompleteDateRangeValue(value)) {
      errors[key] = `Please select a full ${label} range (start and end date).`;
    }
  });
  return errors;
};

export default function AnnualDeclarationFilterModal({
  open,
  onOpenChange,
  currentFilters,
  onApply,
  declarationNameOptions,
  financialYearOptions,
  isLoading = false,
}) {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [dateRangeErrors, setDateRangeErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setDiscardConfirmOpen(false);
      setDateRangeErrors({});
      return;
    }
    setDraft({ ...EMPTY_FILTERS, ...(currentFilters ?? {}) });
  }, [open, currentFilters]);

  const updateDateRangeField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value ?? "" }));
    setDateRangeErrors((prev) => {
      if (!prev[key]) return prev;
      if (isCompleteDateRangeValue(value) || !value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev;
    });
  };

  const hasUnsavedChanges = useMemo(
    () => !areAnnualFiltersEqual(draft, currentFilters ?? EMPTY_FILTERS),
    [draft, currentFilters]
  );

  const requestClose = () => {
    if (hasUnsavedChanges) {
      setDiscardConfirmOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false);
    setDraft({ ...EMPTY_FILTERS, ...(currentFilters ?? {}) });
    onOpenChange(false);
  };

  const handleDialogOpenChange = (nextOpen) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    requestClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className={dialogContentClass} {...dialogPortalOutsideProps}>
        <DialogHeader className={dialogHeaderClass}>
          <DialogTitle className={dialogTitleClass}>Filters</DialogTitle>
        </DialogHeader>

        <div className={formGridClass}>
          <div className={`${fieldGroupClass} md:col-span-2`}>
            <Label className={fieldLabelClass}>Declaration Name</Label>
            <select
              value={draft.declarationName}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, declarationName: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">Select</option>
              {declarationNameOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass}>Financial Year</Label>
            <select
              value={draft.financialYear}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, financialYear: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">Select Financial Year</option>
              {financialYearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass}>Assigned Date</Label>
            <DateRangePicker
              value={draft.assignedDate}
              onChange={(value) => updateDateRangeField("assignedDate", value)}
              showIcon
              emitPartialSelection
              placeholder="Start & End Dates"
              inputClassName={cn(
                calendarInputClass,
                dateRangeErrors.assignedDate && "border-red-500",
              )}
            />
            {dateRangeErrors.assignedDate ? (
              <small className="text-red-500">{dateRangeErrors.assignedDate}</small>
            ) : null}
          </div>

          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass}>Due Date</Label>
            <DateRangePicker
              value={draft.dueDate}
              onChange={(value) => updateDateRangeField("dueDate", value)}
              showIcon
              emitPartialSelection
              placeholder="Start & End Dates"
              inputClassName={cn(
                calendarInputClass,
                dateRangeErrors.dueDate && "border-red-500",
              )}
            />
            {dateRangeErrors.dueDate ? (
              <small className="text-red-500">{dateRangeErrors.dueDate}</small>
            ) : null}
          </div>

          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass}>Activity Closure Date</Label>
            <DateRangePicker
              value={draft.closureDate}
              onChange={(value) => updateDateRangeField("closureDate", value)}
              showIcon
              placement="top"
              emitPartialSelection
              placeholder="Start & End Dates"
              inputClassName={cn(
                calendarInputClass,
                dateRangeErrors.closureDate && "border-red-500",
              )}
            />
            {dateRangeErrors.closureDate ? (
              <small className="text-red-500">{dateRangeErrors.closureDate}</small>
            ) : null}
          </div>
        </div>

        <div className={footerClass}>
          <button
            type="button"
            className={filterResetButtonClass}
            disabled={isLoading}
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              setDateRangeErrors({});
              onApply?.(EMPTY_FILTERS);
              onOpenChange(false);
            }}
          >
            Reset Filters
          </button>

          <button
            type="button"
            className={filterApplyButtonClass}
            disabled={isLoading}
            onClick={() => {
              const nextDateRangeErrors = validateAnnualDateRanges(draft);
              if (Object.keys(nextDateRangeErrors).length > 0) {
                setDateRangeErrors(nextDateRangeErrors);
                return;
              }
              setDateRangeErrors({});
              onApply?.(draft);
              onOpenChange(false);
            }}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader />
                Loading...
              </span>
            ) : (
              "Apply Filters"
            )}
          </button>
        </div>

        {discardConfirmOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <h3 className="text-[18px] font-semibold text-gray-900">Discard filter changes?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Your unsaved filter selections will be lost if you close this modal.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDiscardConfirmOpen(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
