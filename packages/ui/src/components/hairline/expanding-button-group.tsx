"use client";

import * as React from "react";
import { TextMorph } from "./text-morph";
import { EASE_OUT, INTERACTION_FOCUS, INTERACTION_PRESS, interactionIcon, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * EXPANDING BUTTON GROUP: an icon toolbar that names what you point at
 *
 *   point    the action under the mouse (or keyboard focus) opens
 *            its label; the column eases from 0fr to 1fr while the
 *            text lifts out of a blur, so neighbours slide aside
 *            instead of jumping. Each change retargets mid-way.
 *   tap      on touch nothing hovers: a tap acts and opens the
 *            label for a moment, so you see what you pressed
 *   ask      items with `confirm` ask first: the label morphs to
 *            "Delete?" and the next press acts (3s, Esc or moving
 *            away cancels)
 *   done     items with `confirmLabel` answer in place: the icon
 *            gives way to a drawn check, the label morphs
 *
 * Hover follows real pointer movement only, so a label opening
 * under a still cursor never hands the hover to a neighbour.
 * ───────────────────────────────────────────────────────── */

export type ExpandingItemTone = "default" | "primary" | "danger";

export interface ExpandingButtonItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  tone?: ExpandingItemTone;
  /** Ask before acting: the label morphs to this ("Delete?") and the next press runs onClick. */
  confirm?: string;
  /** Shown with a drawn check after the action runs ("Archived"). */
  confirmLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface ExpandingButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ExpandingButtonItem[];
  /** The item that stays open while nothing is pointed at (controlled). */
  expandedId?: string | null;
  /** The item that stays open while nothing is pointed at. */
  defaultExpandedId?: string | null;
  /** sm: 24px buttons in a 32px bar. md: 28px buttons in a 36px bar. */
  size?: "sm" | "md";
  /** Accessible name of the toolbar. */
  label?: string;
}

const TONES: Record<ExpandingItemTone, { idle: string; open: string }> = {
  default: { idle: "text-muted-foreground hover:text-foreground", open: "bg-accent text-foreground" },
  primary: { idle: "text-muted-foreground hover:text-foreground", open: "bg-primary text-primary-foreground" },
  danger: {
    idle: "text-muted-foreground hover:text-red-600 dark:hover:text-red-400",
    open: "bg-red-500/10 text-red-600 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-red-500)_25%,transparent)] dark:text-red-400",
  },
};

const ASK_MS = 3000;
const DONE_MS = 1600;
const TAP_MS = 2400;

function Check({ drawn, reduced }: { drawn: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-full">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        style={{
          strokeDashoffset: drawn ? 0 : 1,
          transition: reduced ? "none" : drawn ? `stroke-dashoffset 360ms ${EASE_OUT} 80ms` : "stroke-dashoffset 0ms linear 300ms",
        }}
      />
    </svg>
  );
}

