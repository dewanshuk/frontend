import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { FilterSection, TYPE_OPTIONS } from "@/components/knowledgeHub/FilterSection"
import { KnowledgeCard } from "@/components/knowledgeHub/KnowledgeCard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileText, FileType, Scale, Video, FileImage, BellRing } from "lucide-react"
import { getHub } from "@/api/hubApi"
import LandingSectionPanel from "@/components/landing/LandingSectionPanel"
import { landingShellInnerClassName } from "@/components/landing/landingTheme"
import {
  getKnowledgeHubBasePath,
  isLandingKnowledgeHubPath,
} from "@/lib/appNavigation"

const TYPE_ICONS = {
  Policies: FileText,
  "Guidance Notes": FileType,
  "Law & Regulation": Scale,
  "Training Resources": Video,
  "Early Warnings": BellRing,
  Flyers: FileImage,
}

// Color scheme for category tabs - sophisticated subtle gradients
const TYPE_COLORS = {
  Policies: { gradient: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)", activeBg: "#2563eb", bg: "#dbeafe", border: "#93c5fd", icon: "#2563eb", iconBg: "rgba(37, 99, 235, 0.15)" },
  "Guidance Notes": { gradient: "linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)", activeBg: "#059669", bg: "#d1fae5", border: "#6ee7b7", icon: "#059669", iconBg: "rgba(5, 150, 105, 0.15)" },
  "Law & Regulation": { gradient: "linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%)", activeBg: "#db2777", bg: "#fce7f3", border: "#f9a8d4", icon: "#db2777", iconBg: "rgba(219, 39, 119, 0.15)" },
  "Training Resources": { gradient: "linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%)", activeBg: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd", icon: "#7c3aed", iconBg: "rgba(124, 58, 237, 0.15)" },
  "Early Warnings": { gradient: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)", activeBg: "#d97706", bg: "#fef3c7", border: "#fcd34d", icon: "#d97706", iconBg: "rgba(217, 119, 6, 0.15)" },
  Flyers: { gradient: "linear-gradient(135deg, #e0e7ff 0%, #eef2ff 100%)", activeBg: "#4f46e5", bg: "#e0e7ff", border: "#a5b4fc", icon: "#4f46e5", iconBg: "rgba(79, 70, 229, 0.15)" },
}

const LAW_REGULATION_ICON_SRC = "/assets/icons/lw-icon.svg"
const NEW_COUNT_BADGE_BG = "#0B3D91"

function LawRegulationIcon({ className }) {
  return (
    <span
      role="img"
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${LAW_REGULATION_ICON_SRC})`,
        maskImage: `url(${LAW_REGULATION_ICON_SRC})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  )
}

const DETAILED_ITEMS_PER_SECTION = 6
const HUB_PAGE_SIZE = 10
const SKELETON_SECTION_TYPES = TYPE_OPTIONS.slice(0, 3)

