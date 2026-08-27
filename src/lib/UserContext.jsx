import { createContext, useContext } from 'react'
import { getUserDisplayName } from './auth'

export const UserContext = createContext({ backendUser: null })

export function useBackendUser() {
  return useContext(UserContext).backendUser
}

/** Prefer the name from /userDetails; fall back to the Azure AD account. */
export function useDisplayName(account) {
  const backendUser = useBackendUser()
  const backendName = String(backendUser?.name || '').trim()
  return backendName || getUserDisplayName(account)
}
