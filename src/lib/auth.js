import { PublicClientApplication } from '@azure/msal-browser'

const normalizeScopes = (rawScopes) => {
  if (!rawScopes) {
    return ['openid', 'profile', 'email']
  }

  const scopes = rawScopes
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean)

  return scopes.length ? scopes : ['openid', 'profile', 'email']
}

const tenantId = import.meta.env.VITE_AZURE_AD_TENANT_ID
const clientId = import.meta.env.VITE_AZURE_AD_CLIENT_ID

const msalConfig = {
  auth: {
    clientId: clientId ?? '',
    authority: tenantId ? `https://login.microsoftonline.com/${tenantId}` : undefined,
    redirectUri: import.meta.env.VITE_AZURE_AD_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_AD_POST_LOGOUT_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

const loginRequest = {
  scopes: normalizeScopes(import.meta.env.VITE_AZURE_AD_SCOPES),
}

const LOGIN_HINT_KEY = 'msalLoginHint'
const EXPLICIT_LOGOUT_KEY = 'msalExplicitLogout'
const USER_PHOTO_KEY = 'userPhoto'
const USER_PHOTO_STATUS_KEY = 'userPhotoStatus'
const USER_PHOTO_AVAILABLE = 'available'
const USER_PHOTO_UNAVAILABLE = 'unavailable'

let msalClient = null

const isAzureAdConfigured = Boolean(tenantId && clientId)

const getMsalClient = () => {
  if (!isAzureAdConfigured) {
    return null
  }

  if (!msalClient) {
    msalClient = new PublicClientApplication(msalConfig)
  }

  return msalClient
}

const ensureActiveAccount = (client) => {
  const activeAccount = client.getActiveAccount()
  if (activeAccount) {
    return activeAccount
  }

  const [firstAccount] = client.getAllAccounts()
  if (firstAccount) {
    client.setActiveAccount(firstAccount)
    return firstAccount
  }

  return null
}

/** Keep the last signed-in identity so ssoSilent can target it on a return visit. */
const rememberLoginHint = (account) => {
  if (typeof window === 'undefined' || !account) return

  const hint = [
    account.username,
    account.idTokenClaims?.preferred_username,
    account.idTokenClaims?.login_hint,
  ]
    .map((value) => String(value || '').trim())
    .find(Boolean)

  if (hint) {
    window.localStorage.setItem(LOGIN_HINT_KEY, hint)
  }
}

const getStoredLoginHint = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(LOGIN_HINT_KEY) || ''
}

const clearStoredLoginHint = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOGIN_HINT_KEY)
}

const markExplicitLogout = () => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(EXPLICIT_LOGOUT_KEY, 'true')
}

/**
 * True once after the user signs out. Silent SSO is skipped for that first
 * login attempt so a surviving Entra cookie cannot sign them back in without
 * their consent.
 */
const consumeExplicitLogout = () => {
  if (typeof window === 'undefined') return false
  const wasExplicit = window.localStorage.getItem(EXPLICIT_LOGOUT_KEY) === 'true'
  window.localStorage.removeItem(EXPLICIT_LOGOUT_KEY)
  return wasExplicit
}

export const getUserInitials = (name, username) => {
  const source = String(name || username || '').trim()
  if (!source) return 'U'

  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

/** Build the display name from Azure AD's explicit first/last-name claims. */
export const getUserDisplayName = (account) => {
  if (!account || typeof account !== 'object') return ''

  const claims = account.idTokenClaims || {}
  const givenFamily = [claims.given_name, claims.family_name]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim()

  if (givenFamily) return givenFamily

  // Do not use account.name or claims.name: those values may contain the
  // directory display name rather than the required given/family name.
  const fallback = [
    account.username,
    claims.preferred_username,
    claims.email,
    account.email,
  ]
    .map((value) => String(value || '').trim())
    .find(Boolean)

  if (!fallback) return ''
  return fallback.includes('@') ? fallback.split('@')[0] : fallback
}

const getPhotoFromAccount = (account) => {
  const claimPicture = account?.idTokenClaims?.picture
  if (typeof claimPicture === 'string' && claimPicture.trim()) {
    return claimPicture.trim()
  }
  return null
}

const getUserPhotoStatus = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(USER_PHOTO_STATUS_KEY)
}

