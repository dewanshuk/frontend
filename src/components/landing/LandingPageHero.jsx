import { MARUTI_BLUE, landingShellInnerClassName } from "./landingTheme";

export default function LandingPageHero({
  eyebrow,
  title,
  subtitle,
  children,
}) {
  return (
    <section className="border-b border-[#d9d9d9]/60 bg-gradient-to-r from-[#171c8f]/5 via-white to-[#2563eb]/5">
      <div className={landingShellInnerClassName("py-10 md:py-12")}>
        {eyebrow ? (
          <p
            className="text-sm font-bold uppercase tracking-[0.2em]"
            style={{ color: MARUTI_BLUE }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-bold text-[#171c4d] md:text-[40px] md:leading-tight lg:text-[44px] xl:text-[48px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-3xl text-base text-black/75 md:text-lg lg:text-xl">
            {subtitle}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
