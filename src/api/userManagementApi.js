import { userManagementApi, withQueryString } from "./axiosInstance"

const extractTotal = (payload) => payload?.pagination?.total

/** Unwrap usersfind / ListUsers array payloads from common response shapes. */
const extractUsersfindArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.data,
    payload.users,
    payload.items,
    payload.results,
    payload.records,
    payload.data?.data,
    payload.data?.users,
    payload.data?.items,
    payload.data?.results,
    payload.data?.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

/** Maps `filter-options` `data` keys → `ListUsers` POST body keys */
export const FILTER_DATA_KEY_TO_BODY_KEY = {
  departments: "department",
  division_clusters: "division_cluster",
  divisions: "division",
  verticals: "vertical",
  designations: "designation",
  status: "status",
}

/**
 * Builds a minimal JSON body for POST /api/usermanagement/ListUsers.
 * The backend requires a JSON body on every request; optional fields are omitted.
 * - Always includes `role` and `sort_by`.
 * - Includes `q` only when trimmed length is at least 3.
 * - Omits empty array fields and omits `status` until the user selects a value.
 */
export function buildListUsersFilterBody({
  q,
  role = "all",
  sort_by,
  selectionsByDataKey = {},
} = {}) {
  const body = {
    role: role ?? "all",
  }

  if (sort_by) body.sort_by = sort_by

  const trimmedQ = String(q ?? "").trim()
  if (trimmedQ.length >= 2) {
    body.q = trimmedQ
  }

  for (const [dataKey, selected] of Object.entries(selectionsByDataKey)) {
    const bodyKey = FILTER_DATA_KEY_TO_BODY_KEY[dataKey]
    if (!bodyKey || !Array.isArray(selected) || selected.length === 0) continue

    if (bodyKey === "status") {
      body.status = String(selected[0])
      continue
    }

    body[bodyKey] = [...selected]
  }

  return body
}

export async function getFilterOptions() {
  const response = await userManagementApi.get("/api/usermanagement/filter-options")
  return response?.data?.data ?? {}
}

export async function listUsers({ page = 1, page_size = 25, filters } = {}) {
  const query = { page, page_size }
  const url = withQueryString("/api/usermanagement/ListUsers", query)

  const body =
    filters != null && typeof filters === "object" && !Array.isArray(filters)
      ? filters
      : buildListUsersFilterBody({ role: "all", sort_by: "username" })

  const response = await userManagementApi.post(url, body)

  const payload = response?.data
  const users = extractUsersfindArray(payload)
  const total =
    extractTotal(payload) ??
    payload?.pagination?.total ??
    payload?.total ??
    users.length

  return {
    users,
    total: total ?? 0,
  }
}

export async function updateUser({ staff_id, payload }) {
  const url = `/api/usermanagement/updateUser/${encodeURIComponent(staff_id)}`
  const response = await userManagementApi.patch(url, payload)
  return response?.data
}

export async function getDepartments() {
  const response = await userManagementApi.get("/api/usermanagement/departments");
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.departments)) return payload.departments;
  if (Array.isArray(payload?.department)) return payload.department;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

/**
 * Normalize a department-like value into a picker item `{ id, name }`.
 * Returns null when the value cannot be resolved to a label.
 */
export function mapDepartmentToOption(item) {
  if (item == null || item === "") return null;
  if (typeof item === "string" || typeof item === "number") {
    const name = String(item).trim();
    return name ? { id: name, name } : null;
  }
  if (typeof item !== "object") return null;

  // Prefer "<Vertical>/<Division>/<Deptt>" when parts are present
  const composed = [item.vertical, item.division, item.division_cluster, item.department]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean);
  // Avoid double-including department if division_cluster was used as division
  const pathParts = [item.vertical, item.division || item.division_cluster, item.department]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean);

  const name = String(
    (pathParts.length >= 2 ? pathParts.join("/") : "") ||
      item.full_name ||
      item.fullName ||
      item.display_name ||
      item.displayName ||
      item.name ||
      item.department_name ||
      item.departmentName ||
      item.department ||
      item.label ||
      item.value ||
      item.title ||
      composed.join("/") ||
      "",
  ).trim();
  if (!name) return null;

  const id =
    item.id ??
    item.department_id ??
    item.departmentId ??
    item.code ??
    name;
  return { id, name };
}

