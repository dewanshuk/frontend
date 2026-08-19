import { ELECTRIC_BLUE, MARUTI_BLUE } from "@/components/landing/landingTheme"

export const SIDEBAR_BG = "#F8F7FC"
export const CARD_BG = "#EFEDFF"
export const PURPLE = "#7C3AED"
export const PURPLE_SOFT = "#A78BFA"

export function getAskAiTheme(variant = "default") {
  if (variant === "landing") {
    return {
      primary: MARUTI_BLUE,
      accent: ELECTRIC_BLUE,
      accentSoft: "#60a5fa",
      sidebarBg: "#f4f4f4",
      cardBg: "#eef2ff",
      ringClass: "focus-visible:ring-[#2563eb]/40",
      borderClass: "border-[#d9d9d9]",
      scrollbarClass: "scrollbar-thumb-[#2563eb]/25",
    }
  }

  return {
    primary: PURPLE,
    accent: PURPLE,
    accentSoft: PURPLE_SOFT,
    sidebarBg: SIDEBAR_BG,
    cardBg: CARD_BG,
    ringClass: "focus-visible:ring-violet-400",
    borderClass: "border-violet-100/80",
    scrollbarClass: "scrollbar-thumb-violet-200",
  }
}
