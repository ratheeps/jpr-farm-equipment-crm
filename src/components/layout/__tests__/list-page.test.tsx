import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListPageHeader } from "../list-page";

describe("<ListPageHeader>", () => {
  it("renders title and count badge", () => {
    render(<ListPageHeader title="Vehicles" count={12} />);
    expect(screen.getByText("Vehicles")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
