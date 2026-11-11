"use client";

import * as React from "react";
import { MODAL_ROOT, SCRIM, useModal } from "./modal";
import { EASE_OUT, INTERACTION_FOCUS, INTERACTION_PRESS, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * DIALOG: a decision that needs the whole screen
 *
 *   open     the page fades back under a veil of its own
 *            background (no blur); the panel rises 8px, out of a
 *            4px blur, from 0.96
 *   close    Escape, the ✕ or a press on the veil; it sinks back
 *            the way it came and focus returns to what opened it
 *   long     the body scrolls inside the panel; the page behind
 *            never moves
 *
 * The native <dialog>: focus stays inside, the page is inert,
 * and it sits above everything without z-index games.
 * ───────────────────────────────────────────────────────── */

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A button that opens it. */
  trigger?: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The body, or a function that gets `close`. */
  children?: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  /** Buttons along the bottom, or a function that gets `close`. */
  footer?: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  /** 400, 520 or 680px wide. */
  size?: "sm" | "md" | "lg";
  /** Press on the veil closes it. Turn off for forms that would lose work. */
  dismissible?: boolean;
  className?: string;
}

const WIDTH = { sm: 400, md: 520, lg: 680 };

export function Dialog({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
  className = "",
}: DialogProps) {
  const reduced = useInteractionReducedMotion();
  const [own, setOwn] = React.useState(defaultOpen);
  const open = controlled ?? own;
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  const close = () => setOpen(false);
  const { dialog, mounted, shown } = useModal(open, close, 220);
  const titleId = React.useId();
  const descId = React.useId();
  const ease = EASE_OUT;

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
        <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={description ? descId : undefined} className={MODAL_ROOT}>
          <div
            className={SCRIM}
            onClick={() => dismissible && close()}
            style={{ opacity: shown ? 1 : 0, transition: `opacity ${shown ? 260 : 200}ms ${ease}` }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-3 sm:items-center sm:p-6">
            <div
              data-modal-panel=""
              tabIndex={-1}
              className={`pointer-events-auto relative flex max-h-[min(85dvh,760px)] w-full flex-col rounded-[22px] bg-background shadow-[0_0_0_1px_var(--border)] outline-none ${className}`}
              style={{
                maxWidth: WIDTH[size],
                opacity: shown ? 1 : 0,
                translate: shown || reduced ? "0 0" : "0 8px",
                scale: shown || reduced ? "1" : "0.96",
                filter: shown || reduced ? "blur(0px)" : "blur(4px)",
                transition: reduced
                  ? "opacity 160ms ease-out"
                  : shown
                    ? `opacity 240ms ${ease}, translate 420ms ${ease}, scale 420ms ${ease}, filter 240ms ${ease}`
                    : `opacity 180ms ${ease}, translate 220ms ${ease}, scale 220ms ${ease}, filter 180ms ${ease}`,
              }}
            >
              <div className="flex items-start gap-4 px-6 pb-2 pt-5">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 id={titleId} className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">
                    {title}
                  </h2>
                  {description && (
                    <p id={descId} className="text-[13.5px] leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className={`-mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
                >
                  <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {children !== undefined && (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-2 text-[13.5px] leading-relaxed text-foreground">
                  {typeof children === "function" ? children({ close }) : children}
                </div>
              )}
              {footer !== undefined && (
                <div className="flex flex-col-reverse gap-2 px-6 pb-5 pt-4 sm:flex-row sm:justify-end">{typeof footer === "function" ? footer({ close }) : footer}</div>
              )}
              {footer === undefined && <div className="h-4" />}
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}

export default Dialog;
