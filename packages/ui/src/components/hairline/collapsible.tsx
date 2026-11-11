"use client";

import * as React from "react";
import { Chevron, Fold } from "./accordion";
import { TextMorph } from "./text-morph";
import { INTERACTION_FOCUS, INTERACTION_PRESS, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * COLLAPSIBLE: "Show 4 more" that opens in place
 *
 *   open     the hidden part's height eases open while its content
 *            rises out of a blur; the button's words morph
 *            ("Show 4 more" → "Show less") and its chevron turns
 *   close    the reverse; the button stays where your finger is
 *            when it sits above the content (`placement="top"`)
 *
 * One disclosure: aria-expanded on the button, the content a
 * region it controls, folded content inert.
 * ───────────────────────────────────────────────────────── */

export interface CollapsibleProps {
  children: React.ReactNode;
  /** Words on the button when closed and open. */
  labels?: { closed: string; open: string };
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Button above the hidden part (details) or below it ("show more" lists). */
  placement?: "top" | "bottom";
  className?: string;
}

export function Collapsible({ children, labels = { closed: "Show more", open: "Show less" }, open: controlled, defaultOpen = false, onOpenChange, placement = "bottom", className = "" }: CollapsibleProps) {
  const reduced = useInteractionReducedMotion();
  const id = React.useId();
  const [own, setOwn] = React.useState(defaultOpen);
  const open = controlled ?? own;

  const button = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => {
        if (controlled === undefined) setOwn(!open);
        onOpenChange?.(!open);
      }}
      className={`-ml-3 inline-flex h-8 items-center gap-1.5 self-start rounded-full px-3 text-[13px] font-medium text-foreground cursor-pointer hover:bg-accent ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
    >
      <TextMorph>{open ? labels.open : labels.closed}</TextMorph>
      <Chevron open={open} reduced={reduced} />
    </button>
  );

  return (
    <div className={`flex w-full flex-col gap-1 ${className}`}>
      {placement === "top" && button}
      <Fold open={open} reduced={reduced} id={id}>
        {children}
      </Fold>
      {placement === "bottom" && button}
    </div>
  );
}

export default Collapsible;
