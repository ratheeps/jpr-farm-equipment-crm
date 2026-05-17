import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Icon } from "../icon";

describe("<Icon>", () => {
  it("renders an svg with the requested size class", () => {
    render(<Icon name="vehicle.tractor" size="lg" data-testid="icon" />);
    const el = screen.getByTestId("icon");
    expect(el.classList.contains("h-6")).toBe(true);
    expect(el.classList.contains("w-6")).toBe(true);
  });

  it("uses md size by default", () => {
    render(<Icon name="vehicle.tractor" data-testid="icon" />);
    const el = screen.getByTestId("icon");
    expect(el.classList.contains("h-5")).toBe(true);
  });

  it("forwards aria-label for accessibility", () => {
    render(<Icon name="vehicle.tractor" aria-label="Tractor" />);
    expect(screen.getByLabelText("Tractor")).toBeInTheDocument();
  });
});
