import React, { useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import { X, HelpCircle, Download, Save } from "lucide-react";
import Calendar from "../../atoms/calendar";
import SearchableDropdown from "../../atoms/searchable-dropdown";
import { useFormik } from "formik";
import * as yup from "yup";
import moment from "moment";
import { DATE_FORMAT_MOMENT, toDisplayDateString } from "../../config";
import { useBackendUser } from "../../lib/UserContext";
import usePermissions from "../../lib/permissions";
import { normaliseDocTypeLabel } from "../../lib/utils";

const MAX_ATTACHMENT_COUNT = 6;
const MAX_ATTACHMENT_SIZE_BYTES = 30 * 1024 * 1024;
const NEXT_REVIEW_DATE_FORMAT = DATE_FORMAT_MOMENT;
const LEGACY_NEXT_REVIEW_DATE_FORMAT = "DD/MM/YYYY";

const fieldLabelClass =
  "block text-lg font-medium leading-[1.4] text-[#1e1e1e]";
const fieldLabelFlexClass =
  "flex text-lg font-medium leading-[1.4] text-[#1e1e1e] items-center gap-1";
const fieldGroupClass = "flex min-w-0 flex-col gap-2";
const fieldInputBaseClass =
  "w-full border border-[#d9d9d9] rounded-lg px-4 py-2 text-lg leading-[1.4] text-[#1e1e1e] bg-white placeholder:text-[#b3b3b3]";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600 disabled:opacity-25 disabled:cursor-not-allowed";
const secondaryOutlineButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9d9d9] px-6 py-3 text-lg font-semibold leading-[1.4] text-[#1e1e1e] transition-colors hover:bg-gray-50";
const tagChipClass =
  "inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-3 py-1 text-base font-medium text-violet-600";
const MAX_TAG_ITEM_LENGTH = 20;
const fileChipClass =
  "flex items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-3 py-2 text-base text-[#1e1e1e] w-full min-w-0";

const fieldInputClass = (hasError) =>
  `${fieldInputBaseClass}${hasError ? " border-red-500" : ""}`;

function htmlToMarkdown(html) {
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

function markdownToDisplayHtml(md) {
  if (!md) return "";

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function processInline(text) {
    let result = "";
    let remaining = text;
    while (remaining.length > 0) {
      const boldIdx = remaining.indexOf("**");
      const italicIdx = remaining.indexOf("_");
      const hasBold = boldIdx !== -1 && remaining.indexOf("**", boldIdx + 2) !== -1;
      const hasItalic = italicIdx !== -1 && remaining.indexOf("_", italicIdx + 1) !== -1;
      if (!hasBold && !hasItalic) { result += escapeHtml(remaining).replace(/\n/g, "<br/>"); break; }
      const nextBold = hasBold ? boldIdx : Infinity;
      const nextItalic = hasItalic ? italicIdx : Infinity;
      if (nextBold <= nextItalic) {
        result += escapeHtml(remaining.slice(0, nextBold)).replace(/\n/g, "<br/>");
        remaining = remaining.slice(nextBold + 2);
        const closeIdx = remaining.indexOf("**");
        if (closeIdx === -1) { result += "**" + escapeHtml(remaining).replace(/\n/g, "<br/>"); break; }
        result += `<strong>${processInline(remaining.slice(0, closeIdx))}</strong>`;
        remaining = remaining.slice(closeIdx + 2);
      } else {
        result += escapeHtml(remaining.slice(0, nextItalic)).replace(/\n/g, "<br/>");
        remaining = remaining.slice(nextItalic + 1);
        const closeIdx = remaining.indexOf("_");
        if (closeIdx === -1) { result += "_" + escapeHtml(remaining).replace(/\n/g, "<br/>"); break; }
        result += `<em>${processInline(remaining.slice(0, closeIdx))}</em>`;
        remaining = remaining.slice(closeIdx + 1);
      }
    }
    return result;
  }

  return processInline(md);
}

function domToMarkdown(node) {
  let result = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) result += child.textContent;
    else if (child.nodeName === "STRONG" || child.nodeName === "B") { const inner = domToMarkdown(child).trim(); if (inner) result += `**${inner}**`; }
    else if (child.nodeName === "EM" || child.nodeName === "I") { const inner = domToMarkdown(child).trim(); if (inner) result += `_${inner}_`; }
    else if (child.nodeName === "BR") result += "\n";
    else if (child.nodeName === "DIV" || child.nodeName === "P") result += "\n" + domToMarkdown(child);
    else result += domToMarkdown(child);
  });
  return result;
}

