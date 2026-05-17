import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus, Tractor } from "lucide-react";
import { ListRow } from "../list-row";

describe("<ListRow>", () => {
  it("fires onClick when row body is tapped", async () => {
    const onRow = vi.fn();
    render(
      <ListRow
        leadingIcon={Tractor}
        title="Tractor #4"
        subtitle="Karthik · 3 hrs today"
        onClick={onRow}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Tractor #4/i }));
    expect(onRow).toHaveBeenCalledOnce();
  });

  it("inline action click does not bubble to row click", async () => {
    const onRow = vi.fn();
    const onAction = vi.fn();
    render(
      <ListRow
        leadingIcon={Tractor}
        title="Tractor #4"
        onClick={onRow}
        inlineAction={{ icon: Plus, label: "Log work", onClick: onAction }}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Log work" }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onRow).not.toHaveBeenCalled();
  });
});
