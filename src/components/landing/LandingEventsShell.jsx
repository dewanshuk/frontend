import { landingShellInnerClassName } from "@/components/landing/landingTheme";
import { cn } from "@/lib/utils";

/** Matches landing / navbar content column. */
export const LANDING_EVENTS_CONTENT_MAX = "max-w-[1680px]";

/** Landing header (h-24) + secondary nav (h-12 / md:h-14) — keep Gallery sticky below it. */
const LANDING_EVENTS_STICKY_TOP = "top-[9rem] md:top-[9.5rem]";

export function LandingEventsHero({
  children,
  className = "",
  sticky = false,
  bgClassName = "border-b border-[#d9d9d9]/60 bg-gradient-to-r from-[#171c8f]/5 via-white to-[#2563eb]/5",
  innerClassName = "py-8 md:py-10",
  /** Inline background for gradients Tailwind can't express as a class. */
  style,
  /** Decorative layer painted behind the hero content (waves, blooms, …). */
  backdrop = null,
}) {
  return (
    <section
      style={style}
      className={cn(
        "relative overflow-hidden",
        bgClassName,
        // A caller-supplied background wins, so only apply the frosted white
        // sticky fill when the hero is using the default light treatment.
        sticky && `sticky ${LANDING_EVENTS_STICKY_TOP} z-40 backdrop-blur-md`,
        sticky && !style && "supports-[backdrop-filter]:bg-white/85",
      )}
    >
      {backdrop ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          {backdrop}
        </div>
      ) : null}
      <div className={landingShellInnerClassName(innerClassName)}>
        <div className={cn("relative z-[1] mx-auto w-full", LANDING_EVENTS_CONTENT_MAX, className)}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function LandingEventsBody({ children, className = "" }) {
  return (
    <div className="flex-1 min-h-full w-full">
      <div className={landingShellInnerClassName("pb-16 pt-10")}>
        <div className={cn("mx-auto w-full", LANDING_EVENTS_CONTENT_MAX, className)}>
          {children}
        </div>
      </div>
    </div>
  );
}
