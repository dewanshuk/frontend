import { genericApi, userManagementApi } from "./axiosInstance";
import moment from "moment";
import {
  formatApiDateForPicker,
  formatAuditApiDate,
  mapAuditReportsFromApi,
  mapCheckpointFromApi,
  omitEmptyPayloadStrings,
  resolveAuditApiId,
} from "@/utils/auditHelpers";
import { MOCK_AUDIT_AS_AUDITOR } from "@/config";
import { getDepartments, mapDepartmentToOption } from "./userManagementApi";

const MOCK_AUDITS = [
  {
    id: "1",
    audit_id: "DEPT-01",
    audit_name: "ISO",
    department: "Legal",
    audit_type: "Internal",
    status: "Completed",
    start_date: "07-JAN-2026",
    end_date: "07-SEP-2026",
    audit_lead: "Rahul Sharma (E12345)",
    created_by: "Priya Mehta (E10234)",
    description:
      "Annual ISO compliance audit covering documentation, process adherence, and regulatory alignment across legal operations.",
    checkpoints_total: 30,
    checkpoints_closed: 15,
    checkpoints_open: 5,
    checkpoints_due_for_me: 5,
    checkpoints_overdue_for_me: 5,
  },
  {
    id: "2",
    audit_id: "DEPT-02",
    audit_name: "Annual Safety",
    department: "Safety",
    audit_type: "External",
    status: "In-Progress",
    start_date: "07-OCT-2025",
    end_date: "07-JUN-2026",
    audit_lead: "Amit Verma (E23456)",
    created_by: "Sneha Kapoor (E11098)",
    description:
      "Comprehensive workplace safety audit including equipment checks, incident logs, and employee training compliance.",
    checkpoints_total: 15,
    checkpoints_closed: 7,
    checkpoints_open: 8,
    checkpoints_due_for_me: 5,
    checkpoints_overdue_for_me: 4,
  },
  {
    id: "3",
    audit_id: "DEPT-03",
    audit_name: "Sustainability",
    department: "Sustainability",
    audit_type: "Internal",
    status: "Draft",
    start_date: "26-OCT-2025",
    end_date: "26-OCT-2026",
    audit_lead: "Kavya Nair (E34567)",
    created_by: "Rahul Sharma (E12345)",
    description:
      "Sustainability audit evaluating environmental policies, emissions reporting, and green initiative implementation.",
    checkpoints_total: 21,
    checkpoints_closed: 15,
    checkpoints_open: 6,
    checkpoints_due_for_me: 3,
    checkpoints_overdue_for_me: 4,
  },
  {
    id: "4",
    audit_id: "DEPT-04",
    audit_name: "ISO",
    department: "Operations",
    audit_type: "Internal",
    status: "Completed",
    start_date: "24-DEC-2025",
    end_date: "24-DEC-2026",
    audit_lead: "Vikram Singh (E45678)",
    created_by: "Amit Verma (E23456)",
    description:
      "Operations ISO audit focused on supply chain processes, quality management, and operational risk controls.",
    checkpoints_total: 15,
    checkpoints_closed: 10,
    checkpoints_open: 5,
    checkpoints_due_for_me: 4,
    checkpoints_overdue_for_me: 3,
  },
  {
    id: "5",
    audit_id: "DEPT-05",
    audit_name: "Monthly Safety",
    department: "Safety",
    audit_type: "Internal",
    status: "In-Progress",
    start_date: "01-JAN-2026",
    end_date: "31-DEC-2026",
    audit_lead: "Amit Verma (E23456)",
    created_by: "Sneha Kapoor (E11098)",
    description:
      "Monthly safety checkpoint review for plant floor operations and emergency preparedness protocols.",
    checkpoints_total: 12,
    checkpoints_closed: 4,
    checkpoints_open: 8,
    checkpoints_due_for_me: 2,
    checkpoints_overdue_for_me: 1,
  },
  {
    id: "6",
    audit_id: "DEPT-06",
    audit_name: "Quarterly Safety",
    department: "Safety",
    audit_type: "External",
    status: "In-Progress",
    start_date: "15-MAR-2026",
    end_date: "15-MAR-2027",
    audit_lead: "Neha Gupta (E56789)",
    created_by: "Kavya Nair (E34567)",
    description:
      "Quarterly third-party safety assessment covering hazard identification and corrective action tracking.",
    checkpoints_total: 18,
    checkpoints_closed: 6,
    checkpoints_open: 12,
    checkpoints_due_for_me: 3,
    checkpoints_overdue_for_me: 2,
  },
  {
    id: "7",
    audit_id: "DEPT-07",
    audit_name: "Safety Audit",
    department: "Compliance",
    audit_type: "Internal",
    status: "Draft",
    start_date: "10-FEB-2026",
    end_date: "10-AUG-2026",
    audit_lead: "Rahul Sharma (E12345)",
    created_by: "Vikram Singh (E45678)",
    description:
      "Compliance-led safety audit draft covering regulatory obligations and internal control effectiveness.",
    checkpoints_total: 9,
    checkpoints_closed: 2,
    checkpoints_open: 7,
    checkpoints_due_for_me: 1,
    checkpoints_overdue_for_me: 0,
  },
  {
    id: "8",
    audit_id: "DEPT-08",
    audit_name: "Safety Training",
    department: "HR",
    audit_type: "Internal",
    status: "Completed",
    start_date: "05-APR-2025",
    end_date: "05-APR-2026",
    audit_lead: "Priya Mehta (E10234)",
    created_by: "Neha Gupta (E56789)",
    description:
      "HR safety training audit verifying completion rates, curriculum updates, and certification records.",
    checkpoints_total: 25,
    checkpoints_closed: 25,
    checkpoints_open: 0,
    checkpoints_due_for_me: 0,
    checkpoints_overdue_for_me: 0,
  },
];

