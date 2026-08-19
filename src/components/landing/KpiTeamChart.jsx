import { useEffect, useMemo, useRef, useState } from "react";
import "chart.js/auto";
import { Bar } from "react-chartjs-2";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MARUTI_BLUE } from "@/components/landing/landingTheme";
import {
  exportAuditHeadSummary,
  exportDeclarationHeadSummary,
  exportTrainingCompletionSummary,
  getTrainingCompletionSummary,
} from "@/api/homeApi";
import { mapTrainingCompletionSeries } from "@/api/homeApiUtils";
import { getKpiSeries } from "@/utils/headKpiUtils";
import { cn } from "@/lib/utils";

const CATEGORY_INLINE_LIMIT = 5;
const SUBCATEGORY_INLINE_LIMIT = 8;

const pillClass = (active) =>
  cn(
    "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
    active
      ? "border-[#2563eb] bg-[#2563eb] text-white"
      : "border-[#2563eb]/30 bg-white text-[#2563eb] hover:border-[#2563eb]/50",
  );

const createBarValueLabelsPlugin = (isPercent) => ({
  id: `barValueLabels-${isPercent ? "percent" : "count"}`,
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;

    meta.data.forEach((bar, index) => {
      const value = chart.data.datasets[0].data[index];
      if (value === null || value === undefined) return;

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const labelY = Math.min(bar.y + 18, bar.base - 10);
      ctx.fillText(isPercent ? `${value}%` : `${value}`, bar.x, labelY);
      ctx.restore();
    });
  },
});

const downloadBlobResponse = (response, fallbackFileName) => {
  const blob =
    response.data instanceof Blob ? response.data : new Blob([response.data]);
  const blobUrl = window.URL.createObjectURL(blob);
  const disposition = response.headers?.["content-disposition"] || "";
  const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/);
  const fileName = fileNameMatch?.[1]
    ? decodeURIComponent(fileNameMatch[1])
    : fallbackFileName;

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
};

