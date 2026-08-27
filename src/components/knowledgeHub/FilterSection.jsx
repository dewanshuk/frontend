import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Multiselect } from "@/components/ui/multiselect"
import { ELECTRIC_BLUE, MARUTI_BLUE } from "@/components/landing/landingTheme"
import { cn } from "@/lib/utils"
import { Search, FileStack, FileText, FileType } from "lucide-react"

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

const APPLICABILITY_ICONS = {
  "All MSIL": FileStack,
  "My Vertical": FileText,
  "My Work Area": FileType,
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
      if (nextSelected.length === 0) {
        setSearchTypes([])
        return
      }

      const hasAll = nextSelected.includes(ALL_TYPE_OPTION)
      const nonAllSelected = nextSelected.filter((item) => item !== ALL_TYPE_OPTION)

      if (isAllSelected && hasAll && nonAllSelected.length > 0) {
        setSearchTypes(nonAllSelected)
        return
      }

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
      types: isAllSelected ? [...TYPE_OPTIONS] : searchTypes,
      searchTypesAll: isAllSelected,
      applicability: selectedApplicability,
    })
  }, [searchQuery, searchTypes, isAllSelected, selectedApplicability, onApplyFilters])

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
      {/* Left: Search bar + Type multiselect dropdown */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-[300px] items-center gap-2 rounded-lg border bg-gray-50/50 px-3 py-2 transition-all focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100"
          style={{ borderColor: "#e5e7eb" }}
        >
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-full flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-gray-400 placeholder:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ color: "var(--sds-text-default)" }}
          />
          {searchQuery.trim() ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="shrink-0 self-center text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
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
          placeholder="All"
          searchable
          searchPlaceholder="Search"
          clearable={!isAllSelected}
          className="h-11 min-w-[100px] w-[100px] rounded-lg text-sm border-gray-200"
          contentClassName="min-w-[280px] w-[320px]"
          style={{
            backgroundColor: "white",
            color: "var(--sds-text-default)",
          }}
          accentColor={isLanding ? ELECTRIC_BLUE : undefined}
          selectedBackground={isLanding ? "rgba(37, 99, 235, 0.12)" : undefined}
        />
      </div>

      {/* Right: Applicability label + buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
          Applicability
        </span>
        <div className="flex flex-wrap gap-2">
          {APPLICABILITY_OPTIONS.map((applicability) => {
            const isActive = selectedApplicability === applicability
            const Icon = APPLICABILITY_ICONS[applicability]
            return (
              <Button
                key={applicability}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedApplicability(applicability)}
                className={cn(
                  "rounded-lg h-9 px-4 font-medium transition-all",
                  isActive
                    ? "shadow-md"
                    : "border-transparent hover:border-blue-200"
                )}
                style={
                  isActive
                    ? {
                        backgroundColor: MARUTI_BLUE,
                        borderColor: MARUTI_BLUE,
                        color: "#fff",
                      }
                    : {
                        backgroundColor: "rgba(37, 99, 235, 0.08)",
                        borderColor: "transparent",
                        color: ELECTRIC_BLUE,
                      }
                }
              >
                <span className="flex items-center gap-1.5">
                  {Icon && <Icon className="h-4 w-4" />}
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
