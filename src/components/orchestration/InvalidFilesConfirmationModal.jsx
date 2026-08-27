import { X } from "lucide-react";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600 disabled:opacity-25 disabled:cursor-not-allowed";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-[#d9d9d9] bg-white px-6 py-3 text-lg font-semibold leading-[1.4] text-[#1e1e1e] transition-colors hover:bg-[#f5f5f5]";

export default function InvalidFilesConfirmationModal({
  failedFiles = [],
  onClose,
  onConfirm,
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invalid-files-confirmation-title"
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
            id="invalid-files-confirmation-title"
            className="text-2xl font-semibold leading-[1.2] tracking-[-0.48px] text-[#1e1e1e]"
          >
            Invalid Files Detected
          </h2>

          <p className="text-lg leading-[1.4] text-[#1e1e1e]">
            The following file{failedFiles.length === 1 ? "" : "s"} failed
            verification and will be excluded if you continue:
          </p>

          <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-6 text-lg leading-[1.4] text-[#1e1e1e]">
            {failedFiles.map((name) => (
              <li key={name} className="break-all font-medium">
                {name}
              </li>
            ))}
          </ul>

          <p className="text-lg leading-[1.4] text-[#1e1e1e]">
            Do you want to proceed without invalid files?
          </p>

          <div className="flex items-center justify-between gap-4">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="button" onClick={onConfirm} className={primaryButtonClass}>
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
