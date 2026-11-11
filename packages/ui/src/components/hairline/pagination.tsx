"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { EASE_OUT, EASE_THROW, INTERACTION_FOCUS, INTERACTION_PRESS, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * PAGINATION: pages of a long list
 *
 *   move     the current-page mark is thrown to the new number
 *            (slight overshoot) instead of each number repainting
 *   window   first, last and the pages round the current one, with
 *            "…" between; the window keeps its width as you move
 *   narrow   in a small container it becomes ‹ "3 of 12" › and the
 *            numbers roll the way you moved
 * ───────────────────────────────────────────────────────── */

export interface PaginationProps {
  page?: number;
  defaultPage?: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  /** Pages either side of the current one. */
  siblings?: number;
  /** Build hrefs so pages are real links (good for search engines). */
  hrefFor?: (page: number) => string;
  className?: string;
}

type Slot = number | "gap-start" | "gap-end";

function windowFor(page: number, count: number, siblings: number): Slot[] {
  const total = siblings * 2 + 5;
  if (count <= total) return Array.from({ length: count }, (_, i) => i + 1);
  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, count - 1);
  const showLeftGap = left > 3;
  const showRightGap = right < count - 2;
  if (!showLeftGap) return [...Array.from({ length: 3 + siblings * 2 }, (_, i) => i + 1), "gap-end", count];
  if (!showRightGap) return [1, "gap-start", ...Array.from({ length: 3 + siblings * 2 }, (_, i) => count - (2 + siblings * 2) + i)];
  return [1, "gap-start", ...Array.from({ length: right - left + 1 }, (_, i) => left + i), "gap-end", count];
}

function Arrow({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
      <path d={back ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pagination({ page: controlled, defaultPage = 1, pageCount, onPageChange, siblings = 1, hrefFor, className = "" }: PaginationProps) {
  const reduced = useInteractionReducedMotion();
  const listRef = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState(defaultPage);
  const page = Math.min(Math.max(1, controlled ?? own), Math.max(1, pageCount));
  const [mark, setMark] = React.useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = React.useState(false);
  const slots = windowFor(page, pageCount, siblings);

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), pageCount);
    if (next === page) return;
    if (controlled === undefined) setOwn(next);
    onPageChange?.(next);
  };

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>('[aria-current="page"]');
      if (!el || !el.offsetWidth) return setMark(null);
      const next = { x: el.offsetLeft, w: el.offsetWidth };
      setMark((p) => (p && p.x === next.x && p.w === next.w ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [page, pageCount]);

  React.useEffect(() => {
    if (!mark || ready) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [mark, ready]);

  const btn = `inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] tabular-nums cursor-pointer disabled:cursor-default disabled:opacity-35 ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`;
  const linkProps = (p: number) =>
    hrefFor
      ? {
          href: hrefFor(p),
          onClick: (e: React.MouseEvent) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            go(p);
          },
        }
      : { onClick: () => go(p), type: "button" as const };
  const Tag = (hrefFor ? "a" : "button") as "button";

  return (
    <nav aria-label="Pagination" className={`@container w-full ${className}`}>
      <div className="flex items-center justify-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)} className={`${btn} text-muted-foreground hover:bg-accent hover:text-foreground`}>
          <Arrow back />
        </button>

        {/* Wide: the numbers, with one mark that moves. */}
        <div ref={listRef} className="relative hidden items-center gap-1 @[22rem]:flex">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-8 rounded-full bg-foreground"
            style={{
              transform: `translateX(${mark?.x ?? 0}px)`,
              width: mark?.w ?? 0,
              opacity: mark ? 1 : 0,
              transition: reduced || !ready ? "none" : `transform 420ms ${EASE_THROW}, width 300ms ${EASE_OUT}`,
            }}
          />
          {slots.map((slot) =>
            typeof slot === "number" ? (
              <Tag
                key={slot}
                {...linkProps(slot)}
                aria-label={`Page ${slot}`}
                aria-current={slot === page ? "page" : undefined}
                className={`${btn} relative z-10 min-w-8 px-1 transition-colors duration-300 ${slot === page ? "text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                {slot}
              </Tag>
            ) : (
              <span key={slot} aria-hidden="true" className="inline-flex size-8 items-center justify-center text-[13px] text-muted-foreground">
                …
              </span>
            ),
          )}
        </div>

        {/* Narrow: "3 of 12", rolling. */}
        <span className="inline-flex items-center gap-1 px-2 text-[13px] tabular-nums text-muted-foreground @[22rem]:hidden">
          <span className="font-medium text-foreground">
            <NumberRoll value={page} />
          </span>
          of {pageCount}
        </span>

        <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => go(page + 1)} className={`${btn} text-muted-foreground hover:bg-accent hover:text-foreground`}>
          <Arrow />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
