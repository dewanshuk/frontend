import { X } from "lucide-react";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600 disabled:opacity-25 disabled:cursor-not-allowed";

export default function PublishConfirmationModal({
  displayName,
  fallbackName = "this item",
  showChangeRemarks = false,
  changeRemarks,
  onChangeRemarks,
  changeRemarksError,
  confirmLabel = "Confirm",
  replacesDocumentId,
  onClose,
  onConfirm,
}) {
  const name = displayName || fallbackName;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-confirmation-title"
        className="relative mx-4 w-full max-w-[569px] overflow-hidden rounded-2xl bg-white font-sans shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg text-[#1e1e1e] transition-colors hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col gap-6 p-10 pt-14">
          <h2
            id="publish-confirmation-title"
            className="text-2xl font-semibold leading-[1.2] tracking-[-0.48px] text-[#1e1e1e]"
          >
            Publish Confirmation
          </h2>

          {showChangeRemarks ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-medium leading-[1.4] text-[#1e1e1e]">
                Change Remarks
              </h3>
              <textarea
                value={changeRemarks}
                onChange={onChangeRemarks}
                rows={4}
                placeholder="Describe what changed..."
                className={`min-h-[80px] w-full resize-y rounded-lg border border-[#d9d9d9] bg-[#f5f5f5] px-4 py-3 text-lg leading-[1.4] text-[#1e1e1e] outline-none placeholder:text-[#b3b3b3] ${
                  changeRemarksError ? "border-red-500" : ""
                }`}
              />
              {changeRemarksError ? (
                <small className="text-red-500">{changeRemarksError}</small>
              ) : null}
            </div>
          ) : null}

          <p className="text-lg leading-[1.4] text-[#1e1e1e]">
            <span className="font-normal">Proceed with Publishing of</span>
            <span className="font-medium">{` ‘${name}’.`}</span>
          </p>

          {replacesDocumentId ? (
            <p className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-[15px] leading-[1.4] text-[#1e1e1e]">
              Note: This draft replaces the previously active revision (ID: {replacesDocumentId}). The
              previous revision will remain available in the current document’s revision history.
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <button type="button" onClick={onClose} className={primaryButtonClass}>
              Cancel
            </button>
            <button type="button" onClick={onConfirm} className={primaryButtonClass}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
