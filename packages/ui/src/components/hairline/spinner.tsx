"use client";

import * as React from "react";

/* ─────────────────────────────────────────────────────────
 * SPINNER: something is happening
 *
 *   ring     a hairline circle with one arc that sweeps round
 *   dots     three dots that rise in turn
 *   bars     eight petals that fade round like a clock face
 *
 * It takes currentColor and says "Loading" (or your label) to
 * screen readers. Reduced motion turns the ring into a calm
 * pulse and holds the dots and petals still.
 * ───────────────────────────────────────────────────────── */

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "ring" | "dots" | "bars";
  /** 12, 16, 20 or 28px. */
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
}

const PX = { xs: 12, sm: 16, md: 20, lg: 28 };

export function Spinner({ variant = "ring", size = "sm", label = "Loading", className = "", style, ...props }: SpinnerProps) {
  const px = PX[size];
  return (
    <span role="status" className={`inline-flex shrink-0 items-center justify-center text-current ${className}`} style={{ width: px, height: px, ...style }} {...props}>
      <span className="sr-only">{label}</span>
      {variant === "ring" && (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full animate-spin [animation-duration:800ms] motion-reduce:animate-pulse">
          <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
          <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {variant === "dots" && (
        <span aria-hidden="true" className="flex items-center" style={{ gap: px * 0.14 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="rounded-full bg-current [animation:ui-bounce_1.1s_ease-in-out_infinite] motion-reduce:[animation:none]"
              style={{ width: px * 0.24, height: px * 0.24, animationDelay: `${i * 140}ms` }}
            />
          ))}
        </span>
      )}
      {variant === "bars" && (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-full">
          {Array.from({ length: 8 }, (_, i) => (
            <rect
              key={i}
              x="11"
              y="2"
              width="2"
              height="6"
              rx="1"
              fill="currentColor"
              transform={`rotate(${i * 45} 12 12)`}
              className="[animation:ui-blink_0.8s_linear_infinite] motion-reduce:[animation:none]"
              style={{ animationDelay: `${(i - 8) * 100}ms`, opacity: 0.25 }}
            />
          ))}
        </svg>
      )}
    </span>
  );
}

export default Spinner;
