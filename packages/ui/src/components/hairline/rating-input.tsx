"use client";

import * as React from "react";
import { Field, useFieldIds } from "./field";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";
import { EASE_OUT, EASE_THROW, useInteractionReducedMotion } from "./ui-interaction-motion";

export interface RatingInputProps {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  max?: number;
  allowHalf?: boolean;
  clearable?: boolean;
  labels?: readonly string[];
  showValue?: boolean;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  size?: "sm" | "md" | "lg";
  id?: string;
  className?: string;
}

const DEFAULT_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/*
 * The fill runs star to star in the direction the rating moved (each star waits for the one before it), a hovered or
 * focused rating is a lighter preview of the same fill, and the star you pick gives one small throw.
 */
const STAGGER = 45;

const Star = React.forwardRef<HTMLSpanElement, { fill: number; active: boolean; preview: boolean; delay: number; size: number; reduced: boolean }>(function Star(
  { fill, active, preview, delay, size, reduced },
  ref,
) {
  const path = "m12 2.7 2.85 5.78 6.38.93-4.62 4.5 1.09 6.36L12 17.27l-5.7 3 1.09-6.36-4.62-4.5 6.38-.93L12 2.7Z";
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="relative block"
      style={{ width: size, height: size, transform: active ? "scale(1.08)" : "scale(1)", transition: reduced ? "none" : `transform 340ms ${EASE_THROW}` }}
    >
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full" fill="none">
        <path d={path} style={{ fill: "color-mix(in oklab, var(--foreground) 4%, transparent)", stroke: "color-mix(in oklab, var(--foreground) 24%, var(--border))" }} strokeWidth="1.35" strokeLinejoin="round" />
      </svg>
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{
          width: `${fill * 100}%`,
          opacity: preview ? 0.5 : 1,
          transition: reduced ? "none" : `width 260ms ${EASE_OUT} ${delay}ms, opacity 200ms ${EASE_OUT}`,
        }}
      >
        <svg viewBox="0 0 24 24" className="absolute inset-y-0 left-0 h-full max-w-none" style={{ width: size }} fill="none">
          <path d={path} fill="var(--primary)" stroke="var(--primary)" strokeWidth="1.35" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
});

