import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import {
  TopBarProvider,
  useTopBar,
  useTopBarOverride,
} from "../topbar-context";

function Consumer({
  override,
}: {
  override: { title: string; back?: boolean } | null;
}) {
  useTopBar(override);
  return null;
}

function Probe() {
  const o = useTopBarOverride();
  return <span data-testid="probe">{o ? o.title : "none"}</span>;
}

describe("useTopBar", () => {
  it("publishes override on mount and clears on unmount", () => {
    const { rerender, getByTestId } = render(
      <TopBarProvider>
        <Probe />
        <Consumer override={{ title: "Staff", back: true }} />
      </TopBarProvider>
    );
    expect(getByTestId("probe").textContent).toBe("Staff");

    rerender(
      <TopBarProvider>
        <Probe />
      </TopBarProvider>
    );
    expect(getByTestId("probe").textContent).toBe("none");
  });

  it("does not infinite-loop when override is a fresh object literal each render", () => {
    let renderCount = 0;
    function FreshObjectConsumer() {
      renderCount += 1;
      useTopBar({ title: "Staff", back: true });
      return null;
    }
    render(
      <TopBarProvider>
        <Probe />
        <FreshObjectConsumer />
      </TopBarProvider>
    );
    expect(renderCount).toBeLessThan(10);
  });

  it("re-publishes when title changes", () => {
    function Walker({ title }: { title: string }) {
      useTopBar({ title });
      return null;
    }
    const { getByTestId, rerender } = render(
      <TopBarProvider>
        <Probe />
        <Walker title="A" />
      </TopBarProvider>
    );
    expect(getByTestId("probe").textContent).toBe("A");
    rerender(
      <TopBarProvider>
        <Probe />
        <Walker title="B" />
      </TopBarProvider>
    );
    expect(getByTestId("probe").textContent).toBe("B");
  });
});
