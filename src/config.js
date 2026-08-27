export const DATE_FORMAT_MOMENT = "DD/MMM/YYYY";
export const DATE_FORMAT_DATEFNS = "dd/MMM/yyyy";

/** Uppercase month abbreviations for display (e.g. 17/JUL/2026). */
export const toDisplayDateString = (value) =>
  value == null || value === "" ? value : String(value).toUpperCase();

/**
 * Mock: treat the current user as an auditor for the Audit module.
 *
 * - `true`  → New Audit / authoring allowed; skip live audit-access denial for demos
 * - `false` → use live `GET /api/audit/audit-access` (and fail closed when it denies)
 *
 * Set to `false` before production or when testing non-auditor access.
 */
export const MOCK_AUDIT_AS_AUDITOR = true;

export default {
  DATE_FORMAT_MOMENT,
  DATE_FORMAT_DATEFNS,
  toDisplayDateString,
  MOCK_AUDIT_AS_AUDITOR,
};
