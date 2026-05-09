import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus, Wrench, Trash2 } from "lucide-react";
import { ActionSheet } from "../action-sheet";

describe("<ActionSheet>", () => {
  it("renders title and action tiles when open", async () => {
    const onLog = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ActionSheet
        open
        onOpenChange={onOpenChange}
        title="Tractor #4"
        actions={[
          { label: "Log work", icon: Plus, onClick: onLog },
          { label: "Service", icon: Wrench, onClick: () => {} },
        ]}
      />
    );
    expect(screen.getByText("Tractor #4")).toBeInTheDocument();
    const logTile = screen.getByRole("button", { name: /Log work/i });
    await userEvent.click(logTile);
    expect(onLog).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes when Escape is pressed", async () => {
    const onOpenChange = vi.fn();
    render(
      <ActionSheet
        open
        onOpenChange={onOpenChange}
        title="Tractor #4"
        actions={[{ label: "Log work", icon: Plus, onClick: () => {} }]}
      />
    );
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not fire onClick for a disabled action", async () => {
    const onDelete = vi.fn();
    render(
      <ActionSheet
        open
        onOpenChange={() => {}}
        title="Tractor #4"
        actions={[
          { label: "Delete", icon: Trash2, onClick: onDelete, disabled: true, destructive: true },
        ]}
      />
    );
    const tile = screen.getByRole("button", { name: /Delete/i });
    expect(tile).toBeDisabled();
    await userEvent.click(tile);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