const MOCK_KPIS = {
  total_audits: 8,
  completed_audits: 3,
  in_progress_audits: 3,
  draft_audits: 2,
  total_overdue_checkpoints: 19,
  total_due_checkpoints: 23,
};

const normalizeStatus = (status) => String(status || "").toLowerCase();

const parseAuditDate = (value) => {
  if (!value) return null;
  const parsed = new Date(String(value).replace(/-/g, " "));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const matchesSearch = (audit, search) => {
  if (!search) return true;
  const query = search.toLowerCase();
  return (
    audit.audit_id.toLowerCase().includes(query) ||
    audit.audit_name.toLowerCase().includes(query) ||
    audit.department.toLowerCase().includes(query)
  );
};

const matchesFilters = (audit, filters = {}) => {
  const statuses = Array.isArray(filters.status)
    ? filters.status
    : filters.status
      ? [filters.status]
      : [];

  if (
    statuses.length > 0 &&
    !statuses.some((status) => normalizeStatus(audit.status) === normalizeStatus(status))
  ) {
    return false;
  }

  if (
    Array.isArray(filters.departments) &&
    filters.departments.length > 0 &&
    !filters.departments.includes(audit.department)
  ) {
    return false;
  }

  if (
    Array.isArray(filters.audit_names) &&
    filters.audit_names.length > 0 &&
    !filters.audit_names.includes(audit.audit_name)
  ) {
    return false;
  }

  if (filters.due_for_me && !(audit.checkpoints_due_for_me > 0)) {
    return false;
  }

  if (filters.overdue_for_me && !(audit.checkpoints_overdue_for_me > 0)) {
    return false;
  }

  if (filters.date_range) {
    const [rawStart, rawEnd] = String(filters.date_range)
      .split("-")
      .map((part) => part.trim());
    const rangeStart = rawStart ? new Date(rawStart) : null;
    const rangeEnd = rawEnd ? new Date(rawEnd) : rangeStart;
    const auditStart = parseAuditDate(audit.start_date);
    const auditEnd = parseAuditDate(audit.end_date) || auditStart;

    if (rangeStart && auditEnd && auditEnd < rangeStart) {
      return false;
    }

    if (rangeEnd && auditStart && auditStart > rangeEnd) {
      return false;
    }
  }

  return true;
};

const MOCK_REPORTS = [
  {
    id: "report-1",
    uploaded_on: "17-JAN-2026, 4:00 PM",
    file_name: "Draft_Audit_Report_1.pptx",
  },
  {
    id: "report-2",
    uploaded_on: "13-FEB-2026, 2:00 PM",
    file_name: "Final_Audit_Report_1.pptx",
  },
  {
    id: "report-3",
    uploaded_on: "19-FEB-2026, 5:00 PM",
    file_name: "Draft_Audit_Report_2.pptx",
  },
  {
    id: "report-4",
    uploaded_on: "26-FEB-2026, 5:00 PM",
    file_name: "Final_Audit_Report_2.pptx",
  },
];

const AUDIT_REFERENCE_OPTIONS = {
  departments: [
    "I-Comp/Comp/Legal",
    "S-Comp/Comp/Safety",
    "I-Comp/Comp/Operations",
    "I-Comp/Comp/HR",
    "I-Comp/Comp/Sustainability",
  ],
  auditors: [
    "Rahul Sharma (E12345)",
    "Amit Verma (E23456)",
    "Kavya Nair (E34567)",
    "Vikram Singh (E45678)",
    "Neha Gupta (E56789)",
    "Priya Mehta (E10234)",
  ],
  auditees: [
    "Priya Mehta (E10234)",
    "Sneha Kapoor (E11098)",
    "Rahul Sharma (E12345)",
    "Amit Verma (E23456)",
    "Kavya Nair (E34567)",
    "Vikram Singh (E45678)",
  ],
};

const enrichAuditDetail = (audit) => {
  const toPeople = (list, fallback) => {
    if (Array.isArray(list) && list.length > 0) {
      return list
        .map((item) => {
          if (!item) return null;
          if (typeof item === "string") {
            const name = item.trim();
            if (!name) return null;
            const match = name.match(/\(([^)]+)\)/);
            return { id: (match?.[1] || name).trim(), name };
          }
          const staffId = String(
            item.staff_id ?? item.staffId ?? item.id ?? "",
          ).trim();
          const username = String(item.username ?? item.name ?? "").trim();
          if (!staffId && !username) return null;
          const id = staffId || username;
          const name =
            username && staffId && !String(username).includes(`(${staffId})`)
              ? `${username} (${staffId})`
              : username || staffId;
          return { id, name };
        })
        .filter(Boolean);
    }
    if (fallback) {
      const name = String(fallback).trim();
      if (!name) return [];
      const match = name.match(/\(([^)]+)\)/);
      return [{ id: (match?.[1] || name).trim(), name }];
    }
    return [];
  };

  const auditors = toPeople(
    audit.auditors,
    audit.auditor || audit.audit_lead,
  );
  const auditees = toPeople(
    audit.auditees,
    audit.auditee || audit.created_by,
  );

  return {
    ...audit,
    display_audit_id:
      audit.display_audit_id ||
      audit.audit_id ||
      String(audit.id ?? "0"),
    vertical_div_deptt: audit.vertical_div_deptt || audit.department || "",
    auditor: auditors[0]?.name || audit.auditor || audit.audit_lead || "",
    auditee: auditees[0]?.name || audit.auditee || audit.created_by || "",
    auditors,
    auditees,
    date_range:
      audit.date_range ||
      (audit.start_date && audit.end_date
        ? `${audit.start_date} - ${audit.end_date}`
        : ""),
    reports: audit.reports ?? [],
    checkpoints: audit.checkpoints ?? [],
  };
};

export const getAuditReferenceOptions = () => AUDIT_REFERENCE_OPTIONS;

