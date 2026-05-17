import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { WizardShell } from "../wizard-shell";

const messages = {
  common: { save: "Save", back: "Back" },
  forms: { next: "Next", stepProgress: "Step {current} of {total}" },
};

function renderShell(children: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("<WizardShell>", () => {
  it("advances and goes back", async () => {
    const onSubmit = vi.fn();
    renderShell(
      <WizardShell onSubmit={onSubmit}>
        <div>Step A</div>
        <div>Step B</div>
        <div>Step C</div>
      </WizardShell>
    );
    expect(screen.getByText("Step A")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step B")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Step A")).toBeInTheDocument();
  });

  it("submits on the last step", async () => {
    const onSubmit = vi.fn();
    renderShell(
      <WizardShell onSubmit={onSubmit}>
        <div>Only step</div>
      </WizardShell>
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("routes onSubmit failure to onSubmitError instead of throwing", async () => {
    const err = new Error("boom");
    const onSubmit = vi.fn(async () => {
      throw err;
    });
    const onSubmitError = vi.fn();
    renderShell(
      <WizardShell onSubmit={onSubmit} onSubmitError={onSubmitError}>
        <div>Only step</div>
      </WizardShell>
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmitError).toHaveBeenCalledWith(err));
  });
});
