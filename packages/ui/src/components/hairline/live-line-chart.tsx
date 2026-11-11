"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * LIVE LINE CHART: one metric as it happens
 *
 *   stream    each new point slides in from the right over the
 *             time it took to arrive, so the line moves at an
 *             even pace instead of jumping a step at a time; the
 *             end dot rides the line and pings
 *   scale     when the range changes the line rescales smoothly
 *             under fixed gridlines and the axis figures roll
 *   point     point at the line and the header becomes the
 *             readout: the figure rolls to that moment and
 *             "now" morphs to how long ago it was
 *   pause     the Live pill holds the view still while data
 *             keeps coming; press again to catch up
 *   waiting   when points stop coming the pill says so and its
 *             pulse stops
 *   limit     an optional threshold is drawn as a dashed line
 *             with its label riding the scale
 *
 * The line is drawn in value space inside one scaled group, so
 * a new range is a single transform transition; the slide is a
 * second transform on the group around it. No chart library,
 * no frame loop.
 * ───────────────────────────────────────────────────────── */

export interface LivePoint {
  /** When, in ms (e.g. Date.now() when it was measured). */
  t: number;
  value: number;
}

export interface LiveLineChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Points oldest first; keep appending. Anything older than the window is left out. */
  data: LivePoint[];
  /** How much time the chart shows, in ms. */
  window?: number;
  /** Over the figure, e.g. "Requests". */
  label?: React.ReactNode;
  /** After the figure, e.g. "req/s". */
  unit?: string;
  format?: Intl.NumberFormatOptions;
  locales?: string | string[];
  /** A limit drawn as a dashed line, e.g. { value: 1200, label: "Rate limit" }. */
  threshold?: { value: number; label?: string };
  color?: string;
  /** Plot height in px. */
  height?: number;
  defaultPaused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  /** Ms without a new point before the pill says Waiting; defaults to three times the last gap. */
  staleAfter?: number;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const AXIS = 44;
const COMPACT: Intl.NumberFormatOptions = { notation: "compact", maximumFractionDigits: 1 };

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

