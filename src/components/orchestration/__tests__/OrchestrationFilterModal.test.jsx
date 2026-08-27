import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrchestrationFilterModal from "../OrchestrationFilterModal";

jest.mock("@/atoms/date-range-picker", () => ({
  __esModule: true,
  default: ({ value, onChange }) => (
    <input
      data-testid="date-range-picker"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const MOCK_CONFIG = {
  documentTypes: [
    { value: "Policy", label: "Policy" },
    { value: "EWS", label: "EWS" },
  ],
  owners: ["Legal", "Compliance"],
};

const DEFAULT_FILTERS = {
  selectedTypes: [],
  documentName: "",
  status: [],
  owner: "",
  updatedBy: "",
  lastUpdated: null,
  nextReview: null,
  search: "",
};

describe("OrchestrationFilterModal", () => {
  it("renders nothing when isOpen is false", () => {
    render(
      <OrchestrationFilterModal
        orchestrationConfig={MOCK_CONFIG}
        currentFilters={DEFAULT_FILTERS}
        onApply={jest.fn()}
        isOpen={false}
        setIsOpen={jest.fn()}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Filters" })).not.toBeInTheDocument();
  });

  it("renders the modal when isOpen is true", () => {
    render(
      <OrchestrationFilterModal
        orchestrationConfig={MOCK_CONFIG}
        currentFilters={DEFAULT_FILTERS}
        onApply={jest.fn()}
        isOpen={true}
        setIsOpen={jest.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Filters" })).toBeInTheDocument();
  });

  it("calls setIsOpen(false) when the close button is clicked", async () => {
    const user = userEvent.setup();
    const setIsOpen = jest.fn();

    render(
      <OrchestrationFilterModal
        orchestrationConfig={MOCK_CONFIG}
        currentFilters={DEFAULT_FILTERS}
        onApply={jest.fn()}
        isOpen={true}
        setIsOpen={setIsOpen}
      />,
    );

    await user.click(screen.getByRole("button", { name: /close filters/i }));
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("applies the selected status filter on Apply Filters click", async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();
    render(
      <OrchestrationFilterModal
        orchestrationConfig={MOCK_CONFIG}
        currentFilters={DEFAULT_FILTERS}
        onApply={onApply}
        isOpen={true}
        setIsOpen={jest.fn()}
      />,
    );

    await user.click(screen.getByText("Select status"));
    await user.click(screen.getByRole("checkbox", { name: /active/i }));
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ status: ["Active"] }),
    );
  });

  it("calls onApply with reset defaults when Reset Filters is clicked", async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();
    render(
      <OrchestrationFilterModal
        orchestrationConfig={MOCK_CONFIG}
        currentFilters={{ ...DEFAULT_FILTERS, status: ["Active"], owner: "Legal" }}
        onApply={onApply}
        isOpen={true}
        setIsOpen={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /reset filters/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ status: [], owner: "", selectedTypes: [] }),
    );
  });

  it("shows '1 selected' when one document type is pre-selected", () => {
    render(
      <OrchestrationFilterModal
        orchestrationConfig={MOCK_CONFIG}
        currentFilters={{ ...DEFAULT_FILTERS, selectedTypes: ["Policy"] }}
        onApply={jest.fn()}
        isOpen={true}
        setIsOpen={jest.fn()}
      />,
    );
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("toggles a document type in the custom dropdown", async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();

    render(
      <OrchestrationFilterModal
        orchestrationConfig={MOCK_CONFIG}
        currentFilters={DEFAULT_FILTERS}
        onApply={onApply}
        isOpen={true}
        setIsOpen={jest.fn()}
      />,
    );

    // Open the custom document-type dropdown
    await user.click(screen.getByText("select"));

    // Click the "Policy" option label
    const policyLabel = screen.getByText("Policy").closest("label");
    await user.click(policyLabel);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ selectedTypes: ["Policy"] }),
    );
  });

  it("de-selects a previously selected document type", async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();

    render(
      <OrchestrationFilterModal
        orchestrationConfig={MOCK_CONFIG}
        currentFilters={{ ...DEFAULT_FILTERS, selectedTypes: ["Policy"] }}
        onApply={onApply}
        isOpen={true}
        setIsOpen={jest.fn()}
      />,
    );

    // Open dropdown and uncheck Policy
    await user.click(screen.getByText("1 selected"));
    const policyLabel = screen.getByText("Policy").closest("label");
    await user.click(policyLabel);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ selectedTypes: [] }),
    );
  });

  it("applies the selected owner filter", async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();
    const { container } = render(
      <OrchestrationFilterModal
        orchestrationConfig={MOCK_CONFIG}
        currentFilters={DEFAULT_FILTERS}
        onApply={onApply}
        isOpen={true}
        setIsOpen={jest.fn()}
      />,
    );

    const ownerSelect = container.querySelector('[name="owner"]');
    await user.selectOptions(ownerSelect, "Legal");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "Legal" }),
    );
  });
});
