import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function Multiselect({
  options = [],
  selected = [],
  onSelectionChange,
  placeholder = "Select items...",
  searchable = false,
  searchPlaceholder = "Search",
  singleSelect = false,
  className,
  style,
  accentColor,
  selectedBackground,
  contentClassName,
  clearable = true,
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const handleToggle = (option) => {
    if (singleSelect) {
      const newSelected = selected.includes(option) ? [] : [option]
      onSelectionChange(newSelected)
      return
    }

    const newSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onSelectionChange(newSelected)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onSelectionChange([])
  }

  React.useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((opt) => String(opt).toLowerCase().includes(q))
  }, [options, query, searchable])

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between items-center text-left font-normal relative",
            !selected.length && "text-muted-foreground",
            accentColor &&
              "hover:bg-[rgba(37,99,235,0.08)] hover:text-[var(--sds-text-default)] hover:border-[var(--sds-border-default)]",
            className
          )}
          style={style}
        >
          <span className="truncate flex-1 text-left flex items-center">{displayText}</span>
          <div className="flex items-center gap-1 shrink-0">
            {clearable && selected.length > 0 && (
              <button
                type="button"
                className={cn(
                  "rounded-sm p-0.5 flex items-center justify-center",
                  accentColor
                    ? "hover:bg-[rgba(37,99,235,0.14)] hover:text-[#2563eb]"
                    : "hover:bg-accent"
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear(e)
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto min-w-[var(--radix-popover-trigger-width)] max-w-[min(360px,calc(100vw-2rem))] overflow-x-hidden p-0",
          contentClassName
        )}
        align="start"
        style={{
          backgroundColor: "var(--sds-bg-default)",
          borderColor: "var(--sds-border-default)",
        }}
      >
        <div className="p-2">
          {searchable && (
            <div className="relative mb-2 flex h-9 items-center">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full pr-10"
                style={{
                  borderColor: "var(--sds-border-default)",
                  backgroundColor: "var(--sds-bg-default)",
                  color: "var(--sds-text-default)",
                }}
              />
              <Search
                className={cn(
                  "pointer-events-none absolute right-3 h-4 w-4",
                  !accentColor && "text-blue-600"
                )}
                style={accentColor ? { color: accentColor } : undefined}
              />
            </div>
          )}
          <div className="max-h-[280px] overflow-x-hidden overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No options available</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option)
                return (
                  <div
                    key={option}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors text-[var(--sds-text-default)] whitespace-normal break-words",
                      !accentColor &&
                        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      !accentColor && isSelected && "bg-accent text-accent-foreground"
                    )}
                    style={
                      accentColor
                        ? {
                            backgroundColor: isSelected
                              ? selectedBackground || "rgba(37, 99, 235, 0.12)"
                              : undefined,
                          }
                        : undefined
                    }
                    onMouseEnter={
                      accentColor
                        ? (e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor =
                                selectedBackground || "rgba(37, 99, 235, 0.08)"
                            }
                          }
                        : undefined
                    }
                    onMouseLeave={
                      accentColor
                        ? (e) => {
                            e.currentTarget.style.backgroundColor = isSelected
                              ? selectedBackground || "rgba(37, 99, 235, 0.12)"
                              : ""
                          }
                        : undefined
                    }
                    onClick={() => handleToggle(option)}
                  >
                    <span
                      className="absolute left-2 top-1/2 flex h-3.5 w-3.5 -translate-y-1/2 items-center justify-center rounded-[3px] border"
                      style={{
                        borderColor: isSelected && accentColor ? accentColor : "var(--sds-border-default)",
                        backgroundColor: isSelected && accentColor ? accentColor : undefined,
                      }}
                      aria-hidden
                    >
                      {isSelected && (
                        <Check
                          className="h-3 w-3"
                          style={{ color: accentColor ? "#fff" : "var(--sds-icon-brand)" }}
                        />
                      )}
                    </span>
                    {option}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
