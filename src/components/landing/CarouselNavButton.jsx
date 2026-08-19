import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "size-[46px] rounded-[32px]",
  lg: "size-16 rounded-[32px]",
};

const VARIANT_CLASSES = {
  outline:
    "border-[1.5px] border-[#2563eb]/30 bg-[#2563eb]/5 text-[#2563eb] hover:border-[#2563eb]/50 hover:bg-[#2563eb]/10",
  glass:
    "border border-white/30 bg-white/15 text-white backdrop-blur-md hover:bg-white/25",
};

/** Shared landing carousel arrow with consistent dimensions and styling. */
export default function CarouselNavButton({
  direction,
  onClick,
  size = "sm",
  variant = "outline",
  label,
  className,
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-label={label || (direction === "prev" ? "Previous" : "Next")}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-center transition",
        SIZE_CLASSES[size] || SIZE_CLASSES.sm,
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.outline,
        className,
      )}
    >
      <Icon className="size-8" />
    </button>
  );
}
