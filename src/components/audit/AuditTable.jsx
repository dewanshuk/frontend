import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import moment from "moment";
import { useNavigate } from "react-router-dom";

import { getAuditItems } from "@/api/audit";
import { AuditStatusBadge } from "@/components/audit/auditStatusStyles";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/Tooltip";
import { Pagination } from "@/components/ui/pagination";
import { DATE_FORMAT_MOMENT } from "@/config";
import { sanitizeAuditSearchQuery } from "@/utils/auditHelpers";

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 700;

const COL = {
  vertical: 197,
  auditName: 197,
  status: 160,
  startDate: 160,
  endDate: 160,
  checkpoint: 168,
  /** Last checkpoint col — extra room before sticky Actions */
  checkpointOverdue: 210,
  actions: 172,
};

const LEFT_STICKY_TOTAL = COL.vertical + COL.auditName;

const CHECKPOINT_COLUMNS = [
  { id: "checkpoints_total", label: "Total" },
  { id: "checkpoints_closed", label: "Closed" },
  { id: "checkpoints_open", label: "Open" },
  { id: "checkpoints_due_for_me", label: "Action for me" },
  { id: "checkpoints_overdue_for_me", label: "Overdue" },
];

const checkpointColWidth = (colId) =>
  colId === "checkpoints_overdue_for_me"
    ? COL.checkpointOverdue
    : COL.checkpoint;

const secondaryActionButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-blue-600/10 px-3 py-1 text-base font-normal leading-[1.4] text-[#2563eb] whitespace-nowrap transition-colors hover:bg-blue-600/15";

const secondaryActionButtonDisabledClass =
  "inline-flex items-center justify-center rounded-lg bg-blue-600/10 px-3 py-1 text-base font-normal leading-[1.4] text-[#2563eb] opacity-50 cursor-not-allowed whitespace-nowrap";

/** Shared table typography: 16px medium headers, 16px regular cells. */
const thBase =
  "bg-[#f5f5f5] border-t border-b border-[#d9d9d9] px-3 text-base font-medium text-black whitespace-nowrap";

const tdBase =
  "h-[56px] border-b border-[#d9d9d9] bg-white px-3 text-base font-normal text-[#1e1e1e] align-middle group-hover:bg-[#fafafa]";

const formatDisplayDate = (value) => {
  if (value == null || value === "") return "—";
  const parsed = moment(
    value,
    [moment.ISO_8601, DATE_FORMAT_MOMENT, "DD-MMM-YYYY", "DD/MM/YYYY"],
    true,
  );
  const fallback = parsed.isValid() ? parsed : moment(value);
  return fallback.isValid()
    ? fallback.format("DD-MMM-YYYY").toUpperCase()
    : String(value);
};

const isCompletedStatus = (status) =>
  String(status || "").trim().toUpperCase() === "COMPLETED";

/** Modal/KPI filters only (excludes search). */
const hasActiveAuditFilters = (filters = {}) => {
  const status = filters?.status;
  if (Array.isArray(status) ? status.length > 0 : Boolean(status)) return true;
  if (Array.isArray(filters?.departments) && filters.departments.length > 0) {
    return true;
  }
  if (Array.isArray(filters?.audit_names) && filters.audit_names.length > 0) {
    return true;
  }
  if (String(filters?.start_date || "").trim()) return true;
  if (String(filters?.end_date || "").trim()) return true;
  if (String(filters?.date_range || "").trim()) return true;
  if (filters?.due_for_me) return true;
  if (filters?.overdue_for_me) return true;
  return false;
};

const widthStyle = (size) => ({
  width: size,
  minWidth: size,
  maxWidth: size,
});

const getEditDisabledState = (audit, canEditAudits) => {
  if (isCompletedStatus(audit?.status)) {
    return {
      disabled: true,
      reason: "Completed audits cannot be edited.",
    };
  }

  // ListAudits drives editability via isEdit / can_edit (true | false).
  if (audit?.isEdit === false || audit?.can_edit === false) {
    return {
      disabled: true,
      reason: "You do not have permission to edit this audit.",
    };
  }

  if (audit?.isEdit === true || audit?.can_edit === true) {
    return { disabled: false, reason: "" };
  }

  // When API omits the flag, fall back to audit-access (create-audits role).
  if (!canEditAudits) {
    return {
      disabled: true,
      reason: "You do not have permission to edit this audit.",
    };
  }

  return { disabled: false, reason: "" };
};

export default function AuditTable({
  filters,
  searchQuery = "",
  searchType = "quick",
  refreshKey = 0,
  onTotalChange,
  tableRef,
  canEditAudits = false,
}) {
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [tableError, setTableError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    sanitizeAuditSearchQuery(searchQuery),
  );
  const [isSearchDebouncing, setIsSearchDebouncing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const tableScrollRef = useRef(null);
  const filtersRef = useRef(null);
  const requestIdRef = useRef(0);

  /** Debounce + sanitize free-text search for backend. Clear applies immediately. */
  useEffect(() => {
    const sanitized = sanitizeAuditSearchQuery(searchQuery);

    if (!sanitized) {
      setDebouncedSearch("");
      setIsSearchDebouncing(false);
      return undefined;
    }

    setIsSearchDebouncing(true);
    const timer = window.setTimeout(() => {
      setDebouncedSearch(sanitized);
      setIsSearchDebouncing(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const filtersActive = useMemo(
    () => hasActiveAuditFilters(filters),
    [filters],
  );
  const searchActive = Boolean(debouncedSearch);

  const updateScroll = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    setScrolled(el.scrollLeft > 1);
  }, []);

  const openAuditDetails = useCallback(
    (audit, opts = {}) => {
      if (!audit?.id) return;
      const mode = opts.edit ? "edit" : "view";
      navigate(`/audit/details/${audit.id}?mode=${mode}`);
    },
    [navigate],
  );

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isSearchRequest = Boolean(debouncedSearch);

    try {
      setIsLoading(true);
      if (isSearchRequest) {
        setSearchError("");
      } else {
        setTableError("");
        setSearchError("");
      }

      const response = await getAuditItems({
        page: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        // Backend search — stacks with active modal/KPI filters
        search: debouncedSearch || undefined,
        search_type: searchType || "quick",
        status: filters?.status,
        departments: filters?.departments,
        audit_names: filters?.audit_names,
        due_for_me: filters?.due_for_me,
        overdue_for_me: filters?.overdue_for_me,
        start_date: filters?.start_date,
        end_date: filters?.end_date,
        date_range: filters?.date_range,
      });

      if (requestId !== requestIdRef.current) return;

      const nextTotal = response?.total || 0;
      setData(response?.data || []);
      setTotal(nextTotal);
      onTotalChange?.(nextTotal);
      setTableError("");
      setSearchError("");
    } catch {
      if (requestId !== requestIdRef.current) return;

      if (isSearchRequest) {
        // Keep last stable rows / totals
        setSearchError("Search could not be completed. Please retry.");
      } else {
        setData([]);
        setTotal(0);
        onTotalChange?.(0);
        setTableError("Unable to load audits.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    debouncedSearch,
    filters,
    onTotalChange,
    pagination.pageIndex,
    pagination.pageSize,
    refreshKey,
    searchType,
  ]);

  useEffect(() => {
    const filtersKey = JSON.stringify({
      filters,
      search: debouncedSearch,
      searchType,
      refreshKey,
    });
    const filtersChanged =
      filtersRef.current !== null && filtersRef.current !== filtersKey;
    filtersRef.current = filtersKey;

    if (filtersChanged && pagination.pageIndex !== 0) {
      setPagination((current) => ({ ...current, pageIndex: 0 }));
      return;
    }

    fetchData();
  }, [
    fetchData,
    filters,
    pagination.pageIndex,
    debouncedSearch,
    refreshKey,
    searchType,
  ]);

  useEffect(() => {
    updateScroll();
  }, [data, isLoading, updateScroll]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "vertical_div_deptt",
        size: COL.vertical,
        cell: ({ row, getValue }) => (
          <button
            type="button"
            onClick={() => openAuditDetails(row.original)}
            className="w-full truncate text-center font-normal text-[#2563eb] hover:underline"
            title={getValue()}
          >
            {getValue() || "—"}
          </button>
        ),
      },
      {
        accessorKey: "audit_name",
        size: COL.auditName,
        cell: ({ row, getValue }) => (
          <button
            type="button"
            onClick={() => openAuditDetails(row.original)}
            className="w-full truncate text-left font-normal text-[#2563eb] hover:underline"
            title={getValue()}
          >
            {getValue() || "—"}
          </button>
        ),
      },
      {
        accessorKey: "status",
        size: COL.status,
        cell: ({ getValue }) => (
          <div className="flex justify-center">
            <AuditStatusBadge status={getValue()} />
          </div>
        ),
      },
      {
        accessorKey: "start_date",
        size: COL.startDate,
        cell: ({ getValue }) => (
          <span className="block text-center">{formatDisplayDate(getValue())}</span>
        ),
      },
      {
        accessorKey: "end_date",
        size: COL.endDate,
        cell: ({ getValue }) => (
          <span className="block text-center">{formatDisplayDate(getValue())}</span>
        ),
      },
      ...CHECKPOINT_COLUMNS.map((col) => ({
        accessorKey: col.id,
        size: checkpointColWidth(col.id),
        cell: ({ getValue }) => (
          <span
            className={`block text-center ${
              col.id === "checkpoints_overdue_for_me" ? "pr-10" : ""
            }`}
          >
            {getValue() ?? 0}
          </span>
        ),
      })),
      {
        id: "actions",
        size: COL.actions,
        cell: ({ row }) => {
          const audit = row.original;
          const { disabled: editDisabled, reason: editDisabledReason } =
            getEditDisabledState(audit, canEditAudits);

          const editButton = (
            <button
              type="button"
              disabled={editDisabled}
              onClick={() => openAuditDetails(audit, { edit: true })}
              className={
                editDisabled
                  ? secondaryActionButtonDisabledClass
                  : secondaryActionButtonClass
              }
            >
              Edit
            </button>
          );

          return (
            <div className="flex items-center justify-center gap-2.5 whitespace-nowrap">
              {editDisabled ? (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">{editButton}</span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black text-white max-w-[220px] text-center">
                      {editDisabledReason}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                editButton
              )}
              <button
                type="button"
                onClick={() => openAuditDetails(audit, { edit: false })}
                className={secondaryActionButtonClass}
              >
                View
              </button>
            </div>
          );
        },
      },
    ],
    [canEditAudits, openAuditDetails],
  );

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize) || 1),
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const visibleColumnCount = table.getAllLeafColumns().length;
  const showFullLoader = isLoading && data.length === 0 && !searchError;
  const showRowOverlay = (isLoading || isSearchDebouncing) && data.length > 0;
  const emptyMessage = searchActive
    ? "No results found."
    : filtersActive
      ? "No items found. Try clearing filters."
      : "No records found.";

  /** Sticky left col 1 — right edge divider */
  const stickyLeftFirst = (variant) =>
    [
      "sticky left-0",
      variant === "header" ? "z-30" : "z-20",
      variant === "header" ? "bg-[#f5f5f5]" : "bg-white group-hover:bg-[#fafafa]",
      "border-r border-[#e2e2e2]",
      "shadow-[inset_0_-1px_0_0_#d9d9d9]",
    ].join(" ");

  /** Sticky left col 2 (Audit Name) — left+right borders like Figma */
  const stickyLeftLast = (variant) =>
    [
      "sticky z-20",
      variant === "header" ? "z-30 bg-[#f5f5f5]" : "bg-white group-hover:bg-[#fafafa]",
      "border-l border-r border-[#e2e2e2]",
      scrolled
        ? "shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12),inset_0_-1px_0_0_#d9d9d9]"
        : "shadow-[inset_0_-1px_0_0_#d9d9d9]",
    ].join(" ");

  /** Sticky Actions — left shadow (Figma) */
  const stickyActions = (variant) =>
    [
      "sticky right-0",
      variant === "header" ? "z-40 bg-[#f5f5f5]" : "z-30 bg-white group-hover:bg-[#fafafa]",
      "shadow-[-8px_0px_32px_0px_rgba(0,0,0,0.05),inset_0_-1px_0_0_#d9d9d9]",
    ].join(" ");

  return (
    <div
      ref={tableRef}
      className="w-full overflow-hidden rounded-2xl bg-white pt-5 font-sans shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    >
      {searchError ? (
        <div
          className="mx-5 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <span>{searchError}</span>
          <button
            type="button"
            onClick={fetchData}
            className="shrink-0 font-medium text-[#2563eb] hover:underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {tableError ? (
        <div
          className="mx-5 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <span>{tableError}</span>
          <button
            type="button"
            onClick={fetchData}
            className="shrink-0 font-medium text-[#2563eb] hover:underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="relative w-full">
        <div
          ref={tableScrollRef}
          onScroll={updateScroll}
          className="w-full overflow-x-auto"
        >
          <table className="w-full min-w-[1860px] table-fixed border-separate border-spacing-0">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className={`${thBase} ${stickyLeftFirst("header")} h-[56px] text-center align-middle`}
                  style={{ ...widthStyle(COL.vertical), left: 0 }}
                >
                  Vertical/ Div/ Deptt
                </th>
                <th
                  rowSpan={2}
                  className={`${thBase} ${stickyLeftLast("header")} h-[56px] text-left align-middle pl-5`}
                  style={{ ...widthStyle(COL.auditName), left: COL.vertical }}
                >
                  Audit Name
                </th>
                <th
                  rowSpan={2}
                  className={`${thBase} h-[56px] text-center align-middle`}
                  style={widthStyle(COL.status)}
                >
                  Status
                </th>
                <th
                  rowSpan={2}
                  className={`${thBase} h-[56px] text-center align-middle`}
                  style={widthStyle(COL.startDate)}
                >
                  Start Date
                </th>
                <th
                  rowSpan={2}
                  className={`${thBase} h-[56px] text-center align-middle`}
                  style={widthStyle(COL.endDate)}
                >
                  End Date
                </th>
                <th
                  colSpan={CHECKPOINT_COLUMNS.length}
                  className={`${thBase} !border-b-0 h-7 text-center align-middle`}
                >
                  Checkpoints
                </th>
                <th
                  rowSpan={2}
                  className={`${thBase} ${stickyActions("header")} h-[56px] text-center align-middle`}
                  style={widthStyle(COL.actions)}
                >
                  Actions
                </th>
              </tr>
              <tr>
                {CHECKPOINT_COLUMNS.map((col) => (
                  <th
                    key={col.id}
                    className={`${thBase} !border-t border-t-[#d9d9d9] h-7 text-center align-middle ${
                      col.id === "checkpoints_overdue_for_me" ? "pr-12" : ""
                    }`}
                    style={widthStyle(checkpointColWidth(col.id))}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={showRowOverlay ? "opacity-60" : undefined}>
              {showFullLoader ? (
                <tr>
                  <td
                    colSpan={visibleColumnCount}
                    className="border-b border-[#d9d9d9] px-6 py-10 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#2563eb]" />
                      <span className="text-base text-[#757575]">
                        {searchActive || isSearchDebouncing
                          ? "Searching..."
                          : "Loading..."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="group h-14">
                    {row.getVisibleCells().map((cell, index) => {
                      let stickyClass = "";
                      let style = widthStyle(cell.column.getSize());

                      if (index === 0) {
                        stickyClass = stickyLeftFirst("body");
                        style = { ...style, left: 0 };
                      } else if (index === 1) {
                        stickyClass = stickyLeftLast("body");
                        style = { ...style, left: COL.vertical };
                      } else if (index === visibleColumnCount - 1) {
                        stickyClass = stickyActions("body");
                      }

                      return (
                        <td
                          key={cell.id}
                          className={`${tdBase} ${stickyClass}`}
                          style={style}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={visibleColumnCount}
                    className="border-b border-[#d9d9d9] px-6 py-10 text-center text-base text-[#757575]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {showRowOverlay ? (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-24">
            <div className="rounded-lg bg-white/90 px-4 py-2 text-sm text-[#757575] shadow-sm">
              {searchActive || isSearchDebouncing ? "Searching..." : "Loading..."}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center px-4 py-5">
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          onPageChange={(page) => table.setPageIndex(page - 1)}
          disabled={isLoading || isSearchDebouncing}
        />
      </div>
    </div>
  );
}
