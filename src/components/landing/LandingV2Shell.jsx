import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import LandingPageLayout from "@/components/landing/LandingPageLayout";

/**
 * Persistent /v2 shell so header + nav stay mounted across route changes
 * (avoids navbar flicker). Only the page body swaps with a short fade.
 */
export default function LandingV2Shell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <LandingPageLayout
      insetContent={false}
      landingRoutes
    >
      <div key={location.pathname} className="landing-route-fade w-full">
        <Outlet />
      </div>
    </LandingPageLayout>
  );
}
