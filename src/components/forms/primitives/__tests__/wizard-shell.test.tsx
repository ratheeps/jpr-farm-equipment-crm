import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardShell } from "../wizard-shell";

describe("<WizardShell>", () => {
  it("advances and goes back", async () => {
    const onSubmit = vi.fn();
    render(
      <WizardShell onSubmit={onSubmit}>
        <div>Step A</div>
        <div>Step B</div>
        <div>Step C</div>
      </WizardShell>
    );
    expect(screen.getByText("Step A")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step B")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Step A")).toBeInTheDocument();
  });

  it("submits on the last step", async () => {
    const onSubmit = vi.fn();
    render(
      <WizardShell onSubmit={onSubmit}>
        <div>Only step</div>
      </WizardShell>
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
