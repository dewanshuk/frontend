import { useMemo } from "react"
import { getFilteredMenuItems } from "@/lib/appNavigation"

export default function useSidePanelMenuItems(perms) {
  return useMemo(() => getFilteredMenuItems(perms), [perms?.roles])
}
