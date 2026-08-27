import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrchestrationActionBar from "../OrchestrationActionBar";

describe("OrchestrationActionBar", () => {
  it("calls onAddDocumentClickHandler when 'Add Document' is clicked", async () => {
    const user = userEvent.setup();
    const handler = jest.fn();

    render(
      <OrchestrationActionBar
        onAddDocumentClickHandler={handler}
        onAddEventClickHandler={jest.fn()}
        onFilterClickHandler={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add document/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("calls onAddEventClickHandler when 'Add Event' is clicked", async () => {
    const user = userEvent.setup();
    const handler = jest.fn();

    render(
      <OrchestrationActionBar
        onAddDocumentClickHandler={jest.fn()}
        onAddEventClickHandler={handler}
        onFilterClickHandler={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add event/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("calls onFilterClickHandler when 'Filters' is clicked", async () => {
    const user = userEvent.setup();
    const handler = jest.fn();

    render(
      <OrchestrationActionBar
        onAddDocumentClickHandler={jest.fn()}
        onAddEventClickHandler={jest.fn()}
        onFilterClickHandler={handler}
      />,
    );

    await user.click(screen.getByRole("button", { name: /filters/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("shows Export as visually unavailable when there are no records", () => {
    render(
      <OrchestrationActionBar
        onAddDocumentClickHandler={jest.fn()}
        onAddEventClickHandler={jest.fn()}
        onFilterClickHandler={jest.fn()}
        noRecords
      />,
    );

    const exportButton = screen.getByRole("button", { name: /export/i });
    expect(exportButton).toHaveAttribute("aria-disabled", "true");
    expect(exportButton).not.toBeDisabled();
  });

  it("still calls export handler when no records so parent can show toast", async () => {
    const user = userEvent.setup();
    const onExport = jest.fn();

    render(
      <OrchestrationActionBar
        onAddDocumentClickHandler={jest.fn()}
        onAddEventClickHandler={jest.fn()}
        onFilterClickHandler={jest.fn()}
        onExportClickHandler={onExport}
        noRecords
      />,
    );

    await user.click(screen.getByRole("button", { name: /export/i }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("does not call export handler while exporting", async () => {
    const user = userEvent.setup();
    const onExport = jest.fn();

    render(
      <OrchestrationActionBar
        onAddDocumentClickHandler={jest.fn()}
        onAddEventClickHandler={jest.fn()}
        onFilterClickHandler={jest.fn()}
        onExportClickHandler={onExport}
        isExporting
      />,
    );

    const exportButton = screen.getByRole("button", { name: /exporting/i });
    expect(exportButton).toBeDisabled();
    await user.click(exportButton);
    expect(onExport).not.toHaveBeenCalled();
  });
});
