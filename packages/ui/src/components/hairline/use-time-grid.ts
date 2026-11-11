"use client";

import * as React from "react";

/* ─────────────────────────────────────────────────────────
 * TIME GRID: the gestures of a calendar week
 *
 *   create    press on an empty slot and drag: a block grows
 *             from where you pressed to where you are, snapped
 *             to the step; on touch, hold for a moment first,
 *             so a swipe still scrolls
 *   move      drag an event: it keeps the spot you grabbed it
 *             by, snaps in time and jumps day to day
 *   resize    drag its top or bottom edge
 *   scroll    near the top or bottom of the scroller the grid
 *             scrolls itself, faster the closer you get
 *
 * The hook only turns pointers into snapped drafts
 * ({ day, start, end } in minutes) and reports a change of
 * step, not every move; the component lays drafts out like
 * any other event, so the overlap columns re-flow live.
 * Plus the date and overlap helpers it needs.
 * ───────────────────────────────────────────────────────── */

export type GridItem = { id: string; day: number; start: number; end: number; busy?: boolean };
export type GridDraftKind = "create" | "move" | "start" | "end";
export type GridDraft = { kind: GridDraftKind; id: string; day: number; start: number; end: number };

// ── Dates ────────────────────────────────────────────────
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const startOfWeek = (d: Date, weekStartsOn: number) => {
  const day = startOfDay(d);
  return addDays(day, -((day.getDay() - weekStartsOn + 7) % 7));
};
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
export const atMinutes = (day: Date, minutes: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);

// ── Overlaps ─────────────────────────────────────────────
/**
 * Side-by-side columns for one day: items that overlap (directly or through a chain) form a cluster, each takes the
 * first column that's free when it starts, and the whole cluster shares the cluster's column count.
 */
export function layoutDay(items: { id: string; start: number; end: number }[]) {
  const out = new Map<string, { col: number; cols: number }>();
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: string[] = [];
  let ends: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const id of cluster) out.get(id)!.cols = ends.length;
    cluster = [];
    ends = [];
  };
  for (const it of sorted) {
    if (it.start >= clusterEnd && cluster.length) flush();
    let col = ends.findIndex((end) => end <= it.start);
    if (col === -1) {
      col = ends.length;
      ends.push(it.end);
    } else ends[col] = it.end;
    out.set(it.id, { col, cols: 1 });
    cluster.push(it.id);
    clusterEnd = cluster.length === 1 ? it.end : Math.max(clusterEnd, it.end);
  }
  flush();
  return out;
}

// ── Gestures ─────────────────────────────────────────────
type Options = {
  /** The day columns (inside the scroller): pointers are read against it. */
  columns: React.RefObject<HTMLElement | null>;
  scroller: React.RefObject<HTMLElement | null>;
  span: number;
  /** Visible range in minutes from midnight. */
  min: number;
  max: number;
  pxPerMinute: number;
  step: number;
  /** Length of an event made by holding (touch) before dragging. */
  holdDuration: number;
  items: GridItem[];
  /** A new snapped draft, or null when the gesture ends. Called per step, not per move. */
  onDraft: (draft: GridDraft | null) => void;
  /** The gesture ended on a draft. */
  onCommit: (draft: GridDraft) => void;
  /** A press that didn't become a drag: on an event (id) or an empty slot. */
  onTap: (target: { id: string } | { day: number; minute: number }, pointerType: string) => void;
  disabled?: boolean;
};

type Gesture = {
  pointerId: number;
  pointerType: string;
  kind: GridDraftKind;
  id: string;
  x: number;
  y: number;
  downDay: number;
  downMinute: number;
  /** Minutes between the grab point and the event's start. */
  offset: number;
  item: { day: number; start: number; end: number } | null;
  active: boolean;
  held: boolean;
  timer: number;
  draft: GridDraft | null;
};

const HOLD = 360;
const EDGE = 40;
let seq = 0;

