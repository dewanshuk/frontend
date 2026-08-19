import { cn } from "@/lib/utils";

/** Exact visible bounds from Figma 677:14636 inside its 118px cards. */
const ILLUSTRATION_POSITION = {
  gift: "-right-[33px] top-[19px] h-[137px] w-[174px]",
  // COBCE / COI assets have extra internal padding — oversize + object-contain so art reads clearly.
  cobce: "-right-[48px] -top-[22px] h-[175px] w-[220px] object-contain",
  coi: "-right-[48px] -top-[22px] h-[175px] w-[220px] object-contain",
  shield: "right-[49px] top-[20px] h-[78px] w-[66px]",
  complaint: "right-[18px] top-[7px] h-[157px] w-[140px]",
  declaration: "right-[32px] top-[11px] h-[107px] w-[146px]",
  query: "right-[158px] top-[18px] h-[100px] w-[225px]",
};

export default function QuickActionIllustration({ type, image, className }) {
  const position = ILLUSTRATION_POSITION[type] || "right-0 top-0 h-[118px] w-auto";
  const usesContain = type === "cobce" || type === "coi";

  return (
    <img
      src={image}
      alt=""
      decoding="async"
      className={cn(
        "pointer-events-none absolute max-w-none",
        usesContain ? "object-contain" : "object-fill",
        position,
        className,
      )}
      aria-hidden
    />
  );
}
