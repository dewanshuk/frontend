import { buildComplianceActivityPath } from "./recentActivityUtils";

/**
 * Resolve the navigation target for a "Due for me" row: trainings open the
 * LMS link supplied by the API, declarations deep-link into the matching
 * Compliance Helpdesk item. Everything else stays non-interactive.
 */
export const getDueItemTarget = (item) => {
  if (!item) return null;

  if (item.source === "training") {
    const href = String(item.link || "").trim();
    if (!href) return null;
    return href.startsWith("/")
      ? { kind: "internal", path: href }
      : { kind: "external", href };
  }

  if (item.source === "declaration") {
    return { kind: "internal", path: buildComplianceActivityPath(item) };
  }

  return null;
};
