import React, { useEffect, useMemo } from "react";
import { Trash2, Save } from "lucide-react";
import LinkedItemPicker from "../../atoms/linked-item-picker";
import * as Yup from "yup";
import { useFormik } from "formik";
import { normaliseDocTypeLabel } from "../../lib/utils";

const MAX_LINKED_ITEMS = 6;

const fieldLabelClass =
  "block text-lg font-medium leading-[1.4] text-[#1e1e1e]";
const fieldGroupClass = "flex flex-col gap-2";
const fieldInputBaseClass =
  "w-full border border-[#d9d9d9] rounded-lg px-4 py-2 text-lg leading-[1.4] text-[#1e1e1e] bg-white placeholder:text-[#b3b3b3]";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600 disabled:opacity-25 disabled:cursor-not-allowed";
const secondaryOutlineButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9d9d9] px-6 py-3 text-lg font-semibold leading-[1.4] text-[#1e1e1e] transition-colors hover:bg-gray-50 disabled:opacity-25 disabled:cursor-not-allowed";
const addLinkedItemButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/15 px-6 py-3 text-lg font-semibold leading-[1.4] text-[#2563eb] transition-colors hover:bg-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed";
const linkedItemInputClass =
  "border-[#d9d9d9] px-4 py-2 pr-16 text-lg leading-[1.4] text-[#1e1e1e] placeholder:text-[#b3b3b3] focus:ring-blue-500";

const fieldInputClass = (hasError) =>
  `${fieldInputBaseClass}${hasError ? " border-red-500" : ""}`;

const getDocumentTypeDisplayLabel = (label) =>
  normaliseDocTypeLabel(label) ||
  (label === "Training Material" ? "Training Resource" : label);

const validationSchema = Yup.object({
  rows: Yup.array()
    .max(MAX_LINKED_ITEMS, `You can add up to ${MAX_LINKED_ITEMS} linked items only.`)
    .of(
      Yup.object().shape({
        documentType: Yup.string().when("linkedItem", {
          is: (linkedItem) => linkedItem,
          then: (schema) => schema.required("Document type is required"),
          otherwise: (schema) => schema.notRequired(),
        }),
        linkedItem: Yup.object().notRequired(),
      }),
    ),
});

const initialValues = {
  rows: [
    {
      documentType: "",
      linkedItem: "",
    },
  ]
};

export default function OrchestrationAddEventModalStepTwo({
  onNextClickHandler,
  onBackClick,
  initialValues: stepTwoInitialValues,
  orchestrationConfig,
  isLoading: load,
  onValuesChange,
}) {
  const { documentTypes } = orchestrationConfig || {};
  const sortedDocumentTypes = useMemo(() => {
    if (!Array.isArray(documentTypes)) return [];
    return [...documentTypes]
      .map((type) => {
        if (typeof type === "string") {
          return {
            value: type,
            label: type,
            displayLabel: getDocumentTypeDisplayLabel(type),
          };
        }
        const label = type?.label ?? type?.value ?? "";
        return {
          ...type,
          displayLabel: getDocumentTypeDisplayLabel(label),
        };
      })
      .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
  }, [documentTypes]);

  const {
    submitForm,
    setValues,
    errors,
    touched,
    setFieldValue,
    values,
  } = useFormik({
    initialValues: stepTwoInitialValues || initialValues,
    enableReinitialize: true,
    validationSchema,
    onSubmit: (values) => {
      onNextClickHandler({
        rows: values.rows,
        linked_document_ids: values.rows.map(({ linkedItem }) => linkedItem?.id).filter(Boolean),
        status: values.status === "DRAFT" ? "DRAFT" : "",
      });
    },
  });

  useEffect(() => {
    onValuesChange?.({
      rows: values.rows,
      linked_document_ids: values.rows?.map(({ linkedItem }) => linkedItem?.id).filter(Boolean) ?? [],
      status: values.status,
    });
  }, [values]);

  const { rows } = values;

  const setRows = (updatedRows) => {
    setValues({ ...values, rows: updatedRows });
  };

  const handleDocumentTypeChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    updatedRows[index]["linkedItem"] = null;
    setRows(updatedRows);
  };

  const handleLinkedItemChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  };

  const addRow = () => {
    if ((rows?.length || 0) >= MAX_LINKED_ITEMS) return;
    const lastRow = rows[rows.length - 1];
    if (lastRow && (!lastRow.documentType || !lastRow.linkedItem)) return;
    setRows([...(Array.isArray(rows) ? rows : []), { documentType: "", linkedItem: "" }]);
  };

  const selectedIds = rows.map((r) => r.linkedItem?.id).filter(Boolean);
  const canAddLinkedItem =
    (rows?.length || 0) < MAX_LINKED_ITEMS &&
    Boolean(rows[rows.length - 1]?.documentType && rows[rows.length - 1]?.linkedItem);

  const removeRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white font-sans">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {Array.isArray(rows) && rows.map((row, index) => (
            <div key={index} className="flex gap-6">
              <div className={`${fieldGroupClass} w-[352px] shrink-0`}>
                <label className={fieldLabelClass}>
                  Document Type
                </label>
                <select
                  value={row.documentType}
                  onChange={(e) =>
                    handleDocumentTypeChange(
                      index,
                      "documentType",
                      e.target.value,
                    )
                  }
                  className={fieldInputClass(
                    errors.rows?.[index]?.documentType && touched.rows?.[index]?.documentType
                  )}
                >
                  <option value="">Select</option>
                  {sortedDocumentTypes.map(({ value, label, displayLabel }) => (
                      <option key={value} value={value}>
                        {displayLabel || label}
                      </option>
                    ))}
                </select>
                <small className="block min-h-4 text-red-500">
                  {touched.rows?.[index]?.documentType && errors.rows?.[index]?.documentType}
                </small>
              </div>

              <div className={`${fieldGroupClass} min-w-0 flex-1`}>
                <label className={fieldLabelClass}>
                  Linked Item {index + 1}
                </label>

                <LinkedItemPicker
                  documentType={row.documentType}
                  value={row.linkedItem}
                  onSelect={(option) =>
                    handleLinkedItemChange(index, "linkedItem", option)
                  }
                  disabled={!row.documentType || !!load}
                  paginated={false}
                  placeholder="Select"
                  excludeIds={selectedIds.filter((id) => id !== row.linkedItem?.id)}
                  inputClassName={`${linkedItemInputClass} ${
                    errors.rows?.[index]?.linkedItem && touched.rows?.[index]?.linkedItem
                      ? "border-red-500"
                      : ""
                  }`}
                />
                <small className="block min-h-4 text-red-500">
                  {touched.rows?.[index]?.linkedItem && errors.rows?.[index]?.linkedItem}
                </small>
              </div>

              {rows.length > 1 && (
                <div className="flex shrink-0 flex-col gap-2">
                  <span
                    className={`${fieldLabelClass} invisible select-none`}
                    aria-hidden
                  >
                    &nbsp;
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#c00f0c] text-[#c00f0c] transition-colors hover:bg-red-50"
                    aria-label={`Remove linked item ${index + 1}`}
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={addRow}
              disabled={!canAddLinkedItem}
              className={addLinkedItemButtonClass}
            >
              <img
                src="/assets/icons/orch/plussquare.svg"
                alt=""
                className="h-6 w-6 shrink-0"
              />
              Add New Linked Item
            </button>
            {(rows?.length || 0) >= MAX_LINKED_ITEMS ? (
              <p className="text-sm text-[#757575]">
                You can add up to {MAX_LINKED_ITEMS} linked items only.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex justify-end gap-3 bg-white px-6 py-4">
        {onBackClick && (
          <button
            type="button"
            disabled={!!load}
            onClick={onBackClick}
            className={secondaryOutlineButtonClass}
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            await setFieldValue("status", "DRAFT");
            submitForm();
          }}
          disabled={!!load}
          className={primaryButtonClass}
        >
          <Save size={20} />
          Save as Draft
        </button>

        <button
          type="button"
          disabled={!!load}
          onClick={async () => {
            await setFieldValue("status", "");
            submitForm();
          }}
          className={primaryButtonClass}
        >
          Next
        </button>
      </div>
    </div>
  );
}
