import { useCallback, useEffect, useRef, useState } from "react";
import OrchestrationModalStepOne from "./OrchestrationAddEventModalStepOne";
import OrchestrationModalStepThree from "./OrchestrationAddEventModalStepThree";
import OrchestrationModalStepTwo from "./OrchestrationAddEventModalStepTwo";
import StepNavbar from "../shared/StepNavbar";
import {
  storeOrchestrationEvent,
  updateOrchestrationEvent,
  EventFileVerificationError,
} from "../../api/orchestration";
import moment from "moment";
import { Loader2 } from "lucide-react";
import PublishConfirmationModal from "./PublishConfirmationModal";
import InvalidFilesConfirmationModal from "./InvalidFilesConfirmationModal";
import useUI from "../../hooks/useUI";
import { DATE_FORMAT_MOMENT } from "../../config";

// Show backend message on 400 validation errors; fall back to a generic message otherwise.
const resolveErrorMessage = (errOrResponse, fallback) => {
  if (errOrResponse instanceof EventFileVerificationError) {
    return errOrResponse.message;
  }
  const status = errOrResponse?.response?.status ?? errOrResponse?.status;
  const message =
    errOrResponse?.response?.data?.message ?? errOrResponse?.data?.message;
  if (status === 400 && message) return message;
  return fallback;
};

const formatApplicabilityRefs = (data) => {
  if (Array.isArray(data?.applicability_refs?.emails)) {
    return {
      ...data,
      applicability_refs: data.applicability_refs.emails.map(({ value }) => value),
    };
  }
  return data;
};

const steps = [
  {
    id: 1,
    label: "Details",
    icon: (
      <img
        src="/assets/icons/orch/modal-details.svg"
        alt="Active"
        className="w-6 h-6"
      />
    ),
  },
  {
    id: 2,
    label: "Event Files",
    icon: (
      <img
        src="/assets/icons/orch/modal-link.svg"
        alt="Active"
        className="w-6 h-6"
      />
    ),
  },
  {
    id: 3,
    label: "Applicability",
    icon: (
      <img
        src="/assets/icons/orch/check-square.svg"
        alt="Active"
        className="w-6 h-6"
      />
    ),
  },
];

/* ------------------ API Formatter ------------------ */
const parseEventRangePart = (part) => {
  const raw = String(part || "").trim();
  if (!raw) return null;
  const parsed = moment(raw, DATE_FORMAT_MOMENT, true);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
};

const formatAPIModel = (data) => {
  const parts = String(data?.eventDate || "")
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const start_date = parseEventRangePart(parts[0]);
  const end_date = parseEventRangePart(parts[1]);

  return {
  event_name: data.eventName,
  sub_event_name: data.subEventName,
  event_dates: start_date && end_date ? [start_date, end_date] : undefined,
  description: data.description,
  tags: data.tags,
}};

const buildSubmissionData = (stepOneData, stepTwoData, stepThreeData) => {
  const data = {
    ...formatAPIModel(stepOneData),
    ...stepTwoData,
    ...stepThreeData,
  };
  return formatApplicabilityRefs(data);
};

