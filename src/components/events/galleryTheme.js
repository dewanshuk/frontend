/**
 * Gallery / Events palette.
 *
 * Anchored on the two brand marks used in the header:
 *  - Maruti Suzuki wordmark + ECP logo: #171c8f (sampled from both PNGs)
 *  - Compliance Connect: cool blue → turquoise range
 *
 * Layout is a deep navy hero band over a light, cool-tinted body. Content on
 * the band is white-on-dark; content on the body is dark-on-light. Keep the two
 * straight when adding elements — a frosted white panel that works on the band
 * will disappear on the body.
 *
 * NOTE: Tailwind scans source as plain text, so every class string below is
 * written out literally. Do not build them by interpolating the hex constants —
 * the generated utility would never make it into the stylesheet.
 */

/** Brand navy, sampled from maruti-suzuki-logo.png and ecp-logo.png. */
export const BRAND_NAVY = "#171c8f";

/** Accent ramp: brand blue → cyan → turquoise → sea green. */
export const ACCENT_BLUE = "#2563eb";
export const ACCENT_CYAN = "#22d3ee";
export const ACCENT_TURQUOISE = "#2dd4bf";
export const ACCENT_SEA = "#14b8a6";

/** Warm accent ramp: red → orange (blended with the cool palette). */
export const ACCENT_RED = "#ef4444";
export const ACCENT_ORANGE = "#f97316";

/* ------------------------------------------------------- page-level fields */

/**
 * Page body field: a light wash in the same cool ramp. Kept off pure white so
 * the white media cards still read as lifted surfaces against it.
 */
export const GALLERY_PAGE_BACKGROUND =
  "linear-gradient(160deg, #eff6ff 0%, #e0f2fe 25%, #cffafe 50%, #ccfbf1 75%, #ecfdf5 100%)";

/**
 * Hero band stays deep — it carries the brand navy behind the logo lockup and
 * gives the light body something to sit against.
 */
export const GALLERY_HERO_BACKGROUND =
  "linear-gradient(100deg, #e8f0fe 0%, #d0edfb 45%, #d4f5f0 100%)";

/* --------------------------------------------------------------- surfaces */

/** Panel / card edge and its shadow on the light body field. */
export const FIELD_BORDER = "border-[#cfe3f0]";
export const FIELD_SHADOW = "shadow-[0_8px_26px_rgba(15,47,87,0.1)]";

/** Media well behind a photo or video thumbnail. */
export const SURFACE_MEDIA_WELL = "bg-[#e6f7f8]";

/** Text on light surfaces. */
export const TEXT_HEADING = "text-[#0f2f57]";
export const TEXT_BODY = "text-[#20505c]";
export const TEXT_MUTED = "text-[#4a7f87]";

/** Teal-tinted chrome for icon buttons on light surfaces. */
export const ICON_BUTTON =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#a7ece5] bg-white text-[#0f766e] shadow-sm transition hover:bg-[#f0fdfa] disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Tag chips — cool ramp from brand navy through cyan to sea green.
 * Cycled per tag so a long tag row still reads as a set.
 */
export const TAG_CHIPS = [
  "bg-[#e8eaff] text-[#252a9c] ring-[#c7cbf4]",
  "bg-[#ccfbf1] text-[#0f766e] ring-[#99f6e4]",
  "bg-[#cffafe] text-[#0e7490] ring-[#a5f3fc]",
  "bg-[#dbeafe] text-[#1d4ed8] ring-[#bfdbfe]",
  "bg-[#fee2e2] text-[#b91c1c] ring-[#fca5a5]",
  "bg-[#ffedd5] text-[#c2410c] ring-[#fdba74]",
];

/** Avatar / monogram gradients drawn from the same ramp. */
export const AVATAR_GRADIENTS = [
  "from-[#171c8f] to-[#2563eb]",
  "from-[#0ea5e9] to-[#22d3ee]",
  "from-[#22d3ee] to-[#14b8a6]",
  "from-[#ef4444] to-[#f97316]",
  "from-[#2563eb] to-[#2dd4bf]",
];
