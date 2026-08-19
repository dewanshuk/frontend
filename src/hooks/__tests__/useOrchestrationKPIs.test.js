import { renderHook, waitFor } from "@testing-library/react";
import { useOrchestrationKPIs } from "@/hooks/useOrchestrationKPIs";
import { getOrchestrationKPIs } from "@/api/orchestration";

jest.mock("@/api/orchestration", () => ({
  getOrchestrationKPIs: jest.fn(),
  getOrchestrationItems: jest.fn(),
  toggleOrchestrationItemStatus: jest.fn(),
  storeOrchestrationDocument: jest.fn(),
  updateOrchestrationDocument: jest.fn(),
  storeOrchestrationEvent: jest.fn(),
  updateOrchestrationEvent: jest.fn(),
  getOrchestrationConfig: jest.fn(),
  getOrchestrationLinkedOptions: jest.fn(),
}));

describe("useOrchestrationKPIs", () => {
  afterEach(() => jest.clearAllMocks());

  it("starts with loading=true, kpis=null, error=null", () => {
    getOrchestrationKPIs.mockImplementation(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useOrchestrationKPIs());

    expect(result.current.loading).toBe(true);
    expect(result.current.kpis).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("returns kpis data when API resolves with a .data wrapper", async () => {
    const mockKPIs = { active_doc: 10, due_for_review: 3, overdue: 1, draft: 5, by_type: {} };
    getOrchestrationKPIs.mockResolvedValue({ data: mockKPIs });

    const { result } = renderHook(() => useOrchestrationKPIs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.kpis).toEqual(mockKPIs);
    expect(result.current.error).toBeNull();
  });

  it("returns kpis data when API resolves without a .data wrapper (raw response)", async () => {
    const mockKPIs = { active_doc: 7, due_for_review: 2, overdue: 0, draft: 4, by_type: {} };
    getOrchestrationKPIs.mockResolvedValue(mockKPIs);

    const { result } = renderHook(() => useOrchestrationKPIs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.kpis).toEqual(mockKPIs);
    expect(result.current.error).toBeNull();
  });

  it("sets error message when API call fails", async () => {
    getOrchestrationKPIs.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useOrchestrationKPIs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.kpis).toBeNull();
    expect(result.current.error).toBe("Network failure");
  });

  it("sets a fallback error message when the error has no message", async () => {
    getOrchestrationKPIs.mockRejectedValue({});

    const { result } = renderHook(() => useOrchestrationKPIs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to fetch KPIs");
  });

  it("calls getOrchestrationKPIs exactly once on mount", async () => {
    getOrchestrationKPIs.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useOrchestrationKPIs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getOrchestrationKPIs).toHaveBeenCalledTimes(1);
  });

  it("does not re-fetch on re-render", async () => {
    getOrchestrationKPIs.mockResolvedValue({ data: {} });

    const { result, rerender } = renderHook(() => useOrchestrationKPIs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender();

    expect(getOrchestrationKPIs).toHaveBeenCalledTimes(1);
  });
});
