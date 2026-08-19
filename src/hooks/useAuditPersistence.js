import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { closeAudit, publishAudit, saveAuditDraft } from "@/api/audit";
import {
  applyUploadedFilesToPayload,
  buildAuditDraftPayload,
  buildAuditPublishPayload,
  formatAuditApiDate,
  getPopulatedCheckpoints,
  resolveAuditApiId,
} from "@/utils/auditHelpers";
import {
  uploadPendingAuditFiles,
  uploadPendingCheckpointFiles,
} from "@/utils/auditUpload";

/**
 * Draft / publish / close for audit create + edit.
 * `isSaving` + a synchronous ref lock prevent double-submit while the API runs.
 */
export function useAuditPersistence({ audit, checkpoints, onError }) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  /** Sync guard — React state alone is too late for double-clicks. */
  const busyRef = useRef(false);

  const tryLock = useCallback(() => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setIsSaving(true);
    return true;
  }, []);

  const unlock = useCallback(() => {
    busyRef.current = false;
    setIsSaving(false);
  }, []);

  const persistAudit = useCallback(
    async (action, options = {}) => {
      const { externalLock = false } = options;
      if (!audit) return false;

      // When the page already holds the lock (validation + persist), skip re-lock.
      if (!externalLock) {
        if (!tryLock()) return false;
      } else if (!busyRef.current) {
        // Caller claimed externalLock but did not acquire — take lock here.
        if (!tryLock()) return false;
      }

      try {
        const populatedCheckpoints = getPopulatedCheckpoints(checkpoints);

        // Publish requires at least one populated checkpoint (UI validates first).
        if (action === "publish" && populatedCheckpoints.length === 0) {
          return false;
        }

        const auditId = resolveAuditApiId(audit.id ?? audit.audit_id);

        const uploadedAuditFiles = await uploadPendingAuditFiles({
          auditId,
          reports: audit.reports,
        });
        const uploadedCheckpointFiles = await uploadPendingCheckpointFiles({
          auditId,
          checkpoints: populatedCheckpoints,
        });

        if (action === "close") {
          const closedOn = formatAuditApiDate(options?.closureDate);
          const body = closedOn ? { closure_date: closedOn } : {};
          await closeAudit(auditId, body);
          navigate("/audit/dashboard");
          return true;
        }

        const basePayload =
          action === "publish"
            ? buildAuditPublishPayload(
                audit,
                populatedCheckpoints,
                audit.status || "Draft",
              )
            : buildAuditDraftPayload(audit, populatedCheckpoints);

        const payload = applyUploadedFilesToPayload(
          basePayload,
          uploadedAuditFiles,
          uploadedCheckpointFiles,
        );

        if (action === "publish") {
          await publishAudit(auditId, payload);
        } else {
          await saveAuditDraft(auditId, payload);
        }

        navigate("/audit/dashboard");
        return true;
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          "Failed to save audit.";
        onError?.(message);
        return false;
      } finally {
        if (!externalLock) {
          unlock();
        }
      }
    },
    [audit, checkpoints, navigate, onError, tryLock, unlock],
  );

  return {
    isSaving,
    /** Acquire exclusive persist lock (sync). Returns false if already busy. */
    tryLock,
    /** Release exclusive persist lock. */
    unlock,
    saveDraft: (options) => persistAudit("draft", options),
    publish: (options) => persistAudit("publish", options),
    closeAudit: (options) => persistAudit("close", options),
  };
}
