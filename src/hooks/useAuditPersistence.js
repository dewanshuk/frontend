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
      const {
        externalLock = false,
        // Explicit checkpoints list to persist instead of the hook's current
        // `checkpoints` state — lets a caller (e.g. row delete) save/publish
        // a payload that reflects an edit not yet committed to that state.
        checkpoints: checkpointsOverride,
        // Skip the post-success dashboard redirect (e.g. row delete should
        // keep the user on the checkpoints page).
        skipNavigate = false,
      } = options;
      if (!audit) return false;

      // When the page already holds the lock (validation + persist), skip re-lock.
      if (!externalLock) {
        if (!tryLock()) return false;
      } else if (!busyRef.current) {
        // Caller claimed externalLock but did not acquire — take lock here.
        if (!tryLock()) return false;
      }

      try {
        const populatedCheckpoints = getPopulatedCheckpoints(
          checkpointsOverride ?? checkpoints,
        );

        // Publish requires at least one populated checkpoint (UI validates first).
        if (action === "publish" && populatedCheckpoints.length === 0) {
          return false;
        }

        const slug = String(
          audit.slug ?? audit.id ?? audit.audit_id ?? "",
        ).trim();
        const pkId = String(audit.pk_id ?? audit.pkId ?? "").trim() || null;

        const uploadedAuditFiles = await uploadPendingAuditFiles({
          slug,
          reports: audit.reports,
        });
        const uploadedCheckpointFiles = await uploadPendingCheckpointFiles({
          slug,
          checkpoints: populatedCheckpoints,
        });

        if (action === "close") {
          // Close requires the published row's pkId
          const closeId = pkId || resolveAuditApiId(audit.id ?? audit.audit_id);
          const closedOn = formatAuditApiDate(options?.closureDate);
          const body = closedOn ? { closure_date: closedOn } : {};
          await closeAudit(closeId, body);
          if (!skipNavigate) navigate("/audit/dashboard");
          return true;
        }

        const basePayload =
          action === "publish"
            ? buildAuditPublishPayload(
                { ...audit, slug },
                populatedCheckpoints,
                audit.status || "Draft",
              )
            : buildAuditDraftPayload(
                { ...audit, slug },
                populatedCheckpoints,
              );

        const payload = applyUploadedFilesToPayload(
          basePayload,
          uploadedAuditFiles,
          uploadedCheckpointFiles,
        );

        if (action === "publish") {
          await publishAudit(slug, payload, { pkId });
        } else {
          await saveAuditDraft(slug, payload, { pkId });
        }

        if (!skipNavigate) navigate("/audit/dashboard");
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
