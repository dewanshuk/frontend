import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import MultiSelectDropdown from "../../atoms/multi-select-dropdown"
import LinkedItemMultiPicker from "../../atoms/linked-item-multi-picker"

const normalizeDocTypeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_/-]+/g, " ")
    .replace(/\s+/g, " ")

/** Expand a type string into comparable keys (singular/plural + common aliases). */
const expandDocTypeKeys = (value) => {
  const key = normalizeDocTypeKey(value)
  if (!key) return new Set()

  const keys = new Set([key])
  if (key.endsWith("s")) keys.add(key.slice(0, -1))
  else keys.add(`${key}s`)

  // Common label ↔ API enum aliases used in bulk download
  const aliases = {
    "guidance note": ["guidance notes"],
    "guidance notes": ["guidance note"],
    flyer: ["flyers"],
    flyers: ["flyer"],
    "law regulation": ["law and regulation", "laws and regulation"],
    "law and regulation": ["law regulation"],
    "training material": ["training materials", "training resources"],
    "training resources": ["training material", "training materials"],
    ews: ["early warning", "early warnings"],
    "early warnings": ["ews", "early warning"],
    "latest news and announcements": ["announcements", "latest news announcements"],
    announcements: ["latest news and announcements"],
    events: ["event"],
    event: ["events"],
  }

  for (const alias of aliases[key] || []) {
    keys.add(alias)
  }

  return keys
}

const typesOverlap = (a, b) => {
  const left = expandDocTypeKeys(a)
  if (left.size === 0) return false
  for (const key of expandDocTypeKeys(b)) {
    if (left.has(key)) return true
  }
  return false
}

const itemMatchesType = (item, type, typeOptions = []) => {
  if (!item || !type) return false
  if (item._docType != null && String(item._docType) === String(type)) return true

  const option = typeOptions.find((o) => String(o?.value) === String(type))
  const typeCandidates = [type, option?.value, option?.label].filter(Boolean)

  return [item._docType, item.document_type, item.type_label, item.type]
    .filter(Boolean)
    .some((candidate) =>
      typeCandidates.some((typeCandidate) => typesOverlap(candidate, typeCandidate)),
    )
}

/** Keep selected IDs that still belong to at least one remaining document type. */
const filterDocIdsForSelectedTypes = (
  selectedDocIds = [],
  selectedTypes = [],
  typeOptions = [],
) => {
  if (!Array.isArray(selectedTypes) || selectedTypes.length === 0) return []
  if (!Array.isArray(selectedDocIds) || selectedDocIds.length === 0) return []

  return selectedDocIds.filter((item) =>
    selectedTypes.some((type) => itemMatchesType(item, type, typeOptions)),
  )
}

/** Drop only IDs associated with the types that were just deselected. */
const removeDocIdsForTypes = (
  selectedDocIds = [],
  removedTypes = [],
  typeOptions = [],
) => {
  if (!Array.isArray(removedTypes) || removedTypes.length === 0) {
    return selectedDocIds
  }
  if (!Array.isArray(selectedDocIds) || selectedDocIds.length === 0) {
    return []
  }

  return selectedDocIds.filter(
    (item) => !removedTypes.some((type) => itemMatchesType(item, type, typeOptions)),
  )
}

export default function OrchestrationDocumentTypeModal({
  isOpen,
  onClose,
  onSubmit,
  docTypeOptions = [],
  selectedDocTypes = [],
  onDocTypesChange,
  selectedDocIds = [],
  onDocIdsChange,
}) {
  if (!isOpen) return null

  const handleDocTypesChange = (nextTypes = []) => {
    const next = Array.isArray(nextTypes) ? nextTypes : []
    const removedTypes = (selectedDocTypes || []).filter(
      (type) => !next.includes(type),
    )

    onDocTypesChange?.(next)

    if (next.length === 0) {
      onDocIdsChange?.([])
      return
    }

    // Prefer removing only deselected-type IDs; fall back to keep-matching-remaining
    // so unmatched metadata never wipes every selection.
    if (removedTypes.length > 0) {
      onDocIdsChange?.(
        removeDocIdsForTypes(selectedDocIds, removedTypes, docTypeOptions),
      )
    } else {
      onDocIdsChange?.(
        filterDocIdsForSelectedTypes(selectedDocIds, next, docTypeOptions),
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-[680px] rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Download Template</h2>
          <button
            type="button"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {/* Document Type — searchable multi-select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Document Type
            </label>
            <MultiSelectDropdown
              options={docTypeOptions}
              value={selectedDocTypes}
              onChange={handleDocTypesChange}
              placeholder="Select document type"
              emptyStateText="No options"
            />
          </div>

          {/* Document ID — multi-select filtered by all selected types */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Document ID
            </label>
            <LinkedItemMultiPicker
              isBulkUpdate
              documentTypes={selectedDocTypes}
              values={selectedDocIds}
              onChange={onDocIdsChange}
              disabled={selectedDocTypes.length === 0}
              placeholder="Select document id"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            className="rounded-lg bg-blue-600/10 px-3 py-1 text-lg text-[#2563eb] transition hover:bg-blue-600/15"
            disabled={selectedDocTypes.length === 0}
            onClick={onSubmit}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}
