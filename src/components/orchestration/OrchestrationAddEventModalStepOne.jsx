import { useState, useMemo, useEffect, useRef } from "react";
import { X, Save } from "lucide-react";
import { useFormik } from "formik";
import * as yup from "yup";
import moment from "moment";
import DateRangePicker from "../../atoms/date-range-picker";
import { DATE_FORMAT_MOMENT } from "../../config";

const fieldLabelClass =
  "block text-lg font-medium leading-[1.4] text-[#1e1e1e]";
const fieldGroupClass = "flex min-w-0 flex-col gap-2";
const fieldInputBaseClass =
  "w-full border border-[#d9d9d9] rounded-lg px-4 py-2 text-lg leading-[1.4] text-[#1e1e1e] bg-white placeholder:text-[#b3b3b3]";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600 disabled:opacity-25 disabled:cursor-not-allowed";
const tagChipClass =
  "inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-3 py-1 text-base font-medium text-violet-600";
const MAX_TAG_ITEM_LENGTH = 20;

const fieldInputClass = (hasError) =>
  `${fieldInputBaseClass}${hasError ? " border-red-500" : ""}`;

const isCompleteEventDateRange = (value) => {
  if (value == null || String(value).trim() === "") return false;
  const parts = String(value)
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length >= 2;
};

/* ------------------ Validation ------------------ */
const validationSchema = yup.object().shape({
  eventName: yup.string().required("Event Name is required").max(255, "Name can't be greater than 255 characters"),
  subEventName: yup.string().notRequired().max(255, "Name can't be greater than 255 characters"),
  eventDate: yup
    .string()
    .required("Event Dates are required")
    .test(
      "complete-event-date-range",
      "Please select both start and end dates",
      (value) => isCompleteEventDateRange(value),
    ),
  description: yup.string().required("Description is required"),
  tags: yup
    .array()
    .of(
      yup
        .string()
        .trim()
        .max(MAX_TAG_ITEM_LENGTH, `Each tag can be up to ${MAX_TAG_ITEM_LENGTH} characters only.`),
    )
    .min(1, "At least one tag is required"),
});

const getTodayEventDateRange = () => {
  const today = moment().format(DATE_FORMAT_MOMENT).toUpperCase();
  return `${today} - ${today}`;
};

const hasEventDateValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(String(value || "").trim());
};

/* ------------------ Initial Values ------------------ */
const initialValues = {
  eventName: "",
  subEventName: "",
  eventDate: "",
  description: "",
  tags: [],
};

// Convert pasted HTML to markdown (bold/italic only), WAF-safe
function htmlToMarkdown(html) {
  // DOMParser strips Word's <style>, <meta>, XML comments automatically
  const doc = new DOMParser().parseFromString(html, "text/html");

  function nodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.nodeName.toLowerCase();
    if (tag === "style" || tag === "script" || tag === "head") return "";
    const inner = Array.from(node.childNodes).map(nodeToMarkdown).join("");
    if (tag === "strong" || tag === "b") { const t = inner.trim(); return t ? `**${t}**` : inner; }
    if (tag === "em" || tag === "i") { const t = inner.trim(); return t ? `_${t}_` : inner; }
    if (tag === "br") return "\n";
    if (tag === "p" || tag === "div") return inner + "\n";
    return inner;
  }

  return Array.from(doc.body.childNodes)
    .map(nodeToMarkdown)
    .join("")
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Convert markdown to display HTML — only bold/italic, everything else is escaped
function markdownToDisplayHtml(md) {
  if (!md) return "";

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Process inline markdown tokens recursively
  function processInline(text) {
    // Bold+italic: ***text*** or **_text_** or _**text**_
    // Handle bold first, then italic inside, or italic first then bold inside
    let result = "";
    let remaining = text;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/^(\*\*)([\/\s\S]*?)\*\*/);
      const italicMatch = remaining.match(/^_(([\s\S]*?))_/);
      const boldIdx = remaining.indexOf("**");
      const italicIdx = remaining.indexOf("_");

      const hasBold = boldIdx !== -1 && remaining.indexOf("**", boldIdx + 2) !== -1;
      const hasItalic = italicIdx !== -1 && remaining.indexOf("_", italicIdx + 1) !== -1;

      if (!hasBold && !hasItalic) {
        result += escapeHtml(remaining).replace(/\n/g, "<br/>");
        break;
      }

      const nextBold = hasBold ? boldIdx : Infinity;
      const nextItalic = hasItalic ? italicIdx : Infinity;

      if (nextBold <= nextItalic) {
        result += escapeHtml(remaining.slice(0, nextBold)).replace(/\n/g, "<br/>");
        remaining = remaining.slice(nextBold + 2);
        const closeIdx = remaining.indexOf("**");
        if (closeIdx === -1) { result += "**" + escapeHtml(remaining).replace(/\n/g, "<br/>"); break; }
        const inner = remaining.slice(0, closeIdx);
        result += `<strong>${processInline(inner)}</strong>`;
        remaining = remaining.slice(closeIdx + 2);
      } else {
        result += escapeHtml(remaining.slice(0, nextItalic)).replace(/\n/g, "<br/>");
        remaining = remaining.slice(nextItalic + 1);
        const closeIdx = remaining.indexOf("_");
        if (closeIdx === -1) { result += "_" + escapeHtml(remaining).replace(/\n/g, "<br/>"); break; }
        const inner = remaining.slice(0, closeIdx);
        result += `<em>${processInline(inner)}</em>`;
        remaining = remaining.slice(closeIdx + 1);
      }
    }
    return result;
  }

  return processInline(md);
}

