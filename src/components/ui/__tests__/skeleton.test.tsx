import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "../skeleton";

describe("<Skeleton>", () => {
  it("applies the shimmer class", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk").classList.contains("skeleton")).toBe(true);
  });
  it("merges custom className", () => {
    render(<Skeleton className="h-4 w-32" data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.classList.contains("h-4")).toBe(true);
    expect(el.classList.contains("w-32")).toBe(true);
  });
});
