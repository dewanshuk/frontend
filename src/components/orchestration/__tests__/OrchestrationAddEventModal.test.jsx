import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrchestrationAddEventModal from "../OrchestrationAddEventModal";
import {
  storeOrchestrationEvent,
  updateOrchestrationEvent,
} from "@/api/orchestration";

// --- Mocks ---
jest.mock("@/components/orchestration/OrchestrationAddEventModalStepOne", () => ({
  __esModule: true,
  default: ({ onNextClickHandler }) => (
    <div>
      <button
        data-testid="step1-next"
        onClick={() =>
          onNextClickHandler({
            eventName: "Annual Meet",
            subEventName: "Tech Talk",
            eventDate: "2024-01-01 - 2024-01-05",
            description: "A conference",
            tags: ["tech"],
            status: "ACTIVE",
          })
        }
      >
        Step 1 Next
      </button>
      <button
        data-testid="step1-draft"
        onClick={() =>
          onNextClickHandler({
            eventName: "Annual Meet",
            subEventName: "Tech Talk",
            eventDate: "2024-01-01 - 2024-01-05",
            description: "A conference",
            tags: ["tech"],
            status: "DRAFT",
          })
        }
      >
        Step 1 Draft
      </button>
    </div>
  ),
}));

jest.mock("@/components/orchestration/OrchestrationAddEventModalStepTwo", () => ({
  __esModule: true,
  default: ({ onNextClickHandler }) => (
    <button
      data-testid="step2-next"
      onClick={() => onNextClickHandler({ files: [] })}
    >
      Step 2 Next
    </button>
  ),
}));

jest.mock("@/components/orchestration/OrchestrationAddEventModalStepThree", () => ({
  __esModule: true,
  default: ({ onNextClickHandler }) => (
    <button
      data-testid="step3-publish"
      onClick={() =>
        onNextClickHandler({ applicability_type: "ALL", status: "ACTIVE" })
      }
    >
      Publish
    </button>
  ),
}));

jest.mock("@/components/shared/StepNavbar", () => ({
  __esModule: true,
  default: () => <div data-testid="step-navbar" />,
}));

jest.mock("@/hooks/useUI", () => ({
  __esModule: true,
  default: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    Toast: () => null,
  }),
}));

jest.mock("@/api/orchestration", () => ({
  storeOrchestrationDocument: jest.fn(),
  updateOrchestrationDocument: jest.fn(),
  storeOrchestrationEvent: jest.fn(),
  updateOrchestrationEvent: jest.fn(),
  getOrchestrationItems: jest.fn(),
  toggleOrchestrationItemStatus: jest.fn(),
  getOrchestrationKPIs: jest.fn(),
  getOrchestrationConfig: jest.fn(),
  getOrchestrationLinkedOptions: jest.fn(),
  EventFileVerificationError: class EventFileVerificationError extends Error {
    constructor(failedFiles = [], fileMetadata = []) {
      super("Verification failed");
      this.name = "EventFileVerificationError";
      this.failedFiles = failedFiles;
      this.fileMetadata = fileMetadata;
    }
  },
}));

// --- Tests ---

describe("OrchestrationAddEventModal", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders 'Add Event' title in create mode", () => {
    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="create"
        onSuccess={jest.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /add event/i })).toBeInTheDocument();
  });

  it("renders 'Edit Event' title in edit mode", () => {
    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        eventId="EVT-001"
        onSuccess={jest.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /edit event/i })).toBeInTheDocument();
  });

  it("renders nothing when isOpen is false", () => {
    render(
      <OrchestrationAddEventModal
        isOpen={false}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="create"
        onSuccess={jest.fn()}
      />,
    );
    expect(screen.queryByRole("heading", { name: /add event/i })).not.toBeInTheDocument();
  });

  it("calls setIsOpen(false) when × is clicked", async () => {
    const user = userEvent.setup();
    const setIsOpen = jest.fn();
    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={setIsOpen}
        orchestrationConfig={{}}
        mode="create"
        onSuccess={jest.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "×" }));
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("advances from step 1 to step 2 when Step 1 Next is clicked", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="create"
        onSuccess={jest.fn()}
      />,
    );

    expect(screen.getByTestId("step1-next")).toBeInTheDocument();
    await user.click(screen.getByTestId("step1-next"));
    expect(screen.getByTestId("step2-next")).toBeInTheDocument();
  });

  it("calls storeOrchestrationEvent in create mode on step 3 Publish", async () => {
    const user = userEvent.setup();
    storeOrchestrationEvent.mockResolvedValue({ status: 201 });
    const onSuccess = jest.fn();

    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="create"
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByTestId("step1-next"));
    await user.click(screen.getByTestId("step2-next"));
    await user.click(screen.getByTestId("step3-publish"));

    await waitFor(() => {
      expect(storeOrchestrationEvent).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("shows Change Remarks popup in edit mode on step 3 Publish (ACTIVE)", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        eventId="EVT-001"
        onSuccess={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId("step1-next"));
    await user.click(screen.getByTestId("step2-next"));
    await user.click(screen.getByTestId("step3-publish"));

    expect(screen.getByRole("heading", { name: /change remarks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publish now/i })).toBeInTheDocument();
  });

  it("shows validation error if change remarks is empty on Publish Now", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        eventId="EVT-001"
        onSuccess={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId("step1-next"));
    await user.click(screen.getByTestId("step2-next"));
    await user.click(screen.getByTestId("step3-publish"));
    await user.click(screen.getByRole("button", { name: /publish now/i }));

    expect(screen.getByText(/change remarks is required/i)).toBeInTheDocument();
    expect(updateOrchestrationEvent).not.toHaveBeenCalled();
  });

  it("calls updateOrchestrationEvent after entering change remarks", async () => {
    const user = userEvent.setup();
    updateOrchestrationEvent.mockResolvedValue({ status: 200 });
    const onSuccess = jest.fn();

    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        eventId="EVT-001"
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByTestId("step1-next"));
    await user.click(screen.getByTestId("step2-next"));
    await user.click(screen.getByTestId("step3-publish"));
    await user.type(
      screen.getByPlaceholderText(/describe what changed/i),
      "Updated event details",
    );
    await user.click(screen.getByRole("button", { name: /publish now/i }));

    await waitFor(() => {
      expect(updateOrchestrationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "EVT-001",
          data: expect.objectContaining({ change_remarks: "Updated event details" }),
        }),
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("shows DRAFT Change Remarks popup in edit mode (step 1 draft)", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        eventId="EVT-001"
        onSuccess={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId("step1-draft"));

    expect(screen.getByRole("heading", { name: /change remarks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save as draft/i })).toBeInTheDocument();
  });

  it("closes the Change Remarks popup when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddEventModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        eventId="EVT-001"
        onSuccess={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId("step1-next"));
    await user.click(screen.getByTestId("step2-next"));
    await user.click(screen.getByTestId("step3-publish"));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("heading", { name: /change remarks/i })).not.toBeInTheDocument();
  });
});
