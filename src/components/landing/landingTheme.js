import { cn } from "@/lib/utils";

export const MARUTI_BLUE = "#171c8f";
export const ELECTRIC_BLUE = "#2563eb";

/** Shared content column gutters (grid-icon / My Compliance Space edges). */
export const LANDING_SHELL_GUTTER = "px-6 md:px-10 lg:px-[60px] xl:px-[100px] 2xl:px-[140px]";

/**
 * Full available width with shared side gutters — no fixed max-width.
 * Fixed max-w (e.g. 1680) left dead side space when browser/CSS zoom
 * made the layout box still larger than 1680; content failed to expand
 * left/right to the chrome edges.
 */
export function landingShellInnerClassName(className = "") {
  return cn("mx-auto w-full min-w-0 max-w-full", LANDING_SHELL_GUTTER, className);
}

/**
 * Text / body column when scale host is full-bleed (heroes at 100% width).
 * Keeps copy under grid icon → My Compliance Space while media is edge-to-edge.
 */
export function landingPageContentClassName(className = "") {
  return cn(
    "mx-auto w-full min-w-0 max-w-full",
    LANDING_SHELL_GUTTER,
    className,
  );
}

/** Home dashboards — same text column as landing (use with fullBleed scale host). */
export function homePageShellClassName(className = "") {
  return landingPageContentClassName(className);
}

/**
 * Hero carousel slide text — extra horizontal inset so prev/next arrows
 * (size-16 + outer offsets) do not overlap copy.
 */
export function landingHeroSlideClassName(className = "") {
  return cn(
    "relative z-[3] mx-auto h-full w-full min-w-0 max-w-full",
    // Extra left inset so prev arrow / rail clears copy; right slightly less
    "pl-32 pr-24 md:pl-36 md:pr-28 lg:pl-40 lg:pr-32",
    className,
  );
}

/** @deprecated Use useAppNavLinks() — kept for backwards compatibility */
export const APP_NAV_LINKS = [];
export const LANDING_NAV_LINKS = [];

/**
 * Only the login screen is public. Every other route (landing, /v2/*, profile,
 * orchestration, …) requires an authenticated session.
 */
export const isPublicAppRoute = (pathname = "") => pathname === "/login";