export const USER_ROLE_FLAGS = Object.freeze({
  MASTER_ADMIN: "is_master_admin",
  POLICY_HUB_ADMIN: "is_policy_hub_admin",
  KNOWLEDGE_HUB_ADMIN: "is_knowledge_hub_admin",
  CHIEF_COMPLIANCE_OFFICER: "is_chief_compliance_officer",
  AUDIT_LEAD: "is_audit_lead",
  COBCE_COI_GIFT_LEAD: "is_cobce_coi_gift_lead",
  COMPLAINT_LEAD: "is_complaint_lead",
  QUERY_LEAD: "is_query_lead",
});

/**
 * Load organization departments for audit form dropdowns.
 * Returns unique alphabetical `{ id, name }` options (no static/mock data).
 */
export async function listDepartmentOptions() {
  const data = await getDepartments();
  const seen = new Set();
  const options = [];
  for (const item of Array.isArray(data) ? data : []) {
    const option = mapDepartmentToOption(item);
    if (!option) continue;
    const key = String(option.name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(option);
  }
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

const mapUsersFindRow = (user) => {
  if (!user || typeof user !== "object") return null;
  const staffId = String(
    user.staff_id ??
      user.staffId ??
      user.employee_id ??
      user.employeeId ??
      user.id ??
      "",
  ).trim();
  const username = String(
    user.username ??
      user.user_name ??
      user.userName ??
      user.name ??
      user.full_name ??
      user.fullName ??
      user.display_name ??
      user.displayName ??
      "",
  ).trim();
  if (!staffId && !username) return null;
  return {
    username: username || staffId,
    staff_id: staffId || username,
  };
};

const toAuditPersonOption = (user) => {
  if (!user) return null;
  // Support both raw API rows and already-mapped { username, staff_id } shapes.
  const hasKnownId =
    user.staff_id != null ||
    user.staffId != null ||
    user.username != null ||
    user.name != null;
  const mapped = hasKnownId ? user : mapUsersFindRow(user);
  if (!mapped) return null;
  const staffId = String(
    mapped.staff_id ?? mapped.staffId ?? mapped.id ?? "",
  ).trim();
  const username = String(
    mapped.username ?? mapped.user_name ?? mapped.name ?? "",
  ).trim();
  if (!staffId && !username) return null;
  const id = staffId || username;
  const name =
    username && staffId && username !== staffId
      ? `${username} (${staffId})`
      : username || staffId;
  return { id, name, username: username || id, staff_id: id };
};

/**
 * Shared GET /api/usermanagement/usersfind
 *
 * - Auditor: pass `role=is_audit_lead` (no role for Auditee).
 * - `query` is only sent when length >= 3; omitting it loads the default list.
 * - Never sends role when role is empty / "all".
 */
export async function findUsers({ role, query } = {}) {
  const params = {};
  const roleValue = String(role ?? "").trim();
  if (roleValue && roleValue !== "all") {
    params.role = roleValue;
  }

  const trimmedQuery = String(query ?? "").trim();
  if (trimmedQuery.length >= 3) {
    params.query = trimmedQuery;
  }

  // Auditor open: GET .../usersfind?role=is_audit_lead
  // Auditee open: GET .../usersfind
  // With filter:   GET .../usersfind?query=kar  (no role) OR + role for auditors
  const url = withQueryString("/api/usermanagement/usersfind", params);
  const response = await userManagementApi.get(url);
  const list = extractUsersfindArray(response?.data);

  return list.map(mapUsersFindRow).filter((item) => item?.staff_id);
}

/**
 * Search auditors — GET usersfind with role=is_audit_lead.
 * Lists on open; query attached only when ≥ 3 characters.
 */
export async function searchAuditorsForAudit(query = "") {
  const users = await findUsers({
    role: USER_ROLE_FLAGS.AUDIT_LEAD,
    query,
  });
  return users.map(toAuditPersonOption).filter(Boolean);
}

/**
 * Search auditees — GET usersfind with NO role parameter.
 * Lists on open (bare /usersfind); query attached only when ≥ 3 characters.
 * Completely separate from auditor API (no role ever sent).
 */
export async function searchAuditeesForAudit(query = "") {
  const users = await findUsers({
    // intentionally no role
    query,
  });
  return users.map(toAuditPersonOption).filter(Boolean);
}

/**
 * @deprecated Prefer {@link searchAuditeesForAudit} (usersfind without role).
 * Kept for any callers that still pass a role into ListUsers.
 */
export async function searchUsersForAudit({ query = "", role = "all" } = {}) {
  const trimmed = String(query || "").trim();
  // Route audit-style lookups to usersfind when possible
  if (!role || role === "all") {
    return searchAuditeesForAudit(trimmed);
  }
  if (role === USER_ROLE_FLAGS.AUDIT_LEAD || role === "is_audit_lead") {
    return searchAuditorsForAudit(trimmed);
  }

  const body = buildListUsersFilterBody({
    q: query,
    role: role || "all",
    sort_by: "username",
  });
  const { users } = await listUsers({ page: 1, page_size: 25, filters: body });
  return (Array.isArray(users) ? users : [])
    .map((user) => toAuditPersonOption(user))
    .filter(Boolean);
}

export const USER_ROLE_FLAG_VALUES = Object.freeze(Object.values(USER_ROLE_FLAGS))

/**
 * Map a compliance helpdesk request type to the usersfind `role` query param.
 * - Query → is_query_lead
 * - Complaint → is_complaint_lead
 * - Gift / Self / COBCE / COI → is_cobce_coi_gift_lead
 * Annual Declaration has no assign role (button stays disabled).
 */
export function getComplianceAssignRole(type) {
  const key = String(type ?? "").toLowerCase().trim()
  if (!key) return null

  if (key.includes("query") || key === "queries") {
    return USER_ROLE_FLAGS.QUERY_LEAD
  }
  if (key.includes("complaint")) {
    return USER_ROLE_FLAGS.COMPLAINT_LEAD
  }
  if (
    key.includes("gift") ||
    key.includes("self") ||
    key.includes("cobce") ||
    key.includes("coi")
  ) {
    return USER_ROLE_FLAGS.COBCE_COI_GIFT_LEAD
  }

  return null
}

/**
 * Find users by role (and optional name/staff-id prefix search).
 * GET /api/usermanagement/usersfind?role=...&query=...
 * `role` is always required; `query` is sent only when trimmed length >= 3.
 */
export async function findUsersByRole({ role, query } = {}) {
  const roleValue = String(role ?? "").trim()
  if (!roleValue) {
    throw new Error("role is required")
  }
  return findUsers({ role: roleValue, query })
}

export async function getCurrentUserDetails() {
  try {
    const response = await userManagementApi.get('/api/usermanagement/userDetails')
    return response?.data?.data ?? response?.data ?? null
  } catch (err) {
    return null
  }
}

/**
 * Validate emails against the user directory.
 * @param {string[]} emails - Format-valid email addresses to check
 * @returns {Promise<{
 *   acceptedCount: number,
 *   rejectedCount: number,
 *   acceptedEmails: string[],
 *   rejectedEmails: string[],
 * }>}
 */
export async function validateEmails(emails = []) {
  const payload = Array.isArray(emails)
    ? emails.map((email) => String(email ?? "").trim()).filter(Boolean)
    : []

  const response = await userManagementApi.post(
    "/api/usermanagement/validate-emails",
    payload,
  )

  const data = response?.data?.data ?? response?.data ?? {}
  return {
    acceptedCount: Number(data.acceptedCount) || 0,
    rejectedCount: Number(data.rejectedCount) || 0,
    acceptedEmails: Array.isArray(data.acceptedEmails) ? data.acceptedEmails : [],
    rejectedEmails: Array.isArray(data.rejectedEmails) ? data.rejectedEmails : [],
  }
}
