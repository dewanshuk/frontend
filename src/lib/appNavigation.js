import { isReleaseEnabled } from "./featureFlags"

export const ADMIN_ROLES = [
  "Master Admin",
  "Policy Admin",
  "Policy Hub Admin",
  "KH Admin",
  "Knowledge Hub Admin",
  "Chief Compliance Officer",
  "Platform Admin",
]

export const MENU_VISIBILITY = {
  home: null,
  profile: null,
  knowledge: null,
  trainings: null,
  faqs: null,
  events: null,
  gallery: null,
  "ask-ai": null,
  complaints: null,
  audit: null,
  orchestration: null,
  admin: null,
}

/** Legacy landing previews (v1) */
export const LANDING_V1_BASE = "/v1"

/** New landing-themed app pages (v2) */
export const LANDING_V2_BASE = "/v2"

/** Role-based profile dashboards (not marketing landing). */
export const PROFILE_PATH = "/profile"
export const HEAD_HOME_PATH = "/home/head"
export const EMPLOYEE_HOME_PATH = "/home/employee"

/**
 * Role dashboard path from API view mode.
 * Only `head` maps to head home; everything else (including unknown) → employee.
 */
export function getProfileHomePath(viewMode) {
  return viewMode === "head" ? HEAD_HOME_PATH : EMPLOYEE_HOME_PATH
}

export function isProfileHomePath(pathname = "") {
  return (
    pathname === PROFILE_PATH ||
    pathname === HEAD_HOME_PATH ||
    pathname === EMPLOYEE_HOME_PATH
  )
}

/** Routes that have a landing-themed page under /v2/* */
export const LANDING_ROUTE_OVERRIDES = {
  "/faq": `${LANDING_V2_BASE}/faq`,
  "/compliai": `${LANDING_V2_BASE}/compliai`,
  "/knowledgeHub": `${LANDING_V2_BASE}/knowledge-hub`,
  "/gallery": `${LANDING_V2_BASE}/gallery`,
  "/events": `${LANDING_V2_BASE}/gallery`,
  "/compliance": `${LANDING_V2_BASE}/compliance`,
  "/trainings": `${LANDING_V2_BASE}/trainings`,
}

const LANDING_ROUTE_PREFIXES = Object.entries(LANDING_ROUTE_OVERRIDES)

export function toLandingPath(path = "") {
  if (!path || !path.startsWith("/")) return path

  const queryIndex = path.indexOf("?")
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex)
  const search = queryIndex === -1 ? "" : path.slice(queryIndex)

  for (const [appBase, landingBase] of LANDING_ROUTE_PREFIXES) {
    if (pathname === appBase || pathname.startsWith(`${appBase}/`)) {
      return `${landingBase}${pathname.slice(appBase.length)}${search}`
    }
  }

  return path
}

export function fromLandingPath(path = "") {
  if (!path || !path.startsWith("/")) return path

  const queryIndex = path.indexOf("?")
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex)
  const search = queryIndex === -1 ? "" : path.slice(queryIndex)

  for (const [appBase, landingBase] of LANDING_ROUTE_PREFIXES) {
    if (pathname === landingBase || pathname.startsWith(`${landingBase}/`)) {
      return `${appBase}${pathname.slice(landingBase.length)}${search}`
    }
  }

  return path
}

export function isLandingThemedPath(pathname = "") {
  return pathname === LANDING_V2_BASE || pathname.startsWith(`${LANDING_V2_BASE}/`)
}

export function isLandingV1Path(pathname = "") {
  return pathname === LANDING_V1_BASE || pathname.startsWith(`${LANDING_V1_BASE}/`)
}

