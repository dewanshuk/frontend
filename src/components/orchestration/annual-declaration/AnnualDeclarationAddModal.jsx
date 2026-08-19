import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import moment from "moment";

import Calendar from "@/atoms/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DATE_FORMAT_MOMENT } from "@/config";
import { createAnnualDeclaration, updateAnnualDeclaration } from "@/api/annualDeclarationApi";
import { getCurrentFinancialYearLabel, stripR5_18 } from "./annualDeclarationUtils";
import {
  calendarIconClass,
  calendarInputClass,
  dialogContentClass,
  dialogHeaderClass,
  dialogNoOutsideCloseProps,
  dialogTitleClass,
  fieldGroupClass,
  fieldLabelClass,
  formGridClass,
  primaryButtonClass,
  selectClass,
} from "./annualDeclarationModalStyles";

const parseDMY = (dateStr) => {
  if (!dateStr) return null;
  const parsed = moment(dateStr, DATE_FORMAT_MOMENT, true);
  return parsed.isValid() ? parsed.toDate() : null;
};

const apiDateToDisplay = (dateStr) => {
  if (!dateStr) return "";
  const parsed = moment(
    dateStr,
    [moment.ISO_8601, "YYYY-MM-DD", DATE_FORMAT_MOMENT],
    true,
  );
  const fallback = parsed.isValid() ? parsed : moment(dateStr);
  return fallback.isValid()
    ? fallback.format(DATE_FORMAT_MOMENT).toUpperCase()
    : dateStr;
};

