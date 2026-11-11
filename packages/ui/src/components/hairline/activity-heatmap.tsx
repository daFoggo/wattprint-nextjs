"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * ACTIVITY HEATMAP: every day as a square, weeks across
 *
 *   arrive    the first time it's on screen the days fill in
 *             as a wave from the oldest week to the newest, and
 *             the total rolls up from zero
 *   point     point at a day (or move to it with the arrow keys)
 *             and one readout glides along the rail above the
 *             grid to its week: the count rolls, the date morphs.
 *             At rest the readout sits on the busiest day
 *   level     point at a step of the legend and every day
 *             outside that band steps back
 *   data      new numbers or a new colour ripple across the grid
 *             week by week instead of switching at once
 *   fit       it shows as many of the weeks as fit at a readable
 *             size, newest on the right
 *
 * The grid is a real ARIA grid: one tab stop, arrow keys, Home
 * and End, and each day's count and date as its label.
 * ───────────────────────────────────────────────────────── */

export interface HeatmapDay {
  /** "YYYY-MM-DD". Days missing from the data count as zero. */
  date: string;
  value: number;
}

export interface ActivityHeatmapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  data: HeatmapDay[];
  /** The last day shown, "YYYY-MM-DD"; defaults to the latest day in the data. */
  end?: string;
  /** The most weeks to show; fewer when the card is narrow. */
  weeks?: number;
  /** The first row: 0 for Sunday, 1 for Monday. */
  weekStart?: 0 | 1;
  /** What's being counted, e.g. { one: "order", other: "orders" }. */
  unit?: { one: string; other: string };
  /** The colour of the busiest days; the other steps are mixed from it. */
  color?: string;
  /** Lower bounds of levels 1 to 4. By default they come from the data's own quartiles. */
  thresholds?: [number, number, number, number];
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  locales?: string | string[];
  onDayClick?: (day: HeatmapDay) => void;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const DAY = 86_400_000;
const GAP = 3;
const MIN_CELL = 10;
const MAX_CELL = 16;
const LABELS = 30;
const UNIT = { one: "contribution", other: "contributions" };
const MIX = [0, 28, 52, 76, 100];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);
const subscribeNothing = () => () => {};
/** Dates in the visitor's language wait for hydration, so the server's en-US render and the first client render match. */
const useHydrated = () => React.useSyncExternalStore(subscribeNothing, () => true, () => false);