// Read markdown back from a contentEditable DOM node
function domToMarkdown(node) {
  let result = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent;
    } else if (child.nodeName === "STRONG" || child.nodeName === "B") {
      const inner = domToMarkdown(child).trim();
      if (inner) result += `**${inner}**`;
    } else if (child.nodeName === "EM" || child.nodeName === "I") {
      const inner = domToMarkdown(child).trim();
      if (inner) result += `_${inner}_`;
    } else if (child.nodeName === "BR") {
      result += "\n";
    } else if (child.nodeName === "DIV" || child.nodeName === "P") {
      result += "\n" + domToMarkdown(child);
    } else {
      result += domToMarkdown(child);
    }
  });
  return result;
}

function RichTextarea({ value, onChange, hasError, resetKey }) {
  const ref = useRef(null);
  const isUserEditing = useRef(false);
  const isComposing = useRef(false);

  // When resetKey changes (modal reopens with new data), force re-sync innerHTML
  useEffect(() => {
    isUserEditing.current = false;
  }, [resetKey]);

  useEffect(() => {
    if (!ref.current || isUserEditing.current) return;
    ref.current.innerHTML = markdownToDisplayHtml(value);
  }, [value]);

  const handlePaste = (e) => {
    e.preventDefault();
    isUserEditing.current = true;
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    const markdown = html ? htmlToMarkdown(html) : plain;
    document.execCommand("insertHTML", false, markdownToDisplayHtml(markdown));
    onChange(domToMarkdown(ref.current));
  };

  const handleInput = () => {
    if (isComposing.current) return;
    isUserEditing.current = true;
    onChange(domToMarkdown(ref.current));
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onPaste={handlePaste}
      onInput={handleInput}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
      className={`min-h-[140px] max-h-[260px] overflow-y-auto whitespace-pre-wrap break-words ${fieldInputClass(hasError)}`}
      style={{ outline: "none" }}
    />
  );
}