/** @deprecated Prefer `listAuditDepartmentOptions` / `listAuditNameOptions` (API). */
export const getAuditFilterOptions = () => ({
  departments: [],
  audit_names: [],
});

const CHECKPOINT_STATUS_OPTIONS = ["Open", "Closed", "Due", "Overdue"];
const CLOSURE_STATUS_OPTIONS = ["Open", "Closed", "Pending"];

const buildCheckpointsForAudit = (audit) => {
  const referenceLabels = ["Uploaded File 1", null, "Uploaded File 1", null];

  return Array.from({ length: 4 }, (_, index) => ({
    id: `${audit.id}-cp-${index + 1}`,
    serial_no: index + 1,
    checkpoint: "",
    judgement_criteria: "",
    planned_closure_date: null,
    reference: referenceLabels[index]
      ? { label: referenceLabels[index], url: "#" }
      : null,
    pending_at: "John Doe",
    status: "",
    checkpoint_status: "",
    actual_closure_date: null,
    actualClosureDate: null,
  }));
};

export const getAuditDetail = async (auditId, mode = "view") => {
  // Try server API first. endpoint: /api/audit/audits/{id}?mode=view|edit
  try {
    const response = await genericApi.get(`/api/audit/audits/${encodeURIComponent(auditId)}`, {
      params: { mode },
    });
    const body = response?.data || {};
    const item = body.data ?? body;

    // Map API fields (camelCase Get/Edit payload) to UI model
    const checkpointsArray = Array.isArray(item.checkpoints)
      ? item.checkpoints
      : [];
    const total = checkpointsArray.length;
    const closed = checkpointsArray.filter(
      (c) => String(c.status || c.checkpointStatus || "").toLowerCase() === "closed",
    ).length;
    const due = checkpointsArray.filter(
      (c) => String(c.status || c.checkpointStatus || "").toLowerCase() === "due",
    ).length;
    const overdue = checkpointsArray.filter(
      (c) => String(c.status || c.checkpointStatus || "").toLowerCase() === "overdue",
    ).length;
    const open = Math.max(0, total - closed);

    const auditKey =
      item.auditId ?? item.audit_id ?? item.id ?? auditId;
    const startRaw = item.startDate ?? item.start_date ?? "";
    const endRaw = item.endDate ?? item.end_date ?? "";
    const startDisplay = startRaw
      ? formatApiDateForPicker(startRaw) || startRaw
      : "";
    const endDisplay = endRaw
      ? formatApiDateForPicker(endRaw) || endRaw
      : "";

    const mapped = {
      // Prefer business audit id for API paths; keep pk for reference
      id: item.pkId ?? item.pk_id ?? item.auditId ?? item.audit_id ?? auditId,
      pk_id: item.pkId ?? item.pk_id ?? null,
      slug: item.slug ?? null,
      mode: item.mode ?? mode,
      audit_id: item.auditId ?? item.audit_id ?? item.slug ?? auditId,
      display_audit_id: String(item.auditId ?? item.audit_id ?? item.slug ?? auditId),
      audit_name: item.auditName ?? item.audit_name ?? "",
      department: item.department ?? item.vertical_div_deptt ?? "",
      vertical_div_deptt: item.department ?? item.vertical_div_deptt ?? "",
      audit_type: item.auditType ?? item.audit_type,
      audit_lead:
        (item.auditors && item.auditors[0]) || item.auditLead || item.audit_lead,
      created_by:
        (item.auditees && item.auditees[0]) || item.createdBy || item.created_by,
      auditor:
        (item.auditors && item.auditors[0]) || item.auditLead || item.audit_lead,
      auditee:
        (item.auditees && item.auditees[0]) || item.createdBy || item.created_by,
      auditors: item.auditors ?? item.auditor_list ?? [],
      auditees: item.auditees ?? item.auditee_list ?? [],
      viewer_role: item.role ?? item.viewerRole ?? item.viewer_role ?? null,
      description: item.description ?? item.desc ?? "",
      status: item.status ?? "Draft",
      start_date: startDisplay,
      end_date: endDisplay,
      date_range:
        startDisplay && endDisplay
          ? `${startDisplay} - ${endDisplay}`
          : item.date_range || "",
      checkpoints_total: total,
      checkpoints_closed: closed,
      checkpoints_open: open,
      checkpoints_due_for_me: due,
      checkpoints_overdue_for_me: overdue,
      reports: mapAuditReportsFromApi(item),
      checkpoints: checkpointsArray.map(mapCheckpointFromApi),
    };

    return { data: enrichAuditDetail(mapped) };
  } catch (err) {
    // Fallback to mock behaviour when server call fails
  }

  // Fallback to mocks
  await new Promise((resolve) => setTimeout(resolve, 200));
  const audit = MOCK_AUDITS.find(
    (item) =>
      item.id === String(auditId) ||
      item.audit_id === String(auditId) ||
      String(item.id) === String(auditId) ||
      String(item.audit_id) === String(auditId),
  );

  if (!audit) {
    throw new Error("Audit not found.");
  }

  const checkpoints = buildCheckpointsForAudit(audit).map((cp, index) => ({
    ...cp,
    checkpoint:
      cp.checkpoint ||
      `Verify compliance for control area ${index + 1} per applicable SOPs and site procedures.`,
    judgement_criteria:
      cp.judgement_criteria ||
      "All evidence must demonstrate process adherence and documented closure of findings.",
    status: cp.status || cp.checkpoint_status || (index === 0 ? "In-Progress" : ""),
    checkpoint_status:
      cp.status || cp.checkpoint_status || (index === 0 ? "In-Progress" : ""),
    tags: index === 0 ? ["Safety", "Critical"] : [],
  }));

  return {
    data: enrichAuditDetail({
      ...audit,
      checkpoints,
    }),
  };
};

