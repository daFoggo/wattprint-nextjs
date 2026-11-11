"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";
import { EASE_OUT, EASE_THROW, INTERACTION_FOCUS, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * STEPS: where you are in a flow
 *
 *   advance   the line to the next step fills along its length,
 *             the finished step's number blurs into a check that
 *             draws itself, and the new current step's ring pops in
 *   back      the line drains back and the check gives way to the
 *             number again
 *   narrow    in a small container it becomes "Step 2 of 4 ·
 *             Payment" with a filling bar; the number rolls and the
 *             step's name morphs
 *
 * Finished steps can be links back (`onStepClick`).
 * ───────────────────────────────────────────────────────── */

export interface Step {
  label: string;
  description?: string;
}

export interface StepsProps {
  steps: Step[];
  /** Index of the current step (0-based). steps.length means all done. */
  current: number;
  /** Let people go back to finished steps. */
  onStepClick?: (index: number) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function Mark({ index, state, reduced }: { index: number; state: "done" | "current" | "upcoming"; reduced: boolean }) {
  const done = state === "done";
  return (
    <span
      className={`relative flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium tabular-nums transition-[background-color,color,box-shadow] duration-300 ${
        done
          ? "bg-primary text-primary-foreground"
          : state === "current"
            ? "bg-background text-foreground shadow-[inset_0_0_0_1.5px_var(--primary)]"
            : "bg-background text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]"
      }`}
    >
      {state === "current" && !reduced && (
        <span key="ring" aria-hidden="true" className="absolute -inset-1 rounded-full shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,transparent)] [animation:ui-pop-in_420ms_cubic-bezier(0.34,1.36,0.64,1)_both]" />
      )}
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: done ? 0 : 1, scale: done && !reduced ? "0.6" : "1", filter: done && !reduced ? "blur(3px)" : "none", transition: reduced ? "none" : `opacity 200ms ${EASE_OUT}, scale 320ms ${EASE_OUT}, filter 200ms ${EASE_OUT}` }}
      >
        {index + 1}
      </span>
      <svg viewBox="0 0 16 16" fill="none" className="absolute size-3.5">
        <path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          style={{ strokeDashoffset: done ? 0 : 1, transition: reduced ? "none" : done ? `stroke-dashoffset 360ms ${EASE_OUT} 140ms` : `stroke-dashoffset 160ms ${EASE_OUT}` }}
        />
      </svg>
    </span>
  );
}

export function Steps({ steps, current, onStepClick, orientation = "horizontal", className = "" }: StepsProps) {
  const reduced = useInteractionReducedMotion();
  const at = Math.max(0, Math.min(current, steps.length));
  const vertical = orientation === "vertical";
  const state = (i: number) => (i < at ? "done" : i === at ? "current" : "upcoming");
  const fill = (i: number) => (i < at ? 1 : 0);

  const list = (
    <ol className={`flex ${vertical ? "flex-col" : "w-full items-start"}`}>
      {steps.map((step, i) => {
        const s = state(i);
        const clickable = !!onStepClick && s === "done";
        const Head = clickable ? "button" : "div";
        return (
          <li key={step.label} aria-current={s === "current" ? "step" : undefined} className={`relative flex ${vertical ? "gap-3 pb-6 last:pb-0" : "flex-1 flex-col items-center gap-2 text-center"}`}>
            {/* The line to the next step: a hairline with a fill that runs along it. */}
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute bg-border ${vertical ? "left-[13.5px] top-8 bottom-1 w-px" : "left-[calc(50%_+_20px)] right-[calc(-50%_+_20px)] top-[13.5px] h-px"}`}
              >
                <span
                  className={`absolute inset-0 bg-primary ${vertical ? "origin-top" : "origin-left"}`}
                  style={{ transform: vertical ? `scaleY(${fill(i)})` : `scaleX(${fill(i)})`, transition: reduced ? "none" : `transform 520ms ${i < at ? EASE_OUT : EASE_THROW}` }}
                />
              </span>
            )}
            <Head
              {...(clickable ? { type: "button" as const, onClick: () => onStepClick(i), "aria-label": `Back to ${step.label}` } : {})}
              className={`relative z-10 rounded-full ${clickable ? `cursor-pointer ${INTERACTION_FOCUS}` : ""}`}
            >
              <Mark index={i} state={s} reduced={reduced} />
            </Head>
            <span className={`flex min-w-0 flex-col gap-0.5 ${vertical ? "pt-1" : "px-1"}`}>
              <span className={`text-[13px] font-medium transition-colors duration-300 ${s === "upcoming" ? "text-muted-foreground" : "text-foreground"}`}>{step.label}</span>
              {step.description && <span className="text-[12px] leading-snug text-muted-foreground">{step.description}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );

  if (vertical) return <nav aria-label="Progress" className={className}>{list}</nav>;

  const name = steps[Math.min(at, steps.length - 1)]?.label ?? "";
  return (
    <nav aria-label="Progress" className={`@container w-full ${className}`}>
      <div className="hidden @[24rem]:block">{list}</div>
      {/* Narrow: one line and a bar. */}
      <div className="flex flex-col gap-2 @[24rem]:hidden">
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="tabular-nums text-muted-foreground">
            Step <NumberRoll value={Math.min(at + 1, steps.length)} /> of {steps.length}
          </span>
          <span className="font-medium text-foreground">
            <TextMorph>{at >= steps.length ? "Done" : name}</TextMorph>
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full origin-left rounded-full bg-primary" style={{ transform: `scaleX(${Math.min(1, (at + (at < steps.length ? 0.5 : 0)) / steps.length)})`, transition: reduced ? "none" : `transform 520ms ${EASE_OUT}` }} />
        </div>
      </div>
    </nav>
  );
}

export default Steps;
