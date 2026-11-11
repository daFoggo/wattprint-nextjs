"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";

/* ─────────────────────────────────────────────────────────
 * PRICING TOGGLE: monthly or yearly, and every price rolls
 *
 *   toggle   the thumb slides and resizes to the chosen option
 *            with a little give; the labels trade colour
 *   badge    "Save 20%" sits inside Yearly and lights up in
 *            your brand colour when it's chosen
 *   prices   Price rolls each figure to its new amount, and the
 *            billing line crossfades in the direction you went
 *
 * PricingToggle is the control; Price is the number. Use them
 * together across your plan columns.
 * ───────────────────────────────────────────────────────── */

export interface BillingOption {
  value: string;
  label: string;
  /** e.g. "Save 20%". */
  badge?: string;
}

export interface PricingToggleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  options?: BillingOption[];
  label?: string;
  size?: "default" | "sm";
}

export interface PriceProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: number;
  currency?: string;
  /** Format in this locale everywhere. Without it, a server render and hydration use en-US and the visitor's locale takes over after mount. */
  locales?: string | string[];
  /** e.g. "/mo"; hidden for free plans. */
  period?: string;
  /** A line under the price, e.g. "$288 billed yearly". */
  note?: string;
  /** Which way the toggle moved (1 or -1), so the note slides with it. */
  direction?: number;
  /** Classes for the figure, e.g. its size. */
  numberClassName?: string;
}

const BILLING: BillingOption[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly", badge: "Save 20%" },
];
// A little give at the end of the slide, so the thumb feels like it was thrown, not placed.
const THROW = "cubic-bezier(0.34,1.36,0.64,1)";
const EASE = "cubic-bezier(0.23,1,0.32,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

export function PricingToggle({
  value,
  onValueChange,
  options = BILLING,
  label = "Billing period",
  size = "default",
  className = "",
  ...props
}: PricingToggleProps) {
  const reduced = useReducedMotion();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = React.useState({ left: 0, width: 0, ready: false });
  const active = Math.max(0, options.findIndex((o) => o.value === value));

  React.useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[active];
      if (!el) return;
      const left = el.offsetLeft;
      const width = el.offsetWidth;
      setThumb((t) => (t.left === left && t.width === width ? t : { left, width, ready: t.width > 0 }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [active, options]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onValueChange(options[next].value);
    refs.current[next]?.focus();
  };

  const isSm = size === "sm";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`relative inline-flex items-center rounded-full border border-border bg-muted/60 ${
        isSm ? "p-0.5" : "p-0.5 sm:p-1"
      } ${className}`}
      {...props}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 rounded-full bg-background shadow-[0_0_0_1px_var(--border)] ${
          isSm ? "inset-y-0.5" : "inset-y-0.5 sm:inset-y-1"
        }`}
        style={{
          width: thumb.width,
          transform: `translateX(${thumb.left}px)`,
          transition: thumb.ready && !reduced ? `transform 520ms ${THROW}, width 420ms ${EASE}` : "none",
        }}
      />
      {options.map((option, i) => {
        const selected = i === active;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={`cursor-pointer relative flex items-center rounded-full font-medium transition-colors duration-300 ${FOCUS} ${
              isSm
                ? "h-7 gap-1.5 px-2.5 text-[12px]"
                : "h-7 gap-1.5 px-2.5 text-[12px] sm:h-8 sm:gap-2 sm:px-3.5 sm:text-[13px]"
            } ${
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
            {option.badge && (
              <span
                className={`rounded-full font-medium transition-[background-color,color] duration-300 ${
                  isSm ? "px-1.5 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-[10px] sm:py-px sm:text-[11px]"
                } ${
                  selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Price({
  amount,
  currency = "USD",
  locales,
  period = "/mo",
  note,
  direction = 1,
  numberClassName = "text-[40px] font-medium leading-[1.15] tracking-[-0.03em] text-foreground",
  className = "",
  ...props
}: PriceProps) {
  const format = React.useMemo<Intl.NumberFormatOptions>(
    () => ({ style: "currency", currency, maximumFractionDigits: amount % 1 ? 2 : 0, minimumFractionDigits: amount % 1 ? 2 : 0 }),
    [currency, amount]
  );
  return (
    <div className={className} {...props}>
      <div className="flex items-baseline gap-1">
        <NumberRoll value={amount} format={format} locales={locales} className={numberClassName} />
        {amount > 0 && period && <span className="text-[14px] text-muted-foreground">{period}</span>}
      </div>
      {note !== undefined && (
        <div className="relative mt-1 h-5 overflow-hidden text-[12.5px] text-muted-foreground">
          <span
            key={note}
            className="absolute inset-0 truncate motion-safe:animate-[ui-note-in_380ms_cubic-bezier(0.23,1,0.32,1)_both]"
            style={{ "--ui-from": `${direction > 0 ? 100 : -100}%` } as React.CSSProperties}
          >
            {note}
          </span>
        </div>
      )}
    </div>
  );
}
