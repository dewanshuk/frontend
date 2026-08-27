import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { FileSpreadsheet, Link as LinkIcon, Pencil, UploadCloud, X } from "lucide-react";
import moment from "moment";
import { downloadTrainingFile, downloadTrainingTemplate, getTrainings, uploadTrainingData } from "../../api/trainingApi";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/shared/Tooltip";
import { cn } from "@/lib/utils";
import { DATE_FORMAT_MOMENT } from "@/config";

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = moment(value);
  return parsed.isValid()
    ? parsed.format(`${DATE_FORMAT_MOMENT} hh:mm A`).toUpperCase()
    : value;
};

const formatApiDateOnly = (dateStr) => {
  if (!dateStr) return "";
  const parsed = moment(
    dateStr,
    [moment.ISO_8601, "YYYY-MM-DD", DATE_FORMAT_MOMENT],
    true,
  );
  const fallback = parsed.isValid() ? parsed : moment(dateStr);
  return fallback.isValid()
    ? fallback.format(DATE_FORMAT_MOMENT).toUpperCase()
    : dateStr;
};

function formatUpdatedBy(value) {
  if (!value || value === "-") return "-";
  const match = String(value).match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!match) return value;
  return (
    <span className="block leading-normal">
      <span className="block">{match[1]}</span>
      <span className="block">({match[2]})</span>
    </span>
  );
}

const getColumnWidthStyle = (size, meta = {}) => ({
  width: size,
  minWidth: size,
  ...(meta?.isLeftSticky || meta?.isSticky ? { maxWidth: size } : {}),
  ...(meta?.isLeftSticky ? { left: meta.left } : {}),
});

const getColumnAlignmentClass = (meta = {}) =>
  meta?.align === "center" ? "text-center" : "text-left";

const getStickyColumnClass = (meta = {}, variant = "body") => {
  const headerBg = variant === "header" ? "bg-[#f5f5f5]" : "bg-white group-hover:bg-gray-50";
  const zIndex = variant === "header" ? "z-30" : "z-20";

  if (meta?.isSticky) {
    // Combined shadow: left edge depth + bottom row divider (single utility so twMerge keeps it)
    return `sticky right-0 ${headerBg} ${zIndex} shadow-[-8px_0_16px_rgba(0,0,0,0.08),inset_0_-1px_0_0_#e5e7eb]`;
  }

  if (meta?.isLeftSticky) {
    const shadow = false
      ? "shadow-[8px_0_24px_rgba(0,0,0,0.08),inset_0_-1px_0_0_#e5e7eb]"
      : "shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12),inset_0_-1px_0_0_#e5e7eb]";
    return `sticky ${headerBg} ${zIndex} ${shadow}`;
  }

  return "";
};