const exportKpiSeries = ({ category, subcategory, series, isPercent }) => {
  const rows = series.map((item) => ({
    Category: category?.label || "",
    Subcategory: subcategory?.label || "",
    Department: item.label,
    [isPercent ? "% Completion" : "Value"]: item.value,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "KPI Data");

  const safeCategory = String(category?.label || "kpi").replace(/[^\w-]+/g, "_");
  const safeSubcategory = String(subcategory?.label || "all").replace(/[^\w-]+/g, "_");
  XLSX.writeFile(workbook, `kpi-${safeCategory}-${safeSubcategory}.xlsx`);
};

export default function KpiTeamChart({ categories = [] }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [subcategoryId, setSubcategoryId] = useState(
    categories[0]?.subcategories?.[0]?.id || "",
  );
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Completion bars per training id, loaded the first time a training is opened.
  const [trainingSeries, setTrainingSeries] = useState({});
  const [loadingTrainingId, setLoadingTrainingId] = useState("");
  const requestedTrainingIdsRef = useRef(new Set());
  const subcategoryScrollerRef = useRef(null);

  useEffect(() => {
    if (!categories.length) {
      setCategoryId("");
      setSubcategoryId("");
      return;
    }

    setCategoryId((prevCategoryId) => {
      const nextCategory =
        categories.find((entry) => entry.id === prevCategoryId) || categories[0];

      setSubcategoryId((prevSubcategoryId) => {
        const nextSubcategory =
          nextCategory.subcategories?.find((entry) => entry.id === prevSubcategoryId) ||
          nextCategory.subcategories?.[0];
        return nextSubcategory?.id || "";
      });
      setShowAllSubcategories(false);
      return nextCategory.id;
    });
  }, [categories]);

  const {
    category,
    subcategory,
    series: staticSeries,
    isPercent: staticIsPercent,
  } = useMemo(
    () => getKpiSeries(categories, categoryId, subcategoryId),
    [categories, categoryId, subcategoryId],
  );

  const trainingId = subcategory?.trainingId || "";

  useEffect(() => {
    if (!trainingId || requestedTrainingIdsRef.current.has(trainingId)) return;

    requestedTrainingIdsRef.current.add(trainingId);
    let cancelled = false;
    setLoadingTrainingId(trainingId);

    getTrainingCompletionSummary(trainingId)
      .then((payload) => {
        if (cancelled) return;
        setTrainingSeries((prev) => ({
          ...prev,
          [trainingId]: mapTrainingCompletionSeries(payload),
        }));
      })
      .catch(() => {
        // Allow a retry the next time this training is opened.
        requestedTrainingIdsRef.current.delete(trainingId);
        if (cancelled) return;
        setTrainingSeries((prev) => ({ ...prev, [trainingId]: [] }));
      })
      .finally(() => {
        if (!cancelled) setLoadingTrainingId("");
      });

    return () => {
      cancelled = true;
    };
  }, [trainingId]);

  // Trainings plot completion percentages fetched per training id.
  const series = trainingId ? trainingSeries[trainingId] || [] : staticSeries;
  const isPercent = trainingId ? true : staticIsPercent;
  const isLoadingSeries = Boolean(trainingId) && loadingTrainingId === trainingId;

  const inlineCategories = categories.slice(0, CATEGORY_INLINE_LIMIT);
  const overflowCategories = categories.slice(CATEGORY_INLINE_LIMIT);
  const subcategories = category?.subcategories || [];
  const isTrainingCategory = category?.id === "trainings";
  const isTrainingSubcategoryMissing =
    isTrainingCategory && subcategories.length === 0;
  // Trainings require a backend subcategory, even when only one is returned.
  // Annual Declaration and Audit keep their single implicit series hidden.
  const showSubcategoryRow =
    subcategories.length > 1 ||
    (isTrainingCategory && subcategories.length === 1);
  const visibleSubcategories = showAllSubcategories
    ? subcategories
    : subcategories.slice(0, SUBCATEGORY_INLINE_LIMIT);
  const hiddenSubcategoryCount = Math.max(
    0,
    subcategories.length - SUBCATEGORY_INLINE_LIMIT,
  );

  const chartData = useMemo(
    () => ({
      labels: series.map((item) => item.label),
      datasets: [
        {
          label: isPercent ? "% Completion" : "Value",
          data: series.map((item) => item.value),
          backgroundColor: "#2563eb",
          borderRadius: 8,
          barThickness: 34,
          categoryPercentage: 0.55,
        },
      ],
    }),
    [isPercent, series],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) =>
              isPercent
                ? `${context.parsed.y}% Completion`
                : `${context.parsed.y}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: isPercent ? 100 : undefined,
          title: {
            display: true,
            text: isPercent ? "% Completion" : "Count",
            color: "#6b7280",
            font: { size: 12, weight: "500" },
          },
          ticks: {
            stepSize: isPercent ? 25 : undefined,
            callback: (value) => (isPercent ? `${value}%` : value),
            color: "#6b7280",
          },
          grid: {
            color: "rgba(0,0,0,0.08)",
            borderDash: [4, 4],
            drawBorder: false,
          },
        },
        x: {
          ticks: { color: "#374151" },
          grid: { display: false },
        },
      },
    }),
    [isPercent],
  );

  const barValueLabelsPlugin = useMemo(
    () => createBarValueLabelsPlugin(isPercent),
    [isPercent],
  );

  const scrollSubcategories = (direction) => {
    subcategoryScrollerRef.current?.scrollBy({
      left: direction === "left" ? -180 : 180,
      behavior: "smooth",
    });
  };

  const handleDownload = async () => {
    if (isExporting || isTrainingSubcategoryMissing) return;

    if (category?.id === "audit") {
      setIsExporting(true);
      try {
        const response = await exportAuditHeadSummary();
        downloadBlobResponse(response, "audit_head_summary.xlsx");
      } catch (error) {
        console.error("Failed to export audit head summary", error);
      } finally {
        setIsExporting(false);
      }
      return;
    }

    if (category?.id === "annual-declaration") {
      setIsExporting(true);
      try {
        const response = await exportDeclarationHeadSummary();
        downloadBlobResponse(response, "annual_declaration_summary.xlsx");
      } catch (error) {
        console.error("Failed to export declaration head summary", error);
      } finally {
        setIsExporting(false);
      }
      return;
    }

    // Trainings have a server-side export keyed by training id.
    const trainingId = subcategory?.trainingId;
    if (trainingId) {
      setIsExporting(true);
      try {
        const response = await exportTrainingCompletionSummary(trainingId);
        downloadBlobResponse(response, `${trainingId}_training_completion.xlsx`);
      } catch (error) {
        console.error("Failed to export training completion summary", error);
      } finally {
        setIsExporting(false);
      }
      return;
    }

    exportKpiSeries({ category, subcategory, series, isPercent });
  };

  const handleCategoryChange = (nextCategoryId) => {
    const nextCategory = categories.find((entry) => entry.id === nextCategoryId);
    if (!nextCategory) return;
    setCategoryId(nextCategory.id);
    setSubcategoryId(nextCategory.subcategories?.[0]?.id || "");
    setShowAllSubcategories(false);
  };

  if (!categories.length) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-[#d9d9d9] bg-white/70 px-5 py-10 text-center text-sm text-black/50">
        No KPI data available
      </p>
    );
  }

  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="size-7 shrink-0" style={{ color: MARUTI_BLUE }} />
          <h2
            className="whitespace-nowrap text-[40px] font-extrabold leading-none"
            style={{ color: MARUTI_BLUE }}
          >
            My Team Status
          </h2>
        </div>
        <Button
          type="button"
          onClick={handleDownload}
          disabled={isExporting || isTrainingSubcategoryMissing}
          className={cn(
            "h-9 rounded-full bg-green-100 px-4 text-sm font-semibold text-green-700 hover:bg-green-100",
            (isExporting || isTrainingSubcategoryMissing) &&
              "cursor-not-allowed opacity-60",
          )}
        >
          {isExporting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Download className="mr-2 size-4" />
          )}
          {isExporting ? "Downloading..." : "Download KPI Data"}
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="shrink-0 text-sm font-medium text-black/50">Categories</span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {inlineCategories.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleCategoryChange(entry.id)}
                className={pillClass(entry.id === categoryId)}
              >
                {entry.label}
              </button>
            ))}
            {overflowCategories.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      pillClass(overflowCategories.some((entry) => entry.id === categoryId)),
                      "inline-flex items-center gap-1",
                    )}
                  >
                    More
                    <ChevronDown className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  {overflowCategories.map((entry) => (
                    <DropdownMenuItem
                      key={entry.id}
                      onClick={() => handleCategoryChange(entry.id)}
                      className={cn(
                        entry.id === categoryId && "bg-[#2563eb]/10 text-[#2563eb]",
                      )}
                    >
                      {entry.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {showSubcategoryRow ? (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-black/50">Subcategories</span>
          <button
            type="button"
            aria-label="Scroll subcategories left"
            onClick={() => scrollSubcategories("left")}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#2563eb]/30 text-[#2563eb] transition hover:bg-[#2563eb]/5"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div
            ref={subcategoryScrollerRef}
            className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-[#d1d5db] scrollbar-track-transparent"
          >
            {visibleSubcategories.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSubcategoryId(entry.id)}
                className={pillClass(entry.id === subcategoryId)}
              >
                {entry.label}
              </button>
            ))}
            {!showAllSubcategories && hiddenSubcategoryCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllSubcategories(true)}
                className={pillClass(false)}
              >
                + {hiddenSubcategoryCount} More
              </button>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Scroll subcategories right"
            onClick={() => scrollSubcategories("right")}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#2563eb]/30 text-[#2563eb] transition hover:bg-[#2563eb]/5"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        ) : null}
      </div>

      {isTrainingSubcategoryMissing ? (
        <p className="mt-6 rounded-2xl border border-dashed border-[#d9d9d9] bg-white/70 px-5 py-10 text-center text-sm text-black/50">
          No training subcategories available
        </p>
      ) : isLoadingSeries ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d9d9d9] bg-white/70 px-5 py-10 text-sm text-black/50">
          <Loader2 className="size-4 animate-spin" />
          Loading completion data...
        </div>
      ) : series.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-[#d9d9d9] bg-white/70 px-5 py-10 text-center text-sm text-black/50">
          No data for this KPI
        </p>
      ) : (
        <div
          className={cn(
            "mt-4 min-h-[280px]",
            showSubcategoryRow ? "h-[320px]" : "h-[375px]",
          )}
        >
          <Bar
            data={chartData}
            options={chartOptions}
            plugins={[barValueLabelsPlugin]}
          />
        </div>
      )}
    </div>
  );
}
