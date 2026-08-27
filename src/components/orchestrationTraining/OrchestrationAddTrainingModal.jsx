import { ChevronDown, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import moment from "moment";
import Calendar from "../../atoms/calendar";
import { createTraining, updateTraining } from "../../api/trainingApi";
import { DATE_FORMAT_MOMENT } from "../../config";

const parseDMY = (dateStr) => {
  if (!dateStr) return null;
  const parsed = moment(dateStr, DATE_FORMAT_MOMENT, true);
  return parsed.isValid() ? parsed.toDate() : null;
};

// Convert API / ISO dates → config display format for Calendar
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

// Map a training row (API response) to form field values
export const rowToTrainingFormValues = (row) => ({
  training_name: row.training_name || "",
  financial_year: row.financial_year || "",
  assigned_date: apiDateToDisplay(row.training_assigned_date),
  due_date: apiDateToDisplay(row.training_due_date),
  closure_date: apiDateToDisplay(row.activity_closure_date),
  link: row.training_link || "",
  change_remarks: "",
});

const createValidationSchema = (isEdit) =>
  yup.object({
    training_name: yup.string().trim().required("Training Name is required"),
    financial_year: yup.string().required("Financial Year is required"),
    assigned_date: yup.string().required("Training Assigned Date is required"),
    due_date: yup
      .string()
      .required("Training Due Date is required")
      .test(
        "due-after-assigned",
        "Training Due Date must be after Training Assigned Date",
        function (value) {
          const assigned = parseDMY(this.parent.assigned_date);
          const due = parseDMY(value);
          if (!assigned || !due) return true;
          return due > assigned;
        }
      ),
    closure_date: yup
      .string()
      .required("Activity Closure Date is required")
      .test(
        "closure-after-due",
        "Activity Closure Date must be after Training Due Date",
        function (value) {
          const due = parseDMY(this.parent.due_date);
          const closure = parseDMY(value);
          if (!due || !closure) return true;
          return closure > due;
        }
      ),
    link: yup
      .string()
      .trim()
      .required("Training Link is required")
      .max(200, "Training Link must be 200 characters or fewer"),
    ...(isEdit && {
      change_remarks: yup
        .string()
        .trim()
        .required("Change Remarks is required")
        .max(500, "Change Remarks must be 500 characters or fewer"),
    }),
  });

const todayDate = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

const formatDateDisplay = (date) => {
  if (!date || isNaN(date.getTime())) return "";
  return moment(date).format(DATE_FORMAT_MOMENT).toUpperCase();
};

const todayDisplay = formatDateDisplay(todayDate);

export const initialTrainingFormValues = {
  training_name: "",
  financial_year: "",
  assigned_date: todayDisplay,
  due_date: "",
  closure_date: "",
  link: "",
  change_remarks: "",
};

function RequiredLabel({ children, className = "" }) {
  return (
    <label className={`text-sm font-semibold text-gray-800 ${className}`}>
      {children} <span className="text-red-500">*</span>
    </label>
  );
}

function AddTrainingForm({
  setIsOpen,
  formValues,
  setFormValues,
  onSuccess,
  onError,
  trainingId,
}) {
  const isEdit = Boolean(trainingId);
  const [confirmStep, setConfirmStep] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const financialYearOptions = useMemo(() => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-indexed
    const year = today.getFullYear();
    const currentFYStart = month >= 4 ? year : year - 1;
    const toFYLabel = (start) => `${start}-${String(start + 1).slice(-2)}`;
    return [toFYLabel(currentFYStart), toFYLabel(currentFYStart + 1)];
  }, []);

  const {
    values,
    errors,
    touched,
    handleSubmit,
    setFieldValue,
    validateField,
    isSubmitting,
  } = useFormik({
    initialValues: formValues,
    enableReinitialize: true,
    validationSchema: createValidationSchema(isEdit),
    onSubmit: (submittedValues, { setSubmitting }) => {
      setPendingValues(submittedValues);
      setConfirmStep(true);
      setSubmitting(false);
    },
  });

  // Derive the allowed date range from the selected financial year (Apr 1 → Mar 31)
  const fyBounds = useMemo(() => {
    const fy = values.financial_year; // e.g. "2026-27"
    if (!fy) return { min: null, max: null };
    const startYear = parseInt(fy.split("-")[0], 10);
    if (isNaN(startYear)) return { min: null, max: null };
    return {
      min: new Date(startYear, 3, 1),        // Apr 1 of start year
      max: new Date(startYear + 1, 2, 31),   // Mar 31 of end year
    };
  }, [values.financial_year]);

  // Training Assigned Date min: today, or fyBounds.min if that falls later (future FY)
  const assignedDateMin = useMemo(() => {
    if (fyBounds.min && fyBounds.min > todayDate) return fyBounds.min;
    return todayDate;
  }, [fyBounds.min]);

  // Due/closure must be strictly after the previous date (matches yup schema)
  const dueDateMin = useMemo(() => {
    const assigned = parseDMY(values.assigned_date);
    if (!assigned) return fyBounds.min ?? undefined;
    const nextDay = new Date(assigned);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay;
  }, [values.assigned_date, fyBounds.min]);

  const closureDateMin = useMemo(() => {
    const due = parseDMY(values.due_date);
    if (!due) return dueDateMin ?? fyBounds.min ?? undefined;
    const nextDay = new Date(due);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay;
  }, [values.due_date, dueDateMin, fyBounds.min]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const response = isEdit
        ? await updateTraining(trainingId, pendingValues)
        : await createTraining(pendingValues);
      setFormValues(initialTrainingFormValues);
      onSuccess?.(response);
      setIsOpen(false);
    } catch (error) {
      onError?.(error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmStep(false);
    setPendingValues(null);
  };

  const handleFieldChange = (name, value) => {
    setFieldValue(name, value);
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
    // When financial year changes, reset dates that fall outside the new FY bounds.
    // For a future FY, default Training Assigned Date to Apr 1 of that FY.
    if (name === "financial_year") {
      const startYear = parseInt(String(value).split("-")[0], 10);
      if (!isNaN(startYear)) {
        const newMin = new Date(startYear, 3, 1); // Apr 1 of start year
        newMin.setHours(0, 0, 0, 0);
        const newMax = new Date(startYear + 1, 2, 31); // Mar 31 of end year
        newMax.setHours(0, 0, 0, 0);

        const isOutsideFy = (date) => !date || date < newMin || date > newMax;

        const existingAssigned = parseDMY(values.assigned_date);
        if (isOutsideFy(existingAssigned)) {
          // Future FY → Apr 1; current FY → today (if still in range)
          const defaultAssigned =
            newMin > todayDate
              ? formatDateDisplay(newMin)
              : todayDisplay;
          setFieldValue("assigned_date", defaultAssigned);
          setFormValues((prev) => ({ ...prev, assigned_date: defaultAssigned }));
        }

        ["due_date", "closure_date"].forEach((f) => {
          const existing = parseDMY(values[f]);
          if (isOutsideFy(existing)) {
            setFieldValue(f, "");
            setFormValues((prev) => ({ ...prev, [f]: "" }));
          }
        });
      } else {
        ["assigned_date", "due_date", "closure_date"].forEach((f) => {
          setFieldValue(f, "");
          setFormValues((prev) => ({ ...prev, [f]: "" }));
        });
      }
    }
    // When assigned moves later, clear due/closure that are no longer after it
    if (name === "assigned_date") {
      const assigned = parseDMY(value);
      if (assigned) {
        const minDue = new Date(assigned);
        minDue.setDate(minDue.getDate() + 1);
        minDue.setHours(0, 0, 0, 0);
        ["due_date", "closure_date"].forEach((f) => {
          const existing = parseDMY(values[f]);
          if (existing && existing < minDue) {
            setFieldValue(f, "");
            setFormValues((prev) => ({ ...prev, [f]: "" }));
          }
        });
      }
      validateField("due_date");
    }
    if (name === "due_date") {
      const due = parseDMY(value);
      if (due) {
        const minClosure = new Date(due);
        minClosure.setDate(minClosure.getDate() + 1);
        minClosure.setHours(0, 0, 0, 0);
        const existingClosure = parseDMY(values.closure_date);
        if (existingClosure && existingClosure < minClosure) {
          setFieldValue("closure_date", "");
          setFormValues((prev) => ({ ...prev, closure_date: "" }));
        }
      }
      validateField("closure_date");
    }
  };

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    handleFieldChange(name, value);
  };

  return (
    <div className="relative">
      <form className="mt-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <RequiredLabel>Training Name</RequiredLabel>
          <input
            name="training_name"
            value={values.training_name}
            onChange={handleTextChange}
            placeholder=""
            className={`mt-2 w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.training_name && touched.training_name ? "border-red-500" : ""
            }`}
          />
          <small className="text-red-500">{touched.training_name && errors.training_name}</small>
        </div>

        <div className="relative">
          <RequiredLabel>Financial Year</RequiredLabel>
          <select
            name="financial_year"
            value={values.financial_year}
            onChange={handleTextChange}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
              backgroundImage: "none",
            }}
            className={`mt-2 w-full appearance-none rounded-lg border bg-white p-3 pr-10 ${
              errors.financial_year && touched.financial_year ? "border-red-500" : ""
            }`}
          >
            <option value="">Select</option>
            {financialYearOptions.map((fy) => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-3 top-[42px] text-purple-500"
          />
          <small className="text-red-500">{touched.financial_year && errors.financial_year}</small>
        </div>

        <div>
          <RequiredLabel className="mb-2 block">Training Assigned Date</RequiredLabel>
          <Calendar
            value={values.assigned_date}
            onChange={(value) => handleFieldChange("assigned_date", value)}
            width="100%"
            showIcon
            minDate={assignedDateMin}
            maxDate={fyBounds.max ?? undefined}
          />
          <small className="text-red-500">{touched.assigned_date && errors.assigned_date}</small>
        </div>

        <div>
          <RequiredLabel className="mb-2 block">Training Due Date</RequiredLabel>
          <Calendar
            value={values.due_date}
            onChange={(value) => handleFieldChange("due_date", value)}
            width="100%"
            showIcon
            minDate={dueDateMin}
            maxDate={fyBounds.max ?? undefined}
          />
          <small className="text-red-500">{touched.due_date && errors.due_date}</small>
        </div>

        <div>
          <RequiredLabel className="mb-2 block">Activity Closure Date</RequiredLabel>
          <Calendar
            value={values.closure_date}
            onChange={(value) => handleFieldChange("closure_date", value)}
            width="100%"
            showIcon
            minDate={closureDateMin}
            maxDate={fyBounds.max ?? undefined}
            openFrom="top"
          />
          <small className="text-red-500">{touched.closure_date && errors.closure_date}</small>
        </div>

        <div>
          <RequiredLabel>Training Link</RequiredLabel>
          <div title={values.link.length > 50 ? values.link : ""}>
            <input
              name="link"
              value={values.link}
              onChange={handleTextChange}
              placeholder="https://example.com/training"
              maxLength={200}
              className={`mt-2 w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500 truncate ${
                errors.link && touched.link ? "border-red-500" : ""
              }`}
            />
          </div>
          <div className="flex items-start justify-between">
              <small className="text-red-500">{touched.link && errors.link}</small>
            <small className={`ml-auto text-xs ${values.link.length > 200 ? "text-red-500" : "text-gray-400"}`}>
              {values.link.length}/200
            </small>
          </div>
        </div>

        {isEdit && (
          <div className="col-span-2">
            <RequiredLabel>Change Remarks</RequiredLabel>
            <div title={values.change_remarks.length > 100 ? values.change_remarks : ""}>
              <textarea
                name="change_remarks"
                value={values.change_remarks}
                onChange={handleTextChange}
                placeholder="Describe what was changed and why…"
                maxLength={500}
                rows={3}
                className={`mt-2 w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.change_remarks && touched.change_remarks ? "border-red-500" : ""
                }`}
              />
            </div>
            <div className="flex items-start justify-between">
              <small className="text-red-500">{touched.change_remarks && errors.change_remarks}</small>
              <small className={`ml-auto text-xs ${values.change_remarks.length > 500 ? "text-red-500" : "text-gray-400"}`}>
                {values.change_remarks.length}/500
              </small>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            {isSubmitting ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "Save Changes" : "Add Training")}
          </button>
        </div>
      </form>

      {/* Confirmation overlay */}
      {confirmStep && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
          <p className="px-8 text-center text-base font-medium text-gray-800">
            {isEdit ? "Proceed with editing of" : "Proceed with adding of"}{" "}
            {/* <span className="font-semibold">"{pendingValues?.training_name}"</span>? */}
          </p>
          {pendingValues?.training_name?.length > 20 ? (
            <span
              className="inline-block max-w-[20rem] overflow-hidden truncate"
              title={pendingValues.training_name}
            >
              {pendingValues.training_name.split(" ").slice(0, 6).join(" ")}...
            </span>
          ) : `"${pendingValues?.training_name}"`}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleCancelConfirm}
              disabled={isConfirming}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isConfirming ? (isEdit ? "Saving..." : "Adding...") : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrchestrationAddTrainingModal({
  isOpen,
  setIsOpen,
  formValues,
  setFormValues,
  onSuccess,
  onError,
  trainingId,
}) {
  const isEdit = Boolean(trainingId);

  const handleClose = () => {
    setFormValues(initialTrainingFormValues);
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          ></div>

          <div className="relative mx-4 w-[700px] rounded-2xl bg-white p-6 shadow-xl animate-[fadeIn_.2s_ease-out]">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-lg font-semibold">
                {isEdit ? "Edit Training" : "Add Training"}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md p-1 hover:border hover:border-gray-400 text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <AddTrainingForm
              setIsOpen={setIsOpen}
              formValues={formValues}
              setFormValues={setFormValues}
              onSuccess={onSuccess}
              onError={onError}
              trainingId={trainingId}
            />
          </div>
        </div>
      )}
    </>
  );
}