export default function OrchestrationAddEventModal({
  isOpen,
  setIsOpen,
  orchestrationConfig,
  mode = "create",
  eventId,
  initialStepData,
  onSuccess,
}) {
  const { success, error, warning, Toast } = useUI();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedUpTo, setCompletedUpTo] = useState(mode === "edit" ? 3 : 1);
  const [data, setData] = useState({});
  const [isLoading, setLoading] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const handleBackClick = () => {
    persistCurrentStepData();
    setCurrentStep((prev) => prev - 1);
  };

  // Prevent forward navigation from top stepper when in edit mode
  const safeSetCurrentStep = (stepId) => {
    if (mode === "edit" && stepId > currentStep) return;
    if (stepId === currentStep) return;
    persistCurrentStepData();
    setCurrentStep(stepId);
  };

  const [stepOneData, setStepOneData] = useState();
  const [stepTwoData, setStepTwoData] = useState();
  const [stepThreeData, setStepThreeData] = useState();
  const [changeRemarks, setChangeRemarks] = useState("");
  const [changeRemarksError, setChangeRemarksError] = useState("");
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [publishConfirm, setPublishConfirm] = useState(null);
  const [invalidFilesConfirm, setInvalidFilesConfirm] = useState(null);

  const isOriginallyDraft =
    mode === "edit" &&
    String(initialStepData?.stepOneData?.status || "").toUpperCase() === "DRAFT";
  const stepDataRef = useRef({ 1: null, 2: null, 3: null });

  const persistCurrentStepData = useCallback(() => {
    const data = stepDataRef.current[currentStep];
    if (!data) return;

    if (currentStep === 1) setStepOneData(data);
    if (currentStep === 2) setStepTwoData(data);
    if (currentStep === 3) setStepThreeData(data);
  }, [currentStep]);

  const handleStepDataChange = useCallback((step, data) => {
    stepDataRef.current[step] = data;
  }, []);

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
      setInvalidFilesConfirm(null);
      stepDataRef.current = { 1: null, 2: null, 3: null };
      return;
    }

    setCurrentStep(1);
    setCompletedUpTo(mode === "edit" ? 3 : 1);
    setStepOneData(initialStepData?.stepOneData);
    setStepTwoData(initialStepData?.stepTwoData);
    setStepThreeData(initialStepData?.stepThreeData);
    setChangeRemarks("");
    setChangeRemarksError("");
    setPendingSubmission(null);
    setInvalidFilesConfirm(null);
    stepDataRef.current = {
      1: initialStepData?.stepOneData ?? null,
      2: initialStepData?.stepTwoData ?? null,
      3: initialStepData?.stepThreeData ?? null,
    };
  }, [initialStepData, isOpen, mode]);

  const validateChangeRemarks = () => {
    if (mode !== "edit" || isOriginallyDraft) {
      return true;
    }

    if (changeRemarks.trim()) {
      setChangeRemarksError("");
      return true;
    }

    setChangeRemarksError("Change remarks is required when editing an event.");
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

  const saveEventRequest = async ({ data, files, file_metadata }) => {
    if (mode === "edit") {
      if (!eventId) {
        throw new Error("Event ID is required for update.");
      }

      return updateOrchestrationEvent({
        id: eventId,
        data: {
          ...data,
          change_remarks: changeRemarks.trim(),
        },
        files,
        file_metadata,
      });
    }

    return storeOrchestrationEvent({ data, files, file_metadata });
  };

  const getEventFiles = (overrideFiles) => {
    if (Array.isArray(overrideFiles)) {
      return overrideFiles;
    }

    if (Array.isArray(stepTwoData?.files)) {
      return stepTwoData.files;
    }

    if (Array.isArray(initialStepData?.stepTwoData?.files)) {
      return initialStepData.stepTwoData.files;
    }

    return [];
  };

  const handleVerificationError = (err, { data, files, kind }) => {
    if (!(err instanceof EventFileVerificationError)) {
      return false;
    }

    setInvalidFilesConfirm({
      failedFiles: err.failedFiles || [],
      fileMetadata: err.fileMetadata || [],
      data,
      files,
      kind,
    });
    return true;
  };

  const saveDraft = async (data, files, file_metadata) => {
    setLoading(true);
    try {
      const response = await saveEventRequest({
        data,
        files: getEventFiles(files),
        file_metadata,
      });
      if (response?.status === 201 || response?.status === 200) {
        onSuccess?.();
        setIsOpen(false);
        success(mode === "edit" ? "Event draft updated." : "Event saved as draft.");
      } else {
        error(
          resolveErrorMessage(
            response,
            "Unable to save draft. Please try again.",
          ),
        );
      }
    } catch (err) {
      console.log({ err });
      if (
        !file_metadata &&
        handleVerificationError(err, { data, files, kind: "draft" })
      ) {
        return;
      }
      error(
        resolveErrorMessage(
          err,
          "Unable to save draft. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
      setIsUploadingFiles(false);
    }
  };

  const submitEvent = async (data, files, file_metadata) => {
    setLoading(true);
    try {
      const response = await saveEventRequest({ data, files, file_metadata });
      if (response?.status === 201 || response?.status === 200) {
        onSuccess?.();
        setIsOpen(false);
        success(mode === "edit" && !isOriginallyDraft ? "Event updated" : "Event created");
      } else {
        error(
          resolveErrorMessage(
            response,
            mode === "edit"
              ? "Unable to update event. Please try again."
              : "Unable to create event. Please try again.",
          ),
        );
      }
    } catch (err) {
      console.log({ err });
      if (
        !file_metadata &&
        handleVerificationError(err, { data, files, kind: "publish" })
      ) {
        return;
      }
      error(
        resolveErrorMessage(
          err,
          mode === "edit"
            ? "Unable to update event. Please try again."
            : "Unable to create event. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
      setIsUploadingFiles(false);
    }
  };

  const closeInvalidFilesConfirm = () => {
    setInvalidFilesConfirm(null);
  };

  const handleProceedWithoutInvalidFiles = () => {
    if (!invalidFilesConfirm) return;

    const {
      data: pendingData,
      files,
      fileMetadata,
      kind,
    } = invalidFilesConfirm;
    closeInvalidFilesConfirm();

    if (kind === "draft") {
      return saveDraft(pendingData, files, fileMetadata);
    }
    return submitEvent(pendingData, files, fileMetadata);
  };

  const executeDraftSave = (temp, step) => {
    const latestStepOne = stepDataRef.current[1] ?? stepOneData;
    const latestStepTwo = stepDataRef.current[2] ?? stepTwoData;

    if (step === 1) {
      const filesToUpload = getEventFiles();
      if (filesToUpload.length > 0) setIsUploadingFiles(true);
      return saveDraft({ ...formatAPIModel(temp) }, filesToUpload);
    }

    if (step === 2) {
      const filesToUpload = getEventFiles(temp?.files);
      if (filesToUpload.length > 0) setIsUploadingFiles(true);
      return saveDraft(
        { ...formatAPIModel(latestStepOne), ...temp },
        filesToUpload,
      );
    }

    // step 3
    const draftData = buildSubmissionData(latestStepOne, latestStepTwo, temp);
    const filesToUpload = getEventFiles();
    if (filesToUpload.length > 0) setIsUploadingFiles(true);
    return saveDraft(draftData, filesToUpload);
  };

  const executeNextStep = (temp, step) => {
    const latestStepOne = stepDataRef.current[1] ?? stepOneData;
    const latestStepTwo = stepDataRef.current[2] ?? stepTwoData;

    if (step < 3) {
      persistCurrentStepData();
      setCurrentStep((prev) => prev + 1);
      setCompletedUpTo((prev) => Math.max(prev, step + 1));
      return;
    }

    const submitData = buildSubmissionData(latestStepOne, latestStepTwo, temp);
    const filesToUpload = getEventFiles();
    if (filesToUpload.length > 0) setIsUploadingFiles(true);
    submitEvent(submitData, filesToUpload);
  };

  const handleSaveDraftClick = (temp, step) => {
    if (mode === "edit" && !isOriginallyDraft) {
      setPendingSubmission({ temp, step, action: "DRAFT" });
      setChangeRemarks("");
      setChangeRemarksError("");
      return;
    }
    executeDraftSave(temp, step);
  };

  const onNextClickHandler = (temp, step) => {
    if (step === 3) {
      const eventName = stepOneData?.eventName || initialStepData?.stepOneData?.eventName || temp?.eventName || "";
      const subEventName = stepOneData?.subEventName || initialStepData?.stepOneData?.subEventName || temp?.subEventName || "";
      const displayName = eventName ? (subEventName ? `${eventName} – ${subEventName}` : eventName) : "this event";
      const replacesDocumentId =
        stepOneData?.replacesDocumentId ??
        initialStepData?.stepOneData?.replacesDocumentId ??
        null;
      setChangeRemarks("");
      setChangeRemarksError("");
      setPublishConfirm({ temp, step, displayName, replacesDocumentId });
      return;
    }

    executeNextStep(temp, step);
  };

  const handleConfirmChangeRemarks = () => {
    if (!validateChangeRemarks() || !pendingSubmission) {
      return;
    }

    if (pendingSubmission.action === "DRAFT") {
      executeDraftSave(pendingSubmission.temp, pendingSubmission.step);
    } else {
      executeNextStep(pendingSubmission.temp, pendingSubmission.step);
    }
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
    executeNextStep(temp, step);
  };

  return (
    <div className="">
      <Toast />
      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          ></div>

          {/* Modal Box */}
          <div className="relative bg-white mx-4 my-0 rounded-2xl shadow-xl p-6 animate-[fadeIn_.2s_ease-out] w-[990px] h-[95%] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center pb-3">
              <h2 className="text-2xl font-medium leading-[1.2] tracking-[-0.48px] text-[#1e1e1e]">
                {mode === "edit" ? "Edit Event" : "Add Event"}
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
            <div className="flex flex-col flex-1 overflow-hidden w-full mt-4">
              <div className="shrink-0 pb-4">
                <StepNavbar
                  steps={steps}
                  setCurrentStep={safeSetCurrentStep}
                  currentStep={currentStep}
                  maxAllowedStep={mode === "edit" ? currentStep : completedUpTo}
                  allowAllSteps={false}
                  disabled
                />
                <hr className="mt-4 border-gray-200" />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                <div
                  className={
                    currentStep === 1
                      ? "flex flex-1 min-h-0 flex-col"
                      : "hidden"
                  }
                >
                  <OrchestrationModalStepOne
                    isLoading={isLoading}
                    initialValues={stepOneData}
                    orchestrationConfig={orchestrationConfig}
                    onValuesChange={(values) => handleStepDataChange(1, values)}
                    onSaveDraftClick={(values) => {
                      stepDataRef.current[1] = values;
                      setStepOneData(values);
                      handleSaveDraftClick(values, 1);
                    }}
                    onNextClickHandler={(values) => {
                      stepDataRef.current[1] = values;
                      setStepOneData(values);
                      onNextClickHandler(values, 1);
                    }}
                  />
                </div>
                <div
                  className={
                    currentStep === 2
                      ? "flex flex-1 min-h-0 flex-col"
                      : "hidden"
                  }
                >
                  <OrchestrationModalStepTwo
                    isLoading={isLoading}
                    initialValues={stepTwoData}
                    onBackClick={handleBackClick}
                    onValuesChange={(values) => handleStepDataChange(2, values)}
                    onSaveDraftClick={(values) => {
                      stepDataRef.current[2] = values;
                      setStepTwoData(values);
                      handleSaveDraftClick(values, 2);
                    }}
                    onNextClickHandler={(values) => {
                      stepDataRef.current[2] = values;
                      setStepTwoData(values);
                      onNextClickHandler(values, 2);
                    }}
                  />
                </div>
                <div
                  className={
                    currentStep === 3
                      ? "flex flex-1 min-h-0 flex-col"
                      : "hidden"
                  }
                >
                  <OrchestrationModalStepThree
                    isLoading={isLoading}
                    initialValues={stepThreeData}
                    orchestrationConfig={orchestrationConfig}
                    onBackClick={handleBackClick}
                    onValuesChange={(values) => handleStepDataChange(3, values)}
                    onSaveDraftClick={(values) => {
                      stepDataRef.current[3] = values;
                      setStepThreeData(values);
                      handleSaveDraftClick(values, 3);
                    }}
                    onNextClickHandler={(values) => {
                      stepDataRef.current[3] = values;
                      setStepThreeData(values);
                      onNextClickHandler(values, 3);
                    }}
                  />
                </div>
              </div>

            {isUploadingFiles ? (
              <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl bg-black/40">
                <div className="flex items-center gap-3 bg-transparent p-4 rounded">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                  <div className="text-white">
                    <p className="font-medium">Uploading files...</p>
                    <p className="text-sm opacity-90">Please wait while attachments upload.</p>
                  </div>
                </div>
              </div>
            ) : null}
            {publishConfirm ? (
              <PublishConfirmationModal
                displayName={publishConfirm.displayName}
                fallbackName="this event"
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
                replacesDocumentId={publishConfirm.replacesDocumentId}
                onClose={closePublishConfirm}
                onConfirm={handleConfirmPublish}
              />
            ) : null}

            {invalidFilesConfirm ? (
              <InvalidFilesConfirmationModal
                failedFiles={invalidFilesConfirm.failedFiles}
                onClose={closeInvalidFilesConfirm}
                onConfirm={handleProceedWithoutInvalidFiles}
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
                      className="rounded-md p-1 hover:border hover:border-gray-400 text-gray-600 hover:bg-gray-100"
                    >
                      ×
                    </button>
                  </div>

                  <p className="mt-2 text-sm text-gray-600">
                    {pendingSubmission.action === "DRAFT"
                      ? "Add change remarks before saving this event as draft."
                      : "Add change remarks before publishing this event."}
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
