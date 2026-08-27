import { landingShellInnerClassName } from "@/components/landing/landingTheme";
import MyTrainings from "@/pages/MyTrainings";

function TrainingsHeroArt({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 380 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Decorative circles background */}
      <circle cx="320" cy="30" r="60" fill="rgba(37,99,235,0.06)" />
      <circle cx="280" cy="140" r="40" fill="rgba(45,212,191,0.08)" />
      
      {/* Graduation cap */}
      <g transform="translate(260, 50)">
        <ellipse cx="40" cy="45" rx="45" ry="20" fill="rgba(37,99,235,0.15)" />
        <polygon points="40,10 85,35 40,55 -5,35" fill="rgba(37,99,235,0.25)" />
        <rect x="38" y="35" width="4" height="30" fill="rgba(37,99,235,0.3)" />
        <circle cx="40" cy="68" r="6" fill="rgba(45,212,191,0.4)" />
      </g>
      
      {/* Certificate/Document */}
      <g transform="translate(140, 80)">
        <rect x="0" y="0" width="60" height="75" rx="4" fill="rgba(255,255,255,0.6)" stroke="rgba(37,99,235,0.2)" strokeWidth="1" />
        <rect x="10" y="12" width="40" height="3" rx="1.5" fill="rgba(45,212,191,0.5)" />
        <rect x="10" y="20" width="30" height="2" rx="1" fill="rgba(37,99,235,0.2)" />
        <rect x="10" y="26" width="35" height="2" rx="1" fill="rgba(37,99,235,0.2)" />
        <rect x="10" y="32" width="25" height="2" rx="1" fill="rgba(37,99,235,0.2)" />
        <circle cx="30" cy="55" r="12" fill="rgba(245,158,11,0.2)" stroke="rgba(245,158,11,0.4)" strokeWidth="1" />
        <path d="M25 55 l4 4 l8 -8" stroke="rgba(245,158,11,0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      
      {/* Progress/Learning icon */}
      <g transform="translate(90, 40)">
        <circle cx="25" cy="25" r="22" fill="rgba(16,185,129,0.1)" />
        <path d="M15 25 h20" stroke="rgba(16,185,129,0.4)" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 32 h14" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 18 h10" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeLinecap="round" />
      </g>
      
      {/* Decorative elements */}
      <circle cx="140" cy="50" r="6" fill="rgba(37,99,235,0.25)" />
      <circle cx="340" cy="130" r="5" fill="rgba(45,212,191,0.35)" />
      <circle cx="120" cy="160" r="4" fill="rgba(236,72,153,0.2)" />
      <circle cx="350" cy="80" r="3" fill="rgba(37,99,235,0.3)" />
      
      {/* Sparkle elements */}
      <path d="M330 160 l0 -6 l0 6 l0 6 l0 -6 l-6 0 l6 0 l6 0 l-6 0" stroke="rgba(45,212,191,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M150 90 l0 -4 l0 4 l0 4 l0 -4 l-4 0 l4 0 l4 0 l-4 0" stroke="rgba(37,99,235,0.4)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingTrainingsPage() {
  return (
    <>
      {/* Hero Section - matching Knowledge Hub style */}
      <section
        className="relative overflow-hidden border-b border-[#d9d9d9]/60"
        style={{
          background: "linear-gradient(100deg, #e8f0fe 0%, #d0edfb 45%, #d4f5f0 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-2 hidden select-none md:block lg:-right-4"
        >
          <TrainingsHeroArt className="h-[200px] w-auto opacity-90" />
        </div>
        <div className={landingShellInnerClassName("relative z-[1] py-7 md:py-9")}>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1f36] md:text-3xl lg:text-[38px]">
            My e-Module{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(95deg, #2563eb 0%, #14b8a6 100%)" }}
            >
              Trainings
            </span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-black/70 md:text-base">
            Track your assigned trainings, monitor progress, and stay compliant with required learning modules.
          </p>
          <div aria-hidden="true" className="mt-3 flex items-center gap-1.5">
            <span
              className="h-1 w-14 rounded-full"
              style={{ backgroundImage: "linear-gradient(90deg, #2563eb 0%, #2dd4bf 100%)" }}
            />
            <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" />
          </div>
        </div>
      </section>
      <MyTrainings variant="landing" />
    </>
  );
}
