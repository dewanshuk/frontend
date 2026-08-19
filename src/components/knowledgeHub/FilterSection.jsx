import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Multiselect } from "@/components/ui/multiselect"
import { ELECTRIC_BLUE, MARUTI_BLUE } from "@/components/landing/landingTheme"
import { cn } from "@/lib/utils"

export const TYPE_OPTIONS = [
  "Policies",
  "Guidance Notes",
  "Law & Regulation",
  "Training Resources",
  "Early Warnings",
  "Flyers",
]

const ALL_TYPE_OPTION = "All"

const APPLICABILITY_OPTIONS = [
  "All MSIL",
  "My Vertical",
  "My Work Area",
]

const inputBoxStyle = {
  borderColor: "var(--sds-border-default)",
  backgroundColor: "var(--sds-bg-default)",
}

export function FilterSection({
  onApplyFilters,
  searchPlaceholder,
  initialSearch = "",
  initialApplicability = "All MSIL",
  variant = "default",
}) {
  const isLanding = variant === "landing"
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedApplicability, setSelectedApplicability] = useState(initialApplicability)
  // Empty array means "All" for search-scope dropdown (independent of tabs).
  const [searchTypes, setSearchTypes] = useState([])

  useEffect(() => {
    setSearchQuery(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setSelectedApplicability(initialApplicability)
  }, [initialApplicability])

  const placeholder = searchPlaceholder ?? "Search Knowledge Hub..."
  const isAllSelected = searchTypes.length === 0
  const multiselectSelected = isAllSelected ? [ALL_TYPE_OPTION] : searchTypes

  const handleTypesChange = useCallback(
    (nextSelected) => {
      // Clear (X) → All
      if (nextSelected.length === 0) {
        setSearchTypes([])
        return
      }

      const hasAll = nextSelected.includes(ALL_TYPE_OPTION)
      const nonAllSelected = nextSelected.filter((item) => item !== ALL_TYPE_OPTION)

      // All was selected and a specific category was clicked → drop All, keep only that category.
      if (isAllSelected && hasAll && nonAllSelected.length > 0) {
        setSearchTypes(nonAllSelected)
        return
      }

      // Selecting All (from any state) → All only, no other checkboxes.
      if (hasAll) {
        setSearchTypes([])
        return
      }

      setSearchTypes(nonAllSelected)
    },
    [isAllSelected]
  )

  useEffect(() => {
    if (!onApplyFilters) return
    onApplyFilters({
      search: searchQuery,
      organizations: [],
      // Empty searchTypes means All categories for search.
      types: isAllSelected ? [...TYPE_OPTIONS] : searchTypes,
      searchTypesAll: isAllSelected,
      applicability: selectedApplicability,
    })
  }, [searchQuery, searchTypes, isAllSelected, selectedApplicability, onApplyFilters])

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Left: Search bar + Type multiselect dropdown */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-[320px] items-center gap-2 rounded-[var(--sds-radius-sm)] border px-3 py-2"
          style={inputBoxStyle}
        >
          <Input
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-full flex-1 border-0 bg-transparent p-0 text-sm placeholder:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ color: "var(--sds-text-default)" }}
          />
          {searchQuery.trim() ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className={cn(
                "shrink-0 self-center text-xs font-medium underline-offset-2 hover:underline",
                isLanding ? "text-[#2563eb]" : "text-blue-600"
              )}
              aria-label="Clear search"
            >
              clear
            </button>
          ) : null}
        </div>
        <Multiselect
          options={[ALL_TYPE_OPTION, ...TYPE_OPTIONS]}
          selected={multiselectSelected}
          onSelectionChange={handleTypesChange}
          placeholder="All Types"
          searchable
          searchPlaceholder="Search"
          clearable={!isAllSelected}
          className="h-10 min-w-[160px] w-[12%] max-w-[220px] rounded-[var(--sds-radius-sm)] text-sm"
          contentClassName="min-w-[280px] w-[320px]"
          style={{
            ...inputBoxStyle,
            color: "var(--sds-text-default)",
          }}
          accentColor={isLanding ? ELECTRIC_BLUE : undefined}
          selectedBackground={isLanding ? "rgba(37, 99, 235, 0.12)" : undefined}
        />
      </div>

      {/* Right: Applicability label + buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="text-sm font-medium whitespace-nowrap"
          style={{ color: "var(--sds-text-default)" }}
        >
          Applicability
        </span>
        <div className="flex flex-wrap gap-2">
          {APPLICABILITY_OPTIONS.map((applicability) => {
            const isActive = selectedApplicability === applicability
            const iconSrc =
              applicability === "All MSIL"
                ? "/assets/icons/file-stack.svg"
                : applicability === "My Vertical"
                  ? "/assets/icons/file-text.svg"
                  : "/assets/icons/file-type.svg"
            return (
              <Button
                key={applicability}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedApplicability(applicability)}
                className={cn(
                  "rounded-md",
                  !isLanding &&
                    isActive &&
                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-primary",
                  !isLanding &&
                    !isActive &&
                    "hover:bg-gray-200 hover:text-blue-700 bg-blue-200 text-blue-700",
                  isLanding && isActive && "text-white hover:text-white",
                  isLanding && !isActive && "hover:opacity-90"
                )}
                style={
                  isLanding
                    ? isActive
                      ? {
                          backgroundColor: MARUTI_BLUE,
                          borderColor: MARUTI_BLUE,
                          color: "#fff",
                        }
                      : {
                          backgroundColor: "rgba(37, 99, 235, 0.14)",
                          borderColor: "transparent",
                          color: ELECTRIC_BLUE,
                        }
                    : undefined
                }
              >
                <span className="flex items-center gap-1">
                  <img
                    src={iconSrc}
                    alt=""
                    className="h-4 w-4"
                    style={{
                      filter: isActive ? "brightness(0) invert(1)" : undefined,
                    }}
                  />
                  <span>{applicability}</span>
                </span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
