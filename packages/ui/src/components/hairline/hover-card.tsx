"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { enterStyle, themeVars, useFloating, usePresence, type Align, type Side } from "./floating";
import { useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * HOVER CARD: a preview of what a link points to
 *
 *   rest     after resting on the link (600ms) the card rises off
 *            it out of a blur, from the point nearest to it
 *   travel   moving from the link onto the card keeps it open, so
 *            its buttons can be used; leaving both closes it after
 *            a short grace (300ms), so a diagonal path doesn't
 *   keys     focusing the link from the keyboard opens it at once;
 *            Escape closes it
 *
 * Touch has no hover: a tap follows the link, as people expect.
 * The card adds to the link, so nothing in it should be the only
 * way to reach something.
 * ───────────────────────────────────────────────────────── */

export interface HoverCardProps {
  /** The link or name it previews. */
  children: React.ReactElement<{ "aria-describedby"?: string }>;
  content: React.ReactNode;
  side?: Side;
  align?: Align;
  /** Rest before it opens (ms). */
  openDelay?: number;
  /** Grace before it closes once the pointer has left both (ms). */
  closeDelay?: number;
  width?: number;
  className?: string;
}

export function HoverCard({ children, content, side = "bottom", align = "start", openDelay = 600, closeDelay = 300, width = 300, className = "" }: HoverCardProps) {
  const reduced = useInteractionReducedMotion();
  const anchor = React.useRef<HTMLSpanElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef(0);
  const id = React.useId();
  const { mounted, shown } = usePresence(open, 160);
  const place = useFloating({ open: mounted, anchor, floating: surface, side, align, offset: 8 });
  const [vars, setVars] = React.useState<React.CSSProperties>({});

  const later = (next: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), ms);
  };
  const enter = (e: React.PointerEvent) => e.pointerType === "mouse" && later(true, open ? 0 : openDelay);
  const leave = (e: React.PointerEvent) => e.pointerType === "mouse" && later(false, closeDelay);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  React.useLayoutEffect(() => {
    if (mounted) setVars(themeVars(anchor.current));
  }, [mounted]);

  return (
    <>
      <span
        ref={anchor}
        className="inline"
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocus={(e) => {
          if ((e.target as HTMLElement).matches(":focus-visible")) {
            window.clearTimeout(timer.current);
            setOpen(true);
          }
        }}
        onBlur={(e) => {
          if (!surface.current?.contains(e.relatedTarget as Node)) later(false, 0);
        }}
      >
        {React.cloneElement(children, { "aria-describedby": open ? id : children.props["aria-describedby"] })}
      </span>
      {mounted &&
        createPortal(
          <div
            ref={surface}
            id={id}
            role="tooltip"
            onPointerEnter={enter}
            onPointerLeave={leave}
            className={`fixed left-0 top-0 z-[55] max-w-[calc(100vw_-_16px)] rounded-[16px] bg-popover p-4 text-[13.5px] text-popover-foreground shadow-[0_0_0_1px_var(--border)] ${className}`}
            style={{ ...vars, width, left: place.x, top: place.y, transformOrigin: place.origin, ...enterStyle(shown, place.side, reduced) }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

export default HoverCard;
