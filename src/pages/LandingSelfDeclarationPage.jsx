import LandingPageHero from "@/components/landing/LandingPageHero";
import { ELECTRIC_BLUE } from "@/components/landing/landingTheme";
import SelfDeclaration from "@/pages/SelfDeclaration";

export default function LandingSelfDeclarationPage() {
  return (
    <>
      <LandingPageHero
        title={
          <>
            Self <span style={{ color: ELECTRIC_BLUE }}>Declaration</span>
          </>
        }
      />
      <SelfDeclaration variant="landing" />
    </>
  );
}
