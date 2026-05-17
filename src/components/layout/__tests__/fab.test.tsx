import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus } from "lucide-react";
import { Fab } from "../fab";

describe("<Fab>", () => {
  it("renders nothing when hidden", () => {
    const { container } = render(
      <Fab label="Log work" icon={Plus} hidden onClick={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an <a> when href is set", () => {
    render(<Fab label="Log work" icon={Plus} href="/operator/log" />);
    const link = screen.getByRole("link", { name: "Log work" });
    expect(link).toHaveAttribute("href", "/operator/log");
  });

  it("renders a <button> with onClick when href is absent", async () => {
    const onClick = vi.fn();
    render(<Fab label="Save" icon={Plus} onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "Save" });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies shadow-fab + fixed positioning classes", () => {
    render(<Fab label="Save" icon={Plus} onClick={() => {}} />);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn.className).toMatch(/shadow-fab/);
    expect(btn.className).toMatch(/fixed/);
  });
});
