"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { enterStyle, themeVars, useDismiss, useFloating, usePresence, type Align, type Side } from "./floating";
import { MenuList, type MenuEntry } from "./menu-list";
import { useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * DROPDOWN MENU: actions behind a button
 *
 *   open     the menu rises off the trigger out of a blur, from
 *            the point on the trigger nearest to it; it flips
 *            above when there's no room below
 *   move     one highlight glides between rows
 *   pick     the menu closes and focus goes back to the trigger;
 *            checkbox rows draw their tick and stay open
 *
 * Opening from the keyboard (Enter, Space, ↓) focuses the first
 * row; ↑ focuses the last. Escape or a press outside closes it.
 * ───────────────────────────────────────────────────────── */

export type { MenuEntry } from "./menu-list";

export interface DropdownMenuProps {
  /** The button that opens it. It gets aria-haspopup, aria-expanded and the click. */
  trigger: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  items: MenuEntry[];
  side?: Side;
  align?: Align;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accessible name of the menu. */
  label?: string;
  /** Minimum width in px; never narrower than the trigger. */
  minWidth?: number;
}

export function DropdownMenu({ trigger, items, side = "bottom", align = "start", open: controlled, onOpenChange, label, minWidth = 200 }: DropdownMenuProps) {
  const reduced = useInteractionReducedMotion();
  const anchor = React.useRef<HTMLSpanElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState(false);
  const [focusOn, setFocusOn] = React.useState<"first" | "last" | "none">("none");
  const open = controlled ?? own;
  const { mounted, shown } = usePresence(open, 180);
  const place = useFloating({ open: mounted, anchor, floating: surface, side, align, offset: 6 });
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

  const [width, setWidth] = React.useState(minWidth);
  React.useLayoutEffect(() => {
    if (!mounted) return;
    setVars(themeVars(anchor.current));
    setWidth(Math.max(minWidth, anchor.current?.offsetWidth ?? 0));
  }, [mounted, minWidth]);

  return (
    <>
      <span ref={anchor} className="inline-flex">
        {React.cloneElement(trigger, {
          id: trigger.props.id ?? triggerId,
          "aria-haspopup": "menu",
          "aria-expanded": open,
          "aria-controls": open ? id : undefined,
          onClick: (e: React.MouseEvent<HTMLElement>) => {
            trigger.props.onClick?.(e);
            setFocusOn(e.detail === 0 ? "first" : "none");
            setOpen(!open);
          },
          onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
            trigger.props.onKeyDown?.(e);
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setFocusOn(e.key === "ArrowDown" ? "first" : "last");
              setOpen(true);
            }
          },
        })}
      </span>
      {mounted &&
        createPortal(
          <div
            ref={surface}
            id={id}
            className="fixed left-0 top-0 z-[55] overflow-hidden rounded-[14px] bg-popover text-popover-foreground shadow-[0_0_0_1px_var(--border)]"
            style={{ ...vars, left: place.x, top: place.y, minWidth: width, transformOrigin: place.origin, ...enterStyle(shown, place.side, reduced) }}
          >
            <MenuList items={items} label={label} autoFocus={focusOn} onClose={() => setOpen(false, true)} />
          </div>,
          // patched (hairline/patch.mjs): inside a modal <dialog> the rest of the page is inert, so open in it.
          anchor.current?.closest("dialog") ?? document.body,
        )}
    </>
  );
}

export default DropdownMenu;