export const clearUserPhotoCache = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(USER_PHOTO_KEY)
  window.localStorage.removeItem(USER_PHOTO_STATUS_KEY)
}

const cacheUserPhoto = (photo) => {
  if (typeof window === 'undefined') return

  if (photo) {
    window.localStorage.setItem(USER_PHOTO_KEY, photo)
    window.localStorage.setItem(USER_PHOTO_STATUS_KEY, USER_PHOTO_AVAILABLE)
    return
  }

  window.localStorage.removeItem(USER_PHOTO_KEY)
  window.localStorage.setItem(USER_PHOTO_STATUS_KEY, USER_PHOTO_UNAVAILABLE)
}

export const markUserPhotoUnavailable = () => {
  cacheUserPhoto(null)
}

export const cacheProfilePhotoIfNeeded = async (accessToken, account) => {
  if (typeof window === 'undefined') return

  const status = getUserPhotoStatus()
  if (status === USER_PHOTO_AVAILABLE || status === USER_PHOTO_UNAVAILABLE) {
    return
  }

  if (window.localStorage.getItem(USER_PHOTO_KEY)) {
    window.localStorage.setItem(USER_PHOTO_STATUS_KEY, USER_PHOTO_AVAILABLE)
    return
  }

  const tokenPicture = getPhotoFromAccount(account)
  if (tokenPicture) {
    cacheUserPhoto(tokenPicture)
    return
  }

  if (!accessToken) {
    cacheUserPhoto(null)
    return
  }

  const photo = await fetchProfilePhoto(accessToken)
  cacheUserPhoto(photo)
}

const getCachedUserPhoto = () => {
  if (typeof window === 'undefined') return null
  if (getUserPhotoStatus() !== USER_PHOTO_AVAILABLE) return null
  return window.localStorage.getItem(USER_PHOTO_KEY) || null
}

// Fetch the signed-in user's profile photo from Microsoft Graph and return a data URL.
export const fetchProfilePhoto = async (accessToken) => {
  if (typeof window === 'undefined' || !accessToken) return null

  try {
    const resp = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!resp.ok) return null

    const blob = await resp.blob()

    // Convert blob -> data URL
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    return dataUrl
  } catch (err) {
    return null
  }
}

export const isDevelopmentAuthBypassEnabled = () => {
  return import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true'
}

/** When true, unauthenticated users see the public landing page and must log in to open app routes. */
export const isLoginRequired = () => {
  if (isDevelopmentAuthBypassEnabled()) return false
  return import.meta.env.VITE_IS_AZURE_ENABLED === 'true'
}

export const isAzureAdEnabled = () => isAzureAdConfigured

const HEAD_ROLE_PATTERN = /head|admin|manager|lead/i

export const resolveUserViewMode = (account) => {
  const configuredDefault = import.meta.env.VITE_DEFAULT_VIEW_MODE
  if (configuredDefault === 'head' || configuredDefault === 'employee') {
    return configuredDefault
  }

  const roles = account?.idTokenClaims?.roles
  if (Array.isArray(roles) && roles.some((role) => HEAD_ROLE_PATTERN.test(String(role)))) {
    return 'head'
  }

  const jobTitle = String(account?.idTokenClaims?.jobTitle || '')
  if (HEAD_ROLE_PATTERN.test(jobTitle)) {
    return 'head'
  }

  return 'employee'
}

