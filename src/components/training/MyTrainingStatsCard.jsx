import React from "react";
import { ClipboardList, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyTrainingStatsCard({ stats = {}, selectedKey, onCardClick }) {
  const cards = [
    {
      title: "Total Assigned",
      value: stats.totalAssigned ?? 0,
      icon: <ClipboardList className="w-7 h-7 text-green-500" />,
    },
    {
      title: "Overdue",
      value: stats.overdue ?? 0,
      icon: <AlertCircle className="w-7 h-7 text-red-800" />,
    },
    {
      title: "Due",
      value: stats.due ?? 0,
      icon: <Clock className="w-7 h-7 text-red-500" />,
    },
    {
      title: "Completed",
      value: stats.completed ?? 0,
      icon: <CheckCircle className="w-7 h-7 text-green-500" />,
    },
  ];

  return (
    <div className="w-full min-w-0 overflow-x-auto px-0.5 py-1 font-sans">
      <div className="grid min-w-[860px] grid-cols-4 gap-3">
        {cards.map((card) => {
          const selected = selectedKey === card.title
          const cardClass = cn(
            "flex h-[72px] w-full min-w-0 items-center justify-between rounded-xl border bg-white px-4 py-3 text-left shadow-sm",
            selected ? "border-blue-600" : "border-slate-200",
            onCardClick ? "cursor-pointer" : ""
          )

          return onCardClick ? (
            <button
              key={card.title}
              type="button"
              onClick={() => onCardClick(card.title)}
              className={cardClass}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0">{card.icon}</div>
                <span className="truncate text-[20px] font-medium leading-[1.4] text-[#1e1e1e]">
                  {card.title}
                </span>
              </div>
              <span className="ml-3 shrink-0 text-[28px] font-normal leading-[1.2] tracking-[-0.56px] text-[#1e1e1e]">
                {card.value}
              </span>
            </button>
          ) : (
            <div key={card.title} className={cardClass}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0">{card.icon}</div>
                <span className="truncate text-base font-medium leading-[1.4] text-[#1e1e1e]">
                  {card.title}
                </span>
              </div>
              <span className="ml-3 shrink-0 text-[28px] font-normal leading-[1.2] tracking-[-0.56px] text-[#1e1e1e]">
                {card.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  );
}