export function RatingInput({
  value,
  defaultValue = null,
  onValueChange,
  max = 5,
  allowHalf = false,
  clearable = true,
  labels = DEFAULT_LABELS,
  showValue = true,
  label,
  hint,
  error,
  required,
  disabled,
  readOnly,
  name,
  size = "md",
  id,
  className = "",
}: RatingInputProps) {
  const reduced = useInteractionReducedMotion();
  const ids = useFieldIds(id);
  const autoName = React.useId();
  const groupName = name ?? autoName;
  const [own, setOwn] = React.useState<number | null>(defaultValue);
  const [preview, setPreview] = React.useState<number | null>(null);
  const count = Math.max(1, Math.min(10, Math.round(max)));
  const step = allowHalf ? 0.5 : 1;
  const normalise = (next: number | null) => (next === null ? null : clamp(Math.round(next / step) * step, step, count));
  const current = normalise(value !== undefined ? value : own);
  const shown = preview ?? current ?? 0;
  // Where the fill last stood, so the run can start from there and go the way it moved.
  const [trail, setTrail] = React.useState({ from: shown, to: shown });
  if (trail.to !== shown) setTrail({ from: trail.to, to: shown });
  const stars = React.useRef<(HTMLSpanElement | null)[]>([]);
  const delayFor = (index: number) => {
    const { from, to } = trail;
    if (to > from) return index + 1 > from && index < to ? (index - Math.floor(from)) * STAGGER : 0;
    if (to < from) return index + 1 > to && index < from ? (Math.ceil(from) - 1 - index) * STAGGER : 0;
    return 0;
  };
  const pixels = size === "sm" ? 24 : size === "lg" ? 34 : 29;
  const options = React.useMemo(() => Array.from({ length: count / step }, (_, i) => (i + 1) * step), [count, step]);
  const describedBy = [hint && !error ? ids.hint : null, error ? ids.error : null].filter(Boolean).join(" ") || undefined;
  const words = shown ? labels[Math.ceil(shown) - 1] ?? `${shown} out of ${count}` : "Not rated";

  const commit = (next: number | null) => {
    const normalised = normalise(next);
    if (value === undefined) setOwn(normalised);
    onValueChange?.(normalised);
    const star = normalised ? stars.current[Math.ceil(normalised) - 1] : null;
    if (star && !reduced) star.animate([{ scale: "1" }, { scale: "1.28" }, { scale: "1" }], { duration: 420, easing: EASE_THROW, composite: "add" });
  };

  return (
    <Field id={ids.id} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        <div
          role="radiogroup"
          aria-label={typeof label === "string" ? label : "Rating"}
          aria-describedby={describedBy}
          aria-readonly={readOnly || undefined}
          onPointerLeave={() => setPreview(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPreview(null);
          }}
          className={`flex items-center gap-0.5 ${disabled ? "opacity-50" : ""}`}
        >
          {Array.from({ length: count }, (_, index) => {
            const fill = clamp(shown - index, 0, 1);
            return (
              <span key={index} className="relative" style={{ width: pixels, height: pixels }}>
                {options.filter((option) => Math.ceil(option) === index + 1).map((option) => {
                  const half = allowHalf && option % 1 !== 0;
                  return (
                    <label
                      key={option}
                      className={`absolute inset-y-0 z-10 ${half ? "left-0 w-1/2" : allowHalf ? "right-0 w-1/2" : "inset-x-0"} ${disabled || readOnly ? "cursor-default" : "cursor-pointer"}`}
                      onPointerEnter={() => {
                        if (!disabled && !readOnly) setPreview(option);
                      }}
                    >
                      <input
                        id={option === step ? ids.id : undefined}
                        type="radio"
                        name={groupName}
                        value={option}
                        checked={current === option}
                        required={required}
                        disabled={disabled}
                        tabIndex={readOnly ? -1 : undefined}
                        aria-label={`${option} out of ${count}`}
                        className="peer absolute inset-0 m-0 size-full cursor-[inherit] opacity-0 outline-none"
                        onFocus={() => {
                          if (!readOnly) setPreview(option);
                        }}
                        onBlur={() => setPreview(null)}
                        onChange={() => {
                          if (!readOnly) commit(option);
                        }}
                        onClick={(e) => {
                          if (readOnly) {
                            e.preventDefault();
                            return;
                          }
                          if (clearable && current === option) {
                            commit(null);
                            setPreview(null);
                          }
                        }}
                      />
                      <span className="pointer-events-none absolute inset-0 rounded-full peer-focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--ring)]" aria-hidden="true" />
                    </label>
                  );
                })}
                <Star
                  ref={(el) => {
                    stars.current[index] = el;
                  }}
                  fill={fill}
                  active={Math.ceil(shown) === index + 1 && shown > 0}
                  preview={preview !== null && preview !== current}
                  delay={reduced ? 0 : delayFor(index)}
                  size={pixels}
                  reduced={reduced}
                />
              </span>
            );
          })}
        </div>
        {showValue && (
          // The readout keeps the width of its widest number and words (laid out invisibly in the same cell), so a
          // hover that changes "Fair" to "Excellent" never moves the stars.
          <div aria-hidden="true" className="flex min-w-0 items-baseline gap-2">
            <span className="inline-grid text-[13px] font-medium tabular-nums text-foreground">
              <span className="invisible [grid-area:1/1]">
                {allowHalf ? `${count - 1}.5` : count}
                <span className="text-[11.5px] font-normal">/{count}</span>
              </span>
              <span className="[grid-area:1/1]">
                <NumberRoll value={shown} format={{ maximumFractionDigits: allowHalf ? 1 : 0 }} duration={420} />
                <span className="text-[11.5px] font-normal text-muted-foreground">/{count}</span>
              </span>
            </span>
            <span className="inline-grid text-[12px] text-muted-foreground">
              {[...labels.slice(0, count), "Not rated"].map((word) => (
                <span key={word} className="invisible whitespace-nowrap [grid-area:1/1]">
                  {word}
                </span>
              ))}
              <span className="whitespace-nowrap [grid-area:1/1]">
                <TextMorph animateWidth={false}>{words}</TextMorph>
              </span>
            </span>
          </div>
        )}
      </div>
    </Field>
  );
}

export default RatingInput;
