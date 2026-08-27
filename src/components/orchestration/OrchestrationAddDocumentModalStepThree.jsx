import { useEffect } from "react";
import { Info, Save } from "lucide-react";
import MultiSelectWithBottomChecks from "../shared/MultiSelectWithBottomChecks";
import { useFormik } from "formik";
import * as Yup from "yup";
import EmailMultiInput from "../../atoms/email-multi-input";

const fieldLabelClass =
  "block text-lg font-medium leading-[1.4] text-[#1e1e1e]";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600 disabled:opacity-25 disabled:cursor-not-allowed";
const secondaryOutlineButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9d9d9] px-6 py-3 text-lg font-semibold leading-[1.4] text-[#1e1e1e] transition-colors hover:bg-gray-50 disabled:opacity-25 disabled:cursor-not-allowed";
const radioLabelClass =
  "inline-flex items-center gap-2 text-lg leading-[1.4] text-[#1e1e1e] cursor-pointer";
const noteBoxClass =
  "rounded-lg bg-[#fff1c2] px-5 pt-4 pb-5";

const applicability_type = ["ALL", "DIVISION", "EMPLOYEE"];

const initialValues = {
  applicability_type: "ALL",
  applicability_refs: null,
};

const validationSchema = Yup.object({
  applicability_type: Yup.string()
    .oneOf(applicability_type)
    .required("Applicability type is required"),

  applicability_refs: Yup.object().when(
    "applicability_type",
    (type, schema) => {
      switch (type?.[0]) {
        case "DIVISION":
          return schema.shape({
            divisions: Yup.array().min(
              1,
              "At least one division is required",
            ),
            designations: Yup.array().min(
              1,
              "At least one designation is required",
            ),
          });

        case "EMPLOYEE":
          return schema.shape({
            emails: Yup.array()
              .min(1, "At least one email is required")
              .test(
                "all-emails-valid",
                "Remove invalid email addresses",
                (arr) =>
                  Array.isArray(arr) &&
                  arr.every((email) => email?.valid !== false),
              ),
          });

        case "ALL":
          return schema.nullable();

        default:
          return schema.nullable();
      }
    },
  ),
});

export default function OrchestrationModalStepThree({
  orchestrationConfig,
  onNextClickHandler,
  onBackClick,
  isLoading: load,
  initialValues: initialFormValues,
  onValuesChange,
}) {
  const { values, errors, touched, setFieldValue, submitForm } = useFormik({
    initialValues: initialFormValues || initialValues,
    enableReinitialize: true,
    validationSchema,
    onSubmit: (values, buttonType) => {
      onNextClickHandler(values, 3);
    },
  });

  useEffect(() => {
    onValuesChange?.(values);
  }, [values]);

  const { designations, divisions } = orchestrationConfig || {};
  const { applicability_type: type } = values;

  const hasInvalidEmails =
    type === "EMPLOYEE" &&
    Array.isArray(values?.applicability_refs?.emails) &&
    values.applicability_refs.emails.some((email) => email?.valid === false);

  const actionsDisabled = !!load || hasInvalidEmails;

  const setType = (type) => {
    setFieldValue("applicability_type", type);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white font-sans">
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className={`${fieldLabelClass} mb-4`}>
          Allow Access To:
        </h2>

        <div className="mb-6 flex items-center gap-8">
          <label className={radioLabelClass}>
            <input
              type="radio"
              checked={type === "ALL"}
              onChange={() => {
                setType("ALL");
                setFieldValue("applicability_refs", null);
              }}
              className="h-5 w-5 accent-[#2563eb]"
            />
            All Employees
          </label>

          {/*
          <label className={radioLabelClass}>
            <input
              type="radio"
              checked={type === "DIVISION"}
              onChange={() => {
                setType("DIVISION");
                setFieldValue("applicability_refs", {
                  divisions: [],
                  designations: [],
                });
              }}
              className="h-5 w-5 accent-[#2563eb]"
            />
            By Division Cluster/s
          </label>
          */}

          <label className={radioLabelClass}>
            <input
              type="radio"
              checked={type === "EMPLOYEE"}
              onChange={() => {
                setType("EMPLOYEE");
                setFieldValue("applicability_refs", {
                  emails: [],
                });
              }}
              className="h-5 w-5 accent-[#2563eb]"
            />
            Selected Employee/s only
          </label>
        </div>

        {type === "ALL" && (
          <div className={noteBoxClass}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Info className="h-6 w-6 shrink-0 text-[#bf6a02]" strokeWidth={2} />
                <p className="text-lg font-medium leading-[1.4] text-[#bf6a02]">
                  Please Note
                </p>
              </div>

              <ol className="list-decimal space-y-2 pl-8 text-lg font-medium leading-[1.4]">
                <li className="text-[#bf6a02]">
                  Access will be given to all employees
                </li>
                <li className="text-[#bf6a02]">
                  Define Work Area filter via Visibility Filter (Bulk update)
                </li>
              </ol>
            </div>
          </div>
        )}

        {type === "DIVISION" && (
          <div className="grid grid-cols-2 gap-8">
            <div>
              <MultiSelectWithBottomChecks
                label="Division Cluster"
                options={
                  Array.isArray(divisions)
                    ? divisions.map((d) =>
                        typeof d === "object" ? d.name : d,
                      )
                    : []
                }
                value={
                  values?.applicability_refs?.divisions || []
                }
                onChange={(selected) =>
                  setFieldValue(
                    "applicability_refs.divisions",
                    selected,
                  )
                }
              />

              <small className="text-red-500">
                {touched?.applicability_refs?.divisions && errors?.applicability_refs?.divisions}
              </small>
            </div>

            <div>
              <MultiSelectWithBottomChecks
                label="Designation"
                options={
                  Array.isArray(designations)
                    ? designations.map((d) =>
                        typeof d === "object" ? d.name : d,
                      )
                    : []
                }
                value={
                  values?.applicability_refs?.designations ||
                  []
                }
                onChange={(selected) =>
                  setFieldValue(
                    "applicability_refs.designations",
                    selected,
                  )
                }
              />

              <small className="text-red-500">
                {touched?.applicability_refs?.designations && errors?.applicability_refs?.designations}
              </small>
            </div>
          </div>
        )}

        {type === "EMPLOYEE" && (
          <div className="w-full space-y-4">
            <label className={fieldLabelClass}>
              Employee Email ID
            </label>

            <EmailMultiInput
              value={values?.applicability_refs?.emails || []}
              onChange={(selected) => {
                setFieldValue(
                  "applicability_refs.emails",
                  selected,
                );
              }}
            />

            <small className="text-red-500">
              {hasInvalidEmails
                ? "Remove invalid email addresses"
                : touched?.applicability_refs?.emails &&
                  errors?.applicability_refs?.emails}
            </small>

            <div className={noteBoxClass}>
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-6 w-6 shrink-0 text-[#bf6a02]" strokeWidth={2} />
                <p className="text-lg font-medium leading-[1.4] text-[#bf6a02]">
                  Access will be given to only these
                  employees, no other employees can access
                  this item.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-4 bg-white px-6 py-4">
        {/* Note */}
        {/* <motion.div className="max-w-[60%] text-lg leading-[1.4] text-[#1e1e1e]">
          <span className="font-semibold">Note:</span>{" "}
          Applicability defines display of published content under
          ‘My Work Area’ and ‘My Vertical’ for ease of viewing and
          understanding
        </motion.div> */}

        <div className="flex shrink-0 justify-end gap-3">
          {onBackClick && (
            <button
              type="button"
              disabled={load}
              onClick={onBackClick}
              className={secondaryOutlineButtonClass}
            >
              Back
            </button>
          )}
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={async () => {
              await setFieldValue(
                "status",
                "DRAFT",
                true,
              );
              submitForm();
            }}
            className={primaryButtonClass}
          >
            <Save size={20} />
            Save as Draft
          </button>

          <button
            type="button"
            disabled={actionsDisabled}
            onClick={async () => {
              await setFieldValue("status", "ACTIVE");
              submitForm();
            }}
            className={primaryButtonClass}
          >
            Publish Now
          </button>
        </div>
      </div>
    </div>
  );
}
