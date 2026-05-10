import { describe, it, expect } from "vitest";
import { render, act } from "@testing-library/react";
import { Plus } from "lucide-react";
import * as React from "react";
import { FabProvider, useFab, useFabOverride } from "../fab-context";

function Consumer({ override }: { override: { label: string; icon: typeof Plus } | null }) {
  useFab(override);
  return null;
}

function Probe() {
  const o = useFabOverride();
  return <span data-testid="probe">{o ? o.label : "none"}</span>;
}

describe("useFab", () => {
  it("publishes override on mount and clears on unmount", () => {
    const { rerender, getByTestId, unmount } = render(
      <FabProvider>
        <Probe />
        <Consumer override={{ label: "Log work", icon: Plus }} />
      </FabProvider>
    );
    expect(getByTestId("probe").textContent).toBe("Log work");

    rerender(
      <FabProvider>
        <Probe />
      </FabProvider>
    );
    // After Consumer unmounts the cleanup should have cleared.
    expect(getByTestId("probe").textContent).toBe("none");

    unmount();
  });

  it("does not infinite-loop when override is a fresh object literal each render", () => {
    let renderCount = 0;
    function FreshObjectConsumer() {
      renderCount += 1;
      useFab({ label: "Log work", icon: Plus });
      return null;
    }
    render(
      <FabProvider>
        <Probe />
        <FreshObjectConsumer />
      </FabProvider>
    );
    // A correct implementation stabilizes within a small constant number of
    // renders (mount + at most one re-render after the effect publishes).
    // The buggy version would blow past 50 trivially.
    expect(renderCount).toBeLessThan(10);
  });

  it("re-publishes when meaningful override fields change", () => {
    function Walker({ label }: { label: string }) {
      useFab({ label, icon: Plus });
      return null;
    }
    const { getByTestId, rerender } = render(
      <FabProvider>
        <Probe />
        <Walker label="A" />
      </FabProvider>
    );
    expect(getByTestId("probe").textContent).toBe("A");
    rerender(
      <FabProvider>
        <Probe />
        <Walker label="B" />
      </FabProvider>
    );
    expect(getByTestId("probe").textContent).toBe("B");
  });
});
