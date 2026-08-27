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
import { Home, User, BookOpen, Headphones, GraduationCap, Sparkles, HelpCircle, ClipboardCheck, Image, Shield } from "lucide-react";
import { ASK_AI_PALETTE } from "@/components/ai/constants";

const NAV_ICONS = {
  home: Home,
  profile: User,
  knowledge: BookOpen,
  complaints: Headphones,
  trainings: GraduationCap,
  "ask-ai": Sparkles,
  faqs: HelpCircle,
  audit: ClipboardCheck,
  gallery: Image,
  admin: Shield,
};

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
    const Icon = NAV_ICONS[link.id];
    const itemClass = cn(
      "flex items-center gap-1 px-1 py-1 text-[clamp(0.75rem,1.25vw,1.1rem)] tracking-[-0.01em] transition-all whitespace-nowrap",
      active
        ? "font-bold text-[#0f2f57]"
        : link.disabled
          ? "font-medium opacity-40 text-[#0f2f57]"
          : "font-medium text-[#0f2f57] opacity-75 hover:opacity-100",
    );
    const isAskAi = link.id === "ask-ai";
    const content = isAskAi ? (
      <>
        <span style={{ color: ASK_AI_PALETTE.navy }}>Compli</span>
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: `linear-gradient(90deg, ${ASK_AI_PALETTE.blue} 0%, ${ASK_AI_PALETTE.teal} 100%)` }}
        >
          AI
        </span>
        <span aria-hidden="true" className="inline-flex items-baseline gap-0.5 leading-none" style={{ color: ASK_AI_PALETTE.cyan }}>
          <span className="text-xs animate-[twinkle_1.5s_ease-in-out_infinite]">✦</span>
          <span className="text-[0.5rem] animate-[twinkle_1.5s_ease-in-out_infinite_0.5s]" style={{ color: ASK_AI_PALETTE.teal }}>✦</span>
        </span>
      </>
    ) : (
      <>
        {Icon && <Icon className="h-[clamp(14px,1.4vw,20px)] w-[clamp(14px,1.4vw,20px)] shrink-0 text-[#0066ff]" />}
        <span>{link.label}</span>
      </>
    );

    if (!link.to.startsWith("/")) {
      return (
        <a key={link.id ?? link.label} href={link.to} className={itemClass}>
          {content}
        </a>
      );
    }

    if (link.disabled) {
      return (
        <span key={link.id ?? link.label} className={itemClass} aria-disabled="true">
          {content}
        </span>
      );
    }

    if (requireLogin && !isAuthenticated) {
      return (
        <button key={link.id ?? link.label} type="button" onClick={() => navigateToApp(link.to)} className={itemClass}>
          {content}
        </button>
      );
    }

    return (
      <Link key={link.id ?? link.label} to={link.to} className={itemClass} aria-current={active ? "page" : undefined}>
        {content}
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
            "flex h-12 w-full items-center justify-between gap-[clamp(0.25rem,1.5vw,2rem)] overflow-hidden md:h-14",
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
