import React, { useCallback, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  FileText,
  CalendarDays,
  HelpCircle,
} from "lucide-react";
import moment from "moment";
import { DATE_FORMAT_MOMENT } from "../../config";
import {
  toggleOrchestrationItemStatus,
  getOrchestrationItems,
} from "../../api/orchestration";
import CenterToast from "../shared/CenterToast";
import DeactivateModal from "./DeactivateModal";
import { Button } from "../ui/button";
import { Pagination } from "../ui/pagination";
import { normaliseDocTypeLabel } from "../../lib/utils";
import { statusFilterToStatuses } from "./OrchestrationFilterModal";

const statusStyles = {
  ACTIVE: "bg-green-400/15 text-[#009951]",
  DRAFT: "bg-[#fff1c2] text-[#bf6a02]",
  INACTIVE: "bg-[#f5f5f5] text-[#757575]",
};

const actionButtonStyles = {
  ACTIVE: {
    className:
      "inline-flex items-center justify-center rounded-lg bg-[#fdd3d0] px-3 py-1 text-base font-normal leading-[1.4] text-[#c00f0c] min-w-[100px] whitespace-nowrap",
    label: "Deactivate",
  },
  DRAFT: {
    className:
      "inline-flex items-center justify-center rounded-lg bg-[#e6e6e6] px-3 py-1 text-base font-normal leading-[1.4] text-[#757575] opacity-25 min-w-[100px] cursor-not-allowed whitespace-nowrap",
    label: "Deactivate",
  },
  INACTIVE: {
    className:
      "inline-flex items-center justify-center rounded-lg bg-[#e6e6e6] px-3 py-1 text-base font-normal leading-[1.4] text-[#757575] opacity-25 min-w-[100px] cursor-not-allowed whitespace-nowrap",
    label: "Deactivate",
  },
};

const secondaryActionButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-blue-600/10 px-3 py-1 text-base font-normal leading-[1.4] text-[#2563eb] whitespace-nowrap transition-colors hover:bg-blue-600/15";

const secondaryActionButtonDisabledClass =
  "inline-flex items-center justify-center rounded-lg bg-blue-600/10 px-3 py-1 text-base font-normal leading-[1.4] text-[#2563eb] opacity-25 cursor-not-allowed whitespace-nowrap";

const typeBadgeClass =
  "inline-flex max-w-full items-center gap-2 overflow-hidden rounded-lg bg-violet-500/10 px-4 py-2 text-base font-semibold leading-[1.4] text-violet-500";

const statusBadgeClass =
  "inline-flex min-w-[95px] items-center justify-center rounded-lg px-4 py-2 text-base font-semibold leading-[1.4] whitespace-nowrap";

const tableHeaderClass =
  "px-3 py-3 whitespace-nowrap border-b border-[#d9d9d9] bg-[#f5f5f5] text-base font-medium text-black";

const tableCellClass =
  "px-3 py-3 border-b border-[#d9d9d9] text-base font-normal text-[#1e1e1e]";

const getActionButtonStyle = (status) => {
  const normalizedStatus = String(status).toUpperCase();
  return actionButtonStyles[normalizedStatus] || actionButtonStyles.INACTIVE;
};

const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const formatDisplayDate = (value) => {
  if (value == null || value === "") return "—";
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format(DATE_FORMAT_MOMENT).toUpperCase() : String(value);
};

const capitalizeFirstLetter = (value) => {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";
  return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1);
};

const parseUpdatedByValue = (updatedBy) => {
  if (!updatedBy) {
    return { name: "", staffId: "" };
  }

  if (typeof updatedBy === "object") {
    return {
      name: updatedBy?.username || updatedBy?.name || "",
      staffId:
        updatedBy?.staff_id ||
        updatedBy?.staffId ||
        updatedBy?.employee_id ||
        "",
    };
  }

  const normalized = String(updatedBy).trim();
  if (!normalized) {
    return { name: "", staffId: "" };
  }

  const bracketMatch = normalized.match(/^(.*)\(([^)]+)\)\s*$/);
  if (bracketMatch) {
    return {
      name: String(bracketMatch[1] || "").trim(),
      staffId: String(bracketMatch[2] || "").trim(),
    };
  }

  return { name: normalized, staffId: "" };
};

