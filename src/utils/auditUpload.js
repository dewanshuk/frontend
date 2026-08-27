import {
  uploadAuditFiles,
  uploadCheckpointFiles,
} from "@/api/audit";

/**
 * Multipart upload helpers aligned with:
 *   POST /api/audit/audits/:slug/upload
 *   POST /api/audit/audits/:slug/checkpoints/:checkpoint_id/upload
 *
 * Returns relative `filePath` values for publish/draft payloads.
 */

const extractUploadedPaths = (responseData = {}) => {
  const body = responseData?.data ?? responseData;
  const files = Array.isArray(body?.files)
    ? body.files
    : Array.isArray(body)
      ? body
      : [];

  return files
    .map((entry) => {
      if (!entry) return "";
      if (typeof entry === "string") return entry.trim();
      return String(
        entry.filePath ??
          entry.file_path ??
          entry.blobPath ??
          entry.blob_path ??
          "",
      ).trim();
    })
    .filter(Boolean);
};

export const uploadPendingAuditFiles = async ({ slug, reports = [] }) => {
  const pending = (reports || [])
    .map((report) => report?.file)
    .filter((file) => file instanceof File);

  if (!slug || pending.length === 0) return [];

  const response = await uploadAuditFiles(slug, pending);
  return extractUploadedPaths(response);
};

export const uploadPendingCheckpointFiles = async ({
  slug,
  checkpoints = [],
}) => {
  const uploadedByCheckpoint = {};

  for (const checkpoint of checkpoints) {
    const checkpointId = checkpoint.checkpoint_id || checkpoint.id;
    if (!checkpointId || !slug) continue;

    const pending = (checkpoint.reference_files || [])
      .map((fileItem) => fileItem?.file)
      .filter((file) => file instanceof File);

    if (pending.length === 0) continue;

    const response = await uploadCheckpointFiles(slug, checkpointId, pending);
    uploadedByCheckpoint[checkpointId] = extractUploadedPaths(response);
  }

  return uploadedByCheckpoint;
};