export const getAuditCheckpoints = async ({ auditId } = {}) => {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const audit = MOCK_AUDITS.find(
    (item) => item.id === String(auditId) || item.audit_id === String(auditId),
  );

  if (!audit) {
    return { data: [], total: 0 };
  }

  const checkpoints = buildCheckpointsForAudit(audit);
  return {
    data: checkpoints,
    total: checkpoints.length,
  };
};

export const getAuditCheckpointStatusOptions = () => CHECKPOINT_STATUS_OPTIONS;

export const getAuditClosureStatusOptions = () => CLOSURE_STATUS_OPTIONS;

const CHECKPOINT_ACTION_ACCEPT =
  ".pptx,.ppt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.gif,.tiff,.bmp";

/** Client + API constraints for checkpoint respond / close attachments */
export const CHECKPOINT_ACTION_FILE_RULES = {
  accept: CHECKPOINT_ACTION_ACCEPT,
  maxFiles: 2,
  maxFileSizeBytes: 10 * 1024 * 1024,
  extensions: [
    ".pptx",
    ".ppt",
    ".xlsx",
    ".xls",
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".tiff",
    ".bmp",
  ],
};

const mapApiError = (err, fallback) => {
  const status = err?.response?.status ?? err?.status;
  const body = err?.response?.data || err?.payload || {};
  // Blob error payloads may already be parsed by the axios interceptor as an object.
  const detail =
    typeof body?.detail === "string"
      ? body.detail
      : Array.isArray(body?.detail) && body.detail[0]?.msg
        ? body.detail[0].msg
        : null;
  const message =
    body.message || detail || body.error || err?.message || fallback;
  if (status === 403) {
    const permissionError = new Error(
      message || "You do not have permission to perform this action.",
    );
    permissionError.status = 403;
    throw permissionError;
  }
  const next = new Error(message || fallback);
  next.status = status;
  throw next;
};

/**
 * HTTP 200 can still carry an application-level failure. Reject those so
 * UI never toasts success after a failed mutation.
 */
const assertAuditMutationSuccess = (data, fallback) => {
  if (data == null || typeof data !== "object") return data;

  const nested =
    data.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? data.data
      : null;
  const body = nested ? { ...data, ...nested } : data;

  if (body.success === false || body.isSuccess === false || body.ok === false) {
    throw new Error(
      String(
        body.message || body.detail || body.error || body.statusMessage || fallback,
      ),
    );
  }

  const statusText = body.status ?? body.result ?? body.outcome;
  if (typeof statusText === "string") {
    const normalized = statusText.toLowerCase().trim();
    if (["error", "failed", "failure", "fail"].includes(normalized)) {
      throw new Error(
        String(body.message || body.detail || body.error || fallback),
      );
    }
  }

  if (typeof body.statusCode === "number" && body.statusCode >= 400) {
    throw new Error(
      String(body.message || body.detail || body.error || fallback),
    );
  }

  return data;
};

/** Format conversation timestamps → { date, time } for history UI. */
const formatConversationTimestamp = (value) => {
  if (!value) return { date: "", time: "" };
  const m = moment(value);
  if (!m.isValid()) {
    const text = String(value);
    return { date: text, time: "" };
  }
  return {
    date: m.format("DD/MM/YY"),
    time: m.format("h:mmA"),
  };
};

/**
 * Map GET /api/audit/checkpoints/{id} conversation[] into history drawer rows.
 */
export const mapCheckpointConversation = (conversation = []) =>
  (Array.isArray(conversation) ? conversation : []).map((entry, index) => {
    const { date, time } = formatConversationTimestamp(
      entry?.timestamp ?? entry?.uploadedAt ?? entry?.uploaded_at,
    );
    const files = entry?.files ?? entry?.attachments ?? [];
    const action = entry?.action ? String(entry.action) : "";
    const closureDate = entry?.closureDate ?? entry?.closure_date ?? "";
    let remarks = String(entry?.remarks ?? entry?.message ?? entry?.comment ?? "");
    if (action) {
      remarks = remarks
        ? `${remarks}\n\nAction: ${action}${closureDate ? ` · Closure date: ${closureDate}` : ""}`
        : `Action: ${action}${closureDate ? ` · Closure date: ${closureDate}` : ""}`;
    }

    return {
      id: entry?.id ?? `log-${index}`,
      employee_name:
        entry?.employeeName ??
        entry?.employee_name ??
        entry?.username ??
        entry?.user ??
        entry?.name ??
        "Unknown",
      employee_id:
        entry?.employeeId ?? entry?.employee_id ?? entry?.staffId ?? entry?.staff_id ?? "",
      date,
      time,
      remarks,
      attachments: (Array.isArray(files) ? files : []).map((file, fileIndex) => ({
        id: file?.id ?? `att-${index}-${fileIndex}`,
        file_name:
          file?.originalName ??
          file?.original_name ??
          file?.fileName ??
          file?.file_name ??
          file?.name ??
          `File ${fileIndex + 1}`,
        file_url:
          file?.fileUrl ??
          file?.file_url ??
          file?.url ??
          file?.blobPath ??
          file?.blob_path ??
          "#",
      })),
      role: String(entry?.role || entry?.actor_role || "").toLowerCase(),
      action,
      closure_date: closureDate,
    };
  });

/**
 * Full checkpoint detail (status, pendingAt, conversation).
 * GET /api/audit/checkpoints/{checkpointId}
 */
export const getCheckpointById = async (checkpointId) => {
  const resolvedCp = String(checkpointId ?? "").trim();
  if (!resolvedCp) {
    throw new Error("Checkpoint is missing.");
  }

  try {
    const response = await genericApi.get(
      `/api/audit/checkpoints/${encodeURIComponent(resolvedCp)}`,
    );
    const body = response?.data?.data ?? response?.data ?? {};

    return {
      checkpoint_id: body.checkpointId ?? body.checkpoint_id ?? resolvedCp,
      status: body.status ?? "",
      pending_at: body.pendingAt ?? body.pending_at ?? null,
      conversation: mapCheckpointConversation(
        body.conversation ?? body.logs ?? [],
      ),
      raw: body,
    };
  } catch (err) {
    mapApiError(err, "Unable to load checkpoint history.");
  }
};