export function useTimeGrid(o: Options) {
  const opts = React.useRef(o);
  React.useLayoutEffect(() => {
    opts.current = o;
  });
  const g = React.useRef<Gesture | null>(null);
  const scrollLoop = React.useRef(0);

  const snap = (m: number) => Math.round(m / opts.current.step) * opts.current.step;
  const floorStep = (m: number) => Math.floor(m / opts.current.step) * opts.current.step;

  /** The grid's box, measured when a gesture starts and adjusted for scrolling, so a drag never forces a layout read. */
  const box = React.useRef<{ left: number; top: number; width: number; scroll: number } | null>(null);
  /** The scroller's offset, kept from its scroll events: reading scrollTop mid-transition would force a style flush. */
  const scrollY = React.useRef(0);
  const measure = () => {
    const r = opts.current.columns.current!.getBoundingClientRect();
    scrollY.current = opts.current.scroller.current?.scrollTop ?? 0;
    return { left: r.left, top: r.top, width: r.width, scroll: scrollY.current };
  };

  /** Pointer position to a day and a minute (unsnapped). */
  const locate = (x: number, y: number) => {
    const { span, min, max, pxPerMinute } = opts.current;
    const r = box.current ?? measure();
    const top = r.top - (scrollY.current - r.scroll);
    const day = Math.min(span - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * span)));
    const minute = Math.min(max, Math.max(min, min + (y - top) / pxPerMinute));
    return { day, minute };
  };

  const compute = () => {
    const s = g.current;
    if (!s?.active) return;
    const { min, max, step, holdDuration } = opts.current;
    const { day, minute } = locate(s.x, s.y);
    let next: GridDraft;
    if (s.kind === "create") {
      const a = floorStep(s.downMinute);
      const b = snap(minute);
      // Held without moving yet (touch): a block of the default length; then it follows the finger from the anchor.
      if (s.held && Math.abs(minute - s.downMinute) < step / 2) next = { kind: "create", id: s.id, day: s.downDay, start: a, end: Math.min(max, a + holdDuration) };
      else if (b > a) next = { kind: "create", id: s.id, day: s.downDay, start: a, end: Math.max(a + step, b) };
      else next = { kind: "create", id: s.id, day: s.downDay, start: Math.max(min, Math.min(b, a)), end: a + step };
    } else {
      const it = s.item!;
      const length = it.end - it.start;
      if (s.kind === "move") {
        const start = Math.min(max - length, Math.max(min, snap(minute - s.offset)));
        next = { kind: "move", id: s.id, day, start, end: start + length };
      } else if (s.kind === "start") next = { kind: "start", id: s.id, day: it.day, start: Math.min(it.end - step, Math.max(min, snap(minute))), end: it.end };
      else next = { kind: "end", id: s.id, day: it.day, start: it.start, end: Math.max(it.start + step, Math.min(max, snap(minute))) };
    }
    const prev = s.draft;
    if (prev && prev.day === next.day && prev.start === next.start && prev.end === next.end) return;
    s.draft = next;
    opts.current.onDraft(next);
  };

  /** Near the scroller's top or bottom edge, scroll it (faster the closer) and re-read the pointer against the moved grid. */
  const autoScroll = () => {
    cancelAnimationFrame(scrollLoop.current);
    const tick = () => {
      const s = g.current;
      const sc = opts.current.scroller.current;
      if (!s?.active || !sc) return;
      const r = sc.getBoundingClientRect();
      const up = s.y < r.top + EDGE ? (r.top + EDGE - s.y) / EDGE : 0;
      const down = s.y > r.bottom - EDGE ? (s.y - (r.bottom - EDGE)) / EDGE : 0;
      const speed = (down - up) * 14;
      if (!speed) return;
      const before = sc.scrollTop;
      sc.scrollTop += speed;
      scrollY.current = sc.scrollTop;
      if (scrollY.current !== before) compute();
      scrollLoop.current = requestAnimationFrame(tick);
    };
    scrollLoop.current = requestAnimationFrame(tick);
  };

  const activate = () => {
    const s = g.current;
    if (!s || s.active) return;
    s.active = true;
    if (s.pointerType === "touch") navigator.vibrate?.(8);
    compute();
  };

  const end = (commit: boolean) => {
    const s = g.current;
    if (!s) return;
    window.clearTimeout(s.timer);
    cancelAnimationFrame(scrollLoop.current);
    g.current = null;
    box.current = null;
    try {
      opts.current.columns.current?.releasePointerCapture(s.pointerId);
    } catch {}
    if (s.active) {
      if (commit && s.draft) opts.current.onCommit(s.draft);
      opts.current.onDraft(null);
    } else if (commit) {
      opts.current.onTap(s.item ? { id: s.id } : { day: s.downDay, minute: floorStep(s.downMinute) }, s.pointerType);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (opts.current.disabled || g.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, [data-grid-ignore]")) return;
    const el = target.closest<HTMLElement>("[data-event-id]");
    const edge = target.closest<HTMLElement>("[data-edge]")?.dataset.edge as "start" | "end" | undefined;
    box.current = measure();
    const { day, minute } = locate(e.clientX, e.clientY);
    const item = el && !el.dataset.busy ? opts.current.items.find((it) => it.id === el.dataset.eventId) ?? null : null;
    g.current = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      kind: item ? (edge ?? "move") : "create",
      id: item ? item.id : `new-${Date.now().toString(36)}-${seq++}`,
      x: e.clientX,
      y: e.clientY,
      downDay: day,
      downMinute: minute,
      offset: item ? minute - item.start : 0,
      item: item && { day: item.day, start: item.start, end: item.end },
      active: false,
      held: false,
      timer: 0,
      draft: null,
    };
    if (e.pointerType === "touch") {
      // Hold to pick up; moving first is a scroll.
      g.current.timer = window.setTimeout(() => {
        if (!g.current) return;
        g.current.held = true;
        activate();
      }, HOLD);
    } else {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const s = g.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
    if (!s.active) {
      if (s.pointerType === "touch") {
        if (moved > 8) end(false);
        return;
      }
      if (moved < 4) return;
      s.x = e.clientX;
      s.y = e.clientY;
      activate();
    }
    s.x = e.clientX;
    s.y = e.clientY;
    compute();
    autoScroll();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (g.current?.pointerId === e.pointerId) end(true);
  };
  const onPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    if (g.current?.pointerId === e.pointerId) end(false);
  };

  // Once a held finger has picked something up, the page mustn't scroll under it (and no context menu).
  React.useEffect(() => {
    const el = o.columns.current;
    if (!el) return;
    const touchMove = (e: TouchEvent) => {
      if (g.current?.active && e.cancelable) e.preventDefault();
    };
    const menu = (e: Event) => {
      if (g.current) e.preventDefault();
    };
    el.addEventListener("touchmove", touchMove, { passive: false });
    el.addEventListener("contextmenu", menu);
    return () => {
      el.removeEventListener("touchmove", touchMove);
      el.removeEventListener("contextmenu", menu);
    };
  }, [o.columns]);

  React.useEffect(() => {
    const sc = o.scroller.current;
    if (!sc) return;
    const onScroll = () => {
      scrollY.current = sc.scrollTop;
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => sc.removeEventListener("scroll", onScroll);
  }, [o.scroller]);

  React.useEffect(
    () => () => {
      cancelAnimationFrame(scrollLoop.current);
      if (g.current) window.clearTimeout(g.current.timer);
    },
    [],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture: onPointerCancel };
}