const getDisplayTypeLabel = (value) => {
  const normalizedValue = String(value || "").trim();

  if (
    normalizedValue === "Latest News & Announcements" ||
    normalizedValue === "Latest News and Announcements"
  ) {
    return "Announcements";
  }

  return capitalizeFirstLetter(normaliseDocTypeLabel(normalizedValue) || normalizedValue);
};

const typeIcon = (type) => {
  const raw = String(type || "").trim();
  const normalized = (normaliseDocTypeLabel(raw) || raw).toLowerCase();

  if (normalized === "event" || normalized === "events") {
    return <CalendarDays className="w-6 h-6 flex-shrink-0" />;
  }
  if (normalized === "faq") {
    return <HelpCircle className="w-6 h-6 flex-shrink-0" />;
  }
  if (normalized === "policy" || normalized === "policies") {
    return <FileText className="w-6 h-6 flex-shrink-0" />;
  }

  const iconMap = {
    "guidance notes":     "/assets/icons/orch/guidance-notes.svg",
    "law & regulation":   "/assets/icons/orch/lawsandregulation.svg",
    "training resources": "/assets/icons/orch/training-materials.svg",
    "flyers":             "/assets/icons/orch/flyers.svg",
    "early warnings":     "/assets/icons/orch/ews.svg",
  };

  const src = iconMap[normalized];
  if (src) return <img src={src} alt={raw} className="w-6 h-6 flex-shrink-0" />;

  return <FileText className="w-6 h-6 flex-shrink-0" />;
};

/* Single shadow-* class only — Tailwind keeps one box-shadow; combining edge + inset. */
const STICKY_ROW_BORDER = "shadow-[inset_0_-1px_0_0_#d9d9d9]";
const STICKY_LEFT_EDGE_SHADOW =
  "shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12),inset_0_-1px_0_0_#e5e7eb]";
const STICKY_ACTIONS_EDGE_SHADOW =
  "shadow-[-8px_0px_32px_0px_rgba(0,0,0,0.05),inset_0_-1px_0_0_#d9d9d9]";

const getColumnWidthStyle = (size, meta = {}) => {
  if (meta?.autoWidth) {
    return {
      minWidth: size,
      ...(meta?.isLeftSticky ? { left: meta.left } : {}),
    };
  }
  return {
    width: size,
    minWidth: size,
    maxWidth: size,
    ...(meta?.isLeftSticky ? { left: meta.left } : {}),
  };
};

const getColumnAlignmentClass = (index) => (index < 3 ? "text-left" : "text-center");

const getStickyColumnClass = (meta = {}, variant = "body", options = {}) => {
  const { scrollable = true } = options;
  const headerBg = variant === "header" ? "bg-[#f5f5f5]" : "bg-white group-hover:bg-[#fafafa]";
  const zIndex = variant === "header" ? "z-30" : "z-20";

  if (meta?.isSticky) {
    const shadow = scrollable ? STICKY_ACTIONS_EDGE_SHADOW : STICKY_ROW_BORDER;
    return `sticky right-0 ${headerBg} ${zIndex} ${shadow}`;
  }

  if (meta?.isLeftSticky) {
    const shadow =
      meta?.isLastLeftSticky && scrollable ? STICKY_LEFT_EDGE_SHADOW : STICKY_ROW_BORDER;
    return `sticky ${headerBg} ${zIndex} ${shadow}`;
  }

  return "";
};

