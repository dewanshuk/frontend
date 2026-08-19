import React from "react";
import { Filter, Download, Loader2 } from "lucide-react";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-base font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/10 px-6 py-3 text-base font-semibold leading-[1.4] text-[#2563eb] transition-colors hover:bg-blue-600/15";

export default function OrchestrationActionBar({
  onAddDocumentClickHandler,
  onAddEventClickHandler,
  onFilterClickHandler,
  onExportClickHandler,
  isExporting = false,
  noRecords = false,
  appliedFiltersCount = 0,
}) {
  return (
    <div className="py-4 flex flex-col gap-3 font-sans">

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onAddDocumentClickHandler}
            className={primaryButtonClass}
          >
            <img
              src="/assets/icons/orch/file-plus.svg"
              alt=""
              className="w-6 h-6 shrink-0"
            />
            Add Document
          </button>

          <button
            type="button"
            onClick={onAddEventClickHandler}
            className={primaryButtonClass}
          >
            <img
              src="/assets/icons/orch/calendar-plus.svg"
              alt=""
              className="w-6 h-6 shrink-0"
            />
            Add Event
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onExportClickHandler}
            disabled={isExporting}
            aria-disabled={isExporting || noRecords}
            className={`${secondaryButtonClass} disabled:opacity-60 disabled:cursor-not-allowed${
              noRecords ? " opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isExporting ? (
              <Loader2 className="w-6 h-6 shrink-0 animate-spin" />
            ) : (
              <Download className="w-6 h-6 shrink-0" />
            )}
            {isExporting ? "Exporting..." : "Export"}
          </button>

          <button
            type="button"
            onClick={onFilterClickHandler}
            className={`${secondaryButtonClass} relative`}
          >
            <Filter className="w-6 h-6 shrink-0" />
            Filters
            {appliedFiltersCount > 0 ? (
              <span className="absolute -top-2 -right-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
                {appliedFiltersCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

    </div>
  );
}
