import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrchestrationAddDocumentModal from "../OrchestrationAddDocumentModal";
import {
  storeOrchestrationDocument,
  updateOrchestrationDocument,
} from "@/api/orchestration";

// --- Mocks ---
jest.mock("@/components/orchestration/OrchestrationAddDocumentModalStepOne", () => ({
  __esModule: true,
  default: ({ onNextClickHandler }) => (
    <div>
      <button
        data-testid="step1-next"
        onClick={() =>
          onNextClickHandler({ name: "Test Doc", documentType: "Policy", status: "ACTIVE", files: [] })
        }
      >
        Step 1 Next
      </button>
      <button
        data-testid="step1-draft"
        onClick={() =>
          onNextClickHandler({ name: "Test Doc", documentType: "Policy", status: "DRAFT", files: [] })
        }
      >
        Step 1 Draft
      </button>
    </div>
  ),
}));

jest.mock("@/components/orchestration/OrchestrationAddDocumentModalStepTwo", () => ({
  __esModule: true,
  default: ({ onNextClickHandler }) => (
    <button
      data-testid="step2-next"
      onClick={() => onNextClickHandler({ linked_items: [] })}
    >
      Step 2 Next
    </button>
  ),
}));

jest.mock("@/components/orchestration/OrchestrationAddDocumentModalStepThree", () => ({
  __esModule: true,
  default: ({ onNextClickHandler }) => (
    <div>
      <button
        data-testid="step3-publish"
        onClick={() =>
          onNextClickHandler({ applicability_type: "ALL", status: "ACTIVE" })
        }
      >
        Publish
      </button>
    </div>
  ),
}));

jest.mock("@/components/shared/StepNavbar", () => ({
  __esModule: true,
  default: () => <div data-testid="step-navbar" />,
}));

jest.mock("@/atoms/loader", () => ({
  __esModule: true,
  default: () => <div data-testid="loader" />,
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
}));

// --- Tests ---

describe("OrchestrationAddDocumentModal", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders 'Add Document' title in create mode", () => {
    render(
      <OrchestrationAddDocumentModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="create"
        onSuccess={jest.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /add document/i })).toBeInTheDocument();
  });

  it("renders 'Edit Document' title in edit mode", () => {
    render(
      <OrchestrationAddDocumentModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        documentId="DOC-001"
        onSuccess={jest.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /edit document/i })).toBeInTheDocument();
  });

  it("renders nothing when isOpen is false", () => {
    render(
      <OrchestrationAddDocumentModal
        isOpen={false}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="create"
        onSuccess={jest.fn()}
      />,
    );
    expect(screen.queryByRole("heading", { name: /add document/i })).not.toBeInTheDocument();
  });

  it("calls setIsOpen(false) when × is clicked", async () => {
    const user = userEvent.setup();
    const setIsOpen = jest.fn();
    render(
      <OrchestrationAddDocumentModal
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
      <OrchestrationAddDocumentModal
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
    expect(screen.queryByTestId("step1-next")).not.toBeInTheDocument();
  });

  it("advances from step 2 to step 3 when Step 2 Next is clicked", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="create"
        onSuccess={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId("step1-next"));
    await user.click(screen.getByTestId("step2-next"));
    expect(screen.getByTestId("step3-publish")).toBeInTheDocument();
  });

  it("calls storeOrchestrationDocument in create mode on step 3 Publish", async () => {
    const user = userEvent.setup();
    storeOrchestrationDocument.mockResolvedValue({ status: 201 });
    const onSuccess = jest.fn();

    render(
      <OrchestrationAddDocumentModal
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
      expect(storeOrchestrationDocument).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("shows Change Remarks popup in edit mode on step 3 Publish (ACTIVE)", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        documentId="DOC-001"
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
      <OrchestrationAddDocumentModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        documentId="DOC-001"
        onSuccess={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId("step1-next"));
    await user.click(screen.getByTestId("step2-next"));
    await user.click(screen.getByTestId("step3-publish"));
    await user.click(screen.getByRole("button", { name: /publish now/i }));

    expect(screen.getByText(/change remarks is required/i)).toBeInTheDocument();
    expect(updateOrchestrationDocument).not.toHaveBeenCalled();
  });

  it("calls updateOrchestrationDocument after entering change remarks", async () => {
    const user = userEvent.setup();
    updateOrchestrationDocument.mockResolvedValue({ status: 200 });
    const onSuccess = jest.fn();

    render(
      <OrchestrationAddDocumentModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        documentId="DOC-001"
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByTestId("step1-next"));
    await user.click(screen.getByTestId("step2-next"));
    await user.click(screen.getByTestId("step3-publish"));
    await user.type(
      screen.getByPlaceholderText(/describe what changed/i),
      "Updated policy details",
    );
    await user.click(screen.getByRole("button", { name: /publish now/i }));

    await waitFor(() => {
      expect(updateOrchestrationDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "DOC-001",
          data: expect.objectContaining({ change_remarks: "Updated policy details" }),
        }),
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("shows Change Remarks popup for DRAFT in edit mode (step 1)", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        documentId="DOC-001"
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
      <OrchestrationAddDocumentModal
        isOpen={true}
        setIsOpen={jest.fn()}
        orchestrationConfig={{}}
        mode="edit"
        documentId="DOC-001"
        onSuccess={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId("step1-next"));
    await user.click(screen.getByTestId("step2-next"));
    await user.click(screen.getByTestId("step3-publish"));

    expect(screen.getByRole("heading", { name: /change remarks/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("heading", { name: /change remarks/i })).not.toBeInTheDocument();
  });
});
