import React from "react";
import {
  CalendarDays,
  FileText,
} from "lucide-react";
import { useOrchestrationKPIs } from "../../hooks/useOrchestrationKPIs";

const typeToIconMap = {
  "Policies": "Policy",
  "Guidance Notes": "Guidance Notes",
  "Law & Regulation": "Law & Regulation",
  "Training Resources": "Training Resources",
  "Flyers": "Flyers",
  "Early Warnings": "Early Warnings",
  "Events": "Event",
};

export default function OrchestrationStatsCard({ onTileClick, activeTileKey, refreshKey = 0 }) {
  const { kpis, loading, error } = useOrchestrationKPIs(refreshKey);

  const handleClick = (filterKey) => {
    onTileClick?.(filterKey);
  };

  // Map API response to display format
  const topStats = [
    {
      title: "Published (Active)",
      value: kpis?.active_doc || 0,
      filterKey: "active_published",
      icon: <img src="/assets/icons/orch/active-published.svg" alt="Active" className="w-8 h-8 shrink-0" />,
    },
    {
      title: "Due for Review",
      value: kpis?.due_for_review || 0,
      filterKey: "due_for_review",
      icon: <img src="/assets/icons/orch/due-for-review.svg" alt="Due for Review" className="w-8 h-8 shrink-0" />,
    },
    {
      title: "Overdue for Review",
      value: kpis?.overdue || 0,
      filterKey: "overdue",
      icon: <img src="/assets/icons/orch/overdueforreview.svg" alt="Overdue for Review" className="w-8 h-8 shrink-0" />,
    },
    {
      title: "Draft",
      value: kpis?.draft || 0,
      filterKey: "draft",
      icon: <img src="/assets/icons/orch/draft.svg" alt="Draft" className="w-8 h-8 shrink-0" />,
    }
  ];

  // Map by_type data to categories
  const getCategories = () => {
    if (!kpis?.by_type) return [];

    const typeToIcon = {
      "Policies": <FileText className="w-6 h-6 text-violet-500 shrink-0" />,
      "Guidance Notes": <img src="/assets/icons/orch/guidance-notes.svg" alt="Guidance Note" className="w-6 h-6 shrink-0" />,
      "Law & Regulation": <img src="/assets/icons/orch/lawsandregulation.svg" alt="Law Regulation" className="w-6 h-6 shrink-0" />,
      "Training Resources": <img src="/assets/icons/orch/training-materials.svg" alt="Training Resource" className="w-6 h-6 shrink-0" />,
      "Flyers": <img src="/assets/icons/orch/flyers.svg" alt="Flyer" className="w-6 h-6 shrink-0" />,
      "Early Warnings": <img src="/assets/icons/orch/ews.svg" alt="Early Warnings" className="w-6 h-6 shrink-0" />,
      "Events": <CalendarDays className="w-6 h-6 text-violet-500 shrink-0" />,
    };

    return Object.keys(typeToIcon).map((name) => ({
      name,
      value: kpis.by_type[typeToIconMap[name]] || 0,
      filterKey: `type:${typeToIconMap[name]}`,
      icon: typeToIcon[name] || <img src="/assets/icons/orch/file-plus.svg" alt={name} className="w-6 h-6 shrink-0" />,
    }));
  };

  const categories = getCategories();

  if (loading) {
    return (
      <div className="w-full space-y-7 font-sans">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
        <div className="flex flex-nowrap gap-4 overflow-x-auto">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-violet-500/5 border border-[#d9d9d9] rounded-2xl px-4 py-3 min-h-[72px] min-w-[160px] flex-1 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-7 font-sans">

      {/* Non-blocking error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <span className="shrink-0">⚠️</span>
          <span>Unable to load Documents & Events overview.</span>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
        {topStats.map((stat, index) => (
          <div
            key={index}
            role="button"
            tabIndex={0}
            onClick={() => handleClick(stat.filterKey)}
            onKeyDown={(e) => e.key === "Enter" && handleClick(stat.filterKey)}
            className={`flex items-center justify-between w-full h-16 bg-white rounded-2xl px-4 py-4 cursor-pointer transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05)]
              ${activeTileKey === stat.filterKey
                ? "ring-1 ring-violet-500 shadow-md"
                : "hover:shadow-md"
              }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {stat.icon}
              <span className="text-base font-medium leading-[1.4] text-[#1e1e1e]">
                {stat.title}
              </span>
            </div>

            <span className="text-[28px] font-normal leading-[1.2] tracking-[-0.56px] text-[#1e1e1e] shrink-0">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Categories — single row */}
      <div className="flex flex-nowrap gap-4 overflow-x-auto">
        {categories.map((item, index) => (
          <div
            key={index}
            role="button"
            tabIndex={0}
            onClick={() => handleClick(item.filterKey)}
            onKeyDown={(e) => e.key === "Enter" && handleClick(item.filterKey)}
            className={`flex items-center gap-3 min-w-[160px] flex-1 rounded-2xl border border-[#d9d9d9] bg-violet-500/5 px-4 py-3 cursor-pointer transition-all
              ${activeTileKey === item.filterKey
                ? "border-violet-500 ring-1 ring-violet-500 shadow-md"
                : "hover:border-violet-400"
              }`}
          >
            <div className="flex-shrink-0">
              {item.icon}
            </div>

            <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
              <span className="text-base font-medium leading-[1.2] text-[#1e1e1e] break-words">
                {item.name}
              </span>

              <span className="text-[28px] font-normal leading-[1.2] tracking-[-0.56px] text-[#1e1e1e] shrink-0">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
