import AskAiContent from "@/components/ai/AskAiContent";
import LandingPageHero from "@/components/landing/LandingPageHero";
import { ELECTRIC_BLUE } from "@/components/landing/landingTheme";

export default function LandingAskAiPage() {
  return (
    <>
      <LandingPageHero
        title={
          <>
            Compli<span style={{ color: ELECTRIC_BLUE }}>AI</span>
          </>
        }
      />
      <AskAiContent variant="landing" />
    </>
  );
}
