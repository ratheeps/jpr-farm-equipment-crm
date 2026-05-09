import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceSpy }),
  usePathname: () => "/operator/history",
  useSearchParams: () => new URLSearchParams("q=foo&page=2"),
}));

import { ListSearch } from "../list-search";

describe("<ListSearch>", () => {
  beforeEach(() => {
    replaceSpy.mockClear();
  });

  it("seeds the input from the q query param", () => {
    render(<ListSearch />);
    expect(screen.getByRole("searchbox")).toHaveValue("foo");
  });

  it("renders a clear button when the input has a value, and clicking it clears + replaces URL", async () => {
    render(<ListSearch />);
    const clear = screen.getByRole("button", { name: /Clear search/i });
    await userEvent.click(clear);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(replaceSpy).toHaveBeenCalled();
    const lastUrl = replaceSpy.mock.calls.at(-1)?.[0] as string;
    expect(lastUrl).not.toMatch(/[?&]q=/);
    expect(lastUrl).not.toMatch(/[?&]page=/);
  });

  it("does not render the clear button when the input is empty", async () => {
    render(<ListSearch />);
    const input = screen.getByRole("searchbox");
    await userEvent.clear(input);
    expect(screen.queryByRole("button", { name: /Clear search/i })).toBeNull();
  });
});
