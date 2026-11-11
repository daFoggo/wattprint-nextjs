"use client";

import * as React from "react";
import { Copy } from "lucide-react";
import { TextMorph } from "./text-morph";
import { EASE_OUT, INTERACTION_FOCUS, INTERACTION_PRESS, interactionIcon, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * COPY BUTTON: copies, and says so the moment you press
 *
 *   idle     the copy icon (and "Copy" when labelled)
 *   copied   flips on the press itself, not after the clipboard
 *            answers: the icon blurs out, a check draws itself,
 *            "Copy" morphs to "Copied" and the pill eases wider
 *   error    if the clipboard refuses, the check gives way to an
 *            alert, the label says "Failed" and the button shakes
 *
 * Pressing again while copied copies again and restarts the timer.
 * A status region outside the button tells screen readers.
 * ───────────────────────────────────────────────────────── */

export type CopyState = "idle" | "copied" | "error";

export interface CopyButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The text to copy. */
  text: string;
  /** Label while idle; also the icon-only button's accessible name. */
  label?: string;
  /** Label once copied. */
  copiedLabel?: string;
  /** Label if the clipboard refuses. */
  errorLabel?: string;
  /** Show the label beside the icon. Defaults to false (icon only). */
  showLabel?: boolean;
  /** How long "Copied" stays before it returns to idle (ms). */
  timeoutMs?: number;
  variant?: "secondary" | "outline" | "ghost";
  /** xs 24px, sm 28px, md 36px tall. */
  size?: "xs" | "sm" | "md";
  onCopySuccess?: (text: string) => void;
  onCopyError?: (error: unknown) => void;
}

const SIZES = {
  xs: { square: "size-6", pill: "h-6 pl-2 pr-2.5 text-[12px]", icon: 12, gap: 5 },
  sm: { square: "size-7", pill: "h-7 pl-2.5 pr-3 text-[12px]", icon: 13, gap: 6 },
  md: { square: "size-9", pill: "h-9 pl-3.5 pr-4 text-[13px]", icon: 15, gap: 7 },
};

const TONES = {
  secondary: "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent",
  outline: "bg-transparent text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent",
  ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
};

const ERROR_TONE =
  "bg-red-500/10 text-red-600 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-red-500)_30%,transparent)] dark:text-red-400";

function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // Older browsers and plain-http pages: the selection fallback.
  return new Promise((resolve, reject) => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (ok) resolve();
    else reject(new Error("Copy was refused"));
  });
}

function Check({ drawn, reduced }: { drawn: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-full">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        style={{
          strokeDashoffset: drawn ? 0 : 1,
          // Draws on the way in; on the way out it stays whole until its layer has faded.
          transition: reduced ? "none" : drawn ? `stroke-dashoffset 360ms ${EASE_OUT} 70ms` : "stroke-dashoffset 0ms linear 300ms",
        }}
      />
    </svg>
  );
}

function Alert() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-full">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75v3.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="8" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  errorLabel = "Failed",
  showLabel = false,
  timeoutMs = 2000,
  variant = "ghost",
  size = "sm",
  onCopySuccess,
  onCopyError,
  className = "",
  disabled,
  onClick,
  ...props
}: CopyButtonProps) {
  const reduced = useInteractionReducedMotion();
  const ref = React.useRef<HTMLButtonElement>(null);
  const [state, setState] = React.useState<CopyState>("idle");
  // Bumped on every copy so a second press restarts the timer.
  const [stamp, setStamp] = React.useState(0);

  React.useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [state, stamp, timeoutMs]);

  React.useEffect(() => {
    if (state !== "error" || reduced) return;
    ref.current?.animate(
      [{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "none" }],
      { duration: 380, easing: "ease-out" },
    );
  }, [state, stamp, reduced]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || disabled || !text) return;
    // Optimistic: the feedback lands on the press, the clipboard catches up.
    setState("copied");
    setStamp((n) => n + 1);
    writeClipboard(text).then(
      () => onCopySuccess?.(text),
      (error: unknown) => {
        setState("error");
        setStamp((n) => n + 1);
        onCopyError?.(error);
      },
    );
  };

  const s = SIZES[size];
  const current = state === "copied" ? copiedLabel : state === "error" ? errorLabel : label;

  return (
    <>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={handleClick}
        aria-label={showLabel ? undefined : label}
        data-state={state}
        className={`relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium cursor-pointer disabled:cursor-default disabled:opacity-45 ${INTERACTION_PRESS} ${INTERACTION_FOCUS} ${
          state === "error" ? ERROR_TONE : TONES[variant]
        } ${showLabel ? s.pill : s.square} ${className}`}
        {...props}
      >
        <span aria-hidden="true" className="relative shrink-0" style={{ width: s.icon, height: s.icon }}>
          <span className="absolute inset-0 flex items-center justify-center" style={interactionIcon(state === "idle", reduced)}>
            <Copy size={s.icon} strokeWidth={1.75} />
          </span>
          <span className="absolute inset-0 text-emerald-600 dark:text-emerald-400" style={interactionIcon(state === "copied", reduced)}>
            <Check drawn={state === "copied"} reduced={reduced} />
          </span>
          <span className="absolute inset-0" style={interactionIcon(state === "error", reduced)}>
            <Alert />
          </span>
        </span>
        {showLabel && <TextMorph style={{ marginLeft: s.gap }}>{current}</TextMorph>}
      </button>
      {/* Outside the button, so the announcement isn't read as part of its name. */}
      <span role="status" className="sr-only">
        {state === "idle" ? "" : current}
      </span>
    </>
  );
}

export default CopyButton;
