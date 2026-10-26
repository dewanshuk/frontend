import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuditDetailsForm from "../components/audit/AuditDetailsForm";
import AuditCheckpointsTable from "../components/audit/AuditCheckpointsTable";
import CenterToast from "../components/shared/CenterToast";
import { getAuditDetail } from "../api/audit";
import { useAuditPersistence } from "@/hooks/useAuditPersistence";
import { createEmptyCheckpoint, resolveAuditViewerRole } from "@/utils/auditHelpers";
import {
  resolvePublishFocusTab,
  validateAuditDetailsForDraft,
  validateAuditPublishFull,
} from "@/utils/auditValidation";
import { useAuthNavigation } from "@/context/AuthNavigationContext";

const TAB_DETAILS = "details";
const TAB_CHECKPOINTS = "checkpoints";

const backButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#e6e6e6] px-3 py-1 text-lg font-normal leading-[1.4] text-[#757575] transition-colors hover:bg-[#d9d9d9]";

const detailsDraftButtonClass =
  "rounded-lg bg-blue-100 px-5 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60";

const detailsNextButtonClass =
  "rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60";

/** Resolve edit vs view from URL (?mode=edit|view or legacy ?edit=true). */
const resolveDetailMode = (searchParams) => {
  const editFlag = searchParams.get("edit");
  if (editFlag === "true" || editFlag === "1") return "edit";
  const mode = String(searchParams.get("mode") || "view").toLowerCase();
  return mode === "edit" ? "edit" : "view";
};

const buildSearchParams = ({ mode, tab }) => {
  const next = new URLSearchParams();
  if (mode === "edit") {
    next.set("mode", "edit");
  } else {
    next.set("mode", "view");
  }
  // Always set an explicit tab so publish can force switch away from checkpoints.
  next.set(
    "tab",
    tab === TAB_CHECKPOINTS ? TAB_CHECKPOINTS : TAB_DETAILS,
  );
  return next;
};

