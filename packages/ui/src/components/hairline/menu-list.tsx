"use client";

import * as React from "react";
import { EASE_OUT, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * MENU LIST: the rows inside a dropdown or context menu
 *
 *   highlight  one fill glides between rows as the pointer or
 *              arrow keys move; it never blinks off and on
 *   keys       arrows (wrapping), Home/End, typing a few letters
 *              jumps to a row, Enter/Space picks
 *   check      checkbox rows draw their tick in place and keep
 *              the menu open
 * ───────────────────────────────────────────────────────── */

export type MenuEntry =
  | { type?: "item"; id: string; label: string; icon?: React.ReactNode; shortcut?: string; destructive?: boolean; disabled?: boolean; onSelect?: () => void }
  | { type: "checkbox"; id: string; label: string; icon?: React.ReactNode; checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean }
  | { type: "label"; label: string }
  | { type: "separator" };

type Row = Extract<MenuEntry, { id: string }>;

export interface MenuListProps {
  items: MenuEntry[];
  /** Called after an item (not a checkbox) is picked. */
  onClose: () => void;
  /** Focus the first row on mount (keyboard open). */
  autoFocus?: "first" | "last" | "none";
  label?: string;
}

function Tick({ on, reduced }: { on: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        style={{ strokeDashoffset: on ? 0 : 1, transition: reduced ? "none" : `stroke-dashoffset ${on ? 280 : 140}ms ${EASE_OUT}` }}
      />
    </svg>
  );
}

export function MenuList({ items, onClose, autoFocus = "none", label }: MenuListProps) {
  const reduced = useInteractionReducedMotion();
  const listRef = React.useRef<HTMLDivElement>(null);
  const rows = items.filter((i): i is Row => "id" in i && !i.disabled);
  const [active, setActive] = React.useState<string | null>(() => (autoFocus === "none" ? null : ((autoFocus === "first" ? rows[0] : rows[rows.length - 1])?.id ?? null)));
  const [mark, setMark] = React.useState<{ y: number; h: number } | null>(null);
  const [ready, setReady] = React.useState(false);
  const typed = React.useRef({ text: "", at: 0 });

  const focusRow = (id: string | null) => {
    setActive(id);
    if (id) listRef.current?.querySelector<HTMLElement>(`[data-menu-row="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  };

  // On mount: focus the starting row (keyboard open) or the list itself.
  React.useEffect(() => {
    const list = listRef.current;
    const row = active ? list?.querySelector<HTMLElement>(`[data-menu-row="${CSS.escape(active)}"]`) : null;
    (row ?? list)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = active ? list.querySelector<HTMLElement>(`[data-menu-row="${CSS.escape(active)}"]`) : null;
      setMark((p) => (el ? (p && p.y === el.offsetTop && p.h === el.offsetHeight ? p : { y: el.offsetTop, h: el.offsetHeight }) : null));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active]);
  React.useEffect(() => {
    if (!mark || ready) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [mark, ready]);

  const pick = (row: Row) => {
    if (row.type === "checkbox") return row.onCheckedChange(!row.checked);
    onClose();
    row.onSelect?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = rows.findIndex((r) => r.id === active);
    let next: Row | undefined;
    if (e.key === "ArrowDown") next = rows[(index + 1) % rows.length];
    else if (e.key === "ArrowUp") next = rows[(index - 1 + rows.length) % rows.length];
    else if (e.key === "Home") next = rows[0];
    else if (e.key === "End") next = rows[rows.length - 1];
    else if ((e.key === "Enter" || e.key === " ") && index >= 0) {
      e.preventDefault();
      return pick(rows[index]);
    } else if (e.key === "Tab") return onClose();
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = e.timeStamp;
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      next = rows.find((r) => r.label.toLowerCase().startsWith(typed.current.text));
    }
    if (!next) return;
    e.preventDefault();
    focusRow(next.id);
  };

  return (
    <div ref={listRef} role="menu" aria-label={label} tabIndex={-1} onKeyDown={onKeyDown} onPointerLeave={() => setActive(null)} className="relative flex flex-col p-1 outline-none">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-0 rounded-[10px] bg-accent"
        style={{
          transform: `translateY(${mark?.y ?? 0}px)`,
          height: mark?.h ?? 0,
          opacity: mark ? 1 : 0,
          transition: reduced || !ready ? "opacity 120ms" : `transform 220ms ${EASE_OUT}, height 220ms ${EASE_OUT}, opacity 160ms ${EASE_OUT}`,
        }}
      />
      {items.map((item, i) => {
        if (item.type === "separator") return <div key={`s${i}`} role="separator" className="mx-2 my-1 h-px bg-border" />;
        if (item.type === "label") return <div key={`l${i}`} className="px-2.5 pb-1 pt-2 text-[11.5px] font-medium text-muted-foreground">{item.label}</div>;
        const row = item as Row;
        const check = row.type === "checkbox";
        const destructive = !check && "destructive" in row && row.destructive;
        return (
          <div
            key={row.id}
            data-menu-row={row.id}
            role={check ? "menuitemcheckbox" : "menuitem"}
            aria-checked={check ? row.checked : undefined}
            aria-disabled={row.disabled || undefined}
            tabIndex={-1}
            onPointerMove={() => !row.disabled && active !== row.id && focusRow(row.id)}
            onClick={() => !row.disabled && pick(row)}
            className={`relative flex h-8 select-none items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] outline-none ${
              row.disabled ? "cursor-default opacity-40" : "cursor-pointer"
            } ${destructive ? "text-red-600 dark:text-red-400" : active === row.id ? "text-foreground" : "text-foreground/85"}`}
          >
            {check ? (
              <span className="flex size-4 items-center justify-center text-foreground">
                <Tick on={row.checked} reduced={reduced} />
              </span>
            ) : (
              row.icon && <span className={`flex size-4 items-center justify-center [&_svg]:size-3.5 ${destructive ? "" : "text-muted-foreground"}`}>{row.icon}</span>
            )}
            <span className="flex-1 truncate">{row.label}</span>
            {!check && "shortcut" in row && row.shortcut && <kbd className="font-mono text-[11px] text-muted-foreground">{row.shortcut}</kbd>}
          </div>
        );
      })}
    </div>
  );
}

export default MenuList;
