import { useCallback, useEffect, useRef, useState } from "react";
import OrchestrationModalStepOne from "./OrchestrationAddDocumentModalStepOne";
import OrchestrationModalStepThree from "./OrchestrationAddDocumentModalStepThree";
import OrchestrationModalStepTwo from "./OrchestrationAddDocumentModalStepTwo";
import StepNavbar from "../shared/StepNavbar";
import Loader from "../../atoms/loader";
import {
  storeOrchestrationDocument,
  updateOrchestrationDocument,
} from "../../api/orchestration";
import useUI from "../../hooks/useUI";
import PublishConfirmationModal from "./PublishConfirmationModal";
import moment from "moment/moment";
import { DATE_FORMAT_MOMENT } from "../../config";

const STEP_ICON_CONFIG = {
  1: "/assets/icons/orch/modal-details.svg",
  2: "/assets/icons/orch/modal-link.svg",
  3: "/assets/icons/orch/check-square.svg",
};

// Show backend message on 400 validation errors; fall back to a generic message otherwise.
const resolveErrorMessage = (errOrResponse, fallback) => {
  const status = errOrResponse?.response?.status ?? errOrResponse?.status;
  const message =
    errOrResponse?.response?.data?.message ?? errOrResponse?.data?.message;
  if (status === 400 && message) return message;
  return fallback;
};

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Linked Items" },
  { id: 3, label: "Applicability" },
];

const createStepsWithIcons = () =>
  STEPS.map((step) => ({
    ...step,
    icon: (
      <img
        src={STEP_ICON_CONFIG[step.id]}
        alt={step.label}
        className="w-6 h-6"
      />
    ),
  }));

const API_NEXT_REVIEW_DATE_FORMAT = "DD/MM/YYYY";

const formatNextReviewDate = (dateStr) => {
  if (!dateStr) return undefined;
  const parsed = moment(
    dateStr,
    [DATE_FORMAT_MOMENT, API_NEXT_REVIEW_DATE_FORMAT, moment.ISO_8601],
    true,
  );
  if (parsed.isValid()) return parsed.format(API_NEXT_REVIEW_DATE_FORMAT);
  const fallback = moment(dateStr);
  return fallback.isValid()
    ? fallback.format(API_NEXT_REVIEW_DATE_FORMAT)
    : dateStr;
};

const formatStepOneAPIModel = (data) => ({
  name: data?.name || undefined,
  document_type: data?.documentType || undefined,
  legislation_id: data?.legislation || undefined,
  sub_legislation_id: data?.subLegislation || undefined,
  version: data?.version || undefined,
  next_review_date: formatNextReviewDate(data?.reviewDate),
  summary: data?.summary || undefined,
  tags: data?.tags || undefined,
  download_allowed: data?.downloadAllowed ?? undefined,
  status: data?.status || undefined,
});

const formatApplicabilityRefs = (data) => {
  if (Array.isArray(data?.applicability_refs?.emails)) {
    return {
      ...data,
      applicability_refs: data.applicability_refs.emails.map(({ value }) => value),
    };
  }
  return data;
};

const buildSubmissionData = (stepOneData, stepTwoData, stepThreeData) => {
  const stepTwo = { ...stepTwoData };
  // When stepTwoData came from initialStepData (UI rows shape) rather than
  // Step 2's form submission, linked_document_ids won't be present yet.
  // Derive it from rows so linked items are never dropped on a draft save.
  if (!Array.isArray(stepTwo.linked_document_ids) && Array.isArray(stepTwo.rows)) {
    stepTwo.linked_document_ids = stepTwo.rows
      .map((r) => r.linkedItem?.id)
      .filter(Boolean);
  }
  const data = {
    ...formatStepOneAPIModel(stepOneData),
    ...stepTwo,
    ...stepThreeData,
  };
  return formatApplicabilityRefs(data);
};