function UploadDataDialog({ open, onOpenChange, onUpload, isUploading }) {
  const dropRef = useRef(null);
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetFile = () => setFile(null);

  const handleClose = () => { resetFile(); onOpenChange(false); };

  const handleFileSelect = (selected) => { if (selected) setFile(selected); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleSubmit = async () => {
    if (!file) return;
    await onUpload(file);
    resetFile();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Data</DialogTitle>
        </DialogHeader>

        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
          }`}
        >
          <UploadCloud className="h-10 w-10 text-blue-400" />
          {file ? (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="max-w-[260px] truncate">{file.name}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-slate-200"
                onClick={(e) => { e.stopPropagation(); resetFile(); }}
                aria-label="Remove file"
              >
                <X className="h-3 w-3 text-slate-500" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">
                Drag &amp; drop or <span className="text-blue-600 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400">Supports .xlsx, .xls, .csv</p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { handleFileSelect(e.target.files?.[0]); e.target.value = ""; }}
        />

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>Cancel</Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleSubmit}
            disabled={!file || isUploading}
          >
            {isUploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrchestrationTrainingTable({
  filters = {},
  refreshKey = 0,
  showToast,
  onEdit,
  onResetFilters,
  onTotalChange,
}) {
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [data, setData] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);
  const normalizedFilters = useMemo(
    () =>
      Object.entries(filters || {}).reduce((acc, [key, value]) => {
        if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
          return acc;
        }

        acc[key] = value;
        return acc;
      }, {}),
    [filters],
  );
  // null on first render; the effect treats null as "no previous filters" (not a change)
  const filtersRef = useRef(null);


  const triggerUploadPicker = (trainingId) => {
    setSelectedTrainingId(trainingId);
    setUploadDialogOpen(true);
  };

  const handleDialogUpload = async (file) => {
    if (!file || !selectedTrainingId) return;
    setIsUploading(true);
    try {
      const response = await uploadTrainingData(selectedTrainingId, file);
      setUploadDialogOpen(false);
      showToast?.("success", response?.message || "Training data uploaded successfully.");
      setInternalRefreshKey((k) => k + 1);
    } catch (error) {
      showToast?.("error", error?.message || "Failed to upload training data.");
    } finally {
      setIsUploading(false);
      setSelectedTrainingId(null);
    }
  };

  const handleTrainingFileDownload = async (trainingId) => {
    try {
      const response = await downloadTrainingFile(trainingId);
      const blobUrl = window.URL.createObjectURL(response.data);
      const disposition = response.headers?.["content-disposition"] || "";
      const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/);
      const fileName = fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : `${trainingId}_training_data.xlsx`;
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      showToast?.("success", "Training file downloaded successfully.");
    } catch (error) {
      showToast?.("error", error?.message || "Failed to download training file.");
    }
  };

  const handleTemplateDownload = async () => {
    try {
      const response = await downloadTrainingTemplate();
      const blobUrl = window.URL.createObjectURL(response.data);
      const disposition = response.headers?.["content-disposition"] || "";
      const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/);
      const fileName = fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : "training_template.xlsx";
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      showToast?.("success", "Template downloaded successfully.");
    } catch (error) {
      showToast?.("error", error?.message || "Failed to download template.");
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "serial_number",
        header: "ID Number",
        size: 130,
        meta: { isLeftSticky: true, left: 0, align: "center" },
        cell: ({ row }) => {
          const id = row.original.training_id;
          return <span>{id ?? "—"}</span>;
        },
      },
      {
        accessorKey: "training_name",
        header: "Training Name",
        size: 200,
        meta: { isLeftSticky: true, left: 130, align: "left" },
        cell: ({ getValue }) => {
          const name = getValue() || "";
          return (
            <div className="max-w-[200px] truncate" title={name}>
              {name}
            </div>
          );
        },
      },
      {
        accessorKey: "financial_year",
        header: "Financial Year",
        size: 170,
        meta: { isLeftSticky: true, left: 330, isLastLeftSticky: true, align: "center" },
      },
      {
        accessorKey: "training_assigned_date",
        header: () => (
          <span className="block leading-normal">
            Training Assigned
            <br />
            Date
          </span>
        ),
        size: 180,
        meta: { align: "center", wrapHeader: true },
      },
      {
        accessorKey: "training_due_date",
        header: () => (
          <span className="block leading-normal">
            Training Due
            <br />
            Date
          </span>
        ),
        size: 180,
        meta: { align: "center", wrapHeader: true },
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorKey: "activity_closure_date",
        header: () => (
          <span className="block leading-normal">
            Activity
            <br />
            Closure Date
          </span>
        ),
        size: 180,
        meta: { align: "center", wrapHeader: true },
        cell: ({ getValue }) => getValue() || "-",
      },
      {
        accessorKey: "updated_by",
        header: "Updated By",
        size: 164,
        meta: { align: "center" },
        cell: ({ getValue }) => formatUpdatedBy(getValue() || "-"),
      },
      {
        accessorKey: "last_updated_on",
        header: () => (
          <span className="block leading-normal">
            Last Updated
            <br />
            On
          </span>
        ),
        size: 202,
        meta: { align: "center", wrapHeader: true },
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{formatDateTime(getValue())}</span>
        ),
      },
      {
        accessorKey: "last_uploaded_file",
        header: () => (
          <span className="block leading-normal">
            Last Uploaded
            <br />
            Data
          </span>
        ),
        size: 178,
        meta: { align: "center", wrapHeader: true },
        cell: ({ row }) => (
          <button
            type="button"
            className="inline-flex items-center justify-center p-0.5 hover:opacity-80"
            onClick={() => handleTrainingFileDownload(row.original.training_id)}
            aria-label="Download uploaded data"
          >
            <img src="/icons/excelIcon.png" alt="" className="size-6" />
          </button>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        size: 164,
        meta: { align: "center" },
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-2.5">
            {onEdit ? (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-7 items-center justify-center text-[#1e1e1e] hover:opacity-80"
                      onClick={() => onEdit(row.original)}
                      aria-label="Edit training"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black text-white">Edit</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}

            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center hover:opacity-80"
                    onClick={() => triggerUploadPicker(row.original.training_id)}
                    aria-label="Upload data"
                  >
                    <img src="/assets/icons/orch/training-action-upload.svg" alt="" className="size-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white">Upload Data</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center hover:opacity-80"
                    onClick={handleTemplateDownload}
                    aria-label="Download template"
                  >
                    <img src="/assets/icons/orch/training-action-download.svg" alt="" className="size-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white">Download Template</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
      {
        accessorKey: "training_link",
        header: "Training Link",
        size: 174,
        meta: { isSticky: true, align: "center" },
        cell: ({ getValue }) => {
          const url = getValue();

          if (!url) {
            return <span className="text-gray-400">-</span>;
          }

          return (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 text-[#2563eb] underline hover:opacity-90"
            >
              <LinkIcon className="h-4 w-4" />
              Link
            </a>
          );
        },
      },
    ],
    [handleTrainingFileDownload, triggerUploadPicker, handleTemplateDownload, onEdit],
  );

  const tableMinWidth = useMemo(
    () => columns.reduce((sum, column) => sum + (column.size || 150), 0),
    [columns],
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

  // Single effect handles both filter changes and page changes.
  // Using a ref to detect filter changes so the offset is always correct
  // in the same tick — avoids the race where the old pageIndex is used
  // while the reset hasn't applied yet.
  useEffect(() => {
    // null means initial mount — not a user-triggered filter change
    const filtersChanged = filtersRef.current !== null && filtersRef.current !== normalizedFilters;
    filtersRef.current = normalizedFilters;

    // When filters changed and we're not on page 0, reset pagination and bail.
    // The setPagination re-render will trigger this effect again with pageIndex=0,
    // making exactly ONE API call with the correct offset.
    if (filtersChanged && pagination.pageIndex !== 0) {
      setPagination((p) => ({ ...p, pageIndex: 0 }));
      return;
    }

    const effectivePageIndex = filtersChanged ? 0 : pagination.pageIndex;

    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await getTrainings({
          training_name: Array.isArray(normalizedFilters.training_name)
            ? normalizedFilters.training_name.map((t) => t?.name ?? t)
            : normalizedFilters.training_name,
          financial_year: normalizedFilters.financial_year,
          assigned_date: normalizedFilters.assigned_date,
          due_date: normalizedFilters.due_date,
          closure_date: normalizedFilters.closure_date,
          limit: pagination.pageSize,
          page_number: pagination.pageIndex + 1, // API is 1-indexed
          order_by: ["-last_updated_on"],
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
              : items.length;

        // Format date-only fields for consistent display (config DATE_FORMAT_MOMENT)
        const mappedItems = items.map((it) => ({
          ...it,
          training_assigned_date: it.training_assigned_date ? formatApiDateOnly(it.training_assigned_date) : it.training_assigned_date,
          training_due_date: it.training_due_date ? formatApiDateOnly(it.training_due_date) : it.training_due_date,
          activity_closure_date: it.activity_closure_date ? formatApiDateOnly(it.activity_closure_date) : it.activity_closure_date,
        }));

        setData(mappedItems);
        setTotal(nextTotal);
        onTotalChange?.(nextTotal);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch trainings:", err);
        setData([]);
        setTotal(0);
        onTotalChange?.(0);
      }
    };

    fetchData();

    return () => { cancelled = true; };
  }, [normalizedFilters, pagination.pageIndex, pagination.pageSize, refreshKey, internalRefreshKey]);

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white pt-2 shadow-sm">
      <div className="w-full min-w-0 flex-1 overflow-x-auto">
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-lg"
          style={{ minWidth: tableMinWidth }}
        >
          <thead className="bg-[#f5f5f5]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[#d9d9d9]">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta || {};

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "border-b border-[#d9d9d9] px-3 py-3 text-lg font-medium text-black",
                        meta.wrapHeader ? "whitespace-normal" : "whitespace-nowrap",
                        getColumnAlignmentClass(meta),
                        getStickyColumnClass(meta, "header"),
                      )}
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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group border-b border-[#d9d9d9] hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta || {};

                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "border-b border-[#d9d9d9] px-3 py-4 text-lg text-[#1e1e1e]",
                          getColumnAlignmentClass(meta),
                          getStickyColumnClass(meta, "body"),
                        )}
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
                <td colSpan={columns.length} className="px-6 py-14 text-center">
                  {Object.values(normalizedFilters).some((v) =>
                    Array.isArray(v) ? v.length > 0 : Boolean(v)
                  ) ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">No items match your filters.</span>
                      <span className="text-xs text-gray-400">
                        Try adjusting or{" "}
                        <button
                          type="button"
                          onClick={onResetFilters}
                          className="text-purple-600 underline hover:text-purple-800"
                        >
                          reset your filters
                        </button>
                        {" "}to see all records.
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No records found.</span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 items-center justify-center border-t border-[#d9d9d9] py-4">
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          onPageChange={(page) => table.setPageIndex(page - 1)}
        />
      </div>
      <UploadDataDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setSelectedTrainingId(null);
        }}
        onUpload={handleDialogUpload}
        isUploading={isUploading}
      />
    </div>
  );
}
