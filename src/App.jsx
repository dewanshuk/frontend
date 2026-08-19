import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import HeadHome from './pages/HeadHome'
import EmployeeHome from './pages/EmployeeHome'
import KnowledgeHub from './pages/knowledgeHub'
import FAQ from './pages/FAQ'
import KnowledgeItemDetail from './pages/KnowledgeItemDetail'
import Login from './pages/Login'
import { TopBar } from './components/shared/TopBar'
import { SidePanel } from './components/shared/SidePanel'
import { cn } from './lib/utils'
import Orchestration from './pages/Orchestration'
import OrchestrationBulkUpdate from './pages/OrchestrationBulkUpdate'
import OrchestrationAddTraining from './pages/OrchestrationAddTraining'
import OrchestrationAnnualDeclaration from './pages/OrchestrationAnnualDeclaration'
import UserManagement from './pages/UserManagement'
import ComplianceHelpdesk from './pages/ComplianceHelpdesk'
import SelfDeclaration from './pages/SelfDeclaration'
import {
  initializeAuth,
  isAzureAdEnabled,
  isDevelopmentAuthBypassEnabled,
  isLoginRequired,
  loginWithAzureAd,
  logoutWithAzureAd,
  getActiveUser,
  clearUserPhotoCache,
  setPostLoginRedirect,
  consumePostLoginRedirect,
} from './lib/auth'
import { getCurrentUserDetails } from './api/userManagementApi'
import { UserContext } from './lib/UserContext'
import AskAI from './pages/AskAI'
import { FeedbackModalProvider } from './components/shared/feedback-modal-provider'
import OrchestrationTraining from './components/orchestrationTraining/OrchestrationTraining'
import MyTrainings from './pages/MyTrainings'
import LandingPage from './pages/LandingPage'
import LandingPage2 from './pages/LandingPage2'
import LandingExamplePage from './pages/LandingExamplePage'
import LandingFaqPage from './pages/LandingFaqPage'
import LandingAskAiPage from './pages/LandingAskAiPage'
import LandingKnowledgeHubPage from './pages/LandingKnowledgeHubPage'
import LandingEventsPage from './pages/LandingEventsPage'
import LandingKnowledgeItemDetailPage from './pages/LandingKnowledgeItemDetailPage'
import LandingEventGalleryPage from './pages/LandingEventGalleryPage'
import LandingComplianceHelpdeskPage from './pages/LandingComplianceHelpdeskPage'
import LandingSelfDeclarationPage from './pages/LandingSelfDeclarationPage'
import LandingTrainingsPage from './pages/LandingTrainingsPage'
import LandingV2Shell from './components/landing/LandingV2Shell'
import Events from './pages/Events'
import EventGallery from './pages/EventGallery'
import { AuthNavigationProvider } from './context/AuthNavigationContext'
import LandingPageLayout from './components/landing/LandingPageLayout'
import { LANDING_V1_BASE, LANDING_V2_BASE, PROFILE_PATH, getProfileHomePath, isProfileHomePath } from './lib/appNavigation'
import AuditDashboard from './pages/AuditDashboard'
import AuditDetails from './pages/AuditDetails'
import AuditNew from './pages/AuditNew'

function LegacyLandingRouteRedirect() {
  const location = useLocation()
  const nextPath = location.pathname.replace(/^\/landing-example/, LANDING_V2_BASE)
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />
}

/**
 * When true: `/` always shows LandingPage2. Profile dashboards live at
 * `/profile` → `/home/head` | `/home/employee` based on API `show_head_view`.
 * When false: app shell hosts profile routes; `/` redirects to `/profile`.
 */
const USE_LANDING_PAGE = import.meta.env.VITE_USE_LANDING_PAGE === 'true'

function shouldShowHeadView(userDetails) {
  const value = userDetails?.show_head_view ?? userDetails?.showHeadView
  return value === true || value === 1 || String(value).toLowerCase() === 'true'
}

/** Sends the user to the role dashboard. Defaults to employee home. */
function ProfileHomeRedirect({ viewMode = 'employee' }) {
  return <Navigate to={getProfileHomePath(viewMode)} replace />
}

