import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrchestrationAddDocumentModalStepThree from "../OrchestrationAddDocumentModalStepThree";

jest.mock("@/components/shared/MultiSelectWithBottomChecks", () => ({
  __esModule: true,
  default: ({ label, options, value, onChange }) => (
    <select
      aria-label={label}
      multiple
      value={value}
      onChange={(e) =>
        onChange(Array.from(e.target.selectedOptions).map((o) => o.value))
      }
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("@/atoms/email-multi-input", () => ({
  __esModule: true,
  default: ({ value, onChange }) => (
    <div>
      {value.map((email, i) => (
        <span key={i} data-testid="email-tag">
          {email.value}
        </span>
      ))}
      <input
        data-testid="email-input"
        placeholder="Add email"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.currentTarget.value.trim()) {
            e.preventDefault();
            onChange([
              ...value,
              { value: e.currentTarget.value.trim(), valid: true },
            ]);
            e.currentTarget.value = "";
          }
        }}
      />
    </div>
  ),
}));

const MOCK_CONFIG = {
  divisions: [{ name: "IT" }, { name: "HR" }],
  designations: [{ name: "Manager" }, { name: "Engineer" }],
};

describe("OrchestrationAddDocumentModalStepThree", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders with DIVISION selected by default", () => {
    render(
      <OrchestrationAddDocumentModalStepThree
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    const divisionRadio = screen.getByRole("radio", { name: /by division cluster/i });
    expect(divisionRadio).toBeChecked();
    expect(screen.getByRole("listbox", { name: "Division Cluster" })).toBeInTheDocument();
  });

  it("shows EMPLOYEE email input when 'By Employee/s' radio is selected", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepThree
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /by employee/i }));

    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.queryByRole("listbox", { name: "Division Cluster" })).not.toBeInTheDocument();
  });

  it("hides division and employee forms when 'Applicable to All' radio is selected", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepThree
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /applicable to all/i }));

    expect(screen.queryByRole("listbox", { name: "Division Cluster" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("email-input")).not.toBeInTheDocument();
  });

  it("shows division validation error when Publish Now is clicked with no divisions", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepThree
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    // DIVISION is already selected — click Publish Now without selecting any division
    await user.click(screen.getByRole("button", { name: /publish now/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/at least one division is required/i),
      ).toBeInTheDocument();
    });
  });

  it("shows designation validation error when Publish Now is clicked with no designations", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepThree
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    // Select a division but leave designations empty
    const divisionSelect = screen.getByRole("listbox", { name: "Division Cluster" });
    await user.selectOptions(divisionSelect, ["IT"]);

    await user.click(screen.getByRole("button", { name: /publish now/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/at least one designation is required/i),
      ).toBeInTheDocument();
    });
  });

  it("shows email validation error when Publish Now is clicked with no emails (EMPLOYEE mode)", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddDocumentModalStepThree
        onNextClickHandler={jest.fn()}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /by employee/i }));
    await user.click(screen.getByRole("button", { name: /publish now/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least one email is required/i)).toBeInTheDocument();
    });
  });

  it("calls onNextClickHandler with ALL type when valid and Publish Now is clicked", async () => {
    const user = userEvent.setup();
    const onNextClickHandler = jest.fn();

    render(
      <OrchestrationAddDocumentModalStepThree
        onNextClickHandler={onNextClickHandler}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /applicable to all/i }));
    await user.click(screen.getByRole("button", { name: /publish now/i }));

    await waitFor(() => {
      expect(onNextClickHandler).toHaveBeenCalledWith(
        expect.objectContaining({ applicability_type: "ALL" }),
        3,
      );
    });
  });

  it("calls onNextClickHandler with DIVISION data when divisions and designations are selected", async () => {
    const user = userEvent.setup();
    const onNextClickHandler = jest.fn();

    render(
      <OrchestrationAddDocumentModalStepThree
        onNextClickHandler={onNextClickHandler}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    // Select a division and a designation
    const divisionSelect = screen.getByRole("listbox", { name: "Division Cluster" });
    const designationSelect = screen.getByRole("listbox", { name: "Designation" });

    await user.selectOptions(divisionSelect, ["IT"]);
    await user.selectOptions(designationSelect, ["Manager"]);

    await user.click(screen.getByRole("button", { name: /publish now/i }));

    await waitFor(() => {
      expect(onNextClickHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          applicability_type: "DIVISION",
          applicability_refs: expect.objectContaining({
            divisions: ["IT"],
            designations: ["Manager"],
          }),
        }),
        3,
      );
    });
  });

  it("calls onNextClickHandler with EMPLOYEE data when email is entered", async () => {
    const user = userEvent.setup();
    const onNextClickHandler = jest.fn();

    render(
      <OrchestrationAddDocumentModalStepThree
        onNextClickHandler={onNextClickHandler}
        orchestrationConfig={MOCK_CONFIG}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /by employee/i }));

    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "test@example.com{Enter}");

    await user.click(screen.getByRole("button", { name: /publish now/i }));

    await waitFor(() => {
      expect(onNextClickHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          applicability_type: "EMPLOYEE",
          applicability_refs: expect.objectContaining({
            emails: expect.arrayContaining([
              expect.objectContaining({ value: "test@example.com" }),
            ]),
          }),
        }),
        3,
      );
    });
  });
});
