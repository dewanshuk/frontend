import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrchestrationAddDocumentModalStepOne from "../OrchestrationAddDocumentModalStepOne";

jest.mock("@/atoms/calendar", () => ({
  __esModule: true,
  default: ({ value, onChange }) => (
    <input
      data-testid="calendar"
      type="date"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const MOCK_CONFIG = {
  documentTypes: [{ value: "Policy", label: "Policy" }],
  legislations: [{ id: "leg1", name: "Legislation A" }],
  subLegislations: [],
};

describe("OrchestrationAddDocumentModalStepOne", () => {
  afterEach(() => jest.clearAllMocks());

  it("shows 'Document Type is required' error on submit with empty form", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText(/document type is required/i)).toBeInTheDocument();
    });
  });

  it("shows 'Name is required' error on submit with empty form", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it("shows 'Document Summary is required' error on submit with empty form", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText(/document summary is required/i)).toBeInTheDocument();
    });
  });

  it("shows tags validation error on submit with no tags", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least one tag is required/i)).toBeInTheDocument();
    });
  });

  it("shows upload error for unsupported file extension", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    const fileInput = container.querySelector("input[type='file']");
    const badFile = new File(["content"], "malware.exe", {
      type: "application/octet-stream",
    });

    await user.upload(fileInput, badFile);

    expect(screen.getByText(/supported file types/i)).toBeInTheDocument();
  });

  it("shows upload error for a file exceeding 30MB", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    const fileInput = container.querySelector("input[type='file']");
    const bigFile = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(bigFile, "size", { value: 31 * 1024 * 1024 });

    await user.upload(fileInput, bigFile);

    expect(screen.getByText(/30MB or smaller/i)).toBeInTheDocument();
  });

  it("shows upload error when more than 6 files are uploaded", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    const fileInput = container.querySelector("input[type='file']");
    // Upload 6 valid files first (one at a time to fill the list)
    for (let i = 0; i < 6; i++) {
      const f = new File(["content"], `file${i}.pdf`, { type: "application/pdf" });
      Object.defineProperty(f, "size", { value: 1024 });
      // eslint-disable-next-line no-await-in-loop
      await user.upload(fileInput, f);
    }

    // Attempt 7th upload
    const extraFile = new File(["content"], "extra.pdf", { type: "application/pdf" });
    Object.defineProperty(extraFile, "size", { value: 1024 });
    await user.upload(fileInput, extraFile);

    expect(screen.getByText(/up to 6 attachments only/i)).toBeInTheDocument();
  });

  it("adds a tag when Enter is pressed in the tag input", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    const tagInput = screen.getByPlaceholderText(/type here to add/i);
    await user.type(tagInput, "compliance{Enter}");

    expect(screen.getByText("compliance")).toBeInTheDocument();
  });

  it("removes a tag when its × button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
        initialValues={{ tags: ["compliance"], files: [] }}
      />,
    );

    expect(screen.getByText("compliance")).toBeInTheDocument();
    // The remove button wraps an svg X icon, so find it by its proximity to the tag text
    const removeButtons = screen.getAllByRole("button");
    // The remove button for the tag is the first inline button (before Save Draft/Next/Publish)
    await user.click(removeButtons[0]);

    expect(screen.queryByText("compliance")).not.toBeInTheDocument();
  });

  it("calls onNextClickHandler with form data on valid Next click", async () => {
    const user = userEvent.setup();
    const onNextClickHandler = jest.fn();
    const { container } = render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={onNextClickHandler}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    // Fill document type
    await user.selectOptions(container.querySelector('[name="documentType"]'), "Policy");

    // Fill name
    await user.type(container.querySelector('[name="name"]'), "Test Policy");

    // Fill summary
    await user.type(container.querySelector('[name="summary"]'), "A detailed policy summary.");

    // Upload a valid file
    const fileInput = container.querySelector("input[type='file']");
    const pdfFile = new File(["pdf content"], "policy.pdf", { type: "application/pdf" });
    Object.defineProperty(pdfFile, "size", { value: 1024 });
    await user.upload(fileInput, pdfFile);

    // Add a tag
    await user.type(screen.getByPlaceholderText(/type here to add/i), "compliance{Enter}");

    // Click Next
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(onNextClickHandler).toHaveBeenCalledTimes(1);
      expect(onNextClickHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Policy",
          summary: "A detailed policy summary.",
          documentType: "Policy",
          tags: ["compliance"],
        }),
      );
    });
  });

  it("sets status to DRAFT and calls onNextClickHandler when Save as Draft is clicked", async () => {
    const user = userEvent.setup();
    const onNextClickHandler = jest.fn();
    const { container } = render(
      <OrchestrationAddDocumentModalStepOne
        onNextClickHandler={onNextClickHandler}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.selectOptions(container.querySelector('[name="documentType"]'), "Policy");
    await user.type(container.querySelector('[name="name"]'), "Draft Policy");
    await user.type(container.querySelector('[name="summary"]'), "Draft summary.");

    const fileInput = container.querySelector("input[type='file']");
    const pdfFile = new File(["pdf"], "draft.pdf", { type: "application/pdf" });
    Object.defineProperty(pdfFile, "size", { value: 512 });
    await user.upload(fileInput, pdfFile);

    await user.type(screen.getByPlaceholderText(/type here to add/i), "draft{Enter}");
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(onNextClickHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: "DRAFT" }),
      );
    });
  });
});
