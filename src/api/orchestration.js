import axios from "axios";
import { docEventsApi, docEventsApiGet } from "./axiosInstance";
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from "../constant";

export const getOrchestrationConfig = async () => {
  const response = await docEventsApiGet("/api/doc-events/references");
  return response.data;
};

export const getOrchestrationLinkedOptions = async ({ 
  document_type, types, 
  search, page = 1, page_size = 20, 
  exclude_id, is_bulk = false
}) => {
  const query = { page, page_size, is_bulk };
  // `types` (array) takes precedence; fall back to single `document_type` for backward compat
  if (types?.length > 0) {
    query.types = types;
  } else if (document_type) {
    query.document_type = document_type;
  }
  if (search && search.length >= 3) query.search = search;
  if (exclude_id != null) query.exclude_id = exclude_id;
  const response = await docEventsApiGet("/api/doc-events/documents/linked-options", { query });
  return response.data;
};

export const storeOrchestrationDocument = async ({ data, files }) => {
  try {
    const formData = new FormData();

    // Append normal fields
    formData.append("data", JSON.stringify(data));

    // Append files array
    (files || []).forEach((file) => {
      if (!(file instanceof Blob)) {
        return;
      }
      formData.append("files", file);
    });

    const response = await docEventsApi.post(
      "/api/doc-events/documents",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updateOrchestrationDocument = async ({ id, data, files }) => {
  try {
    const formData = new FormData();

    const selected_file_ids = [];
    (files || []).forEach((file) => {
      if (!(file instanceof Blob)) {
        selected_file_ids.push(file.id);
        return;
      }
      formData.append("files", file);
    });

    data.selected_file_ids = selected_file_ids;
    formData.append("data", JSON.stringify(data));

    const response = await docEventsApi.put(
      `/api/doc-events/documents/${encodeURIComponent(id)}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getFileExtension = (fileName = "") =>
  String(fileName)
    .substring(String(fileName).lastIndexOf("."))
    .toLowerCase();

const inferEventFileType = (fileName = "", fileType = "") => {
  if (fileType) {
    return String(fileType).toUpperCase();
  }

  const fileExtension = getFileExtension(fileName);
  if (IMAGE_EXTENSIONS.includes(fileExtension)) {
    return "IMAGE";
  }

  if (VIDEO_EXTENSIONS.includes(fileExtension)) {
    return "VIDEO";
  }

  return "";
};

const extractBlobPathFromUrl = (fileUrl) => {
  if (!fileUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(fileUrl);
    return decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));
  } catch (error) {
    return null;
  }
};

const isUploadableThumbnail = (thumbnail) =>
  thumbnail instanceof Blob && !thumbnail?.__existing;

/** 0 while creating; the real id on edit so files land under the same event. */
const resolveUploadEventId = (eventId) => {
  if (eventId === undefined || eventId === null || eventId === "") return 0;
  const numericEventId = Number(eventId);
  return Number.isFinite(numericEventId) ? numericEventId : eventId;
};

const requestEventUploadTarget = async (eventId) => {
  const response = await docEventsApi.post("/api/doc-events/events/upload-url", {
    event_id: resolveUploadEventId(eventId),
  });
  return response?.data?.data || {};
};

/** Blob path saved with the event, e.g. "ecp/events/event-<slug>/" + "photo.jpg". */
const joinPayloadPath = (payloadBasePath, relativePath) => {
  const base = String(payloadBasePath || "")
    .trim()
    .replace(/\/+$/, "");
  return base ? `${base}/${relativePath}` : relativePath;
};

/** sas_token may already start with "?" — keep the URL valid either way. */
const withSasToken = (url, sasToken) => {
  const query = String(sasToken || "")
    .trim()
    .replace(/^\?+/, "");
  return query ? `${url}?${query}` : url;
};

/** VAPT: scan the uploaded blobs. Returns only the names the scanner rejected. */
const verifyUploadedEventFiles = async (slug, fileNames = []) => {
  if (!slug || fileNames.length === 0) return [];

  const response = await docEventsApi.post(
    "/api/doc-events/events/verify",
    fileNames,
    { params: { slug_field: slug } },
  );

  const failed = response?.data?.data?.failed;
  return Array.isArray(failed) ? failed.filter(Boolean) : [];
};

/**
 * Thrown when at least one uploaded file fails VAPT. Carries `failedFiles` and
 * `fileMetadata` for the remaining valid files so the UI can offer
 * "proceed without invalid files" without re-uploading.
 */
export class EventFileVerificationError extends Error {
  constructor(failedFiles = [], fileMetadata = []) {
    const names = failedFiles.join(", ");
    super(
      `Verification failed for ${names}. Do you want to proceed without invalid files?`,
    );
    this.name = "EventFileVerificationError";
    this.failedFiles = failedFiles;
    this.fileMetadata = fileMetadata;
  }
}

const basenamesMatch = (candidate, failedEntry) => {
  const left = String(candidate || "").trim();
  const right = String(failedEntry || "").trim();
  if (!left || !right) return false;
  if (left === right) return true;
  return left.endsWith(`/${right}`) || right.endsWith(`/${left}`);
};

const isFailedName = (name, failedFiles = []) =>
  failedFiles.some((failed) => basenamesMatch(name, failed));

/** Drop fully failed files; clear thumbnail paths when only the thumbnail failed. */
const applyVerificationFailures = (fileMetadata = [], failedFiles = []) => {
  if (!failedFiles.length) return fileMetadata;

  return fileMetadata
    .map((meta) => {
      if (isFailedName(meta?.original_filename, failedFiles)) {
        return null;
      }

      const thumbnailName =
        meta?.__replacementThumbnail?.name ||
        String(meta?.thumbnail_blob_path || "")
          .split("/")
          .pop();
      const thumbnailRelative = thumbnailName
        ? `thumbnails/${thumbnailName}`
        : "";

      if (
        isFailedName(thumbnailRelative, failedFiles) ||
        isFailedName(thumbnailName, failedFiles) ||
        isFailedName(meta?.thumbnail_blob_path, failedFiles)
      ) {
        return {
          ...meta,
          thumbnail_blob_path: null,
          thumbnail_size_bytes: 0,
          __replacementThumbnail: undefined,
        };
      }

      return meta;
    })
    .filter(Boolean)
    .map((meta, index) => ({ ...meta, sort_order: index }));
};

const normalizeExistingEventFiles = (files = [], startIndex = 0) =>
  files
    .filter((fileItem) => !(fileItem?.file instanceof Blob))
    .map((fileItem, index) => {
      const originalFilename =
        fileItem?.original_filename ||
        fileItem?.name ||
        fileItem?.file?.name ||
        "";

      const replacementThumbnail = isUploadableThumbnail(fileItem?.thumbnail)
        ? fileItem.thumbnail
        : null;

      return {
        id: fileItem?.id ?? null,
        original_filename: originalFilename,
        blob_path:
          fileItem?.blob_path || extractBlobPathFromUrl(fileItem?.file_url),
        file_type: inferEventFileType(
          originalFilename,
          fileItem?.file_type || fileItem?.file?.type,
        ),
        file_size_bytes: fileItem?.file_size_bytes ?? fileItem?.file_size ?? 0,
        caption: fileItem?.caption || "",
        description: fileItem?.description || "",
        // Prefer paths set after a replacement thumbnail upload; otherwise keep existing.
        thumbnail_blob_path:
          fileItem?.thumbnail_blob_path ||
          extractBlobPathFromUrl(fileItem?.thumbnail_url) ||
          null,
        thumbnail_size_bytes: replacementThumbnail
          ? replacementThumbnail.size || 0
          : (fileItem?.thumbnail_size_bytes ?? 0),
        sort_order: startIndex + index,
        // Stash for uploadReplacementThumbnails — stripped before API payload
        __replacementThumbnail: replacementThumbnail || undefined,
      };
    });

/** Upload new thumbnails for existing videos (edit flow) without re-uploading the video. */
const uploadReplacementThumbnails = async (existingFileMeta = [], eventId) => {
  const replacements = existingFileMeta.filter((meta) =>
    isUploadableThumbnail(meta?.__replacementThumbnail),
  );

  if (replacements.length === 0) {
    return {
      fileMetadata: existingFileMeta.map(
        ({ __replacementThumbnail, ...meta }) => meta,
      ),
      failedFiles: [],
    };
  }

  const { slug, base_url, sas_token, payload_base_path } =
    await requestEventUploadTarget(eventId);
  if (!slug || !base_url) {
    throw new Error("Unable to get upload URL for thumbnail replacement.");
  }

  const uploadedNames = [];

  await Promise.all(
    replacements.map(async (meta) => {
      const thumbnail = meta.__replacementThumbnail;
      const thumbnailPath = joinPayloadPath(
        payload_base_path,
        `thumbnails/${thumbnail.name}`,
      );
      const thumbnailUploadUrl = withSasToken(
        `${base_url}/thumbnails/${thumbnail.name}`,
        sas_token,
      );

      await axios.put(thumbnailUploadUrl, thumbnail, {
        headers: {
          "x-ms-blob-type": "BlockBlob",
          ...(thumbnail.type ? { "Content-Type": thumbnail.type } : {}),
        },
      });

      uploadedNames.push(`thumbnails/${thumbnail.name}`);
      meta.thumbnail_blob_path = thumbnailPath;
      meta.thumbnail_size_bytes = thumbnail.size || 0;
    }),
  );

  const failedFiles = await verifyUploadedEventFiles(slug, uploadedNames);
  const cleaned = applyVerificationFailures(existingFileMeta, failedFiles).map(
    ({ __replacementThumbnail, ...meta }) => meta,
  );

  return { fileMetadata: cleaned, failedFiles };
};

const createFilesSlugStoreFiles = async (files, startIndex = 0, eventId) => {
  const { slug, base_url, sas_token, payload_base_path } =
    await requestEventUploadTarget(eventId);

  const fileMetadata = [];
  const uploadPromises = [];
  const uploadedNames = [];

  files.forEach(({ file, caption, description, thumbnail }, index) => {
    const uploadUrl = withSasToken(`${base_url}/${file.name}`, sas_token);
    uploadedNames.push(file.name);

    let thumbnailPath = null;
    let thumbnailSizeBytes = 0;
    if (isUploadableThumbnail(thumbnail)) {
      thumbnailPath = joinPayloadPath(
        payload_base_path,
        `thumbnails/${thumbnail.name}`,
      );
      thumbnailSizeBytes = thumbnail.size || 0;
      uploadedNames.push(`thumbnails/${thumbnail.name}`);
      // base_url already includes the event slug — same pattern as the main file upload
      const thumbnailUploadUrl = withSasToken(
        `${base_url}/thumbnails/${thumbnail.name}`,
        sas_token,
      );
      uploadPromises.push(
        axios.put(thumbnailUploadUrl, thumbnail, {
          headers: {
            "x-ms-blob-type": "BlockBlob",
            ...(thumbnail.type ? { "Content-Type": thumbnail.type } : {}),
          },
        }),
      );
    }

    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    fileMetadata.push({
      id: null,
      original_filename: file.name,
      blob_path: joinPayloadPath(payload_base_path, file.name),
      file_type: IMAGE_EXTENSIONS.includes(fileExtension)
        ? "IMAGE"
        : VIDEO_EXTENSIONS.includes(fileExtension)
          ? "VIDEO"
          : "",
      file_size_bytes: file.size,
      caption,
      description,
      thumbnail_blob_path: thumbnailPath,
      thumbnail_size_bytes: thumbnailSizeBytes,
      sort_order: startIndex + index,
    });

    uploadPromises.push(
      axios.put(uploadUrl, file, {
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type,
        },
      }),
    );
  });

  try {
    await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Error uploading files:", error);
    throw error;
  }

  const failedFiles = await verifyUploadedEventFiles(slug, uploadedNames);
  const cleaned = applyVerificationFailures(fileMetadata, failedFiles);

  return { fileMetadata: cleaned, failedFiles };
};

const buildEventFileMetadata = async (files = [], eventId) => {
  const existingFiles = files.filter((f) => !(f?.file instanceof Blob));
  const uploadableFiles = files.filter((f) => f?.file instanceof Blob);

  let existingFileMeta = normalizeExistingEventFiles(existingFiles);
  let failedFiles = [];

  const replacementResult = await uploadReplacementThumbnails(
    existingFileMeta,
    eventId,
  );
  existingFileMeta = replacementResult.fileMetadata;
  failedFiles = failedFiles.concat(replacementResult.failedFiles || []);

  let newFileMeta = [];
  if (uploadableFiles.length > 0) {
    const uploadResult = await createFilesSlugStoreFiles(
      uploadableFiles,
      existingFileMeta.length,
      eventId,
    );
    newFileMeta = uploadResult.fileMetadata;
    failedFiles = failedFiles.concat(uploadResult.failedFiles || []);
  }

  const fileMetadata = [...existingFileMeta, ...newFileMeta].map(
    (meta, index) => ({ ...meta, sort_order: index }),
  );

  if (failedFiles.length > 0) {
    throw new EventFileVerificationError(failedFiles, fileMetadata);
  }

  return fileMetadata;
};

export const storeOrchestrationEvent = async ({
  data,
  files = [],
  file_metadata: providedFileMetadata,
}) => {
  try {
    const file_metadata =
      providedFileMetadata ?? (await buildEventFileMetadata(files));

    const payload = {
      ...data,
      ...(file_metadata.length > 0 && { file_metadata }),
    };

    const response = await docEventsApi.post(
      "/api/doc-events/events",
      payload
    );

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updateOrchestrationEvent = async ({
  id,
  data,
  files = [],
  file_metadata: providedFileMetadata,
}) => {
  try {
    const file_metadata =
      providedFileMetadata ?? (await buildEventFileMetadata(files, id));

    const payload = {
      ...data,
      ...(file_metadata.length > 0 && { file_metadata }),
    };

    const response = await docEventsApi.put(
      `/api/doc-events/events/${encodeURIComponent(id)}`,
      payload,
    );

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getOrchestrationItems = async (data) => {
  const response = await docEventsApi.post("/api/doc-events/items", data);
  return response.data;
};

export const toggleOrchestrationItemStatus = async ({
  id,
  item_type = "event",
  deactivate_remarks,
}) => {
  const normalizedItemType =
    typeof item_type === "string" && item_type.trim().length > 0
      ? item_type.trim().toLowerCase()
      : "event";

  const resource = normalizedItemType === "event" ? "events" : "documents";
  const payload = {};

  if (typeof deactivate_remarks === "string" && deactivate_remarks.trim().length > 0) {
    payload.deactivate_remarks = deactivate_remarks.trim();
  }
  const response = await docEventsApi.patch(
    `/api/doc-events/${resource}/${encodeURIComponent(id)}/toggle-status`,
    payload,
  );

  return response.data;
};

export const getOrchestrationKPIs = async (data) => {
  const response = await docEventsApi.get("/api/doc-events/items/kpi", { params: data || {} });
  return response.data;
}

export const getOrchestrationItemDetail = async ({ item_id, item_type }) => {
  const response = await docEventsApiGet(
    `/api/doc-events/items/${encodeURIComponent(item_id)}`,
    { query: { item_type } },
  );
  return response.data;
};

export const getItemRevisions = async ({ item_id, item_type }) => {
  const response = await docEventsApiGet(
    `/api/doc-events/items/${encodeURIComponent(item_id)}/revisions`,
    { query: { item_type } },
  );
  return response.data;
};

export const getItemRevisionSnapshot = async ({ item_id, revision_number, item_type }) => {
  const response = await docEventsApiGet(
    `/api/doc-events/items/${encodeURIComponent(item_id)}/revisions/${encodeURIComponent(revision_number)}`,
    { query: { item_type } },
  );
  return response.data;
};

// ── Bulk Applicability ────────────────────────────────────────────────────────

export const exportOrchestrationItems = async (payload) => {
  const response = await docEventsApi.post(
    "/api/doc-events/items/export",
    payload,
    { responseType: "blob" },
  );
  return response;
};

export const downloadBulkApplicabilityTemplate = async (payload) => {
  const response = await docEventsApi.post(
    "/api/doc-events/bulk-applicability/download-template",
    payload,
    { responseType: "blob" },
  );
  return response;
};

export const uploadBulkApplicabilityFile = async ({
  file,
  selected_types,
  change_remarks,
  force_start = false,
}) => {
  const formData = new FormData();
  formData.append("file", file);
  if (selected_types) formData.append("selected_types", selected_types);
  if (change_remarks) formData.append("change_remarks", change_remarks);
  formData.append("force_start", String(force_start));

  const response = await docEventsApi.post(
    "/api/doc-events/bulk-applicability/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

export const getBulkApplicabilityHistory = async ({ page = 1, page_size = 10, request_id } = {}) => {
  const response = await docEventsApiGet("/api/doc-events/bulk-applicability/history", {
    query: { page, page_size, ...(request_id != null && { request_id }) },
  });
  return response.data;
};

// curl 'http://localhost:3005/upload' \
//   -H 'sec-ch-ua-platform: "Windows"' \
//   -H 'Referer: http://localhost:5173/' \
//   -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
//   -H 'Accept: application/json, text/plain, */*' \
//   -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
//   -H 'Content-Type: multipart/form-data; boundary=----WebKitFormBoundary5hHWk6U4HH7a7noz' \
//   -H 'sec-ch-ua-mobile: ?0' \
//   --data-raw $'------WebKitFormBoundary5hHWk6U4HH7a7noz\r\nContent-Disposition: form-data; name="data"\r\n\r\n{"name":"Karab","document_type":"Policy","legislation_id":"","sub_legislation_id":"","version":"","next_review_date":"","summary":"kjikj","tags":[],"download_allowed":true,"files":[{},{},{},{}],"linked_document_ids":[81],"applicability_type":"DIVISION","applicability_refs":{"divisions":["Corporate"],"designations":["AM"],"emails":[]}}\r\n------WebKitFormBoundary5hHWk6U4HH7a7noz\r\nContent-Disposition: form-data; name="files[]"; filename="Screenshot 2025-09-10 111352.png"\r\nContent-Type: image/png\r\n\r\n\r\n------WebKitFormBoundary5hHWk6U4HH7a7noz\r\nContent-Disposition: form-data; name="files[]"; filename="Screenshot 2025-09-20 235839.png"\r\nContent-Type: image/png\r\n\r\n\r\n------WebKitFormBoundary5hHWk6U4HH7a7noz\r\nContent-Disposition: form-data; name="files[]"; filename="Screenshot 2025-09-21 000008.png"\r\nContent-Type: image/png\r\n\r\n\r\n------WebKitFormBoundary5hHWk6U4HH7a7noz\r\nContent-Disposition: form-data; name="files[]"; filename="Screenshot 2025-11-07 231139.png"\r\nContent-Type: image/png\r\n\r\n\r\n------WebKitFormBoundary5hHWk6U4HH7a7noz--\r\n'
