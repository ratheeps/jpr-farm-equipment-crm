"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  formatter?: (v: number) => string;
  className?: string;
}

const HOLD_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 80;

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  formatter,
  className,
}: StepperProps) {
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const apply = React.useCallback(
    (delta: 1 | -1) => {
      const next = clamp(round(valueRef.current + delta * step), min, max);
      if (next !== valueRef.current) {
        onChange(next);
        return true;
      }
      return false;
    },
    [step, min, max, onChange]
  );

  const stopRepeat = React.useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (repeatTimer.current) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  }, []);

  const startRepeat = React.useCallback(
    (delta: 1 | -1) => {
      apply(delta);
      holdTimer.current = setTimeout(() => {
        repeatTimer.current = setInterval(() => {
          if (!apply(delta)) stopRepeat();
        }, REPEAT_INTERVAL_MS);
      }, HOLD_DELAY_MS);
    },
    [apply, stopRepeat]
  );

  React.useEffect(() => stopRepeat, [stopRepeat]);

  const buttonHandlers = (delta: 1 | -1) => ({
    onPointerDown: () => startRepeat(delta),
    onPointerUp: stopRepeat,
    onPointerLeave: stopRepeat,
    onPointerCancel: stopRepeat,
  });

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        disabled={value <= min}
        aria-label="Decrease"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground disabled:opacity-40"
        {...buttonHandlers(-1)}
      >
        <Minus className="h-5 w-5" strokeWidth={2.25} />
      </button>
      <div className="flex-1 rounded-lg border-2 border-border bg-card py-2 text-center text-2xl font-extrabold tabular-nums">
        {formatter ? formatter(value) : value}
      </div>
      <button
        type="button"
        disabled={value >= max}
        aria-label="Increase"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        {...buttonHandlers(1)}
      >
        <Plus className="h-5 w-5" strokeWidth={2.25} />
      </button>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
