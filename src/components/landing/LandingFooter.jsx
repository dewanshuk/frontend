import { useState } from "react";
import { useLocation } from "react-router-dom";
import RaiseQueryModal from "@/components/compliance/RaiseQueryModal";
import { useAuthNavigation } from "@/context/AuthNavigationContext";
import {
  getComplianceBasePath,
  isLandingCompliancePath,
  isLandingThemedPath,
} from "@/lib/appNavigation";
import { landingShellInnerClassName } from "./landingTheme";

const FOOTER_LINKS = [
  {
    label: "Privacy Policy",
    href: "https://www.marutisuzuki.com/arena/privacy-policy",
    external: true,
  },
  {
    label: "Terms of Use",
    href: "https://www.marutisuzuki.com/arena/terms-of-use",
    external: true,
  },
  {
    label: "Contact Compliance",
    action: "raise-query",
  },
];

export default function LandingFooter() {
  const location = useLocation();
  const { isAuthenticated, requireLogin, navigateToApp } = useAuthNavigation();
  const [raiseQueryOpen, setRaiseQueryOpen] = useState(false);

  const openRaiseQuery = () => {
    if (requireLogin && !isAuthenticated) {
      const landing =
        isLandingThemedPath(location.pathname) ||
        isLandingCompliancePath(location.pathname) ||
        location.pathname === "/";
      const complianceBase = getComplianceBasePath({ landing });
      navigateToApp(`${complianceBase}?action=query`);
      return;
    }
    setRaiseQueryOpen(true);
  };

  return (
    <>
      <footer className="h-32 bg-[#171c4d] text-white">
        <div
          className={landingShellInnerClassName(
            "flex h-full flex-col items-start justify-center gap-4 md:flex-row md:items-center md:justify-between",
          )}
        >
          <div>
            <p className="mt-1 text-base font-normal leading-[23px] text-[#b3b3b3]">
              &copy; Maruti Suzuki India Limited
            </p>
          </div>
          <div className="flex flex-wrap gap-x-14 gap-y-2 text-base font-normal leading-[21px] text-[#b3b3b3]">
            {FOOTER_LINKS.map((link) => {
              if (link.action === "raise-query") {
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={openRaiseQuery}
                    className="transition hover:text-white"
                  >
                    {link.label}
                  </button>
                );
              }

              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="transition hover:text-white"
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer noopener" : undefined}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      </footer>

      <RaiseQueryModal open={raiseQueryOpen} onOpenChange={setRaiseQueryOpen} />
    </>
  );
}
