import moment from "moment";
import { DATE_FORMAT_MOMENT, MOCK_AUDIT_AS_AUDITOR } from "@/config";

export const MAX_CHECKPOINT_FILES = 2;

/** Max characters for checkpoint description and judgment criteria fields. */
export const MAX_CHECKPOINT_TEXT_LENGTH = 1000;

/**
 * True when a checkpoint is In-Progress and must not be free-edited
 * (fields, attach, delete, duplicate). Respond / History / Close still allowed.
 */
export const isCheckpointInProgress = (checkpoint) => {
  const raw = String(
    checkpoint?.status ?? checkpoint?.checkpoint_status ?? "",
  )
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
  if (!raw) return false;
  return (
    raw === "in progress" ||
    raw.startsWith("in progress") ||
    raw.includes("in progress")
  );
};

/**
 * Role that owns the next action on a checkpoint, from its `pendingAt` value.
 * Returns null when the API sends a person name or nothing, so callers can
 * fall back to unrestricted behaviour instead of guessing.
 */
export const resolveCheckpointPendingRole = (checkpoint) => {
  const raw = String(checkpoint?.pending_at ?? checkpoint?.pendingAt ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
  if (!raw) return null;
  if (raw.includes("auditee")) return "auditee";
  if (raw.includes("auditor")) return "auditor";
  return null;
};

/**
 * Department is locked after publish (or any non-draft status) once a value exists.
 * Draft audits stay editable even when department is already chosen.
 */
export const isAuditDepartmentLocked = (audit) => {
  const status = String(audit?.status ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
  if (!status || status === "draft") return false;
  const dept = String(
    audit?.vertical_div_deptt ?? audit?.department ?? "",
  ).trim();
  return Boolean(dept);
};

/** Max length sent to ListAudits search after sanitization. */
export const AUDIT_SEARCH_MAX_LENGTH = 100;

/**
 * Sanitize free-text audit search for the backend list API.
 * Trims, collapses whitespace, strips control chars / unsafe symbols.
 */
export const sanitizeAuditSearchQuery = (value) => {
  if (value == null) return "";
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^\w\s\-./()&@+,]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, AUDIT_SEARCH_MAX_LENGTH);
};

const toApiDate = (value) => {
  if (!value) return "";
  const parsed = moment(
    value,
    [
      DATE_FORMAT_MOMENT,
      "DD/MMM/YYYY",
      "DD-MMM-YYYY",
      "YYYY-MM-DD",
      "DD/MM/YYYY",
      moment.ISO_8601,
    ],
    true,
  );
  if (!parsed.isValid()) {
    const fallback = moment(value);
    return fallback.isValid() ? fallback.format("YYYY-MM-DD") : "";
  }
  return parsed.format("YYYY-MM-DD");
};

/** Format a display/filter date as YYYY-MM-DD for ListAudits / dashboard APIs. */
export const formatAuditApiDate = toApiDate;

export const createCheckpointId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const RISK_LEVEL_OPTIONS = ["Low", "Medium", "High"];

export const createEmptyCheckpoint = (serialNo = 1) => {
  const checkpointId = createCheckpointId();
  return {
    checkpoint_id: checkpointId,
    id: checkpointId,
    serial_no: serialNo,
    checkpoint: "",
    judgement_criteria: "",
    risk_level: "",
    planned_closure_date: null,
    reference: null,
    reference_files: [],
    pending_at: "",
    status: "",
    checkpoint_status: "",
    actual_closure_date: null,
    actualClosureDate: null,
    tags: [],
  };
};

export const resolveAuditApiId = (auditId) => {
  const raw = String(auditId ?? "").trim();
  return raw || "0";
};

export const extractStaffId = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const match = text.match(/\(([^)]+)\)/);
  return (match?.[1] || text).trim();
};

