"use client";

import * as React from "react";
import { EASE_OUT, INTERACTION_FOCUS, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * TOGGLE GROUP: several on/off choices side by side
 *
 *   press    each toggle fills when it's on and empties when off
 *   merge    toggles that are on next to each other join into one
 *            shape: the corners between them square off, so Bold +
 *            Italic read as one pill instead of two blobs
 *   single   <Toggle> on its own is one pressed/unpressed button
 *
 * For one choice out of several, use the segmented control.
 * ───────────────────────────────────────────────────────── */

export interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Show only the icon; `label` becomes the accessible name. */
  iconOnly?: boolean;
  disabled?: boolean;
}

export interface ToggleGroupProps {
  options: ToggleOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Accessible name of the group. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

const R = 999;

export function ToggleGroup({ options, value, defaultValue = [], onValueChange, label, size = "md", className = "" }: ToggleGroupProps) {
  const reduced = useInteractionReducedMotion();
  const [own, setOwn] = React.useState(defaultValue);
  const on = value ?? own;
  const sm = size === "sm";

  const flip = (v: string) => {
    const next = on.includes(v) ? on.filter((x) => x !== v) : [...on, v];
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  return (
    <div role="group" aria-label={label} className={`inline-flex items-center rounded-full bg-card p-0.5 shadow-[inset_0_0_0_1px_var(--border)] ${className}`}>
      {options.map((o, i) => {
        const pressed = on.includes(o.value);
        const left = pressed && on.includes(options[i - 1]?.value ?? "");
        const right = pressed && on.includes(options[i + 1]?.value ?? "");
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            aria-label={o.iconOnly ? o.label : undefined}
            disabled={o.disabled}
            onClick={() => flip(o.value)}
            className={`group/tg relative inline-flex shrink-0 items-center justify-center gap-1.5 font-medium cursor-pointer disabled:cursor-default disabled:opacity-40 [&_svg]:size-3.5 ${
              sm ? "h-6 text-[12px]" : "h-8 text-[13px]"
            } ${o.iconOnly ? (sm ? "w-6" : "w-8") : sm ? "px-2.5" : "px-3"} rounded-full ${pressed ? "text-foreground" : "text-muted-foreground hover:text-foreground"} ${INTERACTION_FOCUS}`}
          >
            {/* The fill: corners next to another pressed toggle square off so they read as one. */}
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-[color-mix(in_oklab,var(--foreground)_9%,transparent)] transition-[scale] duration-200 group-active/tg:scale-[0.96] motion-reduce:group-active/tg:scale-100"
              style={{
                opacity: pressed ? 1 : 0,
                borderTopLeftRadius: left ? 4 : R,
                borderBottomLeftRadius: left ? 4 : R,
                borderTopRightRadius: right ? 4 : R,
                borderBottomRightRadius: right ? 4 : R,
                transition: reduced ? "none" : `opacity 220ms ${EASE_OUT}, border-radius 320ms ${EASE_OUT}, scale 200ms ${EASE_OUT}`,
              }}
            />
            <span className="relative inline-flex items-center gap-1.5">
              {o.icon}
              {!o.iconOnly && o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  size?: "sm" | "md";
}

/** One pressed/unpressed button. Icon-only toggles need an aria-label. */
export function Toggle({ pressed: controlled, defaultPressed = false, onPressedChange, size = "md", className = "", children, onClick, ...props }: ToggleProps) {
  const reduced = useInteractionReducedMotion();
  const [own, setOwn] = React.useState(defaultPressed);
  const pressed = controlled ?? own;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (controlled === undefined) setOwn(!pressed);
        onPressedChange?.(!pressed);
      }}
      className={`group/tg relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium cursor-pointer disabled:cursor-default disabled:opacity-40 [&_svg]:size-3.5 ${
        size === "sm" ? "h-7 min-w-7 px-2 text-[12px]" : "h-9 min-w-9 px-2.5 text-[13px]"
      } ${pressed ? "text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"} ${INTERACTION_FOCUS} ${className}`}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-accent shadow-[inset_0_0_0_1px_var(--border)] transition-[scale] duration-200 group-active/tg:scale-[0.94] motion-reduce:group-active/tg:scale-100"
        style={{ opacity: pressed ? 1 : 0, transition: reduced ? "none" : `opacity 220ms ${EASE_OUT}, scale 200ms ${EASE_OUT}` }}
      />
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}

export default ToggleGroup;
