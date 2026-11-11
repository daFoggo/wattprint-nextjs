"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { TextMorph } from "./text-morph";
import { TimeBrush, type TimeBrushProps } from "./time-brush";
import {
  DAY,
  HOUR,
  MINUTE,
  durationShort,
  formatTimeRange,
  isLive,
  parseTimeRange,
  resolveTimeRange,
  sameRange,
  stepTimeRange,
  type TimeRange,
} from "./time-range-parse";

/* ─────────────────────────────────────────────────────────
 * TIME RANGE PICKER: "Last 15 minutes ▾" for logs and metrics
 *
 *   plate    one hairline plate: ‹ earlier, the range, › later,
 *            and Live. The range's words morph as it changes
 *   step     ‹ and › move the window by its own length; stepping
 *            back from "Last 1 hour" fixes it to the hour before,
 *            and stepping forward into now makes it live again
 *   live     the dot breathes while the range follows now;
 *            Paused freezes it where it is
 *   open     the panel unfolds from the plate's edge with the
 *            field focused: type 45m, yesterday, since 9 or
 *            14:00–16:00 and the line under it says what it
 *            means before you press Enter
 *   quick    a highlight glides over the quick ranges; the
 *            current one carries a drawn check; ranges you typed
 *            come back as Recent
 *
 * Pair it with Time brush, which turns a drag across any chart
 * into a range.
 * ───────────────────────────────────────────────────────── */

export type { TimeRange };
export { TimeBrush, type TimeBrushProps };
export { formatTimeRange, parseTimeRange, resolveTimeRange, stepTimeRange };

export interface TimeRangePreset {
  label: string;
  /** A range, or one worked out from now (Today, Yesterday). */
  range: TimeRange | ((now: Date, timeZone?: string) => TimeRange);
}

export interface TimeRangePickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: TimeRange;
  defaultValue?: TimeRange;
  /** The range, and the start and end it covers right now. */
  onValueChange?: (range: TimeRange, resolved: { start: Date; end: Date }) => void;
  presets?: TimeRangePreset[];
  /** Read and show times in this IANA zone; the viewer's own by default. */
  timeZone?: string;
  hour12?: boolean;
  /** Which edge of the plate the panel lines up with. */
  align?: "start" | "end";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accessible name, e.g. "Time range for logs". */
  label?: string;
  disabled?: boolean;
}

const rel = (duration: number): TimeRange => ({ type: "relative", duration });
export const TIME_RANGE_PRESETS: TimeRangePreset[] = [
  { label: "Last 5 minutes", range: rel(5 * MINUTE) },
  { label: "Last 15 minutes", range: rel(15 * MINUTE) },
  { label: "Last 1 hour", range: rel(HOUR) },
  { label: "Last 4 hours", range: rel(4 * HOUR) },
  { label: "Last 24 hours", range: rel(DAY) },
  { label: "Last 7 days", range: rel(7 * DAY) },
  { label: "Today so far", range: (now, tz) => parseTimeRange("today", { now, timeZone: tz })! },
  { label: "Yesterday", range: (now, tz) => parseTimeRange("yesterday", { now, timeZone: tz })! },
];

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50";
const TOKENS = ["--background", "--foreground", "--popover", "--popover-foreground", "--border", "--accent", "--accent-foreground", "--primary", "--primary-foreground", "--muted", "--muted-foreground", "--ring"];
const HINT = "Try 45m, yesterday, since 9 or 14:00–16:00";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

