import { Card } from "@/components/ui/card"
import { ChevronRight, FileText, FileType, Scale, Video, BellRing, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"

// Color scheme - pastel backgrounds with greyish fade at end
const TYPE_COLORS = {
  Policies: { gradient: "linear-gradient(135deg, #bfdbfe 0%, #dbeafe 60%, #d1d5db 100%)", icon: "#2563eb", iconBg: "rgba(37, 99, 235, 0.2)" },
  "Guidance Notes": { gradient: "linear-gradient(135deg, #a7f3d0 0%, #d1fae5 60%, #d1d5db 100%)", icon: "#059669", iconBg: "rgba(5, 150, 105, 0.2)" },
  "Law & Regulation": { gradient: "linear-gradient(135deg, #fbcfe8 0%, #fce7f3 60%, #d1d5db 100%)", icon: "#db2777", iconBg: "rgba(219, 39, 119, 0.2)" },
  "Training Resources": { gradient: "linear-gradient(135deg, #ddd6fe 0%, #ede9fe 60%, #d1d5db 100%)", icon: "#7c3aed", iconBg: "rgba(124, 58, 237, 0.2)" },
  "Early Warnings": { gradient: "linear-gradient(135deg, #fde68a 0%, #fef3c7 60%, #d1d5db 100%)", icon: "#d97706", iconBg: "rgba(217, 119, 6, 0.2)" },
  Flyers: { gradient: "linear-gradient(135deg, #c7d2fe 0%, #e0e7ff 60%, #d1d5db 100%)", icon: "#4f46e5", iconBg: "rgba(79, 70, 229, 0.2)" },
}

const TYPE_ICONS = {
  Policies: FileText,
  "Guidance Notes": FileType,
  "Law & Regulation": Scale,
  "Training Resources": Video,
  "Early Warnings": BellRing,
  Flyers: FileImage,
}

const DETAILED_CARD_GRADIENTS = {
  Policies: ["rgba(59, 130, 246, 0.06)", "rgba(59, 130, 246, 0.02)"],
  "Guidance Notes": ["rgba(34, 197, 94, 0.06)", "rgba(34, 197, 94, 0.02)"],
  "Laws & Regulations": ["rgba(239, 68, 68, 0.05)", "rgba(239, 68, 68, 0.02)"],
  "Law & Regulation": ["rgba(239, 68, 68, 0.05)", "rgba(239, 68, 68, 0.02)"],
  "Training Resources": ["rgba(168, 85, 247, 0.05)", "rgba(168, 85, 247, 0.02)"],
  Flyers: ["rgba(249, 115, 22, 0.05)", "rgba(249, 115, 22, 0.02)"],
  "Early Warnings": ["rgba(6, 182, 212, 0.06)", "rgba(6, 182, 212, 0.02)"],
}

// Shadow styles for cards based on type
const getCardShadow = (type) => {
  const shadowColors = {
    Policies: "rgba(59, 130, 246, 0.12)",
    "Guidance Notes": "rgba(34, 197, 94, 0.12)",
    "Law & Regulation": "rgba(239, 68, 68, 0.10)",
    "Training Resources": "rgba(168, 85, 247, 0.10)",
    "Early Warnings": "rgba(6, 182, 212, 0.12)",
    Flyers: "rgba(249, 115, 22, 0.10)",
  }
  const color = shadowColors[type] || "rgba(0, 0, 0, 0.06)"
  return `0 1px 3px ${color}, 0 2px 6px ${color}`
}

const getDetailedCardGradient = (type) => {
  const colors = DETAILED_CARD_GRADIENTS[type] || ["rgba(148, 163, 184, 0.18)", "rgba(148, 163, 184, 0.12)"]
  return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`
}

const CardArrow = ({ appearance, type }) => {
  const colors = TYPE_COLORS[type] || TYPE_COLORS.Policies
  return (
    <span
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 group-hover:scale-105"
      style={{
        backgroundColor: colors.iconBg,
        color: colors.icon,
      }}
      aria-hidden
    >
      <ChevronRight className="h-4 w-4 stroke-[2.25] transition-transform duration-200 group-hover:translate-x-0.5" />
    </span>
  )
}

const CardIcon = ({ type, className }) => {
  const Icon = TYPE_ICONS[type]
  const colors = TYPE_COLORS[type] || TYPE_COLORS.Policies
  if (!Icon) return null
  return (
    <span
      className={cn("flex h-8 w-8 items-center justify-center rounded-lg", className)}
      style={{ backgroundColor: colors.iconBg }}
    >
      <Icon className="h-4 w-4" style={{ color: colors.icon }} />
    </span>
  )
}

/**
 * variant "default" – text card (heading, type, chevron)
 * variant "flyer" – image card (thumbnail, title, chevron) for Flyers type
 * variant "detailed" – list row (heading + chevron) for detailed view sections
 */
export function KnowledgeCard({
  heading,
  type,
  onClick,
  className,
  variant = "default",
  imageUrl,
  images,
  isNew,
  appearance = "default",
}) {
  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onClick) {
      onClick()
    }
  }

  const isFlyer = variant === "flyer" || type === "Flyers"
  const isNewCard = Boolean(isNew)
  const cardBorderColor = isNewCard ? "#0B3D91" : "var(--sds-border-default)"
  const newCardBoxShadow = isNewCard ? "0 0 0 2px rgba(11, 61, 145, 0.25)" : undefined

  if (variant === "detailed" && !isFlyer) {
    const colors = TYPE_COLORS[type] || TYPE_COLORS.Policies
    const cardShadow = appearance === "landing" ? getCardShadow(type) : undefined
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-lg group flex flex-row items-center gap-3 px-4 py-3 rounded-xl shadow-sm",
          className
        )}
        style={{
          background: colors.gradient,
          boxShadow: newCardBoxShadow,
        }}
        onClick={handleClick}
      >
        <CardIcon type={type} />
        <p className="flex-1 text-[15px] font-medium line-clamp-1 transition-colors" style={{ color: "var(--sds-text-default)" }}>
          {heading}
        </p>
        <CardArrow appearance={appearance} type={type} />
      </Card>
    )
  }

  if (isFlyer && (imageUrl || images?.[0])) {
    const thumb = imageUrl ?? (images[0]?.url ?? images[0])
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md group overflow-hidden rounded-[var(--sds-radius-md)] shadow-sm",
          className
        )}
        style={{
          backgroundColor: "var(--sds-bg-default)",
          boxShadow: newCardBoxShadow,
        }}
        onClick={handleClick}
      >
        <div className="aspect-[4/3] relative" style={{ backgroundColor: "var(--sds-bg-subtle)" }}>
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-contain transition-opacity group-hover:opacity-95"
          />
        </div>
        <div className="p-4 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold line-clamp-2 transition-colors flex-1 min-w-0" style={{ color: "var(--sds-text-default)" }}>
            {heading}
          </h3>
          <CardArrow appearance={appearance} type={type} />
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md group rounded-[var(--sds-radius-sm)] shadow-sm",
        className
      )}
      style={{
        backgroundColor: "var(--sds-bg-default)",
        boxShadow: newCardBoxShadow,
      }}
      onClick={handleClick}
    >
      <div className="p-6 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-2 line-clamp-2 transition-colors" style={{ color: "var(--sds-text-default)" }}>
            {heading}
          </h3>
          <p className="text-sm" style={{ color: "var(--sds-text-tertiary)" }}>{type}</p>
        </div>
        <CardArrow appearance={appearance} type={type} />
      </div>
    </Card>
  )
}
