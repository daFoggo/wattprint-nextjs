"use client";

import * as React from "react";

/* ─────────────────────────────────────────────────────────
 * TREE DRAG: carry a row (and everything inside it) to a new
 * place and a new depth
 *
 *   lift      after 4px (or a hold on touch) a copy of the row
 *             follows the pointer; the row and its children dim
 *             where they are, so nothing under the pointer moves
 *   slot      up and down picks the gap between two rows; the
 *             line marking it starts at the depth it will land
 *   depth     sideways picks the depth, one level per indent,
 *             within what that gap allows
 *   into      the middle of a row that holds others means
 *             "inside it, at the end": the row takes a ring;
 *             a closed one opens itself after a moment
 *   scroll    near the edges of the scroller (or the window),
 *             they scroll
 *
 * Nothing re-renders while you carry: the copy, the line and the
 * ring are moved by transforms, and rows are measured once at
 * pickup (again only when a folder opens). Rows are found by
 * data-row-id with data-depth, data-parent, data-can-hold,
 * data-expanded and data-has-children.
 * ───────────────────────────────────────────────────────── */

/** Where a carried row would land: in `parent`, after the sibling `after` (null: first), or `into` it at the end. */
export type TreeTarget = { parent: string | null; after: string | null; into: boolean };

type RowBox = { id: string; top: number; height: number; depth: number; parent: string | null; canHold: boolean; expanded: boolean; hasChildren: boolean };

type Options = {
  list: React.RefObject<HTMLElement | null>;
  scroller: React.RefObject<HTMLElement | null>;
  preview: React.RefObject<HTMLElement | null>;
  reason: React.RefObject<HTMLElement | null>;
  line: React.RefObject<HTMLElement | null>;
  ring: React.RefObject<HTMLElement | null>;
  indent: number;
  /** Where depth 0's content starts, px from the list's left. */
  inset: number;
  /** Would this change nothing, and why does the parent refuse it (or null)? */
  check: (id: string, target: TreeTarget) => { same: boolean; refused: string | null };
  onLift: (id: string) => void;
  /** A closed row held over for a moment: open it. */
  onSpring: (id: string) => void;
  /** Dropped. `from` is where the copy was (x: how far it was carried sideways, y: its top in list coordinates). */
  onDrop: (id: string, target: TreeTarget, from: { x: number; y: number }) => void;
  /** Put back (refused, or dropped where it was). Called once the copy is home. */
  onCancel: (id: string, refused: string | null) => void;
  reduced: boolean;
  disabled?: boolean;
};

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const THROW = "cubic-bezier(0.34,1.36,0.64,1)";
const HOLD = 300;
const SPRING = 650;
const EDGE = 36;

