import { MARUTI_BLUE, landingShellInnerClassName } from "./landingTheme";

export default function LandingPageHero({
  eyebrow,
  title,
  subtitle,
  rightContent,
  children,
  compact = false,
  decoration = null,
  background = null,
}) {
  return (
    <section
      className={`relative overflow-hidden border-b border-[#d9d9d9]/60${background ? "" : " bg-gradient-to-r from-[#171c8f]/5 via-white to-[#2563eb]/5"}`}
      style={background ? { background } : undefined}
    >
      {decoration ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden select-none md:block"
        >
          {decoration}
        </div>
      ) : null}
      <div
        className={landingShellInnerClassName(
          compact ? "relative z-[1] py-4 md:py-5" : "relative z-[1] py-7 md:py-10"
        )}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            {eyebrow ? (
              <p
                className={
                  compact
                    ? "text-xs font-bold uppercase tracking-[0.2em]"
                    : "text-sm font-bold uppercase tracking-[0.2em]"
                }
                style={{ color: MARUTI_BLUE }}
              >
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={
                compact
                  ? "mt-1 text-xl font-bold text-[#171c4d] md:text-2xl"
                  : "mt-3 text-3xl font-bold text-[#171c4d] md:text-4xl"
              }
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className={
                  compact
                    ? "mt-1 max-w-3xl text-sm text-black/75"
                    : "mt-2 max-w-3xl text-base text-black/75"
                }
              >
                {subtitle}
              </p>
            ) : null}
            {children}
          </div>
          {rightContent ? (
            <div className="hidden shrink-0 md:block">{rightContent}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
