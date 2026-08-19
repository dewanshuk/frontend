import { Card } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const DETAILED_CARD_GRADIENTS = {
  Policies: ["rgba(99, 102, 241, 0.18)", "rgba(168, 85, 247, 0.12)"],
  "Guidance Notes": ["rgba(16, 185, 129, 0.18)", "rgba(34, 197, 94, 0.12)"],
  "Laws & Regulations": ["rgba(239, 68, 68, 0.18)", "rgba(249, 115, 22, 0.12)"],
  "Law & Regulation": ["rgba(239, 68, 68, 0.18)", "rgba(249, 115, 22, 0.12)"],
  "Training Resources": ["rgba(236, 72, 153, 0.18)", "rgba(168, 85, 247, 0.12)"],
  Flyers: ["rgba(245, 158, 11, 0.18)", "rgba(16, 185, 129, 0.12)"],
  "Early Warnings": ["rgba(14, 165, 233, 0.18)", "rgba(79, 70, 229, 0.12)"],
}

const getDetailedCardGradient = (type) => {
  const colors = DETAILED_CARD_GRADIENTS[type] || ["rgba(148, 163, 184, 0.18)", "rgba(148, 163, 184, 0.12)"]
  return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`
}

const CardArrow = ({ appearance }) => (
  <span
    className={cn(
      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
      appearance === "landing"
        ? "bg-[#171c8f]/[0.07] text-[#171c8f] group-hover:bg-[#171c8f]/[0.13]"
        : "border border-[var(--sds-border-default)] bg-[var(--sds-bg-subtle)] text-[var(--sds-icon-brand)]"
    )}
    aria-hidden
  >
    <ChevronRight className="h-4 w-4 stroke-[2.25] transition-transform duration-200 group-hover:translate-x-0.5" />
  </span>
)

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
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md group flex flex-row items-center justify-between gap-4 px-4 py-3 border rounded-[var(--sds-radius-sm)]",
          className
        )}
        style={{
          borderColor: cardBorderColor,
          backgroundColor: "var(--sds-bg-default)",
          backgroundImage: getDetailedCardGradient(type),
          boxShadow: newCardBoxShadow,
        }}
        onClick={handleClick}
      >
        <p className="text-base line-clamp-1 transition-colors" style={{ color: "var(--sds-text-default)" }}>
          {heading}
        </p>
        <CardArrow appearance={appearance} />
      </Card>
    )
  }

  if (isFlyer && (imageUrl || images?.[0])) {
    const thumb = imageUrl ?? (images[0]?.url ?? images[0])
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md group overflow-hidden border rounded-[var(--sds-radius-md)]",
          className
        )}
        style={{
          borderColor: cardBorderColor,
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
          <CardArrow appearance={appearance} />
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md group border rounded-[var(--sds-radius-sm)]",
        className
      )}
      style={{
        borderColor: cardBorderColor,
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
        <CardArrow appearance={appearance} />
      </div>
    </Card>
  )
}
