import { render, screen } from "@testing-library/react";
import OrchestrationStatsCard from "../OrchestrationStatsCard";
import { useOrchestrationKPIs } from "@/hooks/useOrchestrationKPIs";

jest.mock("@/hooks/useOrchestrationKPIs", () => ({
  __esModule: true,
  useOrchestrationKPIs: jest.fn(),
}));

describe("OrchestrationStatsCard", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders loading skeletons while loading", () => {
    useOrchestrationKPIs.mockReturnValue({ kpis: null, loading: true, error: null });
    const { container } = render(<OrchestrationStatsCard />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders an error message when loading fails", () => {
    useOrchestrationKPIs.mockReturnValue({ kpis: null, loading: false, error: "API error" });
    render(<OrchestrationStatsCard />);
    expect(
      screen.getByText(/unable to load documents & events overview/i),
    ).toBeInTheDocument();
  });

  it("renders the four top-level KPI titles", () => {
    useOrchestrationKPIs.mockReturnValue({
      kpis: { active_doc: 0, due_for_review: 0, overdue: 0, draft: 0, by_type: {} },
      loading: false,
      error: null,
    });
    render(<OrchestrationStatsCard />);
    expect(screen.getByText("Active Published")).toBeInTheDocument();
    expect(screen.getByText("Due for Review")).toBeInTheDocument();
    expect(screen.getByText("Overdue for Review")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders correct KPI counts from the API response", () => {
    useOrchestrationKPIs.mockReturnValue({
      kpis: { active_doc: 42, due_for_review: 7, overdue: 3, draft: 12, by_type: {} },
      loading: false,
      error: null,
    });
    render(<OrchestrationStatsCard />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("defaults all KPI values to 0 when kpis is an empty object", () => {
    useOrchestrationKPIs.mockReturnValue({ kpis: {}, loading: false, error: null });
    render(<OrchestrationStatsCard />);
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  it("renders all 7 category labels", () => {
    useOrchestrationKPIs.mockReturnValue({
      kpis: { active_doc: 0, due_for_review: 0, overdue: 0, draft: 0, by_type: {} },
      loading: false,
      error: null,
    });
    render(<OrchestrationStatsCard />);
    [
      "Policies",
      "Guidance Notes",
      "Laws & Regulations",
      "Training Resources",
      "Flyers",
      "EWS",
      "Events",
    ].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it("renders category counts from by_type data", () => {
    useOrchestrationKPIs.mockReturnValue({
      kpis: {
        active_doc: 0,
        due_for_review: 0,
        overdue: 0,
        draft: 0,
        by_type: { Policy: 20, Event: 5 },
      },
      loading: false,
      error: null,
    });
    render(<OrchestrationStatsCard />);
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders 0 for category types absent from by_type", () => {
    useOrchestrationKPIs.mockReturnValue({
      kpis: {
        active_doc: 0,
        due_for_review: 0,
        overdue: 0,
        draft: 0,
        by_type: {},
      },
      loading: false,
      error: null,
    });
    render(<OrchestrationStatsCard />);
    const zeros = screen.getAllByText("0");
    // 4 top KPIs + 7 categories = 11 zeros
    expect(zeros.length).toBeGreaterThanOrEqual(7);
  });
});
