import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Home from "../Home";
import { useNavigate } from "react-router-dom";

jest.mock("@/api/axiosInstance", () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: [] }),
  },
  docEventsApiGet: jest.fn().mockResolvedValue({ data: [] }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("react-chartjs-2", () => ({
  Bar: ({ data }) => (
    <div data-testid="kpi-bar-chart">
      {data?.datasets?.[0]?.label ?? "chart"}
    </div>
  ),
}));

describe("Home", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  it("renders head view content when viewMode is head", () => {
    render(
      <MemoryRouter>
        <Home viewMode="head" />
      </MemoryRouter>
    );

    expect(
      screen.getByText("Latest News & Announcements")
    ).toBeInTheDocument();
    expect(screen.getByText("My Team Status")).toBeInTheDocument();
    expect(screen.queryByText("CompliAI Assistant")).toBeInTheDocument();
  });

  it("renders employee view without KPI and with middle actions", () => {
    render(
      <MemoryRouter>
        <Home viewMode="employee" />
      </MemoryRouter>
    );

    expect(screen.queryByText("My Team Status")).not.toBeInTheDocument();
    expect(screen.getByText("Self Declaration")).toBeInTheDocument();
    expect(screen.getByText("Gift Declaration")).toBeInTheDocument();
  });

  it("defaults to employee view", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.queryByText("My Team Status")).not.toBeInTheDocument();
    expect(screen.getByText("Self Declaration")).toBeInTheDocument();
  });

  it("renders What's New items", () => {
    render(
      <MemoryRouter>
        <Home viewMode="head" />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /Data Privacy Policy/i })).toBeInTheDocument();
  });

  it("renders My Tasks overdue and due tabs", () => {
    render(
      <MemoryRouter>
        <Home viewMode="head" />
      </MemoryRouter>
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    const hasOverdue = tabs.some((t) => (t.textContent ?? "").trim().toLowerCase().startsWith("overdue"));
    const hasDue = tabs.some((t) => (t.textContent ?? "").trim().toLowerCase().startsWith("due"));
    expect(hasOverdue).toBe(true);
    expect(hasDue).toBe(true);
  });
});
