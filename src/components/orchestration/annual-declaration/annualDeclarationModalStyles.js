/** Shared shell + field styles for Annual Declaration Add/Filter Dialogs */

export const dialogContentClass =
  "max-w-2xl max-h-[90vh] overflow-x-hidden overflow-y-auto rounded-2xl px-7 py-6";

export const dialogHeaderClass = "border-b border-slate-200 pb-5";

export const dialogTitleClass = "text-[18px] font-semibold text-gray-900";

export const formGridClass = "mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2";

export const fieldGroupClass = "relative min-w-0 space-y-1.5";

export const fieldLabelClass = "text-sm font-medium text-slate-800";

/**
 * Plain native select, matching the Add Document modal's Document Type field.
 * Styling `option` (background or colour) makes Chrome paint its own dark
 * highlight, so the options are deliberately left untouched.
 */
export const selectClass =
  "h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-[#1e1e1e] focus:outline-none focus:ring-1 focus:ring-purple-400";

export const calendarIconClass = "text-purple-500";

export const calendarInputClass =
  "!mt-0 flex h-10 w-full !rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400";

export const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50";

export const textButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md px-2 text-sm font-semibold text-blue-600 hover:bg-blue-50";

/** Match Orchestration Docs / Training filter footer (purple). */
export const filterApplyButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-6 text-sm font-bold text-white hover:from-purple-600 hover:to-purple-700 disabled:pointer-events-none disabled:opacity-50";

export const filterResetButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md px-2 text-sm font-bold text-purple-600 hover:bg-purple-50";

export const footerClass = "mt-6 flex items-center justify-between gap-4";

/** Portaled calendar / select menus sit outside DialogContent; don't treat them as dismiss targets. */
export const isDialogPortalTarget = (target) => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      ["[data-date-range-picker-popup]", "[data-searchable-select]"].join(", ")
    )
  );
};

/** Keep the dialog open on any outside interaction; close only via the X button. */
export const dialogNoOutsideCloseProps = {
  onPointerDownOutside: (event) => event.preventDefault(),
  onFocusOutside: (event) => event.preventDefault(),
  onInteractOutside: (event) => event.preventDefault(),
};

export const dialogPortalOutsideProps = {
  onPointerDownOutside: (event) => {
    if (isDialogPortalTarget(event.target)) event.preventDefault();
  },
  onFocusOutside: (event) => {
    if (isDialogPortalTarget(event.target)) event.preventDefault();
  },
  onInteractOutside: (event) => {
    if (isDialogPortalTarget(event.target)) event.preventDefault();
  },
};
