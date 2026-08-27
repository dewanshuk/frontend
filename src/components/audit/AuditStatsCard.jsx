import {
  AlertCircle,
  AlertOctagon,
  BookUp2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAuditKPIs } from "../../api/audit";

const STAT_CARDS = [
  {
    key: "total_audits",
    titleLines: ["Total", "Audits"],
    filterKey: "total",
    icon: BookUp2,
    iconClass: "text-[#16a34a]",
  },
  {
    key: "completed_audits",
    titleLines: ["Completed", "Audits"],
    filterKey: "completed",
    icon: BookUp2,
    iconClass: "text-[#16a34a]",
  },
  {
    key: "in_progress_audits",
    titleLines: ["In-Progress", "Audits"],
    filterKey: "in_progress",
    icon: AlertOctagon,
    iconClass: "text-[#ea580c]",
  },
  {
    key: "draft_audits",
    titleLines: ["Draft", "Audits"],
    filterKey: "draft",
    icon: AlertCircle,
    iconClass: "text-[#b91c1c]",
  },
  {
    key: "total_overdue_checkpoints",
    titleLines: ["Total", "Overdue", "Checkpoints"],
    filterKey: "overdue_checkpoints",
    icon: XCircle,
    iconClass: "text-[#dc2626]",
  },
  {
    key: "total_due_checkpoints",
    titleLines: ["Total Due", "Checkpoints"],
    filterKey: "due_checkpoints",
    icon: CheckCircle,
    iconClass: "text-[#16a34a]",
  },
];

const formatStatValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "00";
  return String(Math.max(0, Math.trunc(numeric))).padStart(2, "0");
};

export default function AuditStatsCard({
  onTileClick,
  activeTileKey,
  canViewDraftAudits = false,
  filters = null,
  refreshKey = 0,
}) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const visibleCards = canViewDraftAudits
    ? STAT_CARDS
    : STAT_CARDS.filter((stat) => stat.key !== "draft_audits");

  useEffect(() => {
    let cancelled = false;

    const loadKpis = async () => {
      try {
        setLoading(true);
        const response = await getAuditKPIs(filters || {});
        if (!cancelled) {
          setKpis(response?.data || {});
        }
      } catch {
        if (!cancelled) {
          setKpis({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadKpis();
    return () => {
      cancelled = true;
    };
  }, [filters, refreshKey]);

  if (loading) {
    return (
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap xl:flex-nowrap">
        {visibleCards.map((stat) => (
          <div
            key={stat.key}
            className="h-[72px] min-w-0 flex-1 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 font-sans sm:flex-row sm:flex-wrap xl:flex-nowrap">
      {visibleCards.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeTileKey === stat.filterKey;

        return (
          <button
            key={stat.key}
            type="button"
            onClick={() => onTileClick?.(stat.filterKey)}
            className={`flex h-[72px] min-w-0 flex-1 items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition-all
              ${isActive
                ? "border-blue-600 ring-1 ring-blue-600"
                : "hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              }`}
          >
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Icon className={`size-7 shrink-0 ${stat.iconClass}`} strokeWidth={2} />
                <span className="text-base font-medium leading-[1.2] text-[#1e1e1e]">
                  {stat.titleLines.map((line) => (
                    <span key={line} className="block whitespace-nowrap">
                      {line}
                    </span>
                  ))}
                </span>
              </div>
              <span className="shrink-0 text-[28px] font-normal leading-[1.2] tracking-[-0.56px] text-[#1e1e1e]">
                {formatStatValue(kpis?.[stat.key])}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
