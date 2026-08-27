import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/Tooltip";
import { cn } from "@/lib/utils";

export const EVENT_TEXT_TRUNCATE_CHARS = 50;

export function truncateEventText(text, maxChars = EVENT_TEXT_TRUNCATE_CHARS) {
  const full = String(text ?? "").trim();
  if (!full) {
    return { full: "", display: "", truncated: false };
  }
  if (full.length <= maxChars) {
    return { full, display: full, truncated: false };
  }
  return {
    full,
    display: `${full.slice(0, maxChars).trimEnd()}...`,
    truncated: true,
  };
}

export default function EventTruncatedText({
  text,
  maxChars = EVENT_TEXT_TRUNCATE_CHARS,
  as: Comp = "span",
  className,
  tooltipSide = "top",
  ...props
}) {
  const { full, display, truncated } = truncateEventText(text, maxChars);

  if (!full) return null;

  if (!truncated) {
    return (
      <Comp className={className} {...props}>
        {display}
      </Comp>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Comp className={cn("cursor-default", className)} {...props}>
            {display}
          </Comp>
        </TooltipTrigger>
        <TooltipContent
          side={tooltipSide}
          className="z-[300] max-w-md break-words"
        >
          {full}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
