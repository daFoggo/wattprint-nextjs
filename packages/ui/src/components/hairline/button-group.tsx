"use client";

import * as React from "react";
import { EASE_OUT, EASE_THROW, INTERACTION_FOCUS, INTERACTION_PRESS, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * BUTTON GROUP: connected buttons that share one surface
 *
 *   press    every segment gives 3% under the finger and settles back
 *   select   the active segment's fill is one piece that is thrown
 *            to the new segment (slight overshoot) while its width
 *            eases; it never blinks off one and on the other
 *   divide   hairlines fade out beside the fill and the hovered one
 *   narrow   when the row stops fitting, labels fold into their
 *            icons (the label column eases 1fr → 0fr) and open
 *            again when there is room
 * ───────────────────────────────────────────────────────── */

export type ButtonGroupVariant = "outline" | "solid";
export type ButtonGroupSize = "sm" | "md";
export type ButtonGroupOrientation = "horizontal" | "vertical";

export interface ButtonGroupItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Always show only the icon (the label becomes its accessible name). */
  iconOnly?: boolean;
  /** Custom content in place of icon + label, e.g. a value between two steppers. */
  content?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  /** The selected segment; the fill glides to it. */
  active?: boolean;
}

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ButtonGroupItem[];
  variant?: ButtonGroupVariant;
  /** sm: 28px tall, md: 36px tall. */
  size?: ButtonGroupSize;
  orientation?: ButtonGroupOrientation;
  /** Fold labels into icons when the row doesn't fit its parent. */
  collapseLabels?: boolean;
  /** Accessible name of the group. */
  label?: string;
}

type Mark = { x: number; y: number; w: number; h: number };

