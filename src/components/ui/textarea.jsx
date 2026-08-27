import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef(function Textarea(
    { className, ...props },
    ref
) {
    return (
        <textarea
            ref={ref}
            className={cn(
                "flex w-full rounded-md border border-gray-300 bg-white px-3 py-2",
                "text-[14px] text-gray-900 placeholder:text-gray-400",
                "shadow-sm outline-none",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "min-h-[120px] resize-y",
                className
            )}
            {...props}
        />
    );
});