"use client";

import * as React from "react";
import { MODAL_ROOT, SCRIM, useModal } from "./modal";
import { EASE_OUT, INTERACTION_FOCUS, INTERACTION_PRESS, projectInertia, rubberBand, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * SHEET: a panel that slides in from an edge
 *
 *   open     the page fades back; the panel slides in from its
 *            edge (right, left or bottom) and settles
 *   drag     grab the panel's header (or the bottom sheet's grip)
 *            and pull it toward its edge: it follows 1:1, resists
 *            the other way, and a throw (projected from release
 *            speed) or a pull past a third closes it; otherwise
 *            it springs back
 *   close    Escape, the ✕ or the veil; focus returns to what
 *            opened it
 * ───────────────────────────────────────────────────────── */

// The curve sheets slide on: a soft start and a long settle, like the system drawers on phones.
const DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

export interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  side?: "right" | "left" | "bottom";
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  footer?: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  /** Width of a side sheet in px. */
  width?: number;
  className?: string;
}

export function Sheet({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  trigger,
  side = "right",
  title,
  description,
  children,
  footer,
  width = 400,
  className = "",
}: SheetProps) {
  const reduced = useInteractionReducedMotion();
  const [own, setOwn] = React.useState(defaultOpen);
  const open = controlled ?? own;
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  const close = () => setOpen(false);
  const { dialog, mounted, shown } = useModal(open, close, 320);
  const panel = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ start: number; last: number; t: number; v: number; d: number; size: number; moved: boolean } | null>(null);
  const titleId = React.useId();
  const bottom = side === "bottom";
  // +1 when moving toward the edge closes it.
  const sign = side === "left" ? -1 : 1;
  const hidden = bottom ? "translate3d(0,100%,0)" : `translate3d(${sign * 100}%,0,0)`;

  const write = (d: number, animate: boolean) => {
    const el = panel.current;
    if (!el) return;
    el.style.transition = animate ? `transform 420ms ${DRAWER}` : "none";
    el.style.transform = d ? (bottom ? `translate3d(0,${d}px,0)` : `translate3d(${sign * d}px,0,0)`) : "";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    const el = panel.current;
    if (!el) return;
    const at = bottom ? e.clientY : e.clientX * sign;
    drag.current = { start: at, last: at, t: performance.now(), v: 0, d: 0, size: bottom ? el.offsetHeight : el.offsetWidth, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g) return;
    const at = bottom ? e.clientY : e.clientX * sign;
    if (!g.moved && Math.abs(at - g.start) < 6) return;
    if (!g.moved) {
      g.moved = true;
      g.start = at; // no jump when the drag takes over from the slop
    }
    const now = performance.now();
    g.v = (at - g.last) / Math.max(1, now - g.t);
    g.last = at;
    g.t = now;
    const raw = at - g.start;
    g.d = raw >= 0 ? raw : rubberBand(raw, g.size, 0.3);
    write(g.d, false);
  };
  const onPointerUp = () => {
    const g = drag.current;
    drag.current = null;
    if (!g || !g.moved) return;
    // Closing leaves the panel where the finger let go; the slide out carries on from there.
    if (projectInertia(g.d, g.v, 0.12) > g.size / 3) close();
    else write(0, true);
  };

  const footerNode = typeof footer === "function" ? footer({ close }) : footer;
  const grip = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  return (
    <>
      {trigger &&
        React.cloneElement(trigger, {
          "aria-haspopup": "dialog",
          onClick: (e: React.MouseEvent<HTMLElement>) => {
            trigger.props.onClick?.(e);
            setOpen(true);
          },
        })}
      {mounted && (
        <dialog ref={dialog} aria-labelledby={titleId} className={MODAL_ROOT}>
          <div className={SCRIM} onClick={close} style={{ opacity: shown ? 1 : 0, transition: `opacity ${shown ? 300 : 240}ms ${EASE_OUT}` }} />
          <div
            className={`absolute flex ${bottom ? "inset-x-0 bottom-0 justify-center" : `inset-y-0 ${side === "left" ? "left-0" : "right-0"}`} pointer-events-none p-2`}
            style={{ width: bottom ? undefined : `min(${width}px, 100vw)` }}
          >
            <div
              className="pointer-events-auto flex size-full will-change-transform"
              style={{
                transform: shown || reduced ? "none" : hidden,
                opacity: reduced ? (shown ? 1 : 0) : 1,
                transition: reduced ? "opacity 160ms ease-out" : `transform ${shown ? 500 : 320}ms ${DRAWER}`,
              }}
            >
              <div
                ref={panel}
                data-modal-panel=""
                tabIndex={-1}
                className={`flex w-full flex-col bg-background shadow-[0_0_0_1px_var(--border)] outline-none ${bottom ? "max-h-[85dvh] max-w-[640px] rounded-[22px]" : "h-full rounded-[20px]"} ${className}`}
              >
                {bottom && (
                  <div {...grip} className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing">
                    <span className="h-1 w-9 rounded-full bg-border" />
                  </div>
                )}
                <div {...grip} className={`flex touch-none items-start gap-4 px-5 ${bottom ? "pt-2" : "cursor-grab pt-5 active:cursor-grabbing"} pb-3`}>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 id={titleId} className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">
                      {title}
                    </h2>
                    {description && <p className="text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={close}
                    className={`-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 text-[13.5px] leading-relaxed text-foreground">
                  {typeof children === "function" ? children({ close }) : children}
                </div>
                {footerNode !== undefined && <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">{footerNode}</div>}
              </div>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}

export default Sheet;
