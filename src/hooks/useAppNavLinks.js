import { useMemo } from "react"
import { getHeaderNavLinks } from "@/lib/appNavigation"
import usePermissions from "@/lib/permissions"
import { useBackendUser } from "@/lib/UserContext"

export default function useAppNavLinks({ landingRoutes = false } = {}) {
  const backendUser = useBackendUser()
  const perms = usePermissions({ backendUser })

  return useMemo(
    () => getHeaderNavLinks(perms, { landingRoutes }),
    [landingRoutes, perms?.roles],
  )
}
