import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrchestrationViewDrawer from "../OrchestrationViewDrawer";
import { getKnowledgeItemDetail } from "@/api/hubApi";

jest.mock("@/api/hubApi", () => ({
  getKnowledgeItemDetail: jest.fn(),
}));

const MOCK_ITEM = {
  id: "ITEM-001",
  name: "Test Policy",
  status: "ACTIVE",
  document_type: "Policy",
  version: "v1.0",
  owner: "Legal",
  applicability_type: "ALL",
  updated_by: "admin",
  updated_at: "2024-01-01",
  next_review_date: "2025-01-01",
  tags: ["compliance", "policy"],
  item_type: "document",
};

const MOCK_DETAIL = {
  id: "ITEM-001",
  name: "Full Policy Name",
  status: "ACTIVE",
  document_type: "Policy",
  owner: "Legal Department",
  applicability_type: "ALL",
  updated_by: "superadmin",
  updated_at: "2024-06-01",
  next_review_date: "2025-06-01",
  tags: ["tag1", "tag2"],
  files: [{ id: "f1", name: "policy.pdf", file_url: "https://example.com/policy.pdf" }],
  summary: "Detailed description here",
};

describe("OrchestrationViewDrawer", () => {
  afterEach(() => jest.clearAllMocks());

  it("has translate-x-full class when isOpen is false (visually hidden)", () => {
    getKnowledgeItemDetail.mockResolvedValue({ data: MOCK_DETAIL });
    const { container } = render(
      <OrchestrationViewDrawer isOpen={false} item={MOCK_ITEM} onClose={jest.fn()} />,
    );
    const drawer = container.querySelector(".translate-x-full");
    expect(drawer).not.toBeNull();
  });

  it("renders item fallback data immediately when opened (before fetch completes)", () => {
    getKnowledgeItemDetail.mockImplementation(() => new Promise(() => {})); // never resolves
    render(
      <OrchestrationViewDrawer isOpen={true} item={MOCK_ITEM} onClose={jest.fn()} />,
    );
    expect(screen.getByText("ITEM-001")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("renders detailed item data after fetch resolves", async () => {
    getKnowledgeItemDetail.mockResolvedValue({ data: MOCK_DETAIL });
    render(
      <OrchestrationViewDrawer isOpen={true} item={MOCK_ITEM} onClose={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Full Policy Name")).toBeInTheDocument();
    });
    expect(screen.getByText("Legal Department")).toBeInTheDocument();
    expect(screen.getByText("superadmin")).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    getKnowledgeItemDetail.mockRejectedValue(new Error("Network error"));
    render(
      <OrchestrationViewDrawer isOpen={true} item={MOCK_ITEM} onClose={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    getKnowledgeItemDetail.mockResolvedValue({ data: MOCK_DETAIL });

    render(
      <OrchestrationViewDrawer isOpen={true} item={MOCK_ITEM} onClose={onClose} />,
    );

    await user.click(screen.getByRole("button", { name: /close drawer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders tags from the detail response", async () => {
    getKnowledgeItemDetail.mockResolvedValue({ data: MOCK_DETAIL });
    render(
      <OrchestrationViewDrawer isOpen={true} item={MOCK_ITEM} onClose={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("tag1")).toBeInTheDocument();
      expect(screen.getByText("tag2")).toBeInTheDocument();
    });
  });

  it("renders file links from the detail response", async () => {
    getKnowledgeItemDetail.mockResolvedValue({ data: MOCK_DETAIL });
    render(
      <OrchestrationViewDrawer isOpen={true} item={MOCK_ITEM} onClose={jest.fn()} />,
    );

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /policy\.pdf/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://example.com/policy.pdf");
    });
  });

  it("renders N/A for fields missing in both detail and fallback item", async () => {
    getKnowledgeItemDetail.mockResolvedValue({ data: { id: "ITEM-002", name: "Bare Item" } });
    render(
      <OrchestrationViewDrawer
        isOpen={true}
        item={{ id: "ITEM-002", name: "Bare Item", item_type: "document" }}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      const naElements = screen.getAllByText("N/A");
      expect(naElements.length).toBeGreaterThan(0);
    });
  });

  it("calls getKnowledgeItemDetail with the item id and item_type", async () => {
    getKnowledgeItemDetail.mockResolvedValue({ data: MOCK_DETAIL });
    render(
      <OrchestrationViewDrawer isOpen={true} item={MOCK_ITEM} onClose={jest.fn()} />,
    );

    await waitFor(() => {
      expect(getKnowledgeItemDetail).toHaveBeenCalledWith("ITEM-001", "document");
    });
  });
});
