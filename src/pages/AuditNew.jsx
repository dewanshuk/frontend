import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

import AuditDetailsForm from "@/components/audit/AuditDetailsForm";
import AuditCheckpointsTable from "@/components/audit/AuditCheckpointsTable";
import CenterToast from "@/components/shared/CenterToast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Calendar from "@/atoms/calendar";
import { DATE_FORMAT_MOMENT, toDisplayDateString } from "@/config";
import { cn } from "@/lib/utils";
import { generateAuditId } from "@/api/audit";
import { useAuditPersistence } from "@/hooks/useAuditPersistence";
import { useAuditAccess } from "@/hooks/useAuditAccess";
import { createEmptyCheckpoint } from "@/utils/auditHelpers";
import {
  resolvePublishFocusTab,
  validateAuditDetailsForDraft,
  validateAuditPublishFull,
} from "@/utils/auditValidation";

const TAB_DETAILS = "details";
const TAB_CHECKPOINTS = "checkpoints";

const primaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60";

const backButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#e6e6e6] px-3 text-sm font-medium text-[#757575] transition-colors hover:bg-[#d9d9d9]";

const createEmptyAudit = () => ({
  id: null,
  display_audit_id: "—",
  audit_id: "",
  audit_name: "",
  vertical_div_deptt: "",
  auditors: [],
  auditees: [],
  date_range: "",
  status: "Draft",
  reports: [],
});