export const parseAuditDateRange = (dateRange) => {
  const parts = String(dateRange || "")
    .split(/\s*-\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  const toApi = (value) => {
    if (!value) return "";
    return toApiDate(value);
  };

  return {
    start_date: toApi(parts[0]),
    end_date: toApi(parts[1] || parts[0]),
  };
};

export const formatApiDateForPicker = (value) => {
  if (!value) return null;
  const parsed = moment(
    value,
    [
      "YYYY-MM-DD",
      DATE_FORMAT_MOMENT,
      "DD-MMM-YYYY",
      "DD/MMM/YYYY",
      "DD/MM/YYYY",
      "DD-MMM-YY",
      moment.ISO_8601,
    ],
    true,
  );
  if (!parsed.isValid()) {
    const fallback = moment(value);
    if (!fallback.isValid()) return value;
    return fallback.format(DATE_FORMAT_MOMENT).toUpperCase();
  }
  return parsed.format(DATE_FORMAT_MOMENT).toUpperCase();
};

export const zipFileNamesAndUrls = (names = [], urls = []) =>
  (Array.isArray(names) ? names : [])
    .map((entry, index) => {
      const fileName =
        typeof entry === "string"
          ? entry.trim()
          : String(
              entry?.fileName ??
                entry?.file_name ??
                entry?.originalName ??
                entry?.original_name ??
                entry?.name ??
                "",
            ).trim();
      if (!fileName) return null;

      const urlFromEntry =
        typeof entry === "object" && entry
          ? String(
              
              entry.fileUrl ?? entry.file_url ?? entry.url ?? entry.sasUrl ?? entry.sasUrl ?? "",
            ).trim()
          : "";
      const pathFromEntry =
        typeof entry === "object" && entry
          ? String(
              entry.filePath ??
                entry.file_path ??
                entry.blobPath ??
                entry.blob_path ??
                "",
            
            ).trim()
          : "";


      return {
        file_name: fileName,
        file_path: pathFromEntry || (typeof entry === "string" ? entry : ""),
        file_url: urlFromEntry || urls?.[index] || "",
        isExisting: true,
      };
    })
    .filter(Boolean);

/**
 * Normalize audit report files from get/edit API.
 * Supports:
 * - auditFiles: [{ fileName, fileUrl, uploadedBy, uploadedOn, isPublished }, ...]
 * - legacy parallel arrays auditFiles (names) + auditFileUrls
 * - reports[] already in UI shape
 */
export const mapAuditReportsFromApi = (item = {}) => {
  const files = item.auditFiles ?? item.audit_files ?? null;
  const urls = item.auditFileUrls ?? item.audit_file_urls ?? [];

  if (Array.isArray(files) && files.length > 0) {
    return files
      .map((entry, index) => {
        if (entry == null) return null;

        // Object shape (current API)
        if (typeof entry === "object") {
          const fileName = String(
            entry.fileName ?? entry.file_name ?? entry.name ?? "",
          ).trim();
          if (!fileName) return null;
          const fileUrl = String(
            entry.fileUrl ?? entry.file_url ?? entry.url ?? "",
          ).trim();
          const uploadedBy = String(
            entry.uploadedBy ?? entry.uploaded_by ?? "",
          ).trim();
          const uploadedOnRaw =
            entry.uploadedOn ?? entry.uploaded_on ?? entry.uploadedAt ?? "";
          let uploadedOn = "";
          if (uploadedOnRaw) {
            const m = moment(uploadedOnRaw);
            uploadedOn = m.isValid()
              ? m.format("DD/MMM/YYYY HH:mm").toUpperCase()
              : String(uploadedOnRaw);
          }
          return {
            id:
              entry.id ??
              `audit-file-${index}-${fileName}`,
            file_name: fileName,
            file_path: String(
              entry.filePath ?? entry.file_path ?? entry.blobPath ?? entry.blob_path ?? "",
            ).trim(),
            file_url: fileUrl,
            uploaded_by: uploadedBy,
            uploaded_on: uploadedOn,
            isExisting: true,
            is_published:
              entry.isPublished ?? entry.is_published ?? undefined,
          };
        }

        // Legacy: entry is a filename string; URL from parallel array
        const fileName = String(entry).trim();
        if (!fileName) return null;
        return {
          id: `audit-file-${index}-${fileName}`,
          file_name: fileName,
          file_url: String(urls[index] || "").trim(),
          uploaded_by: "",
          uploaded_on: "",
          isExisting: true,
        };
      })
      .filter(Boolean);
  }

  if (Array.isArray(item.reports) && item.reports.length > 0) {
    return item.reports.map((report, index) => {
      if (!report || typeof report !== "object") return null;
      const fileName = String(
        report.file_name ?? report.fileName ?? report.name ?? "",
      ).trim();
      if (!fileName) return null;
      return {
        id: report.id ?? `audit-file-${index}-${fileName}`,
        file_name: fileName,
        file_url: String(report.file_url ?? report.fileUrl ?? "").trim(),
        uploaded_by: String(
          report.uploaded_by ?? report.uploadedBy ?? "",
        ).trim(),
        uploaded_on: String(
          report.uploaded_on ?? report.uploadedOn ?? "",
        ).trim(),
        isExisting: report.isExisting !== false,
        file: report.file instanceof File ? report.file : undefined,
      };
    }).filter(Boolean);
  }

  return [];
};

export const mapCheckpointFromApi = (cp, index) => {
  const checkpointId = cp.checkpointId ?? cp.checkpoint_id ?? createCheckpointId();
  // Current API sends `fileDetails` objects; older shapes sent `files` (+ parallel urls).
  const fileNames =
    cp.fileDetails ??
    cp.file_details ??
    cp.files ??
    cp.referenceFiles ??
    cp.reference_files ??
    [];
  const fileUrls = cp.fileUrls ?? cp.file_urls ?? [];
  const referenceFiles = zipFileNamesAndUrls(fileNames, fileUrls).map((file, fileIndex) => ({
    ...file,
    id: `cp-file-${checkpointId}-${fileIndex}-${file.file_name}`,
  }));

  return {
    checkpoint_id: checkpointId,
    id: checkpointId,
    serial_no: index + 1,
    checkpoint: cp.checkpoint ?? "",
    judgement_criteria: cp.judgementCriteria ?? cp.judgement_criteria ?? "",
    planned_closure_date: formatApiDateForPicker(
      cp.plannedClosureDate ?? cp.planned_closure_date,
    ),
    // API field is `status` (display label; not a free-text / dropdown write field)
    status: String(cp.status ?? cp.checkpointStatus ?? cp.checkpoint_status ?? "").trim(),
    checkpoint_status: String(
      cp.status ?? cp.checkpointStatus ?? cp.checkpoint_status ?? "",
    ).trim(),
    // API field is `actualClosureDate`
    actual_closure_date: formatApiDateForPicker(
      cp.actualClosureDate ?? cp.actual_closure_date,
    ),
    actualClosureDate: formatApiDateForPicker(
      cp.actualClosureDate ?? cp.actual_closure_date,
    ),
    pending_at: cp.pendingAt ?? cp.pending_at ?? "",
    risk_level: cp.riskLevel ?? cp.risk_level ?? "",
    tags: Array.isArray(cp.tags) ? cp.tags : [],
    reference_files: referenceFiles,
    reference: referenceFiles[0]
      ? { label: referenceFiles[0].file_name, url: referenceFiles[0].file_url || "#" }
      : null,
  };
};

/**
 * Resolve whether current user acts as auditor or auditee for an audit.
 * Prefers explicit viewer_role from audit detail / access API.
 */
export const resolveAuditViewerRole = (audit, user = null) => {
  const explicit = String(
    audit?.viewer_role ||
      audit?.viewerRole ||
      audit?.role ||
      user?.viewer_role ||
      "",
  )
    .trim()
    .toLowerCase();
  if (explicit.includes("auditor")) return "auditor";
  if (explicit.includes("auditee")) return "auditee";

  const staffTokens = [
    user?.employeeId,
    user?.employee_id,
    user?.staffId,
    user?.staff_id,
    user?.id,
    user?.name,
    user?.displayName,
    user?.email,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  const listIncludesUser = (list = []) => {
    const names = (Array.isArray(list) ? list : [list]).filter(Boolean);
    return names.some((entry) => {
      if (entry && typeof entry === "object") {
        const tokens = [
          entry.staff_id,
          entry.staffId,
          entry.id,
          entry.username,
          entry.name,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        return staffTokens.some(
          (token) =>
            token &&
            tokens.some((t) => t === token || t.includes(token) || token.includes(t)),
        );
      }
      const text = String(entry).toLowerCase();
      return staffTokens.some(
        (token) => token && (text.includes(token) || token.includes(text)),
      );
    });
  };

  if (listIncludesUser(audit?.auditors) || listIncludesUser(audit?.auditor)) {
    return "auditor";
  }
  if (listIncludesUser(audit?.auditees) || listIncludesUser(audit?.auditee)) {
    return "auditee";
  }

  // Mock / demo: unlock auditor-only actions when membership is unknown.
  if (MOCK_AUDIT_AS_AUDITOR) return "auditor";
  return "auditee";
};

const getReportFileName = (report) =>
  String(report?.file_name || report?.fileName || report?.name || "").trim();

/** Prefer storage path for payload; fall back to display name. */
const getReportFilePath = (report) =>
  String(
    report?.file_path ||
      report?.filePath ||
      report?.blob_path ||
      report?.blobPath ||
      getReportFileName(report) ||
      "",
  ).trim();

export const splitAuditReportsForPayload = (reports = []) => {
  const existing = [];
  const pending = [];

  reports.forEach((report) => {
    if (report?.file instanceof File) {
      pending.push({
        fileName: getReportFileName(report) || report.file.name,
        file: report.file,
      });
      return;
    }
    const path = getReportFilePath(report);
    if (!path) return;
    if (report?.isExisting !== false) {
      existing.push(path);
    }
  });

  return { existing_audit_files: existing, pendingAuditFiles: pending };
};

export const splitCheckpointFilesForPayload = (checkpoint) => {
  const existing = [];
  const pending = [];
  const files = checkpoint?.reference_files || [];

  files.forEach((fileItem) => {
    if (fileItem?.file instanceof File) {
      pending.push({
        fileName: getReportFileName(fileItem) || fileItem.file.name,
        file: fileItem.file,
      });
      return;
    }
    const path = getReportFilePath(fileItem);
    if (!path) return;
    if (fileItem?.isExisting !== false) {
      existing.push(path);
    }
  });

  return { existing_files: existing, pendingFiles: pending };
};

/**
 * True when a checkpoint row has any user-entered content.
 * Empty default rows (tab never opened / untouched) are treated as blank.
 */
export const isCheckpointRowPopulated = (checkpoint) => {
  if (!checkpoint || typeof checkpoint !== "object") return false;

  if (String(checkpoint.checkpoint || "").trim()) return true;
  if (String(checkpoint.judgement_criteria || checkpoint.judgementCriteria || "").trim()) {
    return true;
  }
  if (checkpoint.planned_closure_date) return true;
  if (checkpoint.actual_closure_date || checkpoint.actualClosureDate) return true;
  if (
    String(
      checkpoint.status || checkpoint.checkpoint_status || "",
    ).trim()
  ) {
    return true;
  }
  if (String(checkpoint.pending_at || "").trim()) return true;
  if (checkpoint.reference?.label || checkpoint.reference?.url) return true;

  const files = checkpoint.reference_files || [];
  if (Array.isArray(files) && files.length > 0) return true;

  const tags = checkpoint.tags || [];
  if (Array.isArray(tags) && tags.length > 0) return true;

  return false;
};

/** Drop blank checkpoint line items so empty defaults are not posted. */
export const getPopulatedCheckpoints = (checkpoints = []) =>
  (Array.isArray(checkpoints) ? checkpoints : []).filter(isCheckpointRowPopulated);

/**
 * Remove empty-string (and null/undefined) values from a JSON payload recursively.
 * Empty arrays are kept so list fields remain explicit when intentional.
 */
export const omitEmptyPayloadStrings = (value) => {
  if (value === "" || value === undefined || value === null) return undefined;

  if (Array.isArray(value)) {
    return value
      .map((item) => omitEmptyPayloadStrings(item))
      .filter((item) => item !== undefined && item !== "");
  }

  if (typeof value === "object" && value.constructor === Object) {
    const next = {};
    Object.entries(value).forEach(([key, entry]) => {
      if (entry === "" || entry === undefined || entry === null) return;
      const cleaned = omitEmptyPayloadStrings(entry);
      if (cleaned === undefined || cleaned === "") return;
      next[key] = cleaned;
    });
    return next;
  }

  return value;
};

const pickDefinedString = (value) => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

/**
 * Draft/publish JSON (camelCase) for:
 *   POST /api/audit/audits/publish
 *   POST /api/audit/audits/save-as-draft
 */
export const buildAuditDraftPayload = (audit, checkpoints = []) => {
  const { start_date, end_date } = parseAuditDateRange(audit?.date_range);
  const { existing_audit_files } = splitAuditReportsForPayload(audit?.reports);
  const populatedCheckpoints = getPopulatedCheckpoints(checkpoints);
  const slug = pickDefinedString(audit?.slug || audit?.id || audit?.audit_id);

  const toStaffIds = (value) => {
    if (!value) return [];
    const list = Array.isArray(value) ? value : [value];
    return list
      .map((item) => {
        if (!item) return "";
        if (typeof item === "string") return extractStaffId(item);
        return extractStaffId(item.staff_id ?? item.staffId ?? item.id ?? item.name);
      })
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  };

  const payload = {
    ...(slug ? { slug } : {}),
    auditName: pickDefinedString(audit?.audit_name),
    department: pickDefinedString(
      audit?.vertical_div_deptt || audit?.department,
    ),
    startDate: start_date || undefined,
    endDate: end_date || undefined,
    auditors: toStaffIds(audit?.auditors ?? audit?.auditor),
    auditees: toStaffIds(audit?.auditees ?? audit?.auditee),
    checkpoints: populatedCheckpoints.map((cp) => {
      const { existing_files } = splitCheckpointFilesForPayload(cp);
      const planned = toApiDate(cp.planned_closure_date);
      const checkpointId = cp.checkpoint_id || cp.id;


      // Always send existingFiles (including []) so removed reference
      // files are not kept by the server on draft/publish.
      return {
        ...(checkpointId ? { checkpointId } : {}),
        checkpoint: pickDefinedString(cp.checkpoint),
        judgementCriteria: pickDefinedString(cp.judgement_criteria),
        risk_level: pickDefinedString(cp.risk_level),
        ...(planned ? { plannedClosureDate: planned } : {}),
        existingFiles: existing_files || [],
        newFiles: [],
      };
    }),
    existingAuditFiles: existing_audit_files || [],
    newAuditFiles: [],
  };

  return omitEmptyPayloadStrings(payload);
};

export const buildAuditPublishPayload = (audit, checkpoints = [], sourceStatus = "Draft") => {
  const draft = buildAuditDraftPayload(audit, checkpoints);
  return omitEmptyPayloadStrings({
    ...draft,
    sourceStatus: pickDefinedString(sourceStatus) || "Draft",
  });
};

export const applyUploadedFilesToPayload = (
  payload,
  uploadedAuditFiles,
  uploadedCheckpointFiles,
) => {
  const next = {
    ...payload,
    newAuditFiles: [
      ...(payload.newAuditFiles || payload.new_audit_files || []),
      ...uploadedAuditFiles,
    ],
    checkpoints: (payload.checkpoints || []).map((cp) => {
      const checkpointId = cp.checkpointId || cp.checkpoint_id;
      return {
        ...cp,
        newFiles: [
          ...(cp.newFiles || cp.new_files || []),
          ...(uploadedCheckpointFiles[checkpointId] || []),
        ],
      };
    }),
  };
  return omitEmptyPayloadStrings(next);
};
