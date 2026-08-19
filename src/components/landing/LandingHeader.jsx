import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MARUTI_BLUE, landingShellInnerClassName } from "./landingTheme";
import AdminNavDrawer from "./AdminNavDrawer";
import MyComplianceSpaceMenu from "./MyComplianceSpaceMenu";
import { useAuthNavigation } from "@/context/AuthNavigationContext";
import { ADMIN_ROLES, isProfileHomePath } from "@/lib/appNavigation";
import usePermissions from "@/lib/permissions";
import { useBackendUser } from "@/lib/UserContext";
import { cn } from "@/lib/utils";

export default function LandingHeader({
  navLinks = [],
  showSecondaryNav = true,
}) {
  const location = useLocation();
  const {
    isAuthenticated,
    requireLogin,
    navigateToApp,
  } = useAuthNavigation();
  const backendUser = useBackendUser();
  const perms = usePermissions({ backendUser });
  const isAdmin = Boolean(perms?.hasAnyRole?.(ADMIN_ROLES));
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);

  const primaryLinks = navLinks.filter((link) => link.isPrimary !== false);
  const adminLinks = navLinks.filter((link) => link.isPrimary === false);
  const showAdminMenu = isAuthenticated && isAdmin && adminLinks.length > 0;

  const isLinkActive = (to, exact = false, linkId) => {
    if (linkId === "profile") return isProfileHomePath(location.pathname);
    if (!to?.startsWith("/")) return false;
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const handleNavClick = (link) => {
    if (link.disabled || !link.to?.startsWith("/")) return;
    navigateToApp(link.to);
  };

  const renderNavItem = (link) => {
    const active = isLinkActive(link.to, link.exact, link.id);
    const className = cn(
      "shrink-0 whitespace-nowrap text-base font-medium tracking-[-0.01em] transition-opacity md:text-lg",
      active ? "opacity-100" : link.disabled ? "opacity-40" : "opacity-80 hover:opacity-100",
    );

    if (!link.to.startsWith("/")) {
      return (
        <a
          key={link.id ?? link.label}
          href={link.to}
          className={className}
          style={{ color: MARUTI_BLUE }}
        >
          {link.label}
        </a>
      );
    }

    if (link.disabled) {
      return (
        <span
          key={link.id ?? link.label}
          className={className}
          style={{ color: MARUTI_BLUE }}
          aria-disabled="true"
        >
          {link.label}
        </span>
      );
    }

    if (requireLogin && !isAuthenticated) {
      return (
        <button
          key={link.id ?? link.label}
          type="button"
          onClick={() => navigateToApp(link.to)}
          className={className}
          style={{ color: MARUTI_BLUE }}
        >
          {link.label}
        </button>
      );
    }

    return (
      <Link
        key={link.id ?? link.label}
        to={link.to}
        className={className}
        style={{ color: MARUTI_BLUE }}
        aria-current={active ? "page" : undefined}
      >
        {link.label}
      </Link>
    );
  };
return (
  <div className="relative w-full max-w-full min-w-0 overflow-visible">
    <header className="relative z-[70] overflow-visible border-b border-[#d9d9d9]/50 bg-white">
      <div className={landingShellInnerClassName("relative flex h-24 items-center justify-between gap-4 overflow-visible")}>
        <div className="flex min-w-0 items-center gap-5">
          {showAdminMenu ? (
            <button
              type="button"
              className="flex size-14 shrink-0 items-center justify-center rounded-lg p-2.5 transition outline-none hover:bg-black/5"
              aria-label="Open admin menu"
              aria-expanded={adminDrawerOpen}
              onClick={() => setAdminDrawerOpen(true)}
            >
              <img src="/assets/landing/grid-icon.png" alt="" className="size-[34px]" />
            </button>
          ) : null}

          <div className="flex min-w-0 items-center gap-5">
            <img src="/maruti-suzuki-logo.svg" alt="Maruti Suzuki" className="h-[40px] w-auto shrink-0" />
            <span className="h-8 w-px shrink-0 bg-[#d9d9d9]" aria-hidden />
            <img
              src="/assets/compliance-connect-transparent-logo.svg"
              alt="Compliance Connect"
              className="h-10 w-auto shrink-0"
            />
          </div>
        </div>

        <div className="relative z-[60] flex shrink-0 items-center gap-3 overflow-visible">
          {isAuthenticated ? <MyComplianceSpaceMenu /> : null}
        </div>
      </div>
    </header>

    {showSecondaryNav && primaryLinks.length > 0 ? (
      <nav className="relative z-0 border-b border-[#d9d9d9]/60 bg-[#f4f4f4]">
        <div
          className={landingShellInnerClassName(
            "flex h-12 w-full items-center justify-center gap-10 overflow-x-auto md:h-14 md:gap-14",
          )}
        >
          {primaryLinks.map(renderNavItem)}
        </div>
      </nav>
    ) : null}

    {showAdminMenu ? (
      <AdminNavDrawer
        open={adminDrawerOpen}
        onClose={() => setAdminDrawerOpen(false)}
        links={adminLinks}
        isLinkActive={isLinkActive}
        requireLogin={requireLogin}
        isAuthenticated={isAuthenticated}
        onNavigate={handleNavClick}
      />
    ) : null}
  </div>
);

}
