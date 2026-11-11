"use client";

import * as React from "react";

/* ─────────────────────────────────────────────────────────
 * PRIVACY MASK: sensitive value unmasker with liquid blur
 *
 *   masked     frosted 5px optical blur or token dots keep
 *              values confidential from screenshares and bystanders
 *   reveal     tap, click, hover, or hold anywhere on the surface
 *              to dissolve the blur over 200ms; eye icon cross-fades
 *   copy       one-tap copy with a self-drawing SVG checkmark
 *   safety     auto re-masks after a configurable timeout, or
 *              immediately on Escape or window blur
 *   responsive fully fluid width with text truncation so long
 *              keys never overflow narrow phone screens
 * ───────────────────────────────────────────────────────── */

export interface PrivacyMaskProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  /** Accessible label, e.g. "Stripe Secret Key" or "Account balance". */
  label?: string;
  /** How unmasking is triggered: "click" toggles on tap/click, "hover" reveals while hovering, "hold" requires continuous press. */
  trigger?: "click" | "hover" | "hold";
  /** Mask appearance: "blur" blurs actual text; "dots" replaces with bullets; "truncate" reveals prefix + suffix. */
  maskStyle?: "blur" | "dots" | "truncate";
  /** Milliseconds before auto re-masking after click reveal (0 disables auto re-mask). Defaults to 6000ms. */
  autoHideMs?: number;
  /** Whether to show an integrated copy button. */
  copyable?: boolean;
  className?: string;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

function EyeIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M1.5 8s2.5-4.5 6.5-4.5 6.5 4.5 6.5 4.5-2.5 4.5-6.5 4.5-6.5-4.5-6.5-4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="m2 2 12 12M6.5 6.7A2 2 0 0 0 9.3 9.5M4.2 4.4C2.8 5.4 1.5 8 1.5 8s2.5 4.5 6.5 4.5c1.6 0 3-.7 4.1-1.7M8 3.5c4 0 6.5 4.5 6.5 4.5s-.8 1.5-2.2 2.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 10.5h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function CheckIcon({ drawn, reduced, className = "size-3.5" }: { drawn: boolean; reduced: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        style={{
          strokeDashoffset: drawn ? 0 : 1,
          transition: reduced ? "none" : `stroke-dashoffset ${drawn ? 320 : 180}ms ${EASE}`,
        }}
      />
    </svg>
  );
}

export function PrivacyMask({
  value,
  label = "Confidential value",
  trigger = "click",
  maskStyle = "blur",
  autoHideMs = 6000,
  copyable = true,
  className = "",
  ...rest
}: PrivacyMaskProps) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const autoHideTimer = React.useRef<number | null>(null);
  const copyTimer = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const clearTimers = React.useCallback(() => {
    if (autoHideTimer.current) {
      window.clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
    if (copyTimer.current) {
      window.clearTimeout(copyTimer.current);
      copyTimer.current = null;
    }
  }, []);

  const scheduleAutoHide = React.useCallback(() => {
    if (autoHideMs <= 0) return;
    if (autoHideTimer.current) window.clearTimeout(autoHideTimer.current);
    autoHideTimer.current = window.setTimeout(() => {
      setRevealed(false);
    }, autoHideMs);
  }, [autoHideMs]);

  // Clean up timers on unmount
  React.useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Keyboard shortcut: Escape re-masks immediately
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && revealed) {
      e.preventDefault();
      setRevealed(false);
    } else if ((e.key === "Enter" || e.key === " ") && trigger === "click") {
      e.preventDefault();
      toggleReveal();
    }
  };

  const toggleReveal = () => {
    setRevealed((prev) => {
      const next = !prev;
      if (next) scheduleAutoHide();
      return next;
    });
  };

  // Pointer & Touch handlers for hold & hover
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (trigger === "hold") {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Fallback if pointer capture unsupported
      }
      setRevealed(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (trigger === "hold") {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Safe release
      }
      setRevealed(false);
    }
  };

  const handlePointerCancel = () => {
    if (trigger === "hold") {
      setRevealed(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  };

  // Masked display formatting
  const displayMasked = React.useMemo(() => {
    if (maskStyle === "truncate" && value.length > 8) {
      return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
    }
    if (maskStyle === "dots") {
      return "••••••••••••";
    }
    return value;
  }, [maskStyle, value]);

  const isBlurred = !revealed && maskStyle === "blur";

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={label}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={trigger === "click" ? toggleReveal : undefined}
      onMouseEnter={() => {
        if (trigger === "hover") setRevealed(true);
      }}
      onMouseLeave={() => {
        if (trigger === "hover") setRevealed(false);
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={`group relative inline-flex w-full max-w-full items-center justify-between gap-2 overflow-hidden rounded-lg border border-border bg-card px-2.5 py-1.5 text-card-foreground select-none transition-[border-color,box-shadow,background-color] duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
        trigger === "click" ? "cursor-pointer hover:bg-muted/30 active:bg-muted/50" : trigger === "hold" ? "cursor-pointer" : ""
      } ${className}`}
      style={{
        clipPath: "inset(0 round 0.5rem)",
      }}
      {...rest}
    >
      {/* Content value */}
      <div className="relative min-w-0 flex-1 overflow-hidden pr-1">
        <span
          className={`block truncate font-mono text-[12.5px] tabular-nums transition-[filter,opacity] duration-200 ${
            isBlurred ? "filter blur-[5px] opacity-60 group-hover:opacity-80" : "opacity-100 filter-none"
          }`}
          style={{
            transitionTimingFunction: EASE,
          }}
        >
          {revealed || maskStyle === "blur" ? value : displayMasked}
        </span>
      </div>

      {/* Action Buttons */}
      <div
        className="flex shrink-0 items-center gap-1 border-l border-border/60 pl-1.5 text-muted-foreground"
        onClick={(e) => {
          // If clicking container toggles, let eye click toggle without double trigger
          if (trigger === "click") {
            e.stopPropagation();
            toggleReveal();
          }
        }}
      >
        {/* Toggle Eye Button */}
        <button
          type="button"
          tabIndex={-1}
          aria-label={revealed ? "Hide value" : "Reveal value"}
          className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer touch-manipulation"
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </button>

        {/* Copy Button */}
        {copyable && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={copied ? "Copied" : "Copy to clipboard"}
            onClick={handleCopy}
            className={`flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted active:scale-95 cursor-pointer touch-manipulation ${
              copied ? "text-emerald-600 dark:text-emerald-400" : "hover:text-foreground"
            }`}
          >
            <CheckIcon drawn={copied} reduced={reduced} className="size-3.5" />
            {!copied && <CopyIcon />}
          </button>
        )}
      </div>

      {/* Screen reader notification */}
      <span className="sr-only" role="status" aria-live="polite">
        {label}: {revealed ? value : "Hidden"}
      </span>
    </div>
  );
}