export default function OrchestrationModalStepOne({
  onNextClickHandler,
  onSaveDraftClick,
  initialValues: stepOneInitialValues,
  isLoading: load,
  onValuesChange,
}) {
  const [tagInput, setTagInput] = useState("");

  const normalizedInitialValues = useMemo(() => {
    const base = stepOneInitialValues || initialValues;

    // Normalize various incoming date shapes to a single display string
    const toRangeString = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return "";
      const [s, e] = arr;
      const sF = s ? moment(s).format(DATE_FORMAT_MOMENT).toUpperCase() : "";
      const eF = e ? moment(e).format(DATE_FORMAT_MOMENT).toUpperCase() : "";
      return eF ? `${sF} - ${eF}` : sF;
    };

    let next = { ...initialValues, ...base };

    if (Array.isArray(base.eventDate) && base.eventDate.length > 0) {
      next = { ...next, eventDate: toRangeString(base.eventDate) };
    } else if (Array.isArray(base.event_dates) && base.event_dates.length > 0) {
      next = { ...next, eventDate: toRangeString(base.event_dates) };
    } else if ((base.start_date || base.end_date) && !base.eventDate) {
      next = { ...next, eventDate: toRangeString([base.start_date, base.end_date]) };
    }

    // Fresh open (no prior step data): default to today's date as a complete range
    if (!stepOneInitialValues && !hasEventDateValue(next.eventDate)) {
      next = { ...next, eventDate: getTodayEventDateRange() };
    }

    return next;
  }, [stepOneInitialValues]);

  const {
    values,
    setFieldValue,
    handleChange,
    errors,
    touched,
    submitForm,
    submitCount,
  } = useFormik({
    initialValues: normalizedInitialValues,
    enableReinitialize: true,
    validationSchema,
    onSubmit: (values) => {
      if (values.status === "DRAFT") {
        onSaveDraftClick(values);
      } else {
        onNextClickHandler(values);
      }
    },
  });

  // When modal reopens with new initialValues, allow RichTextarea to re-sync from value prop
  const descriptionResetKey = normalizedInitialValues.description;

  const showEventDateError = Boolean(
    errors.eventDate && (touched.eventDate || submitCount > 0),
  );

  const submitWithStatus = async (status) => {
    // Await so Formik applies status before validate/submit (avoids skipped validation).
    await setFieldValue("status", status, false);
    await submitForm();
  };

  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  /* ------------------ Tags ------------------ */

  const commitTag = () => {
    const trimmed = tagInput.trim().slice(0, MAX_TAG_ITEM_LENGTH);
    if (trimmed && !values?.tags?.includes?.(trimmed)) {
      setFieldValue("tags", Array.isArray(values.tags) ? [...values.tags, trimmed] : [trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove) => {
    setFieldValue(
      "tags",
      values.tags.filter((tag) => tag !== tagToRemove)
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-white font-sans">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-clip">
        {/* Row 1: Event Name | Sub-Event Name */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className={fieldGroupClass}>
            <label className={fieldLabelClass}>Event Name*</label>
            <input
              name="eventName"
              value={values.eventName}
              onChange={handleChange}
              className={fieldInputClass(errors.eventName && touched.eventName)}
            />
            <small className="text-red-500">{touched.eventName && errors.eventName}</small>
          </div>

          <div className={fieldGroupClass}>
            <label className={fieldLabelClass}>Sub-Event Name</label>
            <input
              name="subEventName"
              value={values.subEventName}
              onChange={handleChange}
              className={fieldInputClass(errors.subEventName && touched.subEventName)}
            />
            <small className="text-red-500">{touched.subEventName && errors.subEventName}</small>
          </div>
        </div>

        {/* Event Dates — same column rhythm as Event Name */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className={`${fieldGroupClass} relative z-10`}>
            <label className={fieldLabelClass}>Event Dates*</label>
            <DateRangePicker
              inputClassName={fieldInputClass(showEventDateError)}
              className="w-full"
              value={values.eventDate}
              onChange={(value) => setFieldValue("eventDate", value)}
              placeholder="Select start and end date"
              showIcon
              emitPartialSelection
            />
            <small className="text-red-500">{showEventDateError && errors.eventDate}</small>
          </div>
        </div>

        {/* Description */}
        <div className={fieldGroupClass}>
          <label className={fieldLabelClass}>Event Description*</label>
          <RichTextarea
            value={values.description}
            resetKey={descriptionResetKey}
            onChange={(val) => setFieldValue("description", val)}
            hasError={errors.description && touched.description}
          />
          <small className="text-red-500">{touched.description && errors.description}</small>
        </div>

        {/* Tags */}
        <div className={fieldGroupClass}>
          <label className={fieldLabelClass}>Tags*</label>
          <div
            className={`flex min-h-[48px] flex-wrap items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-4 py-2 ${
              errors.tags && touched.tags ? "border-red-500" : ""
            }`}
          >
            {values?.tags?.map((tag) => (
              <span key={tag} className={tagChipClass}>
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="inline-flex items-center text-violet-600 hover:text-violet-800"
                  aria-label={`Remove ${tag}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}

            <input
              type="text"
              placeholder="Type here to add..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value.slice(0, MAX_TAG_ITEM_LENGTH))}
              onKeyDown={(e) => {
                const isEnter =
                  e.key === "Enter" ||
                  e.key === "NumpadEnter" ||
                  e.keyCode === 13 ||
                  e.which === 13 ||
                  e.code === "Enter";
                if (isEnter) {
                  e.preventDefault();
                  commitTag();
                }
              }}
              onKeyUp={(e) => {
                const isEnter =
                  e.key === "Enter" ||
                  e.key === "NumpadEnter" ||
                  e.keyCode === 13 ||
                  e.which === 13 ||
                  e.code === "Enter";
                if (isEnter && tagInput.trim()) {
                  e.preventDefault();
                  commitTag();
                }
              }}
              onBlur={commitTag}
              maxLength={MAX_TAG_ITEM_LENGTH}
              className="min-w-[120px] flex-1 bg-transparent text-lg leading-[1.4] text-[#1e1e1e] outline-none placeholder:text-[#b3b3b3]"
            />
          </div>
          <small className="text-red-500">{touched.tags && errors.tags}</small>
          <p className="text-sm text-[#757575]">
            Press Enter or click outside the field to add the tag. Can be max 20 characters.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="z-10 flex shrink-0 flex-wrap items-center justify-end gap-3 bg-white pt-4">
        <button
          type="button"
          disabled={load}
          onClick={() => submitWithStatus("DRAFT")}
          className={primaryButtonClass}
        >
          <Save size={20} className="shrink-0" />
          Save as Draft
        </button>

        <button
          type="button"
          disabled={load}
          onClick={() => submitWithStatus(null)}
          className={primaryButtonClass}
        >
          Next
        </button>
      </div>
    </div>
  );
}
