import { useCallback, useEffect, useRef, useState } from "react";
import moment from "moment";
import {
  ChevronDown,
  ChevronLeft,
  Download,
  Filter,
  Link2,
  MoreHorizontal,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/Tooltip";
import { cn } from "@/lib/utils";
import { DATE_FORMAT_MOMENT, toDisplayDateString } from "@/config";
import Calendar from "@/atoms/calendar";
import {
  AuditStatusBadge,
  RiskLevelBadge,
} from "@/components/audit/auditStatusStyles";
import CheckpointActionModal from "@/components/audit/CheckpointActionModal";
import CheckpointHistoryDrawer from "@/components/audit/CheckpointHistoryDrawer";
import {
  downloadAuditCheckpointTemplate,
  getAuditCheckpoints,
  uploadAuditCheckpointTemplate,
} from "../../api/audit";
import {
  createCheckpointId,
  createEmptyCheckpoint,
  isCheckpointInProgress,
  MAX_CHECKPOINT_FILES,
  MAX_CHECKPOINT_TEXT_LENGTH,
  resolveAuditViewerRole,
  resolveCheckpointPendingRole,
  RISK_LEVEL_OPTIONS,
} from "@/utils/auditHelpers";

/** Trigger browser download for an axios blob response. */
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

/** Figma 3650:22339 — Back */
const backButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#e6e6e6] px-3 text-sm font-medium text-[#757575] transition-colors hover:bg-[#d9d9d9]";

/** Figma 3572:45316 / 3572:45314 */
const secondaryActionClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[rgba(37,99,235,0.15)] px-4 text-sm font-medium text-[#2563eb] transition-colors hover:bg-[rgba(37,99,235,0.22)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60";

/** Figma 7494:37376 / 3572:45313 */
const primaryActionClass =
  "inline-flex h-9 items-center justify-center rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60";

/** Figma 3572:45315 */
const publishButtonClass =
  "inline-flex h-9 items-center justify-center rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Audit Checkpoints page header actions
 * Figma: Back, Audit ID, status, Download Template, Upload Checkpoints,
 * Mark as Closed, Save as Draft, Publish
 */
export function AuditCheckpointsHeader({
  audit,
  onBack,
  onDownloadTemplate,
  onUploadCheckpoints,
  onMarkAsClosed,
  onSaveDraft,
  onPublish,
  isSaving = false,
  isTemplateBusy = false,
  readOnly = false,
  disabled = false,
}) {
  // Only the reserved upload slug exists before the audit is first saved —
  // it must never be shown as the business Audit ID.
  const auditDisplayId = audit?.display_audit_id || audit?.audit_id || "";
  const actionsLocked = isSaving || isTemplateBusy || disabled;

  return (
    <div className="mb-5 flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <button type="button" onClick={onBack} className={backButtonClass}>
          <ChevronLeft className="size-4 shrink-0" strokeWidth={2} />
          Back
        </button>
        {auditDisplayId ? (
          <h1 className="text-2xl font-semibold tracking-[-0.48px] text-[#1e1e1e]">
            Audit ID {auditDisplayId}
          </h1>
        ) : null}
        <AuditStatusBadge
          status={audit?.status || "Draft"}
          className="min-w-[112px] px-4 py-2 text-base"
        />
      </div>

      {!readOnly ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onDownloadTemplate}
            disabled={actionsLocked}
            className={secondaryActionClass}
            aria-busy={isTemplateBusy}
          >
            <Download className="size-4 shrink-0" strokeWidth={2} />
            {isTemplateBusy ? "Working..." : "Download Template"}
          </button>
          <button
            type="button"
            onClick={onUploadCheckpoints}
            disabled={actionsLocked}
            className={secondaryActionClass}
            aria-busy={isTemplateBusy}
          >
            <Upload className="size-4 shrink-0" strokeWidth={2} />
            {isTemplateBusy ? "Working..." : "Upload Checkpoints"}
          </button>
          <button
            type="button"
            onClick={onMarkAsClosed}
            disabled={actionsLocked}
            className={primaryActionClass}
          >
            Mark as Closed
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={actionsLocked}
            className={primaryActionClass}
            aria-busy={isSaving}
          >
            {isSaving ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={actionsLocked}
            className={publishButtonClass}
            aria-busy={isSaving}
          >
            {isSaving ? "Saving..." : "Publish"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Figma 655:11543 / 655:11546 — white above header only (20px), then flush table */
const thBase =
  "h-14 bg-[#f5f5f5] border-t border-b border-[#d9d9d9] px-2.5 py-1 text-base font-medium text-black align-middle";

const tdBase =
  "border-b border-[#d9d9d9] bg-white px-2.5 py-3 align-middle group-hover:bg-[#fafafa]";

const inputBase =
  "h-[41px] w-full appearance-none rounded-lg border border-[#d9d9d9] bg-white px-4 pr-10 text-base font-normal text-[#1e1e1e] outline-none placeholder:text-[#b3b3b3] focus:border-blue-400";

const textareaBase =
  "h-[120px] min-h-[80px] w-full resize-y rounded-lg border border-[#d9d9d9] bg-white px-4 py-3 text-base font-normal leading-[1.4] text-[#1e1e1e] outline-none placeholder:text-[#1e1e1e]/50 focus:border-blue-400";

const stickyActions = (variant) =>
  [
    "sticky right-0",
    variant === "header"
      ? "z-40 bg-[#f5f5f5]"
      : "z-30 bg-white group-hover:bg-[#fafafa]",
    "shadow-[-8px_0px_32px_0px_rgba(0,0,0,0.05)]",
  ].join(" ");

const COL = {
  add: 60,
  serial: 48,
  checkpoint: 260,
  criteria: 260,
  riskLevel: 140,
  status: 200,
  reference: 240,
  pendingAt: 150,
  plannedDate: 200,
  actualDate: 200,
  auditeeComments: 220,
  auditorComments: 220,
  actions: 84,
};

const widthStyle = (size) => ({
  width: size,
  minWidth: size,
  maxWidth: size,
});

function toCalendarValue(value) {
  if (!value) return "";
  const parsed = moment(
    value,
    [DATE_FORMAT_MOMENT, "DD-MMM-YYYY", "YYYY-MM-DD", "DD/MM/YYYY"],
    true,
  );
  if (parsed.isValid()) {
    return toDisplayDateString(parsed.format(DATE_FORMAT_MOMENT));
  }
  const fallback = moment(value);
  return fallback.isValid()
    ? toDisplayDateString(fallback.format(DATE_FORMAT_MOMENT))
    : String(value);
}

/**
 * Planned / Actual Closure Date cell — shared Calendar atom (orchestration style).
 */
function ClosureDateCalendar({
  value,
  onChange,
  readOnly = false,
  hasError = false,
}) {
  const calendarValue = toCalendarValue(value);

  if (readOnly) {
    return (
      <div className="relative w-full">
        <input
          type="text"
          value={calendarValue || "—"}
          readOnly
          className={cn(inputBase, "cursor-default bg-[#f5f5f5]")}
        />
      </div>
    );
  }

  return (
    <Calendar
      format={DATE_FORMAT_MOMENT}
      value={calendarValue}
      onChange={(date) =>
        onChange?.(date ? toDisplayDateString(date) : null)
      }
      showIcon
      width="100%"
      openFrom="bottom"
      inputClassName={cn(
        "!mt-0 h-[41px] px-4 py-0 text-base normal-case placeholder:normal-case placeholder:text-[#b3b3b3]",
        hasError ? "border-red-500" : "border-[#d9d9d9]",
      )}
    />
  );
}

/**
 * Per-file reference chip list (filename + optional open + remove).
 * Removing a file updates local `reference_files`; on Save/Publish only remaining
 * names are sent as `existing_files` / `new_files` to the API.
 */
function ReferenceFilesCell({ files = [], readOnly = false, onRemove }) {
  const list = Array.isArray(files) ? files.filter(Boolean) : [];

  if (list.length === 0) {
    return <span className="text-base text-[#b3b3b3]">—</span>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {list.map((file, index) => {
        const name = String(
          file.file_name || file.fileName || file.name || "File",
        ).trim() || "File";
        const url = String(file.file_url || file.fileUrl || file.url || "").trim();
        const canOpen = Boolean(url && url !== "#");
        const key = file.id || `${name}-${index}`;

        return (
          <div
            key={key}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#d9d9d9] bg-white py-1.5 pl-2.5 pr-1 text-sm font-normal text-[#1e1e1e] shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
          >
            {canOpen ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-left hover:text-[#2563eb] hover:underline"
                title={name}
              >
                {name}
              </a>
            ) : (
              <span className="min-w-0 flex-1 truncate" title={name}>
                {name}
              </span>
            )}
            {canOpen ? (
              <Link2 className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" aria-hidden />
            ) : null}
            {!readOnly ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemove?.(file);
                }}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#757575] transition hover:bg-[#fee9e7] hover:text-[#c00f0c]"
                aria-label={`Remove ${name}`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const STATUS_FILTER_OPTIONS = ["Draft", "In-Progress", "Completed"];
const PENDING_AT_FILTER_OPTIONS = ["Auditee", "Auditor"];

/**
 * Icon-only multi-select filter, sat inline next to a column header label so it
 * takes no extra header row / vertical space.
 */
function ColumnFilterMenu({ label, options, selected, onChange }) {
  const active = selected.length > 0;
  const toggle = (value) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
            active
              ? "text-[#2563eb]"
              : "text-[#757575] hover:text-[#2563eb]",
          )}
          aria-label={`Filter ${label}`}
        >
          <Filter
            className="size-3.5"
            strokeWidth={2}
            fill={active ? "currentColor" : "none"}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        <DropdownMenuLabel className="font-normal text-[#757575]">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.includes(option)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => toggle(option)}
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              Clear
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuItemWithTooltip({ disabled, disabledReason, children, onSelect }) {
  const item = (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onSelect?.();
      }}
      className={disabled ? "opacity-50" : undefined}
    >
      {children}
    </DropdownMenuItem>
  );

  if (!disabled || !disabledReason) return item;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block w-full">{item}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px] bg-black text-center text-white">
          {disabledReason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function AuditCheckpointsTable({
  auditId,
  audit,
  checkpoints: controlledCheckpoints,
  onCheckpointsChange,
  isSaving = false,
  /** True while the audit ID/slug is not ready yet — disables actions without
   * claiming a save is in progress (keeps "Saving..." accurate to real submits). */
  disabled = false,
  /** When true (default), renders Back / Audit ID / action buttons above the table */
  showHeader = true,
  readOnly = false,
  /** auditor | auditee — auditor-only Close when auditor */
  viewerRole,
  /**
   * Per-row publish field errors:
   * { [rowId]: { checkpoint?, judgement_criteria?, planned_closure_date? } }
   */
  rowErrors = {},
  onClearRowFieldError,
  onBack,
  onDownloadTemplate,
  onUploadCheckpoints,
  onMarkAsClosed,
  onSaveDraft,
  onPublish,
  onToast,
  /**
   * Draft checkpoints only exist in the payload — deleting one requires
   * saving/publishing the audit with that row removed.
   * (nextCheckpoints, "draft" | "publish") => Promise<boolean>
   */
  onDeleteCheckpoint,
}) {
  const navigate = useNavigate();
  const [internalRows, setInternalRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateBusy, setIsTemplateBusy] = useState(false);
  const templateBusyRef = useRef(false);
  const uploadRef = useRef(null);
  const referenceFileRef = useRef(null);
  const [referenceRowId, setReferenceRowId] = useState(null);
  const [actionModal, setActionModal] = useState({
    open: false,
    variant: "respond",
    checkpoint: null,
  });
  const [historyDrawer, setHistoryDrawer] = useState({
    open: false,
    checkpoint: null,
    refreshKey: 0,
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    rowId: null,
  });
  const [isDeleteSaving, setIsDeleteSaving] = useState(false);
  const isControlled = typeof onCheckpointsChange === "function";
  const rows = isControlled ? controlledCheckpoints || [] : internalRows;
  const [statusFilter, setStatusFilter] = useState([]);
  const [riskFilter, setRiskFilter] = useState([]);
  const [pendingAtFilter, setPendingAtFilter] = useState([]);

  const getRowStatus = (row) =>
    String(row?.status || row?.checkpoint_status || "").trim();
  const getRowRisk = (row) => String(row?.risk_level || "").trim();
  const getRowPendingAt = (row) => String(row?.pending_at || "").trim();

  const filteredRows = rows.filter((row) => {
    if (statusFilter.length > 0 && !statusFilter.includes(getRowStatus(row))) {
      return false;
    }
    if (riskFilter.length > 0 && !riskFilter.includes(getRowRisk(row))) {
      return false;
    }
    if (
      pendingAtFilter.length > 0 &&
      !pendingAtFilter.includes(getRowPendingAt(row))
    ) {
      return false;
    }
    return true;
  });

  const role =
    viewerRole === "auditor" || viewerRole === "auditee"
      ? viewerRole
      : resolveAuditViewerRole(audit);
  const isAuditor = role === "auditor";

  const setRows = useCallback(
    (updater) => {
      if (isControlled) {
        const current = controlledCheckpoints || [];
        const next = typeof updater === "function" ? updater(current) : updater;
        onCheckpointsChange(next);
        return;
      }
      setInternalRows(updater);
    },
    [controlledCheckpoints, isControlled, onCheckpointsChange],
  );

  const notify = useCallback(
    (message, variant = "success") => {
      onToast?.(message, variant);
    },
    [onToast],
  );

  const openActionModal = (variant, checkpoint) => {
    setActionModal({ open: true, variant, checkpoint });
  };

  const openHistory = (checkpoint) => {
    setHistoryDrawer({ open: true, checkpoint, refreshKey: Date.now() });
  };

  const handleActionSuccess = ({
    checkpointId,
    outcomeStatus,
    variant,
    closureDate,
  }) => {
    if (checkpointId && outcomeStatus) {
      const closedOn =
        variant === "closed" && closureDate
          ? toCalendarValue(closureDate) ||
            toDisplayDateString(moment().format(DATE_FORMAT_MOMENT))
          : variant === "closed"
            ? toDisplayDateString(moment().format(DATE_FORMAT_MOMENT))
            : null;
      setRows((current) =>
        current.map((row) =>
          row.id === checkpointId || row.checkpoint_id === checkpointId
            ? {
                ...row,
                status: outcomeStatus,
                checkpoint_status: outcomeStatus,
                ...(closedOn
                  ? {
                      actual_closure_date: closedOn,
                      actualClosureDate: closedOn,
                    }
                  : {}),
              }
            : row,
        ),
      );
    }
    // After Respond / Close, refresh History if that checkpoint drawer is open.
    setHistoryDrawer((current) => {
      if (!current.open) return current;
      const openId =
        current.checkpoint?.checkpoint_id || current.checkpoint?.id;
      if (String(openId) !== String(checkpointId)) return current;
      return { ...current, refreshKey: Date.now() };
    });
  };

  const getActionState = (row) => {
    const status = String(
      row?.status || row?.checkpoint_status || "",
    ).toLowerCase();
    const isTerminal =
      status === "closed" ||
      status.includes("non-compliant") ||
      status.includes("non_compliant") ||
      status === "completed";
    const pendingLabel = String(row?.pending_at ?? row?.pendingAt ?? "").trim();
    const pendingRole = resolveCheckpointPendingRole(row);
    // No pendingAt (draft / closed rows) means no party owns the next action.
    const noPendingOwner = !pendingLabel;
    const pendingWithOther = Boolean(pendingRole) && pendingRole !== role;

    return {
      showClose: isAuditor && !noPendingOwner && pendingRole !== "auditee",
      closeDisabled: isTerminal,
      closeDisabledReason: isTerminal
        ? "This checkpoint is already closed."
        : "",
      showReopen: isAuditor && isTerminal,
      respondDisabled: noPendingOwner || pendingWithOther,
      respondDisabledReason: noPendingOwner
        ? "This checkpoint has no pending action."
        : pendingWithOther
          ? `This checkpoint is pending at the ${pendingLabel}.`
          : "",
      historyDisabled: false,
    };
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate("/audit/dashboard");
  };

  const fetchData = useCallback(async () => {
    if (isControlled) {
      setIsLoading(false);
      return;
    }

    if (!auditId) {
      setInternalRows([createEmptyCheckpoint(1)]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getAuditCheckpoints({ auditId });
      const nextRows = response?.data || [];
      setInternalRows(
        nextRows.length > 0 ? nextRows : [createEmptyCheckpoint(1)],
      );
    } catch {
      setInternalRows([createEmptyCheckpoint(1)]);
    } finally {
      setIsLoading(false);
    }
  }, [auditId, isControlled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateRow = (rowId, field, value) => {
    if (readOnly) return;
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        // In-Progress checkpoints are display/respond only — block field edits.
        if (isCheckpointInProgress(row)) return row;

        let nextValue = value;
        if (field === "checkpoint" || field === "judgement_criteria") {
          nextValue = String(value ?? "").slice(0, MAX_CHECKPOINT_TEXT_LENGTH);
        }
        return { ...row, [field]: nextValue };
      }),
    );
    onClearRowFieldError?.(rowId, field);
  };

  const handleAddRow = () => {
    if (readOnly) return;
    setRows((current) => [
      ...current,
      createEmptyCheckpoint(current.length + 1),
    ]);
  };

  const handleDeleteRow = async (rowId) => {
    if (readOnly) return;

    const target =
      rows.find((row) => row.id === rowId || row.checkpoint_id === rowId) ||
      null;
    if (isCheckpointInProgress(target)) {
      notify("In-Progress checkpoints cannot be deleted.", "error");
      return;
    }

    // Keep at least one row
    if (rows.length <= 1) {
      notify("At least one checkpoint is required.", "error");
      return;
    }

      setRows((current) => {
        if (current.length <= 1) return current;
        const filtered = current
          .filter((row) => row.id !== rowId && row.checkpoint_id !== rowId)
          .map((row, index) => ({ ...row, serial_no: index + 1 }));
        return filtered.length > 0 ? filtered : [createEmptyCheckpoint(1)];
      });
      onClearRowFieldError?.(rowId);
      notify("Audit Observation deleted successfully.");
  };

  const handleDuplicateRow = (rowId) => {
    if (readOnly) return;
    setRows((current) => {
      const sourceIndex = current.findIndex((row) => row.id === rowId);
      if (sourceIndex === -1) return current;

      const source = current[sourceIndex];
      if (isCheckpointInProgress(source)) {
        notify("In-Progress checkpoints cannot be duplicated.", "error");
        return current;
      }
      const checkpointId = createCheckpointId();
      const duplicate = {
        ...source,
        checkpoint_id: checkpointId,
        id: checkpointId,
        reference_files: [],
        reference: null,
        status: "",
        checkpoint_status: "",
        actual_closure_date: null,
        actualClosureDate: null,
      };

      const next = [...current];
      next.splice(sourceIndex + 1, 0, duplicate);
      return next.map((row, index) => ({ ...row, serial_no: index + 1 }));
    });
  };

  const syncReferenceDisplay = (referenceFiles = []) => {
    if (!referenceFiles.length) {
      return { reference: null, reference_files: [] };
    }

    const first = referenceFiles[0];
    return {
      reference_files: referenceFiles,
      reference: {
        label:
          referenceFiles.length > 1
            ? `${referenceFiles.length} files`
            : first.file_name,
        url: first.file_url || "#",
      },
    };
  };

  const handleAttachReference = (rowId) => {
    if (readOnly) return;
    const target =
      rows.find((row) => row.id === rowId || row.checkpoint_id === rowId) ||
      null;
    if (isCheckpointInProgress(target)) {
      notify("In-Progress checkpoints cannot be edited.", "error");
      return;
    }
    setReferenceRowId(rowId);
    referenceFileRef.current?.click();
  };

  const handleRemoveReferenceFile = (rowId, fileToRemove) => {
    if (readOnly || !fileToRemove) return;
    const target =
      rows.find((row) => row.id === rowId || row.checkpoint_id === rowId) ||
      null;
    if (isCheckpointInProgress(target)) {
      notify("In-Progress checkpoints cannot be edited.", "error");
      return;
    }

    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId && row.checkpoint_id !== rowId) return row;

        const nextFiles = (row.reference_files || []).filter((file) => {
          if (fileToRemove.id && file.id) {
            return String(file.id) !== String(fileToRemove.id);
          }
          const keepName = String(
            file.file_name || file.fileName || file.name || "",
          ).trim();
          const removeName = String(
            fileToRemove.file_name ||
              fileToRemove.fileName ||
              fileToRemove.name ||
              "",
          ).trim();
          if (keepName && removeName) {
            return keepName !== removeName;
          }
          return file !== fileToRemove;
        });

        return {
          ...row,
          ...syncReferenceDisplay(nextFiles),
        };
      }),
    );
  };
const handleReferenceFileChange = (event) => {
  const files = Array.from(event.target.files || []);
  event.target.value = "";

  if (!files.length || !referenceRowId) return;

  setRows((current) =>
    current.map((row) => {
      if (row.id !== referenceRowId) return row;

      const existingFiles = row.reference_files || [];
      let nextFiles = [...existingFiles];

      for (const file of files) {
        if (nextFiles.length >= MAX_CHECKPOINT_FILES) {
          notify(`Maximum ${MAX_CHECKPOINT_FILES} files per checkpoint.`, "error");
          break;
        }

        const incomingName = String(file.name || "").trim();
        const duplicate = nextFiles.some(
          (item) =>
            String(item.file_name || item.fileName || item.name || "").trim() ===
            incomingName
        );

        if (duplicate) {
          notify(`"${incomingName}" is already attached.`, "error");
          continue;
        }

        nextFiles.push({
          id: `cp-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file_name: file.name,
          file,
          isExisting: false,
        });
      }

      return {
        ...row,
        ...syncReferenceDisplay(nextFiles),
      };
    })
  );

  setReferenceRowId(null);
};


  const handleDownloadTemplate = async () => {
    if (readOnly || isSaving || disabled || templateBusyRef.current) return;
    if (onDownloadTemplate) {
      onDownloadTemplate();
      return;
    }

    templateBusyRef.current = true;
    setIsTemplateBusy(true);
    try {
      const response = await downloadAuditCheckpointTemplate();
      const downloaded = downloadBlobResponse(
        response,
        "audit_checkpoint_template.xlsx",
      );
      if (!downloaded) {
        notify("Unable to download checkpoint template.", "error");
        return;
      }
      notify("Checkpoint template downloaded successfully.");
    } catch (err) {
      notify(
        err?.message || "Unable to download checkpoint template.",
        "error",
      );
    } finally {
      templateBusyRef.current = false;
      setIsTemplateBusy(false);
    }
  };

  const handleUploadCheckpoints = () => {
    if (readOnly || isSaving || disabled || templateBusyRef.current) return;
    if (onUploadCheckpoints) {
      onUploadCheckpoints();
      return;
    }
    uploadRef.current?.click();
  };

  const handleCheckpointFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || readOnly || isSaving || disabled || templateBusyRef.current) return;

    const lower = String(file.name || "").toLowerCase();
    if (!lower.endsWith(".xlsx")) {
      notify("Only .xlsx files are allowed.", "error");
      return;
    }

    templateBusyRef.current = true;
    setIsTemplateBusy(true);
    try {
      const result = await uploadAuditCheckpointTemplate(file);
      const mapped = Array.isArray(result?.checkpoints)
        ? result.checkpoints
        : [];

      if (mapped.length > 0) {
        setRows(mapped);
      }

      notify(
        result?.message ||
          (mapped.length > 0
            ? "Checkpoints uploaded successfully."
            : "Template uploaded successfully."),
      );
    } catch (err) {
      notify(
        err?.message || "Unable to upload checkpoint template.",
        "error",
      );
    } finally {
      templateBusyRef.current = false;
      setIsTemplateBusy(false);
    }
  };

  const handleSaveDraft = () => {
    if (isSaving || isTemplateBusy || disabled) return;
    if (onSaveDraft) {
      onSaveDraft();
      return;
    }
    notify("Audit saved as draft.");
  };

  const handlePublish = () => {
    if (isSaving || isTemplateBusy || disabled) return;
    if (onPublish) {
      onPublish();
      return;
    }
    notify("Audit published successfully.");
  };

  const handleMarkAsClosed = () => {
    if (isSaving || isTemplateBusy || disabled) return;
    if (onMarkAsClosed) {
      onMarkAsClosed();
      return;
    }
    notify("Audit marked as closed.");
  };

  const tableCard = isLoading ? (
    <div className="flex items-center justify-center rounded-2xl bg-white py-16 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col items-center gap-2">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
        <span className="text-sm text-gray-500">Loading checkpoints...</span>
      </div>
    </div>
  ) : (
    <div className="w-full overflow-hidden rounded-2xl bg-white pt-5 font-sans shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[2160px] table-fixed border-separate border-spacing-0">
          <thead>
            <tr>
              {!readOnly ? (
                <th className={thBase} style={widthStyle(COL.add)} aria-hidden />
              ) : null}
              <th
                className={`${thBase} text-center`}
                style={widthStyle(COL.serial)}
              >
                Sl#
              </th>
              <th
                className={`${thBase} text-left`}
                style={widthStyle(COL.checkpoint)}
              >
                Audit Observation
              </th>
              <th
                className={`${thBase} text-left`}
                style={widthStyle(COL.criteria)}
              >
                Legal Provision
              </th>
              <th
                className={`${thBase} text-center`}
                style={widthStyle(COL.riskLevel)}
              >
                <span className="inline-flex items-center gap-1">
                  Risk Level
                  <ColumnFilterMenu
                    label="Risk Level"
                    options={RISK_LEVEL_OPTIONS}
                    selected={riskFilter}
                    onChange={setRiskFilter}
                  />
                </span>
              </th>
              <th
                className={`${thBase} pl-5 text-left`}
                style={widthStyle(COL.reference)}
              >
                Reference
              </th>
              <th
                className={`${thBase} text-left`}
                style={widthStyle(COL.status)}
              >
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Checkpoint Status
                  <ColumnFilterMenu
                    label="Checkpoint Status"
                    options={STATUS_FILTER_OPTIONS}
                    selected={statusFilter}
                    onChange={setStatusFilter}
                  />
                </span>
              </th>
              <th
                className={`${thBase} text-center`}
                style={widthStyle(COL.pendingAt)}
              >
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Pending at
                  <ColumnFilterMenu
                    label="Pending at"
                    options={PENDING_AT_FILTER_OPTIONS}
                    selected={pendingAtFilter}
                    onChange={setPendingAtFilter}
                  />
                </span>
              </th>
              <th
                className={`${thBase} text-center leading-tight`}
                style={widthStyle(COL.plannedDate)}
              >
                Planned Closure Date
              </th>
              <th
                className={`${thBase} text-center leading-tight`}
                style={widthStyle(COL.actualDate)}
              >
                <span className="block">Actual</span>
                <span className="block">Closure Date</span>
              </th>
              <th
                className={`${thBase} text-left`}
                style={widthStyle(COL.auditeeComments)}
              >
                Auditee Comments
              </th>
              <th
                className={`${thBase} text-left`}
                style={widthStyle(COL.auditorComments)}
              >
                Auditor Comments
              </th>
              <th
                className={`${thBase} ${stickyActions("header")} text-center`}
                style={widthStyle(COL.actions)}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className={`${tdBase} py-10 text-center text-base text-[#b3b3b3]`}
                >
                  No checkpoints match the selected filters.
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row) => {
              const isLastRow =
                row.id === rows[rows.length - 1]?.id &&
                row.checkpoint_id === rows[rows.length - 1]?.checkpoint_id;
              const errors = rowErrors?.[row.id] || rowErrors?.[row.checkpoint_id] || {};
              const rowLocked = isCheckpointInProgress(row);
              const fieldsReadOnly = readOnly || rowLocked;
              const canDelete = !readOnly && !rowLocked && rows.length > 1;
              const checkpointText = String(row.checkpoint || "");
              const criteriaText = String(row.judgement_criteria || "");

              return (
                <tr key={row.id} className="group h-[144px]">
                  {!readOnly ? (
                    <td className={`${tdBase} text-center`} style={widthStyle(COL.add)}>
                      {isLastRow ? (
                        <button
                          type="button"
                          onClick={handleAddRow}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#2563eb] text-white transition hover:bg-blue-700"
                          aria-label="Add checkpoint row"
                        >
                          <Plus className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                  <td
                    className={`${tdBase} text-center text-base font-normal text-[#1e1e1e]`}
                    style={widthStyle(COL.serial)}
                  >
                    {String(row.serial_no).padStart(2, "0")}
                  </td>
                  <td className={tdBase} style={widthStyle(COL.checkpoint)}>
                    <textarea
                      value={checkpointText}
                      onChange={(event) =>
                        updateRow(row.id, "checkpoint", event.target.value)
                      }
                      rows={4}
                      maxLength={MAX_CHECKPOINT_TEXT_LENGTH}
                      placeholder="Type here"
                      readOnly={fieldsReadOnly}
                      className={cn(
                        textareaBase,
                        fieldsReadOnly && "cursor-default bg-[#f5f5f5]",
                        errors.checkpoint && "border-red-500",
                      )}
                      aria-invalid={Boolean(errors.checkpoint)}
                    />
                    {!fieldsReadOnly ? (
                      <p className="mt-0.5 text-right text-[11px] text-[#b3b3b3]">
                        {checkpointText.length}/{MAX_CHECKPOINT_TEXT_LENGTH}
                      </p>
                    ) : null}
                    {errors.checkpoint ? (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {errors.checkpoint}
                      </p>
                    ) : null}
                  </td>
                  <td className={tdBase} style={widthStyle(COL.criteria)}>
                    <textarea
                      value={criteriaText}
                      onChange={(event) =>
                        updateRow(
                          row.id,
                          "judgement_criteria",
                          event.target.value,
                        )
                      }
                      rows={4}
                      maxLength={MAX_CHECKPOINT_TEXT_LENGTH}
                      placeholder="Type here"
                      readOnly={fieldsReadOnly}
                      className={cn(
                        textareaBase,
                        fieldsReadOnly && "cursor-default bg-[#f5f5f5]",
                        errors.judgement_criteria && "border-red-500",
                      )}
                      aria-invalid={Boolean(errors.judgement_criteria)}
                    />
                    {!fieldsReadOnly ? (
                      <p className="mt-0.5 text-right text-[11px] text-[#b3b3b3]">
                        {criteriaText.length}/{MAX_CHECKPOINT_TEXT_LENGTH}
                      </p>
                    ) : null}
                    {errors.judgement_criteria ? (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {errors.judgement_criteria}
                      </p>
                    ) : null}
                  </td>
                  <td
                    className={`${tdBase} text-center`}
                    style={widthStyle(COL.riskLevel)}
                  >
                    {fieldsReadOnly ? (
                      <RiskLevelBadge level={row.risk_level} />
                    ) : (
                      <div className="relative w-full">
                        <select
                          value={row.risk_level || ""}
                          onChange={(event) =>
                            updateRow(row.id, "risk_level", event.target.value)
                          }
                          className={cn(
                            inputBase,
                            "cursor-pointer pr-8 text-center font-medium",
                            row.risk_level
                              ? "text-[#1e1e1e]"
                              : "text-[#757575]",
                          )}
                        >
                          <option value="" className="text-[#757575]">
                            Select
                          </option>
                          {RISK_LEVEL_OPTIONS.map((option) => (
                            <option
                              key={option}
                              value={option}
                              className="text-[#1e1e1e]"
                            >
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#2563eb]"
                          strokeWidth={2}
                        />
                      </div>
                    )}
                  </td>
                  <td className={`${tdBase} pl-5`} style={widthStyle(COL.reference)}>
                    <ReferenceFilesCell
                      files={row.reference_files}
                      readOnly={fieldsReadOnly}
                      onRemove={(file) =>
                        handleRemoveReferenceFile(row.id, file)
                      }
                    />
                  </td>
                  <td className={tdBase} style={widthStyle(COL.status)}>
                    {(() => {
                      const statusLabel = String(
                        row.status || row.checkpoint_status || "",
                      ).trim();
                      return statusLabel ? (
                        <AuditStatusBadge status={statusLabel} />
                      ) : (
                        <span className="text-base text-[#b3b3b3]">—</span>
                      );
                    })()}
                  </td>
                  <td
                    className={`${tdBase} text-center text-base font-normal text-[#1e1e1e]`}
                    style={widthStyle(COL.pendingAt)}
                  >
                    {row.pending_at || "—"}
                  </td>
                  <td className={tdBase} style={widthStyle(COL.plannedDate)}>
                    <ClosureDateCalendar
                      value={row.planned_closure_date}
                      onChange={(value) =>
                        updateRow(row.id, "planned_closure_date", value)
                      }
                      readOnly={fieldsReadOnly}
                      hasError={Boolean(errors.planned_closure_date)}
                    />
                    {errors.planned_closure_date ? (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {errors.planned_closure_date}
                      </p>
                    ) : null}
                  </td>
                  <td className={tdBase} style={widthStyle(COL.actualDate)}>
                    <ClosureDateCalendar
                      value={
                        row.actualClosureDate ||
                        row.actual_closure_date ||
                        null
                      }
                      readOnly
                    />
                  </td>
                  <td className={tdBase} style={widthStyle(COL.auditeeComments)}>
                    <textarea
                      value={row.auditee_comments || row.auditeeComments || ""}
                      readOnly
                      rows={4}
                      placeholder="—"
                      className={cn(
                        textareaBase,
                        "cursor-default resize-y bg-[#f5f5f5]",
                      )}
                    />
                  </td>
                  <td className={tdBase} style={widthStyle(COL.auditorComments)}>
                    <textarea
                      value={row.auditor_comments || row.auditorComments || ""}
                      readOnly
                      rows={4}
                      placeholder="—"
                      className={cn(
                        textareaBase,
                        "cursor-default resize-y bg-[#f5f5f5]",
                      )}
                    />
                  </td>
                  <td
                    className={`${tdBase} ${stickyActions("body")} text-center`}
                    style={widthStyle(COL.actions)}
                  >
                    {(() => {
                      const actionState = getActionState(row);
                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#2563eb] transition hover:bg-blue-50"
                              aria-label="Checkpoint actions"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[200px]">
                            <MenuItemWithTooltip
                              disabled={actionState.respondDisabled}
                              disabledReason={actionState.respondDisabledReason}
                              onSelect={() => openActionModal("respond", row)}
                            >
                              Respond
                            </MenuItemWithTooltip>
                            {actionState.showClose ? (
                              <MenuItemWithTooltip
                                disabled={actionState.closeDisabled}
                                disabledReason={
                                  actionState.closeDisabledReason ||
                                  "Only auditors can close checkpoints."
                                }
                                onSelect={() => openActionModal("closed", row)}
                              >
                                Close
                              </MenuItemWithTooltip>
                            ) : null}
                            <MenuItemWithTooltip
                              disabled={actionState.historyDisabled}
                              disabledReason="History is unavailable."
                              onSelect={() => openHistory(row)}
                            >
                              History
                            </MenuItemWithTooltip>
                            {actionState.showReopen ? (
                              <DropdownMenuItem
                                onSelect={() => openActionModal("reopen", row)}
                              >
                                Reopen
                              </DropdownMenuItem>
                            ) : null}
                            {!readOnly && !rowLocked ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleAttachReference(row.id)}
                                >
                                  Attach Reference
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDuplicateRow(row.id)}
                                >
                                  Duplicate
                                </DropdownMenuItem>
                                {canDelete ? (
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteRow(row.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                ) : null}
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const actionOverlays = (
    <>
      <CheckpointActionModal
        open={actionModal.open}
        onOpenChange={(open) =>
          setActionModal((current) => ({
            ...current,
            open,
            checkpoint: open ? current.checkpoint : null,
          }))
        }
        variant={actionModal.variant}
        auditId={auditId || audit?.id}
        checkpoint={actionModal.checkpoint}
        onToast={notify}
        onSuccess={handleActionSuccess}
      />
      <CheckpointHistoryDrawer
        open={historyDrawer.open}
        onClose={() =>
          setHistoryDrawer({ open: false, checkpoint: null, refreshKey: 0 })
        }
        auditId={auditId || audit?.id}
        checkpoint={historyDrawer.checkpoint}
        refreshKey={historyDrawer.refreshKey}
        onToast={notify}
      />
    </>
  );

  if (!showHeader) {
    return (
      <>
        {tableCard}
        {actionOverlays}
      </>
    );
  }

  return (
    <div className="w-full min-w-0">
      <input
        ref={uploadRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
  
        onChange={handleCheckpointFileChange}
      />
      <input
        ref={referenceFileRef}
        type="file"
        accept=".png,.pdf,.jpg,.jpeg,.gif,.bmp,.ppt,.pptx,.tiff"
        className="hidden"
        multiple
        onChange={handleReferenceFileChange}
      />
      <AuditCheckpointsHeader
        audit={audit}
        onBack={handleBack}
        onDownloadTemplate={handleDownloadTemplate}
        onUploadCheckpoints={handleUploadCheckpoints}
        onMarkAsClosed={handleMarkAsClosed}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        isSaving={isSaving}
        isTemplateBusy={isTemplateBusy}
        readOnly={readOnly}
        disabled={disabled}
      />
      {tableCard}
      {actionOverlays}
    </div>
  );
}
