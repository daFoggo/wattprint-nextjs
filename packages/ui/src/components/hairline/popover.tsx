"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { enterStyle, themeVars, useDismiss, useFloating, usePresence, type Align, type Side } from "./floating";
import { useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * POPOVER: a small panel that belongs to a button
 *
 *   open     the panel rises off its trigger out of a blur, from
 *            the point on the trigger nearest to it, and flips
 *            or shifts to stay in the window
 *   inside   focus moves to the first field in it (or the panel)
 *   close    Escape returns focus to the trigger; a press
 *            outside just closes; `close()` from inside too
 *
 * For a list of actions use DropdownMenu; this is for content
 * (a short form, a colour picker, details).
 * ───────────────────────────────────────────────────────── */

export interface PopoverProps {
  trigger: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  /** The content, or a function that gets `close`. */
  children: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  side?: Side;
  align?: Align;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Width of the panel in px. */
  width?: number;
  /** Accessible name of the panel. */
  label?: string;
  className?: string;
}

const FOCUSABLE = 'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])';

export function Popover({ trigger, children, side = "bottom", align = "center", open: controlled, onOpenChange, width = 280, label, className = "" }: PopoverProps) {
  const reduced = useInteractionReducedMotion();
  const anchor = React.useRef<HTMLSpanElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState(false);
  const open = controlled ?? own;
  const { mounted, shown } = usePresence(open, 180);
  const place = useFloating({ open: mounted, anchor, floating: surface, side, align, offset: 8 });
  const [vars, setVars] = React.useState<React.CSSProperties>({});
  const id = React.useId();
  const triggerId = React.useId();

  const setOpen = (next: boolean, refocus = false) => {
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
    // By id rather than a ref: this runs from handlers that are created while rendering.
    if (!next && refocus) document.getElementById(trigger.props.id ?? triggerId)?.focus();
  };

  useDismiss(open, (reason) => setOpen(false, reason === "escape"), [anchor, surface]);

  React.useLayoutEffect(() => {
    if (mounted) setVars(themeVars(anchor.current));
  }, [mounted]);

  React.useEffect(() => {
    if (!open || !place.ready) return;
    const el = surface.current;
    (el?.querySelector<HTMLElement>(FOCUSABLE) ?? el)?.focus({ preventScroll: true });
  }, [open, place.ready]);

  const close = () => setOpen(false, true);

  return (
    <>
      <span ref={anchor} className="inline-flex">
        {React.cloneElement(trigger, {
          id: trigger.props.id ?? triggerId,
          "aria-haspopup": "dialog",
          "aria-expanded": open,
          "aria-controls": open ? id : undefined,
          onClick: (e: React.MouseEvent<HTMLElement>) => {
            trigger.props.onClick?.(e);
            setOpen(!open);
          },
        })}
      </span>
      {mounted &&
        createPortal(
          <div
            ref={surface}
            id={id}
            role="dialog"
            aria-label={label}
            tabIndex={-1}
            className={`fixed left-0 top-0 z-[55] max-w-[calc(100vw_-_16px)] rounded-[16px] bg-popover p-4 text-[13.5px] text-popover-foreground shadow-[0_0_0_1px_var(--border)] outline-none ${className}`}
            style={{ ...vars, width, left: place.x, top: place.y, transformOrigin: place.origin, ...enterStyle(shown, place.side, reduced) }}
          >
            {typeof children === "function" ? children({ close }) : children}
          </div>,
          // patched (hairline/patch.mjs): inside a modal <dialog> the rest of the page is inert, so open in it.
          anchor.current?.closest("dialog") ?? document.body,
        )}
    </>
  );
}

export default Popover;