export function useTreeDrag(o: Options) {
  const opts = React.useRef(o);
  React.useLayoutEffect(() => {
    opts.current = o;
  });
  const drag = React.useRef<{
    id: string;
    pointerId: number;
    pointerType: string;
    /** Takes the pointer once the carry starts (not before, or the row's click would go to it). */
    captor: HTMLElement;
    x0: number;
    y0: number;
    x: number;
    y: number;
    /** The list's top on screen at pickup, and the scroll positions then. */
    top0: number;
    scroll0: number;
    page0: number;
    rows: RowBox[];
    block: Set<string>;
    depth0: number;
    rowTop: number;
    active: boolean;
    timer: number;
    key: string;
    target: TreeTarget | null;
    refused: string | null;
    spring: string | null;
    springTimer: number;
    box: { top: number; bottom: number };
  } | null>(null);
  const loop = React.useRef(0);
  const scroll = React.useRef({ top: 0, page: 0 });
  const swallowClick = React.useRef(false);

  /** The pointer's y in list coordinates, from positions kept since pickup (no layout reads). */
  const listY = () => {
    const d = drag.current!;
    return d.y - d.top0 + (scroll.current.top - d.scroll0) + (scroll.current.page - d.page0);
  };

  const write = () => {
    const d = drag.current;
    const p = opts.current.preview.current;
    if (!d?.active || !p) return;
    p.style.transform = `translate3d(${d.x - d.x0}px, ${d.rowTop + listY() - (d.y0 - d.top0)}px, 0)`;
  };

  const measure = () => {
    const d = drag.current;
    const list = opts.current.list.current;
    if (!d || !list) return;
    d.rows = [...list.querySelectorAll<HTMLElement>("[data-row-id][data-depth]")].map((el) => ({
      id: el.dataset.rowId!,
      top: el.offsetTop,
      height: el.offsetHeight,
      depth: Number(el.dataset.depth),
      parent: el.dataset.parent || null,
      canHold: el.dataset.canHold === "1",
      expanded: el.dataset.expanded === "1",
      hasChildren: el.dataset.hasChildren === "1",
    }));
    // The carried row and every row under it that's deeper: they travel together and can't be dropped into.
    const i = d.rows.findIndex((r) => r.id === d.id);
    d.block = new Set();
    if (i < 0) return;
    d.rowTop = d.rows[i].top;
    d.depth0 = d.rows[i].depth;
    for (let j = i; j < d.rows.length && (j === i || d.rows[j].depth > d.depth0); j++) d.block.add(d.rows[j].id);
  };

  const show = (el: HTMLElement | null, on: boolean) => {
    if (el) el.style.opacity = on ? "1" : "0";
  };

  const arrange = () => {
    const d = drag.current!;
    const { indent, inset, line, ring, reason } = opts.current;
    const y = listY();
    const others = d.rows.filter((r) => !d.block.has(r.id));
    const own = d.rows.filter((r) => d.block.has(r.id));
    const ownTop = own[0]?.top ?? 0;
    const ownBottom = own.length ? own[own.length - 1].top + own[own.length - 1].height : 0;

    let target: TreeTarget | null = null;
    let into: RowBox | null = null;
    let lineY = 0;
    let depth = 0;
    if (!(y >= ownTop && y < ownBottom)) {
      const i = others.findIndex((r) => y < r.top + r.height);
      let slot = others.length;
      if (i >= 0) {
        const r = others[i];
        const at = (y - r.top) / r.height;
        if (y < r.top || at < (r.canHold ? 0.25 : 0.5)) slot = i;
        else if (r.canHold && at <= 0.75) into = r;
        else slot = i + 1;
      }
      if (into) target = { parent: into.id, after: null, into: true };
      else {
        const above = others[slot - 1];
        const below = others[slot];
        const max = above ? above.depth + (above.canHold ? 1 : 0) : 0;
        const min = below ? below.depth : 0;
        depth = Math.max(min, Math.min(max, d.depth0 + Math.round((d.x - d.x0) / indent)));
        if (!above) target = { parent: null, after: null, into: false };
        else if (depth > above.depth) target = { parent: above.id, after: null, into: false };
        else {
          // Climb from the row above to its ancestor at that depth: the carried row goes right after it.
          let k = others.indexOf(above);
          let x = above;
          while (x.depth > depth && k > 0) {
            const want = x.depth - 1;
            while (k > 0 && others[k].depth > want) k--;
            x = others[k];
          }
          target = { parent: x.parent, after: x.id, into: false };
        }
        lineY = above ? above.top + above.height : below ? below.top : 0;
      }
    }

    const key = target ? `${target.parent}|${target.after}|${target.into}|${depth}|${lineY}` : "none";
    if (key === d.key) return;
    d.key = key;
    const verdict = target ? opts.current.check(d.id, target) : { same: true, refused: null };
    d.target = target && !verdict.same ? target : null;
    d.refused = d.target ? verdict.refused : null;

    // The line between rows, or the ring round the row it would go inside.
    const l = line.current;
    const g = ring.current;
    const amber = "color-mix(in oklab, #f59e0b 80%, var(--foreground))";
    if (l) {
      show(l, !!d.target && !into);
      if (d.target && !into) {
        const x = inset + depth * indent;
        l.style.transform = `translate3d(${x}px, ${lineY - 1}px, 0)`;
        l.style.width = `calc(100% - ${x + 6}px)`;
        l.style.color = d.refused ? amber : "var(--ring)";
      }
    }
    if (g) {
      show(g, !!d.target && !!into);
      if (d.target && into) {
        g.style.transform = `translate3d(0, ${into.top}px, 0)`;
        g.style.height = `${into.height}px`;
        g.style.color = d.refused ? amber : "var(--ring)";
      }
    }
    const r = reason.current;
    if (r) {
      r.textContent = d.refused ?? "";
      r.hidden = !d.refused;
    }

    // Held over a closed row that has rows inside: it opens after a moment.
    const spring = d.target && into && into.hasChildren && !into.expanded && !d.refused ? into.id : null;
    if (spring !== d.spring) {
      window.clearTimeout(d.springTimer);
      d.spring = spring;
      if (spring)
        d.springTimer = window.setTimeout(() => {
          if (drag.current?.spring === spring) opts.current.onSpring(spring);
        }, SPRING);
    }
  };

  const run = () => {
    cancelAnimationFrame(loop.current);
    const tick = () => {
      const d = drag.current;
      if (!d?.active) return;
      const sc = opts.current.scroller.current;
      const inner = d.y < d.box.top + EDGE ? -(d.box.top + EDGE - d.y) / EDGE : d.y > d.box.bottom - EDGE ? (d.y - (d.box.bottom - EDGE)) / EDGE : 0;
      const page = d.y < EDGE ? -(EDGE - d.y) / EDGE : d.y > window.innerHeight - EDGE ? (d.y - (window.innerHeight - EDGE)) / EDGE : 0;
      if (inner && sc && sc.scrollHeight > sc.clientHeight) sc.scrollTop = scroll.current.top + Math.max(-1, Math.min(1, inner)) * 10;
      else if (page) window.scrollBy(0, Math.max(-1, Math.min(1, page)) * 10);
      if (inner || page) {
        write();
        arrange();
      }
      loop.current = requestAnimationFrame(tick);
    };
    loop.current = requestAnimationFrame(tick);
  };

  const activate = () => {
    const d = drag.current;
    const list = opts.current.list.current;
    if (!d || d.active || !list) return;
    d.active = true;
    if (d.pointerType === "touch") navigator.vibrate?.(8);
    else
      try {
        d.captor.setPointerCapture(d.pointerId);
      } catch {}
    const sc = opts.current.scroller.current;
    const box = (sc && sc.scrollHeight > sc.clientHeight ? sc : list).getBoundingClientRect();
    d.box = { top: Math.max(0, box.top), bottom: Math.min(window.innerHeight, box.bottom) };
    d.top0 = list.getBoundingClientRect().top;
    measure();
    opts.current.onLift(d.id);
    run();
  };

  const finish = () => {
    const d = drag.current;
    window.clearTimeout(d?.timer);
    window.clearTimeout(d?.springTimer);
    cancelAnimationFrame(loop.current);
    show(opts.current.line.current, false);
    show(opts.current.ring.current, false);
  };

  const end = (dropped: boolean) => {
    const d = drag.current;
    if (!d) return;
    finish();
    if (!d.active) {
      drag.current = null;
      return;
    }
    swallowClick.current = true;
    window.setTimeout(() => (swallowClick.current = false), 0);
    if (dropped && d.target && !d.refused) {
      const from = { x: d.x - d.x0, y: d.rowTop + listY() - (d.y0 - d.top0) };
      drag.current = null;
      opts.current.onDrop(d.id, d.target, from);
      return;
    }
    // Back home: the copy glides to the row it came from, then the row takes over.
    const refused = dropped ? d.refused : null;
    const p = opts.current.preview.current;
    drag.current = null;
    if (p && !opts.current.reduced) {
      const a = p.animate([{ transform: p.style.transform }, { transform: `translate3d(0px, ${d.rowTop}px, 0)` }], { duration: 300, easing: THROW, fill: "forwards" });
      a.onfinish = a.oncancel = () => opts.current.onCancel(d.id, refused);
    } else opts.current.onCancel(d.id, refused);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (opts.current.disabled || drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    const t = e.target as HTMLElement;
    if (t.closest("button, input, a, textarea, [data-no-drag]")) return;
    const row = t.closest<HTMLElement>("[data-row-id][data-depth]");
    if (!row) return;
    scroll.current = { top: opts.current.scroller.current?.scrollTop ?? 0, page: window.scrollY };
    drag.current = {
      id: row.dataset.rowId!,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      captor: e.currentTarget,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      top0: 0,
      scroll0: scroll.current.top,
      page0: scroll.current.page,
      rows: [],
      block: new Set(),
      depth0: 0,
      rowTop: 0,
      active: false,
      timer: 0,
      key: "",
      target: null,
      refused: null,
      spring: null,
      springTimer: 0,
      box: { top: 0, bottom: 0 },
    };
    if (e.pointerType === "touch") drag.current.timer = window.setTimeout(activate, HOLD);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.active) {
      const moved = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (d.pointerType === "touch") {
        if (moved > 8) end(false);
        return;
      }
      if (moved < 4) return;
      activate();
    }
    d.x = e.clientX;
    d.y = e.clientY;
    write();
    arrange();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId === e.pointerId) end(true);
  };
  const onPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId === e.pointerId) end(false);
  };

  // While a row is held on touch the page mustn't scroll under it; scroll positions are kept from events.
  React.useEffect(() => {
    const list = o.list.current;
    const sc = o.scroller.current;
    if (!list) return;
    const touchMove = (e: TouchEvent) => {
      if (drag.current?.active && e.cancelable) e.preventDefault();
    };
    const menu = (e: Event) => {
      if (drag.current) e.preventDefault();
    };
    const onScroll = () => {
      scroll.current.top = sc?.scrollTop ?? 0;
    };
    const onPage = () => {
      scroll.current.page = window.scrollY;
    };
    list.addEventListener("touchmove", touchMove, { passive: false });
    list.addEventListener("contextmenu", menu);
    sc?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onPage, { passive: true });
    return () => {
      list.removeEventListener("touchmove", touchMove);
      list.removeEventListener("contextmenu", menu);
      sc?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onPage);
    };
  }, [o.list, o.scroller]);

  React.useEffect(
    () => () => {
      cancelAnimationFrame(loop.current);
      window.clearTimeout(drag.current?.timer);
      window.clearTimeout(drag.current?.springTimer);
    },
    [],
  );

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    /** After a row opened mid-carry: measure the rows again and find the slot under the pointer. */
    remeasure: () => {
      const d = drag.current;
      if (!d?.active) return;
      measure();
      d.key = "";
      arrange();
    },
    /** Puts the copy under the pointer (once it has rendered). */
    sync: write,
    /** A carry just ended: the click that follows it isn't a click. */
    swallowClick: () => swallowClick.current,
    ease: EASE,
  };
}
