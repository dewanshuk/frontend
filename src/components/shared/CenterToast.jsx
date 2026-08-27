import { useEffect } from "react"
import { AlertTriangle, Check, X, XCircle, MinusCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export default function CenterToast({ open, variant, message, onClose, duration = 3500 }) {
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => onClose?.(), duration)
    return () => window.clearTimeout(t)
  }, [open, onClose, duration])

  if (!open) return null

  const isError = variant === "error"
  const isWarning = variant === "warning"
  const isDeactivate = variant === "deactivate"
  const Icon = isError ? XCircle : isWarning ? AlertTriangle : isDeactivate ? MinusCircle : Check

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-4 rounded-2xl border bg-white px-6 py-5 shadow-2xl",
          "min-w-[420px] max-w-[90vw] ecp-toast-pop"
        )}
        role="status"
        aria-live="polite"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border",
            isError
              ? "border-rose-200 bg-rose-50"
              : isWarning
                ? "border-amber-200 bg-amber-50"
                : isDeactivate
                  ? "border-orange-200 bg-orange-50"
                  : "border-emerald-300 bg-emerald-500"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              isError
                ? "text-rose-600 ecp-icon-shake"
                : isWarning
                  ? "text-amber-600"
                  : isDeactivate
                    ? "text-orange-600"
                    : "text-white ecp-icon-bounce",
            )}
          />
        </div>
        <div className="flex-1">
          <div
            className={cn(
              "text-base font-semibold",
              isError ? "text-rose-700" : isWarning ? "text-amber-800" : isDeactivate ? "text-orange-700" : "text-slate-900",
            )}
          >
            {message}
          </div>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

