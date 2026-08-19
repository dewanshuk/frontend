import LandingPageHero from "@/components/landing/LandingPageHero";
import { ELECTRIC_BLUE } from "@/components/landing/landingTheme";
import ComplianceHelpdesk from "@/pages/ComplianceHelpdesk";

export default function LandingComplianceHelpdeskPage() {
  return (
    <>
      <LandingPageHero
        title={
          <>
            Compliance <span style={{ color: ELECTRIC_BLUE }}>Helpdesk</span>
          </>
        }
      />
      <ComplianceHelpdesk variant="landing" />
    </>
  );
}
