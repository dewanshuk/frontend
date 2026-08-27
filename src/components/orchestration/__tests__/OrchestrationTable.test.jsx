import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrchestrationTable from "../OrchestrationTable";
import {
  toggleOrchestrationItemStatus,
  getOrchestrationItems,
} from "@/api/orchestration";

jest.mock("@/api/orchestration", () => ({
  toggleOrchestrationItemStatus: jest.fn(),
  getOrchestrationItems: jest.fn(),
}));

describe("OrchestrationTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires a deactivation remark before calling the toggle API", async () => {
    const user = userEvent.setup();

    getOrchestrationItems.mockResolvedValue({
      data: [
        {
          id: "DOC-1",
          name: "Privacy Policy",
          document_type: "Policy",
          version: "v1.0",
          status: "ACTIVE",
          updated_by: "Admin",
          updated_at: "2026-04-21",
          owner: "Compliance",
          next_review_date: "2026-10-21",
          deactivated_at: null,
          deactivated_by: null,
          item_type: "document",
        },
      ],
      total: 1,
    });

    render(
      <OrchestrationTable
        filters={{}}
        onEditClick={jest.fn()}
        onViewClick={jest.fn()}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Deactivate",
      }),
    );

    const deactivateDialog = await screen.findByRole("dialog");
    await user.click(
      within(deactivateDialog).getByRole("button", { name: "Deactivate" }),
    );

    expect(
      await screen.findByText("Deactivation remark is required."),
    ).toBeInTheDocument();
    expect(toggleOrchestrationItemStatus).not.toHaveBeenCalled();
    expect(getOrchestrationItems).toHaveBeenCalledTimes(1);
  });

  it("deactivates an active item and refreshes the list", async () => {
    const user = userEvent.setup();

    getOrchestrationItems
      .mockResolvedValueOnce({
        data: [
          {
            id: "DOC-1",
            name: "Privacy Policy",
            document_type: "Policy",
            version: "v1.0",
            status: "ACTIVE",
            updated_by: "Admin",
            updated_at: "2026-04-21",
            owner: "Compliance",
            next_review_date: "2026-10-21",
            deactivated_at: null,
            deactivated_by: null,
            item_type: "document",
          },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "DOC-1",
            name: "Privacy Policy",
            document_type: "Policy",
            version: "v1.0",
            status: "INACTIVE",
            updated_by: "Admin",
            updated_at: "2026-04-21",
            owner: "Compliance",
            next_review_date: "2026-10-21",
            deactivated_at: "2026-04-21",
            deactivated_by: "Admin",
            item_type: "document",
          },
        ],
        total: 1,
      });

    toggleOrchestrationItemStatus.mockResolvedValue({
      message: "Item deactivated successfully.",
    });

    render(
      <OrchestrationTable
        filters={{}}
        onEditClick={jest.fn()}
        onViewClick={jest.fn()}
      />,
    );

    const deactivateButton = await screen.findByRole("button", {
      name: "Deactivate",
    });

    await user.click(deactivateButton);

    await user.type(
      await screen.findByLabelText(/Deactivation Remark/i),
      "No longer valid",
    );

    const deactivateDialog = await screen.findByRole("dialog");
    await user.click(
      within(deactivateDialog).getByRole("button", {
        name: "Deactivate",
      }),
    );

    await waitFor(() => {
      expect(toggleOrchestrationItemStatus).toHaveBeenCalledWith({
        id: "DOC-1",
        item_type: "document",
        deactivate_remarks: "No longer valid",
      });
    });

    await waitFor(() => {
      expect(getOrchestrationItems).toHaveBeenCalledTimes(2);
    });

    expect(
      await screen.findByText("Item deactivated successfully."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Inactive")).toBeInTheDocument();
  });

  it("activates an inactive item and refreshes the list", async () => {
    const user = userEvent.setup();

    getOrchestrationItems
      .mockResolvedValueOnce({
        data: [
          {
            id: "EVT-91",
            name: "Townhall",
            document_type: "EWS",
            version: "v2.0",
            status: "INACTIVE",
            updated_by: "Admin",
            updated_at: "2026-04-21",
            owner: "Communications",
            next_review_date: "2026-10-21",
            deactivated_at: "2026-04-21",
            deactivated_by: "Admin",
            item_type: "event",
          },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "EVT-91",
            name: "Townhall",
            document_type: "EWS",
            version: "v2.0",
            status: "ACTIVE",
            updated_by: "Admin",
            updated_at: "2026-04-21",
            owner: "Communications",
            next_review_date: "2026-10-21",
            deactivated_at: null,
            deactivated_by: null,
            item_type: "event",
          },
        ],
        total: 1,
      });

    toggleOrchestrationItemStatus.mockResolvedValue({
      message: "Item activated successfully.",
    });

    render(
      <OrchestrationTable
        filters={{}}
        onEditClick={jest.fn()}
        onViewClick={jest.fn()}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Activate",
      }),
    );

    await waitFor(() => {
      expect(toggleOrchestrationItemStatus).toHaveBeenCalledWith({
        id: "EVT-91",
        item_type: "event",
        deactivate_remarks: undefined,
      });
    });

    await waitFor(() => {
      expect(getOrchestrationItems).toHaveBeenCalledTimes(2);
    });

    expect(
      await screen.findByText("Item activated successfully."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Active")).toBeInTheDocument();
  });

  it("calls onViewClick with the selected row", async () => {
    const user = userEvent.setup();
    const onViewClick = jest.fn();

    getOrchestrationItems.mockResolvedValue({
      data: [
        {
          id: "EVT-102",
          name: "Townhall",
          document_type: "EWS",
          version: "v2.0",
          status: "ACTIVE",
          updated_by: "Admin",
          updated_at: "2026-04-21",
          owner: "Communications",
          next_review_date: "2026-10-21",
          deactivated_at: null,
          deactivated_by: null,
          item_type: "event",
        },
      ],
      total: 1,
    });

    render(
      <OrchestrationTable
        filters={{}}
        onEditClick={jest.fn()}
        onViewClick={onViewClick}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "View",
      }),
    );

    expect(onViewClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "EVT-102",
        item_type: "event",
      }),
    );
  });

  it("calls onEditClick with the selected row", async () => {
    const user = userEvent.setup();
    const onEditClick = jest.fn();

    getOrchestrationItems.mockResolvedValue({
      data: [
        {
          id: "DOC-12",
          name: "Policy Doc",
          document_type: "Policy",
          version: "v1.0",
          status: "DRAFT",
          updated_by: "Admin",
          updated_at: "2026-04-21",
          owner: "Compliance",
          next_review_date: "2026-10-21",
          deactivated_at: null,
          deactivated_by: null,
          item_type: "document",
        },
      ],
      total: 1,
    });

    render(
      <OrchestrationTable
        filters={{}}
        onEditClick={onEditClick}
        onViewClick={jest.fn()}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Edit",
      }),
    );

    expect(onEditClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "DOC-12",
        item_type: "document",
      }),
    );
  });
});
