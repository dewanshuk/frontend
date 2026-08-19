import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const formatTypeLabel = (value) => {
  const normalized = String(value || "").trim();
  if (
    normalized === "Latest News & Announcements" ||
    normalized === "Latest News and Announcements"
  ) {
    return "Announcements";
  }
  if (!normalized) return "—";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatVersion = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "—";
  return normalized.replace(/^v/i, "");
};

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-base ">{value}</p>
    </div>
  );
}

export default function DeactivateModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  item = null,
}) {
  const [remark, setRemark] = useState("");
  const [remarkError, setRemarkError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setRemark("");
      setRemarkError("");
      setShowConfirm(false);
    }
  }, [isOpen]);

  const handleDeactivateClick = () => {
    const trimmed = String(remark || "").trim();
    if (!trimmed) {
      setRemarkError("Deactivation remark is required.");
      return;
    }
    setRemarkError("");
    setShowConfirm(true);
  };

  const handleProceed = async () => {
    const trimmed = String(remark || "").trim();
    if (typeof onConfirm === "function") {
      try {
        const res = await onConfirm(trimmed);
        if (res) onClose?.();
      } catch {
        // handled by caller
      }
    }
  };

  return (
    <Dialog
      open={Boolean(isOpen)}
      onOpenChange={(nextOpen) => {
        if (isProcessing) return;
        if (!nextOpen) onClose?.();
      }}
    >
      <DialogContent className="max-w-xl rounded-2xl px-7 py-6">
        <DialogTitle className="text-left text-lg font-semibold">
          Deactivation Confirmation
        </DialogTitle>

        <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-5">
          <DetailField label="ID" value={item?.id ?? "—"} />

          <div>
            <p className="text-sm font-medium">Name</p>
            <div className="relative group mt-1">
              <div
                className="text-base "
                style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                title={item?.name ?? "—"}
              >
                {item?.name ?? "—"}
              </div>

              <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-50 w-96 max-w-[80vw] rounded-md border bg-white p-3 text-sm shadow-lg">
                <div className="text-xs font-medium">Full name</div>
                <div className="mt-1 text-sm break-words">{item?.name ?? "—"}</div>
                <div className="mt-2 text-xs font-medium">
                  ID: {item?.id ?? "—"} • Type: {formatTypeLabel(item?.document_type ?? item?.type)} • Version: {formatVersion(item?.version ?? item?.current_version)} • Uploaded By: {item?.uploaded_by ?? item?.created_by ?? "—"}
                </div>
              </div>
            </div>
          </div>

          <DetailField
            label="Type"
            value={formatTypeLabel(item?.document_type ?? item?.type)}
          />
          <DetailField
            label="Version"
            value={formatVersion(item?.version ?? item?.current_version)}
          />
          <div className="col-span-2">
            <DetailField
              label="Uploaded By"
              value={item?.uploaded_by ?? item?.created_by ?? "—"}
            />
          </div>
        </div>

        <div className="my-6 border-t border-gray-200" />

        {showConfirm ? (
          <div className="mt-2">
            <p className="text-sm text-gray-700">
              Please Note: This action is permanent. Once deactivated, this item cannot be re-activated or edited. It will only be available here for viewing by admins
            </p>
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={Boolean(isProcessing)}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceed}
                disabled={Boolean(isProcessing)}
                className="rounded-lg bg-red-700 px-6 py-2.5 text-sm text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? "Working..." : "Proceed"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full">
              <Label
                htmlFor="deactivate-remark"
                className="text-sm font-medium"
              >
                Deactivation Remarks
              </Label>
              <Textarea
                id="deactivate-remark"
                placeholder="Type here..."
                value={remark}
                onChange={(event) => {
                  setRemark(event.target.value);
                  if (remarkError) setRemarkError("");
                }}
                required
                aria-required="true"
                aria-invalid={Boolean(remarkError)}
                aria-describedby={remarkError ? "deactivate-remark-error" : undefined}
                disabled={Boolean(isProcessing)}
                className="mt-2 min-h-[120px] resize-y rounded-lg border-gray-200 text-sm placeholder:text-gray-400 focus-visible:ring-blue-500"
              />
              {remarkError ? (
                <p id="deactivate-remark-error" className="mt-2 text-sm text-red-600">
                  {remarkError}
                </p>
              ) : null}
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  if (!isProcessing) onClose?.();
                }}
                disabled={Boolean(isProcessing)}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeactivateClick}
                disabled={Boolean(isProcessing)}
                className="rounded-lg bg-red-700 px-6 py-2.5 text-sm text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Deactivate
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
