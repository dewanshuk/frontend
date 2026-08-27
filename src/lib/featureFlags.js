/**
 * Release-wise feature flags.
 * Controlled via environment variables:
 *   VITE_FEATURE_R0 – R0 features (Home, KnowledgeHub, FAQs, Orchestration Docs/Events, Feedback)
 *   VITE_FEATURE_R1 – R1 features (Orchestration Trainings/Bulk, Admin/User Mgmt, My Trainings)
 *   VITE_FEATURE_R2 – R2 features (Orchestration Annual Declaration, Ask AI)
 *   VITE_FEATURE_R3 – R3 features (Compliance Helpdesk, Events, Audit, Email Notification)
 *
 * Set to "true" (string) to enable a release, anything else to disable.
 */

const flag = (key) => import.meta.env[key] === "true"

export const featureFlags = {
  R0: flag("VITE_FEATURE_R0"),
  R1: flag("VITE_FEATURE_R1"),
  R2: flag("VITE_FEATURE_R2"),
  R3: flag("VITE_FEATURE_R3"),
}

/** Returns true if the given release flag is enabled (or if no release is specified). */
export const isReleaseEnabled = (release) => {
  if (!release) return true
  return featureFlags[release] ?? false
}
