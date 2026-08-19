import { useCallback, useEffect, useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Download, Filter, Pencil, Upload } from "lucide-react";
import moment from "moment";
import * as XLSX from "xlsx";
import Loader from "@/atoms/loader";

import AnnualDeclarationAddModal, {
  rowToAnnualDeclarationFormValues,
} from "@/components/orchestration/annual-declaration/AnnualDeclarationAddModal";
import AnnualDeclarationFilterModal from "@/components/orchestration/annual-declaration/AnnualDeclarationFilterModal";
import CenterToast from "@/components/shared/CenterToast";
import { Pagination } from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/shared/Tooltip";
import { DATE_FORMAT_MOMENT } from "@/config";
import { cn } from "@/lib/utils";
import { stripR5_18 } from "./annualDeclarationUtils";
import {
  downloadAnnualDeclarationStatusFile,
  downloadAnnualDeclarationTemplate,
  getAnnualDeclarationTypes,
  getAnnualDeclarations,
  uploadAnnualDeclarationFile,
} from "@/api/annualDeclarationApi";

const PAGE_SIZE = 10;
const PENDING_COUNT_WIDTH = 140;
const DETAILED_STATUS_WIDTH = 160;
const EDIT_WIDTH = 72;

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-base font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/10 px-6 py-3 text-base font-semibold leading-[1.4] text-[#2563eb] transition-colors hover:bg-blue-600/15";

const tableHeaderClass =
  "h-[68px] whitespace-nowrap border-b border-[#d9d9d9] bg-[#f5f5f5] px-3 py-3 text-center text-base font-medium text-black";

const tableCellClass =
  "h-[68px] whitespace-nowrap border-b border-[#d9d9d9] px-3 py-3 text-center text-base font-normal text-[#1e1e1e]";

const toFriendlyErrorMessage = (error, fallback) => {
  const raw = String(error?.message || "").trim();
  if (!raw || /^network error$/i.test(raw)) {
    return fallback;
  }
  return raw;
};

const formatApiDateOnly = (value) => {
  if (!value) return "";
  const parsed = moment(value, [moment.ISO_8601, "YYYY-MM-DD", DATE_FORMAT_MOMENT], true);
  const fallback = parsed.isValid() ? parsed : moment(value);
  return fallback.isValid() ? fallback.format(DATE_FORMAT_MOMENT).toUpperCase() : value;
};

const formatApiDateTime = (value) => {
  if (!value) return "—";
  const parsed = moment(value, [moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", DATE_FORMAT_MOMENT], true);
  const fallback = parsed.isValid() ? parsed : moment(value);
  return fallback.isValid() ? fallback.format(`${DATE_FORMAT_MOMENT} hh:mm:ss A`).toUpperCase() : value;
};

const formatAdSerial = (referenceId) => {
  const raw = String(referenceId ?? "").trim();
  if (!raw) return "—";
  if (/^AD-/i.test(raw)) return `AD-${raw.replace(/^AD-/i, "")}`;
  return `AD-${raw}`;
};

/** <Activity>_<YYYYMMDDHHMM>_Status.xlsx */
const sanitizeActivityFilePart = (value) => {
  const cleaned = String(value || "")
    .trim()
    .replace(/[/\\]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "Annual_Declaration";
};

const buildActivityStatusFileName = (activityName) =>
  `${sanitizeActivityFilePart(activityName)}_${moment().format("YYYYMMDDHHmm")}_Status.xlsx`;

const getFileNameFromDisposition = (disposition, fallback) => {
  const raw = String(disposition || "");
  const fileNameMatch = raw.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/);
  return fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : fallback;
};

const triggerBlobDownload = (blob, fileName) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
};

const getPendingStatus = (item) => {
  const pending = item?.pending_count ?? item?.pending ?? item?.completedStatus?.split?.("/")?.[0];
  const total = item?.total_count ?? item?.total ?? item?.completedStatus?.split?.("/")?.[1];
  if (pending != null && total != null) return `${pending}/${total}`;
  if (typeof item?.pendingStatus === "string" && item.pendingStatus.trim()) return item.pendingStatus;
  return "0/0";
};

const mapAnnualDeclarationItem = (item) => {
  const referenceId =
    item?.reference_id ??
    item?.referenceId ??
    item?.declaration_id ??
    item?.declarationId ??
    item?.id ??
    "";

  return {
    declarationId: referenceId || null,
    referenceId: referenceId || "",
    id: formatAdSerial(referenceId),
    declarationName: stripR5_18(
      item?.declaration_name ?? item?.declarationName ?? "—",
    ),
    financialYear: item?.financial_year ?? item?.financialYear ?? "—",
    assignedDate: formatApiDateOnly(item?.assigned_date ?? item?.assignedDate),
    dueDate: formatApiDateOnly(item?.due_date ?? item?.dueDate),
    activityClosureDate: formatApiDateOnly(
      item?.activity_closure_date ?? item?.activityClosureDate ?? item?.closureDate,
    ),
    updatedBy: item?.updated_by ?? item?.updatedBy ?? "—",
    lastUpdatedOn: formatApiDateTime(
      item?.last_updated_at ??
        item?.lastUpdatedAt ??
        item?.last_updated_on ??
        item?.lastUpdatedOn,
    ),
    status: item?.status ?? "",
    pendingStatus: getPendingStatus(item),
  };
};

const getCurrentAndNextFinancialYearOptions = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const currentFYStart = month >= 4 ? year : year - 1;
  const toFYLabel = (start) => `${start}-${String(start + 1).slice(-2)}`;
  return [toFYLabel(currentFYStart), toFYLabel(currentFYStart + 1)];
};

const getColumnWidthStyle = (size, meta = {}) => ({
  width: size,
  minWidth: size,
  ...(meta?.isSticky ? { maxWidth: size, right: meta.right ?? 0 } : {}),
});

const getStickyColumnClass = (meta = {}, variant = "body") => {
  if (!meta?.isSticky) return "";
  const headerBg = variant === "header" ? "bg-[#f5f5f5]" : "bg-white group-hover:bg-[#fafafa]";
  const zIndex = variant === "header" ? "z-30" : "z-20";
  return `sticky ${headerBg} ${zIndex}`;
};

function PendingStatusCell({ value }) {
  const [pending, total] = String(value ?? "").split("/");
  if (!pending && !total) return "—";
  return (
    <span className="text-base font-normal leading-normal text-[#1e1e1e]">
      <span>{pending}</span>
      <span>/</span>
      <span className="text-[rgba(30,30,30,0.5)]">{total}</span>
    </span>
  );
}

function DetailedStatusCell({ row, onDownloadFile, onUploadFile, isDownloading, isUploading }) {
  const handleUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        await onUploadFile?.(row.original, file);
      }
    };
    input.click();
  };

  return (
    <div className="flex items-center justify-center gap-2.5 text-[#1e1e1e]">
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Download Status"
              onClick={() => onDownloadFile?.(row.original)}
              disabled={isDownloading}
              className="inline-flex size-[28.8px] items-center justify-center rounded-md transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
            >
              <Download className="size-6" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-black text-white">Download Status</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Upload declaration status"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="inline-flex size-[28.8px] items-center justify-center rounded-md transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
            >
              <Upload className="size-6" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Upload Status</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default function AnnualDeclarationTable() {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [tableError, setTableError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingRow, setEditingRow] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [declarationTypeOptions, setDeclarationTypeOptions] = useState([]);
  const [uploadingDeclarationId, setUploadingDeclarationId] = useState(null);
  const [downloadingDeclarationId, setDownloadingDeclarationId] = useState(null);
  const [toast, setToast] = useState({
    open: false,
    variant: "success",
    message: "",
  });
  const [filters, setFilters] = useState({
    declarationName: "",
    financialYear: "",
    dueDate: "",
    assignedDate: "",
    closureDate: "",
  });

  const showToast = useCallback((variant, message) => {
    setToast({ open: true, variant, message });
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (String(filters.declarationName || "").trim()) count += 1;
    if (String(filters.financialYear || "").trim()) count += 1;
    if (filters.dueDate) count += 1;
    if (filters.assignedDate) count += 1;
    if (filters.closureDate) count += 1;
    return count;
  }, [filters]);

  const declarationNameOptions = useMemo(() => {
    const fromRows = rows.map((row) => row.declarationName).filter(Boolean);
    const merged = [...declarationTypeOptions, ...fromRows];
    return Array.from(new Set(merged.map((v) => stripR5_18(v)).filter(Boolean)));
  }, [rows, declarationTypeOptions]);

  const financialYearOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...getCurrentAndNextFinancialYearOptions(),
          ...rows.map((row) => row.financialYear).filter(Boolean),
        ]),
      )
        .sort()
        .reverse(),
    [rows],
  );

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    const loadTypes = async () => {
      try {
        const types = await getAnnualDeclarationTypes();
        if (!cancelled && Array.isArray(types)) {
          setDeclarationTypeOptions(types.filter(Boolean));
        }
      } catch (error) {
        // Rows can still populate the options, so don't block the table.
        console.warn("Unable to load annual declaration types:", error?.message || error);
      }
    };
    loadTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAnnualDeclarations = async () => {
      setIsLoading(true);
      setTableError("");
      try {
        const res = await getAnnualDeclarations({
          declarationName: filters.declarationName,
          financialYear: filters.financialYear,
          dueDate: filters.dueDate,
          assignedDate: filters.assignedDate,
          closureDate: filters.closureDate,
          page: currentPage,
          page_size: PAGE_SIZE,
        });

        if (cancelled) return;

        const items = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res?.data)
              ? res.data
              : [];
        const nextTotal =
          typeof res?.total === "number"
            ? res.total
            : typeof res?.count === "number"
              ? res.count
              : typeof res?.total_records === "number"
                ? res.total_records
                : items.length;

        setRows(items.map((item) => mapAnnualDeclarationItem(item)));
        setTotalRows(nextTotal);
      } catch (error) {
        if (cancelled) return;
        setRows([]);
        setTotalRows(0);
        setTableError(
          toFriendlyErrorMessage(
            error,
            "Unable to load annual declarations. Please try again.",
          ),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAnnualDeclarations();
    return () => {
      cancelled = true;
    };
  }, [currentPage, filters, refreshKey]);

  const handleExport = useCallback(async () => {
    if (totalRows === 0) {
      showToast("error", "Nothing to export");
      return;
    }

    setIsExporting(true);
    try {
      // Build Excel on the client so "Updated By" and "Last Updated On"
      // are guaranteed to be visible per user story.
      const pageSize = 100;
      const expectedTotal = totalRows;
      const exported = [];
      let page = 1;

      while (exported.length < expectedTotal) {
        const res = await getAnnualDeclarations({
          declarationName: filters.declarationName,
          financialYear: filters.financialYear,
          dueDate: filters.dueDate,
          assignedDate: filters.assignedDate,
          closureDate: filters.closureDate,
          page,
          page_size: pageSize,
        });

        const items = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res?.data)
              ? res.data
              : [];

        if (!items.length) break;
        exported.push(...items.map((item) => mapAnnualDeclarationItem(item)));
        page += 1;
      }

      const headers = [
        "ID Number",
        "Declaration Name",
        "Financial Year",
        "Assigned Date",
        "Due Date",
        "Activity Closure Date",
        "Updated By",
        "Last Updated On",
        "Pending Count",
      ];

      const sheetData = [
        headers,
        ...exported.map((row) => [
          row.id,
          row.declarationName,
          row.financialYear,
          row.assignedDate,
          row.dueDate,
          row.activityClosureDate,
          row.updatedBy,
          row.lastUpdatedOn,
          row.pendingStatus,
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Annual Declarations");

      XLSX.writeFile(
        workbook,
        `Annual_Declarations_Export_${moment().format("YYYY-MM-DD")}.xlsx`,
      );
      showToast("success", "Export downloaded successfully.");
    } catch (error) {
      showToast(
        "error",
        toFriendlyErrorMessage(error, "Export failed. Please try again."),
      );
    } finally {
      setIsExporting(false);
    }
  }, [filters, showToast, totalRows]);

  const handleOpenAdd = () => {
    setEditingRow(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = useCallback((row) => {
    setEditingRow(row);
    setIsAddModalOpen(true);
  }, []);

  const handleModalOpenChange = (open) => {
    setIsAddModalOpen(open);
    if (!open) setEditingRow(null);
  };

  const handleDownloadTemplate = useCallback(async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await downloadAnnualDeclarationTemplate();
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
      const fileName = getFileNameFromDisposition(
        response.headers?.["content-disposition"],
        "Annual_Declaration_Template.xlsx",
      );
      triggerBlobDownload(blob, fileName);
      showToast("success", "Template downloaded successfully.");
    } catch (error) {
      showToast(
        "error",
        toFriendlyErrorMessage(error, "Failed to download template."),
      );
    } finally {
      setIsDownloadingTemplate(false);
    }
  }, [showToast]);

  const handleDownloadDeclarationStatus = useCallback(
    async (row) => {
      const declarationId = row?.declarationId ?? row?.referenceId;
      if (!declarationId) return;

      setDownloadingDeclarationId(declarationId);
      try {
        const response = await downloadAnnualDeclarationStatusFile(declarationId);
        const blob =
          response.data instanceof Blob
            ? response.data
            : new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              });
        const fallbackName = buildActivityStatusFileName(
          stripR5_18(
            row?.declarationName || row?.declaration_name || declarationId,
          ),
        );
        const fileName = getFileNameFromDisposition(
          response.headers?.["content-disposition"],
          fallbackName,
        );
        triggerBlobDownload(blob, fileName);
        showToast("success", "Declaration status downloaded successfully.");
      } catch (error) {
        showToast(
          "error",
          toFriendlyErrorMessage(error, "Failed to download declaration status."),
        );
      } finally {
        setDownloadingDeclarationId(null);
      }
    },
    [showToast],
  );

  const handleUploadDeclarationFile = useCallback(
    async (row, file) => {
      const declarationId = row?.declarationId ?? row?.id;
      if (!declarationId || !file) return;

      setUploadingDeclarationId(declarationId);
      try {
        await uploadAnnualDeclarationFile(declarationId, file);
        setRefreshKey((key) => key + 1);
        showToast("success", "Declaration file uploaded successfully.");
      } catch (error) {
        showToast(
          "error",
          toFriendlyErrorMessage(error, "Failed to upload declaration file."),
        );
      } finally {
        setUploadingDeclarationId(null);
      }
    },
    [showToast],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID Number",
        size: 110,
        cell: ({ row }) => row.original.id,
      },
      {
        accessorKey: "declarationName",
        header: "Declaration Name",
        size: 220,
        meta: { align: "left" },
      },
      {
        accessorKey: "financialYear",
        header: "Financial Year",
        size: 150,
      },
      {
        accessorKey: "assignedDate",
        header: "Assigned Date",
        size: 150,
      },
      {
        accessorKey: "dueDate",
        header: "Due Date",
        size: 140,
      },
      {
        accessorKey: "activityClosureDate",
        header: () => (
          <span className="inline-block leading-normal">
            Activity
            <br />
            Closure Date
          </span>
        ),
        size: 150,
      },
      {
        accessorKey: "updatedBy",
        header: "Updated By",
        size: 160,
      },
      {
        accessorKey: "lastUpdatedOn",
        header: "Last Updated On",
        size: 200,
      },
      {
        accessorKey: "pendingStatus",
        header: "Pending Count",
        size: PENDING_COUNT_WIDTH,
        meta: {
          isSticky: true,
          right: DETAILED_STATUS_WIDTH + EDIT_WIDTH,
          align: "center",
        },
        cell: ({ getValue }) => <PendingStatusCell value={getValue()} />,
      },
      {
        id: "detailedStatus",
        header: "Detailed Status",
        size: DETAILED_STATUS_WIDTH,
        meta: {
          isSticky: true,
          right: EDIT_WIDTH,
          align: "center",
        },
        cell: ({ row }) => (
          <DetailedStatusCell
            row={row}
            onDownloadFile={handleDownloadDeclarationStatus}
            onUploadFile={handleUploadDeclarationFile}
            isDownloading={
              downloadingDeclarationId ===
              (row.original?.declarationId ?? row.original?.id)
            }
            isUploading={
              uploadingDeclarationId ===
              (row.original?.declarationId ?? row.original?.id)
            }
          />
        ),
      },
      {
        id: "edit",
        header: "Edit",
        size: EDIT_WIDTH,
        meta: {
          isSticky: true,
          right: 0,
          align: "center",
        },
        cell: ({ row }) => (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Edit annual declaration"
                  onClick={() => handleOpenEdit(row.original)}
                  className="inline-flex size-7 items-center justify-center text-[#1e1e1e] transition hover:opacity-80"
                >
                  <Pencil className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
    ],
    [
      handleDownloadDeclarationStatus,
      handleUploadDeclarationFile,
      handleOpenEdit,
      downloadingDeclarationId,
      uploadingDeclarationId,
    ],
  );

  const tableMinWidth = useMemo(
    () => columns.reduce((sum, column) => sum + (column.size || 150), 0),
    [columns],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleAddDeclaration = ({ isEdit, response } = {}) => {
    setCurrentPage(1);
    setRefreshKey((key) => key + 1);
    setIsAddModalOpen(false);
    setEditingRow(null);

    const message =
      response?.message ||
      response?.Message ||
      (isEdit
        ? "Annual declaration updated successfully."
        : "Annual declaration created successfully.");
    showToast("success", message);
  };

  const handleAddDeclarationError = (error) => {
    showToast(
      "error",
      toFriendlyErrorMessage(
        error,
        error?.response?.data?.detail || "Operation failed. Please try again.",
      ),
    );
  };

  return (
    <>
      <div className="mt-4 flex min-w-0 max-w-full flex-col gap-4 font-sans">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 overflow-visible">
          <button
            type="button"
            onClick={handleOpenAdd}
            className={primaryButtonClass}
          >
            <img
              src="/assets/icons/orch/calendar-plus.svg"
              alt=""
              className="h-6 w-6 shrink-0"
            />
            Add Annual Declaration
          </button>

          {/* pr/pt keep the filter count badge inside the scroll area (overflow-x-hidden clips overhang) */}
          <div className="flex items-center gap-3 overflow-visible pr-3 pt-1">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className={cn(
                secondaryButtonClass,
                isDownloadingTemplate && "cursor-not-allowed opacity-60",
              )}
            >
              <Download size={16} className="shrink-0" />
              {isDownloadingTemplate ? "Downloading…" : "Download Template"}
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              aria-disabled={isExporting || totalRows === 0}
              className={cn(
                secondaryButtonClass,
                (isExporting || totalRows === 0) && "cursor-not-allowed opacity-60",
              )}
            >
              <Download size={16} className="shrink-0" />
              {isExporting ? "Exporting…" : "Export"}
            </button>

            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className={`${secondaryButtonClass} relative flex items-center gap-2`}
            >
              <Filter size={16} className="shrink-0" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="absolute -top-2 right-0 z-10 inline-flex h-[18px] min-w-[18px] translate-x-1/2 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <div className="flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl bg-white pt-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="w-full min-w-0 overflow-x-auto">
            <table
              className="w-full border-separate border-spacing-0"
              style={{ minWidth: tableMinWidth }}
            >
              <thead className="border-t border-[#d9d9d9] bg-[#f5f5f5]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta || {};
                      const alignLeft = meta.align === "left";
                      return (
                        <th
                          key={header.id}
                          className={cn(
                            tableHeaderClass,
                            alignLeft && "pl-5 text-left",
                            getStickyColumnClass(meta, "header"),
                          )}
                          style={getColumnWidthStyle(header.getSize(), meta)}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
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
                      colSpan={columns.length}
                      className="border-b border-[#d9d9d9] px-5 py-10 text-center text-base text-[#757575]"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Loader />
                        <span>Loading annual declarations...</span>
                      </div>
                    </td>
                  </tr>
                ) : tableError ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="border-b border-[#d9d9d9] px-5 py-10 text-center text-base text-[#757575]"
                    >
                      {tableError}
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="border-b border-[#d9d9d9] px-5 py-10 text-center text-base text-[#757575]"
                    >
                      No annual declarations found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="group h-[68px] hover:bg-[#fafafa]">
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta || {};
                        const alignLeft = meta.align === "left";
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              tableCellClass,
                              alignLeft && "pl-5 text-left",
                              getStickyColumnClass(meta, "body"),
                            )}
                            style={getColumnWidthStyle(cell.column.getSize(), meta)}
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
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center px-5 py-5">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      <AnnualDeclarationAddModal
        open={isAddModalOpen}
        onOpenChange={handleModalOpenChange}
        onSubmit={handleAddDeclaration}
        onError={handleAddDeclarationError}
        financialYearOptions={financialYearOptions}
        declarationNameOptions={declarationNameOptions}
        declarationId={editingRow?.declarationId ?? null}
        initialValues={
          editingRow ? rowToAnnualDeclarationFormValues(editingRow) : null
        }
      />

      <AnnualDeclarationFilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        currentFilters={filters}
        onApply={(nextFilters) => {
          setCurrentPage(1);
          setFilters(nextFilters);
        }}
        declarationNameOptions={declarationNameOptions}
        financialYearOptions={financialYearOptions}
        isLoading={isLoading}
      />

      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />
    </>
  );
}