export default function OrchestrationAddDocumentModal({
  isOpen,
  setIsOpen,
  orchestrationConfig,
  mode = "create",
  documentId,
  initialStepData,
  onSuccess,
}) {
  const { success, error, warning, Toast } = useUI();
  const [isLoading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedUpTo, setCompletedUpTo] = useState(1);
  const [stepOneData, setStepOneData] = useState();
  const [stepTwoData, setStepTwoData] = useState();
  const [stepThreeData, setStepThreeData] = useState();
  const [changeRemarks, setChangeRemarks] = useState("");
  const [changeRemarksError, setChangeRemarksError] = useState("");
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [publishConfirm, setPublishConfirm] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState("");
  const stepDataRef = useRef({ 1: null, 2: null, 3: null });

  const isFAQ = String(selectedDocType || "").toLowerCase().includes("faq");

  // A document that was only ever a draft (never published) is treated as a
  // first-time creation: no change remarks required, success = "Document created".
  const isOriginallyDraft =
    mode === "edit" &&
    String(initialStepData?.stepOneData?.status || "").toUpperCase() === "DRAFT";

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setCompletedUpTo(mode === "edit" ? 3 : 1);
      setStepOneData(undefined);
      setStepTwoData(undefined);
      setStepThreeData(undefined);
      setChangeRemarks("");
      setChangeRemarksError("");
      setPendingSubmission(null);
      setPublishConfirm(null);
      setSelectedDocType("");
      return;
    }

    setCurrentStep(1);
    setCompletedUpTo(1);
    setStepOneData(initialStepData?.stepOneData);
    setStepTwoData(initialStepData?.stepTwoData);
    setStepThreeData(initialStepData?.stepThreeData);
    setChangeRemarks("");
    setChangeRemarksError("");
    setPendingSubmission(null);
    setSelectedDocType(initialStepData?.stepOneData?.documentType || "");
    stepDataRef.current = {
      1: initialStepData?.stepOneData ?? null,
      2: initialStepData?.stepTwoData ?? null,
      3: initialStepData?.stepThreeData ?? null,
    };
  }, [initialStepData, isOpen]);

  const handleStepDataChange = useCallback((step, data) => {
    stepDataRef.current[step] = data;
  }, []);

  const persistCurrentStepData = useCallback(() => {
    const data = stepDataRef.current[currentStep];
    if (!data) return;
    if (currentStep === 1) setStepOneData(data);
    if (currentStep === 2) setStepTwoData(data);
    if (currentStep === 3) setStepThreeData(data);
  }, [currentStep]);

  const validateChangeRemarks = () => {
    if (mode !== "edit" || isOriginallyDraft) {
      return true;
    }

    if (changeRemarks.trim()) {
      setChangeRemarksError("");
      return true;
    }

    setChangeRemarksError("Change remarks is required when editing a document.");
    return false;
  };

  const closePublishConfirm = () => {
    setPublishConfirm(null);
    setChangeRemarks("");
    setChangeRemarksError("");
  };

  const closeChangeRemarksPopup = () => {
    setPendingSubmission(null);
    setChangeRemarks("");
    setChangeRemarksError("");
  };

  const saveDocumentRequest = async ({ data, files }) => {
    if (mode === "edit") {
      if (!documentId) {
        throw new Error("Document ID is required for update.");
      }
      return updateOrchestrationDocument({
        id: documentId,
        data: {
          ...data,
          change_remarks: changeRemarks.trim(),
        },
        files,
      });
    }

    return storeOrchestrationDocument({ data, files });
  };

  const saveDraft = async (data, files) => {
    setLoading(true);
    try {
      const response = await saveDocumentRequest({ data, files });
      if (response?.status === 201 || response?.status === 200) {
        onSuccess?.();
        setIsOpen(false);
        success(
          mode === "edit"
            ? "Document draft updated."
            : "Document saved as draft.",
        );
      } else {
        error(
          resolveErrorMessage(
            response,
            "Unable to save draft. Please try again.",
          ),
        );
      }
    } catch (err) {
      console.error("Draft save failed:", err);
      error(
        resolveErrorMessage(
          err,
          "Unable to save draft. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const submitDocument = async (data, files) => {
    setLoading(true);
    try {
      const response = await saveDocumentRequest({ data, files });
      if (response?.status === 201 || response?.status === 200) {
        onSuccess?.();
        setIsOpen(false);
        success(mode === "edit" && !isOriginallyDraft ? "Document updated" : "Document created");
      } else {
        error(
          resolveErrorMessage(
            response,
            mode === "edit"
              ? "Unable to update document. Please try again."
              : "Unable to create document. Please try again.",
          ),
        );
      }
    } catch (err) {
      console.error("Document submission failed:", err);
      error(
        resolveErrorMessage(
          err,
          mode === "edit"
            ? "Unable to update document. Please try again."
            : "Unable to create document. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const executeStepAction = (temp, step) => {
    const isDraft = temp.status === "DRAFT";

    // If FAQ is selected in step 1, skip step 2 (Linked Items) and go to step 3
    const isFAQStepOne =
      step === 1 &&
      String(temp?.documentType || "").toLowerCase().includes("faq");

    if (isFAQStepOne) {
      setCurrentStep(3);
      setCompletedUpTo((prev) => Math.max(prev, 3));
      return;
    }

    if (isDraft && step < 3) {
      // Always include accumulated data from all steps so that fields set on
      // later pages (e.g. linked documents from step 2) are not lost when the
      // user saves as draft from an earlier page.
      const draftData =
        step === 1
          ? buildSubmissionData(temp, stepTwoData, stepThreeData)
          : buildSubmissionData(stepOneData, temp, stepThreeData);
      return saveDraft(draftData, temp?.files || stepOneData?.files);
    }

    if (isDraft && step === 3) {
      const draftData = buildSubmissionData(stepOneData, stepTwoData, temp);
      return saveDraft(draftData, stepOneData?.files);
    }

    if (step < 3) {
      setCurrentStep((prev) => prev + 1);
      setCompletedUpTo((prev) => Math.max(prev, step + 1));
      return;
    }

    const submitData = buildSubmissionData(stepOneData, stepTwoData, temp);
    submitDocument(submitData, stepOneData?.files);
  };

  const onNextClickHandler = (temp, step) => {
    const isPublishAction = temp?.status === "ACTIVE" && step === 3;

    if (isPublishAction) {
      const nameFromStepOne = stepOneData?.name || initialStepData?.stepOneData?.name;
      const displayName = nameFromStepOne || temp?.name || "this document";
      setChangeRemarks("");
      setChangeRemarksError("");
      setPublishConfirm({ temp, step, displayName });
      return;
    }

    const requiresChangeRemarksPopup =
      mode === "edit" &&
      !isOriginallyDraft &&
      (temp?.status === "DRAFT" || (step === 3 && temp?.status === "ACTIVE"));

    if (requiresChangeRemarksPopup) {
      setPendingSubmission({ temp, step, action: temp.status });
      setChangeRemarks("");
      setChangeRemarksError("");
      return;
    }

    executeStepAction(temp, step);
  };

  const handleConfirmChangeRemarks = () => {
    if (!validateChangeRemarks() || !pendingSubmission) {
      return;
    }

    executeStepAction(pendingSubmission.temp, pendingSubmission.step);
    closeChangeRemarksPopup();
  };

  const handleConfirmPublish = () => {
    if (!publishConfirm) return;

    const needsChangeRemarks = mode === "edit" && !isOriginallyDraft;
    if (needsChangeRemarks && !validateChangeRemarks()) {
      return;
    }

    const { temp, step } = publishConfirm;
    setPublishConfirm(null);
    executeStepAction(temp, step);
  };

  const STEP_COMPONENTS = {
    1: OrchestrationModalStepOne,
    2: OrchestrationModalStepTwo,
    3: OrchestrationModalStepThree,
  };

  const STEP_SETTERS = {
    1: setStepOneData,
    2: setStepTwoData,
    3: setStepThreeData,
  };

  const STEP_DATA = {
    1: stepOneData,
    2: stepTwoData,
    3: stepThreeData,
  };

  const handleBackClick = () => {
    persistCurrentStepData();
    if (isFAQ && currentStep === 3) {
      setCurrentStep(1);
      return;
    }
    setCurrentStep((prev) => prev - 1);
  };

  // Prevent forward navigation from top stepper when in edit mode
  const safeSetCurrentStep = (stepId) => {
    if (mode === "edit" && stepId > currentStep) return;
    if (isFAQ && stepId === 2) return;
    setCurrentStep(stepId);
  };

  const renderStepComponent = (step) => {
    const Component = STEP_COMPONENTS[step];
    const setSetter = STEP_SETTERS[step];
    const initialValues = STEP_DATA[step];

    return (
      <Component
        isLoading={isLoading}
        initialValues={initialValues}
        orchestrationConfig={orchestrationConfig}
        onBackClick={step > 1 ? handleBackClick : undefined}
        mode={mode}
        requireTags={mode === "create"}
        onDocTypeChange={step === 1 ? setSelectedDocType : undefined}
        onValuesChange={(data) => handleStepDataChange(step, data)}
        onNextClickHandler={(values) => {
          onNextClickHandler(values, step);
          setSetter(values);
          if (step === 1) {
            setSelectedDocType(values?.documentType || "");
          }
        }}
      />
    );
  };

  return (
    <div className="">
      <Toast />
      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          ></div>

          {/* Modal Box */}
          <div className="relative bg-white mx-4 my-0 rounded-2xl shadow-xl p-8 animate-[fadeIn_.2s_ease-out] w-[990px] h-[95%] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center pb-3">
              <h2 className="text-2xl font-medium leading-[1.2] tracking-[-0.48px] text-[#1e1e1e]">
                {mode === "edit" ? "Edit Document" : "Add Document"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-[#757575] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col flex-1 overflow-hidden w-full">
              <div className="shrink-0 pb-3">
               <StepNavbar
                 steps={isFAQ ? createStepsWithIcons().filter(s => s.id !== 2) : createStepsWithIcons()}
                 setCurrentStep={safeSetCurrentStep}
                 currentStep={currentStep}
                 maxAllowedStep={mode === "edit" ? currentStep : completedUpTo}
                 allowAllSteps={false}
                 disabled
               />
               <hr className="mt-4 border-gray-200" />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="w-full h-80 flex items-center justify-center">
                  <Loader />
                </div>
              ) : (
                renderStepComponent(currentStep)
              )}
            </div>

            {publishConfirm ? (
              <PublishConfirmationModal
                displayName={publishConfirm.displayName}
                fallbackName="this document"
                showChangeRemarks={mode === "edit" && !isOriginallyDraft}
                changeRemarks={changeRemarks}
                onChangeRemarks={(e) => {
                  setChangeRemarks(e.target.value);
                  if (changeRemarksError && e.target.value.trim()) {
                    setChangeRemarksError("");
                  }
                }}
                changeRemarksError={changeRemarksError}
                confirmLabel={
                  mode === "edit" && !isOriginallyDraft ? "Publish Now" : "Confirm"
                }
                onClose={closePublishConfirm}
                onConfirm={handleConfirmPublish}
              />
            ) : null}

            {pendingSubmission ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/40">
                <div className="w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Change Remarks</h3>
                    <button
                      type="button"
                      onClick={closeChangeRemarksPopup}
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-[#757575] transition-colors hover:bg-[#f5f5f5] hover:text-[#1e1e1e]"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>

                  <p className="mt-2 text-sm text-gray-600">
                    {pendingSubmission.action === "DRAFT"
                      ? "Add change remarks before saving this document as draft."
                      : "Add change remarks before publishing this document."}
                  </p>

                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">
                      Change Remarks*
                    </label>
                    <textarea
                      value={changeRemarks}
                      onChange={(e) => {
                        setChangeRemarks(e.target.value);
                        if (changeRemarksError && e.target.value.trim()) {
                          setChangeRemarksError("");
                        }
                      }}
                      rows={4}
                      placeholder="Describe what changed..."
                      className={`w-full border rounded-lg px-3 py-2 ${
                        changeRemarksError ? "border-red-500" : ""
                      }`}
                    />
                    <small className="text-red-500">{changeRemarksError}</small>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeChangeRemarksPopup}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmChangeRemarks}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                    >
                      {pendingSubmission.action === "DRAFT"
                        ? "Save as Draft"
                        : "Publish Now"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
