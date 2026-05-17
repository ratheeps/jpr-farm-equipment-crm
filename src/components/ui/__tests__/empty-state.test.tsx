import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "../empty-state";

describe("<EmptyState>", () => {
  it("renders icon, title, and description", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No logs yet"
        description="Tap the green plus button to add one"
      />
    );
    expect(screen.getByText("No logs yet")).toBeInTheDocument();
    expect(
      screen.getByText("Tap the green plus button to add one")
    ).toBeInTheDocument();
  });

  it("renders an action link when provided", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No logs"
        actionLabel="Add log"
        actionHref="/operator/log"
      />
    );
    const link = screen.getByRole("link", { name: "Add log" });
    expect(link).toHaveAttribute("href", "/operator/log");
  });
});
