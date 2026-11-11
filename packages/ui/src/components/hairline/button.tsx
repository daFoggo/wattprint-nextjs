"use client";

import * as React from "react";
import { TextMorph } from "./text-morph";
import { EASE_OUT, INTERACTION_PRESS, interactionIcon } from "./ui-interaction-motion";

export type ButtonVariant =
  | "primary"
  | "brand"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";
export type ActionStatus = "idle" | "pending" | "success" | "error";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  status?: ActionStatus;
  /** Custom labels for each state when using status/async flows. */
  statusLabels?: Partial<Record<ActionStatus, string>>;
  /** Automatically reset back to idle after success/error (ms). Default 1800ms. */
  resetAfter?: number;
  onReset?: () => void;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  brand: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent",
  outline: "bg-transparent text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent",
  ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
  destructive:
    "bg-red-500/10 text-red-600 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-red-500)_30%,transparent)] dark:text-red-400 hover:bg-red-500/15",
  link: "bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto font-normal",
};

interface SizeConfig {
  height: string;
  padding: string;
  fontSize: string;
  iconSize: number;
  iconGap: number;
}

const sizeConfigs: Record<ButtonSize, SizeConfig> = {
  xs: {
    height: "h-6",
    padding: "px-2.5",
    fontSize: "text-[12px]",
    iconSize: 12,
    iconGap: 5,
  },
  sm: {
    height: "h-7",
    padding: "px-3",
    fontSize: "text-[12px]",
    iconSize: 13,
    iconGap: 6,
  },
  md: {
    height: "h-9",
    padding: "px-4",
    fontSize: "text-[13px]",
    iconSize: 14,
    iconGap: 7,
  },
  lg: {
    height: "h-10",
    padding: "px-5",
    fontSize: "text-[14px]",
    iconSize: 16,
    iconGap: 8,
  },
  icon: {
    height: "size-9 p-0 justify-center items-center shrink-0",
    padding: "p-0",
    fontSize: "text-[13px]",
    iconSize: 15,
    iconGap: 0,
  },
};

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false
  );

function SelfDrawingCheck({ drawn, reduced, size }: { drawn: boolean; reduced: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
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
          transition: drawn && !reduced ? `stroke-dashoffset 420ms ${EASE_OUT} 100ms` : "none",
        }}
      />
    </svg>
  );
}

