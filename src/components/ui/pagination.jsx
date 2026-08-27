import * as React from "react"
import { cn } from "@/lib/utils"

/** Build the Figma-style page list: e.g. 1 2 3 … 10 11 */
function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 0) return []
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages - 1, totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, 2, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages]
}

/**
 * Figma pagination (MSIL | ECP — node 1494:21939)
 * Previous / page numbers / … / Next
 */
const Pagination = ({
  className,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  disabled = false,
  ...props
}) => {
  const pageCount = Math.max(0, Number(totalPages) || 0)
  const page = Math.min(Math.max(1, Number(currentPage) || 1), Math.max(1, pageCount || 1))
  const pages = getVisiblePages(page, pageCount)
  const canPrevious = !disabled && page > 1 && pageCount > 0
  const canNext = !disabled && page < pageCount

  const goTo = (nextPage) => {
    if (disabled || typeof onPageChange !== "function") return
    if (nextPage < 1 || nextPage > pageCount) return
    if (nextPage === page) return
    onPageChange(nextPage)
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={!canPrevious}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-lg leading-[1.4]",
          canPrevious
            ? "text-[#1e1e1e]"
            : "cursor-not-allowed text-[#757575] opacity-50",
        )}
      >
        <img
          src="/assets/icons/orch/pagination-prev.svg"
          alt=""
          className="size-4 shrink-0"
        />
        Previous
      </button>

      <div className="flex items-center gap-2">
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-4 py-2 text-lg font-bold leading-[1.4] text-black select-none"
              aria-hidden
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => goTo(item)}
              disabled={disabled}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "flex items-center justify-center rounded-lg text-lg leading-[1.4]",
                item === page
                  ? "bg-[#2563eb] px-[15px] py-2 text-white"
                  : "px-3 py-2 text-[#1e1e1e] hover:bg-black/5",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={!canNext}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-lg leading-[1.4]",
          canNext
            ? "text-[#1e1e1e]"
            : "cursor-not-allowed text-[#757575] opacity-50",
        )}
      >
        Next
        <img
          src="/assets/icons/orch/pagination-next.svg"
          alt=""
          className="size-4 shrink-0"
        />
      </button>
    </nav>
  )
}

Pagination.displayName = "Pagination"

export { Pagination, getVisiblePages }
