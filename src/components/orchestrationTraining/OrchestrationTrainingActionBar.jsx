import React from "react";
import { Filter, Download } from "lucide-react";

export default function OrchestrationTrainingActionBar({
  onAddTrainingClickHandler,
  onFilterClickHandler,
  activeFilterCount = 0,
  onExportClick,
  isExporting = false,
  noRecords = false,
}) {
  return (
    <>
      <div className="flex items-center justify-between overflow-visible rounded-xl py-4">
        
        {/* Left Buttons */}
        <div className="flex gap-3">
          <button onClick={onAddTrainingClickHandler} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition">
            <img src="/assets/icons/orch/calendar-plus.svg" alt="Active" className="w-7 h-7"/>
            Add Training
          </button>
        </div>

        {/* Right Buttons — padding keeps the filter badge fully visible */}
        <div className="flex gap-3 overflow-visible pr-3 pt-1">
          <button
            onClick={onExportClick}
            disabled={isExporting}
            aria-disabled={isExporting || noRecords}
            className={`flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-3 rounded-md text-md font-medium hover:bg-blue-200 transition disabled:opacity-60 disabled:cursor-not-allowed${
              noRecords ? " opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <Download size={16} />
            {isExporting ? "Exporting…" : "Export"}
          </button>
          <button onClick={onFilterClickHandler} className="relative flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-3 rounded-md text-md font-medium hover:bg-blue-200 transition">
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 right-0 z-10 inline-flex h-[18px] min-w-[18px] translate-x-1/2 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </>
  );
}
