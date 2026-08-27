import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FAQ from "../FAQ";
import { getFaq } from "@/api/faqApi";

jest.mock("@/api/faqApi", () => ({
  getFaq: jest.fn(),
}));

describe("FAQ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading and then renders faq groups", async () => {
    getFaq.mockResolvedValue({
      data: {
        "General Questions": {
          "What is compliance?": "Compliance is required.",
        },
      },
    });

    render(<FAQ />);

    expect(screen.getByText("Loading FAQs...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("General Questions")).toBeInTheDocument();
      expect(screen.getByText("What is compliance?")).toBeInTheDocument();
    });
  });

  it("shows error state when faq api fails", async () => {
    getFaq.mockRejectedValue(new Error("network issue"));

    render(<FAQ />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load FAQs. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("filters FAQs by search query", async () => {
    const user = userEvent.setup();
    getFaq.mockResolvedValue({
      data: {
        "General Questions": {
          "What is compliance?": "Compliance is required.",
        },
        Operations: {
          "How to raise a complaint?": "Use raise complaint form.",
        },
      },
    });

    render(<FAQ />);

    await waitFor(() => {
      expect(screen.getByText("What is compliance?")).toBeInTheDocument();
      expect(screen.getByText("How to raise a complaint?")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Search FAQs"), "complaint");

    // Matching text is wrapped in <mark>, so query the accordion trigger by its
    // accessible name instead of relying on a single text node.
    expect(
      screen.queryByRole("button", { name: /what is compliance\?/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /how to raise a complaint\?/i })
    ).toBeInTheDocument();
  });

  it("shows no results message when filter has no matches", async () => {
    const user = userEvent.setup();
    getFaq.mockResolvedValue({
      data: {
        "General Questions": {
          "What is compliance?": "Compliance is required.",
        },
      },
    });

    render(<FAQ />);

    await waitFor(() => {
      expect(screen.getByText("What is compliance?")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Search FAQs"), "not-found-term");

    expect(
      screen.getByText("No results found. Try a different keyword.")
    ).toBeInTheDocument();
  });
});