export const initializeAuth = async () => {
  const client = getMsalClient()
  if (!client) {
    return false
  }

  await client.initialize()

  // Completes full-page redirect SSO when the browser returns from Entra.
  const redirectResult = await client.handleRedirectPromise()
  if (redirectResult?.account) {
    client.setActiveAccount(redirectResult.account)
    rememberLoginHint(redirectResult.account)

    if (typeof window !== 'undefined' && redirectResult.accessToken) {
      try {
        await cacheProfilePhotoIfNeeded(redirectResult.accessToken, redirectResult.account)
      } catch {
        // ignore photo fetch failures
      }
    }

    return true
  }

  const account = ensureActiveAccount(client)
  if (!account) {
    return false
  }

  try {
    const response = await client.acquireTokenSilent({
      ...loginRequest,
      account,
    })

    rememberLoginHint(account)

    // Ensure profile photo cached once on startup (avoid repeated fetches)
    if (typeof window !== 'undefined' && response?.accessToken) {
      try {
        await cacheProfilePhotoIfNeeded(response.accessToken, account)
      } catch {
        // ignore photo fetch failures
      }
    }

    return true
  } catch {
    return false
  }
}

const POST_LOGIN_REDIRECT_KEY = 'ecpPostLoginRedirect'

export const setPostLoginRedirect = (path) => {
  if (typeof window === 'undefined') return
  const value = typeof path === 'string' && path.startsWith('/') ? path : '/'
  window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, value)
}

export const consumePostLoginRedirect = () => {
  if (typeof window === 'undefined') return null
  const value = window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY)
  window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY)
  return value && value.startsWith('/') ? value : null
}

/**
 * Interactive SSO via full-page redirect — same navigation style as logoutRedirect.
 * Does not use loginPopup or ssoSilent (those open popups/iframes).
 * This call navigates the browser to Entra; it only "returns" if redirect fails to start.
 */
export const loginWithAzureAd = async () => {
  const client = getMsalClient()
  if (!client) {
    throw new Error('Azure AD is not configured. Set tenant/client IDs in env.')
  }

  await client.initialize()
  // Clear any in-flight redirect response so a new login can start cleanly.
  await client.handleRedirectPromise()

  const cameFromLogout = consumeExplicitLogout()

  // Full-page redirect to Microsoft login (mirrors logoutWithAzureAd → logoutRedirect).
  await client.loginRedirect({
    ...loginRequest,
    ...(cameFromLogout ? { prompt: 'select_account' } : {}),
  })

  // Browser should have left this page. If execution continues, redirect did not run.
  return { mode: 'redirect' }
}

export const getAccessToken = async () => {
  const client = getMsalClient()
  if (!client) return null

  await client.initialize()

  const account = ensureActiveAccount(client)
  if (!account) return null

  try {
    const response = await client.acquireTokenSilent({ ...loginRequest, account })

    // Fetch and cache profile photo once when we successfully get a token
    if (typeof window !== 'undefined' && response?.accessToken) {
      try {
        await cacheProfilePhotoIfNeeded(response.accessToken, account)
      } catch {
        // ignore photo fetch failures
      }
    }

    return response.accessToken ?? null
  } catch {
    // Silent acquisition failed; caller should trigger interactive login
    return null
  }
}

export const getActiveUser = () => {
  const client = getMsalClient()
  if (!client) return null
  const account = client.getActiveAccount()
  if (!account) return null

  // Attach cached photo (if any) to the account object without mutating MSAL internal object
  const photo = getCachedUserPhoto() || getPhotoFromAccount(account)

  return { ...account, photo }
}

export const logoutWithAzureAd = async () => {
  const client = getMsalClient()
  if (!client) return

  await client.initialize()
  const account = ensureActiveAccount(client)
  const logoutHint = [
    account?.idTokenClaims?.login_hint,
    account?.username,
  ]
    .map((value) => String(value || '').trim())
    .find(Boolean)

  clearUserPhotoCache()
  // Drop the hint so the next sign-in can pick a different account.
  clearStoredLoginHint()
  markExplicitLogout()

  // End the Entra session too, otherwise the SSO cookie signs the user straight
  // back in the next time they open a protected route.
  await client.logoutRedirect({
    account: account ?? undefined,
    // Skips the "Pick an account to sign out" screen.
    logoutHint: logoutHint || undefined,
    // Land on /login directly (avoids / → auth-gate → /login flicker).
    postLogoutRedirectUri: `${window.location.origin}/login`,
  })
}
