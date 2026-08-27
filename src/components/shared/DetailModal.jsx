import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export default function DetailModal({ isOpen, title, children, onClose, className }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div
        className={cn(
          "relative mx-4 w-full max-w-[760px] rounded-2xl bg-white shadow-2xl",
          "h-[85vh] overflow-hidden",
          className
        )}
      >
        <div className="flex items-center justify-between px-8 pt-8">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-8 pb-8 pt-6 h-[calc(85vh-88px)] overflow-auto">
          <div className="text-sm leading-7 text-slate-700">{children}</div>
        </div>
      </div>
    </div>
  )
}

