import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPills } from "../filter-pills";

describe("<FilterPills>", () => {
  it("renders pills, marks the active one, and fires onChange", async () => {
    const onChange = vi.fn();
    render(
      <FilterPills
        value="all"
        onChange={onChange}
        options={[
          { value: "all", label: "All" },
          { value: "active", label: "Active", count: 8 },
          { value: "idle", label: "Idle", count: 3 },
        ]}
      />
    );
    const all = screen.getByRole("button", { name: /All/ });
    expect(all).toHaveAttribute("data-active", "true");

    await userEvent.click(screen.getByRole("button", { name: /Active 8/ }));
    expect(onChange).toHaveBeenCalledWith("active");
  });
});
