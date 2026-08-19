import LandingPageHero from "@/components/landing/LandingPageHero";
import { ELECTRIC_BLUE } from "@/components/landing/landingTheme";
import KnowledgeHub from "@/pages/knowledgeHub";

export default function LandingKnowledgeHubPage() {
  return (
    <>
      <LandingPageHero
        title={
          <>
            Knowledge <span style={{ color: ELECTRIC_BLUE }}>Hub</span>
          </>
        }
      />
      <KnowledgeHub variant="landing" />
    </>
  );
}
