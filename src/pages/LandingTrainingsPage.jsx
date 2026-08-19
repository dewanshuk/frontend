import LandingPageHero from "@/components/landing/LandingPageHero";
import { ELECTRIC_BLUE } from "@/components/landing/landingTheme";
import MyTrainings from "@/pages/MyTrainings";

export default function LandingTrainingsPage() {
  return (
    <>
      <LandingPageHero
        title={
          <>
            My e-Module <span style={{ color: ELECTRIC_BLUE }}>Trainings</span>
          </>
        }
      />
      <div className="w-full min-w-0 max-w-full overflow-x-hidden">
        <MyTrainings variant="landing" />
      </div>
    </>
  );
}
