import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/**
 * Presentational day grid (react-day-picker). This component does not open a popup
 * by itself — wrap it in a Popover / floating layer, or use `@/atoms/calendar`
 * for an input + portaled popup with auto top/bottom/left/right placement.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // react-day-picker v9 uses new className keys (weekdays/weekday/week/day, button_previous/button_next, etc.)
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4",
        nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
        ),
        month_caption: "flex h-9 w-full items-center justify-center px-10",
        caption_label: "text-sm font-medium select-none",
        table: "w-full border-collapse",
        weekdays: "flex",
        weekday: "flex-1 rounded-md text-center text-[0.8rem] font-normal text-muted-foreground select-none",
        week: "mt-2 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        // Ensure range middle days have a direct background so the range fills cells fully
        range_middle: "bg-accent text-accent-foreground rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...iconProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...iconProps} />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

/** Re-export auto-placement helpers used by portaled input calendars. */
export {
  resolveCalendarOpenSide,
  buildCalendarPopupStyle,
} from "@/atoms/calendar"
