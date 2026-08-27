import { MARUTI_BLUE } from "@/components/landing/landingTheme"

/**
 * CompliAI palette — indigo/blue → teal. Deliberately avoids pink/purple while
 * still reading as an "AI" surface, and keeps Maruti navy as the anchor tone.
 */
export const ASK_AI_PALETTE = {
  navy: MARUTI_BLUE, // #171c8f — headings, primary
  blue: "#2563eb", // primary accent / links
  teal: "#0d9488", // secondary accent
  cyan: "#06b6d4", // highlights, sparkles
  tintBlue: "#eff6ff",
  tintTeal: "#f0fdfa",
  tintCyan: "#ecfeff",
  // Deeper icon tones + stronger chip fills for the "Try these examples" cards.
  deepBlue: "#1d4ed8",
  deepCyan: "#0e7490",
  deepTeal: "#0f766e",
  fillBlue: "#dbeafe",
  fillCyan: "#cffafe",
  fillTeal: "#ccfbf1",
}

/** Page-level backdrop for the CompliAI screen. */
export const ASK_AI_PAGE_GRADIENT =
  "linear-gradient(160deg, #f5f9ff 0%, #eef4ff 26%, #f4fbfd 58%, #eefaf8 100%)"

export const SIDEBAR_BG = "#ffffff"
export const CARD_BG = ASK_AI_PALETTE.tintBlue

const SHARED = {
  accentSoft: "#38bdf8",
  // Slightly translucent so the page gradient reads through the cards.
  sidebarBg: "rgba(255,255,255,0.88)",
  panelBg: "rgba(255,255,255,0.82)",
  cardBg: ASK_AI_PALETTE.tintBlue,
  activeBg: ASK_AI_PALETTE.tintBlue,
  iconBg: ASK_AI_PALETTE.tintBlue,
  gradient: `linear-gradient(90deg, ${ASK_AI_PALETTE.navy} 0%, ${ASK_AI_PALETTE.blue} 55%, ${ASK_AI_PALETTE.cyan} 100%)`,
  ringClass: "focus-visible:ring-[#2563eb]/40",
  borderClass: "border-[#dbe6f5]",
  scrollbarClass: "scrollbar-thumb-[#2563eb]/25",
  /**
   * Rotating tints for the suggested-prompt cards.
   * `chipBg`/`chipFg` = icon tile (saturated fill, dark icon stroke).
   * `cardBg` = highlighted card surface behind the whole prompt.
   */
  promptChips: [
    {
      fg: ASK_AI_PALETTE.deepBlue,
      chipBg: ASK_AI_PALETTE.fillBlue,
      cardBg: ASK_AI_PALETTE.tintBlue,
      border: ASK_AI_PALETTE.blue,
    },
    {
      fg: ASK_AI_PALETTE.deepCyan,
      chipBg: ASK_AI_PALETTE.fillCyan,
      cardBg: ASK_AI_PALETTE.tintCyan,
      border: "#0891b2",
    },
    {
      fg: ASK_AI_PALETTE.deepTeal,
      chipBg: ASK_AI_PALETTE.fillTeal,
      cardBg: ASK_AI_PALETTE.tintTeal,
      border: ASK_AI_PALETTE.teal,
    },
  ],
}

export function getAskAiTheme(variant = "default") {
  if (variant === "landing") {
    return {
      ...SHARED,
      primary: ASK_AI_PALETTE.navy,
      accent: ASK_AI_PALETTE.blue,
    }
  }

  return {
    ...SHARED,
    primary: ASK_AI_PALETTE.navy,
    accent: ASK_AI_PALETTE.blue,
  }
}
