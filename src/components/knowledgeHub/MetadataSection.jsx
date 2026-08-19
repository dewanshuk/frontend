import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Files } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn, markdownToDisplayHtml } from "@/lib/utils"
import {
  getKnowledgeHubBasePath,
  isLandingKnowledgeHubPath,
} from "@/lib/appNavigation"

const labelClassName = "mb-1 block text-sm font-semibold"
const valueClassName = "text-sm break-words whitespace-normal [overflow-wrap:anywhere]"
const toggleButtonClassName =
  "h-8 w-8 shrink-0 rounded-md hover:bg-blue-100 hover:text-blue-600"

export function MetadataSection({
  item,
  onCollapseChange,
  breadcrumbTrail = [],
  defaultCollapsed = false,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const hubBase = getKnowledgeHubBasePath({
    landing: isLandingKnowledgeHubPath(location.pathname),
  })
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  useEffect(() => {
    setIsCollapsed(defaultCollapsed)
    onCollapseChange?.(defaultCollapsed)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when item or defaultCollapsed changes
  }, [defaultCollapsed, item?.id])

  const handleToggle = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    if (onCollapseChange) {
      onCollapseChange(newState)
    }
  }

  return (
    <Card
      className={cn(
        "flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--sds-radius-sm)] border",
        isCollapsed && "w-auto max-w-12"
      )}
      style={{ borderColor: "var(--sds-border-default)", backgroundColor: "var(--sds-bg-default)" }}
    >
      {isCollapsed ? (
        <div className="flex justify-center p-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className={toggleButtonClassName}
            aria-label="Expand metadata"
          >
            <ChevronRight className="h-4 w-4" style={{ color: "var(--sds-icon-brand)" }} />
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
          <div
            className="mb-4 flex shrink-0 items-center justify-between border-b pb-4"
            style={{ borderColor: "var(--sds-border-default)" }}
          >
            <h2
              className="flex items-center gap-2 text-lg font-semibold"
              style={{ color: "var(--sds-text-default)" }}
            >
              <Files className="h-5 w-5" style={{ color: "var(--sds-icon-brand)" }} /> Details
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className={toggleButtonClassName}
              aria-label="Collapse metadata"
            >
              <ChevronLeft className="h-4 w-4" style={{ color: "var(--sds-icon-brand)" }} />
            </Button>
          </div>

          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto pr-1">
            <div className="min-w-0">
              <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                Name
              </label>
              <p className={valueClassName} style={{ color: "var(--sds-text-default)" }}>
                {item.name || "—"}
              </p>
            </div>

            <div className="min-w-0">
              <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                Type
              </label>
              <p className={valueClassName} style={{ color: "var(--sds-text-default)" }}>
                {item.type}
              </p>
            </div>

            <div className="min-w-0">
              <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                Owner (Vertical/Division/Dept.)
              </label>
              <p className={valueClassName} style={{ color: "var(--sds-text-default)" }}>
                {item.owner || "N/A"}
              </p>
            </div>

            <div className="min-w-0">
              <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                Legislation
              </label>
              <p className={valueClassName} style={{ color: "var(--sds-text-default)" }}>
                {item.legislation || "N/A"}
              </p>
            </div>

            <div className="min-w-0">
              <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                Rule/Notification etc.
              </label>
              <p className={valueClassName} style={{ color: "var(--sds-text-default)" }}>
                {item.subLegislation || "N/A"}
              </p>
            </div>

            <div className="min-w-0">
              <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                Description
              </label>
              <p
                className={cn(valueClassName, "leading-relaxed")}
                style={{ color: "var(--sds-text-default)" }}
                dangerouslySetInnerHTML={{
                  __html: markdownToDisplayHtml(item.description) || "No description available.",
                }}
              />
            </div>

            <div className="min-w-0">
              <label className={cn(labelClassName, "mb-2")} style={{ color: "var(--sds-text-default)" }}>
                Linked Items
              </label>
              <div className="grid grid-cols-1 gap-2">
                {item.linkedItems && item.linkedItems.length > 0 ? (
                  item.linkedItems.map((linkedItem) => {
                    const encodedType = encodeURIComponent(linkedItem.routeType || linkedItem.type)
                    const currentItemPath = `${hubBase}/${encodeURIComponent(item.routeType || item.type)}/${item.id}`
                    return (
                      <Link
                        key={linkedItem.id}
                        to={`${hubBase}/${encodedType}/${linkedItem.id}`}
                        state={{
                          breadcrumbTrail: [
                            ...breadcrumbTrail,
                            { label: item.name, path: currentItemPath },
                          ],
                          returnToHubPath: location.state?.returnToHubPath,
                        }}
                        className="block min-w-0 rounded-md border p-3 transition-colors hover:opacity-90"
                        style={{ borderColor: "var(--sds-border-default)" }}
                      >
                        <h4
                          className={cn(valueClassName, "mb-1 font-medium")}
                          style={{ color: "var(--sds-text-default)" }}
                        >
                          {linkedItem.heading}
                        </h4>
                        <p className="text-xs" style={{ color: "var(--sds-text-tertiary)" }}>
                          {linkedItem.type}
                        </p>
                      </Link>
                    )
                  })
                ) : (
                  <p className={valueClassName} style={{ color: "var(--sds-text-tertiary)" }}>
                    No linked items
                  </p>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                Version
              </label>
              <p className={cn(valueClassName, "mb-3")} style={{ color: "var(--sds-text-default)" }}>
                {item.version}
              </p>

              <div className="space-y-4">
                <div className="min-w-0">
                  <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                    Uploaded by
                  </label>
                  <p className={valueClassName} style={{ color: "var(--sds-text-default)" }}>
                    {item.uploadedBy || "N/A"}
                  </p>
                </div>
                <div className="min-w-0">
                  <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                    Uploaded on
                  </label>
                  <p className={valueClassName} style={{ color: "var(--sds-text-default)" }}>
                    {item.uploadedOn || "N/A"}
                  </p>
                </div>
                <div className="min-w-0">
                  <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                    Download Allowed
                  </label>
                  <p className={valueClassName} style={{ color: "var(--sds-text-default)" }}>
                    {item.downloadAllowed ? "Yes" : "No"}
                  </p>
                </div>
                <div className="min-w-0">
                  <label className={labelClassName} style={{ color: "var(--sds-text-default)" }}>
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags && item.tags.length > 0 ? (
                      item.tags.map((tag, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            navigate(`${hubBase}?search=${encodeURIComponent(tag)}`)
                          }}
                          className="rounded px-2 py-0.5 text-xs font-medium transition-colors hover:bg-blue-100 hover:text-blue-700"
                          style={{
                            backgroundColor: "var(--sds-accent-violet-bg)",
                            color: "var(--sds-accent-violet)",
                          }}
                        >
                          {tag}
                        </button>
                      ))
                    ) : (
                      <p className={valueClassName} style={{ color: "var(--sds-text-default)" }}>
                        No tags
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