export function ButtonGroup({
  items,
  variant = "outline",
  size = "md",
  orientation = "horizontal",
  collapseLabels = true,
  label = "Actions",
  className = "",
  onKeyDown,
  ...props
}: ButtonGroupProps) {
  const reduced = useInteractionReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [compact, setCompact] = React.useState(false);
  const [mark, setMark] = React.useState<Mark | null>(null);
  const [ready, setReady] = React.useState(false);

  const vertical = orientation === "vertical";
  const solid = variant === "solid" && !vertical;
  const sm = size === "sm";
  const activeId = items.find((item) => item.active)?.id ?? null;

  // The fill sits under the active segment, measured from layout offsets (scale ignored).
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const el = activeId ? root.querySelector<HTMLElement>(`[data-group-item="${CSS.escape(activeId)}"]`) : null;
      if (!el) return setMark(null);
      const next = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
      setMark((p) => (p && p.x === next.x && p.y === next.y && p.w === next.w && p.h === next.h ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.querySelectorAll("[data-group-item]").forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [activeId, items]);

  // First placement lands without a transition; after that, it glides.
  React.useEffect(() => {
    if (!mark || ready) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [mark, ready]);

  // Labels fold into icons when the row stops fitting its parent (with some hysteresis).
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || !collapseLabels || vertical) return;
    let full = 0;
    const check = () => {
      const parent = root.parentElement;
      const available = parent ? parent.clientWidth : window.innerWidth;
      setCompact((was) => {
        if (!was) full = Math.max(full, root.scrollWidth);
        if (!was && full > available - 8) return true;
        if (was && full + 24 <= available) return false;
        return was;
      });
    };
    check();
    const ro = new ResizeObserver(check);
    if (root.parentElement) ro.observe(root.parentElement);
    return () => ro.disconnect();
  }, [collapseLabels, vertical, items]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    const list = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-group-item]:not(:disabled)") ?? []);
    const index = list.findIndex((node) => node === document.activeElement);
    if (index < 0) return;
    const forward = vertical ? "ArrowDown" : "ArrowRight";
    const back = vertical ? "ArrowUp" : "ArrowLeft";
    let next = -1;
    if (e.key === forward) next = (index + 1) % list.length;
    else if (e.key === back) next = (index - 1 + list.length) % list.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = list.length - 1;
    if (next < 0) return;
    e.preventDefault();
    list[next]?.focus();
  };

  const fill = vertical ? "rounded-[8px] bg-accent" : solid ? "rounded-full bg-primary-foreground/20" : "rounded-full bg-accent";
  const hover = solid ? "hover:bg-primary-foreground/10" : "hover:bg-accent/60";

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      onKeyDown={handleKeyDown}
      onPointerLeave={() => setHoveredId(null)}
      className={`relative isolate inline-flex max-w-full shrink-0 select-none ${
        vertical
          ? "w-48 flex-col gap-0.5 rounded-[12px] bg-card p-1 text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
          : `flex-row items-center rounded-full p-0.5 ${
              solid ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
            }`
      } ${className}`}
      {...props}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 z-0 ${fill}`}
        style={{
          transform: `translate3d(${mark?.x ?? 0}px, ${mark?.y ?? 0}px, 0)`,
          width: mark?.w ?? 0,
          height: mark?.h ?? 0,
          opacity: mark ? 1 : 0,
          transition:
            reduced || !ready ? "none" : `transform 440ms ${EASE_THROW}, width 400ms ${EASE_OUT}, height 400ms ${EASE_OUT}, opacity 220ms ${EASE_OUT}`,
        }}
      />

      {items.map((item, index) => {
        const active = !!item.active;
        const prev = items[index - 1];
        // A divider fades when either neighbour is filled or hovered.
        const hideDivider = active || !!prev?.active || hoveredId === item.id || hoveredId === prev?.id;
        const iconOnly = !vertical && !!item.icon && (item.iconOnly || compact);
        const custom = item.content !== undefined;

        const content = custom ? (
          <span className="relative inline-flex items-center px-1.5">{item.content}</span>
        ) : (
          <span className="relative inline-flex items-center">
            {item.icon && (
              <span aria-hidden="true" className={`inline-flex size-3.5 shrink-0 items-center justify-center ${active || solid ? "" : "opacity-70"}`}>
                {item.icon}
              </span>
            )}
            {item.icon && !vertical ? (
              // The label column folds into the icon instead of disappearing.
              <span
                className="grid"
                style={{ gridTemplateColumns: iconOnly ? "0fr" : "1fr", transition: reduced ? "none" : `grid-template-columns 400ms ${EASE_OUT}` }}
              >
                <span className="min-w-0 overflow-hidden [clip-path:inset(-4px_0)]">
                  <span
                    className={`block w-max whitespace-nowrap ${sm ? "pl-1.5 pr-1" : "pl-2 pr-1"}`}
                    style={{
                      opacity: iconOnly ? 0 : 1,
                      filter: iconOnly ? "blur(4px)" : "blur(0px)",
                      transition: reduced ? "none" : `opacity 220ms ${EASE_OUT}, filter 220ms ${EASE_OUT}`,
                    }}
                  >
                    {item.label}
                  </span>
                </span>
              </span>
            ) : (
              <span className={`whitespace-nowrap ${item.icon ? "pl-2" : ""}`}>{item.label}</span>
            )}
          </span>
        );

        const pad = vertical ? "h-8 w-full justify-start px-2.5" : item.icon && !custom ? (sm ? "h-6 px-[5px]" : "h-8 px-[9px]") : sm ? "h-6 px-2.5" : "h-8 px-3.5";
        const tone = active
          ? solid
            ? "text-primary-foreground"
            : "text-foreground"
          : solid
            ? `text-primary-foreground/85 hover:text-primary-foreground ${hover}`
            : `text-muted-foreground hover:text-foreground ${hover}`;
        const itemClass = `relative z-10 inline-flex items-center justify-center whitespace-nowrap font-medium cursor-pointer disabled:cursor-default disabled:opacity-40 ${
          vertical ? "rounded-[8px]" : "rounded-full"
        } ${sm ? "text-[12px]" : "text-[13px]"} ${pad} ${tone} ${INTERACTION_FOCUS}`;
        const pressable = !custom || !!item.onClick || !!item.href;

        const shared = {
          "data-group-item": item.id,
          "aria-label": iconOnly ? item.label : undefined,
          title: iconOnly ? item.label : undefined,
          onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && !item.disabled && setHoveredId(item.id),
          onClick: item.onClick,
          className: pressable ? `${itemClass} ${INTERACTION_PRESS}` : `${itemClass} cursor-default`,
        };

        return (
          <React.Fragment key={item.id}>
            {!vertical && index > 0 && (
              <span
                aria-hidden="true"
                className={`h-3.5 w-px shrink-0 ${solid ? "bg-primary-foreground/25" : "bg-border"}`}
                style={{ opacity: hideDivider ? 0 : 1, transition: reduced ? "none" : `opacity 220ms ${EASE_OUT}` }}
              />
            )}
            {item.href ? (
              <a href={item.href} aria-current={active ? "page" : undefined} {...shared}>
                {content}
              </a>
            ) : custom && !item.onClick ? (
              <span {...shared}>
                {content}
              </span>
            ) : (
              <button type="button" disabled={item.disabled} aria-pressed={item.active === undefined ? undefined : active} {...shared}>
                {content}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default ButtonGroup;