function RichTextarea({ value, onChange, hasError, resetKey, className }) {
  const ref = useRef(null);
  const isUserEditing = useRef(false);
  const isComposing = useRef(false);

  useEffect(() => { isUserEditing.current = false; }, [resetKey]);

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
      className={className}
      style={{ outline: "none" }}
    />
  );
}

const TYPE_ALLOWED_EXTENSIONS = {
  // News & Announcements
  "Latest News & Announcements":  [".jpg", ".jpeg", ".gif", ".png"],
  "Latest News and Announcements":[".jpg", ".jpeg", ".gif", ".png"],
  // Flyers
  "Flyers": [".jpg", ".jpeg", ".png"],
  "Flyer":  [".jpg", ".jpeg", ".png"],
  // FAQs
  "FAQs": [".xlsx"],
  "FAQ":  [".xlsx"],
  // Knowledge Hub Documents
  "Policy":           [".pptx", ".ppt", ".ppsx", ".pps", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"],
  "Guidance Notes":   [".pptx", ".ppt", ".ppsx", ".pps", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"],
  "Laws & Regulations":[".pptx", ".ppt", ".ppsx", ".pps", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"],
  "Law/Regulation":   [".pptx", ".ppt", ".ppsx", ".pps", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"],
  "Law Regulation":   [".pptx", ".ppt", ".ppsx", ".pps", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"],
  "Training Resources":[".pptx", ".ppt", ".ppsx", ".pps", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"],
  "Training Material":[".pptx", ".ppt", ".ppsx", ".pps", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"],
  "EWS":              [".pptx", ".ppt", ".ppsx", ".pps", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"],
  // Events
  "Event": [".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp", ".mp4"],
};

// Keyword-based fallback so minor label variants ("Flyers" vs "Flyer" etc.) always resolve correctly.
const getAllowedExtensions = (documentType) => {
  if (!documentType) return [...new Set(Object.values(TYPE_ALLOWED_EXTENSIONS).flat())];
  if (TYPE_ALLOWED_EXTENSIONS[documentType]) return TYPE_ALLOWED_EXTENSIONS[documentType];
  const lower = documentType.toLowerCase();
  if (lower.includes("news") || lower.includes("announcement")) return TYPE_ALLOWED_EXTENSIONS["Latest News & Announcements"];
  if (lower.includes("flyer")) return TYPE_ALLOWED_EXTENSIONS["Flyers"];
  if (lower.includes("faq")) return TYPE_ALLOWED_EXTENSIONS["FAQs"];
  if (lower.includes("guidance")) return TYPE_ALLOWED_EXTENSIONS["Guidance Notes"];
  if (lower.includes("law") || lower.includes("regulation")) return TYPE_ALLOWED_EXTENSIONS["Laws & Regulations"];
  if (lower.includes("training")) return TYPE_ALLOWED_EXTENSIONS["Training Resources"];
  if (lower.includes("ews") || lower.includes("early warning")) return TYPE_ALLOWED_EXTENSIONS["EWS"];
  if (lower.includes("policy")) return TYPE_ALLOWED_EXTENSIONS["Policy"];
  if (lower.includes("event")) return TYPE_ALLOWED_EXTENSIONS["Event"];
  return [...new Set(Object.values(TYPE_ALLOWED_EXTENSIONS).flat())];
};

const getFileExtension = (fileName = "") => {
  const normalizedName = String(fileName).toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");

  return lastDotIndex >= 0 ? normalizedName.slice(lastDotIndex) : "";
};

const getDocumentTypeDisplayLabel = (label) =>
  normaliseDocTypeLabel(label) ||
  (label === "Training Material" ? "Training Resource" : label);

const parseReviewDate = (value) => {
  if (!value) return null;
  const normalizedValue = toDisplayDateString(value);
  const nextReviewFormatDate = moment(normalizedValue, NEXT_REVIEW_DATE_FORMAT, true);
  if (nextReviewFormatDate.isValid()) return nextReviewFormatDate;
  const legacyDate = moment(value, LEGACY_NEXT_REVIEW_DATE_FORMAT, true);
  if (legacyDate.isValid()) return legacyDate;
  return null;
};

const makeValidationSchema = (minReviewDate, requireTags = true) => {
  const singleTagSchema = yup
    .string()
    .trim()
    .max(MAX_TAG_ITEM_LENGTH, `Each tag can be up to ${MAX_TAG_ITEM_LENGTH} characters only.`);
  const tagsSchema = requireTags
    ? yup.array().of(singleTagSchema).min(1, "At least one tag is required")
    : yup.array().of(singleTagSchema).notRequired();

  return yup.object().shape({
    documentType: yup.string().required("Document Type is required"),
    name: yup.string().required("Name is required").max(255, "Name can't be greater than 255 characters"),
    summary: yup.string().required("Document Summary is required"),
    reviewDate: yup.string()
      .test("valid-format", `Date must be in ${NEXT_REVIEW_DATE_FORMAT} format (e.g. 24/JUL/2026)`, (value) => {
        if (!value) return true;
        return moment(toDisplayDateString(value), NEXT_REVIEW_DATE_FORMAT, true).isValid();
      })
      .test("min-date", "Next Review Date cannot be before the minimum allowed date", (value) => {
        if (!value) return true;
        const date = moment(toDisplayDateString(value), NEXT_REVIEW_DATE_FORMAT, true);
        if (!date.isValid()) return true;
        const min = moment(minReviewDate).startOf("day");
        return date.startOf("day").isSameOrAfter(min);
      }),
    files: yup.array()
      .required("Files are required")
      .test(
        "at-least-one-file",
        " At least one file is required",
        (value) => value && value.length > 0
      )
      .test(
        "max-files",
        function(value) {
          const docType = this.parent?.documentType;
          const allowed = docType && typeof docType === "string" && docType.toLowerCase().includes("faq") ? 1 : MAX_ATTACHMENT_COUNT;
          if (!value) return true;
          if (value.length <= allowed) return true;
          return this.createError({ message: `You can upload upto ${allowed} attachments only.` });
        }
      )
      .test(
        "supported-file-types",
        "Unsupported file type for the selected document type.",
        function(value) {
          const allowed = getAllowedExtensions(this.parent?.documentType);
          const invalidFile = value?.find(
            (file) => !allowed.includes(getFileExtension(file?.name))
          );
          if (invalidFile) {
            return this.createError({
              message: `"${getFileExtension(invalidFile.name)}" is not allowed for this document type. Supported: ${allowed.join(", ")}.`,
            });
          }
          return true;
        }
      )
      .test(
        "file-size-limit",
        "Each attachment must be 30MB or smaller.",
        (value) =>
          !value ||
          value.every((file) => Number(file?.size || 0) <= MAX_ATTACHMENT_SIZE_BYTES)
      ),
    tags: tagsSchema,
    version: yup
      .string()
      .nullable(),
  });
};

const initialValues = {
  documentType: "",
  legislation: "",
  subLegislation: "",
  name: "",
  version: "",
  reviewDate: "",
  summary: "",
  tags: [],
  downloadAllowed: false,
};

export default function OrchestrationAddEventModalStepOne({
  onNextClickHandler,
  onBackClick,
  orchestrationConfig,
  initialValues: initialVals,
  isLoading: load,
  mode = "create",
  requireTags = true,
  onDocTypeChange,
  onValuesChange,
}) {
  const [files, setFiles] = useState(initialVals?.files || []);
  const [uploadError, setUploadError] = useState("");
  const backendUser = useBackendUser();
  const perms = usePermissions({ backendUser });
  const { legislations, subLegislations, documentTypes } = orchestrationConfig || {};

  // Role-to-document-type mapping (keyword-based, case-insensitive)
  // Policy Hub Admin / Policy Admin → Policies, Guidance Notes, Laws
  // KH Admin / Knowledge Hub Admin  → Training Resources, FAQs, Flyers, EWS, News, Documents
  const DOC_TYPE_ROLE_MAP = [
    { keywords: ["policy"],                       roles: ["Policy Admin", "Policy Hub Admin"] },
    { keywords: ["guidance"],                     roles: ["Policy Admin", "Policy Hub Admin"] },
    { keywords: ["law", "regulation"],            roles: ["Policy Admin", "Policy Hub Admin"] },
    { keywords: ["training"],                     roles: ["KH Admin", "Knowledge Hub Admin"] },
    { keywords: ["faq"],                          roles: ["KH Admin", "Knowledge Hub Admin"] },
    { keywords: ["flyer"],                        roles: ["KH Admin", "Knowledge Hub Admin"] },
    { keywords: ["ews", "early warning"],         roles: ["KH Admin", "Knowledge Hub Admin"] },
    { keywords: ["news", "announcement"],         roles: ["KH Admin", "Knowledge Hub Admin"] },
  ];

  const filteredDocumentTypes = useMemo(() => {
    if (!Array.isArray(documentTypes)) return documentTypes;
    return documentTypes
      .filter((type) => {
        const lower = String(type?.label ?? type?.value ?? type).toLowerCase();
        const match = DOC_TYPE_ROLE_MAP.find((entry) =>
          entry.keywords.some((kw) => lower.includes(kw))
        );
        // If no rule matches, show to all (unclassified types)
        if (!match) return true;
        return perms?.hasAnyRole?.(match.roles) ?? true;
      })
      .map((type) => type.label === "Law Regulation" ? { ...type, label: "Law & Regulation" } : type);
  }, [documentTypes, perms?.roles]);

  const sortedDocumentTypes = useMemo(() => {
    if (!Array.isArray(filteredDocumentTypes)) return [];
    return [...filteredDocumentTypes]
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
  }, [filteredDocumentTypes]);

  const normalizedInitialValues = useMemo(() => {
    if (!initialVals) return initialValues;
    const parsedReviewDate = parseReviewDate(initialVals.reviewDate);
    return {
      ...initialVals,
      reviewDate: parsedReviewDate
        ? toDisplayDateString(parsedReviewDate.format(NEXT_REVIEW_DATE_FORMAT))
        : (initialVals.reviewDate || ""),
    };
  }, [initialVals]);


  // In edit mode, allow keeping the existing review date even if it's in the past.
  const minReviewDate = useMemo(() => {
    const prefilled = parseReviewDate(initialVals?.reviewDate);
    if (prefilled) return prefilled.toDate();
    return new Date();
  }, [initialVals?.reviewDate]);

  const {
    values: formData,
    setFieldValue,
    setFieldTouched,
    errors,
    touched,
    submitForm,
  } = useFormik({
    initialValues: normalizedInitialValues,
    enableReinitialize: true,
    validationSchema: makeValidationSchema(minReviewDate, requireTags),
    onSubmit: (values) => {
      const parsedReviewDate = parseReviewDate(values.reviewDate);
      onNextClickHandler({
        ...values,
        reviewDate: parsedReviewDate
          ? toDisplayDateString(parsedReviewDate.format(DATE_FORMAT_MOMENT))
          : values.reviewDate,
        files,
      });
    },
  });

  const isFAQ = String(formData?.documentType || "").toLowerCase().includes("faq");

  const allowedCount = formData?.documentType && String(formData.documentType).toLowerCase().includes("faq") ? 1 : MAX_ATTACHMENT_COUNT;

  const filteredSubLegislations = Array.isArray(subLegislations)
    ? subLegislations.filter(
      ({ legislation_id }) =>
        String(legislation_id) === String(formData.legislation)
    )
    : [];

  useEffect(() => {
    setFiles(initialVals?.files || []);
    setUploadError("");
  }, [initialVals]);

  useEffect(() => {
    onValuesChange?.({ ...formData, files });
  }, [formData, files]);

  // Clear files that are no longer valid when document type changes
  useEffect(() => {
    if (!formData.documentType) return;
    const allowed = getAllowedExtensions(formData.documentType);
    const allowedCount = String(formData.documentType).toLowerCase().includes("faq") ? 1 : MAX_ATTACHMENT_COUNT;
    setFiles((prev) => {
      let valid = prev.filter((f) => allowed.includes(getFileExtension(f.name)));
      if (valid.length > allowedCount) {
        valid = valid.slice(0, allowedCount);
        setUploadError(`Some files were removed because only ${allowedCount} attachment${allowedCount > 1 ? 's' : ''} are allowed for the selected document type.`);
        return valid;
      }
      if (valid.length !== prev.length) {
        setUploadError("Some files were removed because they are not supported for the selected document type.");
        return valid;
      }
      return prev;
    });

    // If selected type is FAQ, clear legislation fields as they are not applicable
    if (String(formData.documentType).toLowerCase().includes("faq")) {
      setFieldValue("legislation", "");
      setFieldValue("subLegislation", "");
    }
  }, [formData.documentType]);

  useEffect(() => {
    setFieldValue("files", files);
  }, [files, setFieldValue]);

  useEffect(() => {
    return () => {
      setFieldValue("status", "");
    }
  }, []);

  /* ------------------ Files ------------------ */
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (incoming) => {
    if (!incoming || incoming.length === 0) return;

    const allowedExtensions = getAllowedExtensions(formData.documentType);
    const maxAllowed =
      formData?.documentType &&
      String(formData.documentType).toLowerCase().includes("faq")
        ? 1
        : MAX_ATTACHMENT_COUNT;
    const nextFiles = [...files];

    for (const file of incoming) {
      const fileExtension = getFileExtension(file.name);

      if (!allowedExtensions.includes(fileExtension)) {
        setUploadError(
          `"${fileExtension}" is not allowed for this document type. Supported: ${allowedExtensions.join(", ")}.`
        );
        return;
      }

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setUploadError("Each attachment must be 30MB or smaller.");
        return;
      }

      if (nextFiles.length >= maxAllowed) {
        setUploadError(
          `You can upload upto ${maxAllowed} attachment${maxAllowed > 1 ? "s" : ""} only.`,
        );
        // Keep any files already accepted in this batch (e.g. first of a multi-select).
        setFiles(nextFiles);
        return;
      }

      nextFiles.push(file);
    }

    setUploadError("");
    setFiles(nextFiles);
  };

  const handleFileUpload = (e) => {
    processFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear when leaving the drop zone entirely (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const removeFile = (name) => {
    setUploadError("");
    setFiles(files.filter((file) => file.name !== name));
  };

  /* ------------------ Tags ------------------ */
  const { tags } = formData;
  const setTags = (tags) => {
    setFieldValue("tags", tags);
  };

  const [tagInput, setTagInput] = useState("");

  const addTag = (e) => {
    const isEnter = e.key === "Enter" || e.key === "NumpadEnter" || e.keyCode === 13 || e.which === 13 || e.code === "Enter";
    if (!isEnter) return;
    e.preventDefault();
    const trimmed = tagInput.trim().slice(0, MAX_TAG_ITEM_LENGTH);
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const commitTag = () => {
    const trimmed = tagInput.trim().slice(0, MAX_TAG_ITEM_LENGTH);
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  /* ------------------ Handle Change ------------------ */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFieldValue(name, value);

    if (name === "legislation") {
      setFieldValue("subLegislation", "");
    }

    if (name === "documentType") {
      onDocTypeChange?.(value);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden font-sans">
      <div className="pr-1 min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto">
        {isFAQ ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Document Type*</label>
                <select
                  name="documentType"
                  value={formData.documentType}
                  onChange={handleChange}
                  className={fieldInputClass(errors.documentType && touched.documentType)}
                >
                  <option value="">Select</option>
                  {sortedDocumentTypes
                      .map(({ value, label, displayLabel }) => (
                        <option key={value} value={value}>
                          {displayLabel || label}
                        </option>
                      ))}
                </select>
                <small className="text-red-500">{touched.documentType && (errors?.documentType || "")}</small>
              </div>

              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Name*</label>
                <textarea
                  name="name"
                  rows={1}
                  value={formData.name}
                  onChange={handleChange}
                  className={fieldInputClass(errors.name && touched.name)}
                />
                <small className="text-red-500">{touched.name && (errors?.name || "")}</small>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Version</label>
                <input
                  type="text"
                  name="version"
                  value={formData.version}
                  onChange={handleChange}
                  className={fieldInputClass(errors.version && touched.version)}
                />
                <small className="text-red-500">{touched.version && (errors?.version || "")}</small>
              </div>

              <div className={fieldGroupClass}>
                <label className={fieldLabelFlexClass}>
                  Next Review Date
                  <div className="relative group">
                    <HelpCircle className="w-4 h-4 text-[#b3b3b3] cursor-pointer" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 z-50 pointer-events-none leading-relaxed">
                      The date by which this document should be reviewed for accuracy and continued relevance. A reminder will be triggered on this date.
                      <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-800" />
                    </div>
                  </div>
                </label>
                <Calendar
                  format={NEXT_REVIEW_DATE_FORMAT}
                  className={fieldInputBaseClass}
                  value={formData.reviewDate}
                  onChange={(date) => { setFieldValue("reviewDate", toDisplayDateString(date)); setFieldTouched("reviewDate", true, false); }}
                  onBlur={() => setFieldTouched("reviewDate", true)}
                  minDate={minReviewDate}
                  popupShift={35}
                />
                <small className="text-red-500">{touched.reviewDate && (errors?.reviewDate || "")}</small>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Document Type*</label>
                <select
                  name="documentType"
                  value={formData.documentType}
                  onChange={handleChange}
                  className={fieldInputClass(errors.documentType && touched.documentType)}
                >
                  <option value="">Select</option>
                  {sortedDocumentTypes
                      .map(({ value, label, displayLabel }) => (
                        <option key={value} value={value}>
                          {displayLabel || label}
                        </option>
                      ))}
                </select>
                <small className="text-red-500">{touched.documentType && (errors?.documentType || "")}</small>
              </div>

              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Legislation</label>
                <SearchableDropdown
                  options={
                    Array.isArray(legislations)
                      ? legislations.map(({ id, name }) => ({
                          value: String(id),
                          label: name,
                        }))
                      : []
                  }
                  value={formData.legislation ? String(formData.legislation) : ""}
                  onChange={(nextValue) => {
                    setFieldValue("legislation", nextValue);
                    setFieldValue("subLegislation", "");
                  }}
                  placeholder="Select"
                  inputClassName="text-lg leading-[1.4]"
                />
              </div>

              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Rule/Notification etc.</label>
                <SearchableDropdown
                  options={filteredSubLegislations.map(({ id, name }) => ({
                    value: String(id),
                    label: name,
                  }))}
                  value={formData.subLegislation ? String(formData.subLegislation) : ""}
                  onChange={(nextValue) => setFieldValue("subLegislation", nextValue)}
                  placeholder="Select"
                  disabled={!formData.legislation}
                  inputClassName="text-lg leading-[1.4]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Name*</label>
                <textarea
                  name="name"
                  rows={1}
                  value={formData.name}
                  onChange={handleChange}
                  className={fieldInputClass(errors.name && touched.name)}
                />
                <small className="text-red-500">{touched.name && (errors?.name || "")}</small>
              </div>

              <div className={fieldGroupClass}>
                <label className={fieldLabelClass}>Version</label>
                <input
                  type="text"
                  name="version"
                  value={formData.version}
                  onChange={handleChange}
                  className={fieldInputClass(errors.version && touched.version)}
                />
                <small className="text-red-500">{touched.version && (errors?.version || "")}</small>
              </div>

              <div className={fieldGroupClass}>
                <label className={fieldLabelFlexClass}>
                  Next Review Date
                  <div className="relative group">
                    <HelpCircle className="w-4 h-4 text-[#b3b3b3] cursor-pointer" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 z-50 pointer-events-none leading-relaxed">
                      The date by which this document should be reviewed for accuracy and continued relevance. A reminder will be triggered on this date.
                      <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-800" />
                    </div>
                  </div>
                </label>
                <Calendar
                  format={NEXT_REVIEW_DATE_FORMAT}
                  className={fieldInputBaseClass}
                  value={formData.reviewDate}
                  onChange={(date) => { setFieldValue("reviewDate", toDisplayDateString(date)); setFieldTouched("reviewDate", true, false); }}
                  onBlur={() => setFieldTouched("reviewDate", true)}
                  minDate={minReviewDate}
                  popupShift={35}
                />
                <small className="text-red-500">{touched.reviewDate && (errors?.reviewDate || "")}</small>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4 items-stretch">
          <div className={`${fieldGroupClass} flex-1`}>
            <label className={fieldLabelClass}>Document Summary*</label>
            <RichTextarea
              value={formData.summary}
              resetKey={normalizedInitialValues.summary}
              onChange={(val) => setFieldValue("summary", val)}
              hasError={errors.summary && touched.summary}
              className={`min-h-[140px] max-h-[260px] overflow-y-auto whitespace-pre-wrap break-words ${fieldInputClass(errors.summary && touched.summary)}`}
            />
            <small className="text-red-500">{touched.summary && (errors?.summary || "")}</small>
          </div>

          <div className={fieldGroupClass}>
            <div className="flex items-center justify-between">
              <label className={fieldLabelClass}>Upload Attachments*</label>
              {isFAQ && (
                <a
                  href="/assets/templates/FAQ_Template.xlsx"
                  download="FAQ_Template.xlsx"
                  className="inline-flex items-center gap-1 text-lg font-semibold text-[#2563eb] hover:text-blue-700"
                >
                  <Download size={16} />
                  Download Template
                </a>
              )}
            </div>

            <label
              className={`flex min-h-[140px] min-w-0 flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 transition ${
                isDragging ? "border-[#2563eb] bg-blue-600/10" : "border-[#2563eb] bg-blue-600/5"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <img src="/assets/icons/orch/file-image.svg" alt="" className="mr-4 h-10 w-10 shrink-0" />
              <div className="min-w-0">
                <p className="text-lg leading-[1.4] text-[#1f2937]">
                  Drag & Drop your files here or{" "}
                  <span className="font-semibold text-[#1e49e2]">browse</span>
                </p>
                <p className="mt-2 break-words text-base leading-5 text-gray-400">
                  Upto {allowedCount} attachment{allowedCount > 1 ? "s" : ""}. 30MB max per file.{" "}
                  {formData.documentType
                    ? <>Supported formats: {getAllowedExtensions(formData.documentType).join(", ")}.</>
                    : "Select a document type to see allowed formats."}
                </p>
                {uploadError ? <small className="text-red-500">{uploadError}</small> : null}
                <input
                  type="file"
                  multiple
                  accept={getAllowedExtensions(formData.documentType).join(",")}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <small className="text-red-500">{touched.files && (errors?.files || "")}</small>
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={fieldGroupClass}>
            <label className={fieldLabelClass}>Tags<span className="text-[#1e1e1e]">*</span></label>
            <div className={`flex flex-wrap gap-2 rounded-lg border px-4 py-2 ${errors.tags && touched.tags ? "border-red-500" : "border-[#d9d9d9]"}`}>
              {tags.map((tag) => (
                <div key={tag} className={tagChipClass}>
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-violet-600 hover:text-violet-800">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value.slice(0, MAX_TAG_ITEM_LENGTH))}
                onKeyDown={(e) => {
                  const isEnter = e.key === "Enter" || e.key === "NumpadEnter" || e.keyCode === 13 || e.which === 13 || e.code === "Enter";
                  if (isEnter) { e.preventDefault(); commitTag(); }
                }}
                onKeyUp={(e) => {
                  const isEnter = e.key === "Enter" || e.key === "NumpadEnter" || e.keyCode === 13 || e.which === 13 || e.code === "Enter";
                  if (isEnter && tagInput.trim()) { e.preventDefault(); commitTag(); }
                }}
                onBlur={commitTag}
                maxLength={MAX_TAG_ITEM_LENGTH}
                placeholder="Type here to add..."
                className="min-w-0 flex-1 text-lg leading-[1.4] text-[#1e1e1e] outline-none placeholder:text-[#b3b3b3]"
              />
            </div>
            <small className="text-red-500">{touched.tags && errors.tags}</small>
            <p className="text-base text-gray-400">Press Enter or click outside the field to add the tag. Can be max 20 characters.</p>
          </div>

          <div className={fieldGroupClass}>
            <label className={`${fieldLabelClass} invisible`} aria-hidden="true">&nbsp;</label>
            <div className={`grid w-full auto-rows-min grid-cols-3 gap-2 ${files.length > 3 ? "max-h-28 overflow-y-auto" : ""}`}>
              {files.map((file) => (
                <div key={file.name} title={file.name} className={fileChipClass}>
                  <span className="flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => removeFile(file.name)} className="ml-2 shrink-0 text-[#c00f0c] hover:text-red-700">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-[#d9d9d9] bg-white pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-lg font-medium leading-[1.4] text-[#1e1e1e]">Download Allowed</span>
          <div className="flex items-center gap-3">
            <span className={`text-lg leading-[1.4] ${formData.downloadAllowed ? "font-medium text-[#1e1e1e]" : "text-[#1e1e1e] opacity-50"}`}>
              Yes
            </span>
            <button
              type="button"
              onClick={() => setFieldValue("downloadAllowed", !formData.downloadAllowed)}
              className={`relative inline-flex h-[31px] w-[51px] items-center rounded-full transition-colors ${
                formData.downloadAllowed ? "bg-[#ec221f]" : "bg-[#009951]"
              }`}
            >
              <span
                className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-sm transition-transform ${
                  formData.downloadAllowed ? "translate-x-1" : "translate-x-[22px]"
                }`}
              />
            </button>
            <span className={`text-lg leading-[1.4] ${formData.downloadAllowed ? "text-[#1e1e1e] opacity-50" : "font-medium text-[#1e1e1e]"}`}>
              No
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap justify-end gap-3">
          {onBackClick && (
            <button type="button" onClick={onBackClick} className={secondaryOutlineButtonClass}>
              Back
            </button>
          )}
          <button
            type="button"
            disabled={load}
            onClick={async () => {
              await setFieldValue("status", "DRAFT");
              submitForm();
            }}
            className={primaryButtonClass}
          >
            <Save size={20} className="shrink-0" />
            Save as Draft
          </button>
          <button
            type="button"
            disabled={load}
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
    </div>
  );

}
