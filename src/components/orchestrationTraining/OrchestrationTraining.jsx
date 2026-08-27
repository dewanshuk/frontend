import OrchestrationTrainingActionBar from "./OrchestrationTrainingActionBar";
import { useState, useMemo } from "react";
import OrchestrationTrainingTable from "./OrchestrationTrainingTable";
import OrchestrationAddTrainingModal, {
  initialTrainingFormValues,
  rowToTrainingFormValues,
} from "./OrchestrationAddTrainingModal";
import OrchestrationTrainingFilterModal, {
  TRAINING_FILTER_INITIAL_VALUES,
} from "./OrchestrationTrainingFilterModal";
import OrchestrationBreadcrumb from "../shared/OrchestrationBreadcrumb";
import CenterToast from "../shared/CenterToast";
import { exportTrainings } from "../../api/trainingApi";
import moment from "moment";


export default function OrchestrationTraining() {
  const [addTrainingModalIsOpen, setAddTrainingModalIsOpen] = useState(false);
  const [filterModalIsOpen, setFilterModalIsOpen] = useState(false);
  const [refreshTableKey, setRefreshTableKey] = useState(0);
  const [trainingFormValues, setTrainingFormValues] = useState(
    initialTrainingFormValues
  );
  const [editTrainingId, setEditTrainingId] = useState(null);
  const [trainingFilters, setTrainingFilters] = useState(
    TRAINING_FILTER_INITIAL_VALUES
  );
  const activeFilterCount = useMemo(() => {
    const f = trainingFilters;
    let count = 0;
    if (Array.isArray(f.training_name) && f.training_name.length > 0) count++;
    if (Array.isArray(f.financial_year) && f.financial_year.length > 0) count++;
    if (f.due_date) count++;
    if (f.assigned_date) count++;
    if (f.closure_date) count++;
    return count;
  }, [trainingFilters]);

  const [toast, setToast] = useState({
    open: false,
    variant: "success",
    message: "",
  });

  const closeToast = () => {
    setToast((currentToast) => ({ ...currentToast, open: false }));
  };

  const showToast = (variant, message) => {
    setToast({ open: true, variant, message });
  };

  const [isExporting, setIsExporting] = useState(false);
  const [tableTotal, setTableTotal] = useState(0);

  const handleExportClick = async () => {
    if (tableTotal === 0) {
      showToast("error", "Nothing to export");
      return;
    }
    setIsExporting(true);
    try {
      const response = await exportTrainings(trainingFilters);
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers?.["content-disposition"];
      const filename =
        disposition?.match(/filename[^;=\n]*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/i)?.[3]?.trim() ??
        disposition?.match(/filename="?([^";\n]+)"?/i)?.[1]?.trim() ??
        `Training_Export_${moment().format("YYYY-MM-DD")}.xlsx`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("success", "Export downloaded successfully.");
    } catch (err) {
      console.error("Export failed:", err);
      showToast("error", "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditTraining = (row) => {
    setTrainingFormValues(rowToTrainingFormValues(row));
    setEditTrainingId(row.training_id);
    setAddTrainingModalIsOpen(true);
  };

  const handleModalClose = (isOpen) => {
    setAddTrainingModalIsOpen(isOpen);
    if (!isOpen) setEditTrainingId(null);
  };

  return (
    <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col bg-[var(--sds-bg-subtle)]">
      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={closeToast}
      />
      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col py-6 md:py-8">
          <OrchestrationBreadcrumb currentPage="e-Module Trainings" />
          {addTrainingModalIsOpen && (
            <OrchestrationAddTrainingModal
              isOpen={addTrainingModalIsOpen}
              setIsOpen={handleModalClose}
              formValues={trainingFormValues}
              setFormValues={setTrainingFormValues}
              trainingId={editTrainingId}
              onSuccess={(response) => {
                setRefreshTableKey((currentValue) => currentValue + 1);
                showToast(
                  "success",
                  response?.message ||
                    response?.Message ||
                    (editTrainingId ? "Training successfully updated." : "Training successfully added."),
                );
              }}
              onError={(err) => {
                // Prefer server-provided message when available; fall back to generic.
                const message = err?.message || err?.response?.data?.message || "Something went wrong. Try again later.";
                showToast("error", message);
              }}
            />
          )}
          <OrchestrationTrainingFilterModal
            currentFilters={trainingFilters}
            onApply={setTrainingFilters}
            isOpen={filterModalIsOpen}
            setIsOpen={setFilterModalIsOpen}
          />
          <div className="shrink-0 overflow-visible">
            <OrchestrationTrainingActionBar
              onFilterClickHandler={() =>
                setFilterModalIsOpen(!filterModalIsOpen)
              }
              activeFilterCount={activeFilterCount}
              onAddTrainingClickHandler={() => {
                setTrainingFormValues(initialTrainingFormValues);
                setEditTrainingId(null);
                setAddTrainingModalIsOpen(true);
              }}
              onExportClick={handleExportClick}
              isExporting={isExporting}
              noRecords={tableTotal === 0}
            />
          </div>
          <div className="mt-0 flex min-h-0 min-w-0 w-full flex-1 flex-col">
            <OrchestrationTrainingTable
              filters={trainingFilters}
              refreshKey={refreshTableKey}
              showToast={showToast}
              onEdit={handleEditTraining}
              onResetFilters={() => setTrainingFilters(TRAINING_FILTER_INITIAL_VALUES)}
              onTotalChange={setTableTotal}
            />
          </div>
        </div>
    </div>
  );
}
