"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { EASE_OUT, EASE_THROW, INTERACTION_FOCUS, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * TABS: views of one thing, side by side
 *
 *   pick     the indicator (an underline, or a pill) is thrown to
 *            the new tab while its width eases to the label
 *   panel    the new panel slides in from the side you moved
 *            toward, out of a blur, as the old one leaves the other
 *            way; the box eases to the new panel's height
 *   count    a tab's count rolls when it changes
 *   keys     arrows move and select, Home/End jump; the tablist
 *            scrolls the chosen tab into view on narrow screens
 * ───────────────────────────────────────────────────────── */

export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  content?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: "underline" | "pills";
  /** Accessible name of the tablist. */
  label: string;
  className?: string;
}

type Leaving = { value: string; dir: number; node: React.ReactNode; key: string };

export function Tabs({ items, value, defaultValue, onValueChange, variant = "underline", label, className = "" }: TabsProps) {
  const reduced = useInteractionReducedMotion();
  const baseId = React.useId();
  const listRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState(defaultValue ?? items[0]?.value);
  const current = value !== undefined ? value : own;
  const [mark, setMark] = React.useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = React.useState(false);
  const [height, setHeight] = React.useState<number | null>(null);
  const [shown, setShown] = React.useState(current);
  const [leaving, setLeaving] = React.useState<Leaving | null>(null);
  const [dir, setDir] = React.useState(1);
  const pills = variant === "pills";

  // When the value changes, the old panel becomes a leaving copy and the new one enters from `dir`.
  if (shown !== current) {
    const from = items.findIndex((i) => i.value === shown);
    const to = items.findIndex((i) => i.value === current);
    const d = to >= from ? 1 : -1;
    setDir(d);
    setLeaving(reduced ? null : { value: shown, dir: d, node: items[from]?.content, key: `${shown}>${current}` });
    setShown(current);
  }

  React.useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(null), 260);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-tab="${CSS.escape(current ?? "")}"]`);
      if (!el) return setMark(null);
      const next = { x: el.offsetLeft, w: el.offsetWidth };
      setMark((p) => (p && p.x === next.x && p.w === next.w ? p : next));
      // Keep the chosen tab in view inside the scrolling strip, never scrolling the page.
      const strip = list.parentElement;
      if (strip && strip.scrollWidth > strip.clientWidth) {
        const left = el.offsetLeft - 16;
        const right = el.offsetLeft + el.offsetWidth + 16 - strip.clientWidth;
        if (strip.scrollLeft > left) strip.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
        else if (strip.scrollLeft < right) strip.scrollTo({ left: right, behavior: reduced ? "auto" : "smooth" });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [current, items, reduced]);

  React.useEffect(() => {
    if (!mark || ready) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [mark, ready]);

  React.useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const measure = () => setHeight((h) => (h === el.offsetHeight ? h : el.offsetHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown]);

  // The entering and leaving panels' motion, played once per change.
  const leavingRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el || !leaving) return;
    leavingRef.current?.animate(
      [
        { opacity: 1, transform: "none", filter: "blur(0px)" },
        { opacity: 0, transform: `translateX(${-leaving.dir * 20}px)`, filter: "blur(4px)" },
      ],
      { duration: 200, easing: EASE_OUT, fill: "forwards" },
    );
    el.animate(
      [
        { opacity: 0, transform: `translateX(${dir * 20}px)`, filter: "blur(4px)" },
        { opacity: 1, transform: "none", filter: "blur(0px)" },
      ],
      { duration: 380, easing: EASE_OUT },
    );
  }, [leaving, dir]);

  const pick = (v: string) => {
    if (value === undefined) setOwn(v);
    onValueChange?.(v);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const enabled = items.filter((i) => !i.disabled);
    const index = enabled.findIndex((i) => i.value === current);
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % enabled.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    e.preventDefault();
    pick(enabled[next].value);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(enabled[next].value)}"]`)?.focus();
  };

  const hasPanels = items.some((i) => i.content !== undefined);
  const active = items.find((i) => i.value === shown);

  return (
    <div className={`flex w-full min-w-0 flex-col ${className}`}>
      <div className={`relative min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${pills ? "" : "shadow-[inset_0_-1px_0_var(--border)]"}`}>
        <div ref={listRef} role="tablist" aria-label={label} onKeyDown={onKeyDown} className={`relative flex w-max items-center ${pills ? "gap-1 rounded-full bg-muted p-1" : "gap-5 px-1"}`}>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-0 ${pills ? "top-1 bottom-1 rounded-full bg-background shadow-[0_0_0_1px_var(--border)]" : "bottom-0 h-[2px] rounded-full bg-foreground"}`}
            style={{
              transform: `translateX(${mark?.x ?? 0}px)`,
              width: mark?.w ?? 0,
              opacity: mark ? 1 : 0,
              transition: reduced || !ready ? "none" : `transform 440ms ${EASE_THROW}, width 400ms ${EASE_OUT}, opacity 200ms ${EASE_OUT}`,
            }}
          />
          {items.map((item) => {
            const on = item.value === current;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                id={`${baseId}-tab-${item.value}`}
                aria-selected={on}
                aria-controls={hasPanels ? `${baseId}-panel` : undefined}
                tabIndex={on ? 0 : -1}
                disabled={item.disabled}
                data-tab={item.value}
                onClick={() => pick(item.value)}
                className={`relative z-10 flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium cursor-pointer transition-colors duration-200 disabled:cursor-default disabled:opacity-40 [&_svg]:size-3.5 ${
                  pills ? "h-7 rounded-full px-3" : "h-10 rounded-md"
                } ${on ? "text-foreground" : "text-muted-foreground hover:text-foreground"} ${INTERACTION_FOCUS}`}
              >
                {item.icon}
                {item.label}
                {item.count !== undefined && (
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums transition-colors duration-200 ${on ? "bg-foreground text-background" : "bg-muted text-muted-foreground"} ${pills && !on ? "bg-background" : ""}`}>
                    <NumberRoll value={item.count} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {hasPanels && (
        <div className="relative overflow-hidden" style={{ height: height ?? undefined, transition: reduced ? "none" : `height 380ms ${EASE_OUT}` }}>
          {leaving && (
            <div
              key={leaving.key}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 pt-4"
              ref={leavingRef}
            >
              {leaving.node}
            </div>
          )}
          <div ref={panelRef} id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${shown}`} tabIndex={0} className="pt-4 outline-none">
            {active?.content}
          </div>
        </div>
      )}
    </div>
  );
}

export default Tabs;
