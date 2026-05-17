import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

const replaceSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceSpy }),
  usePathname: () => "/operator/history",
  useSearchParams: () => new URLSearchParams("q=foo&page=2"),
}));

import { ListSearch } from "../list-search";

const messages = {
  common: { search: "Search", clearSearch: "Clear search" },
};

function renderSearch() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ListSearch />
    </NextIntlClientProvider>
  );
}

describe("<ListSearch>", () => {
  beforeEach(() => {
    replaceSpy.mockClear();
  });

  it("seeds the input from the q query param", () => {
    renderSearch();
    expect(screen.getByRole("searchbox")).toHaveValue("foo");
  });

  it("renders a clear button when the input has a value, and clicking it clears + replaces URL", async () => {
    renderSearch();
    const clear = screen.getByRole("button", { name: /Clear search/i });
    await userEvent.click(clear);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(replaceSpy).toHaveBeenCalled();
    const lastUrl = replaceSpy.mock.calls.at(-1)?.[0] as string;
    expect(lastUrl).not.toMatch(/[?&]q=/);
    expect(lastUrl).not.toMatch(/[?&]page=/);
  });

  it("does not render the clear button when the input is empty", async () => {
    renderSearch();
    const input = screen.getByRole("searchbox");
    await userEvent.clear(input);
    expect(screen.queryByRole("button", { name: /Clear search/i })).toBeNull();
  });

  it("debounces router.replace until typing settles", () => {
    vi.useFakeTimers();
    try {
      renderSearch();
      replaceSpy.mockClear();
      const input = screen.getByRole("searchbox");
      fireEvent.change(input, { target: { value: "a" } });
      fireEvent.change(input, { target: { value: "ab" } });
      fireEvent.change(input, { target: { value: "abc" } });
      // Debounce timer has not fired.
      expect(replaceSpy).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(replaceSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
