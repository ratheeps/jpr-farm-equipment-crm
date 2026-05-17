import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { ErrorState } from "../error-state";

const messages = {
  forms: {
    couldNotLoad: "Could not load",
    errorRetryHint: "Try again or save offline.",
    tryAgain: "Try again",
  },
};

function renderState(props: React.ComponentProps<typeof ErrorState>) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ErrorState {...props} />
    </NextIntlClientProvider>
  );
}

describe("<ErrorState>", () => {
  it("renders the default title + description from translations", () => {
    renderState({});
    expect(screen.getByText("Could not load")).toBeInTheDocument();
    expect(screen.getByText("Try again or save offline.")).toBeInTheDocument();
  });

  it("renders the retry button and fires onRetry", async () => {
    const onRetry = vi.fn();
    renderState({ onRetry });
    const button = screen.getByRole("button", { name: "Try again" });
    await userEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("explicit props override the translated defaults", () => {
    renderState({ title: "Custom", description: "Custom desc" });
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("Custom desc")).toBeInTheDocument();
  });
});
