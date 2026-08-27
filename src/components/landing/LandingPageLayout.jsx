import { useLocation } from "react-router-dom";
import LandingFooter from "./LandingFooter";
import LandingHeader from "./LandingHeader";
import useAppNavLinks from "@/hooks/useAppNavLinks";
import { LANDING_V1_BASE, LANDING_V2_BASE } from "@/lib/appNavigation";
import { landingShellInnerClassName } from "./landingTheme";
import { cn } from "@/lib/utils";

const LANDING_SHELL_ZOOM = 0.8;

/**
 * Shared landing shell: frosted header + optional nav + themed content + footer.
 *
 * Header and footer are never desktop-scaled — same chrome on every route.
 * Page bodies that need scaling wrap themselves (LandingScaledContent).
 */
export default function LandingPageLayout({
  children,
  className = "",
  contentClassName = "",
  /** When true (default), page body uses the same left/right gutter as the grid-icon header. */
  insetContent = true,
  showSecondaryNav = true,
  showFooter = true,
  navLinks,
  landingRoutes,
}) {
  const location = useLocation();
  const useLandingRoutes =
    landingRoutes ??
    (location.pathname === "/" ||
      location.pathname === LANDING_V2_BASE ||
      location.pathname.startsWith(`${LANDING_V2_BASE}/`) ||
      location.pathname === LANDING_V1_BASE ||
      location.pathname.startsWith(`${LANDING_V1_BASE}/`));

  const computedNavLinks = useAppNavLinks({ landingRoutes: useLandingRoutes });
  const resolvedNavLinks = navLinks ?? computedNavLinks;

  return (
    <div
      className={cn(
        "flex min-h-[100dvh] max-w-full flex-col overflow-x-clip bg-white text-slate-900",
        className,
      )}
    >
      <div
        className="flex w-full max-w-full min-w-0 flex-1 flex-col overflow-x-clip"
        style={{
          zoom: LANDING_SHELL_ZOOM,
          minHeight: `calc(100dvh / ${LANDING_SHELL_ZOOM})`,
        }}
      >
        {/* Unscaled chrome — keep overflow visible so menus aren't clipped */}
        <div className="landing-sticky-chrome sticky top-0 z-50 shrink-0 overflow-visible">
          <LandingHeader
            navLinks={resolvedNavLinks}
            showSecondaryNav={showSecondaryNav}
          />
        </div>

        <main
          className={cn(
            "flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip",
            contentClassName,
          )}
        >
          {insetContent ? (
            <div
              className={landingShellInnerClassName(
                "flex min-h-full flex-1 flex-col py-0",
              )}
            >
              {children}
            </div>
          ) : (
            children
          )}
        </main>

        {showFooter ? (
          <div className="mt-auto shrink-0">
            <LandingFooter />
          </div>
        ) : null}
      </div>
    </div>
  );
}
