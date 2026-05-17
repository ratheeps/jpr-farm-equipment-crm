import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tractor, Truck, Combine } from "lucide-react";
import { TilePicker } from "../tile-picker";

describe("<TilePicker> single-select", () => {
  it("marks the selected tile and fires onChange with the new value", async () => {
    const onChange = vi.fn();
    render(
      <TilePicker
        value="t1"
        onChange={onChange}
        options={[
          { value: "t1", label: "Tractor #4", icon: Tractor },
          { value: "t2", label: "Truck #2", icon: Truck },
        ]}
      />
    );
    expect(
      screen.getByRole("button", { name: /Tractor #4/i })
    ).toHaveAttribute("data-selected", "true");

    await userEvent.click(screen.getByRole("button", { name: /Truck #2/i }));
    expect(onChange).toHaveBeenCalledWith("t2");
  });
});

describe("<TilePicker> multi-select", () => {
  it("toggles a value into the selected array", async () => {
    const onChange = vi.fn();
    render(
      <TilePicker
        multi
        value={["t1"]}
        onChange={onChange}
        options={[
          { value: "t1", label: "Tractor #4", icon: Tractor },
          { value: "t2", label: "Truck #2", icon: Truck },
          { value: "t3", label: "Harvester #1", icon: Combine },
        ]}
      />
    );

    expect(
      screen.getByRole("button", { name: /Tractor #4/i })
    ).toHaveAttribute("data-selected", "true");

    await userEvent.click(screen.getByRole("button", { name: /Truck #2/i }));
    expect(onChange).toHaveBeenLastCalledWith(["t1", "t2"]);
  });

  it("removes a value when an already-selected tile is tapped", async () => {
    const onChange = vi.fn();
    render(
      <TilePicker
        multi
        value={["t1", "t2"]}
        onChange={onChange}
        options={[
          { value: "t1", label: "Tractor #4", icon: Tractor },
          { value: "t2", label: "Truck #2", icon: Truck },
        ]}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Tractor #4/i }));
    expect(onChange).toHaveBeenLastCalledWith(["t2"]);
  });
});
