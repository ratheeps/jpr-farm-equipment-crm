import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Plus, Save } from "lucide-react";
import { AppShell } from "../app-shell";
import { useFab } from "../fab-context";

// Mock Dexie + sync engine to keep AppShell from touching IndexedDB
vi.mock("@/lib/offline/sync", () => ({
  syncAll: vi.fn(async () => {}),
  pendingSyncCount: vi.fn(async () => 0),
  registerBackgroundSync: vi.fn(async () => {}),
}));

// Mock next/navigation so BottomNav's Links don't blow up under jsdom routing
vi.mock("next/navigation", () => ({
  usePathname: () => "/en/operator",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

const messages = {
  nav: {
    home: "Home",
    history: "History",
    expenses: "Expenses",
    leave: "Leave",
    more: "More",
    logWork: "Log work",
  },
  operator: { offlineBanner: "Working offline" },
};

function renderShell(children: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AppShell role="operator" topBar={<header data-testid="topbar">brand</header>}>
        {children}
      </AppShell>
    </NextIntlClientProvider>
  );
}

describe("<AppShell>", () => {
  it("renders the topBar slot and the role's default FAB", () => {
    renderShell(<div>page body</div>);
    expect(screen.getByTestId("topbar")).toBeInTheDocument();
    // operator role's default FAB labelKey is "logWork" (raw string, not translated)
    const fab = screen.getByRole("link", { name: "logWork" });
    expect(fab).toHaveAttribute("href", "/en/operator/log");
  });

  it("page useFab() override replaces the role default FAB", () => {
    function Page() {
      useFab({ label: "Save form", icon: Save, onClick: () => {} });
      return <div>page body</div>;
    }
    renderShell(<Page />);
    // Override produces a button (no href), default would be a link
    expect(screen.getByRole("button", { name: "Save form" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "logWork" })).toBeNull();
  });

  it("page useFab({ hidden: true }) hides the FAB entirely", () => {
    function Page() {
      useFab({ label: "Hidden", icon: Plus, hidden: true });
      return <div>page body</div>;
    }
    renderShell(<Page />);
    expect(screen.queryByRole("link", { name: "logWork" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hidden" })).toBeNull();
  });
});
