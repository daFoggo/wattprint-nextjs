"use client";

import * as React from "react";

/* ─────────────────────────────────────────────────────────
 * MODAL: the native <dialog> under Dialog and Sheet
 *
 *   open     showModal() (focus trap, inert page, top layer) and
 *            the next frame turns `shown` on for the entry motion
 *   close    Escape and the scrim ask to close; the surface plays
 *            its exit, then dialog.close() and focus goes back to
 *            whatever opened it
 *   scroll   wheel and touch scrolling outside a scrollable part
 *            of the panel are stopped at the dialog, so the page
 *            behind never moves (the page's own styles are never
 *            touched: no layout shift, no restyle of <html>)
 * ───────────────────────────────────────────────────────── */

export function useModal(open: boolean, onClose: () => void, exit = 220) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = React.useState(open);
  const [shown, setShown] = React.useState(false);
  const opener = React.useRef<HTMLElement | null>(null);
  const close = React.useRef(onClose);
  React.useEffect(() => {
    close.current = onClose;
  });
  if (open && !mounted) setMounted(true);

  React.useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open) {
      opener.current = document.activeElement as HTMLElement | null;
      if (!el.open) el.showModal();
      // Start on the panel, not its first control: no keyboard popping up on phones, no
      // slider bubble or tooltip showing uninvited.
      el.querySelector<HTMLElement>("[data-modal-panel]")?.focus({ preventScroll: true });
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    const timer = window.setTimeout(() => {
      if (el.open) el.close();
      setMounted(false);
      setShown(false);
      opener.current?.focus?.({ preventScroll: true });
    }, exit);
    return () => window.clearTimeout(timer);
  }, [open, mounted, exit]);

  React.useEffect(() => {
    const el = dialog.current;
    if (!el || !mounted) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      close.current();
    };
    // Stop scrolling from leaking to the page unless it happens inside something that scrolls.
    const guard = (e: Event) => {
      let node = e.target as HTMLElement | null;
      while (node && node !== el) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return;
        node = node.parentElement;
      }
      e.preventDefault();
    };
    el.addEventListener("cancel", onCancel);
    el.addEventListener("wheel", guard, { passive: false });
    el.addEventListener("touchmove", guard, { passive: false });
    return () => {
      el.removeEventListener("cancel", onCancel);
      el.removeEventListener("wheel", guard);
      el.removeEventListener("touchmove", guard);
    };
  }, [mounted]);

  return { dialog, mounted: mounted || open, shown: open && shown };
}

/** Class for the full-window <dialog> both surfaces sit in. */
export const MODAL_ROOT =
  // overflow: clip, never hidden: hidden can still be scrolled, and focusing something inside
  // the off-screen panel scrolled the dialog mid-slide (the sheet's jerk on opening).
  "fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-clip bg-transparent p-0 text-foreground outline-none backdrop:bg-transparent";

/** The dim behind the surface: the page fades back under a veil of the background colour, no blur. */
export const SCRIM = "absolute inset-0 bg-[color-mix(in_oklab,var(--background)_62%,transparent)]";
