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
}) {
  return (
    <section
      className={cn(
        "border-b border-[#d9d9d9]/60 bg-gradient-to-r from-[#171c8f]/5 via-white to-[#2563eb]/5",
        sticky &&
          `sticky ${LANDING_EVENTS_STICKY_TOP} z-40 backdrop-blur-md supports-[backdrop-filter]:bg-white/85`,
      )}
    >
      <div className={landingShellInnerClassName("py-8 md:py-10")}>
        <div className={cn("mx-auto w-full", LANDING_EVENTS_CONTENT_MAX, className)}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function LandingEventsBody({ children, className = "" }) {
  return (
    <div className={landingShellInnerClassName("pb-16 pt-10")}>
      <div className={cn("mx-auto w-full", LANDING_EVENTS_CONTENT_MAX, className)}>
        {children}
      </div>
    </div>
  );
}
