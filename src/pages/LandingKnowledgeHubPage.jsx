import KnowledgeHub from "@/pages/knowledgeHub";
import { landingShellInnerClassName } from "@/components/landing/landingTheme";

function KnowledgeHubHeroArt({ className }) {
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
      
      {/* Lightbulb */}
      <ellipse cx="290" cy="70" rx="32" ry="36" fill="rgba(45,212,191,0.22)" />
      <ellipse cx="290" cy="70" rx="22" ry="26" fill="rgba(45,212,191,0.38)" />
      <path d="M280 92 h20 v6 h-20z" fill="rgba(45,212,191,0.45)" />
      <path d="M283 98 h14 v3 h-14z" fill="rgba(45,212,191,0.45)" />
      {/* Lightbulb glow lines */}
      <path d="M290 35 v-8" stroke="rgba(45,212,191,0.5)" strokeWidth="2" strokeLinecap="round" />
      <path d="M260 50 l-6 -6" stroke="rgba(45,212,191,0.4)" strokeWidth="2" strokeLinecap="round" />
      <path d="M320 50 l6 -6" stroke="rgba(45,212,191,0.4)" strokeWidth="2" strokeLinecap="round" />
      
      {/* Documents stack */}
      <rect x="160" y="75" width="55" height="70" rx="5" fill="rgba(37,99,235,0.1)" transform="rotate(-6 187 110)" />
      <rect x="168" y="70" width="55" height="70" rx="5" fill="rgba(37,99,235,0.15)" transform="rotate(-3 195 105)" />
      <rect x="176" y="65" width="55" height="70" rx="5" fill="rgba(255,255,255,0.5)" stroke="rgba(37,99,235,0.2)" strokeWidth="1" />
      {/* Lines on document */}
      <rect x="186" y="78" width="35" height="3" rx="1.5" fill="rgba(45,212,191,0.55)" />
      <rect x="186" y="86" width="28" height="2" rx="1" fill="rgba(37,99,235,0.25)" />
      <rect x="186" y="92" width="32" height="2" rx="1" fill="rgba(37,99,235,0.25)" />
      <rect x="186" y="98" width="22" height="2" rx="1" fill="rgba(37,99,235,0.25)" />
      
      {/* Legal scale icon */}
      <g transform="translate(100, 110)">
        <circle cx="25" cy="25" r="22" fill="rgba(239,68,68,0.1)" />
        <path d="M25 8 v34" stroke="rgba(239,68,68,0.4)" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 42 h26" stroke="rgba(239,68,68,0.4)" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 18 h30" stroke="rgba(239,68,68,0.4)" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 18 l-3 12 h10 l-3 -12" fill="rgba(239,68,68,0.25)" />
        <path d="M40 18 l-3 12 h10 l-3 -12" fill="rgba(239,68,68,0.25)" />
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

export default function LandingKnowledgeHubPage() {
  return (
    <>
      {/* Hero Section - matching FAQ/Gallery style */}
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
          <KnowledgeHubHeroArt className="h-[200px] w-auto opacity-90" />
        </div>
        <div className={landingShellInnerClassName("relative z-[1] py-7 md:py-9")}>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1f36] md:text-3xl lg:text-[38px]">
            Knowledge{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(95deg, #2563eb 0%, #14b8a6 100%)" }}
            >
              Hub
            </span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-black/70 md:text-base">
            Access Policies, Guidance Notes, Regulations, Trainings & Resources
            to stay informed and compliant.
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
      <KnowledgeHub variant="landing" />
    </>
  );
}
