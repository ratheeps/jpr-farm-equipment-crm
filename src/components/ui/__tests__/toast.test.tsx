import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToastProvider, ToastViewport, Toast, ToastTitle } from "../toast";

describe("<Toast>", () => {
  it("renders an open toast with a title", () => {
    render(
      <ToastProvider>
        <Toast open variant="success">
          <ToastTitle>Saved</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
