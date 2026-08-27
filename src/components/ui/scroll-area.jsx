// src/components/ui/scroll-area.jsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function ScrollArea({ className, children, ...props }) {
    return (
        <div
            className={cn(
                "relative h-full w-full overflow-y-auto overflow-x-hidden pr-1",
                // Optional: thin custom scrollbar for modern browsers
                "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}