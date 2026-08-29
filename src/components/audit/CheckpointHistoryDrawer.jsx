import { useEffect, useRef, useState } from "react";
import { Link2, Loader2, X } from "lucide-react";
import { getCheckpointHistory } from "@/api/audit";
import { AuditStatusBadge } from "@/components/audit/auditStatusStyles";

const ROLE_STYLES = {
  auditor: {
    name: "text-[#8b5cf6]",
    bubble: "bg-[rgba(139,92,246,0.1)]",
  },
  auditee: {
    name: "text-[#2563eb]",
    bubble: "bg-[#dfe8fc]",
  },
};

const pickRoleStyle = (role, index) => {
  const key = String(role || "").toLowerCase().includes("audit")
    ? String(role).toLowerCase().includes("ee")
      ? "auditee"
      : "auditor"
    : index % 2 === 0
      ? "auditor"
      : "auditee";
  return ROLE_STYLES[key] || ROLE_STYLES.auditee;
};

const formatHeaderNo = (checkpoint) => {
  const no = checkpoint?.serial_no ?? checkpoint?.serialNo ?? "";
  return no
    ? `Audit Observation ${String(no).padStart(2, "0")}`
    : "Audit Observation";
};

/**
 * Right-side history drawer for checkpoint logs (Figma 655:12150).
 * Pattern mirrors OrchestrationViewDrawer shell.
 */
export default function CheckpointHistoryDrawer({
  open,
  onClose,
  auditId,
  checkpoint,
  onToast,
  /** Bump after Respond so conversation reloads */
  refreshKey = 0,
}) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFromApi, setStatusFromApi] = useState("");

  // Parent often passes a new onToast identity each render (inline fn / toast setState).
  // Keep it out of the load effect deps so toast-after-error cannot re-trigger the API.
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const checkpointId = checkpoint?.checkpoint_id || checkpoint?.id || "";

  useEffect(() => {
    if (!open) {
      setLogs([]);
      setError("");
      setIsLoading(false);
      setStatusFromApi("");
      return undefined;
    }

    if (!checkpointId) {
      setError("Audit Observation is missing.");
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await getCheckpointHistory({ auditId, checkpointId });
        if (!cancelled) {
          setLogs(Array.isArray(response?.data) ? response.data : []);
          if (response?.status) setStatusFromApi(String(response.status));
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err?.message || "Unable to load checkpoint history.";
          setError(message);
          onToastRef.current?.(message, "error");
          setLogs([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, auditId, checkpointId, refreshKey]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const status =
    statusFromApi ||
    checkpoint?.status ||
    checkpoint?.checkpoint_status ||
    "";
  const secondaryStatus =
    String(status).toLowerCase().includes("non")
      ? null
      : checkpoint?.closure_status || null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <div
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[780px] flex-col overflow-hidden rounded-bl-2xl rounded-tl-2xl border border-[#E5E7EB] bg-white shadow-[0px_0px_40px_20px_rgba(8,8,8,0.05)] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-[105%]"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Checkpoint history"
      >
        <div className="relative flex shrink-0 items-start justify-between gap-3 px-10 pb-2 pt-8">
          <div className="flex min-w-0 flex-wrap items-center gap-3 pr-12">
            <h2 className="text-2xl font-semibold tracking-[-0.48px] text-[#1e1e1e]">
              {formatHeaderNo(checkpoint)}
            </h2>
            {status ? <AuditStatusBadge status={status} /> : null}
            {secondaryStatus && secondaryStatus !== status ? (
              <AuditStatusBadge status={secondaryStatus} />
            ) : null}
            {!status && !secondaryStatus ? (
              <>
                <AuditStatusBadge status="In-Progress" />
                <span className="inline-flex min-w-[116px] items-center justify-center rounded-lg bg-[#fee9e7] px-4 py-2 text-base font-semibold leading-[1.4] text-[#c00f0c]">
                  Non-Compliant
                </span>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg text-[#1e1e1e] transition hover:bg-[#f5f5f5]"
            aria-label="Close history"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-10 pb-10 pt-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : logs.length === 0 ? (
            <p className="text-base text-[#757575]">No history yet.</p>
          ) : (
            <div className="flex flex-col gap-8">
              {logs.map((entry, index) => {
                const style = pickRoleStyle(entry.role, index);
                const name = String(entry.employee_name || "Unknown").toUpperCase();
                const idPart = entry.employee_id
                  ? ` (${entry.employee_id})`
                  : "";
                const meta = [entry.date, entry.time].filter(Boolean).join(" | ");
                const attachments = entry.attachments || [];

                return (
                  <div key={entry.id || index} className="flex flex-col gap-2.5">
                    <p className="text-base font-semibold uppercase tracking-normal text-[#757575]">
                      <span className={style.name}>
                        {name}
                        {idPart}
                      </span>
                      {meta ? (
                        <span className="font-semibold text-[#757575]">
                          {` | ${meta}`}
                        </span>
                      ) : null}
                    </p>
                    <div
                      className={`flex flex-col gap-6 rounded-lg border border-[#d9d9d9] px-4 py-4 ${style.bubble}`}
                    >
                      <p className="text-xl font-normal leading-[1.4] text-black">
                        {entry.remarks || "—"}
                      </p>
                      {attachments.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          <p className="text-xl text-black">
                            <span className="font-bold">Attachment</span>:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {attachments.map((file) => (
                              <a
                                key={file.id || file.file_name}
                                href={file.file_url || "#"}
                                target={
                                  file.file_url && file.file_url !== "#"
                                    ? "_blank"
                                    : undefined
                                }
                                rel="noopener noreferrer"
                                onClick={(event) => {
                                  if (!file.file_url || file.file_url === "#") {
                                    event.preventDefault();
                                  }
                                }}
                                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-3 py-2 text-base text-[#1e1e1e] shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
                              >
                                <span className="truncate">
                                  {file.file_name || "File"}
                                </span>
                                <Link2 className="size-4 shrink-0 text-[#2563eb]" />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
