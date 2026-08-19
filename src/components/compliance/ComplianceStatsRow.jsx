import React from "react"
import { cn } from "@/lib/utils"
import {
  ClipboardList,
  AlertCircle,
  Calendar,
  Gift,
  User,
  HelpCircle,
  FileText,
  ArchiveRestore,
  Loader,
} from "lucide-react"

const iconColorMap = {
  "Total Due to Respond": "text-orange-500",
  "Total Overdue to Respond": "text-red-600",
  "Total Completed": "text-emerald-600",
  "Total In Progress": "text-amber-500",
  "Annual Declarations": "text-violet-600",
  "Gift Declarations": "text-violet-600",
  "Self Declarations": "text-violet-600",
  Queries: "text-violet-600",
  Complaints: "text-violet-600",
}

const ICON_MAP = {
  "Total Due to Respond": ClipboardList,
  "Total Overdue to Respond": AlertCircle,
  "Total Completed": ArchiveRestore,
  "Total In Progress": Loader,
  "Annual Declarations": Calendar,
  // "Gift Declarations": Gift,
  "Self Declarations": User,
  Queries: HelpCircle,
  // Complaints: FileText,
}

export default function ComplianceStatsRow({
  items = [],
  selectedKeys = [],
  selectedKey = null,
  onCardClick,
}) {
  const activeKeys = selectedKeys?.length
    ? selectedKeys
    : selectedKey
      ? [selectedKey]
      : []

  const count = Math.max(items.length, 1)

  return (
    <div className="mb-4 w-full min-w-0">
      {/* Single horizontal row — equal columns; titles wrap instead of truncating */}
      <div
        className="grid w-full gap-2"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = ICON_MAP[item.title]
          const isSecondary = !item.title.startsWith("Total")
          const selected = activeKeys.includes(item.title)

          const cardBg = selected
            ? "bg-white border-blue-600"
            : isSecondary
              ? "bg-violet-50 border-violet-100"
              : "bg-white border-slate-200"

          const iconColor = iconColorMap[item.title] ?? "text-slate-700"

          const cardClass = cn(
            "flex min-h-[72px] min-w-0 items-center gap-2 rounded-xl border px-3 py-3 text-left shadow-sm",
            cardBg,
            onCardClick ? "cursor-pointer" : "",
          )

        const content = (
  <>
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {Icon ? (
        <Icon
          className={cn(
            "size-7 shrink-0 sm:size-8",
            iconColor
          )}
        />
      ) : null}

      <div
        className={cn(
          "min-w-0 flex-1 whitespace-normal break-words hyphens-auto",
          "text-[clamp(1rem,1.25vw,1.15rem)] font-normal leading-snug text-[#1e1e1e]"
        )}
      >
        {item.title}
      </div>
    </div>

    <div className="shrink-0 self-center text-right text-[clamp(1.35rem,2.1vw,1.9rem)] font-normal leading-none tracking-tight text-[#1e1e1e]">
      {item.value}
    </div>
  </>
)
          if (onCardClick) {
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => onCardClick(item.title)}
                className={cardClass}
                aria-pressed={selected}
              >
                {content}
              </button>
            )
          }

          return (
            <div key={item.title} className={cardClass}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}