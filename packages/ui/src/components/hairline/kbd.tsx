"use client";

import * as React from "react";

/* ─────────────────────────────────────────────────────────
 * KBD: a keyboard shortcut, written for the reader's keyboard
 *
 *   platform  "mod" reads ⌘ on a Mac and Ctrl elsewhere; alt,
 *             shift and enter get their symbols on a Mac
 *   press     with `live`, each key sinks when you press it for
 *             real, so a shortcut hint answers the keyboard
 * ───────────────────────────────────────────────────────── */

export interface KbdProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Keys, e.g. ["mod", "k"] or "mod+shift+p". */
  keys: string[] | string;
  /** Keys sink while they're held down. */
  live?: boolean;
  size?: "sm" | "md";
}

const MAC: Record<string, string> = { mod: "⌘", cmd: "⌘", meta: "⌘", ctrl: "⌃", control: "⌃", alt: "⌥", option: "⌥", shift: "⇧", enter: "↵", return: "↵", backspace: "⌫", escape: "Esc", esc: "Esc", tab: "⇥" };
const PC: Record<string, string> = { mod: "Ctrl", cmd: "Win", meta: "Win", ctrl: "Ctrl", control: "Ctrl", alt: "Alt", option: "Alt", shift: "Shift", enter: "Enter", return: "Enter", backspace: "Backspace", escape: "Esc", esc: "Esc", tab: "Tab" };
const ARROWS: Record<string, string> = { up: "↑", down: "↓", left: "←", right: "→", arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→" };

const subscribeNoop = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

function matches(key: string, e: KeyboardEvent, mac: boolean) {
  const k = key.toLowerCase();
  if (k === "mod") return mac ? e.key === "Meta" : e.key === "Control";
  if (k === "cmd" || k === "meta") return e.key === "Meta";
  if (k === "ctrl" || k === "control") return e.key === "Control";
  if (k === "alt" || k === "option") return e.key === "Alt";
  if (k === "shift") return e.key === "Shift";
  if (k === "esc") return e.key === "Escape";
  if (k in ARROWS) return e.key.toLowerCase() === (k.startsWith("arrow") ? k : `arrow${k}`);
  return e.key.toLowerCase() === k;
}

export function Kbd({ keys, live, size = "md", className = "", ...props }: KbdProps) {
  const mac = React.useSyncExternalStore(subscribeNoop, isMac, () => true);
  const list = Array.isArray(keys) ? keys : keys.split("+");
  const [down, setDown] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!live) return;
    const onDown = (e: KeyboardEvent) => setDown((d) => [...new Set([...d, ...list.filter((k) => matches(k, e, mac))])]);
    const onUp = (e: KeyboardEvent) => setDown((d) => d.filter((k) => !matches(k, e, mac)));
    const clear = () => setDown([]);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
    // list is derived from keys
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, mac, list.join("+")]);

  const label = (k: string) => {
    const l = k.toLowerCase();
    return ARROWS[l] ?? (mac ? MAC[l] : PC[l]) ?? (k.length === 1 ? k.toUpperCase() : k);
  };

  // Words for screen readers, not symbols.
  const spoken = (k: string) => {
    const l = k.toLowerCase();
    const words: Record<string, string> = { mod: mac ? "Command" : "Control", cmd: "Command", meta: "Command", ctrl: "Control", alt: mac ? "Option" : "Alt", option: "Option", shift: "Shift" };
    return words[l] ?? (PC[l] ? PC[l] : l.startsWith("arrow") || l in ARROWS ? `${l.replace("arrow", "")} arrow` : label(k));
  };

  return (
    <kbd className={`inline-flex items-center gap-1 font-sans ${className}`} aria-label={list.map(spoken).join(" ")} {...props}>
      {list.map((k, i) => {
        const pressed = down.includes(k);
        return (
          <span
            key={k + i}
            aria-hidden="true"
            className={`inline-flex items-center justify-center rounded-[6px] bg-background font-medium text-muted-foreground transition-[translate,box-shadow,color] duration-100 ${
              size === "sm" ? "h-5 min-w-5 px-1 text-[11px]" : "h-6 min-w-6 px-1.5 text-[12px]"
            } ${
              pressed
                ? "translate-y-px text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                : "shadow-[inset_0_0_0_1px_var(--border),inset_0_-1px_0_var(--border)]"
            }`}
          >
            {label(k)}
          </span>
        );
      })}
    </kbd>
  );
}

export default Kbd;
