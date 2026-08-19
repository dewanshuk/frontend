import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AuditBreadcrumb from "../components/audit/AuditBreadcrumb";
import AuditStatsCard from "../components/audit/AuditStatsCard";
import AuditActionBar from "../components/audit/AuditActionBar";
import AuditTable from "../components/audit/AuditTable";
import AuditFilterModal, {
  AUDIT_FILTER_INITIAL_VALUES,
  countAppliedAuditFilters,
} from "../components/audit/AuditFilterModal";
import CenterToast from "../components/shared/CenterToast";
import { exportAudits } from "@/api/audit";
import { useAuditAccess } from "@/hooks/useAuditAccess";
import { sanitizeAuditSearchQuery } from "@/utils/auditHelpers";

/** KPI tile → list filters. Empty object clears scope filters (server still scopes by user). */
const KPI_FILTER_MAP = {
  total: {},
  completed: { status: "Completed" },
  in_progress: { status: "In-Progress" },
  draft: { status: "Draft" },
  due_checkpoints: { due_for_me: true },
  overdue_checkpoints: { overdue_for_me: true },
};

/** Trigger browser download for a file axios blob response. */
const downloadBlobResponse = (response, fallbackFileName) => {
  const blob =
    response?.data instanceof Blob
      ? response.data
      : new Blob([response?.data].filter(Boolean));
  if (!blob || blob.size === 0) return false;

  const blobUrl = window.URL.createObjectURL(blob);
  const disposition = response?.headers?.["content-disposition"] || "";
  const fileNameMatch = disposition.match(
    /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i,
  );
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
  return true;
};

export default function AuditDashboard() {
  const navigate = useNavigate();
  const auditAccess = useAuditAccess();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("quick");
  const [filterModalIsOpen, setFilterModalIsOpen] = useState(false);
  const [auditFilters, setAuditFilters] = useState(AUDIT_FILTER_INITIAL_VALUES);
  const [activeTileKey, setActiveTileKey] = useState(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [tableTotal, setTableTotal] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    variant: "success",
    message: "",
  });
  const tableRef = useRef(null);

  const closeToast = () => {
    setToast((currentToast) => ({ ...currentToast, open: false }));
  };

  const showToast = (message, variant = "success") => {
    setToast({ open: true, variant, message });
  };

  const handleKpiTileClick = (filterKey) => {
    if (filterKey === activeTileKey) {
      setActiveTileKey(null);
      setAuditFilters(AUDIT_FILTER_INITIAL_VALUES);
      return;
    }

    const filterPatch = KPI_FILTER_MAP[filterKey];
    if (filterPatch !== undefined) {
      setActiveTileKey(filterKey);
      setAuditFilters({
        ...AUDIT_FILTER_INITIAL_VALUES,
        ...filterPatch,
      });
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setActiveTileKey(filterKey);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Filter/search scope for export — no pagination (export returns full dataset). */
  const buildExportRequestOptions = useCallback(
    () => ({
      search: sanitizeAuditSearchQuery(searchQuery) || undefined,
      search_type: searchType || "quick",
      status: auditFilters?.status,
      departments: auditFilters?.departments,
      audit_names: auditFilters?.audit_names,
      due_for_me: auditFilters?.due_for_me,
      overdue_for_me: auditFilters?.overdue_for_me,
      start_date: auditFilters?.start_date,
      end_date: auditFilters?.end_date,
      date_range: auditFilters?.date_range,
    }),
    [auditFilters, searchQuery, searchType],
  );

  const handleExport = useCallback(async () => {
    if (isExporting) return;

    if (!tableTotal || tableTotal <= 0) {
      showToast("Nothing to export", "error");
      return;
    }

    setIsExporting(true);
    try {
      const response = await exportAudits(buildExportRequestOptions());

      // API may return JSON error body with blob responseType
      const contentType = String(response?.headers?.["content-type"] || "");
      if (contentType.includes("application/json")) {
        const text = await response.data.text();
        let message = "Unable to export audits.";
        try {
          const parsed = JSON.parse(text);
          message =
            parsed?.message ||
            parsed?.detail ||
            parsed?.error ||
            message;
        } catch {
          // ignore parse failure
        }
        showToast(String(message), "error");
        return;
      }

      const downloaded = downloadBlobResponse(
        response,
        "audit_dashboard_export.xlsx",
      );
      if (!downloaded) {
        showToast("Nothing to export", "error");
        return;
      }

      showToast("Export downloaded successfully.");
    } catch (error) {
      const message =
        error?.message ||
        error?.payload?.message ||
        "Unable to export audits.";
      showToast(String(message), "error");
    } finally {
      setIsExporting(false);
    }
  }, [buildExportRequestOptions, isExporting, tableTotal]);

  const canExport = tableTotal > 0;
  const appliedFiltersCount = useMemo(
    () => countAppliedAuditFilters(auditFilters),
    [auditFilters],
  );

  return (
    <div className="min-h-full bg-gray-100">
      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={closeToast}
      />

      <div className="w-full py-6 md:py-8">
        <AuditBreadcrumb currentPage="Audit Dashboard" />

        <h1 className="text-2xl font-semibold tracking-[-0.48px] text-[#1e1e1e]">
          Audit Dashboard
        </h1>

        <AuditActionBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchType={searchType}
          onSearchTypeChange={setSearchType}
          onCreateAuditClick={() => navigate("/audit/new")}
          onFilterClick={() => setFilterModalIsOpen(true)}
          onExportClick={handleExport}
          canCreateAudit={auditAccess.allowed}
          canExport={canExport}
          isExporting={isExporting}
          appliedFiltersCount={appliedFiltersCount}
        />

        <div className="mb-5">
          <AuditStatsCard
            onTileClick={handleKpiTileClick}
            activeTileKey={activeTileKey}
            canViewDraftAudits={auditAccess.allowed}
            filters={auditFilters}
            refreshKey={tableRefreshKey}
          />
        </div>

        <AuditTable
          tableRef={tableRef}
          filters={auditFilters}
          searchQuery={searchQuery}
          searchType={searchType}
          refreshKey={tableRefreshKey}
          canEditAudits={auditAccess.allowed}
          onTotalChange={setTableTotal}
        />

        <AuditFilterModal
          currentFilters={auditFilters}
          onApply={(filters) => {
            setActiveTileKey(null);
            setAuditFilters(filters);
            // Refresh table + KPI counters; table resets page on filter change
            setTableRefreshKey((currentKey) => currentKey + 1);
          }}
          isOpen={filterModalIsOpen}
          setIsOpen={setFilterModalIsOpen}
        />
      </div>
    </div>
  );
}
