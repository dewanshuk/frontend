import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrchestrationAddEventModalStepOne from "../OrchestrationAddEventModalStepOne";

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

describe("OrchestrationAddEventModalStepOne", () => {
  afterEach(() => jest.clearAllMocks());

  it("shows 'Event Name is required' on Next click with empty form", async () => {
    const user = userEvent.setup();
    render(<OrchestrationAddEventModalStepOne onNextClickHandler={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText(/event name is required/i)).toBeInTheDocument();
    });
  });


  it("defaults event dates to today's date range when the popup opens", () => {
    render(<OrchestrationAddEventModalStepOne onNextClickHandler={jest.fn()} />);

    const datePicker = screen.getByTestId("date-range-picker");
    expect(datePicker.value).toMatch(/^\d{2}\/[A-Z]{3}\/\d{4} - \d{2}\/[A-Z]{3}\/\d{4}$/);
    const [start, end] = datePicker.value.split(/\s+-\s+/);
    expect(start).toBe(end);
  });

  it("does not advance when other fields are filled but event dates are missing", async () => {
    const user = userEvent.setup();
    const onNextClickHandler = jest.fn();
    const { container } = render(
      <OrchestrationAddEventModalStepOne onNextClickHandler={onNextClickHandler} />,
    );

    await user.type(container.querySelector('[name="eventName"]'), "Annual Conference");
    await user.type(container.querySelector('[name="description"]'), "A major annual event.");
    fireEvent.change(screen.getByTestId("date-range-picker"), {
      target: { value: "" },
    });
    const tagInput = screen.getByPlaceholderText(/type here to add/i);
    await user.type(tagInput, "tech{Enter}");

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText(/event dates are required/i)).toBeInTheDocument();
    });
    expect(onNextClickHandler).not.toHaveBeenCalled();
  });

  it("does not advance when only a partial event date range is selected", async () => {
    const user = userEvent.setup();
    const onNextClickHandler = jest.fn();
    const { container } = render(
      <OrchestrationAddEventModalStepOne onNextClickHandler={onNextClickHandler} />,
    );

    await user.type(container.querySelector('[name="eventName"]'), "Annual Conference");
    await user.type(container.querySelector('[name="description"]'), "A major annual event.");
    fireEvent.change(screen.getByTestId("date-range-picker"), {
      target: { value: "01/JAN/2026" },
    });
    const tagInput = screen.getByPlaceholderText(/type here to add/i);
    await user.type(tagInput, "tech{Enter}");

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText(/please select both start and end dates/i)).toBeInTheDocument();
    });
    expect(onNextClickHandler).not.toHaveBeenCalled();
  });

  it("shows 'Description is required' on Next click with empty form", async () => {
    const user = userEvent.setup();
    render(<OrchestrationAddEventModalStepOne onNextClickHandler={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  it("shows tags validation error when tags list is empty on submit", async () => {
    const user = userEvent.setup();
    render(<OrchestrationAddEventModalStepOne onNextClickHandler={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least one tag is required/i)).toBeInTheDocument();
    });
  });

  it("adds a tag when Enter is pressed in the tag input", async () => {
    const user = userEvent.setup();
    render(<OrchestrationAddEventModalStepOne onNextClickHandler={jest.fn()} />);

    const tagInput = screen.getByPlaceholderText(/type here to add/i);
    await user.type(tagInput, "conference{Enter}");

    expect(screen.getByText("conference")).toBeInTheDocument();
  });

  it("removes a tag when its × button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <OrchestrationAddEventModalStepOne
        onNextClickHandler={jest.fn()}
        initialValues={{
          eventName: "",
          subEventName: "",
          eventDate: "",
          description: "",
          tags: ["conference"],
        }}
      />,
    );

    expect(screen.getByText("conference")).toBeInTheDocument();
    // Find the X icon button next to the tag text
    const tagRemoveButtons = screen.getAllByRole("button");
    // Remove button is before "Save as Draft", "Next", "Publish Now"
    await user.click(tagRemoveButtons[0]);

    expect(screen.queryByText("conference")).not.toBeInTheDocument();
  });

  it("calls onNextClickHandler with correct values when form is valid and Next is clicked", async () => {
    const user = userEvent.setup();
    const onNextClickHandler = jest.fn();
    const { container } = render(
      <OrchestrationAddEventModalStepOne onNextClickHandler={onNextClickHandler} />,
    );

    // Labels are not linked via htmlFor — use name attribute queries
    await user.type(container.querySelector('[name="eventName"]'), "Annual Conference");
    await user.type(container.querySelector('[name="subEventName"]'), "Opening Ceremony");

    // Set event date via mocked DateRangePicker
    const datePicker = screen.getByTestId("date-range-picker");
    fireEvent.change(datePicker, { target: { value: "01/JAN/2024 - 05/JAN/2024" } });

    await user.type(container.querySelector('[name="description"]'), "A major annual event.");

    const tagInput = screen.getByPlaceholderText(/type here to add/i);
    await user.type(tagInput, "tech{Enter}");

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(onNextClickHandler).toHaveBeenCalledTimes(1);
      expect(onNextClickHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: "Annual Conference",
          subEventName: "Opening Ceremony",
          description: "A major annual event.",
          tags: ["tech"],
        }),
      );
    });
  });

  it("sets status to DRAFT and calls onSaveDraftClick when Save as Draft is clicked", async () => {
    const user = userEvent.setup();
    const onSaveDraftClick = jest.fn();
    const { container } = render(
      <OrchestrationAddEventModalStepOne
        onNextClickHandler={jest.fn()}
        onSaveDraftClick={onSaveDraftClick}
      />,
    );

    await user.type(container.querySelector('[name="eventName"]'), "Draft Event");
    await user.type(container.querySelector('[name="subEventName"]'), "Sub Event");

    const datePicker = screen.getByTestId("date-range-picker");
    fireEvent.change(datePicker, { target: { value: "01/MAR/2024 - 02/MAR/2024" } });

    await user.type(container.querySelector('[name="description"]'), "Draft description.");

    const tagInput = screen.getByPlaceholderText(/type here to add/i);
    await user.type(tagInput, "draft{Enter}");

    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(onSaveDraftClick).toHaveBeenCalledWith(
        expect.objectContaining({ status: "DRAFT" }),
      );
    });
  });
});
