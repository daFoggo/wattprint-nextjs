"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { enterStyle, themeVars, useFloating, usePresence, type Align, type Side } from "./floating";
import { EASE_OUT, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * TOOLTIP: a name for an icon, and its shortcut
 *
 *   first    after a short rest (500ms) it rises off the trigger
 *            out of a blur, from the side it sits on
 *   warm     moving to the next trigger while one is showing:
 *            no wait, and the new tooltip glides over from where
 *            the last one was, so a toolbar reads as one label
 *            travelling along it
 *   leave    a press, Escape or leaving hides it at once
 *
 * Keyboard focus shows it too; touch never does (a tap acts).
 * ───────────────────────────────────────────────────────── */

export interface TooltipProps {
  /** The trigger: one element that can take focus (usually an icon button). */
  children: React.ReactElement<{ "aria-describedby"?: string }>;
  content: React.ReactNode;
  /** A key or chord shown after the text, e.g. "⌘K". */
  shortcut?: string;
  side?: Side;
  align?: Align;
  /** Rest before the first tooltip shows (ms). */
  delay?: number;
  disabled?: boolean;
}

// Shared across tooltips: where the last one was and when it left, so the next can glide from it.
let last: { x: number; y: number; at: number } | null = null;
const WARM_MS = 450;

export function Tooltip({ children, content, shortcut, side = "top", align = "center", delay = 500, disabled }: TooltipProps) {
  const reduced = useInteractionReducedMotion();
  const anchor = React.useRef<HTMLSpanElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [warm, setWarm] = React.useState(false);
  const timer = React.useRef(0);
  const id = React.useId();
  const { mounted, shown } = usePresence(open, 140);
  const place = useFloating({ open: mounted, anchor, floating: surface, side, align, offset: 8 });
  const [vars, setVars] = React.useState<React.CSSProperties>({});

  const show = (now: boolean) => {
    if (disabled) return;
    window.clearTimeout(timer.current);
    const isWarm = !!last && performance.now() - last.at < WARM_MS;
    if (now || isWarm) {
      setWarm(isWarm);
      setOpen(true);
    } else timer.current = window.setTimeout(() => {
      setWarm(false);
      setOpen(true);
    }, delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  // Remember where it was as it leaves; the next tooltip glides from here.
  React.useEffect(() => {
    if (!open && place.ready) last = { x: place.x, y: place.y, at: performance.now() };
    if (open) last = null;
  }, [open, place.ready, place.x, place.y]);

  React.useLayoutEffect(() => {
    if (mounted) setVars(themeVars(anchor.current));
  }, [mounted]);

  // Warm: glide over from the previous tooltip instead of rising out of a blur.
  const from = React.useRef<{ x: number; y: number } | null>(null);
  React.useLayoutEffect(() => {
    if (open && warm) from.current = last ? { x: last.x, y: last.y } : null;
  }, [open, warm]);
  React.useLayoutEffect(() => {
    const el = surface.current;
    const f = from.current;
    if (!el || !f || !place.ready || reduced) return;
    from.current = null;
    el.animate([{ transform: `translate(${f.x - place.x}px, ${f.y - place.y}px)` }, { transform: "none" }], { duration: 300, easing: EASE_OUT });
  }, [place.ready, place.x, place.y, reduced]);

  const pose = warm ? { opacity: shown ? 1 : 0, transition: reduced ? "none" : `opacity ${shown ? 120 : 140}ms ${EASE_OUT}` } : enterStyle(shown, place.side, reduced);

  return (
    <>
      <span
        ref={anchor}
        className="inline-flex"
        onPointerEnter={(e) => e.pointerType === "mouse" && show(false)}
        onPointerLeave={hide}
        onPointerDown={hide}
        onFocus={(e) => (e.target as HTMLElement).matches(":focus-visible") && show(true)}
        onBlur={hide}
        onKeyDown={(e) => e.key === "Escape" && hide()}
      >
        {React.cloneElement(children, { "aria-describedby": open ? id : children.props["aria-describedby"] })}
      </span>
      {mounted &&
        createPortal(
          <div
            ref={surface}
            id={id}
            role="tooltip"
            className="pointer-events-none fixed left-0 top-0 z-[60] flex items-center gap-2 whitespace-nowrap rounded-full bg-foreground px-2.5 py-1 text-[12px] font-medium text-background"
            style={{ ...vars, left: place.x, top: place.y, transformOrigin: place.origin, ...pose }}
          >
            {content}
            {shortcut && <kbd className="font-mono text-[10.5px] text-background/60">{shortcut}</kbd>}
          </div>,
          document.body,
        )}
    </>
  );
}

export default Tooltip;