/**
 * Chronological logs for a checkpoint (chat-style history drawer).
 * GET /api/audit/checkpoints/{checkpointId} → conversation[]
 */
export const getCheckpointHistory = async ({ checkpointId } = {}) => {
  const detail = await getCheckpointById(checkpointId);
  return {
    data: detail.conversation,
    status: detail.status,
    pending_at: detail.pending_at,
  };
};

/**
 * Delete a checkpoint.
 * DELETE /api/audit/checkpoints/{checkpointId}
 * Treats 404 as success so local-only draft rows can still be removed from the grid.
 */
export const deleteCheckpoint = async (checkpointId) => {
  const resolvedCp = String(checkpointId ?? "").trim();
  if (!resolvedCp) {
    throw new Error("Checkpoint is missing.");
  }

  try {
    const response = await genericApi.delete(
      `/api/audit/checkpoints/${encodeURIComponent(resolvedCp)}`,
    );
    return assertAuditMutationSuccess(
      response?.data || { success: true },
      "Unable to delete checkpoint.",
    );
  } catch (err) {
    const status = err?.response?.status ?? err?.status;
    // Not on server yet (new draft row) — allow client removal.
    if (status === 404) {
      return { success: true, notFound: true };
    }
    mapApiError(err, "Unable to delete checkpoint.");
  }
};

/**
 * Submit a respond action on a checkpoint.
 * POST /api/audit/checkpoints/{checkpointId}/respond
 * form-data: payload (JSON string) + files
 */
