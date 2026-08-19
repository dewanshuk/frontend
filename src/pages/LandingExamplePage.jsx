import { Link } from "react-router-dom";
import LandingPageHero from "@/components/landing/LandingPageHero";
import LandingSectionPanel from "@/components/landing/LandingSectionPanel";
import { ELECTRIC_BLUE, MARUTI_BLUE, landingShellInnerClassName } from "@/components/landing/landingTheme";
import { LANDING_V2_BASE } from "@/lib/appNavigation";

/**
 * Example body for /v2 — shell (header/nav/footer) comes from LandingV2Shell.
 */
export default function LandingExamplePage() {
  return (
    <>
      <LandingPageHero
        title={
          <>
            Landing header with <span style={{ color: ELECTRIC_BLUE }}>your page content</span>
          </>
        }
      />

      <div className={landingShellInnerClassName("py-12")}>
        <div className="grid gap-8 lg:grid-cols-2">
          <LandingSectionPanel className="p-8">
            <h2 className="text-2xl font-semibold text-[#171c4d]">How it works</h2>
            <ul className="mt-4 space-y-3 text-base leading-relaxed text-black/75">
              <li>
                <strong className="text-[#171c4d]">LandingV2Shell</strong> — persistent header, nav, and footer across /v2 routes.
              </li>
              <li>
                <strong className="text-[#171c4d]">LandingPageHero</strong> — optional inner page title band.
              </li>
              <li>
                <strong className="text-[#171c4d]">children</strong> — drop in any page body (FAQ, Knowledge Hub, forms, tables).
              </li>
            </ul>
          </LandingSectionPanel>

          <LandingSectionPanel className="p-8">
            <h2 className="text-2xl font-semibold text-[#171c4d]">Sample page body</h2>
            <p className="mt-4 text-base leading-relaxed text-black/75">
              Replace this panel with content from routes like{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">/faq</code> or{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">/knowledgeHub</code>.
              The header stays fixed and theme-matched.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`${LANDING_V2_BASE}/faq`}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: MARUTI_BLUE }}
              >
                FAQ with landing header
              </Link>
              <Link
                to={`${LANDING_V2_BASE}/compliai`}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: ELECTRIC_BLUE }}
              >
                CompliAI with landing header
              </Link>
              <Link
                to={`${LANDING_V2_BASE}/knowledge-hub`}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: MARUTI_BLUE }}
              >
                Knowledge Hub with landing header
              </Link>
              <Link
                to={`${LANDING_V2_BASE}/gallery`}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: ELECTRIC_BLUE }}
              >
                Gallery with landing header
              </Link>
              <Link
                to={`${LANDING_V2_BASE}/compliance`}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: MARUTI_BLUE }}
              >
                Compliance Helpdesk with landing header
              </Link>
              <Link
                to="/faq"
                className="rounded-full border border-[#d9d9d9] bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-slate-50"
                style={{ color: MARUTI_BLUE }}
              >
                Current FAQ (app shell)
              </Link>
            </div>
          </LandingSectionPanel>
        </div>
      </div>
    </>
  );
}