export default function AuditDetails() {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthNavigation();
  const [audit, setAudit] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({
    open: false,
    variant: "success",
    message: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [checkpointErrors, setCheckpointErrors] = useState({});

  const mode = resolveDetailMode(searchParams);
  const isEditMode = mode === "edit";
  const roleParam = String(searchParams.get("role") || "").toLowerCase();
  const viewerRole = useMemo(() => {
    if (roleParam === "auditor" || roleParam === "auditee") return roleParam;
    return resolveAuditViewerRole(audit, user);
  }, [audit, user, roleParam]);

  const activeTab =
    searchParams.get("tab") === TAB_CHECKPOINTS ? TAB_CHECKPOINTS : TAB_DETAILS;

  useEffect(() => {
    let cancelled = false;

    const loadAudit = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await getAuditDetail(auditId, mode);

        if (!cancelled) {
          const loadedAudit = response?.data || null;
          setAudit(loadedAudit);
          if (loadedAudit?.checkpoints?.length) {
            setCheckpoints(loadedAudit.checkpoints);
          } else {
            setCheckpoints([createEmptyCheckpoint(1)]);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setAudit(null);
          setError(loadError?.message || "Failed to load audit details.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAudit();
    return () => {
      cancelled = true;
    };
  }, [auditId, mode]);

  const handleTabChange = (nextTab) => {
    setSearchParams(buildSearchParams({ mode, tab: nextTab }));
  };

  const handleFieldChange = (field, value) => {
    if (!isEditMode) return;
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

  const showToast = (message, variant = "success") => {
    setToast({
      open: true,
      variant,
      message,
    });
  };

  const { isSaving, tryLock, unlock, saveDraft, publish, closeAudit } =
    useAuditPersistence({
      audit,
      checkpoints,
      onError: (message) => showToast(message, "error"),
    });

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

  const handleSaveDraft = async () => {
    if (!isEditMode) return;
    if (!tryLock()) return;
    try {
      const details = await validateAuditDetailsForDraft(audit);
      if (!details.ok) {
        setFieldErrors(details.errors || {});
        setSearchParams(buildSearchParams({ mode, tab: TAB_DETAILS }));
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
    if (!isEditMode) return;
    if (!tryLock()) return;
    try {
      const result = await validateAuditPublishFull(audit, checkpoints);
      if (!result.ok) {
        setFieldErrors(result.detailErrors || {});
        setCheckpointErrors(result.checkpointErrors || {});

        const focusTab = resolvePublishFocusTab(result);
        setSearchParams(
          buildSearchParams({
            mode,
            tab:
              focusTab === TAB_CHECKPOINTS ? TAB_CHECKPOINTS : TAB_DETAILS,
          }),
        );
        return;
      }
      setFieldErrors({});
      setCheckpointErrors({});
      const success = await publish({ externalLock: true });
      if (success) {
        showToast("Audit published successfully.");
      }
    } finally {
      unlock();
    }
  };

  /**
   * Row delete must also be reflected in the backend, not just the UI —
   * reuses the existing saveDraft/publish functions with the row already
   * removed from the payload, and keeps the user on the checkpoints page.
   */
  const handleDeleteCheckpoint = async (nextCheckpoints, action) => {
    if (!isEditMode) return false;
    if (!tryLock()) return false;
    try {
      if (action === "publish") {
        const result = await validateAuditPublishFull(audit, nextCheckpoints);
        if (!result.ok) {
          setFieldErrors(result.detailErrors || {});
          setCheckpointErrors(result.checkpointErrors || {});
          const focusTab = resolvePublishFocusTab(result);
          setSearchParams(
            buildSearchParams({
              mode,
              tab: focusTab === TAB_CHECKPOINTS ? TAB_CHECKPOINTS : TAB_DETAILS,
            }),
          );
          return false;
        }
        setFieldErrors({});
        setCheckpointErrors({});
        const success = await publish({
          externalLock: true,
          skipNavigate: true,
          checkpoints: nextCheckpoints,
        });
        if (success) {
          setCheckpoints(nextCheckpoints);
          showToast("Audit published successfully.");
        }
        return success;
      }

      const details = await validateAuditDetailsForDraft(audit);
      if (!details.ok) {
        setFieldErrors(details.errors || {});
        setSearchParams(buildSearchParams({ mode, tab: TAB_DETAILS }));
        return false;
      }
      setFieldErrors({});
      const success = await saveDraft({
        externalLock: true,
        skipNavigate: true,
        checkpoints: nextCheckpoints,
      });
      if (success) {
        setCheckpoints(nextCheckpoints);
        showToast("Audit saved as draft.");
      }
      return success;
    } finally {
      unlock();
    }
  };

  const handleClose = async () => {
    if (!isEditMode) return;
    if (!tryLock()) return;
    try {
      const success = await closeAudit({ externalLock: true });
      if (success) {
        showToast("Audit marked as closed.");
      }
    } finally {
      unlock();
    }
  };

  /** Next only switches tabs — validation runs on Save as Draft / Publish. */
  const handleNext = () => {
    setSearchParams(buildSearchParams({ mode, tab: TAB_CHECKPOINTS }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm">Loading audit details...</span>
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-full bg-gray-100">
        <div className="w-full py-6 md:py-8">
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <p className="text-gray-700">{error || "Audit not found."}</p>
            <Link
              to="/audit/dashboard"
              className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:underline"
            >
              Back to Audit Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-100 font-sans">
      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />

      <div className="w-full py-6 md:py-8">
        {activeTab === TAB_DETAILS ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/audit/dashboard")}
                className={backButtonClass}
              >
                <ChevronLeft className="size-6 shrink-0" strokeWidth={2} />
                Back
              </button>
              <h1 className="text-2xl font-semibold tracking-[-0.48px] text-[#1e1e1e]">
                {isEditMode ? "Edit Audit" : "Audit Details"}
              </h1>
            </div>
            {isEditMode ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className={detailsDraftButtonClass}
                >
                  {isSaving ? "Saving..." : "Save as Draft"}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isSaving}
                  className={detailsNextButtonClass}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <TabsList className="flex h-[68px] w-full items-end justify-start gap-2 rounded-none bg-transparent px-6 p-0">
              <TabsTrigger
                value={TAB_DETAILS}
                className="rounded-none border-b-4 border-transparent px-3 pb-3 pt-2 text-lg font-medium text-[#757575] shadow-none data-[state=active]:border-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:text-[#2563eb] data-[state=active]:shadow-none"
              >
                Audit Details
              </TabsTrigger>
              <TabsTrigger
                value={TAB_CHECKPOINTS}
                className="rounded-none border-b-4 border-transparent px-3 pb-3 pt-2 text-lg font-medium text-[#757575] shadow-none data-[state=active]:border-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:text-[#2563eb] data-[state=active]:shadow-none"
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
                readOnly={!isEditMode}
                fieldErrors={fieldErrors}
              />
            </div>
          </TabsContent>

          <TabsContent value={TAB_CHECKPOINTS} className="mt-0 focus-visible:outline-none">
            <AuditCheckpointsTable
              auditId={audit.id}
              audit={audit}
              checkpoints={checkpoints}
              onCheckpointsChange={setCheckpoints}
              isSaving={isSaving}
              showHeader
              readOnly={!isEditMode}
              viewerRole={viewerRole}
              rowErrors={checkpointErrors}
              onClearRowFieldError={clearCheckpointFieldError}
              onBack={() => navigate("/audit/dashboard")}
              onToast={showToast}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              onMarkAsClosed={handleClose}
              onDeleteCheckpoint={handleDeleteCheckpoint}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
