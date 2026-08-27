const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

const isPercentCategory = (label) =>
  String(label || "").toLowerCase().includes("declaration");

const KPI_CATEGORY_CONFIG = [
  { sectionKey: "Declaration Summary", label: "Annual Declaration" },
  { sectionKey: "Audit Summary", label: "Audit" },
  { sectionKey: "Training Summary", label: "Trainings" },
];

/**
 * Map API head-summary sections into the KPI category shape used by KpiTeamChart.
 * Always exposes the three supported categories; empty API data yields empty series.
 */
export const buildKpiCategories = (kpiSections = {}, { trainingSubcategories = [] } = {}) => {
  return KPI_CATEGORY_CONFIG.map(({ sectionKey, label }) => {
    // Trainings get one subcategory per applicable training when the API has
    // them; bars are completion percentages loaded per training.
    if (label === "Trainings") {
      return {
        id: slugify(label),
        label,
        isPercent: true,
        subcategories: trainingSubcategories,
      };
    }

    const items = Array.isArray(kpiSections?.[sectionKey])
      ? kpiSections[sectionKey]
      : [];

    return {
      id: slugify(label),
      label,
      isPercent: isPercentCategory(sectionKey) || label === "Trainings",
      subcategories: [
        {
          id: `${slugify(label)}-all`,
          label: "All",
          series: items.map((item) => ({
            label: item?.label || "Unassigned",
            value: Number(item?.value) || 0,
          })),
        },
      ],
    };
  });
};

/** Resolve the active chart series with safe fallbacks. */
export const getKpiSeries = (categories = [], categoryId, subcategoryId) => {
  const category =
    categories.find((entry) => entry.id === categoryId) || categories[0] || null;
  if (!category) {
    return { category: null, subcategory: null, series: [], isPercent: false };
  }

  const subcategory =
    category.subcategories?.find((entry) => entry.id === subcategoryId) ||
    category.subcategories?.[0] ||
    null;

  return {
    category,
    subcategory,
    series: subcategory?.series || [],
    isPercent: Boolean(category.isPercent),
  };
};