export function isLandingKnowledgeHubPath(pathname = "") {
  const base = `${LANDING_V2_BASE}/knowledge-hub`
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function isLandingGalleryPath(pathname = "") {
  const base = `${LANDING_V2_BASE}/gallery`
  return pathname === base || pathname.startsWith(`${base}/`)
}

/** @deprecated Use isLandingGalleryPath */
export function isLandingEventsPath(pathname = "") {
  return (
    isLandingGalleryPath(pathname) ||
    pathname === `${LANDING_V2_BASE}/events` ||
    pathname.startsWith(`${LANDING_V2_BASE}/events/`)
  )
}

export function getKnowledgeHubBasePath({ landing = false } = {}) {
  return landing ? `${LANDING_V2_BASE}/knowledge-hub` : "/knowledgeHub"
}

export function getGalleryBasePath({ landing = false } = {}) {
  return landing ? `${LANDING_V2_BASE}/gallery` : "/gallery"
}

/** @deprecated Use getGalleryBasePath */
export function getEventsBasePath(options) {
  return getGalleryBasePath(options)
}

export function isLandingCompliancePath(pathname = "") {
  const base = `${LANDING_V2_BASE}/compliance`
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function getComplianceBasePath({ landing = false } = {}) {
  return landing ? `${LANDING_V2_BASE}/compliance` : "/compliance"
}

export function getBaseMenuItems() {
  return [
    { id: "home", label: "Home", path: "/", disabled: false },
    { id: "profile", label: "My Profile", path: PROFILE_PATH, disabled: false },
    { id: "knowledge", label: "Knowledge Hub", path: "/knowledgeHub", disabled: false },
    {
      id: "complaints",
      label: "Compliance HelpDesk",
      path: "/compliance",
      disabled: true,
      release: "R3",
    },
    { id: "trainings", label: "My e-Module Trainings", path: "/trainings", disabled: false },
    {
      id: "ask-ai",
      label: "CompliAI",
      path: "/compliai",
      // disabled: true,
      release: "R2",
    },
    { id: "faqs", label: "FAQs", path: "/faq", disabled: false },
    {
      id: "audit",
      label: "Audits",
      path: "#",
      disabled: true,
      release: "R3",
      subItems: [
        { id: "audit-dashboard", label: "Audit Dashboard", path: "/audit/dashboard", release: "R3" },
        { id: "audit-details", label: "Audit Details", path: "/audit/details", release: "R3" },
      ],
    },
    {
      id: "gallery",
      label: "Gallery",
      path: "/gallery",
      // disabled: true,
      release: "R3",
    },
    {
      id: "orchestration",
      label: "Orchestration",
      path: "#",
      disabled: false,
      subItems: [
        { id: "orchestration-home", label: "Documents & Events", path: "/orchestration", exact: true, release: "R0" },
        {
          id: "add-training",
          label: "e-Module Trainings",
          path: "/orchestration/trainings",
          release: "R1",
          allowedRoles: ["KH Admin", "Knowledge Hub Admin"],
        },
        { id: "bulk-update", label: "Visibilty Filter (Bulk update)", path: "/orchestration/bulk-update", release: "R1" },
        {
          id: "annual-declaration",
          label: "Annual Declarations",
          path: "/orchestration/annual-declaration",
          disabled: true,
          release: "R2",
        },
      ],
    },
    {
      id: "admin",
      label: "Admin",
      path: "#",
      disabled: false,
      subItems: [
        { id: "user-management", label: "User Management", path: "/user-management", allowedRoles: ["Master Admin"] },
      ],
    },
  ]
}

function filterSubItemsByRole(subItems, perms) {
  if (!Array.isArray(subItems)) return subItems
  return subItems.filter((subItem) => {
    if (!subItem.allowedRoles) return true
    try {
      return perms?.hasAnyRole?.(subItem.allowedRoles) ?? true
    } catch {
      return true
    }
  })
}

function applyReleaseFilter(items) {
  return items
    .map((item) => {
      const visibleSubItems = Array.isArray(item.subItems)
        ? item.subItems.filter((subItem) => isReleaseEnabled(subItem.release))
        : item.subItems
      return { ...item, subItems: visibleSubItems }
    })
    .filter((item) => {
      if (!isReleaseEnabled(item.release)) return false
      if (Array.isArray(item.subItems) && item.subItems.length === 0) return false
      return true
    })
}

function resolveGroupPath(item) {
  if (!item.subItems?.length) return item.path
  const firstSubItem = item.subItems.find((subItem) => !subItem.disabled) || item.subItems[0]
  return firstSubItem?.path || item.path
}

export function getFilteredMenuItems(perms) {
  const isAdmin = (() => {
    try {
      return perms?.hasAnyRole?.(ADMIN_ROLES) ?? false
    } catch {
      return false
    }
  })()

  return applyReleaseFilter(getBaseMenuItems())
    .filter((item) => {
      const allowed = MENU_VISIBILITY[item.id]
      if (!allowed) return true
      try {
        return perms?.hasAnyRole?.(allowed) ?? true
      } catch {
        return true
      }
    })
    .map((item) => ({
      ...item,
      disabled: isAdmin ? false : item.disabled,
      subItems: Array.isArray(item.subItems)
        ? filterSubItemsByRole(item.subItems, perms).map((subItem) => ({
            ...subItem,
            disabled: isAdmin ? false : subItem.disabled,
          }))
        : item.subItems,
    }))
}

export function resolveNavPath(path, { landingRoutes = false } = {}) {
  if (!path || path === "#") return path
  if (!landingRoutes) return path
  return toLandingPath(path)
}

const LANDING_PUBLIC_NAV_IDS = new Set([
  "knowledge",
  "complaints",
  "trainings",
  "ask-ai",
  "faqs",
  "audit",
  "gallery",
])

/** Display order for the secondary menu bar (and app shell primary nav). */
export const LANDING_NAV_ORDER = [
  "home",
  "profile",
  "knowledge",
  "complaints",
  "trainings",
  "ask-ai",
  "faqs",
  "audit",
  "gallery",
]

/** Nav items shown in the main bar on landing (includes Home, My Profile + v2 surfaces). */
export const LANDING_PRIMARY_NAV_IDS = new Set(["home", "profile", ...LANDING_PUBLIC_NAV_IDS])

/** Primary surfaces that should always deep-link to /v2/* (or app path when no v2 page). */
const ALWAYS_LANDING_NAV_IDS = new Set(LANDING_PUBLIC_NAV_IDS)

const LANDING_FALLBACK_NAV_ITEMS = [
  { id: "knowledge", label: "Knowledge Hub", path: "/knowledgeHub", disabled: false },
  { id: "complaints", label: "Compliance HelpDesk", path: "/compliance", disabled: false },
  { id: "trainings", label: "e-Module Trainings", path: "/trainings", disabled: false },
  { id: "ask-ai", label: "CompliAI", path: "/compliai", disabled: false },
  { id: "faqs", label: "FAQs", path: "/faq", disabled: false },
  {
    id: "audit",
    label: "Audits",
    path: "/audit/dashboard",
    disabled: false,
  },
  { id: "gallery", label: "Gallery", path: "/gallery", disabled: false },
]

const navOrderIndex = (id) => {
  const index = LANDING_NAV_ORDER.indexOf(id)
  return index === -1 ? LANDING_NAV_ORDER.length + 1 : index
}

export function getHeaderNavLinks(perms, { landingRoutes = false } = {}) {
  let landingItems = getFilteredMenuItems(perms)

  for (const fallback of LANDING_FALLBACK_NAV_ITEMS) {
    if (!landingItems.some((item) => item.id === fallback.id)) {
      landingItems = [...landingItems, fallback]
    }
  }

  return landingItems
    .map((item) => {
      const children = Array.isArray(item.subItems)
        ? item.subItems
            .map((subItem) => ({
              id: subItem.id,
              label: subItem.label,
              to: resolveNavPath(subItem.path, { landingRoutes: false }),
              exact: Boolean(subItem.exact),
              disabled: Boolean(subItem.disabled),
            }))
            .filter((child) => child.to && child.to !== "#")
        : []

      const path = children.length ? resolveGroupPath(item) : item.path
      const forceLandingPath = ALWAYS_LANDING_NAV_IDS.has(item.id)
      const disabled =
        (landingRoutes || forceLandingPath) && LANDING_PUBLIC_NAV_IDS.has(item.id)
          ? false
          : item.disabled

      return {
        id: item.id,
        label: item.label,
        to: resolveNavPath(path, {
          landingRoutes: landingRoutes || forceLandingPath,
        }),
        disabled,
        children,
        /** False for admin / app-shell links that have no /v2 page — shown in grid-icon menu */
        isPrimary: LANDING_PRIMARY_NAV_IDS.has(item.id),
      }
    })
    .filter((link) => (link.children?.length > 0) || (link.to && link.to !== "#"))
    .sort((a, b) => navOrderIndex(a.id) - navOrderIndex(b.id))
}
