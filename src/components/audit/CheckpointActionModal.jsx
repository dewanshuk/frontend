import { useEffect, useRef, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Calendar from "@/atoms/calendar";
import { DATE_FORMAT_MOMENT, toDisplayDateString } from "@/config";
import {
  CHECKPOINT_ACTION_FILE_RULES,
  closeCheckpoint,
  respondToCheckpoint,
} from "@/api/audit";

const VARIANT_CONFIG = {
  respond: {
    title: (checkpoint) => {
      const no = checkpoint?.serial_no ?? checkpoint?.serialNo ?? "";
      return no ? `Checkpoint ${String(no).padStart(2, "0")}` : "Checkpoint";
    },
    successMessage: "Response submitted successfully",
    submit: respondToCheckpoint,
    outcomeStatus: null,
    requiresClosureDate: false,
  },
  closed: {
    title: () => "Mark as Closed",
    successMessage: "Checkpoint marked as Closed successfully",
    submit: (payload) => closeCheckpoint({ ...payload, action: "closed" }),
    outcomeStatus: "Closed",
    requiresClosureDate: true,
  },
};

const labelClass =
  "mb-0 block text-base font-semibold text-[#1e1e1e]";

const readOnlyBoxClass =
  "min-h-[80px] w-full rounded-lg border border-[#d9d9d9] bg-[#f5f5f5] px-4 py-2.5 text-sm leading-normal text-[#1e1e1e]";

const textareaClass =
  "min-h-[88px] w-full resize-y rounded-lg border border-[#d9d9d9] bg-white px-4 py-2.5 text-sm leading-normal text-[#1e1e1e] outline-none placeholder:text-[#b3b3b3] focus:border-[#2563eb]";

const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-lg bg-[#fee9e7] px-4 text-sm font-semibold text-[#c00f0c] transition-colors hover:bg-[#fcd9d6] disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClass =
  "inline-flex h-9 min-w-[100px] items-center justify-center rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

function validateFiles(files, existingCount) {
  const rules = CHECKPOINT_ACTION_FILE_RULES;
  const list = Array.from(files || []);
  const accepted = [];
  let typeError = false;
  let sizeError = false;
  let limitError = false;

  for (const file of list) {
    const lower = file.name.toLowerCase();
    const okExt = rules.extensions.some((ext) => lower.endsWith(ext));
    if (!okExt) {
      typeError = true;
      continue;
    }
    if (file.size > rules.maxFileSizeBytes) {
      sizeError = true;
      continue;
    }
    if (existingCount + accepted.length >= rules.maxFiles) {
      limitError = true;
      break;
    }
    accepted.push(file);
  }

  return { accepted, typeError, sizeError, limitError };
}

/**
 * Shared modal for checkpoint Respond / Mark as Closed.
 * Mark as Closed requires Closure Date (sent as closure_date on the close API).
 */
export default function CheckpointActionModal({
  open,
  onOpenChange,
  variant = "respond",
  auditId,
  checkpoint,
  onToast,
  onSuccess,
}) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.respond;
  const fileInputRef = useRef(null);
  const [remarks, setRemarks] = useState("");
  const [closureDate, setClosureDate] = useState("");
  const [closureDateError, setClosureDateError] = useState("");
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setRemarks("");
      setClosureDate("");
      setClosureDateError("");
      setFiles([]);
      setDragActive(false);
      setFileError("");
      setIsSubmitting(false);
    }
  }, [open, variant, checkpoint?.id, checkpoint?.checkpoint_id]);

  const title = config.title(checkpoint);
  const tags = Array.isArray(checkpoint?.tags)
    ? checkpoint.tags.filter((tag) => String(tag ?? "").trim())
    : [];
  const description =
    checkpoint?.checkpoint ||
    checkpoint?.description ||
    "";
  const judgment =
    checkpoint?.judgement_criteria ||
    checkpoint?.judgementCriteria ||
    "";
  const riskLevel =
    checkpoint?.risk_level ||
    checkpoint?.riskLevel ||
    "";

  const applyFiles = (incoming) => {
    const { accepted, typeError, sizeError, limitError } = validateFiles(
      incoming,
      files.length,
    );
    if (typeError) {
      setFileError(
        "Only .pptx, .ppt, .xlsx, .xls, .pdf, .png, .jpg, .jpeg, .gif, .tiff, .bmp files are allowed.",
      );
    } else if (sizeError) {
      setFileError("Each file must be 10MB or less.");
    } else if (limitError) {
      setFileError(
        `Maximum ${CHECKPOINT_ACTION_FILE_RULES.maxFiles} files allowed.`,
      );
    } else {
      setFileError("");
    }
    if (accepted.length) {
      setFiles((prev) =>
        [...prev, ...accepted].slice(0, CHECKPOINT_ACTION_FILE_RULES.maxFiles),
      );
    }
  };

  const handleClear = () => {
    setRemarks("");
    setClosureDate("");
    setClosureDateError("");
    setFiles([]);
    setFileError("");
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const checkpointId = checkpoint?.checkpoint_id || checkpoint?.id;
    if (!checkpointId) {
      onToast?.("Checkpoint is missing.", "error");
      return;
    }

    if (config.requiresClosureDate && !String(closureDate || "").trim()) {
      setClosureDateError("Closure Date is required.");
      return;
    }
    setClosureDateError("");

    setIsSubmitting(true);
    try {
      await config.submit({
        auditId,
        checkpointId,
        remarks,
        files,
        ...(config.requiresClosureDate
          ? { closureDate: String(closureDate).trim() }
          : {}),
      });
      onToast?.(config.successMessage, "success");
      onOpenChange?.(false);
      onSuccess?.({
        checkpointId,
        variant,
        outcomeStatus: config.outcomeStatus,
        remarks,
        closureDate: config.requiresClosureDate
          ? String(closureDate).trim()
          : null,
      });
    } catch (err) {
      onToast?.(
        err?.message || "Unable to complete this action. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-h-[90vh] w-[min(560px,95vw)] max-w-[560px] overflow-y-auto rounded-2xl border-0 bg-white p-0 font-sans shadow-lg"
      >
        <div className="relative px-6 pb-6 pt-6 md:px-8 md:pb-8 md:pt-8">
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-lg text-[#757575] transition hover:bg-[#f5f5f5] hover:text-[#1e1e1e]"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2} />
          </button>

          <DialogTitle className="pr-10 text-xl font-semibold tracking-[-0.48px] text-[#1e1e1e] md:text-2xl">
            {title}
          </DialogTitle>

          <div className="mt-5 flex flex-col gap-4">
            {variant === "respond" ? (
              <div className="flex min-h-[24px] flex-wrap gap-1.5">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <span
                      key={String(tag)}
                      className="inline-flex rounded-md border border-[#d9d9d9] bg-white px-2.5 py-0.5 text-xs font-medium text-[#2563eb]"
                    >
                      {String(tag)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#b3b3b3]">No tags</span>
                )}
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <p className={labelClass}>
                {variant === "respond" ? "Checkpoint Description" : "Checkpoint"}
              </p>
              <div className={readOnlyBoxClass}>
                <p className="whitespace-pre-wrap">{description || "—"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className={labelClass}>Legal Provision</p>
              <div className={`${readOnlyBoxClass} min-h-[64px]`}>
                <p className="whitespace-pre-wrap">{judgment || "—"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className={labelClass}>Risk Level</p>
              <div className={`${readOnlyBoxClass} min-h-0 py-2`}>
                <p>{riskLevel || "—"}</p>
              </div>
            </div>

            <div className="border-t border-[#d9d9d9]" />

            {config.requiresClosureDate ? (
              <div className="flex flex-col gap-1.5">
                <p className={labelClass}>
                  Closure Date <span className="text-[#c00f0c]">*</span>
                </p>
                <Calendar
                  format={DATE_FORMAT_MOMENT}
                  value={closureDate || ""}
                  onChange={(date) => {
                    const next = date ? toDisplayDateString(date) : "";
                    setClosureDate(next);
                    if (next) setClosureDateError("");
                  }}
                  showIcon
                  width="100%"
                  openFrom="bottom"
                  inputClassName={cn(
                    "!mt-0 h-[41px] px-4 py-0 text-base normal-case placeholder:normal-case placeholder:text-[#b3b3b3]",
                    closureDateError
                      ? "border-red-500"
                      : "border-[#d9d9d9]",
                  )}
                />
                {closureDateError ? (
                  <p className="text-xs text-red-500" role="alert">
                    {closureDateError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <p className={labelClass}>
                {variant === "respond" ? "Remarks" : "Add Remarks"}
              </p>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Type here..."
                className={textareaClass}
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <p className={labelClass}>Upload Attachment/s</p>
              <div
                role="button"
                tabIndex={0}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  applyFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                  dragActive
                    ? "border-[#2563eb] bg-blue-50/80"
                    : "border-[#2563eb] bg-blue-50/40"
                }`}
              >
                <ImageIcon
                  className="size-10 shrink-0 text-[#2563eb]"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-sm text-gray-700">
                    Drag &amp; Drop your files here or{" "}
                    <span className="font-medium text-blue-600">browse</span>
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    (pptx, ppt, xlsx, xls, pdf, png, jpg, jpeg, gif, tiff, bmp) ·
                    Max 10MB · Max {CHECKPOINT_ACTION_FILE_RULES.maxFiles} files
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={CHECKPOINT_ACTION_FILE_RULES.accept}
                  className="hidden"
                  onChange={(e) => {
                    applyFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
              {fileError ? (
                <p className="text-xs text-red-500">{fileError}</p>
              ) : null}
              {files.length > 0 ? (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1 text-xs text-[#1e1e1e]"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        className="shrink-0 text-[#c00f0c] hover:opacity-80"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setFiles((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting}
                className={secondaryButtonClass}
              >
                Clear Form
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={primaryButtonClass}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