/** A round step near x: 1, 2, 2.5 or 5 times a power of ten. */
function nice(x: number) {
  if (x <= 0 || !Number.isFinite(x)) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  const f = x / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/** Three round gridlines that hold every value in view, with room above and below. */
function scaleFor(values: number[], extra?: number) {
  const all = extra === undefined ? values : [...values, extra];
  if (!all.length) return { lo: 0, hi: 1 };
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.1 || 1;
  const step = nice((hi - lo + pad * 2) / 2);
  lo = Math.floor((lo - pad) / step) * step;
  hi = Math.ceil((hi + pad) / step) * step;
  if (Math.min(...all) >= 0) lo = Math.max(0, lo);
  return { lo, hi: hi > lo ? hi : lo + step };
}

export function LiveLineChart({
  data,
  window: span = 60_000,
  label,
  unit,
  format = { maximumFractionDigits: 0 },
  locales,
  threshold,
  color = "var(--chart-1, var(--primary))",
  height = 140,
  defaultPaused = false,
  onPausedChange,
  staleAfter,
  className = "",
  ...props
}: LiveLineChartProps) {
  const reduced = useReducedMotion();
  const gradient = React.useId().replace(/:/g, "");
  const plotRef = React.useRef<HTMLDivElement>(null);
  const slideRef = React.useRef<SVGGElement>(null);
  const previous = React.useRef<number | null>(null);
  const plotLeft = React.useRef(0);
  const [width, setWidth] = React.useState(0);
  const [frozen, setFrozen] = React.useState<LivePoint[] | null>(defaultPaused ? data : null);
  const [staleFor, setStaleFor] = React.useState<number | null>(null);
  const [hover, setHover] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      setWidth((prev) => (prev === w ? prev : w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paused = frozen !== null;
  const view = frozen ?? data;
  const latest = view[view.length - 1];
  const before = view[view.length - 2];
  const gap = latest && before ? latest.t - before.t : 1000;
  const plotW = Math.max(0, width - AXIS);
  const k = plotW / span;

  // The points in view, plus the one before the window so the line reaches the left edge.
  const firstIn = latest ? view.findIndex((p) => p.t >= latest.t - span) : 0;
  const shown = latest ? view.slice(Math.max(0, firstIn - 1)) : [];
  const { lo, hi } = scaleFor(
    shown.map((p) => p.value),
    threshold?.value,
  );
  const range = hi - lo;
  const yOf = (v: number) => height - ((v - lo) / range) * height;
  const xOf = (t: number) => (latest ? plotW - (latest.t - t) * k : 0);

  const line = shown.map((p, i) => `${i ? "L" : "M"}${xOf(p.t).toFixed(1)} ${p.value}`).join("");
  const area = shown.length ? `${line}L${xOf(shown[shown.length - 1].t).toFixed(1)} ${lo}L${xOf(shown[0].t).toFixed(1)} ${lo}Z` : "";

  // A new point: start the line one step to the right and slide it into place over the gap it took to arrive.
  React.useLayoutEffect(() => {
    const g = slideRef.current;
    const t = latest?.t ?? null;
    const last = previous.current;
    previous.current = t;
    if (!g || t === null || last === null || t <= last || reduced || !k) return;
    const dt = Math.min(t - last, 4000);
    g.style.transition = "none";
    g.style.transform = `translateX(${(dt * k).toFixed(2)}px)`;
    g.getBoundingClientRect();
    g.style.transition = `transform ${dt}ms linear`;
    g.style.transform = "translateX(0px)";
  }, [latest?.t, reduced, k]);

  // No new point for a while: say so.
  const waitFor = staleAfter ?? Math.max(2000, gap * 3);
  React.useEffect(() => {
    if (!latest || paused) return;
    const at = latest.t;
    const timer = window.setTimeout(() => setStaleFor(at), waitFor);
    return () => window.clearTimeout(timer);
  }, [latest, paused, waitFor]);
  const stale = !paused && latest !== undefined && staleFor === latest.t;

  const togglePause = () => {
    const next = !paused;
    setFrozen(next ? data : null);
    onPausedChange?.(next);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!latest) return;
    // Measured once per visit, not on every move.
    if (!plotLeft.current) plotLeft.current = e.currentTarget.getBoundingClientRect().left;
    const x = e.clientX - plotLeft.current - AXIS;
    const t = latest.t - (plotW - x) / (k || 1);
    let best = -1;
    let bestD = Infinity;
    shown.forEach((p, i) => {
      const d = Math.abs(p.t - t);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const pick = best >= 0 ? shown[best].t : null;
    setHover((prev) => (prev === pick ? prev : pick));
  };

  const pointed = hover !== null ? shown.find((p) => p.t === hover) ?? null : null;
  const start = shown.find((p) => p.t >= (latest?.t ?? 0) - span) ?? shown[0];
  const change = latest && start && start.value ? (latest.value - start.value) / Math.abs(start.value) : 0;
  const up = change >= 0;
  const ago = pointed && latest ? Math.round((latest.t - pointed.t) / 1000) : 0;
  const caption = pointed ? (ago === 0 ? "now" : `${ago}s ago`) : "now";
  const status = paused ? "Paused" : stale ? "Waiting" : "Live";
  const live = status === "Live";
  const scaleMove = reduced ? "none" : `transform 600ms ${EASE}`;

  return (
    <div className={`w-full rounded-[22px] bg-background shadow-[0_0_0_1px_var(--border)] ${className}`} {...props}>
      {/* Its natural width where the parent sizes to its content (a centred flex column), without forcing it on narrow screens. */}
      <div aria-hidden="true" data-natural-width className="grid h-0" style={{ gridTemplateColumns: "minmax(0, 520px)" }} />
      <div className="@container w-full">
      <div className="p-4 @md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {label && <p className="text-[12px] text-muted-foreground @md:text-[13px]">{label}</p>}
            <p className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-foreground tabular-nums @md:text-[32px]">
                <NumberRoll value={pointed ? pointed.value : (latest?.value ?? 0)} format={format} locales={locales} duration={500} />
              </span>
              {unit && <span className="text-[12px] text-muted-foreground @md:text-[13px]">{unit}</span>}
              <span className="ml-1 text-[11.5px] text-muted-foreground @md:text-[12px]">
                <TextMorph duration={320}>{caption}</TextMorph>
              </span>
            </p>
            <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-muted-foreground @md:text-[12px]">
              <span className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                <svg aria-hidden="true" viewBox="0 0 10 10" className="size-2.5" style={{ transform: up ? "none" : "rotate(180deg)", transition: reduced ? "none" : `transform 400ms ${EASE}` }}>
                  <path d="M5 1.5 9 8.5H1z" fill="currentColor" />
                </svg>
                <NumberRoll value={Math.abs(change)} format={{ style: "percent", maximumFractionDigits: 1 }} duration={600} />
              </span>
              <span>over the last {Math.round(span / 1000)}s</span>
            </p>
          </div>

          <button
            type="button"
            aria-pressed={paused}
            aria-label={paused ? "Resume live updates" : "Pause live updates"}
            onClick={togglePause}
            className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-accent ${FOCUS}`}
          >
            <span aria-hidden="true" className="relative flex size-2 items-center justify-center">
              {live && !reduced && <span className="absolute inset-0 animate-[ui-ping_1.6s_ease-out_infinite] rounded-full bg-emerald-500" />}
              <span className={`relative size-2 rounded-full transition-colors duration-300 ${live ? "bg-emerald-500" : stale ? "bg-amber-500" : "bg-muted-foreground"}`} />
            </span>
            <TextMorph duration={360}>{status}</TextMorph>
          </button>
        </div>

        <div
          ref={plotRef}
          className="relative mt-4 w-full touch-pan-y"
          style={{ height: height + 22 }}
          onPointerMove={onMove}
          onPointerLeave={() => {
            plotLeft.current = 0;
            setHover(null);
          }}
        >
          {/* Axis figures: fixed places, rolling values. */}
          {[hi, (hi + lo) / 2, lo].map((v, i) => (
            <span key={i} aria-hidden="true" className="absolute left-0 -translate-y-1/2 text-[10.5px] text-muted-foreground tabular-nums @md:text-[11px]" style={{ top: (height / 2) * i }}>
              <NumberRoll value={v} format={COMPACT} locales={locales} duration={600} />
            </span>
          ))}

          <svg aria-hidden="true" width={plotW} height={height} className="absolute top-0 overflow-hidden" style={{ left: AXIS }}>
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                {/* The area is drawn in value space, flipped: offset 0 is the bottom of the plot. */}
                <stop offset="0%" stopColor={color} stopOpacity="0" />
                <stop offset="100%" stopColor={color} stopOpacity="0.24" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1={0} x2={plotW} y1={f * height} y2={f * height} stroke="var(--border)" strokeWidth={1} shapeRendering="crispEdges" />
            ))}
            <g ref={slideRef}>
              {/* Drawn in value space; the range is one transform, so a new range eases instead of jumping. */}
              <g style={{ transform: `translateY(${height}px) scaleY(${-height / range}) translateY(${-lo}px)`, transformOrigin: "0 0", transition: scaleMove }}>
                <path d={area} fill={`url(#${gradient})`} />
                {threshold && (
                  <line x1={-plotW} x2={plotW * 2} y1={threshold.value} y2={threshold.value} className="stroke-amber-500 dark:stroke-amber-400" strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
                )}
                <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
              {pointed && (
                <g>
                  <line x1={xOf(pointed.t)} x2={xOf(pointed.t)} y1={0} y2={height} stroke="var(--foreground)" strokeOpacity={0.25} strokeWidth={1} />
                  <circle cx={xOf(pointed.t)} cy={yOf(pointed.value)} r={4} fill="var(--background)" stroke={color} strokeWidth={2} />
                </g>
              )}
            </g>
          </svg>

          {/* The newest point: a dot that rides the line's right end, pinging while live. */}
          {latest && plotW > 0 && (
            <span
              aria-hidden="true"
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: AXIS + plotW,
                top: yOf(latest.value),
                background: color,
                boxShadow: "0 0 0 2px var(--background)",
                transition: reduced ? "none" : `top ${Math.min(gap, 4000)}ms linear`,
              }}
            >
              {live && !reduced && <span className="absolute inset-0 animate-[ui-ping_1.6s_ease-out_infinite] rounded-full" style={{ background: color }} />}
            </span>
          )}

          {threshold && (
            <span
              aria-hidden="true"
              className="absolute right-0 -translate-y-full pb-0.5 text-[10.5px] font-medium text-amber-600 tabular-nums dark:text-amber-400"
              style={{ top: yOf(threshold.value), transition: reduced ? "none" : `top 600ms ${EASE}` }}
            >
              {threshold.label ?? "Limit"}
            </span>
          )}

          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 flex justify-between text-[10.5px] text-muted-foreground @md:text-[11px]" style={{ paddingLeft: AXIS }}>
            <span>−{Math.round(span / 1000)}s</span>
            <span>−{Math.round(span / 2000)}s</span>
            <span>now</span>
          </div>
        </div>

        <p className="sr-only" aria-live="off">
          {latest ? `Latest ${new Intl.NumberFormat(locales ?? "en-US", format).format(latest.value)}${unit ? ` ${unit}` : ""}, ${up ? "up" : "down"} ${Math.round(Math.abs(change) * 1000) / 10}% over the last ${Math.round(span / 1000)} seconds.` : "No data yet."}
        </p>
      </div>
      </div>
    </div>
  );
}
