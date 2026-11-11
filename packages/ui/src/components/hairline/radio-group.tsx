"use client";

import * as React from "react";
import { EASE_OUT, EASE_THROW, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * RADIO GROUP: one choice, one moving mark
 *
 *   list    the dot shrinks out of the old circle as it pops
 *           into the new one (a slight overshoot)
 *   cards   options are cards; the selection is one frame that
 *           glides from card to card, its height easing when
 *           the cards differ, instead of rings blinking
 *
 * Real radio inputs underneath: arrow keys, forms and screen
 * readers behave exactly as native radios do.
 * ───────────────────────────────────────────────────────── */

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Right side of a card, e.g. a price. */
  aside?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Form name; one is made up if you don't pass it. */
  name?: string;
  /** Accessible name of the group (shown as a legend when `showLabel`). */
  label: string;
  showLabel?: boolean;
  variant?: "list" | "cards";
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  className?: string;
}

type Mark = { y: number; x: number; w: number; h: number };

export function RadioGroup({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  label,
  showLabel = false,
  variant = "list",
  orientation = "vertical",
  disabled,
  className = "",
}: RadioGroupProps) {
  const reduced = useInteractionReducedMotion();
  const auto = React.useId();
  const group = name ?? auto;
  const [own, setOwn] = React.useState(defaultValue ?? null);
  const current = value !== undefined ? value : own;
  const listRef = React.useRef<HTMLDivElement>(null);
  const [mark, setMark] = React.useState<Mark | null>(null);
  const [ready, setReady] = React.useState(false);
  const cards = variant === "cards";

  React.useLayoutEffect(() => {
    if (!cards) return;
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = current ? list.querySelector<HTMLElement>(`[data-radio="${CSS.escape(current)}"]`) : null;
      if (!el) return setMark(null);
      const next = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
      setMark((p) => (p && p.x === next.x && p.y === next.y && p.w === next.w && p.h === next.h ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [cards, current, options]);

  React.useEffect(() => {
    if (!mark || ready) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [mark, ready]);

  const pick = (v: string) => {
    if (value === undefined) setOwn(v);
    onValueChange?.(v);
  };

  return (
    <fieldset className={`m-0 min-w-0 border-0 p-0 ${className}`} disabled={disabled}>
      <legend className={showLabel ? "mb-2 px-0.5 text-[13px] font-medium text-foreground" : "sr-only"}>{label}</legend>
      <div
        ref={listRef}
        className={`relative flex ${orientation === "horizontal" ? "flex-row flex-wrap" : "flex-col"} ${cards ? "gap-2" : orientation === "horizontal" ? "gap-x-5 gap-y-2" : "gap-2.5"}`}
      >
        {cards && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-10 rounded-[14px] shadow-[inset_0_0_0_1.5px_var(--primary)]"
            style={{
              transform: `translate3d(${mark?.x ?? 0}px, ${mark?.y ?? 0}px, 0)`,
              width: mark?.w ?? 0,
              height: mark?.h ?? 0,
              opacity: mark ? 1 : 0,
              transition: reduced || !ready ? "none" : `transform 420ms ${EASE_THROW}, width 380ms ${EASE_OUT}, height 380ms ${EASE_OUT}, opacity 200ms ${EASE_OUT}`,
            }}
          />
        )}
        {options.map((option) => {
          const on = current === option.value;
          const off = disabled || option.disabled;
          return (
            <label
              key={option.value}
              data-radio={option.value}
              className={`group/radio relative flex select-none items-start gap-2.5 ${off ? "cursor-default opacity-50" : "cursor-pointer"} ${
                cards
                  ? `rounded-[14px] bg-background p-3.5 shadow-[inset_0_0_0_1px_var(--border)] transition-[background-color] duration-200 ${on ? "bg-accent/50" : "hover:bg-accent/40"}`
                  : ""
              }`}
            >
              <span className="relative mt-[2px] inline-flex size-4 shrink-0">
                <input
                  type="radio"
                  name={group}
                  value={option.value}
                  checked={on}
                  disabled={off}
                  onChange={() => pick(option.value)}
                  className="peer absolute inset-0 m-0 size-full cursor-[inherit] appearance-none rounded-full outline-none"
                />
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 rounded-full bg-background transition-[box-shadow,scale] duration-200 group-active/radio:scale-[0.88] peer-focus-visible:shadow-[inset_0_0_0_1px_var(--ring),0_0_0_3px_color-mix(in_oklab,var(--ring)_20%,transparent)] motion-reduce:group-active/radio:scale-100 ${
                    on ? "shadow-[inset_0_0_0_1.5px_var(--primary)]" : "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_22%,var(--border))] group-hover/radio:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_40%,var(--border))]"
                  }`}
                >
                  <span
                    className="absolute inset-[4px] rounded-full bg-primary"
                    style={{ transform: on ? "scale(1)" : "scale(0)", transition: reduced ? "none" : on ? `transform 380ms ${EASE_THROW}` : `transform 200ms ${EASE_OUT}` }}
                  />
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13.5px] font-medium leading-5 text-foreground">{option.label}</span>
                {option.description && <span className="text-[12.5px] leading-snug text-muted-foreground">{option.description}</span>}
              </span>
              {option.aside && <span className="shrink-0 text-[13px] tabular-nums text-foreground">{option.aside}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default RadioGroup;
