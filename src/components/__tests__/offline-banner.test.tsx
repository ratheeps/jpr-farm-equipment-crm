import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { OfflineBanner } from "../offline-banner";

const messages = {
  operator: { offlineBanner: "Working offline" },
};

function renderBanner(getPending: () => Promise<number>) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <OfflineBanner getPendingCount={getPending} />
    </NextIntlClientProvider>
  );
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
}

describe("<OfflineBanner>", () => {
  beforeEach(() => {
    setOnline(true);
  });

  it("renders nothing when online with zero pending records", async () => {
    const { container } = renderBanner(async () => 0);
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the offline banner when navigator.onLine is false", async () => {
    setOnline(false);
    renderBanner(async () => 0);
    await act(async () => {});
    expect(screen.getByRole("status")).toHaveTextContent("Working offline");
  });

  it("includes the unsynced count when offline and pending > 0", async () => {
    setOnline(false);
    renderBanner(async () => 3);
    await act(async () => {});
    expect(screen.getByRole("status")).toHaveTextContent(/3 unsynced/);
  });

  it("renders a syncing label when online with pending records", async () => {
    setOnline(true);
    renderBanner(async () => 2);
    await act(async () => {});
    expect(screen.getByRole("status")).toHaveTextContent(/Syncing/);
    expect(screen.getByRole("status")).toHaveTextContent(/2/);
  });

  it("hides again after the offline event fires followed by online with zero pending", async () => {
    let pending = 0;
    renderBanner(async () => pending);
    await act(async () => {});
    expect(screen.queryByRole("status")).toBeNull();

    setOnline(false);
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Working offline");
  });
});
