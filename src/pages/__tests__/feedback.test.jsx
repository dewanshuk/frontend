import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedbackDialog from "../Feedback";
import { submitFeedback } from "@/api/FeedbackApi";

jest.mock("@/api/FeedbackApi", () => ({
  submitFeedback: jest.fn(),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h1>{children}</h1>,
  DialogDescription: ({ children }) => <p>{children}</p>,
}));

jest.mock("@/components/shared/CenterToast", () => ({
  __esModule: true,
  default: ({ open, message, variant }) =>
    open ? <div data-testid="center-toast">{variant}:{message}</div> : null,
}));

describe("FeedbackDialog", () => {
  const onOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form fields when open", () => {
    render(<FeedbackDialog open={true} onOpenChange={onOpenChange} />);

    expect(screen.getByText("Feedback Form")).toBeInTheDocument();
    expect(screen.getByLabelText(/rate 1 star/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Tell us what you think...")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit Feedback" })
    ).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    const user = userEvent.setup();
    render(<FeedbackDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Submit Feedback" }));

    expect(
      screen.getByText("Please select a rating between 1 and 5.")
    ).toBeInTheDocument();
    expect(screen.getByText("Feedback message is required.")).toBeInTheDocument();
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it("submits feedback successfully and closes modal", async () => {
    const user = userEvent.setup();
    submitFeedback.mockResolvedValue("feedback submitted successfully");

    render(<FeedbackDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByLabelText(/rate 4 stars/i));
    await user.type(
      screen.getByPlaceholderText("Tell us what you think..."),
      "Helpful experience."
    );
    await user.click(screen.getByRole("button", { name: "Submit Feedback" }));

    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith({
        rating: 4,
        description: "Helpful experience.",
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows API error toast when submit fails", async () => {
    const user = userEvent.setup();
    submitFeedback.mockRejectedValue(new Error("Server unavailable"));

    render(<FeedbackDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByLabelText(/rate 5 stars/i));
    await user.type(
      screen.getByPlaceholderText("Tell us what you think..."),
      "Excellent."
    );
    await user.click(screen.getByRole("button", { name: "Submit Feedback" }));

    await waitFor(() => {
      expect(screen.getByTestId("center-toast")).toHaveTextContent(
        "error:Server unavailable"
      );
    });
  });
});