export default function AuditNew() {
  const navigate = useNavigate();
  const auditAccess = useAuditAccess();
  const [audit, setAudit] = useState(createEmptyAudit);
  const [checkpoints, setCheckpoints] = useState([createEmptyCheckpoint(1)]);
  const [activeTab, setActiveTab] = useState(TAB_DETAILS);
  const [fieldErrors, setFieldErrors] = useState({});
  const [checkpointErrors, setCheckpointErrors] = useState({});
  const [idLoading, setIdLoading] = useState(true);
  const [idError, setIdError] = useState("");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [auditClosureDate, setAuditClosureDate] = useState("");
  const [auditClosureDateError, setAuditClosureDateError] = useState("");
  const [toast, setToast] = useState({
    open: false,
    variant: "success",
    message: "",
  });

  const showToast = (message, variant = "success") => {
    setToast({ open: true, variant, message });
  };

  const hasAuditId = Boolean(
    String(audit?.id ?? audit?.audit_id ?? "").trim() &&
      String(audit?.id ?? audit?.audit_id ?? "").trim() !== "0",
  );

  /** Fetch a reserved audit ID once the user is allowed into add mode. */
  useEffect(() => {
    if (auditAccess.loading || !auditAccess.allowed) return undefined;

    let cancelled = false;

    const loadAuditId = async () => {
      setIdLoading(true);
      setIdError("");
      try {
        const generated = await generateAuditId();
        if (cancelled) return;
        setAudit((current) => ({
          ...current,
          id: generated.id,
          audit_id: generated.audit_id,
          display_audit_id: generated.display_audit_id,
        }));
      } catch (error) {
        if (cancelled) return;
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          "Unable to generate audit ID.";
        setIdError(String(message));
        showToast(String(message), "error");
      } finally {
        if (!cancelled) setIdLoading(false);
      }
    };

    loadAuditId();
    return () => {
      cancelled = true;
    };
  }, [auditAccess.allowed, auditAccess.loading]);

  const { isSaving, tryLock, unlock, saveDraft, publish, closeAudit } =
    useAuditPersistence({
      audit,
      checkpoints,
      onError: (message) => showToast(message, "error"),
    });

  const handleFieldChange = (field, value) => {
    setAudit((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearCheckpointFieldError = (rowId, field) => {
    setCheckpointErrors((current) => {
      if (!current[rowId]) return current;
      if (!field) {
        const next = { ...current };
        delete next[rowId];
        return next;
      }
      if (!current[rowId][field]) return current;
      const nextRow = { ...current[rowId] };
      delete nextRow[field];
      const next = { ...current };
      if (Object.keys(nextRow).length === 0) {
        delete next[rowId];
      } else {
        next[rowId] = nextRow;
      }
      return next;
    });
  };

  const applyPublishValidation = async () => {
    const result = await validateAuditPublishFull(audit, checkpoints);
    if (!result.ok) {
      setFieldErrors(result.detailErrors || {});
      setCheckpointErrors(result.checkpointErrors || {});

      // Incomplete details → leave checkpoints so user sees inline field errors
      const focusTab = resolvePublishFocusTab(result);
      if (focusTab === TAB_CHECKPOINTS) {
        setActiveTab(TAB_CHECKPOINTS);
      } else {
        setActiveTab(TAB_DETAILS);
      }
      // Client-side validation: inline errors only (toasts are for server errors)
      return false;
    }
    setFieldErrors({});
    setCheckpointErrors({});
    return true;
  };

  const handleSaveDraft = async () => {
    if (!tryLock()) return;
    try {
      if (!hasAuditId) {
        showToast(idError || "Audit ID is not ready yet.", "error");
        return;
      }
      const details = await validateAuditDetailsForDraft(audit);
      if (!details.ok) {
        setFieldErrors(details.errors || {});
        setActiveTab(TAB_DETAILS);
        return;
      }
      setFieldErrors({});
      const success = await saveDraft({ externalLock: true });
      if (success) {
        showToast("Audit saved as draft.");
      }
    } finally {
      unlock();
    }
  };

  const handlePublish = async () => {
    if (isSaving) return;
    if (!hasAuditId) {
      showToast(idError || "Audit ID is not ready yet.", "error");
      return;
    }
    const valid = await applyPublishValidation();
    if (!valid) return;
    setPublishConfirmOpen(true);
  };

  const confirmPublish = async () => {
    if (!tryLock()) return;
    setPublishConfirmOpen(false);
    try {
      const valid = await applyPublishValidation();
      if (!valid) return;
      const success = await publish({ externalLock: true });
      if (success) {
        showToast(
          "Audit published successfully. The audit is available to the auditee.",
        );
      }
    } finally {
      unlock();
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    if (!hasAuditId) {
      showToast(idError || "Audit ID is not ready yet.", "error");
      return;
    }
    setAuditClosureDate("");
    setAuditClosureDateError("");
    setCloseConfirmOpen(true);
  };

  const confirmClose = async () => {
    if (!String(auditClosureDate || "").trim()) {
      setAuditClosureDateError("Closure Date is required.");
      return;
    }
    if (!tryLock()) return;
    setCloseConfirmOpen(false);
    try {
      const success = await closeAudit({
        externalLock: true,
        closureDate: String(auditClosureDate).trim(),
      });
      if (success) {
        showToast("Audit closed successfully.");
      }
    } finally {
      unlock();
    }
  };

  /** Next only switches tabs — validation runs on Save as Draft / Publish. */
  const handleNext = () => {
    setActiveTab(TAB_CHECKPOINTS);
  };

  const retryGenerateId = async () => {
    setIdLoading(true);
    setIdError("");
    try {
      const generated = await generateAuditId();
      setAudit((current) => ({
        ...current,
        id: generated.id,
        audit_id: generated.audit_id,
        display_audit_id: generated.display_audit_id,
      }));
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        "Unable to generate audit ID.";
      setIdError(String(message));
      showToast(String(message), "error");
    } finally {
      setIdLoading(false);
    }
  };

  const auditNameForConfirm = useMemo(
    () => String(audit?.audit_name || "this audit").trim() || "this audit",
    [audit?.audit_name],
  );

  if (auditAccess.loading || idLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-gray-100">
        <Loader2
          className="size-6 animate-spin text-[#2563eb]"
          aria-label={
            auditAccess.loading
              ? "Checking audit access"
              : "Generating audit ID"
          }
        />
      </div>
    );
  }

  if (!auditAccess.allowed) {
    return <Navigate to="/audit/dashboard" replace />;
  }

  return (
    <div className="min-h-full bg-gray-100 font-sans">
      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />

      {publishConfirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-base text-[#1e1e1e]">
              Are you sure you want to publish{" "}
              <em className="font-semibold italic">{auditNameForConfirm}</em>
              {" "}?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPublishConfirmOpen(false)}
                disabled={isSaving}
                className="rounded-lg bg-[#e6e6e6] px-4 py-2 text-sm font-medium text-[#757575] disabled:cursor-not-allowed disabled:opacity-60"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmPublish}
                disabled={isSaving}
                className={primaryButtonClass}
              >
                {isSaving ? "Publishing..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {closeConfirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#1e1e1e]">
              Mark as Closed
            </h3>
            <p className="mt-2 text-sm text-[#757575]">
              Select a closure date to close{" "}
              <em className="font-medium not-italic text-[#1e1e1e]">
                {auditNameForConfirm}
              </em>
              .
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-[#1e1e1e]">
                Closure Date <span className="text-[#c00f0c]">*</span>
              </label>
              <Calendar
                format={DATE_FORMAT_MOMENT}
                value={auditClosureDate || ""}
                onChange={(date) => {
                  const next = date ? toDisplayDateString(date) : "";
                  setAuditClosureDate(next);
                  if (next) setAuditClosureDateError("");
                }}
                showIcon
                width="100%"
                openFrom="bottom"
                inputClassName={cn(
                  "!mt-0 h-[41px] px-4 py-0 text-base normal-case placeholder:normal-case placeholder:text-[#b3b3b3]",
                  auditClosureDateError
                    ? "border-red-500"
                    : "border-[#d9d9d9]",
                )}
              />
              {auditClosureDateError ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {auditClosureDateError}
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isSaving) return;
                  setCloseConfirmOpen(false);
                  setAuditClosureDate("");
                  setAuditClosureDateError("");
                }}
                disabled={isSaving}
                className="rounded-lg bg-[#e6e6e6] px-4 py-2 text-sm font-medium text-[#757575] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClose}
                disabled={isSaving}
                className={primaryButtonClass}
              >
                {isSaving ? "Closing..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="w-full py-6 md:py-8">
        {activeTab === TAB_DETAILS ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/audit/dashboard")}
                className={backButtonClass}
              >
                <ChevronLeft className="size-4 shrink-0" strokeWidth={2} />
                Back
              </button>
              <h1 className="text-2xl font-semibold tracking-[-0.48px] text-[#1e1e1e]">
                Audit Details
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving || !hasAuditId}
                className={primaryButtonClass}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save as Draft"
                )}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={isSaving || !hasAuditId}
                className={primaryButtonClass}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {idError && !hasAuditId ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {idError}{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={retryGenerateId}
            >
              Retry
            </button>
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <TabsList className="flex h-14 w-full items-end justify-start gap-2 rounded-none bg-transparent px-6 p-0">
              <TabsTrigger
                value={TAB_DETAILS}
                className="rounded-none border-b-4 border-transparent px-3 pb-3 pt-2 text-base font-medium text-[#757575] shadow-none data-[state=active]:border-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:text-[#2563eb] data-[state=active]:shadow-none"
              >
                Audit Details
              </TabsTrigger>
              <TabsTrigger
                value={TAB_CHECKPOINTS}
                className="rounded-none border-b-4 border-transparent px-3 pb-3 pt-2 text-base font-medium text-[#757575] shadow-none data-[state=active]:border-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:text-[#2563eb] data-[state=active]:shadow-none"
              >
                Audit Checkpoints
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={TAB_DETAILS} className="mt-0">
            <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] md:p-10">
              <AuditDetailsForm
                audit={audit}
                onFieldChange={handleFieldChange}
                fieldErrors={fieldErrors}
              />
            </div>
          </TabsContent>

          <TabsContent
            value={TAB_CHECKPOINTS}
            className="mt-0 focus-visible:outline-none"
          >
            <AuditCheckpointsTable
              auditId={audit.id ?? audit.audit_id}
              audit={audit}
              checkpoints={checkpoints}
              onCheckpointsChange={setCheckpoints}
              isSaving={isSaving || !hasAuditId}
              showHeader
              rowErrors={checkpointErrors}
              onClearRowFieldError={clearCheckpointFieldError}
              onBack={() => navigate("/audit/dashboard")}
              onToast={(message, variant = "success") =>
                showToast(message, variant)
              }
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              onMarkAsClosed={handleClose}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