export function ExpandingButtonGroup({
  items,
  expandedId,
  defaultExpandedId = null,
  size = "md",
  label = "Actions",
  className = "",
  onKeyDown,
  ...props
}: ExpandingButtonGroupProps) {
  const reduced = useInteractionReducedMotion();
  const groupRef = React.useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [tapId, setTapId] = React.useState<string | null>(null);
  const [askId, setAskId] = React.useState<string | null>(null);
  const [doneId, setDoneId] = React.useState<string | null>(null);
  const [tabStop, setTabStop] = React.useState<string | null>(null);
  const lastPoint = React.useRef({ x: NaN, y: NaN });
  const pointerType = React.useRef("mouse");

  const restId = expandedId !== undefined ? expandedId : defaultExpandedId;
  const openId = hoverId ?? focusId ?? askId ?? doneId ?? tapId ?? restId;
  const firstEnabled = items.find((item) => !item.disabled)?.id ?? null;
  const stop = items.some((item) => item.id === tabStop && !item.disabled) ? tabStop : firstEnabled;

  // Each transient state lets go on its own.
  React.useEffect(() => {
    if (!askId) return;
    const timer = window.setTimeout(() => setAskId(null), ASK_MS);
    return () => window.clearTimeout(timer);
  }, [askId]);
  React.useEffect(() => {
    if (!doneId) return;
    const timer = window.setTimeout(() => setDoneId(null), DONE_MS);
    return () => window.clearTimeout(timer);
  }, [doneId]);
  React.useEffect(() => {
    if (!tapId) return;
    const timer = window.setTimeout(() => setTapId(null), TAP_MS);
    return () => window.clearTimeout(timer);
  }, [tapId]);

  const point = (id: string | null) => {
    setHoverId(id);
    if (askId && id !== askId) setAskId(null);
  };

  // Hover follows movement, not boundary events: when a label opens under a still cursor,
  // the neighbour that slides beneath it doesn't steal the hover.
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerType.current = e.pointerType;
    if (e.pointerType !== "mouse") return;
    if (e.clientX === lastPoint.current.x && e.clientY === lastPoint.current.y) return;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-expanding-item]");
    const item = el ? items.find((i) => i.id === el.dataset.expandingItem) : undefined;
    if (item && !item.disabled && item.id !== hoverId) point(item.id);
  };

  const handleClick = (item: ExpandingButtonItem) => {
    if (item.disabled) return;
    setTabStop(item.id);
    if (pointerType.current !== "mouse") setTapId(item.id);
    if (item.confirm && askId !== item.id) {
      setDoneId(null);
      setAskId(item.id);
      return;
    }
    setAskId(null);
    item.onClick?.();
    if (item.confirmLabel) setDoneId(item.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.key === "Escape" && askId) {
      e.preventDefault();
      setAskId(null);
      return;
    }
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.id === stop);
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % enabled.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    if (next < 0 || !enabled[next]) return;
    e.preventDefault();
    const id = enabled[next].id;
    setTabStop(id);
    groupRef.current?.querySelector<HTMLElement>(`[data-expanding-item="${CSS.escape(id)}"]`)?.focus();
  };

  const sm = size === "sm";
  const iconSize = sm ? 12 : 14;
  const announce = askId ? items.find((i) => i.id === askId)?.confirm : doneId ? items.find((i) => i.id === doneId)?.confirmLabel : undefined;

  return (
    <>
      <div
        ref={groupRef}
        role="toolbar"
        aria-label={label}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => (pointerType.current = e.pointerType)}
        onPointerMove={handlePointerMove}
        onPointerLeave={(e) => {
          // A lifted finger "leaves" too; only a mouse leaving ends the hover (and an open ask).
          if (e.pointerType !== "mouse") return;
          lastPoint.current = { x: NaN, y: NaN };
          point(null);
        }}
        onBlur={(e) => {
          if (groupRef.current?.contains(e.relatedTarget as Node)) return;
          setFocusId(null);
          setAskId(null);
        }}
        className={`relative inline-flex max-w-full select-none items-center gap-0.5 rounded-full bg-card p-1 text-foreground shadow-[inset_0_0_0_1px_var(--border)] ${className}`}
        {...props}
      >
        {items.map((item) => {
          const open = openId === item.id;
          const done = doneId === item.id;
          const tone = TONES[item.tone ?? "default"];
          const text = done ? item.confirmLabel ?? item.label : askId === item.id ? item.confirm ?? item.label : item.label;
          return (
            <button
              key={item.id}
              type="button"
              data-expanding-item={item.id}
              data-state={open ? "open" : "closed"}
              disabled={item.disabled}
              tabIndex={stop === item.id ? 0 : -1}
              onClick={() => handleClick(item)}
              onFocus={(e) => {
                setTabStop(item.id);
                // Keyboard focus opens the label; a tap's focus doesn't (the tap does).
                setFocusId(e.currentTarget.matches(":focus-visible") ? item.id : null);
              }}
              className={`relative inline-flex shrink-0 items-center rounded-full font-medium cursor-pointer disabled:cursor-default disabled:opacity-40 ${INTERACTION_PRESS} ${INTERACTION_FOCUS} ${
                sm ? "h-6 px-1.5 text-[12px]" : "h-7 px-[7px] text-[12.5px]"
              } ${open ? tone.open : tone.idle}`}
            >
              <span aria-hidden="true" className="relative shrink-0" style={{ width: iconSize, height: iconSize }}>
                <span className="absolute inset-0 flex items-center justify-center [&_svg]:size-full" style={interactionIcon(!done, reduced)}>
                  {item.icon}
                </span>
                <span className={`absolute inset-0 ${item.tone === "primary" && open ? "" : "text-emerald-600 dark:text-emerald-400"}`} style={interactionIcon(done, reduced)}>
                  <Check drawn={done} reduced={reduced} />
                </span>
              </span>
              {/* The label's column eases 0fr ↔ 1fr, so the button and its neighbours move as one. */}
              <span
                className="grid"
                style={{
                  gridTemplateColumns: open ? "1fr" : "0fr",
                  transition: reduced ? "none" : `grid-template-columns 400ms ${EASE_OUT}`,
                }}
              >
                <span className="min-w-0 overflow-hidden [clip-path:inset(-4px_0)]">
                  <span
                    className="block w-max whitespace-nowrap pl-1.5 pr-1"
                    style={{
                      opacity: open ? 1 : 0,
                      filter: open ? "blur(0px)" : "blur(4px)",
                      transform: open ? "none" : "translateX(-4px)",
                      transition: reduced
                        ? "none"
                        : open
                          ? `opacity 260ms ${EASE_OUT} 80ms, filter 260ms ${EASE_OUT} 80ms, transform 400ms ${EASE_OUT}`
                          : `opacity 140ms ${EASE_OUT}, filter 140ms ${EASE_OUT}, transform 300ms ${EASE_OUT}`,
                    }}
                  >
                    <TextMorph>{text}</TextMorph>
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <span role="status" className="sr-only">
        {announce ?? ""}
      </span>
    </>
  );
}

export default ExpandingButtonGroup;
