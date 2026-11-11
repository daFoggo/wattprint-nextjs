"use client";

import * as React from "react";
import { EASE_OUT, EASE_THROW, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * SLIDER: one value or a range
 *
 *   click    a press on the track throws the nearest thumb there
 *            (slight overshoot), the fill following it
 *   drag     then it tracks the finger 1:1, snapped to `step`;
 *            two thumbs never cross
 *   bubble   the value rises out of the thumb while you drag or
 *            move it by keyboard, and sinks back after
 *   keys     arrows step, Page Up/Down step ten, Home/End jump
 *
 * Vertical page scroll still works when a drag starts on it.
 * ───────────────────────────────────────────────────────── */

export interface SliderProps {
  /** One number, or two for a range. */
  value?: number | number[];
  defaultValue?: number | number[];
  onValueChange?: (value: number[]) => void;
  /** Called once when a drag or key press ends. */
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  /** How the bubble and screen readers say a value. */
  format?: (value: number) => string;
  /** Accessible name; for a range, the thumbs get "… minimum" and "… maximum". */
  label: string;
  disabled?: boolean;
  className?: string;
}

const toArray = (v: number | number[] | undefined, fallback: number[]) => (v === undefined ? fallback : Array.isArray(v) ? v : [v]);

export function Slider({
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  format = (v) => String(v),
  label,
  disabled,
  className = "",
}: SliderProps) {
  const reduced = useInteractionReducedMotion();
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState(() => toArray(defaultValue, [min]));
  const values = toArray(value, own);
  const [active, setActive] = React.useState<number | null>(null);
  const [mode, setMode] = React.useState<"rest" | "throw" | "drag">("rest");
  const [bubble, setBubble] = React.useState<number | null>(null);
  const latest = React.useRef(values);
  React.useLayoutEffect(() => {
    latest.current = values;
  });

  React.useEffect(() => {
    if (bubble === null || active !== null) return;
    const timer = window.setTimeout(() => setBubble(null), 700);
    return () => window.clearTimeout(timer);
  }, [bubble, active]);

  const snap = (v: number) => {
    const stepped = Math.round((v - min) / step) * step + min;
    return Math.min(max, Math.max(min, Number(stepped.toFixed(6))));
  };
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  const commit = (index: number, raw: number) => {
    const next = [...latest.current];
    const lo = index > 0 ? next[index - 1] : min;
    const hi = index < next.length - 1 ? next[index + 1] : max;
    next[index] = Math.min(hi, Math.max(lo, snap(raw)));
    if (next[index] === latest.current[index]) return latest.current;
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
    latest.current = next;
    return next;
  };

  const fromPointer = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return min + ((clientX - rect.left) / rect.width) * (max - min);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    const raw = fromPointer(e.clientX);
    // The nearest thumb takes the press; on a tie, the one that can move that way.
    let index = 0;
    values.forEach((v, i) => {
      if (Math.abs(v - raw) < Math.abs(values[index] - raw) || (Math.abs(v - raw) === Math.abs(values[index] - raw) && raw > v)) index = i;
    });
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(index);
    setBubble(index);
    setMode("throw");
    commit(index, raw);
    trackRef.current?.parentElement?.querySelectorAll<HTMLElement>("[role=slider]")[index]?.focus({ preventScroll: true });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (active === null) return;
    if (mode !== "drag") setMode("drag");
    commit(active, fromPointer(e.clientX));
  };

  const end = () => {
    if (active === null) return;
    setActive(null);
    setMode("rest");
    onValueCommit?.(latest.current);
  };

  const onKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return;
    const big = step * 10;
    const deltas: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big };
    let target: number | null = null;
    if (e.key in deltas) target = values[index] + deltas[e.key];
    else if (e.key === "Home") target = min;
    else if (e.key === "End") target = max;
    if (target === null) return;
    e.preventDefault();
    setMode("throw");
    setBubble(index);
    onValueCommit?.(commit(index, target));
  };

  const motion = reduced || mode === "drag" ? "none" : `left 420ms ${EASE_THROW}, right 420ms ${EASE_THROW}`;
  const range = values.length > 1;
  const lo = range ? pct(values[0]) : 0;
  const hi = pct(values[values.length - 1]);

  return (
    <div className={`relative w-full select-none pb-2 pt-8 ${disabled ? "opacity-50" : ""} ${className}`}>
      <div className="relative">
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        className={`relative h-5 [touch-action:pan-y] ${disabled ? "" : "cursor-pointer"}`}
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--border)]">
          <div className="absolute inset-y-0 rounded-full bg-primary" style={{ left: `${lo}%`, right: `${100 - hi}%`, transition: motion }} />
        </div>
      </div>
      {values.map((v, i) => (
        <span
          key={i}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={range ? `${label} ${i === 0 ? "minimum" : "maximum"}` : label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={v}
          aria-valuetext={format(v)}
          aria-disabled={disabled || undefined}
          onKeyDown={onKeyDown(i)}
          onBlur={() => setBubble((b) => (b === i ? null : b))}
          className="group/thumb pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none"
          style={{ left: `${pct(v)}%`, transition: motion }}
        >
          <span
            className={`absolute inset-0 rounded-full bg-background shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_18%,var(--border))] transition-[scale,box-shadow] duration-200 group-focus-visible/thumb:shadow-[0_0_0_1px_var(--ring),0_0_0_4px_color-mix(in_oklab,var(--ring)_20%,transparent)] ${
              active === i && !reduced ? "scale-[1.15]" : ""
            }`}
          />
          <span
            aria-hidden="true"
            className="absolute bottom-[calc(100%_+_8px)] left-1/2 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-background"
            style={{
              opacity: bubble === i ? 1 : 0,
              transform: `translateX(-50%) ${bubble === i ? "none" : "translateY(4px) scale(0.85)"}`,
              filter: bubble === i ? "none" : "blur(3px)",
              transition: reduced ? "none" : `opacity 200ms ${EASE_OUT}, transform 320ms ${EASE_OUT}, filter 200ms ${EASE_OUT}`,
            }}
          >
            {format(v)}
          </span>
        </span>
      ))}
      </div>
    </div>
  );
}

export default Slider;