export const respondToCheckpoint = async ({
  auditId: _auditId,
  checkpointId,
  remarks,
  files = [],
} = {}) => {
  const resolvedCp = String(checkpointId ?? "").trim();
  if (!resolvedCp) {
    throw new Error("Checkpoint is missing.");
  }

  const formData = new FormData();
  formData.append(
    "payload",
    JSON.stringify({ remarks: String(remarks || "").trim() }),
  );
  (files || []).forEach((file) => {
    if (file instanceof File) formData.append("files", file);
  });

  try {
    const response = await genericApi.post(
      `/api/audit/checkpoints/${encodeURIComponent(resolvedCp)}/respond`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return assertAuditMutationSuccess(
      response?.data || { success: true },
      "Unable to submit response.",
    );
  } catch (err) {
    mapApiError(err, "Unable to submit response.");
  }
};

/**
 * Auditor close action.
 * POST /api/audit/checkpoints/{checkpointId}/close
 * form-data: payload, closure_date, files
 */
export const closeCheckpoint = async ({
  auditId: _auditId,
  checkpointId,
  action = "closed",
  remarks,
  closureDate,
  files = [],
} = {}) => {
  const resolvedCp = String(checkpointId ?? "").trim();
  if (!resolvedCp) {
    throw new Error("Checkpoint is missing.");
  }

  const formData = new FormData();
  formData.append(
    "payload",
    JSON.stringify({
      action: action === "non_compliant" ? "non_compliant" : "closed",
      remarks: String(remarks || "").trim(),
    }),
  );
  const closedOn =
    formatAuditApiDate(closureDate) || String(closureDate || "").trim();
  if (closedOn) {
    formData.append("closure_date", closedOn);
  }
  (files || []).forEach((file) => {
    if (file instanceof File) formData.append("files", file);
  });

  try {
    const response = await genericApi.post(
      `/api/audit/checkpoints/${encodeURIComponent(resolvedCp)}/close`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return assertAuditMutationSuccess(
      response?.data || { success: true },
      "Unable to update checkpoint.",
    );
  } catch (err) {
    mapApiError(err, "Unable to update checkpoint.");
  }
};

/**
 * Reopen a closed checkpoint.
 * POST /api/audit/checkpoints/{checkpointId}/reopen
 * form-data: payload (JSON string, optional) — { remarks }
 */
export const reopenCheckpoint = async ({
  auditId: _auditId,
  checkpointId,
  remarks,
} = {}) => {
  const resolvedCp = String(checkpointId ?? "").trim();
  if (!resolvedCp) {
    throw new Error("Checkpoint is missing.");
  }

  const formData = new FormData();
  const trimmedRemarks = String(remarks || "").trim();
  if (trimmedRemarks) {
    formData.append("payload", JSON.stringify({ remarks: trimmedRemarks }));
  }

  try {
    const response = await genericApi.post(
      `/api/audit/checkpoints/${encodeURIComponent(resolvedCp)}/reopen`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return assertAuditMutationSuccess(
      response?.data || { success: true },
      "Unable to reopen checkpoint.",
    );
  } catch (err) {
    mapApiError(err, "Unable to reopen checkpoint.");
  }
};

/**
 * Returns whether the current user can create/manage draft audits.
 * Failures are handled by callers as denied access (fail closed).
 *
 * When `MOCK_AUDIT_AS_AUDITOR` is true, returns allowed without calling the API.
 */
export const getAuditAccess = async () => {
  if (MOCK_AUDIT_AS_AUDITOR) {
    return {
      allowed: true,
      reason: null,
      viewer_role: "auditor",
    };
  }

  const response = await genericApi.get("/api/audit/audit-access");
  const body = response?.data || {};

  return {
    allowed: body.allowed === true,
    reason: body.reason ?? null,
    viewer_role: body.viewer_role ?? body.viewerRole ?? null,
  };
};

/**
 * Shared body fields for ListAudits / audit-dashboard filter scope.
 * Does not include pagination keys.
 *
 * Example ListAudits body (with pagination):
 * {
 *   pageNumber, pageSize,
 *   searchQuery, searchType,
 *   startDateFrom, startDateTo, endDateFrom, endDateTo
 * }
 */
export const buildAuditFilterBody = ({
  search,
  search_type,
  status,
  departments,
  audit_names,
  due_for_me,
  overdue_for_me,
  start_date,
  end_date,
  date_range,
} = {}) => {
  const body = {};

  const searchText = String(search || "").trim();
  if (searchText) {
    body.searchQuery = searchText;
  }

  // Always send search mode so ListAudits / dashboard know Quick vs Detail scope
  const normalizedType = String(search_type || "quick").toLowerCase();
  body.searchType = normalizedType === "detail" ? "detail" : "quick";

  if (Array.isArray(audit_names) && audit_names.length > 0) {
    body.auditNames = audit_names
      .map((item) => (typeof item === "string" ? item : item?.name ?? item?.id))
      .filter(Boolean);
  }
  if (Array.isArray(departments) && departments.length > 0) {
    body.departmentNames = departments
      .map((item) => (typeof item === "string" ? item : item?.name ?? item?.id))
      .filter(Boolean);
  }
  if (status) {
    const resolvedStatus = Array.isArray(status) ? status[0] : status;
    if (resolvedStatus && resolvedStatus !== "All") {
      body.status = resolvedStatus;
    }
  }
  if (due_for_me) {
    body.dueForMe = true;
  }
  if (overdue_for_me) {
    body.overdueForMe = true;
  }

  let startRaw = String(start_date || "").trim();
  let endRaw = String(end_date || "").trim();

  // Legacy single date_range → treat as bound for both audit start/end singles
  if (!startRaw && !endRaw && date_range) {
    const parts = String(date_range)
      .split(/\s*-\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts[0] && parts[1]) {
      // Combined period used historically: map to both single-day ranges
      const fromApi = formatAuditApiDate(parts[0]);
      const toApi = formatAuditApiDate(parts[1]);
      if (fromApi) {
        body.startDateFrom = fromApi;
        body.startDateTo = fromApi;
      }
      if (toApi) {
        body.endDateFrom = toApi;
        body.endDateTo = toApi;
      }
    } else if (parts[0]) {
      startRaw = parts[0];
    }
  }

  // API expects YYYY-MM-DD.
  // Filter modal Start Date (range) → startDateFrom / startDateTo
  // Filter modal End Date (range) → endDateFrom / endDateTo
  const parseBoundRange = (raw) => {
    if (!raw) return { from: "", to: "" };
    const parts = String(raw)
      .split(/\s*-\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    return { from: parts[0] || "", to: parts[1] || parts[0] || "" };
  };

  const startBounds = parseBoundRange(startRaw);
  const endBounds = parseBoundRange(endRaw);

  const startFromApi = formatAuditApiDate(startBounds.from);
  const startToApi = formatAuditApiDate(startBounds.to);
  const endFromApi = formatAuditApiDate(endBounds.from);
  const endToApi = formatAuditApiDate(endBounds.to);

  if (startFromApi) {
    body.startDateFrom = startFromApi;
    body.startDateTo = startToApi || startFromApi;
  }
  if (endFromApi) {
    body.endDateFrom = endFromApi;
    body.endDateTo = endToApi || endFromApi;
  }

  return body;
};

export const getAuditKPIs = async (filters = {}) => {
  try {
    const body = buildAuditFilterBody(filters);
    const response = await genericApi.post("/api/audit/audit-dashboard", body);
    const respBody = response?.data || {};

    // Map API camelCase keys to snake_case used by the UI
    const mapped = {
      total_audits: respBody.totalAudits ?? respBody.total_audits ?? 0,
      completed_audits: respBody.completedAudits ?? respBody.completed_audits ?? 0,
      in_progress_audits:
        respBody.inProgressAudits ?? respBody.in_progress_audits ?? 0,
      draft_audits: respBody.draftAudits ?? respBody.draft_audits ?? 0,
      total_due_checkpoints:
        respBody.totalDueCheckpoints ?? respBody.total_due_checkpoints ?? 0,
      total_overdue_checkpoints:
        respBody.totalOverdueCheckpoints ??
        respBody.total_overdue_checkpoints ??
        0,
    };

    return { data: mapped };
  } catch (err) {
    // Fallback to mock data on error
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { data: MOCK_KPIS };
  }
};

const postAuditPayload = async (url, payload, { pkId } = {}) => {
  const formData = new FormData();
  // Final strip so empty strings never leave the client for draft/publish.
  formData.append("payload", JSON.stringify(omitEmptyPayloadStrings(payload) ?? {}));

  const params = {};
  const resolvedPk = String(pkId ?? "").trim();
  if (resolvedPk) {
    params.pk_id = resolvedPk;
  }

  try {
    const response = await genericApi.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      ...(Object.keys(params).length > 0 ? { params } : {}),
    });
    return assertAuditMutationSuccess(
      response?.data,
      "Failed to save audit.",
    );
  } catch (err) {
    mapApiError(err, "Failed to save audit.");
  }
};

/**
 * Multipart upload for audit-level files.
 * POST /api/audit/audits/{slug}/upload
 */
export const uploadAuditFiles = async (slug, files = []) => {
  const resolvedSlug = String(slug ?? "").trim();
  if (!resolvedSlug) {
    throw new Error("Audit slug is required for file upload.");
  }
  const list = (Array.isArray(files) ? files : []).filter((f) => f instanceof File);
  if (list.length === 0) {
    return { slug: resolvedSlug, files: [] };
  }

  const formData = new FormData();
  list.forEach((file) => formData.append("files", file));

  try {
    const response = await genericApi.post(
      `/api/audit/audits/${encodeURIComponent(resolvedSlug)}/upload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return assertAuditMutationSuccess(
      response?.data,
      "Unable to upload audit files.",
    );
  } catch (err) {
    mapApiError(err, "Unable to upload audit files.");
  }
};

/**
 * Multipart upload for checkpoint reference files.
 * POST /api/audit/audits/{slug}/checkpoints/{checkpoint_id}/upload
 */
export const uploadCheckpointFiles = async (slug, checkpointId, files = []) => {
  const resolvedSlug = String(slug ?? "").trim();
  const resolvedCp = String(checkpointId ?? "").trim();
  if (!resolvedSlug) {
    throw new Error("Audit slug is required for checkpoint file upload.");
  }
  if (!resolvedCp) {
    throw new Error("Checkpoint is required for file upload.");
  }
  const list = (Array.isArray(files) ? files : []).filter((f) => f instanceof File);
  if (list.length === 0) {
    return { slug: resolvedSlug, files: [] };
  }

  const formData = new FormData();
  list.forEach((file) => formData.append("files", file));

  try {
    const response = await genericApi.post(
      `/api/audit/audits/${encodeURIComponent(resolvedSlug)}/checkpoints/${encodeURIComponent(resolvedCp)}/upload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return assertAuditMutationSuccess(
      response?.data,
      "Unable to upload checkpoint files.",
    );
  } catch (err) {
    mapApiError(err, "Unable to upload checkpoint files.");
  }
};

/**
 * @deprecated Prefer {@link uploadAuditFiles} — kept as a no-op shim for old imports.
 */
export const generateAuditUploadUrl = async () => {
  throw new Error(
    "generate-upload-url was replaced by POST /api/audit/audits/{slug}/upload",
  );
};

/**
 * Reserve a storage slug for a new audit.
 * POST /api/audit/audits/init → { slug: "audit-slug-..." }
 */
export const generateAuditId = async () => {
  const response = await genericApi.post("/api/audit/audits/init");
  const body = response?.data?.data ?? response?.data ?? {};

  const slug = String(
    body?.slug ?? body?.id ?? body?.audit_id ?? body?.auditId ?? "",
  ).trim();

  if (!slug || slug === "0") {
    throw new Error("Unable to initialize audit slug.");
  }

  return {
    id: slug,
    slug,
    audit_id: slug,
    display_audit_id: slug,
  };
};

/**
 * Create/update draft. optional pk_id query for edits.
 * POST /api/audit/audits/save-as-draft?pk_id=
 */
export const saveAuditDraft = async (_auditId, payload, options = {}) => {
  return postAuditPayload(`/api/audit/audits/save-as-draft`, payload, {
    pkId: options.pkId ?? options.pk_id ?? null,
  });
};

/**
 * Publish audit. optional pk_id query for edits / re-publish.
 * POST /api/audit/audits/publish?pk_id=
 */
export const publishAudit = async (_auditId, payload, options = {}) => {
  return postAuditPayload(`/api/audit/audits/publish`, payload, {
    pkId: options.pkId ?? options.pk_id ?? null,
  });
};

/**
 * Close an audit by pk id.
 * POST /api/audit/audits/{pk_id}/close
 */
export const closeAudit = async (auditId, body = {}) => {
  const id = resolveAuditApiId(auditId);
  try {
    const response = await genericApi.post(
      `/api/audit/audits/${encodeURIComponent(id)}/close`,
      body,
    );
    return assertAuditMutationSuccess(
      response?.data,
      "Unable to close audit.",
    );
  } catch (err) {
    mapApiError(err, "Unable to close audit.");
  }
};

/**
 * Full ListAudits request body (pagination + filter scope).
 */
export const buildAuditListPayload = ({
  page = 1,
  page_size = 10,
  search,
  search_type,
  status,
  departments,
  audit_names,
  due_for_me,
  overdue_for_me,
  start_date,
  end_date,
  date_range,
} = {}) => ({
  pageNumber: page,
  pageSize: page_size,
  ...buildAuditFilterBody({
    search,
    search_type,
    status,
    departments,
    audit_names,
    due_for_me,
    overdue_for_me,
    start_date,
    end_date,
    date_range,
  }),
});

/**
 * Export body: same filter / search scope as ListAudits, without pagination.
 * Server exports the full matching result set.
 */
export const buildAuditExportPayload = ({
  search,
  search_type,
  status,
  departments,
  audit_names,
  due_for_me,
  overdue_for_me,
  start_date,
  end_date,
  date_range,
} = {}) =>
  buildAuditFilterBody({
    search,
    search_type,
    status,
    departments,
    audit_names,
    due_for_me,
    overdue_for_me,
    start_date,
    end_date,
    date_range,
  });

/**
 * List audits for the current user.
 * Scope is enforced by the API from the authenticated principal — never invent
 * unrestricted rows on failure (fail closed).
 */
export const getAuditItems = async ({
  page = 1,
  page_size = 10,
  search,
  search_type,
  status,
  departments,
  audit_names,
  due_for_me,
  overdue_for_me,
  start_date,
  end_date,
  date_range,
} = {}) => {
  const body = buildAuditListPayload({
    page,
    page_size,
    search,
    search_type,
    status,
    departments,
    audit_names,
    due_for_me,
    overdue_for_me,
    start_date,
    end_date,
    date_range,
  });

  const response = await genericApi.post("/api/audit/ListAudits", body);
  const resp = response?.data || {};
  const items = Array.isArray(resp.data) ? resp.data : [];

  const mapped = items.map((item) => {
    // Prefer ListAudits `isEdit` (true|false); keep canEdit / editable as fallbacks.
    let canEdit;
    if (typeof item.isEdit === "boolean") {
      canEdit = item.isEdit;
    } else if (typeof item.is_edit === "boolean") {
      canEdit = item.is_edit;
    } else if (typeof item.canEdit === "boolean") {
      canEdit = item.canEdit;
    } else if (typeof item.can_edit === "boolean") {
      canEdit = item.can_edit;
    } else if (typeof item.editable === "boolean") {
      canEdit = item.editable;
    } else {
      canEdit = false;
    }

    return {
      id: item.pkId ?? item.pk_id ?? item.auditId ?? item.id,
      pk_id: item.pkId ?? item.pk_id ?? null,
      slug: item.slug ?? item.auditId ?? item.audit_id ?? null,
      audit_id: item.auditId ?? item.audit_id,
      audit_name: item.auditName ?? item.audit_name,
      department: item.department,
      vertical_div_deptt: item.department,
      status: item.status,
      start_date: item.startDate ?? item.start_date,
      end_date: item.endDate ?? item.end_date,
      checkpoints_total: item.checkpoints?.total ?? 0,
      checkpoints_closed: item.checkpoints?.closed ?? 0,
      checkpoints_open: item.checkpoints?.open ?? 0,
      checkpoints_due_for_me: item.checkpoints?.due ?? item.checkpoints?.dueForMe ?? 0,
      checkpoints_overdue_for_me:
        item.checkpoints?.overdue ?? item.checkpoints?.overdueForMe ?? 0,
      isEdit: canEdit,
      can_edit: canEdit,
    };
  });

  return {
    data: mapped,
    total: resp.totalRecords ?? resp.total ?? mapped.length,
  };
};

/**
 * Export audits matching the current filters / search (full result set).
 * POST /api/audit/audits/export — filter scope only; no page_number / page_size.
 */
export const exportAudits = async (options = {}) => {
  const body = buildAuditExportPayload(options);
  const response = await genericApi.post("/api/audit/audits/export", body, {
    responseType: "blob",
  });
  return response;
};

/**
 * Download checkpoint Excel template.
 * GET /api/audit/audits/template/download
 */
export const downloadAuditCheckpointTemplate = async () => {
  try {
    const response = await genericApi.get(
      "/api/audit/audits/template/download",
      { responseType: "blob" },
    );
    // API can return JSON error with blob responseType
    const contentType = String(response?.headers?.["content-type"] || "");
    if (contentType.includes("application/json") && response?.data instanceof Blob) {
      const text = await response.data.text();
      let message = "Unable to download checkpoint template.";
      try {
        const parsed = JSON.parse(text);
        message =
          parsed?.message || parsed?.detail || parsed?.error || message;
      } catch {
        // ignore
      }
      throw new Error(String(message));
    }
    return response;
  } catch (err) {
    mapApiError(err, "Unable to download checkpoint template.");
  }
};

/**
 * Upload filled checkpoint Excel template (.xlsx only).
 * POST /api/audit/audits/template-upload  form field: file
 *
 * Returns mapped checkpoint rows for the grid when the API includes them.
 */
export const uploadAuditCheckpointTemplate = async (file) => {
  if (!(file instanceof File)) {
    throw new Error("A valid Excel file is required.");
  }

  const name = String(file.name || "").toLowerCase();
  const isXlsx =
    name.endsWith(".xlsx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!isXlsx) {
    throw new Error("Only .xlsx files are allowed.");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await genericApi.post(
      "/api/audit/audits/template-upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    const body = response?.data?.data ?? response?.data ?? {};
    assertAuditMutationSuccess(body, "Unable to upload checkpoint template.");

    const list = Array.isArray(body)
      ? body
      : Array.isArray(body.checkpoints)
        ? body.checkpoints
        : Array.isArray(body.items)
          ? body.items
          : Array.isArray(body.rows)
            ? body.rows
            : Array.isArray(response?.data)
              ? response.data
              : [];

    return {
      checkpoints: list.map((cp, index) => {
        const mapped = mapCheckpointFromApi(cp, index);
        // Template rows are drafted for editing; only keep server status when present.
        const status = String(mapped.status || mapped.checkpoint_status || "").trim();
        return {
          ...mapped,
          status,
          checkpoint_status: status,
        };
      }),
      message:
        body.message ||
        response?.data?.message ||
        "Checkpoints uploaded successfully.",
      raw: body,
    };
  } catch (err) {
    mapApiError(err, "Unable to upload checkpoint template.");
  }
};

/**
 * Coerce mixed API department payloads into unique `{ id, name }` picker options.
 * No static / mock injection.
 */
const toUniquePickerOptions = (items = []) => {
  const seen = new Set();
  const unique = [];
  for (const raw of items) {
    const option = mapDepartmentToOption(raw);
    if (!option) continue;
    const key = String(option.name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(option);
  }
  return unique.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Live department options for audit filters.
 * Tries (in order): usermanagement filter-options → departments → distinct depts from ListAudits.
 * Never falls back to MOCK_AUDITS / static lists.
 */
export const listAuditDepartmentOptions = async () => {
  // 1) User-management filter-options (same source as User Management filters)
  try {
    const response = await userManagementApi.get(
      "/api/usermanagement/filter-options",
    );
    const data = response?.data?.data ?? response?.data ?? {};
    const fromFilterOptions = toUniquePickerOptions(
      data.departments ?? data.department ?? [],
    );
    if (fromFilterOptions.length > 0) return fromFilterOptions;
  } catch {
    // continue
  }

  // 2) Dedicated departments list endpoint
  try {
    const departments = await getDepartments();
    const mapped = toUniquePickerOptions(departments);
    if (mapped.length > 0) return mapped;
  } catch {
    // continue
  }

  // 3) Distinct departments from the user's live ListAudits scope
  try {
    const response = await getAuditItems({ page: 1, page_size: 500 });
    const items = Array.isArray(response?.data) ? response.data : [];
    return toUniquePickerOptions(
      items
        .map((item) => item?.department || item?.vertical_div_deptt || "")
        .filter(Boolean),
    );
  } catch {
    return [];
  }
};

/**
 * Live audit-name options for filters (from ListAudits only — no mock).
 */
export const listAuditNameOptions = async () => {
  try {
    const response = await getAuditItems({ page: 1, page_size: 500 });
    const items = Array.isArray(response?.data) ? response.data : [];
    return toUniquePickerOptions(
      items
        .map((item) => item?.audit_name || item?.auditName || "")
        .filter(Boolean),
    );
  } catch {
    return [];
  }
};
