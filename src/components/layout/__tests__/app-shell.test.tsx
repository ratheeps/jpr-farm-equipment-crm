import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Plus, Save } from "lucide-react";
import { AppShell } from "../app-shell";
import { useFab } from "../fab-context";
import { useTopBar } from "../topbar-context";

vi.mock("@/lib/offline/sync", () => ({
  syncAll: vi.fn(async () => {}),
  pendingSyncCount: vi.fn(async () => 0),
  registerBackgroundSync: vi.fn(async () => {}),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/operator",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({ locale: "en" }),
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
      <AppShell role="operator">{children}</AppShell>
    </NextIntlClientProvider>
  );
}

describe("<AppShell>", () => {
  it("renders the brand TopBar by default and translates the role's FAB label", () => {
    renderShell(<div>page body</div>);
    expect(screen.getByText("JPR Farm")).toBeInTheDocument();
    const fab = screen.getByRole("link", { name: "Log work" });
    expect(fab).toHaveAttribute("href", "/en/operator/log");
  });

  it("page useTopBar() override replaces brand with title + back", () => {
    function Page() {
      useTopBar({ title: "Daily Logs", back: true });
      return <div>page body</div>;
    }
    renderShell(<Page />);
    expect(screen.getByRole("heading", { name: "Daily Logs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.queryByText("JPR Farm")).toBeNull();
  });

  it("page useFab() override replaces the role default FAB", () => {
    function Page() {
      useFab({ label: "Save form", icon: Save, onClick: () => {} });
      return <div>page body</div>;
    }
    renderShell(<Page />);
    expect(screen.getByRole("button", { name: "Save form" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log work" })).toBeNull();
  });

  it("page useFab({ hidden: true }) hides the FAB entirely", () => {
    function Page() {
      useFab({ label: "Hidden", icon: Plus, hidden: true });
      return <div>page body</div>;
    }
    renderShell(<Page />);
    expect(screen.queryByRole("link", { name: "Log work" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hidden" })).toBeNull();
  });
});