function KnowledgeHubSkeleton({ variant = "sections" }) {
  if (variant === "more") {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 pt-2"
        aria-hidden
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[52px] animate-pulse rounded-[var(--sds-radius-sm)] border border-[var(--sds-border-default)] bg-[var(--sds-bg-subtle)]"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading knowledge hub…</span>
      {SKELETON_SECTION_TYPES.map((type) => {
        const isFlyerSection = type === "Flyers"
        return (
          <section key={type} aria-hidden>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-[var(--sds-bg-subtle)]" />
                <div className="h-5 w-36 max-w-[40vw] animate-pulse rounded bg-[var(--sds-bg-subtle)]" />
                <div className="h-5 w-14 shrink-0 animate-pulse rounded-full bg-[var(--sds-bg-subtle)]" />
              </div>
              <div className="h-5 w-24 shrink-0 animate-pulse rounded bg-[var(--sds-bg-subtle)]" />
            </div>
            <div
              className={cn(
                "grid gap-4 sm:gap-5",
                isFlyerSection
                  ? "grid-cols-2 sm:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              )}
            >
              {Array.from({ length: isFlyerSection ? 3 : 6 }).map((_, i) =>
                isFlyerSection ? (
                  <div
                    key={i}
                    className="overflow-hidden rounded-[var(--sds-radius-md)] border border-[var(--sds-border-default)] bg-[var(--sds-bg-default)]"
                  >
                    <div className="aspect-[4/3] animate-pulse bg-[var(--sds-bg-subtle)]" />
                    <div className="flex items-center justify-between gap-2 p-4">
                      <div className="h-4 flex-1 animate-pulse rounded bg-[var(--sds-bg-subtle)]" />
                      <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-[var(--sds-bg-subtle)]" />
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="flex h-[52px] items-center justify-between gap-4 rounded-[var(--sds-radius-sm)] border border-[var(--sds-border-default)] bg-[var(--sds-bg-default)] px-4"
                  >
                    <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-[var(--sds-bg-subtle)]" />
                    <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-[var(--sds-bg-subtle)]" />
                  </div>
                )
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** Fallback UI label → API `document_type` when category payload omits it. */
const UI_TO_API_DOCUMENT_TYPE = {
  Policies: "Policy",
  "Guidance Notes": "Guidance Notes",
  "Law & Regulation": "Law & Regulation",
  "Training Resources": "Training Resources",
  "Early Warnings": "Early Warnings",
  Flyers: "Flyers",
}

const applicabilityLabelToApi = (label) => {
  if (!label) return undefined
  if (label === "All MSIL") return "ALL"
  if (label === "My Vertical") return "EMPLOYEE"
  if (label === "My Work Area") return "DIVISION"
  return undefined
}

const sameStringArray = (a = [], b = []) =>
  a.length === b.length && a.every((value, index) => value === b[index])

const filtersAreEqual = (prev, next) =>
  prev.search === next.search &&
  prev.applicability === next.applicability &&
  sameStringArray(prev.organizations, next.organizations) &&
  sameStringArray(prev.types, next.types) &&
  Boolean(prev.searchTypesAll) === Boolean(next.searchTypesAll)

const resolveApiDocumentType = (uiType, apiType) => {
  const fromApi = String(apiType ?? "").trim()
  if (fromApi) return fromApi
  return UI_TO_API_DOCUMENT_TYPE[uiType] ?? uiType
}

const normalizeTypeFromApi = (rawType) => {
  const s = String(rawType ?? "").trim()
  if (!s) return undefined

  const lower = s.toLowerCase()
  const compact = lower.replace(/[_\s-]+/g, "")

  if (
    compact === "ews" ||
    compact.includes("earlywarning") ||
    lower.includes("early warning") ||
    lower.split(/[\s/_-]+/).includes("ews")
  ) {
    return "Early Warnings"
  }
  if (lower.includes("flyer") || compact.includes("flyer")) return "Flyers"
  if (lower.includes("training") || compact.includes("training")) return "Training Resources"
  if (lower.includes("guidance") || compact.includes("guidance")) return "Guidance Notes"
  if (
    lower.includes("regulation") ||
    lower.includes("law") ||
    compact.includes("lawandregulation") ||
    compact.includes("lawsandregulation")
  ) {
    return "Law & Regulation"
  }
  if (lower.includes("policy") || compact.includes("policy")) return "Policies"

  // Fall back to the raw value; local filtering expects the same labels as TYPE_OPTIONS.
  return s
}

const parseHubCount = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
}

const resolveItemIsNew = (item) =>
  Boolean(
    item?.isNew ??
      item?.is_new ??
      item?.is_new_item ??
      item?.isNewItem ??
      item?.newly_added ??
      item?.newlyAdded,
  )

const buildHubPath = ({
  search = "",
  applicability = "All MSIL",
  selectedTypes = [],
  hubBase = "/knowledgeHub",
} = {}) => {
  const params = new URLSearchParams()
  if (search?.trim()) {
    params.set("search", search.trim())
  }
  if (applicability && applicability !== "All MSIL") {
    params.set("applicability", applicability)
  }
  if (selectedTypes.length === 1) {
    params.set("type", selectedTypes[0])
  } else if (selectedTypes.length > 0 && selectedTypes.length !== TYPE_OPTIONS.length) {
    params.set("types", selectedTypes.join(","))
  }
  const query = params.toString()
  return query ? `${hubBase}?${query}` : hubBase
}

const hubSearchParamsMatch = (currentSearch, nextSearch) => {
  const current = new URLSearchParams(currentSearch)
  const next = new URLSearchParams(nextSearch)
  // Ignore legacy `view` query so old ?view=detailed links still resolve cleanly.
  current.delete("view")
  next.delete("view")
  if (current.toString() === next.toString()) return true
  for (const [key, value] of next.entries()) {
    if (current.get(key) !== value) return false
  }
  for (const [key] of current.entries()) {
    if (!next.has(key)) return false
  }
  return true
}

export default function KnowledgeHub({ variant = "default" }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isLanding = variant === "landing" || isLandingKnowledgeHubPath(location.pathname)
  const hubBase = getKnowledgeHubBasePath({ landing: isLanding })
  // Start with all categories so tabs do not flash from empty → full on mount.
  const [selectedTypes, setSelectedTypes] = useState(() => [...TYPE_OPTIONS])
  const [filters, setFilters] = useState({
    search: "",
    organizations: [],
    types: [...TYPE_OPTIONS],
    searchTypesAll: true,
    applicability: "All MSIL",
  })
  const [hubItems, setHubItems] = useState([])
  const [newCountByType, setNewCountByType] = useState({})
  /** Per-category pagination: total, api document_type, current page, hasMore */
  const [typeMeta, setTypeMeta] = useState({})
  const [hubLoading, setHubLoading] = useState(true)
  const [hubFetched, setHubFetched] = useState(false)
  const [hubError, setHubError] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const skipUrlSyncRef = useRef(false)
  const loadMoreSentinelRef = useRef(null)
  const loadingMoreRef = useRef(false)
  const typeMetaRef = useRef(typeMeta)
  const hubItemsRef = useRef(hubItems)
  const filtersRef = useRef(filters)
  const hubFetchedRef = useRef(false)
  /** Only keys that actually hit the hub API (stable values — avoid filter-object identity churn). */
  const hubSearchQuery = filters.search?.trim() || ""
  const hubApplicability = filters.applicability || "All MSIL"
  const hubDocTypes = useMemo(() => {
    if (filters.searchTypesAll) return undefined
    const types = Array.isArray(filters.types) ? filters.types : []
    if (types.length === 0) return undefined
    const coversAll =
      types.length === TYPE_OPTIONS.length &&
      TYPE_OPTIONS.every((type) => types.includes(type))
    if (coversAll) return undefined
    return types.map((type) => UI_TO_API_DOCUMENT_TYPE[type] ?? type)
  }, [filters.types, filters.searchTypesAll])
  const hubDocTypesKey = useMemo(
    () => (hubDocTypes?.length ? [...hubDocTypes].sort().join("|") : "all"),
    [hubDocTypes],
  )
  /** Skeleton while hub data is loading (initial + filter refetches). */
  const showHubSkeleton = hubLoading

  useEffect(() => {
    typeMetaRef.current = typeMeta
  }, [typeMeta])

  useEffect(() => {
    hubItemsRef.current = hubItems
  }, [hubItems])

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    hubFetchedRef.current = hubFetched
  }, [hubFetched])

  useEffect(() => {
    skipUrlSyncRef.current = true
    const params = new URLSearchParams(location.search)
    const typeParam = params.get("type")
    const typesParam = params.get("types")
    const searchParam = params.get("search")
    const applicabilityParam = params.get("applicability")

    let nextSelectedTypes = [...TYPE_OPTIONS]
    if (typesParam) {
      const requestedTypes = Array.from(
        new Set(
          typesParam
            .split(",")
            .map((part) => part.trim())
            .flatMap((part) => {
              if (!part) return []
              if (/^all$/i.test(part)) return TYPE_OPTIONS
              const normalizedType = normalizeTypeFromApi(decodeURIComponent(part))
              return TYPE_OPTIONS.includes(normalizedType) ? [normalizedType] : []
            })
        )
      )

      nextSelectedTypes =
        requestedTypes.length > 0 ? requestedTypes : [...TYPE_OPTIONS]
    } else if (typeParam) {
      const decodedType = decodeURIComponent(typeParam)
      const normalizedType = normalizeTypeFromApi(decodedType)
      nextSelectedTypes = TYPE_OPTIONS.includes(normalizedType)
        ? [normalizedType]
        : [...TYPE_OPTIONS]
    }

    setSelectedTypes((prev) =>
      sameStringArray(prev, nextSelectedTypes) ? prev : nextSelectedTypes
    )

    setFilters((prev) => {
      const nextSearch = searchParam || ""
      const nextApplicability = applicabilityParam || "All MSIL"
      if (prev.search === nextSearch && prev.applicability === nextApplicability) {
        return prev
      }
      return {
        ...prev,
        search: nextSearch,
        applicability: nextApplicability,
      }
    })
  }, [location.search])

  useEffect(() => {
    // One-shot skip after URL → state so we don't immediately bounce navigate.
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false
      return
    }

    const nextPath = buildHubPath({
      search: filters.search,
      applicability: filters.applicability,
      selectedTypes,
      hubBase,
    })
    const nextSearch = nextPath.includes("?") ? nextPath.split("?")[1] : ""
    const currentSearch = location.search.replace(/^\?/, "")

    if (!hubSearchParamsMatch(currentSearch, nextSearch)) {
      navigate(nextPath, { replace: true })
    }
  }, [filters, selectedTypes, navigate, location.search, hubBase])

  const baseItems = useMemo(() => (hubFetched ? hubItems : []), [hubFetched, hubItems])

  const filteredItems = useMemo(() => {
    return baseItems.filter((item) => {
      // Search is already applied by API, so don't filter here
      if (filters.organizations.length > 0 && !filters.organizations.includes(item.organization)) return false
      // Dropdown types only constrain results while a search is active.
      const isSearching = Boolean(filters.search?.trim())
      if (
        isSearching &&
        Array.isArray(filters.types) &&
        filters.types.length > 0 &&
        filters.types.length !== TYPE_OPTIONS.length &&
        !filters.types.includes(item.type)
      ) {
        return false
      }
      if (filters.applicability && item.applicability !== filters.applicability) return false
      return true
    })
  }, [filters, baseItems])

  const mapHubCategories = useCallback((categories, applicability) => {
    const nextNewCountByType = {}
    const nextTypeMeta = {}
    const docs = []

    ;(Array.isArray(categories) ? categories : []).forEach((cat) => {
      const uiType = normalizeTypeFromApi(cat?.document_type) ?? "Policies"
      const catTotal = parseHubCount(cat?.total ?? cat?.count)
      const reportedNewCount = parseHubCount(
        cat?.new_count ?? cat?.newCount ?? cat?.newly_added_count,
      )
      const items = Array.isArray(cat?.items) ? cat.items : []
      const apiDocumentType = resolveApiDocumentType(uiType, cat?.document_type)

      const mappedItems = items.map((it) => ({
        id: it?.id ?? `${uiType}-${String(it?.name ?? "")}`.trim(),
        heading: String(it?.name ?? it?.title ?? ""),
        type: uiType,
        organization: "Organization",
        applicability,
        addedDate: null,
        documentCount: catTotal,
        imageUrl: it?.file_url || it?.fileUrl || null,
        images: undefined,
        isNew: resolveItemIsNew(it),
      }))

      const derivedNewCount = mappedItems.filter((item) => item.isNew).length
      nextNewCountByType[uiType] = Math.max(
        reportedNewCount,
        derivedNewCount,
        parseHubCount(nextNewCountByType[uiType]),
      )

      const existingMeta = nextTypeMeta[uiType]
      const mergedItemCount =
        (existingMeta?.loadedCount ?? 0) + mappedItems.length
      const total = Math.max(
        catTotal,
        existingMeta?.total ?? 0,
        mergedItemCount,
      )
      // If the API omits total, treat a full page as a signal that more may exist.
      const hasMore =
        catTotal > 0
          ? mergedItemCount < catTotal
          : mappedItems.length >= HUB_PAGE_SIZE

      nextTypeMeta[uiType] = {
        total,
        apiDocumentType,
        page: 1,
        loadedCount: mergedItemCount,
        hasMore,
      }

      docs.push(...mappedItems)
    })

    return { docs, nextNewCountByType, nextTypeMeta }
  }, [])

  // Fetch hub when API-relevant filters change (search, applicability, type multiselect).
  // Category tabs stay client-side and must not re-hit the API (that caused flicker).
  useEffect(() => {
    const controller = new AbortController()
    // Show skeleton as soon as a refetch is scheduled (not only after debounce).
    setHubLoading(true)
    setHubError(null)
    setLoadingMore(false)
    loadingMoreRef.current = false

    // First paint: no debounce. Filter changes: short debounce so typing doesn't thrash.
    const delayMs = hubFetchedRef.current ? 250 : 0
    const timeoutId = setTimeout(async () => {
      try {
        const apiData = await getHub({
          page: 1,
          page_size: HUB_PAGE_SIZE,
          applicability: applicabilityLabelToApi(hubApplicability),
          search: hubSearchQuery || undefined,
          doc_types: hubDocTypes,
        })

        if (controller.signal.aborted) return

        const categories = Array.isArray(apiData?.data?.categories)
          ? apiData.data.categories
          : []
        const { docs, nextNewCountByType, nextTypeMeta } = mapHubCategories(
          categories,
          hubApplicability,
        )

        setNewCountByType(nextNewCountByType)
        setTypeMeta(nextTypeMeta)
        setHubItems(docs)
        hubFetchedRef.current = true
        setHubFetched(true)
        setHubError(null)
      } catch (err) {
        if (controller.signal.aborted) return
        console.error("Failed to load hub documents:", err)
        setHubError("Unable to apply filters")
      } finally {
        if (!controller.signal.aborted) setHubLoading(false)
      }
    }, delayMs)

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [hubSearchQuery, hubApplicability, hubDocTypesKey, hubDocTypes, mapHubCategories])

  const loadMoreForType = useCallback(async (uiType) => {
    if (!uiType || loadingMoreRef.current) return

    const meta = typeMetaRef.current[uiType]
    if (!meta?.hasMore) return

    const currentFilters = filtersRef.current
    const nextPage = (meta.page ?? 1) + 1
    const apiDocumentType = resolveApiDocumentType(uiType, meta.apiDocumentType)

    loadingMoreRef.current = true
    setLoadingMore(true)

    try {
      const apiData = await getHub({
        page: nextPage,
        page_size: HUB_PAGE_SIZE,
        document_type: apiDocumentType,
        applicability: applicabilityLabelToApi(currentFilters.applicability),
        search: currentFilters.search?.trim()
          ? currentFilters.search.trim()
          : undefined,
      })

      // Drop stale pages if filters changed mid-flight.
      if (filtersRef.current !== currentFilters) return

      const categories = Array.isArray(apiData?.data?.categories)
        ? apiData.data.categories
        : []

      // Prefer the matching category; if the API returns a flat list for a typed query, use first.
      const matchedCategory =
        categories.find(
          (cat) => normalizeTypeFromApi(cat?.document_type) === uiType,
        ) ?? categories[0]

      const rawItems = Array.isArray(matchedCategory?.items)
        ? matchedCategory.items
        : []
      const catTotal = parseHubCount(
        matchedCategory?.total ?? matchedCategory?.count ?? meta.total,
      )

      const mappedItems = rawItems.map((it) => ({
        id: it?.id ?? `${uiType}-${String(it?.name ?? "")}`.trim(),
        heading: String(it?.name ?? it?.title ?? ""),
        type: uiType,
        organization: "Organization",
        applicability: currentFilters.applicability,
        addedDate: null,
        documentCount: catTotal,
        imageUrl: it?.file_url || it?.fileUrl || null,
        images: undefined,
        isNew: resolveItemIsNew(it),
      }))

      if (mappedItems.length === 0) {
        setTypeMeta((prev) => ({
          ...prev,
          [uiType]: {
            ...prev[uiType],
            apiDocumentType,
            page: nextPage,
            hasMore: false,
            total: Math.max(prev[uiType]?.total ?? 0, catTotal),
          },
        }))
        return
      }

      setHubItems((prev) => {
        const existingIds = new Set(
          prev.filter((item) => item.type === uiType).map((item) => item.id),
        )
        const uniqueNew = mappedItems.filter((item) => !existingIds.has(item.id))
        if (uniqueNew.length === 0) return prev
        return [...prev, ...uniqueNew]
      })

      setTypeMeta((prev) => {
        const previous = prev[uiType] ?? meta
        const previousLoaded =
          previous.loadedCount ??
          hubItemsRef.current.filter((item) => item.type === uiType).length
        const existingIds = new Set(
          hubItemsRef.current
            .filter((item) => item.type === uiType)
            .map((item) => item.id),
        )
        const addedCount = mappedItems.filter(
          (item) => !existingIds.has(item.id),
        ).length
        const loadedCount = previousLoaded + addedCount
        const total = Math.max(previous.total ?? 0, catTotal, loadedCount)
        const hasMore =
          catTotal > 0
            ? loadedCount < catTotal
            : addedCount > 0 && mappedItems.length >= HUB_PAGE_SIZE

        return {
          ...prev,
          [uiType]: {
            ...previous,
            apiDocumentType,
            page: nextPage,
            loadedCount,
            total,
            hasMore,
          },
        }
      })

      setNewCountByType((prev) => {
        const pageNew = mappedItems.filter((item) => item.isNew).length
        if (pageNew <= 0) return prev
        return {
          ...prev,
          [uiType]: Math.max(parseHubCount(prev[uiType]), pageNew),
        }
      })
    } catch (err) {
      console.error("Failed to load more hub documents:", err)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [])

  const itemsByType = useMemo(() => {
    const map = {}
    TYPE_OPTIONS.forEach((t) => {
      map[t] = filteredItems.filter((item) => item.type === t)
    })
    return map
  }, [filteredItems])

  const activeTypes = selectedTypes
  const focusedType = activeTypes.length === 1 ? activeTypes[0] : null
  const visibleItemCount = activeTypes.reduce(
    (count, type) => count + (itemsByType[type]?.length ?? 0),
    0
  )

  // Infinite scroll when a single category is focused (View All / one tab).
  useEffect(() => {
    if (!focusedType || hubLoading) return undefined

    const meta = typeMeta[focusedType]
    if (!meta?.hasMore) return undefined

    const sentinel = loadMoreSentinelRef.current
    if (!sentinel) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreForType(focusedType)
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [focusedType, typeMeta, hubLoading, loadingMore, loadMoreForType, visibleItemCount])

  const handleApplyFilters = useCallback((newFilters) => {
    setFilters((prev) => {
      const next = {
        search: newFilters?.search ?? "",
        organizations: Array.isArray(newFilters?.organizations)
          ? newFilters.organizations
          : [],
        types: Array.isArray(newFilters?.types) ? newFilters.types : [],
        searchTypesAll: Boolean(newFilters?.searchTypesAll),
        applicability: newFilters?.applicability || "All MSIL",
      }
      if (filtersAreEqual(prev, next)) return prev
      return next
    })

    // Dropdown ↔ tabs link only when a search is performed.
    const search = newFilters?.search?.trim()
    if (!search) return

    if (newFilters.searchTypesAll || !Array.isArray(newFilters.types) || newFilters.types.length === 0) {
      setSelectedTypes([...TYPE_OPTIONS])
      return
    }

    const nextTabTypes = newFilters.types.filter((type) => TYPE_OPTIONS.includes(type))
    setSelectedTypes(nextTabTypes.length > 0 ? nextTabTypes : [...TYPE_OPTIONS])
  }, [])

  const handleTabToggle = useCallback((type) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((item) => item !== type)
      }
      return [...prev, type]
    })
  }, [])

  const handleViewAll = useCallback((type) => {
    setSelectedTypes([type])
  }, [])

  const handleCardClick = (item) => {
    const encodedType = encodeURIComponent(item.type)

    navigate(`${hubBase}/${encodedType}/${item.id}`, {
      state: {
        returnToHubPath: buildHubPath({
          search: filters.search,
          applicability: filters.applicability,
          selectedTypes,
          hubBase,
        }),
      },
    })
  }

  const searchPlaceholder = "Search Knowledge Hub..."
  const noResultsMessage = filters.search?.trim()
    ? "No document match your search"
    : filters.applicability && filters.applicability !== "All MSIL"
    ? "No item match your filter"
    : selectedTypes.length > 0 && selectedTypes.length !== TYPE_OPTIONS.length
    ? "No item match your filter"
    : selectedTypes.length === 0
    ? "Select a category tab to view documents"
    : "No documents found"

  const hubContent = (
    <div className="w-full space-y-6">
        {!isLanding && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1
            className="text-2xl font-semibold tracking-[-0.48px]"
            style={{ color: "var(--sds-text-default)" }}
          >
            Knowledge Hub
          </h1>
        </div>
        )}

        <FilterSection
          onApplyFilters={handleApplyFilters}
          searchPlaceholder={searchPlaceholder}
          initialSearch={filters.search}
          initialApplicability={filters.applicability}
          variant={isLanding ? "landing" : "default"}
        />

        <div
          className="flex rounded-2xl p-2 justify-between items-stretch gap-3"
          style={{ backgroundColor: "#f8fafc" }}
        >
          {TYPE_OPTIONS.map((type) => {
            const Icon = TYPE_ICONS[type]
            const isActive = activeTypes.includes(type)
            const colors = TYPE_COLORS[type] || TYPE_COLORS.Policies
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                type="button"
                className={cn(
                  "group flex h-full min-h-[52px] flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-left font-medium cursor-pointer transition-all duration-200 border-0",
                  isActive ? "shadow-md" : "shadow-sm hover:shadow-md"
                )}
                style={{
                  backgroundColor: isActive ? colors.bg : "white",
                  border: isActive ? `1.5px solid ${colors.border}` : "1.5px solid #e5e7eb",
                  color: isActive ? colors.icon : "#6b7280",
                }}
                onClick={() => handleTabToggle(type)}
              >
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all"
                  style={{ backgroundColor: isActive ? colors.iconBg : "#f3f4f6" }}
                >
                  {type === "Law & Regulation" ? (
                    <LawRegulationIcon
                      className="h-5 w-5"
                      style={{ backgroundColor: isActive ? colors.icon : "#9ca3af" }}
                    />
                  ) : (
                    Icon && <Icon className="h-5 w-5" style={{ color: isActive ? colors.icon : "#9ca3af" }} />
                  )}
                </span>
                <span className="min-w-0 flex-1 break-words text-wrap text-[15px] font-semibold">
                  {type}
                </span>
              </Button>
            )
          })}
        </div>

        {hubError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {hubError}
          </div>
        ) : null}

        {showHubSkeleton ? (
          <KnowledgeHubSkeleton />
        ) : (
          <div className="space-y-8 pb-8" aria-busy={false}>
            {activeTypes.map((type) => {
              const items = itemsByType[type] ?? []
              if (items.length === 0) return null
              const isFocused = focusedType === type
              const displayItems = isFocused
                ? items
                : items.slice(0, DETAILED_ITEMS_PER_SECTION)
              const isFlyerSection = type === "Flyers"
              const Icon = TYPE_ICONS[type]
              const newCount = newCountByType[type] ?? 0
              const sectionTotal = Math.max(
                typeMeta[type]?.total ?? 0,
                items.length,
              )
              const showViewAll =
                !isFocused && sectionTotal > DETAILED_ITEMS_PER_SECTION
              return (
                <section key={type}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {type === "Law & Regulation" ? (
                        <LawRegulationIcon className="h-5 w-5" style={{ backgroundColor: TYPE_COLORS[type]?.icon || "#ef4444" }} />
                      ) : (
                        Icon && <Icon className="h-5 w-5 shrink-0" style={{ color: TYPE_COLORS[type]?.icon || "var(--sds-text-default)" }} />
                      )}
                      <h2 className="text-[19px] font-semibold" style={{ color: "var(--sds-text-default)" }}>
                        {type}
                      </h2>
                      {newCount > 0 && (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white shrink-0"
                          style={{ backgroundColor: NEW_COUNT_BADGE_BG }}
                        >
                          {newCount} New
                        </span>
                      )}
                    </div>
                    {showViewAll && (
                      <Button
                        variant="link"
                        className="text-sm font-medium no-underline hover:no-underline rounded-md px-3 py-1.5 hover:bg-blue-500/10 focus-visible:bg-blue-500/10 focus-visible:outline-none transition-colors"
                        style={{ color: TYPE_COLORS[type]?.icon || "#2563eb" }}
                        onClick={() => handleViewAll(type)}
                      >
                        View All ({sectionTotal})
                      </Button>
                    )}
                  </div>
                  <div
                    className={cn(
                      "grid gap-4 sm:gap-5",
                      isFlyerSection
                        ? "grid-cols-2 sm:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    )}
                  >
                    {displayItems.map((item) => (
                      <KnowledgeCard
                        key={item.id}
                        heading={item.heading}
                        type={item.type}
                        imageUrl={item.imageUrl}
                        images={item.images}
                        variant={isFlyerSection ? "flyer" : "detailed"}
                        appearance={isLanding ? "landing" : "default"}
                        isNew={item.isNew}
                        onClick={() => handleCardClick(item)}
                      />
                    ))}
                  </div>
                  {isFocused && typeMeta[type]?.hasMore ? (
                    <div
                      ref={loadMoreSentinelRef}
                      className="flex h-12 items-center justify-center pt-4"
                      aria-hidden={!loadingMore}
                    >
                      {loadingMore ? <KnowledgeHubSkeleton variant="more" /> : null}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}

        {!showHubSkeleton && !hubError && visibleItemCount === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{noResultsMessage}</p>
          </div>
        )}
    </div>
  )

  if (isLanding) {
    return (
      <div
        className="min-h-full w-full"
        style={{ background: "linear-gradient(100deg, #f3f7ff 0%, #e8f6fc 45%, #e9faf8 100%)" }}
      >
        <div className={landingShellInnerClassName("pb-16 pt-8")}>
          <LandingSectionPanel className="p-6 md:p-8 lg:p-10">
            {hubContent}
          </LandingSectionPanel>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full w-full max-w-full min-w-0 bg-gradient-to-r from-[#171c8f]/5 via-white to-[#2563eb]/5 py-6 pb-8">
      {hubContent}
    </div>
  )
}