const parse = (date: string) => Date.parse(`${date}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The quartiles of the days that have anything, as the lower bounds of levels 2 to 4 (level 1 is anything above zero). */
function quartiles(values: number[]): [number, number, number, number] {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!sorted.length) return [1, 2, 3, 4];
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return [Number.MIN_VALUE, at(0.25), at(0.5), at(0.75)];
}

const levelOf = (v: number, t: [number, number, number, number]) => (v <= 0 ? 0 : v >= t[3] ? 4 : v >= t[2] ? 3 : v >= t[1] ? 2 : v >= t[0] ? 1 : 0);

export function ActivityHeatmap({
  data,
  end,
  weeks = 26,
  weekStart = 0,
  unit = UNIT,
  color = "var(--chart-3, #1baf7a)",
  thresholds,
  title,
  description,
  action,
  locales,
  onDayClick,
  className = "",
  ...props
}: ActivityHeatmapProps) {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const lang = hydrated ? locales : (locales ?? "en-US");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const pillRef = React.useRef<HTMLDivElement>(null);
  const cellRefs = React.useRef(new Map<string, HTMLElement>());
  const [width, setWidth] = React.useState(0);
  const [pillWidth, setPillWidth] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const [pointed, setPointed] = React.useState<string | null>(null);
  const [focused, setFocused] = React.useState<string | null>(null);
  const [band, setBand] = React.useState<number | null>(null);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Measured before the first paint, so the grid never shows at the wrong size.
  React.useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      setWidth((prev) => (prev === w ? prev : w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const w = el.offsetWidth;
      setPillWidth((prev) => (prev === w ? prev : w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The weeks that fit: at least MIN_CELL a day, never more than asked for.
  const room = Math.max(0, width - LABELS);
  const shown = width ? Math.max(4, Math.min(weeks, Math.floor((room + GAP) / (MIN_CELL + GAP)))) : weeks;
  const cell = width ? Math.min(MAX_CELL, (room + GAP) / shown - GAP) : MAX_CELL;
  const gridWidth = shown * (cell + GAP) - GAP;

  const values = new Map<string, number>();
  for (const d of data) values.set(d.date, (values.get(d.date) ?? 0) + d.value);
  const lastDate = end ?? data.reduce((latest, d) => (d.date > latest ? d.date : latest), data[0]?.date ?? "");
  const last = lastDate ? parse(lastDate) : 0;
  const lastRow = last ? (new Date(last).getUTCDay() - weekStart + 7) % 7 : 0;
  const first = last - ((shown - 1) * 7 + lastRow) * DAY;

  // Columns are weeks, rows are weekdays; days after the last one are left out.
  const grid = Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: shown }, (_, col) => {
      const t = first + (col * 7 + row) * DAY;
      const date = iso(t);
      return { date, t, row, col, value: values.get(date) ?? 0, future: t > last };
    }),
  );
  // In date order (the grid itself runs row by row).
  const days = grid
    .flat()
    .filter((d) => !d.future && last)
    .sort((a, b) => a.t - b.t);
  const levels = thresholds ?? quartiles(days.map((d) => d.value));
  const total = days.reduce((sum, d) => sum + d.value, 0);
  const peak = days.reduce<(typeof days)[number] | null>((best, d) => (!best || d.value > best.value ? d : best), null);

  const current = days.find((d) => d.date === (pointed ?? focused)) ?? (peak && peak.value > 0 ? peak : null);
  const named = (n: number) => (n === 1 ? unit.one : unit.other);
  const dayLabel = (t: number, long = false) =>
    new Intl.DateTimeFormat(lang, { timeZone: "UTC", weekday: long ? "long" : "short", day: "numeric", month: long ? "long" : "short" }).format(t);
  const month = (t: number) => new Intl.DateTimeFormat(lang, { timeZone: "UTC", month: "short" }).format(t);
  const weekday = (row: number) => new Intl.DateTimeFormat(lang, { timeZone: "UTC", weekday: "short" }).format(Date.UTC(2026, 0, 4 + ((row + weekStart) % 7)));

  // A month's name over the first week that starts in it, if there's room before the next.
  const months: { col: number; label: string }[] = [];
  for (let col = 0; col < shown; col++) {
    const t = grid[0][col].t;
    const prev = col > 0 ? grid[0][col - 1].t : null;
    if (prev === null ? new Date(t).getUTCDate() <= 7 : new Date(t).getUTCMonth() !== new Date(prev).getUTCMonth()) {
      if (!months.length || col - months[months.length - 1].col >= 3) months.push({ col, label: month(t) });
    }
  }

  const x = current ? LABELS + current.col * (cell + GAP) + cell / 2 : LABELS;
  const half = pillWidth / 2;
  const pillX = Math.min(Math.max(x, half), Math.max(half, LABELS + gridWidth - half));

  const fill = (level: number) =>
    level === 0 ? "color-mix(in oklab, var(--foreground) 7%, transparent)" : `color-mix(in oklab, ${color} ${MIX[level]}%, var(--background))`;

  const move = (date: string) => {
    setFocused(date);
    cellRefs.current.get(date)?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = days.find((d) => d.date === focused) ?? peak ?? days[days.length - 1];
    if (!at) return;
    const steps: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    let next: number | null = null;
    if (e.key in steps) next = at.t + steps[e.key] * DAY;
    else if (e.key === "Home") next = days[0]?.t ?? null;
    else if (e.key === "End") next = days[days.length - 1]?.t ?? null;
    else if ((e.key === "Enter" || e.key === " ") && onDayClick) {
      e.preventDefault();
      onDayClick({ date: at.date, value: at.value });
      return;
    }
    if (next === null) return;
    e.preventDefault();
    if (next >= (days[0]?.t ?? 0) && next <= last) move(iso(next));
  };

  const wave = (col: number) => (reduced ? "none" : `background-color 520ms ${EASE} ${col * 16}ms, opacity 200ms ${EASE}, box-shadow 160ms ${EASE}`);
  const tabStop = focused ?? current?.date ?? days[days.length - 1]?.date;

  return (
    <div ref={rootRef} className={`w-full rounded-[22px] bg-background shadow-[0_0_0_1px_var(--border)] ${className}`} {...props}>
      {/* Its natural width where the parent sizes to its content (a centred flex column), without forcing it on narrow screens. */}
      <div aria-hidden="true" data-natural-width className="grid h-0" style={{ gridTemplateColumns: "minmax(0, 640px)" }} />
      <div className="@container w-full">
      <div className="p-4 @md:p-5">
        {(title || description || action) && (
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <p className="text-[13.5px] font-medium text-foreground @md:text-[14px]">{title}</p>}
              {description && <p className="mt-0.5 text-[12px] text-muted-foreground @md:text-[12.5px]">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}

        <p className="flex flex-wrap items-baseline gap-x-1.5 text-[12px] text-muted-foreground @md:text-[12.5px]">
          <span className="text-[22px] font-semibold tracking-[-0.03em] text-foreground tabular-nums @md:text-[26px]">
            <NumberRoll value={visible ? total : 0} locales={locales} duration={1000} />
          </span>
          <span>
            {named(total)} in the last {shown} weeks
          </span>
        </p>

        <div ref={bodyRef} className="relative mt-3 w-full" onPointerLeave={() => setPointed(null)}>
          {/* The readout: one pill that glides to the day being pointed at, or rests on the busiest one. */}
          <div className="relative h-7">
            <div
              ref={pillRef}
              aria-hidden="true"
              className="absolute left-0 top-0 flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-foreground px-2.5 text-[11.5px] text-background"
              style={{
                transform: `translateX(${pillX - half}px)`,
                opacity: current && width ? 1 : 0,
                transition: reduced ? "none" : `transform 300ms ${EASE}, opacity 200ms ${EASE}`,
              }}
            >
              <span className="font-medium tabular-nums">
                <NumberRoll value={current?.value ?? 0} locales={locales} duration={600} />
              </span>
              <span className="opacity-70">
                <TextMorph duration={360}>{`${named(current?.value ?? 0)} · ${current ? dayLabel(current.t) : ""}`}</TextMorph>
              </span>
            </div>
          </div>

          {/* Month names over the weeks they start in. */}
          <div aria-hidden="true" className="relative h-4 text-[10.5px] text-muted-foreground @md:text-[11px]" style={{ marginLeft: LABELS }}>
            {months.map((m) => (
              <span key={m.col} className="absolute top-0" style={{ left: m.col * (cell + GAP) }}>
                {m.label}
              </span>
            ))}
          </div>

          <div className="mt-1 flex">
            <div aria-hidden="true" className="grid shrink-0 text-[10.5px] text-muted-foreground @md:text-[11px]" style={{ width: LABELS, gridTemplateRows: `repeat(7, ${cell}px)`, rowGap: GAP }}>
              {Array.from({ length: 7 }, (_, row) => (
                <span key={row} className="leading-none" style={{ lineHeight: `${cell}px` }}>
                  {(weekStart === 0 ? row % 2 === 1 : row % 2 === 0 && row < 6) ? weekday(row) : ""}
                </span>
              ))}
            </div>

            <div
              role="grid"
              aria-label={`${total} ${named(total)} in the last ${shown} weeks`}
              aria-readonly="true"
              onKeyDown={onKeyDown}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(null);
              }}
              className="grid"
              style={{ width: gridWidth, gridTemplateColumns: `repeat(${shown}, ${cell}px)`, gridTemplateRows: `repeat(7, ${cell}px)`, gap: GAP }}
            >
              {grid.map((row, r) => (
                <div key={r} role="row" className="contents">
                  {row.map((d) => {
                    const level = levelOf(d.value, levels);
                    const on = (pointed ?? focused) === d.date;
                    const out = band !== null && level !== band;
                    return (
                      <span
                        key={d.date}
                        ref={(el) => {
                          if (el) cellRefs.current.set(d.date, el);
                          else cellRefs.current.delete(d.date);
                        }}
                        role="gridcell"
                        aria-label={d.future ? undefined : `${d.value} ${named(d.value)}, ${dayLabel(d.t, true)}`}
                        aria-hidden={d.future || undefined}
                        tabIndex={!d.future && d.date === tabStop ? 0 : -1}
                        onPointerEnter={(e) => e.pointerType === "mouse" && !d.future && setPointed(d.date)}
                        onPointerDown={(e) => e.pointerType !== "mouse" && !d.future && setPointed(d.date)}
                        onFocus={() => setFocused(d.date)}
                        onClick={() => !d.future && onDayClick?.({ date: d.date, value: d.value })}
                        className={`rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${onDayClick && !d.future ? "cursor-pointer" : ""}`}
                        style={{
                          gridColumn: d.col + 1,
                          gridRow: r + 1,
                          visibility: d.future ? "hidden" : undefined,
                          background: fill(visible ? level : 0),
                          opacity: out ? 0.22 : 1,
                          boxShadow: on ? "inset 0 0 0 1.5px var(--foreground)" : undefined,
                          transition: wave(d.col),
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The scale: point at a step to see only the days in it. */}
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground" onPointerLeave={() => setBand(null)}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              aria-hidden="true"
              onPointerEnter={() => setBand(level)}
              className="size-[11px] cursor-default rounded-[3px] transition-[box-shadow] duration-150"
              style={{ background: fill(level), boxShadow: band === level ? "0 0 0 1.5px var(--foreground)" : undefined, transition: reduced ? "none" : `background-color 520ms ${EASE}` }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
      </div>
    </div>
  );
}