// Phones get the tighter label and a plate without the clock or the word Live.
const narrowQuery = "(max-width: 480px)";
const subscribeNarrow = (onChange: () => void) => {
  const query = window.matchMedia(narrowQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useNarrow = () => React.useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);

function zoneLabel(timeZone?: string) {
  try {
    const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const off = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value.replace("GMT", "UTC");
    return `${zone === "UTC" ? "UTC" : (zone.split("/").pop() ?? zone).replace(/_/g, " ")}${off && zone !== "UTC" ? ` · ${off}` : ""}`;
  } catch {
    return "";
  }
}

function Arrow({ dir }: { dir: -1 | 1 }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
      <path d={dir < 0 ? "M9.75 4.5 6.25 8l3.5 3.5" : "M6.25 4.5 9.75 8l-3.5 3.5"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A sentence that changes crossfades whole. */
function Line({ text, reduced, className = "" }: { text: string; reduced: boolean; className?: string }) {
  const [shown, setShown] = React.useState({ text, key: 0 });
  const [leaving, setLeaving] = React.useState<{ text: string; key: number }[]>([]);
  if (text !== shown.text) {
    if (shown.text && !reduced) setLeaving((l) => [...l.slice(-2), shown]);
    setShown({ text, key: shown.key + 1 });
  }
  return (
    <span className={`relative block ${className}`}>
      <span
        key={shown.key}
        className="block truncate"
        ref={(el) => {
          if (!el || reduced || shown.key === 0 || el.dataset.in) return;
          el.dataset.in = "1";
          el.animate([{ opacity: 0, transform: "translateY(0.3em)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }], { duration: 340, delay: 40, easing: EASE, fill: "backwards" });
        }}
      >
        {shown.text || " "}
      </span>
      {leaving.map((l) => (
        <span
          key={l.key}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 block truncate"
          ref={(el) => {
            if (!el || el.dataset.out) return;
            el.dataset.out = "1";
            el.animate([{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, transform: "translateY(-0.3em)", filter: "blur(4px)" }], { duration: 160, easing: EASE, fill: "forwards" }).onfinish = () =>
              setLeaving((all) => all.filter((x) => x.key !== l.key));
          }}
        >
          {l.text}
        </span>
      ))}
    </span>
  );
}

type Phase = "closed" | "opening" | "open" | "closing";

export function TimeRangePicker({
  value,
  defaultValue = rel(HOUR),
  onValueChange,
  presets = TIME_RANGE_PRESETS,
  timeZone,
  hour12 = false,
  align = "end",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  label = "Time range",
  disabled = false,
  className = "",
  ...props
}: TimeRangePickerProps) {
  const uid = React.useId();
  const reduced = useReducedMotion();
  const narrow = useNarrow();
  const [own, setOwn] = React.useState(defaultValue);
  const range = value ?? own;
  const [now, setNow] = React.useState(() => new Date());
  const [phase, setPhase] = React.useState<Phase>(() => ((openProp ?? defaultOpen) ? "opening" : "closed"));
  const [fit, setFit] = React.useState({ x: 0, y: 0, w: 320, up: false, theme: {} as Record<string, string> });
  const [typed, setTyped] = React.useState("");
  const [active, setActive] = React.useState(-1);
  const [mark, setMark] = React.useState({ x: 0, y: 0, w: 0, h: 0, on: false, slide: false });
  const [recent, setRecent] = React.useState<TimeRange[]>([]);
  const [refused, setRefused] = React.useState(false);
  const [announce, setAnnounce] = React.useState("");
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const presetRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const mounted = phase !== "closed";
  const expanded = phase === "open";
  const live = isLive(range);

  // "Today" and "Last 1 hour" are about now: look at the clock once a minute.
  React.useEffect(() => {
    let t = 0;
    const tick = () => {
      setNow(new Date());
      t = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    t = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    return () => window.clearTimeout(t);
  }, []);

  const words = formatTimeRange(range, { now, timeZone, hour12, compact: narrow });
  const resolved = resolveTimeRange(range, now);
  const span = resolved.end.getTime() - resolved.start.getTime();
  const presetRanges = React.useMemo(() => presets.map((p) => (typeof p.range === "function" ? p.range(now, timeZone) : p.range)), [presets, now, timeZone]);
  const currentPreset = presetRanges.findIndex((r) => sameRange(r, range));
  const parsed = typed.trim() ? parseTimeRange(typed, { now, timeZone }) : null;

  const commit = (next: TimeRange, how?: "typed") => {
    const at = new Date();
    if (value === undefined) setOwn(next);
    onValueChange?.(next, resolveTimeRange(next, at));
    setAnnounce(formatTimeRange(next, { now: at, timeZone, hour12 }));
    if (how === "typed" && !presetRanges.some((r) => sameRange(r, next))) setRecent((list) => [next, ...list.filter((r) => !sameRange(r, next))].slice(0, 3));
  };

  /* ── Panel ── */

  const place = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const w = Math.min(320, vw - 16);
    const x = Math.min(Math.max(8, align === "end" ? r.right - w : r.left), vw - 8 - w);
    const up = vh - r.bottom < 380 && r.top > vh - r.bottom;
    const cs = getComputedStyle(anchor);
    const theme: Record<string, string> = { colorScheme: cs.colorScheme, fontFamily: cs.fontFamily };
    for (const t of TOKENS) {
      const v = cs.getPropertyValue(t);
      if (v) theme[t] = v;
    }
    setFit({ x, y: up ? vh - r.top + 6 : r.bottom + 6, w, up, theme });
  }, [align]);

  const fresh = () => {
    setTyped("");
    setRefused(false);
    setActive(-1);
    setMark((m) => ({ ...m, on: false, slide: false }));
    setPhase(reduced ? "open" : "opening");
  };
  const begin = () => {
    place();
    fresh();
  };
  const end = React.useCallback(
    (refocus = true) => {
      if (refocus) triggerRef.current?.focus({ preventScroll: true });
      setPhase((p) => (p === "closed" ? p : reduced ? "closed" : "closing"));
    },
    [reduced],
  );
  const request = (next: boolean, refocus = true) => {
    if (openProp === undefined) (next ? begin : () => end(refocus))();
    onOpenChange?.(next);
  };

  // Controlled: follow the open prop as soon as it changes (the panel is placed once it's mounted, below).
  const [seenOpenProp, setSeenOpenProp] = React.useState(openProp);
  if (openProp !== seenOpenProp) {
    setSeenOpenProp(openProp);
    if (openProp && !mounted) fresh();
    if (openProp === false && mounted) setPhase(reduced ? "closed" : "closing");
  }

  React.useLayoutEffect(() => {
    if (mounted) place();
  }, [mounted, place]);

  // Folding away takes 240ms, however it was closed.
  React.useEffect(() => {
    if (phase !== "closing") return;
    const done = window.setTimeout(() => setPhase("closed"), 240);
    return () => window.clearTimeout(done);
  }, [phase]);

  React.useLayoutEffect(() => {
    if (phase !== "opening") return;
    place();
    inputRef.current?.focus({ preventScroll: true });
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setPhase("open"))));
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [phase, place]);

  React.useEffect(() => {
    if (!mounted) return;
    const inside = (n: Node) => Boolean(anchorRef.current?.contains(n) || surfaceRef.current?.contains(n));
    const onDown = (e: PointerEvent) => {
      if (!inside(e.target as Node)) request(false, false);
    };
    let frame = 0;
    const follow = (e: Event) => {
      if (e.target instanceof Node && surfaceRef.current?.contains(e.target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  });

  // The highlight glides to the quick range under the pointer or the arrows.
  React.useLayoutEffect(() => {
    if (!mounted) return;
    const el = presetRefs.current[active];
    setMark((m) => (el ? (m.x === el.offsetLeft && m.y === el.offsetTop && m.on ? m : { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, on: true, slide: m.on }) : m.on ? { ...m, on: false, slide: false } : m));
  }, [active, mounted]);

  const choose = (i: number) => {
    commit(presetRanges[i]);
    request(false);
  };
  const applyTyped = () => {
    if (!parsed) {
      setRefused(true);
      if (!reduced)
        fieldRef.current?.animate([{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "none" }], { duration: 380, easing: "ease-out" });
      return;
    }
    commit(parsed, "typed");
    request(false);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = presets.length;
    const go = (i: number) => {
      e.preventDefault();
      setActive(i);
    };
    if (e.key === "ArrowDown") go(active < 0 ? 0 : Math.min(n - 1, active + 2));
    else if (e.key === "ArrowUp") go(active - 2 < 0 ? -1 : active - 2);
    else if (e.key === "ArrowRight" && active >= 0) go(Math.min(n - 1, active + 1));
    else if (e.key === "ArrowLeft" && active >= 0) go(Math.max(0, active - 1));
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && !typed.trim()) choose(active);
      else applyTyped();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      request(false);
    } else if (e.key === "Tab") {
      e.preventDefault();
      request(false);
    }
  };

  const preview = !typed.trim()
    ? HINT
    : parsed
      ? (() => {
          const r = resolveTimeRange(parsed, now);
          return `${formatTimeRange(parsed, { now, timeZone, hour12 })} · ${durationShort(r.end.getTime() - r.start.getTime())}${isLive(parsed) ? " · live" : ""}`;
        })()
      : refused
        ? `Couldn’t read that. ${HINT}.`
        : HINT;

  const segment = `flex shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent ${FOCUS}`;

  return (
    <div ref={anchorRef} className={`relative inline-flex max-w-full ${className}`} {...props}>
      <div role="group" aria-label={label} className={`inline-flex h-8 max-w-full items-stretch overflow-hidden rounded-full border border-border bg-background text-[12.5px] ${disabled ? "opacity-60" : ""}`}>
        <button
          type="button"
          aria-label={`Earlier: the ${durationShort(span)} before`}
          title="Earlier"
          disabled={disabled}
          onClick={() => commit(stepTimeRange(range, -1, new Date()))}
          className={`w-8 cursor-pointer max-[480px]:w-7 ${segment}`}
        >
          <Arrow dir={-1} />
        </button>
        <span aria-hidden="true" className="my-2 w-px shrink-0 bg-border" />
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={expanded}
          aria-controls={mounted ? `${uid}-panel` : undefined}
          aria-label={`${label}: ${words}`}
          onClick={() => request(!(phase === "open" || phase === "opening"))}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              request(true);
            }
          }}
          className={`flex min-w-0 cursor-pointer items-center gap-1.5 px-2.5 font-medium transition-colors hover:bg-accent disabled:cursor-default ${expanded ? "bg-accent" : ""} ${FOCUS}`}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground max-[480px]:hidden">
            <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5.25V8l1.75 1.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="min-w-0 overflow-hidden whitespace-nowrap">
            <TextMorph>{words}</TextMorph>
          </span>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: reduced ? "none" : `transform 320ms ${EASE}` }}>
            <path d="M4.5 6.25 8 9.75l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span aria-hidden="true" className="my-2 w-px shrink-0 bg-border" />
        <button
          type="button"
          aria-label={live ? "Later: already showing the latest" : `Later: the ${durationShort(span)} after`}
          title={live ? "Already showing the latest" : "Later"}
          disabled={disabled || live}
          onClick={() => commit(stepTimeRange(range, 1, new Date()))}
          className={`w-8 cursor-pointer max-[480px]:w-7 ${segment}`}
        >
          <Arrow dir={1} />
        </button>
        <span aria-hidden="true" className="my-2 w-px shrink-0 bg-border" />
        <button
          type="button"
          aria-pressed={live}
          aria-label={live ? "Live: pause" : "Paused: go live"}
          disabled={disabled}
          onClick={() => {
            const at = new Date();
            const r = resolveTimeRange(range, at);
            commit(live ? { type: "absolute", start: r.start, end: r.end } : rel(r.end.getTime() - r.start.getTime()));
          }}
          className={`cursor-pointer gap-1.5 pl-2.5 pr-3 font-medium max-[480px]:px-2.5 ${segment} ${live ? "text-foreground" : ""}`}
        >
          <span aria-hidden="true" className="relative flex size-2 items-center justify-center">
            <span
              className={`absolute inset-0 rounded-full bg-emerald-500 ${live && !reduced ? "animate-[ui-breathe_2.4s_ease-in-out_infinite]" : ""}`}
              style={{ opacity: live ? 1 : 0, transform: live ? undefined : "scale(0.4)", transition: reduced ? "none" : `opacity 260ms ${EASE}, transform 380ms ${EASE}` }}
            />
            <span className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1.5px_currentColor]" style={{ opacity: live ? 0 : 0.8, transition: reduced ? "none" : `opacity 260ms ${EASE}` }} />
          </span>
          <span className="max-[480px]:hidden">
            <TextMorph>{live ? "Live" : "Paused"}</TextMorph>
          </span>
        </button>
      </div>

      {mounted &&
        createPortal(
          <div
            ref={surfaceRef}
            id={`${uid}-panel`}
            role="dialog"
            aria-label={label}
            onMouseDown={(e) => {
              if (!(e.target as HTMLElement).matches("input")) e.preventDefault();
            }}
            className="fixed z-[60] overflow-hidden rounded-[16px] border border-border bg-popover p-1.5 text-popover-foreground"
            style={{
              ...fit.theme,
              left: fit.x,
              [fit.up ? "bottom" : "top"]: fit.y,
              width: fit.w,
              clipPath: expanded ? "inset(0px 0px 0px 0px round 16px)" : fit.up ? "inset(100% 0px 0px 0px round 16px)" : "inset(0px 0px 100% 0px round 16px)",
              opacity: expanded ? 1 : 0,
              transition: reduced ? "none" : phase === "closing" ? `clip-path 220ms ${EASE}, opacity 180ms ${EASE} 40ms` : `clip-path 380ms ${EASE}, opacity 200ms ${EASE}`,
            }}
          >
            <div
              ref={fieldRef}
              className="flex h-9 items-center gap-2 rounded-[11px] px-2.5 transition-shadow duration-200"
              style={{ boxShadow: `inset 0 0 0 1px ${refused && !parsed ? "color-mix(in oklab, #ef4444 45%, transparent)" : "color-mix(in oklab, var(--ring) 45%, var(--border))"}` }}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground">
                <path d="M3 4.5h10M3 8h6M3 11.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setRefused(false);
                  if (e.target.value) setActive(-1);
                }}
                onKeyDown={onInputKey}
                placeholder="Type a range"
                aria-label="Type a range"
                aria-describedby={`${uid}-preview`}
                aria-activedescendant={active >= 0 ? `${uid}-p${active}` : undefined}
                autoComplete="off"
                spellCheck={false}
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground [@media(pointer:coarse)]:text-[16px]"
              />
              {parsed && <span className="shrink-0 rounded-full px-1.5 font-mono text-[10.5px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">↵</span>}
            </div>
            <p id={`${uid}-preview`} className={`px-1 pb-1 pt-1.5 text-[11.5px] transition-colors duration-200 ${refused && !parsed ? "text-red-600 dark:text-red-400" : parsed ? "text-foreground" : "text-muted-foreground"}`}>
              <Line text={preview} reduced={reduced} />
            </p>

            <div role="listbox" aria-label="Quick ranges" className="relative mt-1 grid grid-cols-2 gap-0.5 border-t border-border pt-1.5" onMouseLeave={() => setActive(-1)}>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 rounded-[9px] bg-accent"
                style={{
                  width: mark.w,
                  height: mark.h,
                  transform: `translate(${mark.x}px, ${mark.y}px)`,
                  opacity: mark.on ? 1 : 0,
                  transition: reduced ? "none" : `${mark.slide ? `transform 220ms ${EASE}, width 220ms ${EASE}, ` : ""}opacity 160ms ${EASE}`,
                }}
              />
              {presets.map((p, i) => {
                const on = i === currentPreset;
                return (
                  <button
                    key={p.label}
                    ref={(el) => {
                      presetRefs.current[i] = el;
                    }}
                    id={`${uid}-p${i}`}
                    type="button"
                    role="option"
                    aria-selected={on}
                    tabIndex={-1}
                    onPointerMove={() => active !== i && setActive(i)}
                    onClick={() => choose(i)}
                    className={`relative flex h-8 cursor-pointer items-center justify-between gap-2 rounded-[9px] px-2 text-left text-[12.5px] ${on ? "font-medium text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="truncate">{p.label}</span>
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3 shrink-0 text-foreground">
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                        strokeDasharray={1}
                        style={{ strokeDashoffset: on && expanded ? 0 : 1, transition: reduced ? "none" : `stroke-dashoffset 380ms ${EASE} 160ms` }}
                      />
                    </svg>
                  </button>
                );
              })}
            </div>

            {recent.length > 0 && (
              <div className="mt-1.5 border-t border-border px-1 pt-2">
                <p className="text-[11px] text-muted-foreground">Recent</p>
                <div className="mt-1.5 flex flex-wrap gap-1 pb-0.5">
                  {recent.map((r) => (
                    <button
                      key={formatTimeRange(r, { now, timeZone, hour12 })}
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        commit(r, "typed");
                        request(false);
                      }}
                      className="h-6 max-w-full cursor-pointer truncate rounded-full px-2 text-[11.5px] text-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-accent"
                    >
                      {formatTimeRange(r, { now, timeZone, hour12 })}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-1.5 border-t border-border px-1 pb-0.5 pt-2 text-[11px] text-muted-foreground">Times in {zoneLabel(timeZone)}</p>
          </div>,
          document.body,
        )}

      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
