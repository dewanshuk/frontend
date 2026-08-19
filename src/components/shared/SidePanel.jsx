import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import Box from "@mui/material/Box"
import Collapse from "@mui/material/Collapse"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Tooltip from "@mui/material/Tooltip"
// import OrchActive from '../../assets/icons/orch-active.svg';
// import { ReactComponent as OrchInActive } from '../../assets/icons/orch-inactive.svg';
import AccountCircleOutlined from "@mui/icons-material/AccountCircleOutlined"
import AccountCircleRounded from "@mui/icons-material/AccountCircleRounded"
import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined"
import AccountTreeRounded from "@mui/icons-material/AccountTreeRounded"
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined"
import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded"
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined"
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded"
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined"
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded"
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined"
import DescriptionRounded from "@mui/icons-material/DescriptionRounded"
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded"
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined"
import FactCheckRounded from "@mui/icons-material/FactCheckRounded"
import GridViewOutlined from "@mui/icons-material/GridViewOutlined"
import GridViewRounded from "@mui/icons-material/GridViewRounded"
import HelpOutlineOutlined from "@mui/icons-material/HelpOutlineOutlined"
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded"
import HomeOutlined from "@mui/icons-material/HomeOutlined"
import HomeRounded from "@mui/icons-material/HomeRounded"
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined"
import MenuBookRounded from "@mui/icons-material/MenuBookRounded"
import QuestionAnswerOutlined from "@mui/icons-material/QuestionAnswerOutlined"
import QuestionAnswerRounded from "@mui/icons-material/QuestionAnswerRounded"
import ReportProblemOutlined from "@mui/icons-material/ReportProblemOutlined"
import ReportProblemRounded from "@mui/icons-material/ReportProblemRounded"
import SchoolOutlined from "@mui/icons-material/SchoolOutlined"
import SchoolRounded from "@mui/icons-material/SchoolRounded"
import ThumbUpOutlined from "@mui/icons-material/ThumbUpOutlined"
import ThumbUpRounded from "@mui/icons-material/ThumbUpRounded"
import { useFeedbackModal } from "./feedback-modal-provider"
import usePermissions from "../../lib/permissions"
import { isReleaseEnabled } from "../../lib/featureFlags"
import { PROFILE_PATH } from "../../lib/appNavigation"

const MENU_COLLAPSED_WIDTH = 68
const MENU_EXPANDED_WIDTH = 232

const colors = {
  selectedBg: "rgba(37, 99, 235, 0.10)", // close to screenshot's light blue
  selectedText: "rgb(29, 78, 216)",
  hoverBg: "rgba(15, 23, 42, 0.04)",
  mutedText: "rgba(15, 23, 42, 0.65)",
  border: "rgba(15, 23, 42, 0.10)",
  subPanelBg: "rgba(37, 99, 235, 0.08)",
  subOutline: "rgba(37, 99, 235, 0.60)",
}

const iconSx = (active, disabled) => ({
  fontSize: 20,
  color: disabled ? "rgba(15, 23, 42, 0.25)" : active ? colors.selectedText : "rgba(15, 23, 42, 0.70)",
})

