"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { enterStyle, themeVars, useDismiss, useFloating, usePresence } from "./floating";
import { MenuList, type MenuEntry } from "./menu-list";
import { useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * CONTEXT MENU: actions where you right-click
 *
 *   open     right-click, a long press on touch (500ms, the area
 *            dims a touch while it waits) or Shift+F10 / the menu
 *            key; the menu grows from the exact point
 *   again    right-clicking elsewhere while open moves it there
 *   place    it flips and shifts to stay inside the window
 *
 * The rows are the same as the dropdown menu's: a gliding
 * highlight, keys, typeahead, checkable rows.
 * ───────────────────────────────────────────────────────── */

export type { MenuEntry } from "./menu-list";

export interface ContextMenuProps {
  /** The area that has the menu. */
  children: React.ReactNode;
  items: MenuEntry[];
  label?: string;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function ContextMenu({ children, items, label = "Actions", onOpenChange, className = "" }: ContextMenuProps) {
  const reduced = useInteractionReducedMotion();
  const area = React.useRef<HTMLDivElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const [point, setPoint] = React.useState<{ x: number; y: number } | null>(null);
  const [byKey, setByKey] = React.useState(false);
  const [holding, setHolding] = React.useState(false);
  const press = React.useRef<{ timer: number; x: number; y: number } | null>(null);
  const open = point !== null;
  const { mounted, shown } = usePresence(open, 180);
  const place = useFloating({ open: mounted, point, floating: surface, side: "bottom", offset: 2 });
  const [vars, setVars] = React.useState<React.CSSProperties>({});

  const openAt = (x: number, y: number, keyboard = false) => {
    setByKey(keyboard);
    setPoint({ x, y });
    onOpenChange?.(true);
  };
  const close = (refocus = false) => {
    setPoint(null);
    onOpenChange?.(false);
    if (refocus) area.current?.focus();
  };

  useDismiss(open, (reason) => close(reason === "escape"), [surface]);

  React.useLayoutEffect(() => {
    if (mounted) setVars(themeVars(area.current));
  }, [mounted]);

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    setHolding(false);
  };

  return (
    <>
      <div
        ref={area}
        tabIndex={0}
        aria-haspopup="menu"
        onContextMenu={(e) => {
          e.preventDefault();
          cancelPress();
          openAt(e.clientX, e.clientY);
        }}
        onKeyDown={(e) => {
          if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            openAt(r.left + 16, r.top + 16, true);
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          const { clientX: x, clientY: y } = e;
          setHolding(true);
          press.current = { x, y, timer: window.setTimeout(() => {
            setHolding(false);
            openAt(x, y);
          }, 500) };
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        className={`outline-none transition-[scale,opacity] duration-500 ease-out focus-visible:ring-2 focus-visible:ring-ring/40 ${holding && !reduced ? "scale-[0.985] opacity-80" : ""} ${className}`}
        style={{ WebkitTouchCallout: "none" }}
      >
        {children}
      </div>
      {mounted &&
        createPortal(
          <div
            ref={surface}
            className="fixed left-0 top-0 z-[55] min-w-[200px] overflow-hidden rounded-[14px] bg-popover text-popover-foreground shadow-[0_0_0_1px_var(--border)]"
            style={{ ...vars, left: place.x, top: place.y, transformOrigin: "0 0", ...enterStyle(shown, place.side, reduced) }}
          >
            <MenuList key={`${point?.x}-${point?.y}`} items={items} label={label} autoFocus={byKey ? "first" : "none"} onClose={() => close(true)} />
          </div>,
          document.body,
        )}
    </>
  );
}

export default ContextMenu;
