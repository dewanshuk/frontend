import { useMemo } from 'react'
import { getActiveUser } from './auth'

const DEFAULT_ADMIN_ROLES = [
  'Master Admin',
  'Policy Admin',
  'KH Admin',
  'Chief Compliance Officer',
]

const normalizeRolesFromClaim = (rolesClaim) => {
  if (!rolesClaim) return []
  if (Array.isArray(rolesClaim)) return rolesClaim.map((r) => String(r).trim()).filter(Boolean)
  if (typeof rolesClaim === 'string') return rolesClaim.split(',').map((r) => r.trim()).filter(Boolean)
  return []
}

export function deriveRolesFromUserFlags(user) {
  if (!user) return []
  const roles = ['Employee']
  if (user?.is_policy_hub_admin) roles.push('Policy Admin')
  if (user?.is_knowledge_hub_admin) roles.push('KH Admin')
  if (user?.is_master_admin) roles.push('Master Admin')
  if (user?.is_chief_compliance_officer) roles.push('Chief Compliance Officer')
  if (user?.is_audit_lead) roles.push('Audit Lead')
  if (user?.is_query_lead) roles.push('Query Lead')
  if (user?.is_complaint_lead) roles.push('Complaint Lead')
  if (user?.is_cobce_coi_gift_lead) roles.push('COBCE/COI/Gift Lead')
  return Array.from(new Set(roles))
}

export function usePermissions({ backendUser = null, adminOverride = false, adminRoles = DEFAULT_ADMIN_ROLES } = {}) {
  const msalUser = getActiveUser()

  const rolesFromClaims = useMemo(() => {
    const claims = msalUser?.idTokenClaims || {}
    const rolesClaim = claims?.roles || claims?.role || null
    return normalizeRolesFromClaim(rolesClaim)
  }, [msalUser])

  // Roles provided by the backend user object (explicit roles array or single role)
  const rolesFromBackendClaim = useMemo(() => {
    if (!backendUser) return []
    const candidate = backendUser?.roles ?? backendUser?.role ?? null
    return normalizeRolesFromClaim(candidate)
  }, [backendUser])

  // Roles derived from boolean flags on the backend user (legacy fields)
  const rolesFromFlags = useMemo(() => deriveRolesFromUserFlags(backendUser), [backendUser])

  const combinedRoles = useMemo(
    () => Array.from(new Set([...(rolesFromClaims || []), ...(rolesFromBackendClaim || []), ...(rolesFromFlags || [])])),
    [rolesFromClaims, rolesFromBackendClaim, rolesFromFlags],
  )

  const hasRole = (role) => {
    if (!role) return false
    return combinedRoles.some((r) => String(r || '').toLowerCase() === String(role || '').toLowerCase())
  }

  const hasAnyRole = (roles) => {
    if (!roles || !Array.isArray(roles)) return false
    return roles.some((role) => hasRole(role))
  }

  const hasAllRoles = (roles) => {
    if (!roles || !Array.isArray(roles)) return false
    return roles.every((role) => hasRole(role))
  }

  const can = (action, resource, options = {}) => {
    if (!action) return false
    switch (action) {
      case 'download': {
        if (!resource) return false
        if (resource.downloadAllowed === true || resource.download_allowed === true) return true
        const adminRolesToCheck = options.adminRoles ?? adminRoles
        if ((options.adminOverride ?? adminOverride) && hasAnyRole(adminRolesToCheck)) return true
        return false
      }
      default:
        return false
    }
  }

  return {
    user: msalUser,
    backendUser,
    roles: combinedRoles,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    can,
  }
}

export default usePermissions
