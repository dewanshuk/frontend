import AskAiContent from "@/components/ai/AskAiContent";
import LandingPageHero from "@/components/landing/LandingPageHero";
import { ASK_AI_PALETTE } from "@/components/ai/constants";
import { GALLERY_PAGE_BACKGROUND } from "@/components/events/galleryTheme";

/** Decorative sweeping arcs + sparkles anchored to the hero's right corner. */
function AskAiHeroDecoration() {
  return (
    <svg
      viewBox="0 0 420 200"
      preserveAspectRatio="xMaxYMid slice"
      className="h-full w-[min(46vw,520px)]"
      fill="none"
    >
      <defs>
        <linearGradient id="askAiArcA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ASK_AI_PALETTE.blue} stopOpacity="0.22" />
          <stop offset="100%" stopColor={ASK_AI_PALETTE.cyan} stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="askAiArcB" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ASK_AI_PALETTE.teal} stopOpacity="0.28" />
          <stop offset="100%" stopColor={ASK_AI_PALETTE.blue} stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="askAiArcC" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={ASK_AI_PALETTE.navy} stopOpacity="0.14" />
          <stop offset="100%" stopColor={ASK_AI_PALETTE.cyan} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Layered arcs sweeping in from the right edge */}
      <path d="M420 -40C300 10 268 96 306 200H420Z" fill="url(#askAiArcA)" />
      <path d="M420 24C348 52 322 128 344 200H420Z" fill="url(#askAiArcB)" />
      <path d="M420 -70C238 -18 190 90 224 200H288C246 96 292 8 420 -22Z" fill="url(#askAiArcC)" />

      {/* Soft glow */}
      <circle cx="392" cy="52" r="76" fill={ASK_AI_PALETTE.cyan} fillOpacity="0.07" />

      {/* Sparkles */}
      <g fill={ASK_AI_PALETTE.blue}>
        <path
          d="M232 54c0 8-6 14-14 14 8 0 14 6 14 14 0-8 6-14 14-14-8 0-14-6-14-14Z"
          fillOpacity="0.5"
        />
        <path
          d="M300 128c0 5-4 9-9 9 5 0 9 4 9 9 0-5 4-9 9-9-5 0-9-4-9-9Z"
          fillOpacity="0.32"
        />
      </g>
      <g fill={ASK_AI_PALETTE.teal}>
        <path
          d="M356 26c0 6-5 11-11 11 6 0 11 5 11 11 0-6 5-11 11-11-6 0-11-5-11-11Z"
          fillOpacity="0.45"
        />
        <circle cx="268" cy="150" r="3" fillOpacity="0.4" />
        <circle cx="382" cy="140" r="4" fillOpacity="0.3" />
      </g>
    </svg>
  );
}

export default function LandingAskAiPage() {
  return (
    <>
      <LandingPageHero
        compact
        background={GALLERY_PAGE_BACKGROUND}
        decoration={<AskAiHeroDecoration />}
        title={
          <span className="inline-flex items-center gap-1.5">
            <span style={{ color: ASK_AI_PALETTE.navy }}>Compli</span>
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(90deg, ${ASK_AI_PALETTE.blue} 0%, ${ASK_AI_PALETTE.teal} 100%)`,
              }}
            >
              AI
            </span>
            <span
              aria-hidden="true"
              className="ml-2 inline-flex items-baseline gap-0.5 leading-none"
              style={{ color: ASK_AI_PALETTE.cyan }}
            >
              <span className="text-xl">✦</span>
              <span className="text-sm" style={{ color: ASK_AI_PALETTE.teal }}>
                ✦
              </span>
            </span>
          </span>
        }
      />
      <AskAiContent variant="landing" />
    </>
  );
}
