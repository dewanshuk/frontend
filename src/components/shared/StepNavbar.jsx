export default function StepNavbar({
  steps,
  setCurrentStep,
  currentStep = 1,
  maxAllowedStep = 1,
  allowAllSteps = false,
  disabled = false,
}) {
  const handleStepClick = (stepId) => {
    if (disabled) return;
    if (allowAllSteps || stepId <= maxAllowedStep) setCurrentStep(stepId);
  };

  return (
    <div className="flex w-full items-start font-sans">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const isAllowed = !disabled && (allowAllSteps || step.id <= maxAllowedStep);
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;
        const isHighlighted = isActive || isCompleted;

        // Connectors only between steps — no leading/trailing line on the ends.
        const showLeftConnector = !isFirst;
        const showRightConnector = !isLast;
        const leftFilled = currentStep >= step.id;
        const rightFilled = currentStep > step.id;

        return (
          <div
            key={step.id}
            role="button"
            tabIndex={isAllowed ? 0 : -1}
            onClick={() => handleStepClick(step.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleStepClick(step.id);
              }
            }}
            className={`flex min-w-0 flex-1 flex-col items-stretch gap-3 ${
              disabled
                ? "cursor-default"
                : isAllowed
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-50"
            }`}
          >
            <div className="flex w-full items-center gap-2">
              <div
                className={`h-0.5 min-w-px flex-1 ${
                  showLeftConnector
                    ? leftFilled
                      ? "bg-[#2563eb]"
                      : "bg-[rgba(107,114,128,0.25)]"
                    : "bg-transparent"
                }`}
              />
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg leading-4 tracking-[0.09px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05)] ${
                  isHighlighted
                    ? "bg-[#2563eb] text-[#f3f3f3]"
                    : "bg-[#f3f4f6] text-[#1e1e1e]"
                }`}
              >
                {index + 1}
              </div>
              <div
                className={`h-0.5 min-w-px flex-1 ${
                  showRightConnector
                    ? rightFilled
                      ? "bg-[#2563eb]"
                      : "bg-[rgba(107,114,128,0.25)]"
                    : "bg-transparent"
                }`}
              />
            </div>

            <div
              className={`flex w-full items-center justify-center gap-2 text-lg leading-[1.4] text-[#1e1e1e] ${
                isHighlighted ? "font-medium" : "font-normal"
              }`}
            >
              {step.icon ? (
                <span className="inline-flex size-6 shrink-0 items-center justify-center [&>img]:size-full [&>svg]:size-full">
                  {step.icon}
                </span>
              ) : null}
              <span>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