/** Redirect legacy `/events/:eventId/gallery` → `/gallery/:eventId/gallery` */
function LegacyEventGalleryRedirect({ landing = false }) {
  const { eventId } = useParams()
  const base = landing ? `${LANDING_V2_BASE}/gallery` : '/gallery'
  return <Navigate to={`${base}/${encodeURIComponent(eventId || '')}/gallery`} replace />
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [activeUser, setActiveUser] = useState(null)
  const [backendUser, setBackendUser] = useState(null)
  const [viewMode, setViewMode] = useState('employee')

  const loginRequired = isLoginRequired()
  const isAzureEnabled = import.meta.env.VITE_IS_AZURE_ENABLED === 'true'
  const isDevBypassEnabled = isDevelopmentAuthBypassEnabled()
  const azureAdEnabled = isAzureEnabled && isAzureAdEnabled()

  const fetchBackendUser = useCallback(async () => {
    try {
      const backend = await getCurrentUserDetails()
      setBackendUser(backend)
      setViewMode(shouldShowHeadView(backend) ? 'head' : 'employee')
      return backend
    } catch {
      setBackendUser(null)
      setViewMode('employee')
      return null
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadBackendUser = async () => {
      try {
        const backend = await getCurrentUserDetails()
        if (isMounted) {
          setBackendUser(backend)
          setViewMode(shouldShowHeadView(backend) ? 'head' : 'employee')
        }
        return backend
      } catch {
        if (isMounted) {
          setBackendUser(null)
          setViewMode('employee')
        }
        return null
      }
    }

    if (!loginRequired) {
      setIsAuthenticated(true)
      loadBackendUser().finally(() => {
        if (isMounted) setIsCheckingAuth(false)
      })
      return undefined
    }

    const runSilentSignIn = async () => {
      if (!azureAdEnabled) {
        if (isMounted) {
          setIsAuthenticated(false)
          setIsCheckingAuth(false)
        }
        return
      }

      try {
        const hasValidSession = await initializeAuth()
        if (!isMounted) return

        setIsAuthenticated(hasValidSession)
        if (hasValidSession) {
          const user = getActiveUser()
          setActiveUser(user)
          await loadBackendUser()

          // After full-page SSO return, send the user to the intended app page.
          const pendingRedirect = consumePostLoginRedirect()
          if (location.pathname === '/login') {
            navigate(pendingRedirect || '/', { replace: true })
          } else if (pendingRedirect && pendingRedirect !== location.pathname) {
            navigate(pendingRedirect, { replace: true })
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false)
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false)
        }
      }
    }

    runSilentSignIn()

    return () => {
      isMounted = false
    }
    // location / navigate used only for post-SSO redirect on first auth check
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per auth mode
  }, [azureAdEnabled, loginRequired])

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
  }

  const handleLogin = async (redirectPath) => {
    if (!isAzureEnabled) return
    setIsLoggingIn(true)

    const fromQuery = new URLSearchParams(location.search).get('redirect')
    const redirect =
      (typeof redirectPath === 'string' && redirectPath.startsWith('/')
        ? redirectPath
        : null) ||
      fromQuery ||
      '/'

    // Persist target before full-page Entra navigation (survives the redirect round-trip).
    setPostLoginRedirect(redirect)

    try {
      // Leaves the app for Microsoft login (same model as logoutRedirect).
      await loginWithAzureAd()
    } catch (error) {
      console.error('Azure AD login failed:', error)
      setIsAuthenticated(false)
      setIsLoggingIn(false)
    }
    // Intentionally no navigate() here: after loginRedirect the browser is on Entra;
    // App restarts on return and initializeAuth + postLoginRedirect finish the flow.
  }

  const handleLogout = async () => {
    // Keep a loading shell until Entra logoutRedirect leaves the app so the
    // unauthenticated gate does not flash /login mid-transition.
    setIsLoggingOut(true)
    setActiveUser(null)
    setBackendUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    clearUserPhotoCache()

    try {
      if (azureAdEnabled) {
        await logoutWithAzureAd()
        return
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }

    // Azure disabled or redirect failed — finish logout in-app on the login screen.
    setIsAuthenticated(false)
    setIsLoggingOut(false)
    navigate('/login', { replace: true })
  }

  const authNavigationProps = {
    isAuthenticated,
    requireLogin: loginRequired,
    isLoggingIn,
    user: activeUser,
    onLogin: handleLogin,
    onLogout: handleLogout,
  }

  if (isCheckingAuth || isLoggingOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {isLoggingOut ? 'Signing out...' : 'Checking single sign-on session...'}
        </p>
      </div>
    )
  }

  if (isAzureEnabled && location.pathname === '/login') {
    // Already signed in (e.g. redirect returned to /login) — leave the login screen.
    if (isAuthenticated) {
      const fromQuery = new URLSearchParams(location.search).get('redirect')
      const target =
        (fromQuery && fromQuery.startsWith('/') ? fromQuery : null) ||
        consumePostLoginRedirect() ||
        '/'
      return <Navigate to={target} replace />
    }

    return (
      <AuthNavigationProvider {...authNavigationProps}>
        <Login onLogin={handleLogin} isLoggingIn={isLoggingIn} />
      </AuthNavigationProvider>
    )
  }

  if (location.pathname === '/landing') {
    return <Navigate to={LANDING_V1_BASE} replace />
  }
  if (location.pathname === '/landing-2') {
    return <Navigate to={`${LANDING_V1_BASE}/2`} replace />
  }
  if (location.pathname === '/landing-example' || location.pathname.startsWith('/landing-example/')) {
    return <LegacyLandingRouteRedirect />
  }

  // No app content without a session — only /login is public.
  if (loginRequired && !isAuthenticated) {
    if (location.pathname !== '/login') {
      const redirectTarget = `${location.pathname}${location.search}` || '/'
      return (
        <Navigate
          to={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
          replace
        />
      )
    }
  }

  const isStandaloneLandingPage =
    USE_LANDING_PAGE &&
    (location.pathname.startsWith(LANDING_V1_BASE) ||
      location.pathname.startsWith(LANDING_V2_BASE))

  // Marketing landing always owns `/` when the landing flag is on.
  const showLandingAtRoot = USE_LANDING_PAGE && location.pathname === '/'
  const isProfilePage = isProfileHomePath(location.pathname)
  const isOrchestrationPage = location.pathname.startsWith('/orchestration')
  const isAuditPage = location.pathname.startsWith('/audit')
  const isKnowledgeHubPage =
    location.pathname.startsWith('/knowledgeHub') ||
    location.pathname.startsWith(`${LANDING_V2_BASE}/knowledge-hub`)
  const isFaqPage = location.pathname === '/faq'
  const isAskAiPage =
    location.pathname === '/compliai' ||
    location.pathname.startsWith('/compliai') ||
    location.pathname === `${LANDING_V2_BASE}/compliai` ||
    location.pathname.startsWith(`${LANDING_V2_BASE}/compliai`)
  const isMyTrainingsPage =
    location.pathname === '/trainings' ||
    location.pathname === `${LANDING_V2_BASE}/trainings` ||
    location.pathname.startsWith(`${LANDING_V2_BASE}/trainings/`)
  const isEventsPage =
    location.pathname.startsWith('/gallery') ||
    location.pathname.startsWith('/events') ||
    location.pathname.startsWith(`${LANDING_V2_BASE}/gallery`) ||
    location.pathname.startsWith(`${LANDING_V2_BASE}/events`)
  const isUserManagementPage = location.pathname === '/user-management'
  const isCompliancePage = location.pathname.startsWith('/compliance')
  // Profile dashboards manage their own gutters; skip the 1680px landing inset.
  const isHomeDashboardPage = isProfilePage

  // Shared Routes tree: landing `/`, profile homes, and /v1–/v2 share one mount
  // so the header stays put (body uses landing-route-fade).
  const usesLandingRouteTree =
    USE_LANDING_PAGE &&
    (showLandingAtRoot || isStandaloneLandingPage || isProfilePage)

  if (usesLandingRouteTree) {
    return (
      <AuthNavigationProvider {...authNavigationProps}>
        <UserContext.Provider value={{ backendUser }}>
          <FeedbackModalProvider>
            <Routes>
              <Route path="/" element={<LandingPage2 />} />
              <Route path="/v1" element={<LandingPage />} />
              <Route path="/v1/2" element={<LandingPage2 />} />
              <Route element={<LandingV2Shell />}>
                <Route
                  path={PROFILE_PATH}
                  element={<ProfileHomeRedirect viewMode={viewMode} />}
                />
                <Route
                  path="/home/head"
                  element={<HeadHome user={activeUser} withChrome={false} />}
                />
                <Route
                  path="/home/employee"
                  element={<EmployeeHome user={activeUser} withChrome={false} />}
                />
                <Route path="/v2" element={<LandingExamplePage />} />
                <Route path="/v2/faq" element={<LandingFaqPage />} />
                <Route path="/v2/compliai" element={<LandingAskAiPage />} />
                <Route path="/v2/knowledge-hub" element={<LandingKnowledgeHubPage />} />
                <Route path="/v2/knowledge-hub/:type/:uuid" element={<LandingKnowledgeItemDetailPage />} />
                <Route path="/v2/knowledge-hub/:uuid" element={<LandingKnowledgeItemDetailPage />} />
                <Route path="/v2/gallery" element={<LandingEventsPage />} />
                <Route
                  path="/v2/gallery/mock-gallery"
                  element={<Navigate to="/v2/gallery/mock-event-1/gallery" replace />}
                />
                <Route path="/v2/gallery/:eventId/gallery" element={<LandingEventGalleryPage />} />
                {/* Legacy /v2/events → gallery */}
                <Route path="/v2/events" element={<Navigate to="/v2/gallery" replace />} />
                <Route
                  path="/v2/events/mock-gallery"
                  element={<Navigate to="/v2/gallery/mock-event-1/gallery" replace />}
                />
                <Route
                  path="/v2/events/:eventId/gallery"
                  element={<LegacyEventGalleryRedirect landing />}
                />
                <Route path="/v2/compliance" element={<LandingComplianceHelpdeskPage />} />
                <Route path="/v2/compliance/self-declaration" element={<LandingSelfDeclarationPage />} />
                <Route path="/v2/trainings" element={<LandingTrainingsPage />} />
              </Route>
            </Routes>
          </FeedbackModalProvider>
        </UserContext.Provider>
      </AuthNavigationProvider>
    )
  }

  const appRoutes = (
    <Routes>
      <Route path="/" element={<Navigate to={PROFILE_PATH} replace />} />
      <Route
        path={PROFILE_PATH}
        element={<ProfileHomeRedirect viewMode={viewMode} />}
      />
      <Route path="/home/head" element={<HeadHome user={activeUser} withChrome={false} />} />
      <Route path="/home/employee" element={<EmployeeHome user={activeUser} withChrome={false} />} />
      <Route path="/knowledgeHub" element={<KnowledgeHub />} />
      <Route path="/knowledgeHub/:type/:uuid" element={<KnowledgeItemDetail />} />
      <Route path="/knowledgeHub/:uuid" element={<KnowledgeItemDetail />} />
      {/* Keep v2 Knowledge Hub available even when VITE_USE_LANDING_PAGE is
          disabled locally. When enabled, these paths use LandingV2Shell above. */}
      <Route path={`${LANDING_V2_BASE}/knowledge-hub`} element={<LandingKnowledgeHubPage />} />
      <Route path={`${LANDING_V2_BASE}/knowledge-hub/:type/:uuid`} element={<LandingKnowledgeItemDetailPage />} />
      <Route path={`${LANDING_V2_BASE}/knowledge-hub/:uuid`} element={<LandingKnowledgeItemDetailPage />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/compliai" element={<AskAI />} />
      {/* Keep v2 CompliAI available even when VITE_USE_LANDING_PAGE is
          disabled locally. When enabled, /v2/compliai uses LandingV2Shell above. */}
      <Route path={`${LANDING_V2_BASE}/compliai`} element={<LandingAskAiPage />} />
      <Route path="/audit/dashboard" element={<AuditDashboard />} />
      <Route path="/audit/new" element={<AuditNew />} />
      <Route path="/audit/details/:auditId" element={<AuditDetails />} />
      <Route path="/orchestration" element={<Orchestration />} />
      <Route path="/orchestration/bulk-update" element={<OrchestrationBulkUpdate />} />
      <Route path="/orchestration/trainings" element={<OrchestrationTraining />} />
      <Route path="/orchestration/annual-declaration" element={<OrchestrationAnnualDeclaration />} />
      <Route path="/user-management" element={<UserManagement />} />
      {/* Keep trainings before any remaining two-segment routes so /v2/trainings
          never resolves as KnowledgeItemDetail (uuid=trainings → doc-events). */}
      <Route path="/trainings" element={<MyTrainings />} />
      <Route path={`${LANDING_V2_BASE}/trainings`} element={<LandingTrainingsPage />} />
      <Route path="/gallery" element={<Events />} />
      <Route
        path="/gallery/mock-gallery"
        element={<Navigate to="/gallery/mock-event-1/gallery" replace />}
      />
      <Route path="/gallery/:eventId/gallery" element={<EventGallery />} />
      <Route
        path={`${LANDING_V2_BASE}/gallery/mock-gallery`}
        element={
          <Navigate
            to={`${LANDING_V2_BASE}/gallery/mock-event-1/gallery`}
            replace
          />
        }
      />
      <Route
        path={`${LANDING_V2_BASE}/gallery/:eventId/gallery`}
        element={<LandingEventGalleryPage />}
      />
      {/* Legacy /events routes */}
      <Route path="/events" element={<Navigate to="/gallery" replace />} />
      <Route
        path="/events/mock-gallery"
        element={<Navigate to="/gallery/mock-event-1/gallery" replace />}
      />
      <Route
        path="/events/:eventId/gallery"
        element={<LegacyEventGalleryRedirect />}
      />
      <Route
        path={`${LANDING_V2_BASE}/events/mock-gallery`}
        element={
          <Navigate
            to={`${LANDING_V2_BASE}/gallery/mock-event-1/gallery`}
            replace
          />
        }
      />
      <Route
        path={`${LANDING_V2_BASE}/events/:eventId/gallery`}
        element={<LegacyEventGalleryRedirect landing />}
      />
      <Route path={`${LANDING_V2_BASE}/events`} element={<Navigate to={`${LANDING_V2_BASE}/gallery`} replace />} />
      <Route
        path={`${LANDING_V2_BASE}/gallery`}
        element={<LandingEventsPage />}
      />
      <Route path="/compliance" element={<ComplianceHelpdesk />} />
      <Route path="/compliance/self-declaration" element={<SelfDeclaration />} />
    </Routes>
  )

  // v1 pages = non-/v2 routes. Share the same landing chrome as /v2/* (no app SidePanel).
  if (USE_LANDING_PAGE) {
    return (
      <AuthNavigationProvider {...authNavigationProps}>
        <UserContext.Provider value={{ backendUser }}>
          <FeedbackModalProvider>
            <LandingPageLayout
              landingRoutes
              insetContent={!isHomeDashboardPage}
              contentClassName={cn(
                'min-w-0 max-w-full overflow-x-clip',
                isEventsPage ? 'overflow-hidden bg-secondary' : 'min-h-0',
                (isOrchestrationPage || isAuditPage) && 'bg-gray-100',
                isKnowledgeHubPage && 'bg-[var(--sds-bg-subtle)]',
                isFaqPage && 'bg-[var(--sds-bg-subtle)] overflow-hidden',
                isAskAiPage && 'bg-[var(--sds-bg-subtle)]',
                (isMyTrainingsPage || isCompliancePage) && 'bg-secondary',
                isUserManagementPage && 'bg-secondary overflow-hidden',
              )}
            >
              {appRoutes}
            </LandingPageLayout>
          </FeedbackModalProvider>
        </UserContext.Provider>
      </AuthNavigationProvider>
    )
  }

  return (
    <AuthNavigationProvider {...authNavigationProps}>
      <UserContext.Provider value={{ backendUser }}>
        <FeedbackModalProvider>
          <div className="flex h-screen flex-col bg-background overflow-hidden">
            <TopBar
              isSidebarCollapsed={isSidebarCollapsed}
              onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onLogout={handleLogout}
              user={activeUser}
            />
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <SidePanel backendUser={backendUser} />
              <main
                className={cn(
                  'flex flex-1 min-h-0 flex-col transition-all duration-300 ml-[var(--ecp-sidepanel-width,68px)]',
                  isEventsPage || isUserManagementPage ? 'overflow-hidden' : 'overflow-y-auto',
                  isOrchestrationPage && 'bg-gray-100 font-sans',
                  isKnowledgeHubPage && 'bg-[var(--sds-bg-subtle)]',
                  isFaqPage && 'bg-[var(--sds-bg-subtle)] overflow-hidden',
                  (isMyTrainingsPage || isUserManagementPage) && 'bg-secondary',
                )}
                style={(isOrchestrationPage || isAuditPage) ? { zoom: 0.8 } : undefined}
              >
                {appRoutes}
              </main>
            </div>
          </div>
        </FeedbackModalProvider>
      </UserContext.Provider>
    </AuthNavigationProvider>
  )
}

export default App
