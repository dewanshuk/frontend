import FaqContent from "@/components/faq/FaqContent";
import LandingPageHero from "@/components/landing/LandingPageHero";
import { ELECTRIC_BLUE } from "@/components/landing/landingTheme";

export default function LandingFaqPage() {
  return (
    <>
      <LandingPageHero
        title={
          <>
            Frequently Asked <span style={{ color: ELECTRIC_BLUE }}>Questions</span>
          </>
        }
      />
      <FaqContent variant="landing" />
    </>
  );
}