function StatusAlert({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75v3.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="8" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

const DEFAULT_LABELS: Record<ActionStatus, string> = {
  idle: "Save",
  pending: "Saving",
  success: "Saved",
  error: "Try again",
};

/**
 * Hairline Button: high-craft tactile action primitive with rounded-full pill geometry,
 * StatusButton visual parity, self-drawing checkmark morphs, TextMorph label transitions,
 * and error shake physics.
 */
export function Button({
    ref,
    variant = "primary",
    size = "md",
    loading = false,
    status,
    statusLabels,
    resetAfter = 1800,
    onReset,
    disabled = false,
    icon,
    trailingIcon,
    className = "",
    children,
    onClick,
    ...props
  }: ButtonProps) {
  const innerRef = React.useRef<HTMLButtonElement | null>(null);
  const reduced = useReducedMotion();

  React.useImperativeHandle(ref, () => innerRef.current as HTMLButtonElement);

  // Normalize status from explicit prop or loading boolean
  const currentStatus: ActionStatus = status ?? (loading ? "pending" : "idle");
  const isAsyncFlow = status !== undefined || loading;

  // Resolve current text label
  const idleLabel = typeof children === "string" ? children : DEFAULT_LABELS.idle;
  const labels: Record<ActionStatus, string> = {
    idle: statusLabels?.idle ?? idleLabel,
    pending: statusLabels?.pending ?? DEFAULT_LABELS.pending,
    success: statusLabels?.success ?? DEFAULT_LABELS.success,
    error: statusLabels?.error ?? DEFAULT_LABELS.error,
  };
  const activeLabel = labels[currentStatus];

  // Auto-reset timer for success or error states
  React.useEffect(() => {
    if ((currentStatus !== "success" && currentStatus !== "error") || !onReset) return;
    const timer = window.setTimeout(onReset, resetAfter);
    return () => window.clearTimeout(timer);
  }, [currentStatus, onReset, resetAfter]);

  // Error state horizontal shake
  React.useEffect(() => {
    if (currentStatus !== "error" || reduced) return;
    innerRef.current?.animate(
      [
        { transform: "none" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(-2px)" },
        { transform: "none" },
      ],
      { duration: 380, easing: "ease-out" }
    );
  }, [currentStatus, reduced]);

  const cfg = sizeConfigs[size];
  const isBusy = currentStatus === "pending";
  const isInert = disabled || isBusy;

  // Icon slot state: open if an icon was provided, or if in async status
  const showLeadingSlot =
    size !== "icon" && (Boolean(icon) || (isAsyncFlow && currentStatus !== "idle"));

  const icons: Record<ActionStatus, React.ReactNode> = {
    idle: icon,
    pending: (
      <span
        style={{ width: cfg.iconSize, height: cfg.iconSize }}
        className={`rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none opacity-85 ${
          currentStatus === "pending" ? "animate-spin" : ""
        }`}
      />
    ),
    success: (
      <span className={variant === "primary" ? "text-primary-foreground" : "text-emerald-600 dark:text-emerald-400"}>
        <SelfDrawingCheck drawn={currentStatus === "success"} reduced={reduced} size={cfg.iconSize} />
      </span>
    ),
    error: (
      <span className="text-red-600 dark:text-red-400">
        <StatusAlert size={cfg.iconSize} />
      </span>
    ),
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isInert) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  // Tone shifts for error states
  const toneClass =
    currentStatus === "error"
      ? "bg-red-500/10 text-red-600 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-red-500)_30%,transparent)] dark:text-red-400"
      : variantStyles[variant];

  return (
    <>
      <button
        ref={innerRef}
        type={props.type ?? "button"}
        disabled={disabled}
        aria-disabled={isInert ? true : undefined}
        aria-busy={isBusy ? true : undefined}
        onClick={handleClick}
        className={`relative inline-flex items-center justify-center font-medium select-none whitespace-nowrap cursor-pointer rounded-full disabled:cursor-default disabled:opacity-45 ${variant === "link" ? "transition-colors" : INTERACTION_PRESS} ${FOCUS} ${
          toneClass
        } ${cfg.height} ${cfg.padding} ${cfg.fontSize} ${className}`}
        {...props}
      >
        {/* Leading Icon / Status Slot with explicit width, height, and marginRight */}
        {size !== "icon" && (
          <span
            aria-hidden="true"
            className="relative flex shrink-0 items-center justify-center overflow-hidden"
            style={{
              width: showLeadingSlot ? cfg.iconSize : 0,
              height: cfg.iconSize,
              marginRight: showLeadingSlot ? cfg.iconGap : 0,
              transition: reduced
                ? "none"
                : `width 360ms ${EASE_OUT}, margin-right 360ms ${EASE_OUT}`,
            }}
          >
            {(Object.keys(icons) as ActionStatus[]).map((st) => (
              <span
                key={st}
                className="absolute inset-0 flex items-center justify-center"
                style={interactionIcon(st === currentStatus, reduced)}
              >
                {icons[st]}
              </span>
            ))}
          </span>
        )}

        {/* Icon-only mode: the same stacked layers, so the icon never hard-swaps. */}
        {size === "icon" && (
          <span aria-hidden="true" className="relative shrink-0" style={{ width: cfg.iconSize, height: cfg.iconSize }}>
            {(Object.keys(icons) as ActionStatus[]).map((st) => (
              <span key={st} className="absolute inset-0 flex items-center justify-center" style={interactionIcon(st === currentStatus, reduced)}>
                {st === "idle" ? icon ?? children : icons[st]}
              </span>
            ))}
          </span>
        )}

        {/* Text Label: uses TextMorph for silky label transitions */}
        {size !== "icon" && (
          <span className="inline-flex items-center">
            {typeof children === "string" || isAsyncFlow ? (
              <TextMorph>{activeLabel}</TextMorph>
            ) : (
              children
            )}
          </span>
        )}

        {/* Trailing Icon with guaranteed calibrated spacing */}
        {trailingIcon && size !== "icon" && (
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center justify-center"
            style={{ marginLeft: cfg.iconGap }}
          >
            {trailingIcon}
          </span>
        )}
      </button>

      {/* Screen Reader live region outside button */}
      {isAsyncFlow && (
        <span role="status" aria-live="polite" className="sr-only">
          {currentStatus === "idle" ? "" : activeLabel}
        </span>
      )}
    </>
  );
}

export default Button;
