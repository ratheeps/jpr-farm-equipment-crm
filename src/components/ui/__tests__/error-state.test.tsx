import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "../error-state";

describe("<ErrorState>", () => {
  it("renders title and retry button", async () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Could not load" onRetry={onRetry} />);
    expect(screen.getByText("Could not load")).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Try again" });
    await userEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
