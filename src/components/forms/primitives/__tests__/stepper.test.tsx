import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { Stepper } from "../stepper";

describe("<Stepper>", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("increments and decrements within bounds", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Stepper value={2} onChange={onChange} step={0.5} min={0} max={3} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(onChange).toHaveBeenLastCalledWith(2.5);

    // Re-anchor at value=2 to verify the decrement path independently.
    rerender(<Stepper value={2} onChange={onChange} step={0.5} min={0} max={3} />);
    await userEvent.click(screen.getByRole("button", { name: "Decrease" }));
    expect(onChange).toHaveBeenLastCalledWith(1.5);
  });

  it("clamps at max and disables the increase button", async () => {
    const onChange = vi.fn();
    render(<Stepper value={3} onChange={onChange} step={1} min={0} max={3} />);
    const inc = screen.getByRole("button", { name: "Increase" });
    expect(inc).toBeDisabled();
    await userEvent.click(inc);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rounds to avoid float drift", async () => {
    const onChange = vi.fn();
    render(<Stepper value={0.1} onChange={onChange} step={0.2} min={0} max={5} />);
    await userEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(onChange).toHaveBeenLastCalledWith(0.3);
  });

  it("accelerates on press-and-hold", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Stepper value={0} onChange={onChange} step={1} min={0} max={100} />);
    const inc = screen.getByRole("button", { name: "Increase" });

    act(() => {
      inc.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    act(() => {
      vi.advanceTimersByTime(400);
      vi.advanceTimersByTime(80 * 3);
    });
    act(() => {
      inc.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    });

    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("walks value forward on press-and-hold when used controlled", () => {
    vi.useFakeTimers();
    function Wrapped() {
      const [v, setV] = React.useState(0);
      return <Stepper value={v} onChange={setV} step={1} min={0} max={100} />;
    }
    render(<Wrapped />);
    const inc = screen.getByRole("button", { name: "Increase" });

    act(() => {
      inc.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    act(() => {
      vi.advanceTimersByTime(400);
      vi.advanceTimersByTime(80 * 3);
    });
    act(() => {
      inc.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    });

    // The readout div renders the current numeric value. After hold +
    // 3 repeats the value should have walked past 1; a real walk hits at
    // least 2 even if the very last tick races the pointerup.
    const readout = inc.parentElement?.querySelector(".tabular-nums");
    const final = Number(readout?.textContent ?? "0");
    expect(final).toBeGreaterThanOrEqual(2);
  });
});
