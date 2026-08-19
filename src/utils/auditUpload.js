import axios from "axios";
import { generateAuditUploadUrl } from "@/api/audit";
import { resolveAuditApiId } from "@/utils/auditHelpers";

/**
 * Build Azure FD / blob PUT URL from generate-upload-url response:
 *   afdUploadUrl + "/" + basePath [+ "/" + fileName] + (token ? "?" + token : "")
 *
 * Example:
 *   afdUploadUrl = "https://….azurefd.net"
 *   basePath     = "ecp/audits/audit_000003"
 *   token        = ""  →  https://….azurefd.net/ecp/audits/audit_000003/report.pdf
 *   token        = "sv=…&sig=…"  →  same path + ?sv=…&sig=…
 */
export const buildSasUploadUrl = (
  afdUploadUrl,
  basePath,
  token = "",
  fileName = "",
) => {
  const host = String(afdUploadUrl || "")
    .trim()
    .replace(/\/+$/, "");
  if (!host) return "";

  const path = String(basePath || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  const name = String(fileName || "")
    .trim()
    .replace(/^\/+/, "");

  const pathParts = [path, name].filter(Boolean);
  let url = pathParts.length ? `${host}/${pathParts.join("/")}` : host;

  const rawToken = String(token ?? "").trim();
  if (rawToken) {
    // Token may be a full SAS query ("sv=…&sig=…") or already start with "?"
    const query = rawToken.replace(/^\?/, "").replace(/^=/, "");
    if (query) {
      url += `?${query}`;
    }
  }

  return url;
};

const extractUploadTarget = (responseData = {}) => {
  // generate-upload-url may return fields at root or nested under data
  const body = responseData?.data ?? responseData;
  const nested =
    body && typeof body === "object" && !Array.isArray(body) ? body : {};

  return {
    afdUploadUrl: String(
      nested.afdUploadUrl ??
        nested.afd_upload_url ??
        nested.uploadUrl ??
        nested.upload_url ??
        "",
    ).trim(),
    basePath: String(
      nested.basePath ?? nested.base_path ?? nested.blobPath ?? nested.blob_path ?? "",
    ).trim(),
    token: String(
      nested.token ?? nested.sasToken ?? nested.sas_token ?? "",
    ).trim(),
  };
};

/** Relative blob path stored with the audit (no CDN host). */
const buildRelativeBlobPath = (basePath, fileName, { checkpointId } = {}) => {
  const base = String(basePath || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  const name = String(fileName || "").trim();
  if (!base) return name;
  if (checkpointId) {
    return `${base}/checkpoints/${checkpointId}/${name}`;
  }
  return `${base}/${name}`;
};

export const uploadAuditBlobFile = async ({
  auditId,
  file,
  checkpointId = null,
}) => {
  if (!(file instanceof File)) {
    throw new Error("A valid file is required for upload.");
  }

  const apiAuditId = resolveAuditApiId(auditId);
  const response = await generateAuditUploadUrl(apiAuditId);
  const { afdUploadUrl, basePath, token } = extractUploadTarget(response);

  if (!afdUploadUrl) {
    throw new Error("Upload URL response is missing afdUploadUrl.");
  }
  if (!basePath) {
    throw new Error("Upload URL response is missing basePath.");
  }

  const blobPath = buildRelativeBlobPath(basePath, file.name, { checkpointId });
  // PUT target: afdUploadUrl + '/' + basePath [+ checkpoint segment] + '/' + fileName + ?token
  const uploadUrl = buildSasUploadUrl(
    afdUploadUrl,
    // For reference files, nest under checkpoints/<id> within the same basePath root
    checkpointId
      ? `${basePath.replace(/\/+$/, "")}/checkpoints/${checkpointId}`
      : basePath,
    token,
    file.name,
  );

  if (!uploadUrl) {
    throw new Error("Unable to build upload URL from API response.");
  }

  await axios.put(uploadUrl, file, {
    headers: {
      "x-ms-blob-type": "BlockBlob",
      ...(file.type ? { "Content-Type": file.type } : {}),
    },
  });

  return {
    fileName: file.name,
    blobPath,
  };
};

export const uploadPendingAuditFiles = async ({ auditId, reports = [] }) => {
  const uploaded = [];
  for (const report of reports) {
    if (!(report?.file instanceof File)) continue;
    const result = await uploadAuditBlobFile({
      auditId,
      file: report.file,
    });
    uploaded.push(result.fileName);
  }
  return uploaded;
};

export const uploadPendingCheckpointFiles = async ({
  auditId,
  checkpoints = [],
}) => {
  const uploadedByCheckpoint = {};

  for (const checkpoint of checkpoints) {
    const checkpointId = checkpoint.checkpoint_id || checkpoint.id;
    if (!checkpointId) continue;

    const pending = (checkpoint.reference_files || []).filter(
      (fileItem) => fileItem?.file instanceof File,
    );

    if (pending.length === 0) continue;

    uploadedByCheckpoint[checkpointId] = [];
    for (const fileItem of pending) {
      const result = await uploadAuditBlobFile({
        auditId,
        file: fileItem.file,
        checkpointId,
      });
      uploadedByCheckpoint[checkpointId].push(result.fileName);
    }
  }

  return uploadedByCheckpoint;
};