export function SidePanel({ backendUser = null }) {
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)
  const [openGroups, setOpenGroups] = useState({})
  const { openFeedback } = useFeedbackModal();
  const perms = usePermissions({ backendUser })

  const isHomePage =
    location.pathname === PROFILE_PATH ||
    location.pathname === "/home/head" ||
    location.pathname === "/home/employee"
  // Collapsed on all pages; expands on hover
  const isExpanded = isHovered

  // Reset hover when navigating so non-home pages start clean
  useEffect(() => {
    setIsHovered(false)
  }, [location.pathname])

  useEffect(() => {
    const width = isExpanded ? MENU_EXPANDED_WIDTH : MENU_COLLAPSED_WIDTH
    document.documentElement.style.setProperty("--ecp-sidepanel-width", `${width}px`)
    return () => {
      document.documentElement.style.removeProperty("--ecp-sidepanel-width")
    }
  }, [isExpanded])

  const isActive = (path) => {
    if (!path || path === "#") return false
    if (path === PROFILE_PATH) {
      return (
        location.pathname === PROFILE_PATH ||
        location.pathname === "/home/head" ||
        location.pathname === "/home/employee"
      )
    }
    if (path === "/") return location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  const ADMIN_ROLES = [
    "Master Admin",
    "Policy Admin",
    "Policy Hub Admin",
    "KH Admin",
    "Knowledge Hub Admin",
    "Chief Compliance Officer",
    "Platform Admin",
  ]

  const menuItems = useMemo(() => {
    const base = [
      { id: "home", label: "Home", icon: { default: HomeOutlined, active: HomeRounded }, path: "/", disabled: false},
      {
        id: "profile",
        label: "My Profile",
        icon: { default: AccountCircleOutlined, active: AccountCircleRounded },
        path: PROFILE_PATH,
        disabled: false,
      },
      {
        id: "knowledge",
        label: "Knowledge Hub",
        icon: { default: MenuBookOutlined, active: MenuBookRounded },
        path: "/knowledgeHub",
        disabled: false,
      },
      {
        id: "complaints",
        label: "Compliance HelpDesk",
        icon: { default: QuestionAnswerOutlined, active: QuestionAnswerRounded },
        path: "/compliance",
        disabled: true,
        release: "R3",
      },
      { id: "trainings", label: "My e-Module Trainings", icon: { default: SchoolOutlined, active: SchoolRounded }, path: "/trainings", disabled: false },
      // { id: "insights", label: "Insights", icon: { default: GridViewOutlined, active: GridViewRounded }, path: "/insights", disabled: true },
      { id: "ask-ai", label: "CompliAI", icon: { default: AutoAwesomeOutlined, active: AutoAwesomeRounded }, path: "/compliai", disabled: true, release: "R2" },
      { id: "faqs", label: "FAQs", icon: { default: HelpOutlineOutlined, active: HelpOutlineRounded }, path: "/faq", disabled: false },
      {
        id: "audit",
        label: "Audits",
        icon: { default: FactCheckOutlined, active: FactCheckRounded },
        path: "#",
        disabled: true,
        release: "R3",
        subItems: [
          { id: "audit-dashboard", label: "Audit Dashboard", path: "/audit/dashboard", release: "R3" },
          { id: "audit-details", label: "Audit Details", path: "/audit/details", release: "R3" }
        ],
      },
      { id: "gallery", label: "Gallery", icon: { default: CalendarMonthOutlined, active: CalendarMonthRounded }, path: "/gallery", disabled: true, release: "R3" },
      {
        id: "orchestration",
        label: "Orchestration",
        icon: { default: AccountTreeOutlined, active: AccountTreeRounded },
        path: "#",
        disabled: false,
        subItems: [
          { id: "orchestration-home", label: "Documents & Events", path: "/orchestration", release: "R0" },
          { id: "add-training", label: "e-Module Trainings", path: "/orchestration/trainings", release: "R1", allowedRoles: ["KH Admin", "Knowledge Hub Admin"] },
          { id: "bulk-update", label: "Visibility Filter (Bulk update)", path: "/orchestration/bulk-update", release: "R1" },
          { id: "annual-declaration", label: "Annual Declarations", path: "/orchestration/annual-declaration", disabled: true, release: "R2" },
        ],
      },
      {
        id: "admin",
        label: "Admin",
        icon: { default: AdminPanelSettingsOutlined, active: AdminPanelSettingsRounded },
        path: "#",
        disabled: false,
        subItems: [
          { id: "user-management", label: "User Management", path: "/user-management", allowedRoles: ["Master Admin"] },
        ],
      },
    ]

    // Role-to-menu visibility matrix (null = visible to all roles)
    const visibility = {
      home: null,
      knowledge: null,
      trainings: null,
      faqs: null,
      events: null,
      'ask-ai': null,
      complaints: ["Complaint Lead", "COBCE/COI/Gift Lead", "Chief Compliance Officer", "Master Admin", "Policy Admin", "KH Admin", "Knowledge Hub Admin", "Query Lead"],
      audit: ["Audit Lead", "Chief Compliance Officer", "Master Admin", "Policy Admin"],
      orchestration: ["KH Admin", "Knowledge Hub Admin", "Policy Admin", "Policy Hub Admin"],
      admin: ["Master Admin"],
    }

    // Helper: filter sub-items by their allowedRoles (if specified)
    const filterSubItemsByRole = (subItems) => {
      if (!Array.isArray(subItems)) return subItems
      return subItems.filter((s) => {
        if (!s.allowedRoles) return true
        try { return perms?.hasAnyRole?.(s.allowedRoles) ?? true } catch { return true }
      })
    }

    // Filter sub-items by release flag first
    const applyReleaseFilter = (items) =>
      items
        .map((item) => {
          const visibleSubItems = Array.isArray(item.subItems)
            ? item.subItems.filter((s) => isReleaseEnabled(s.release))
            : item.subItems
          return { ...item, subItems: visibleSubItems }
        })
        .filter((item) => {
          // Hide item if release flag is off
          if (!isReleaseEnabled(item.release)) return false
          // Hide parent group if all sub-items were filtered out
          if (Array.isArray(item.subItems) && item.subItems.length === 0) return false
          return true
        })

    const releaseFiltered = applyReleaseFilter(base)

    // Check if user has any admin role (used to unlock disabled state)
    const isAdmin = (() => { try { return perms?.hasAnyRole?.(ADMIN_ROLES) ?? false } catch { return false } })()

    return releaseFiltered
      .filter((item) => {
        const allowed = visibility[item.id]
        if (!allowed) return true
        try { return perms?.hasAnyRole?.(allowed) ?? true } catch { return true }
      })
      .map((item) => ({
        ...item,
        // Admins see all visible items as enabled (not greyed out)
        disabled: isAdmin ? false : item.disabled,
        subItems: Array.isArray(item.subItems)
          ? filterSubItemsByRole(item.subItems).map((s) => ({ ...s, disabled: isAdmin ? false : s.disabled }))
          : item.subItems,
      }))
  }, [perms?.roles, isExpanded])

  const isParentActive = (item) => {
    if (!item.subItems?.length) return false
    return item.subItems.some((s) => isActive(s.path))
  }

  useEffect(() => {
    const next = {}
    for (const item of menuItems) {
      if (item.subItems?.length) next[item.id] = isParentActive(item)
    }
    setOpenGroups((prev) => ({ ...next, ...prev }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const renderButton = ({ children, label, disabled }) => {
    if (isExpanded) return children
    return (
      <Tooltip title={label} placement="right" arrow disableInteractive>
        <span>{children}</span>
      </Tooltip>
    )
  }

  return (
    <Box
      component="aside"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: "fixed",
        left: 0,
        top: "4rem",
        zIndex: 40,
        height: "calc(100vh - 4rem)",
        width: isExpanded ? MENU_EXPANDED_WIDTH : MENU_COLLAPSED_WIDTH,
        bgcolor: "background.paper",
        borderRight: `1px solid ${colors.border}`,
        transition: "width 180ms ease",
        overflow: "hidden",
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Box
          component="nav"
          sx={{
            flex: 1,
            overflowY: "auto",
            py: 0.75,
            px: isExpanded ? 1.25 : 0.75,
          }}
        >
          <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            {menuItems.map((item) => {
              const active = isActive(item.path) || isParentActive(item)
              const isGroup = Boolean(item.subItems?.length)
              const Icon = active ? item.icon.active : item.icon.default

              if (isGroup) {
                const open = Boolean(openGroups[item.id])

                const parentBtn = (
                  <ListItemButton
                    disabled={item.disabled}
                    onClick={() => {
                      if (!isExpanded) return
                      toggleGroup(item.id)
                    }}
                    sx={{
                      borderRadius: 2,
                      minHeight: 36,
                      px: isExpanded ? 1.25 : 0.75,
                      py: 0.25,
                      justifyContent: isExpanded ? "flex-start" : "center",
                      gap: isExpanded ? 1 : 0,
                      bgcolor: active ? colors.selectedBg : "transparent",
                      color: active ? colors.selectedText : colors.mutedText,
                      "&:hover": { bgcolor: active ? colors.selectedBg : colors.hoverBg },
                      "& .MuiListItemText-root": { my: 0 },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: isExpanded ? 1 : 0,
                        justifyContent: "center",
                      }}
                    >
                      <Icon sx={iconSx(active, item.disabled)} />
                    </ListItemIcon>

                    {isExpanded && (
                      <>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}
                        />
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: active ? colors.selectedText : colors.mutedText,
                            transform: open ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 140ms ease",
                          }}
                        >
                          <ExpandMoreRounded sx={{ fontSize: 20 }} />
                        </Box>
                      </>
                    )}
                  </ListItemButton>
                )

                return (
                  <Box key={item.id}>
                    {renderButton({ children: parentBtn, label: item.label, disabled: item.disabled })}

                    <Collapse in={isExpanded && open} timeout={160} unmountOnExit>
                      <Box
                        sx={{
                          mt: 0.5,
                          ml: 0.75,
                          mr: 0.75,
                          p: 0.6,
                          borderRadius: 2,
                          bgcolor: colors.subPanelBg,
                        }}
                      >
                        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                          {item.subItems.map((sub) => {
                            const subActive = isActive(sub.path)
                            const outlined = !subActive
                            return (
                              <ListItemButton
                                key={sub.id}
                                component={Link}
                                to={sub.disabled ? "#" : sub.path}
                                disabled={sub.disabled}
                                sx={{
                                  borderRadius: 1.75,
                                  minHeight: 34,
                                  px: 1,
                                  py: 0.2,
                                  border: `1px solid ${colors.subOutline}`,
                                  bgcolor: subActive ? colors.selectedBg : "transparent",
                                  color: colors.selectedText,
                                  "&:hover": {
                                    bgcolor: subActive ? colors.selectedBg : "rgba(37, 99, 235, 0.06)",
                                  },
                                  "& .MuiListItemText-root": { my: 0 },
                                 "&.Mui-disabled": { opacity: 1, color: "rgba(15, 23, 42, 0.30)" },
                                  ...(outlined
                                    ? { boxShadow: "none" }
                                    : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }),
                                }}
                              >
                                <ListItemText
                                  primary={sub.label}
                                  primaryTypographyProps={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}
                                />
                              </ListItemButton>
                            )
                          })}
                        </List>
                      </Box>
                    </Collapse>
                  </Box>
                )
              }

              const btn = (
                <ListItemButton
                  component={Link}
                  onClick={(e) => {
                    if (item.id === "feedback") {
                      e.preventDefault()
                      openFeedback()
                    }
                  }}
                  to={item.id === "feedback" ? "#" : item.path}
                  disabled={item.disabled}
                  sx={{
                    borderRadius: 2,
                    minHeight: 36,
                    px: isExpanded ? 1.25 : 0.75,
                    py: 0.25,
                    justifyContent: isExpanded ? "flex-start" : "center",
                    gap: isExpanded ? 1 : 0,
                    bgcolor: active ? colors.selectedBg : "transparent",
                    color: active ? colors.selectedText : colors.mutedText,
                    "&:hover": { bgcolor: active ? colors.selectedBg : colors.hoverBg },
                    "&.Mui-disabled": {
                      opacity: 1,
                      color: "rgba(15, 23, 42, 0.30)",
                    },
                    "& .MuiListItemText-root": { my: 0 },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isExpanded ? 1 : 0,
                      justifyContent: "center",
                      color: "inherit",
                    }}
                  >
                    <Icon sx={iconSx(active, item.disabled)} />
                  </ListItemIcon>
                  {isExpanded && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}
                    />
                  )}
                </ListItemButton>
              )

              return (
                <Box key={item.id}>
                  {renderButton({ children: btn, label: item.label, disabled: item.disabled })}
                </Box>
              )
            })}
          </List>
        </Box>
      </Box>
    </Box>
  )
}