export default function OrchestrationTable({
  filters,
  onViewClick,
  onEditClick,
  refreshKey = 0,
  onReload,
  onTotalChange,
}) {
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [data, setData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [tableError, setTableError] = React.useState(false);
  const [tableErrorMessage, setTableErrorMessage] = React.useState("");
  const [actionItemId, setActionItemId] = React.useState(null);
  const [deactivateModalOpen, setDeactivateModalOpen] = React.useState(false);
  const [selectedActionItem, setSelectedActionItem] = React.useState(null);
  const [toast, setToast] = React.useState({
    open: false,
    variant: "success",
    message: "",
    duration: 3500,
  });

  const filtersRef = React.useRef({ currentSerialized: null });
  const prevRefreshKeyRef = React.useRef(refreshKey);
  const tableScrollRef = React.useRef(null);
  const [tableScrollState, setTableScrollState] = React.useState({
    left: false,
    scrollable: false,
  });

  const updateTableScrollState = React.useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const scrollable = scrollWidth > clientWidth + 1;

    setTableScrollState({
      left: scrollable && scrollLeft > 1,
      scrollable,
    });
  }, []);

  const closeToast = useCallback(() => {
    setToast((currentToast) => ({ ...currentToast, open: false }));
  }, []);

  const showToast = useCallback((variant, message, duration = 3500) => {
    setToast({ open: true, variant, message, duration });
  }, []);

  const formatFilters = (filters) => {
    if (!filters) return {};

    const last_updated_start = filters?.lastUpdated && String(filters?.lastUpdated?.split("-")?.[0])?.trim?.() ? moment(String(filters?.lastUpdated?.split("-")?.[0]).trim(), DATE_FORMAT_MOMENT).format("YYYY-MM-DD") : null;
    const last_updated_end = filters?.lastUpdated && String(filters?.lastUpdated)?.split("-")?.[1]?.trim?.() ? moment(String(filters?.lastUpdated?.split("-")?.[1]).trim(), DATE_FORMAT_MOMENT).format("YYYY-MM-DD") : null;

    const next_review_start = filters?.nextReview && String(filters?.nextReview?.split("-")?.[0])?.trim?.() ? moment(String(filters?.nextReview?.split("-")?.[0]).trim(), DATE_FORMAT_MOMENT).format("YYYY-MM-DD") : null;
    const next_review_end = filters?.nextReview && String(filters?.nextReview)?.split("-")?.[1]?.trim?.() ? moment(String(filters?.nextReview?.split("-")?.[1]).trim(), DATE_FORMAT_MOMENT).format("YYYY-MM-DD") : null;

    const payload = {
      // item_type: string,
      document_types: Array.isArray(filters?.documentType) ? filters.documentType : (filters?.documentType ? [filters.documentType] : []),
      document_names: Array.isArray(filters?.documentName) && filters.documentName.length > 0
        ? filters.documentName.map((d) => d.name)
        : [],
      statuses: statusFilterToStatuses(filters?.status),
      last_updated_start,
      last_updated_end,
      next_review_start,
      next_review_end,
      search: filters?.search || undefined,
      updated_by: filters?.updated_by || undefined,
      owner: filters?.owner || undefined,
      due_for_review: filters?.due_for_review === true ? true : undefined,
      overdue: filters?.overdue === true ? true : undefined,
      // NOTE: page is intentionally excluded — always driven by pagination.pageIndex
    };

    return Object.entries(payload).reduce((acc, [key, value]) => {
      if (value === undefined || value === null || value === "") return acc;
      acc[key] = value;
      return acc;
    }, {});
  };

  const fetchData = useCallback(async (overridePageIndex, options = {}) => {
    const { notifyParent = false } = options || {};
    try {
      setIsLoading(true);
      setTableError(false);
      setTableErrorMessage("");
      const page = typeof overridePageIndex === "number" ? overridePageIndex : pagination.pageIndex;
      const res = await getOrchestrationItems({
        page: page + 1,
        page_size: pagination.pageSize,
        ...formatFilters(filters),
      });

      const { data: nextData = [], total: nextTotal = 0 } = res || {};
      setData(nextData);
      setTotal(nextTotal);
      onTotalChange?.(nextTotal);
      try {
        if (notifyParent && typeof onReload === 'function') onReload();
      } catch (e) {
        // ignore
      }
    } catch (error) {
      setData([]);
      setTotal(0);
      onTotalChange?.(0);
      setTableError(true);
      // Show a generic inline message inside the table; avoid showing a network/toast error here
      setTableErrorMessage("Unable to load documents.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.pageIndex, pagination.pageSize, showToast, onReload]);

  const resetDeactivateModal = useCallback(() => {
    setDeactivateModalOpen(false);
    setSelectedActionItem(null);
  }, []);

  const handleToggleStatus = useCallback(
    async (item, options = {}) => {
      if (!item?.id) {
        return false;
      }

      const currentStatus = String(item?.status).toUpperCase();

      try {
        setActionItemId(item.id);
        const response = await toggleOrchestrationItemStatus({
          id: item.id,
          item_type: item?.document_type,
          deactivate_remarks: options?.deactivateRemarks,
        });

        showToast(
          currentStatus === "ACTIVE" ? "deactivate" : "success",
          currentStatus === "ACTIVE"
            ? "Document deactivated"
            : "Document activated successfully.",
          currentStatus === "ACTIVE" ? 1750 : 3500,
        );
        await fetchData(undefined, { notifyParent: true });
        return true;
      } catch (error) {
        showToast(
          "error",
          error?.message ||
            (currentStatus === "ACTIVE"
              ? "Failed to deactivate item."
              : "Failed to activate item."),
        );
        return false;
      } finally {
        setActionItemId(null);
      }
    },
    [fetchData, showToast],
  );

  const handleActionClick = useCallback(
    async (item) => {
      const status = String(item?.status).toUpperCase();

      if (status === "ACTIVE") {
          setSelectedActionItem(item);
          setDeactivateModalOpen(true);
        }
    },
    [handleToggleStatus],
  );


  const columns = useMemo(
    () => [
      {
        id: "sr_no",
        header: "ID Number",
        size: 120,
        meta: { isLeftSticky: true, left: 0 },
        cell: ({ row }) => {
          const type = String(row.original?.document_type || "");
          if (
            type === "FAQ" ||
            type === "Latest News & Announcements" ||
            type === "Latest News and Announcements"
          ) {
            return "—";
          }
          return row.original?.id;
        },
      },
      {
        accessorKey: "name",
        header: "Name",
        size: 220,
        meta: { isLeftSticky: true, left: 120 },
        cell: ({ getValue }) => {
          const v = getValue() ?? "";
          return <div className="truncate pl-2" title={v}>{v}</div>;
        },
      },

      {
        accessorKey: "document_type",
        header: "Type",
        size: 220,
        meta: { isLeftSticky: true, left: 340, isLastLeftSticky: true },
        cell: ({ getValue }) => {
          const typeValue = getDisplayTypeLabel(getValue());

          return (
            <span className={typeBadgeClass}>
              {typeIcon(getValue())}
              <span
                className="truncate"
                onMouseEnter={(event) => {
                  const element = event.currentTarget;
                  element.title =
                    element.scrollWidth > element.clientWidth ? typeValue : "";
                }}
              >
                {typeValue}
              </span>
            </span>
          );
        },
      },

      {
        accessorKey: "version",
        header: () => <div className="text-center">Version</div>,
        size: 160,
        cell: ({ getValue, row }) => {
          const type = String(row.original?.document_type || "").toLowerCase();
          const raw = getValue();
          const hasVersion =
            type !== "event" &&
            raw !== null &&
            raw !== undefined &&
            String(raw).trim() !== "";
          return <div className="text-center">{hasVersion ? raw : "-"}</div>;
        },
      },

      {
        accessorKey: "status",
        header: "Status",
        size: 140,
        cell: ({ getValue }) => (
          <span
            className={`${statusBadgeClass} ${statusStyles[String(getValue()).toUpperCase()] || "bg-[#f5f5f5] text-[#757575]"}`}
          >
            {capitalize(getValue())}
          </span>
        ),
      },

      {
        accessorKey: "updated_by",
        header: <span>Updated By <br /> (Staff ID)</span>,
        size: 200,
        cell: ({ row }) => {
          const parsed = parseUpdatedByValue(row.original?.updated_by);
          const name =
            parsed.name ||
            row.original?.updated_by_name ||
            row.original?.updated_by_username ||
            "—";
          const staffId =
            parsed.staffId ||
            row.original?.updated_by_staff_id ||
            row.original?.updated_by_staffId ||
            row.original?.staff_id ||
            "—";

          return (
            <div className="flex flex-col leading-[1.4] text-base text-[#1e1e1e]">
              <span className="truncate font-normal" title={name}>
                {name}
              </span>
              <span
                className="truncate font-normal"
                title={staffId !== "—" ? `(${staffId})` : undefined}
              >
                {staffId !== "—" ? `(${staffId})` : "—"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "updated_at",
        header: "Last Updated On",
        size: 200,
        cell: ({ getValue }) => formatDisplayDate(getValue()),
      },
      { accessorKey: "owner", header: <span>Owner <br/> (Vertical/Division/Deptt)</span>, size: 200 },
      {
        accessorKey: "next_review_date",
        header: "Next Review Date",
        size: 200,
        cell: ({ getValue }) => formatDisplayDate(getValue()),
      },
      {
        accessorKey: "deactivated_at",
        header: "Deactivated On",
        size: 200,
        cell: ({ getValue }) => formatDisplayDate(getValue()),
      },
      {
        accessorKey: "deactivated_by",
        header: "Deactivated By",
        size: 200,
        cell: ({ getValue }) => {
          const value = String(getValue() ?? "").trim();
          return value || "—";
        },
      },
      {
        id: "actions",
        header: "Actions",
        size: 260,
        meta: { isSticky: true },
        cell: ({ row }) => {
          const status = row.original.status;
          const buttonStyle = getActionButtonStyle(status);
          const normalizedStatus = String(status).toUpperCase();
          const isProcessing = actionItemId === row.original.id;

          return (
            <div className="flex items-center justify-center gap-2.5 whitespace-nowrap">
              <button
                type="button"
                onClick={normalizedStatus !== "INACTIVE" ? () => onEditClick?.(row.original) : undefined}
                disabled={normalizedStatus === "INACTIVE"}
                className={
                  normalizedStatus !== "INACTIVE"
                    ? secondaryActionButtonClass
                    : secondaryActionButtonDisabledClass
                }
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => onViewClick?.(row.original)}
                className={secondaryActionButtonClass}
              >
                View
              </button>

              <button
                type="button"
                onClick={normalizedStatus === "ACTIVE" ? () => handleActionClick(row.original) : undefined}
                disabled={normalizedStatus !== "ACTIVE" || isProcessing}
                className={`${buttonStyle.className} ${
                  isProcessing ? "opacity-60 cursor-wait" : ""
                }`}
              >
                {isProcessing ? "Working..." : buttonStyle.label}
              </button>
            </div>
          );
        },
      },
    ],
    [actionItemId, handleActionClick, onEditClick, onViewClick, pagination],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
    },
    pageCount: Math.ceil(total / pagination.pageSize),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    onPaginationChange: setPagination,
  });
  const visibleColumnCount =
    table.getVisibleFlatColumns().length || columns.length;

  useEffect(() => {
    updateTableScrollState();

    const el = tableScrollRef.current;
    if (!el) return undefined;

    const resizeObserver = new ResizeObserver(updateTableScrollState);
    resizeObserver.observe(el);
    window.addEventListener("resize", updateTableScrollState);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateTableScrollState);
    };
  }, [updateTableScrollState, data, isLoading, visibleColumnCount]);

  // Single effect: detects filter changes via deep/serialized comparison so
  // effectivePageIndex is always correct in the same tick — no stale pageIndex
  // is sent to the API. This avoids resetting the page when the parent passes a
  // new-but-equal filters object reference.
  useEffect(() => {
    const safeStringify = (obj) => {
      try {
        return JSON.stringify(obj);
      } catch {
        return String(obj);
      }
    };

    const prevFiltersSerialized = filtersRef.current?.currentSerialized ?? null;
    const currentFiltersSerialized = safeStringify(filters);
    const filtersChanged = prevFiltersSerialized !== null && prevFiltersSerialized !== currentFiltersSerialized;

    // Detect refreshKey changes (page-level refresh requested)
    const prevRefresh = prevRefreshKeyRef.current;
    const refreshChanged = prevRefresh !== refreshKey;
    if (refreshChanged) {
      // update ref immediately so subsequent runs don't re-detect same refresh
      prevRefreshKeyRef.current = refreshKey;

      // Reset internal UI state to default so the table reinitializes
      setData([]);
      setTotal(0);
      setTableError(false);
      setTableErrorMessage("");
      setActionItemId(null);
      setDeactivateModalOpen(false);
      setSelectedActionItem(null);
      // Do NOT reset the toast here — a success/warning toast from a just-completed
      // action (e.g. deactivation) should remain visible until its own timer expires.

      // Reset serialized filters so the comparison logic treats this as a fresh state
      filtersRef.current = { currentSerialized: null };

      // If we're not on first page, reset pagination and let the pagination change trigger fetch
      if (pagination.pageIndex !== 0) {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        return;
      }
      // otherwise continue to fetch below
    }

    // Persist current serialized filters for next comparison
    filtersRef.current.currentSerialized = currentFiltersSerialized;

    // When filters changed and we're not on page 0, reset pagination and bail.
    // The setPagination re-render will trigger this effect again with pageIndex=0,
    // making exactly ONE API call with the correct offset.
    if (filtersChanged && pagination.pageIndex !== 0) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      return;
    }

    const effectivePageIndex = filtersChanged ? 0 : pagination.pageIndex;

    let cancelled = false;

    const doFetch = async () => {
      try {
        setIsLoading(true);
        setTableError(false);
        setTableErrorMessage("");
        const res = await getOrchestrationItems({
          page: effectivePageIndex + 1,
          page_size: pagination.pageSize,
          ...formatFilters(filters),
        });
        if (cancelled) return;
        const { data: nextData = [], total: nextTotal = 0 } = res || {};
        setData(nextData);
        setTotal(nextTotal);
        onTotalChange?.(nextTotal);
        setTableError(false);
        setTableErrorMessage("");

        // If we were requested to notify parent (via onReload in fetchData) it will be handled there
      } catch (err) {
        if (cancelled) return;
        setData([]);
        setTotal(0);
        onTotalChange?.(0);
        setTableError(true);
        // Generic inline error message (do not surface a global/network toast here)
        setTableErrorMessage("Unable to load documents.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    doFetch();

    return () => { cancelled = true; };
  }, [filters, pagination.pageIndex, pagination.pageSize, refreshKey]);


  return (
    <>
      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        duration={toast.duration}
        onClose={closeToast}
      />
      <DeactivateModal
        isOpen={deactivateModalOpen}
        onClose={resetDeactivateModal}
        item={selectedActionItem}
        onConfirm={async (remark) => {
          const success = await handleToggleStatus(selectedActionItem, { deactivateRemarks: remark });
          if (success) {
            resetDeactivateModal();
          }
          return success;
        }}
        isProcessing={Boolean(actionItemId)}
      />
      <div className="pt-2 bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] w-full overflow-hidden font-sans">
        {/* Scroll Wrapper */}
        <div className="relative w-full overflow-hidden">
          {tableScrollState.left && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-[25] w-6 bg-gradient-to-r from-black/[0.04] to-transparent"
            />
          )}
          <div
            ref={tableScrollRef}
            onScroll={updateTableScrollState}
            className="w-full overflow-x-auto"
          >
          <table className="w-full table-fixed border-separate border-spacing-0">
            <thead className="bg-[#f5f5f5] border-t border-[#d9d9d9]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => {
                    const meta = header.column.columnDef.meta || {};

                    return (
                      <th
                        key={header.id}
                        className={`${tableHeaderClass} ${getColumnAlignmentClass(index)} ${getStickyColumnClass(meta, "header", { scrollable: tableScrollState.scrollable })}`}
                        style={getColumnWidthStyle(header.getSize(), meta)}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={visibleColumnCount}
                    className="px-6 py-10 text-center border-b border-[#d9d9d9]"
                  >
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex flex-col items-center justify-center gap-2"
                    >
                      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#2563eb]" />
                      <span className="text-base text-[#757575]">Loading...</span>
                    </div>
                  </td>
                </tr>
             ) : tableError ? (
               <tr>
                 <td colSpan={visibleColumnCount} className="px-6 py-10 border-b border-[#d9d9d9]">
                   <div className="flex flex-col items-center justify-center gap-3">
                     <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                       {tableErrorMessage || "Unable to load documents."}
                     </div>
                     <button
                       type="button"
                       onClick={async () => { setTableError(false); setTableErrorMessage(""); await fetchData(undefined, { notifyParent: true }); }}
                       className="text-sm font-medium text-blue-600 hover:underline"
                     >
                       Retry
                     </button>
                   </div>
                 </td>
               </tr>
             ) : table.getRowModel().rows.length > 0 ? (
               table.getRowModel().rows.map((row) => (
                 <tr key={row.id} className="group hover:bg-[#fafafa] h-[68px]">
                   {row.getVisibleCells().map((cell, index) => {
                     const meta = cell.column.columnDef.meta || {};

                     return (
                       <td
                         key={cell.id}
                         className={`${tableCellClass} ${getColumnAlignmentClass(index)} ${getStickyColumnClass(meta, "body", { scrollable: tableScrollState.scrollable })}`}
                         style={getColumnWidthStyle(cell.column.getSize(), meta)}
                       >
                         {flexRender(cell.column.columnDef.cell, cell.getContext())}
                       </td>
                     );
                   })}
                 </tr>
               ))
             ) : (
               <tr>
                 <td
                   colSpan={visibleColumnCount}
                   className="px-6 py-10 text-center text-base text-[#757575] border-b border-[#d9d9d9]"
                 >
                   No records found.
                 </td>
               </tr>
             )}
           </tbody>
          </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center shrink-0 border-t px-4 py-4">
          <Pagination
            currentPage={table.getState().pagination.pageIndex + 1}
            totalPages={table.getPageCount()}
            onPageChange={(page) => table.setPageIndex(page - 1)}
          />
        </div>
      </div>
    </>
  );
}
