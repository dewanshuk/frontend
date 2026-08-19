import React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
    const base = "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors";
    const variants = {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
    };
    return <span className={cn(base, variants[variant], className)} {...props} />;
}