export const rowToAnnualDeclarationFormValues = (row = {}) => ({
  declarationName: stripR5_18(row.declarationName || row.declaration_name || ""),
  financialYear: row.financialYear || row.financial_year || "",
  assignedDate: apiDateToDisplay(row.assignedDate || row.assigned_date),
  dueDate: apiDateToDisplay(row.dueDate || row.due_date),
  closureDate: apiDateToDisplay(
    row.activityClosureDate || row.activity_closure_date || row.closureDate,
  ),
});

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date, days) => {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Financial years run 1 Apr → 31 Mar, so "2026-27" spans Apr 2026 – Mar 2027. */
const getFinancialYearBounds = (financialYear) => {
  const startYear = parseInt(String(financialYear ?? "").split("-")[0], 10);
  if (Number.isNaN(startYear)) return { min: null, max: null };
  return {
    min: startOfDay(new Date(startYear, 3, 1)),
    max: startOfDay(new Date(startYear + 1, 2, 31)),
  };
};

const clampToRange = (date, min, max) => {
  if (!date) return date;
  if (max && date > max) return max;
  if (min && date < min) return min;
  return date;
};

const todayDate = startOfDay(new Date());

const formatDateDisplay = (date) => {
  if (!date || isNaN(date.getTime())) return "";
  return moment(date).format(DATE_FORMAT_MOMENT).toUpperCase();
};

const todayDisplay = formatDateDisplay(todayDate);

const validationSchema = yup.object({
  declarationName: yup.string().trim().required("Annual Declaration Name is required"),
  financialYear: yup.string().required("Financial Year is required"),
  assignedDate: yup.string().required("Assigned Date is required"),
  dueDate: yup
    .string()
    .required("Due Date is required")
    .test(
      "due-after-assigned",
      "Due Date must be after Assigned Date",
      function (value) {
        const assigned = parseDMY(this.parent.assignedDate);
        const due = parseDMY(value);
        if (!assigned || !due) return true;
        return due > assigned;
      }
    ),
  closureDate: yup
    .string()
    .required("Activity Closure Date is required")
    .test(
      "closure-after-due",
      "Activity Closure Date must be after Due Date",
      function (value) {
        const due = parseDMY(this.parent.dueDate);
        const closure = parseDMY(value);
        if (!due || !closure) return true;
        return closure > due;
      }
    ),
});

function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

const getInitialValues = (defaultFinancialYear) => ({
  declarationName: "",
  financialYear: defaultFinancialYear || "",
  assignedDate: todayDisplay,
  dueDate: "",
  closureDate: "",
});

export default function AnnualDeclarationAddModal({
  open,
  onOpenChange,
  onSubmit,
  onError,
  financialYearOptions,
  declarationNameOptions = [],
  declarationId = null,
  initialValues = null,
}) {
  const isEdit = Boolean(declarationId);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [pendingSubmittedValues, setPendingSubmittedValues] = useState(null);
  const [isApiSubmitting, setIsApiSubmitting] = useState(false);
  const defaultFinancialYear = useMemo(() => getCurrentFinancialYearLabel(), []);

  const formInitialValues = useMemo(() => {
    if (isEdit && initialValues) {
      return {
        ...getInitialValues(defaultFinancialYear),
        ...initialValues,
      };
    }
    return getInitialValues(defaultFinancialYear);
  }, [isEdit, initialValues, defaultFinancialYear]);

  const nameOptions = useMemo(() => {
    const merged = [
      ...declarationNameOptions,
      formInitialValues.declarationName,
    ].filter(Boolean);
    return Array.from(new Set(merged));
  }, [declarationNameOptions, formInitialValues.declarationName]);

  const {
    values,
    errors,
    touched,
    handleSubmit,
    setFieldValue,
    resetForm,
    validateField,
    isSubmitting,
  } = useFormik({
    initialValues: formInitialValues,
    enableReinitialize: true,
    validationSchema,
    onSubmit: (submittedValues, { setSubmitting }) => {
      setPendingSubmittedValues(submittedValues);
      setConfirmSubmitOpen(true);
      setSubmitting(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    setConfirmSubmitOpen(false);
    setPendingSubmittedValues(null);
    setIsApiSubmitting(false);
    if (!isEdit) {
      resetForm({ values: getInitialValues(defaultFinancialYear) });
    }
  }, [open, defaultFinancialYear, resetForm, isEdit]);

  const fyBounds = useMemo(
    () => getFinancialYearBounds(values.financialYear),
    [values.financialYear],
  );

  // Closure must fall after Due, which must fall after Assigned, so each field
  // leaves the tail end of the financial year free for the ones that follow it.
  const closureDateMax = fyBounds.max ?? undefined;
  const dueDateMax = useMemo(
    () => (fyBounds.max ? addDays(fyBounds.max, -1) : undefined),
    [fyBounds.max],
  );
  const assignedDateMax = useMemo(
    () => (fyBounds.max ? addDays(fyBounds.max, -2) : undefined),
    [fyBounds.max],
  );

  const assignedDateMin = useMemo(() => {
    if (!fyBounds.min || !fyBounds.max) return todayDate;
    // A financial year that is already over has no upcoming days left, so open
    // its whole window instead of handing the picker a min past its max.
    if (todayDate < fyBounds.min || todayDate > fyBounds.max) return fyBounds.min;
    return clampToRange(todayDate, fyBounds.min, assignedDateMax);
  }, [fyBounds.min, fyBounds.max, assignedDateMax]);

  const dueDateMin = useMemo(() => {
    const assigned = parseDMY(values.assignedDate);
    const base = assigned ? addDays(assigned, 1) : assignedDateMin;
    return clampToRange(base, fyBounds.min, dueDateMax);
  }, [values.assignedDate, assignedDateMin, fyBounds.min, dueDateMax]);

  const closureDateMin = useMemo(() => {
    const due = parseDMY(values.dueDate);
    const base = due ? addDays(due, 1) : addDays(dueDateMin, 1);
    return clampToRange(base, fyBounds.min, closureDateMax);
  }, [values.dueDate, dueDateMin, fyBounds.min, closureDateMax]);

  const handleFieldChange = (name, value) => {
    setFieldValue(name, value);

    if (name === "financialYear") {
      const { min: fyStart, max: fyEnd } = getFinancialYearBounds(value);

      if (!fyStart) {
        ["assignedDate", "dueDate", "closureDate"].forEach((field) => {
          setFieldValue(field, "");
        });
        return;
      }

      const isOutsideFy = (date) => !date || date < fyStart || date > fyEnd;

      if (isOutsideFy(parseDMY(values.assignedDate))) {
        // Today is only a sensible default while it still falls in the year.
        const todayInFy = todayDate >= fyStart && todayDate <= fyEnd;
        setFieldValue(
          "assignedDate",
          todayInFy ? todayDisplay : formatDateDisplay(fyStart),
        );
      }

      ["dueDate", "closureDate"].forEach((field) => {
        if (isOutsideFy(parseDMY(values[field]))) {
          setFieldValue(field, "");
        }
      });
    }

    if (name === "assignedDate") {
      const assigned = parseDMY(value);
      if (assigned) {
        const minDue = new Date(assigned);
        minDue.setDate(minDue.getDate() + 1);
        minDue.setHours(0, 0, 0, 0);
        ["dueDate", "closureDate"].forEach((f) => {
          const existing = parseDMY(values[f]);
          if (existing && existing < minDue) {
            setFieldValue(f, "");
          }
        });
      }
      validateField("dueDate");
    }

    if (name === "dueDate") {
      const due = parseDMY(value);
      if (due) {
        const minClosure = new Date(due);
        minClosure.setDate(minClosure.getDate() + 1);
        minClosure.setHours(0, 0, 0, 0);
        const existingClosure = parseDMY(values.closureDate);
        if (existingClosure && existingClosure < minClosure) {
          setFieldValue("closureDate", "");
        }
      }
      validateField("closureDate");
    }
  };

  const handleConfirmSubmission = async () => {
    if (!pendingSubmittedValues) return;

    setIsApiSubmitting(true);
    setConfirmSubmitOpen(false);

    const payload = {
      declarationName: pendingSubmittedValues.declarationName.trim(),
      financialYear: pendingSubmittedValues.financialYear.trim(),
      assignedDate: pendingSubmittedValues.assignedDate,
      dueDate: pendingSubmittedValues.dueDate,
      closureDate: pendingSubmittedValues.closureDate,
    };

    try {
      const response = isEdit
        ? await updateAnnualDeclaration(declarationId, payload)
        : await createAnnualDeclaration(payload);

      onSubmit?.({
        ...payload,
        response,
        isEdit,
      });
    } catch (error) {
      onError?.(error);
    } finally {
      setIsApiSubmitting(false);
      setPendingSubmittedValues(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogContentClass} {...dialogNoOutsideCloseProps}>
        <DialogHeader className={dialogHeaderClass}>
          <DialogTitle className={dialogTitleClass}>
            {isEdit ? "Edit Annual Declaration" : "Add Annual Declaration"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className={formGridClass}>
            <div className={fieldGroupClass}>
              <Label className={fieldLabelClass}>
                Annual Declaration Name <RequiredMark />
              </Label>
              <select
                name="declarationName"
                value={values.declarationName}
                onChange={(e) => handleFieldChange("declarationName", e.target.value)}
                className={cn(
                  selectClass,
                  errors.declarationName && touched.declarationName && "border-red-500"
                )}
              >
                <option value="">Select</option>
                {nameOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <small className="text-xs text-red-500">
                {touched.declarationName && errors.declarationName}
              </small>
            </div>

            <div className={fieldGroupClass}>
              <Label className={fieldLabelClass}>
                Financial Year <RequiredMark />
              </Label>
              <select
                name="financialYear"
                value={values.financialYear}
                onChange={(e) => handleFieldChange("financialYear", e.target.value)}
                className={cn(
                  selectClass,
                  errors.financialYear && touched.financialYear && "border-red-500"
                )}
              >
                <option value="">Select</option>
                {financialYearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <small className="text-xs text-red-500">
                {touched.financialYear && errors.financialYear}
              </small>
            </div>

            <div className={fieldGroupClass}>
              <Label className={fieldLabelClass}>
                Assigned Date <RequiredMark />
              </Label>
              <Calendar
                value={values.assignedDate}
                onChange={(value) => handleFieldChange("assignedDate", value)}
                width="100%"
                showIcon
                iconClassName={calendarIconClass}
                inputClassName={calendarInputClass}
                openFrom="top"
                minDate={assignedDateMin}
                maxDate={assignedDateMax}
              />
              <small className="text-xs text-red-500">
                {touched.assignedDate && errors.assignedDate}
              </small>
            </div>

            <div className={fieldGroupClass}>
              <Label className={fieldLabelClass}>
                Due Date <RequiredMark />
              </Label>
              <Calendar
                value={values.dueDate}
                onChange={(value) => handleFieldChange("dueDate", value)}
                width="100%"
                showIcon
                iconClassName={calendarIconClass}
                inputClassName={calendarInputClass}
                openFrom="top"
                minDate={dueDateMin}
                maxDate={dueDateMax}
              />
              <small className="text-xs text-red-500">
                {touched.dueDate && errors.dueDate}
              </small>
            </div>

            <div className={fieldGroupClass}>
              <Label className={fieldLabelClass}>
                Activity Closure Date <RequiredMark />
              </Label>
              <Calendar
                value={values.closureDate}
                onChange={(value) => handleFieldChange("closureDate", value)}
                width="100%"
                showIcon
                iconClassName={calendarIconClass}
                inputClassName={calendarInputClass}
                minDate={closureDateMin}
                maxDate={closureDateMax}
                openFrom="top"
              />
              <small className="text-xs text-red-500">
                {touched.closureDate && errors.closureDate}
              </small>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || isApiSubmitting}
              className={primaryButtonClass}
            >
              {isSubmitting || isApiSubmitting
                ? isEdit
                  ? "Saving..."
                  : "Submitting..."
                : isEdit
                  ? "Save Changes"
                  : "Add Annual Declaration"}
            </button>
          </div>
        </form>

        {confirmSubmitOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <h3 className="text-[18px] font-semibold text-gray-900">Submission Confirmation</h3>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to {isEdit ? "save changes to" : "submit"} this annual
                declaration?
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmission}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  {isEdit ? "Save" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

      </DialogContent>
    </Dialog>
  );
}
