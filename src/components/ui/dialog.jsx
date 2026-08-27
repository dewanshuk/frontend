import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export const DialogContent = React.forwardRef(({ className, children, hideCloseButton = false, onWheel, onTouchMove, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onWheel={(event) => {
        // Allow nested overflow areas (and portaled popovers inside the dialog) to receive wheel/trackpad scroll.
        event.stopPropagation()
        onWheel?.(event)
      }}
      onTouchMove={(event) => {
        event.stopPropagation()
        onTouchMove?.(event)
      }}
      className={cn(
        "fixed left-[50%] top-[50%] z-[110] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton ? (
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-md p-1 hover:border hover:border-gray-400 text-gray-600 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

export function DialogHeader({ className, ...props }) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
}

export function DialogFooter({ className, ...props }) {
    return (
        <div
            className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
            {...props}
        />
    );
}

export const DialogTitle = React.forwardRef(function DialogTitle(
    { className, ...props },
    ref
) {
    return (
        <DialogPrimitive.Title
            ref={ref}
            className={cn("text-[20px] font-semibold text-gray-900", className)}
            {...props}
        />
    );
});

export const DialogDescription = React.forwardRef(function DialogDescription(
    { className, ...props },
    ref
) {
    return (
        <DialogPrimitive.Description
            ref={ref}
            className={cn("text-[14px] text-gray-600 leading-6", className)}
            {...props}
        />
    );
});
