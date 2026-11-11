"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";
import { addDays, atMinutes, layoutDay, minutesOf, sameDay, startOfDay, startOfWeek, useTimeGrid, type GridDraft, type GridItem } from "./use-time-grid";

/* ─────────────────────────────────────────────────────────
 * WEEK CALENDAR: the scheduling week, held in the hand
 *
 *   create    drag down an empty slot and a block grows from
 *             where you pressed, snapping to the step while
 *             "9:15 – 10:30" rolls; let go and you name it in
 *             the block itself
 *   move      drag an event between slots and days: it glides
 *             step to step, its times roll, and anything it
 *             lands on eases aside into side-by-side columns
 *             while you're still holding
 *   resize    drag its top or bottom edge
 *   week      ‹ › slide the days in from the side you went
 *             toward; dates roll, the range morphs
 *   now       a hairline across today that moves with the
 *             clock
 *   fail      a save that throws puts the event back with a
 *             shake and says so
 *
 * Seven days wide, three in a narrow container, one on a
 * phone. Hold to pick up on touch, so a swipe still scrolls.
 * ───────────────────────────────────────────────────────── */

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  /** Which of the theme's five chart colours. */
  tone?: 1 | 2 | 3 | 4 | 5;
  /** Time taken by something else (another calendar): drawn as busy, can't be moved, and you can still book over it. */
  busy?: boolean;
}

export interface WeekCalendarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  events?: CalendarEvent[];
  defaultEvents?: CalendarEvent[];
  onEventsChange?: (events: CalendarEvent[]) => void;
  /** A new event, once it's named. Resolve with the stored event (to take its id) or nothing; throw to take it back. */
  onCreate?: (event: CalendarEvent) => Promise<CalendarEvent | void> | CalendarEvent | void;
  /** An event moved or resized. Throw to put it back. */
  onUpdate?: (event: CalendarEvent, previous: CalendarEvent) => Promise<void> | void;
  /** An event deleted (Delete or Backspace on it). Throw to bring it back. */
  onDelete?: (event: CalendarEvent) => Promise<void> | void;
  /** Any day in the range to show. */
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (firstDay: Date) => void;
  /** Days side by side; "auto" shows 7, 3 or 1 to fit the width. 5 is Monday to Friday. */
  days?: 1 | 3 | 5 | 7 | "auto";
  weekStartsOn?: 0 | 1;
  startHour?: number;
  endHour?: number;
  /** Snap, in minutes. */
  step?: number;
  /** Length of an event made by a click or a hold, in minutes. */
  defaultDuration?: number;
  hourHeight?: number;
  /** Height of the scrolling hours, px. */
  height?: number;
  locale?: string;
  label?: string;
}

type Shown = GridItem & { ev: CalendarEvent; draft?: boolean };
type Gone = { key: number; ev: CalendarEvent; style: React.CSSProperties };

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const EMPTY: CalendarEvent[] = [];
/** Short events still get a line of text: drawn at least this tall (the overlap maths uses real times). */
const MIN_HEIGHT = 20;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const SHEEN =
  "[mask-image:linear-gradient(90deg,rgb(0_0_0/0.45)_35%,#000_50%,rgb(0_0_0/0.45)_65%)] [mask-size:200%_100%] animate-[ui-sheen_1.4s_linear_infinite] motion-reduce:animate-none motion-reduce:[mask-image:none]";
let seq = 0;

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const tint = (tone: number, amount: number) => `color-mix(in oklab, var(--chart-${tone}) ${amount}%, var(--background))`;
const ring = (tone: number, amount: number, width = 1) => `inset 0 0 0 ${width}px color-mix(in oklab, var(--chart-${tone}) ${amount}%, transparent)`;

/** A time whose figures roll when it changes (while an event is being moved), or plain text otherwise. */
const Clock = React.memo(function Clock({ minutes, hour12, live }: { minutes: number; hour12: boolean; live: boolean }) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const hh = hour12 ? ((h + 11) % 12) + 1 : h;
  const period = h < 12 ? "am" : "pm";
  if (!live) return <span>{`${hh}:${String(m).padStart(2, "0")}${hour12 ? period : ""}`}</span>;
  return (
    <span className="inline-flex items-baseline">
      <NumberRoll value={hh} duration={520} />:
      <NumberRoll value={m} format={{ minimumIntegerDigits: 2 }} duration={520} />
      {hour12 && <TextMorph>{period}</TextMorph>}
    </span>
  );
});

/** A sentence that changes crossfades whole. */
function Line({ text, className = "" }: { text: string; className?: string }) {
  const [shown, setShown] = React.useState({ text, key: 0 });
  const [leaving, setLeaving] = React.useState<{ text: string; key: number }[]>([]);
  if (text !== shown.text) {
    if (shown.text) setLeaving((l) => [...l, shown]);
    setShown({ text, key: shown.key + 1 });
  }
  return (
    <span className={`relative block ${className}`}>
      <span
        key={shown.key}
        className="block truncate"
        ref={(el) => {
          if (!el || shown.key === 0 || el.dataset.in) return;
          el.dataset.in = "1";
          el.animate(
            [
              { opacity: 0, transform: "translateY(0.35em)", filter: "blur(4px)" },
              { opacity: 1, transform: "none", filter: "blur(0px)" },
            ],
            { duration: 420, delay: 60, easing: EASE, fill: "backwards" },
          );
        }}
      >
        {shown.text || " "}
      </span>
      {leaving.map((l) => (
        <span
          key={l.key}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 block truncate"
          ref={(el) => {
            if (!el || el.dataset.out) return;
            el.dataset.out = "1";
            el.animate(
              [
                { opacity: 1, transform: "none", filter: "blur(0px)" },
                { opacity: 0, transform: "translateY(-0.35em)", filter: "blur(4px)" },
              ],
              { duration: 200, easing: EASE, fill: "forwards" },
            ).onfinish = () => setLeaving((all) => all.filter((x) => x.key !== l.key));
          }}
        >
          {l.text}
        </span>
      ))}
    </span>
  );
}

type BlockActions = {
  key: (e: React.KeyboardEvent, id: string) => void;
  focus: (id: string) => void;
  blur: (id: string) => void;
  name: (id: string, value: string | null) => void;
};
type BlockProps = {
  id: string;
  title: string;
  tone: number;
  draft: boolean;
  top: number;
  height: number;
  left: string;
  width: string;
  zIndex: number;
  lifted: boolean;
  selected: boolean;
  tall: boolean;
  /** Tall enough to say what it lands on. */
  roomy: boolean;
  /** What it overlaps while held, or "". */
  over: string;
  live: boolean;
  naming: boolean;
  saving: boolean;
  start: number;
  end: number;
  hour12: boolean;
  reduced: boolean;
  label: string;
  keysId: string;
  actions: React.RefObject<BlockActions>;
};

/** One event. Memoised on plain values, so a drag step re-renders only the events that moved. */
const EventBlock = React.memo(function EventBlock(p: BlockProps) {
  const a = p.actions;
  const ref = React.useRef<HTMLDivElement>(null);
  const last = React.useRef<{ top: number; left: number } | null>(null);
  // While held, a step moves the block once in layout and the eye follows a transform glide (additive, so steps that
  // come quicker than the glide just stack): no layout work per frame.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const now = { top: el.offsetTop, left: el.offsetLeft };
    const was = last.current;
    last.current = now;
    if (!was || !p.lifted || p.reduced) return;
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    if (dx || dy) el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], { duration: 220, easing: EASE, composite: "add" });
  });
  return (
    <div
      ref={ref}
      data-event-id={p.id}
      role="button"
      tabIndex={p.draft ? -1 : 0}
      aria-label={p.label}
      aria-describedby={p.keysId}
      aria-pressed={p.selected}
      onKeyDown={(e) => a.current.key(e, p.id)}
      onFocus={() => a.current.focus(p.id)}
      onBlur={() => a.current.blur(p.id)}
      className={`group/event absolute flex flex-col overflow-hidden rounded-[8px] px-1.5 text-left outline-none ${p.tall ? "py-1" : "justify-center"} ${
        p.lifted ? "cursor-grabbing" : "cursor-grab"
      } ${p.saving ? SHEEN : ""}`}
      style={{
        top: p.top,
        height: p.height,
        left: p.left,
        width: p.width,
        zIndex: p.lifted ? 40 : p.selected ? 30 : p.zIndex,
        background: tint(p.tone, p.lifted ? 20 : 13),
        boxShadow: ring(p.tone, p.lifted || p.selected ? 85 : 42, p.selected ? 1.5 : 1),
        transform: p.lifted ? "scale(1.015)" : "none",
        transition: p.reduced
          ? "none"
          : `${p.lifted ? "" : `top 200ms ${EASE}, left 260ms ${EASE}, `}height 200ms ${EASE}, width 260ms ${EASE}, transform 200ms ${EASE}, background-color 200ms, box-shadow 200ms`,
        willChange: p.lifted ? "translate" : undefined,
      }}
    >
      {p.naming ? (
        <input
          autoFocus
          defaultValue={p.title}
          placeholder="New event"
          aria-label="Event name"
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") a.current.name(p.id, e.currentTarget.value);
            if (e.key === "Escape") a.current.name(p.id, null);
          }}
          onBlur={(e) => a.current.name(p.id, e.currentTarget.value)}
          className="w-full min-w-0 bg-transparent text-[12px] font-medium outline-none placeholder:text-muted-foreground [@media(pointer:coarse)]:text-[16px]"
        />
      ) : (
        <span className={`truncate font-medium leading-tight ${p.tall ? "text-[12px]" : "text-[11px]"} ${p.title ? "" : "text-muted-foreground"}`}>
          {p.title || "New event"}
          {!p.tall && (
            <span className="ml-1 font-normal text-muted-foreground tabular-nums">
              <Clock minutes={p.start} hour12={p.hour12} live={p.live} />
            </span>
          )}
        </span>
      )}
      {p.tall && (
        <span className="mt-0.5 flex items-baseline gap-1 truncate text-[11px] leading-tight text-muted-foreground tabular-nums">
          <Clock minutes={p.start} hour12={p.hour12} live={p.live} />
          <span>–</span>
          <Clock minutes={p.end} hour12={p.hour12} live={p.live} />
        </span>
      )}
      {/* What it lands on, said while it's held over it. */}
      {p.roomy && (
        <span className="grid transition-[grid-template-rows,opacity] duration-200" style={{ gridTemplateRows: p.over ? "1fr" : "0fr", opacity: p.over ? 1 : 0, transitionTimingFunction: EASE }}>
          <span className="min-w-0 overflow-hidden">
            <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] leading-tight text-amber-700 dark:text-amber-400">
              <span className="size-1.5 shrink-0 rounded-full bg-current" />
              <span className="truncate">Overlaps {p.over}</span>
            </span>
          </span>
        </span>
      )}
      {!p.draft && !p.naming && (
        <>
          <span data-edge="start" aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize" />
          <span data-edge="end" aria-hidden="true" className="absolute inset-x-0 bottom-0 flex h-2 cursor-ns-resize items-end justify-center pb-[3px]">
            <span className="h-px w-4 rounded-full bg-current opacity-0 transition-opacity group-hover/event:opacity-30" />
          </span>
        </>
      )}
    </div>
  );
});

const DayHead = React.memo(function DayHead({ weekday, date, today, dir }: { weekday: string; date: number; today: boolean; dir: "up" | "down" | undefined }) {
  return (
    <div className="flex flex-col items-center gap-0.5 border-l border-border py-2" aria-hidden="true">
      <span className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
        <TextMorph>{weekday}</TextMorph>
      </span>
      <span className={`text-[15px] tabular-nums leading-none ${today ? "font-semibold text-primary" : "font-medium"}`}>
        <NumberRoll value={date} direction={dir} duration={700} />
      </span>
    </div>
  );
});

export function WeekCalendar({
  events: controlled,
  defaultEvents,
  onEventsChange,
  onCreate,
  onUpdate,
  onDelete,
  date,
  defaultDate,
  onDateChange,
  days: daysProp = "auto",
  weekStartsOn = 1,
  startHour = 7,
  endHour = 21,
  step = 15,
  defaultDuration = 30,
  hourHeight = 44,
  height = 420,
  locale,
  label = "Calendar",
  className = "",
  ...props
}: WeekCalendarProps) {
  const reduced = useReducedMotion();
  const uid = React.useId();
  const [own, setOwn] = React.useState<CalendarEvent[]>(defaultEvents ?? EMPTY);
  const events = controlled ?? own;
  const eventsRef = React.useRef(events);
  React.useLayoutEffect(() => {
    eventsRef.current = events;
  });
  const [anchorOwn, setAnchorOwn] = React.useState(() => startOfDay(defaultDate ?? new Date()));
  const anchor = date ? startOfDay(date) : anchorOwn;
  const [width, setWidth] = React.useState(0);
  const [draft, setDraft] = React.useState<GridDraft | null>(null);
  const [naming, setNaming] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<ReadonlySet<string>>(() => new Set());
  const [rolling, setRolling] = React.useState<ReadonlySet<string>>(() => new Set());
  const [gone, setGone] = React.useState<Gone[]>([]);
  const [notice, setNotice] = React.useState<{ text: string; key: number } | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const [cursor, setCursor] = React.useState<{ day: number; minute: number } | null>(null);
  const [now, setNow] = React.useState<Date | null>(null);
  const [slide, setSlide] = React.useState<{ dir: number; key: number } | null>(null);
  /** The range we just left: its events slide out the other way while the new ones come in. */
  const [outgoing, setOutgoing] = React.useState<{ key: number; dir: number; blocks: { id: string; style: React.CSSProperties; ev: CalendarEvent }[] } | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const columnsRef = React.useRef<HTMLDivElement>(null);
  const goneKey = React.useRef(0);
  const nextKey = React.useRef(0);

  // ── Range ──────────────────────────────────────────────
  const span = daysProp === "auto" ? (width === 0 || width >= 560 ? 7 : width >= 300 ? 3 : 1) : daysProp;
  const first = React.useMemo(
    () => (span === 7 ? startOfWeek(anchor, weekStartsOn) : span === 5 ? startOfWeek(anchor, 1) : anchor),
    [span, anchor, weekStartsOn],
  );
  const days = React.useMemo(() => Array.from({ length: span }, (_, i) => addDays(first, i)), [first, span]);
  const min = startHour * 60;
  const max = endHour * 60;
  const ppm = hourHeight / 60;
  const hour12 = React.useMemo(() => new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12 ?? false, [locale]);
  const fmt = React.useMemo(
    () => ({
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short" }),
      long: new Intl.DateTimeFormat(locale, { weekday: "long", hour: "numeric", minute: "2-digit" }),
      time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }),
      hour: new Intl.DateTimeFormat(locale, { hour: "numeric" }),
      range: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
      day: new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }),
    }),
    [locale],
  );
  const rangeLabel = span === 1 ? fmt.day.format(days[0]) : (fmt.range.formatRange?.(days[0], days[span - 1]) ?? `${fmt.range.format(days[0])} – ${fmt.range.format(days[span - 1])}`);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The clock: on mount (so the server never renders a stale "now"), then once a minute, on the minute.
  React.useEffect(() => {
    let timer = 0;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = window.setTimeout(tick, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 20);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  // Open on the working day: an hour and a half before now when today is in view, else at 8.
  const scrolled = React.useRef(false);
  React.useLayoutEffect(() => {
    const sc = scrollerRef.current;
    if (!sc || scrolled.current || !now) return;
    scrolled.current = true;
    const today = days.some((d) => sameDay(d, now));
    const at = today ? minutesOf(now) - 90 : 8 * 60;
    sc.scrollTop = Math.max(0, (at - min) * ppm);
  }, [now, days, min, ppm]);

  const go = (dir: number) => {
    const by = span === 5 ? 7 : span;
    const next = dir === 0 ? startOfDay(new Date()) : addDays(anchor, dir * by);
    const nextFirst = span === 7 ? startOfWeek(next, weekStartsOn) : span === 5 ? startOfWeek(next, 1) : next;
    const d = Math.sign(nextFirst.getTime() - first.getTime());
    if (!d) return;
    if (!date) setAnchorOwn(next);
    onDateChange?.(nextFirst);
    if (!reduced) setOutgoing({ key: ++nextKey.current, dir: d, blocks: shown.map((it) => ({ id: it.id, style: geometry(it), ev: it.ev })) });
    setSlide((s) => ({ dir: d, key: (s?.key ?? 0) + 1 }));
    setSelected(null);
    setCursor(null);
    setAnnounce(span === 1 ? fmt.day.format(nextFirst) : `${fmt.range.formatRange?.(nextFirst, addDays(nextFirst, span - 1)) ?? fmt.range.format(nextFirst)}`);
  };

  // ── Events in view ─────────────────────────────────────
  const commit = (next: CalendarEvent[]) => {
    eventsRef.current = next;
    if (controlled === undefined) setOwn(next);
    onEventsChange?.(next);
  };
  const flash = (text: string) => {
    const key = ++nextKey.current;
    setNotice({ text, key });
    window.setTimeout(() => setNotice((n) => (n?.key === key ? null : n)), 3200);
  };

  const items: Shown[] = React.useMemo(
    () =>
      events.flatMap((ev) => {
        const s = new Date(ev.start);
        const e = new Date(ev.end);
        const day = days.findIndex((d) => sameDay(d, s));
        if (day < 0) return [];
        const end = sameDay(s, e) ? minutesOf(e) : 24 * 60;
        return [{ id: ev.id, day, start: Math.max(min, minutesOf(s)), end: Math.min(max, end), busy: ev.busy, ev }];
      }),
    [events, days, min, max],
  );

  const shown: Shown[] = !draft
    ? items
    : draft.kind === "create"
      ? [...items, { id: draft.id, day: draft.day, start: draft.start, end: draft.end, draft: true, ev: { id: draft.id, title: "", start: atMinutes(days[draft.day], draft.start), end: atMinutes(days[draft.day], draft.end), tone: 1 } }]
      : items.map((it) => (it.id === draft.id ? { ...it, day: draft.day, start: draft.start, end: draft.end } : it));

  const layout = new Map<string, { col: number; cols: number }>();
  for (let d = 0; d < span; d++) layoutDay(shown.filter((it) => it.day === d && !it.busy)).forEach((v, k) => layout.set(k, v));

  /**
   * Where an event sits. Overlapping events fan out rather than splitting into slivers: each takes its column's start,
   * reaches 1.6 columns across (never past the day), and later columns sit on top, so every title keeps some room.
   */
  const geometry = (it: { day: number; start: number; end: number; id: string; busy?: boolean }): React.CSSProperties & { zIndex: number } => {
    const l = it.busy ? { col: 0, cols: 1 } : (layout.get(it.id) ?? { col: 0, cols: 1 });
    const col = 100 / span;
    const reach = Math.min(l.cols - l.col, l.col === l.cols - 1 ? 1 : 1.6);
    return {
      top: (it.start - min) * ppm + 1,
      height: Math.max(MIN_HEIGHT, (it.end - it.start) * ppm - 2),
      left: `calc(${it.day * col + (l.col * col) / l.cols}% + ${l.col ? 0 : 2}px)`,
      width: `calc(${(col / l.cols) * reach}% - ${l.col ? 2 : 4}px)`,
      zIndex: 10 + l.col,
    };
  };

  const overlapsOf = (it: { id: string; day: number; start: number; end: number }) =>
    shown.filter((o) => o.id !== it.id && o.day === it.day && o.start < it.end && o.end > it.start).map((o) => (o.busy ? "busy time" : o.ev.title || "an event"));

  const describe = (ev: { title: string }, it: { day: number; start: number; end: number }) =>
    `${ev.title || "New event"}, ${fmt.long.format(atMinutes(days[it.day], it.start))} to ${fmt.time.format(atMinutes(days[it.day], it.end))}`;

  const roll = (id: string) => {
    setRolling((s) => new Set(s).add(id));
    window.setTimeout(() => setRolling((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    }), 1200);
  };

  const shake = (id: string) => {
    if (reduced) return;
    rootRef.current?.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(id)}"]`)?.animate(
      [{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "none" }],
      { duration: 380, easing: "ease-out", composite: "add" },
    );
  };

  /** Leaves through a fold: a copy where it was shrinks a little and blurs out. */
  const fold = (ev: CalendarEvent) => {
    const it = items.find((x) => x.id === ev.id);
    if (!it || reduced) return;
    setGone((g) => [...g, { key: ++goneKey.current, ev, style: geometry(it) }]);
  };

  const update = async (next: CalendarEvent, prev: CalendarEvent, how: string) => {
    commit(eventsRef.current.map((e) => (e.id === next.id ? next : e)));
    roll(next.id);
    const it = { day: days.findIndex((d) => sameDay(d, next.start)), start: minutesOf(next.start), end: minutesOf(next.end) };
    const over = it.day >= 0 ? overlapsOf({ id: next.id, ...it }) : [];
    if (it.day >= 0) setAnnounce(`${how} ${describe(next, it)}.${over.length ? ` Overlaps ${over[0]}.` : ""}`);
    if (!onUpdate) return;
    try {
      await onUpdate(next, prev);
    } catch {
      commit(eventsRef.current.map((e) => (e.id === next.id ? prev : e)));
      roll(next.id);
      flash(`Couldn't move “${prev.title}”. It's back where it was.`);
      setAnnounce(`Couldn't save. ${prev.title} is back where it was.`);
      window.setTimeout(() => shake(next.id), 240);
    }
  };

  const remove = async (ev: CalendarEvent) => {
    fold(ev);
    commit(eventsRef.current.filter((e) => e.id !== ev.id));
    setSelected(null);
    setAnnounce(`Deleted ${ev.title}.`);
    columnsRef.current?.focus({ preventScroll: true });
    if (!onDelete) return;
    try {
      await onDelete(ev);
    } catch {
      commit([...eventsRef.current, ev]);
      flash(`Couldn't delete “${ev.title}”.`);
      window.setTimeout(() => shake(ev.id), 60);
    }
  };

  const create = (day: number, start: number, end: number, id?: string) => {
    const finalId = id ?? `new-${seq++}`;
    const ev: CalendarEvent = { id: finalId, title: "", start: atMinutes(days[day], start), end: atMinutes(days[day], end), tone: 1 };
    commit([...eventsRef.current, ev]);
    setNaming(finalId);
    setSelected(finalId);
    roll(finalId);
  };

  const finishNaming = async (id: string, title: string | null) => {
    if (naming !== id) return;
    setNaming(null);
    const ev = eventsRef.current.find((e) => e.id === id);
    if (!ev) return;
    if (title === null) {
      fold(ev);
      commit(eventsRef.current.filter((e) => e.id !== id));
      setAnnounce("Discarded the new event.");
      return;
    }
    const named = { ...ev, title: title.trim() || "New event" };
    commit(eventsRef.current.map((e) => (e.id === id ? named : e)));
    const it = { day: days.findIndex((d) => sameDay(d, named.start)), start: minutesOf(named.start), end: minutesOf(named.end) };
    setAnnounce(`Added ${describe(named, it)}.`);
    if (!onCreate) return;
    setSaving((s) => new Set(s).add(id));
    try {
      const stored = await onCreate(named);
      if (stored && stored.id !== id) commit(eventsRef.current.map((e) => (e.id === id ? { ...named, ...stored } : e)));
    } catch {
      shake(id);
      window.setTimeout(() => {
        const cur = eventsRef.current.find((e) => e.id === id);
        if (cur) fold(cur);
        commit(eventsRef.current.filter((e) => e.id !== id));
      }, reduced ? 0 : 420);
      flash(`Couldn't save “${named.title}”.`);
      setAnnounce(`Couldn't save ${named.title}.`);
    } finally {
      setSaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  // ── Gestures ───────────────────────────────────────────
  const grid = useTimeGrid({
    columns: columnsRef,
    scroller: scrollerRef,
    span,
    min,
    max,
    pxPerMinute: ppm,
    step,
    holdDuration: defaultDuration,
    items: items.filter((it) => !it.busy && it.id !== naming),
    disabled: !!naming,
    onDraft: setDraft,
    onCommit: (d) => {
      if (d.kind === "create") return create(d.day, d.start, d.end, d.id);
      const prev = eventsRef.current.find((e) => e.id === d.id);
      if (!prev) return;
      const next = { ...prev, start: atMinutes(days[d.day], d.start), end: atMinutes(days[d.day], d.end) };
      if (next.start.getTime() === new Date(prev.start).getTime() && next.end.getTime() === new Date(prev.end).getTime()) return;
      setSelected(d.id);
      update(next, prev, d.kind === "move" ? "Moved to" : "Now");
    },
    onTap: (t, pointer) => {
      if ("id" in t) {
        setSelected(t.id);
        rootRef.current?.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(t.id)}"]`)?.focus({ preventScroll: true });
        return;
      }
      setSelected(null);
      // A click makes an event; a tap on a phone only scrolls (hold to make one).
      if (pointer !== "touch") create(t.day, t.minute, Math.min(max, t.minute + defaultDuration));
    },
  });

  // ── Keys ───────────────────────────────────────────────
  const onEventKey = (e: React.KeyboardEvent, it: Shown) => {
    if (naming === it.id || it.busy) return;
    const ev = it.ev;
    const move = (dDay: number, dStart: number, dEnd: number) => {
      const day = it.day + dDay;
      if (day < 0 || day >= span) return;
      const start = it.start + dStart;
      const end = it.end + dEnd;
      if (start < min || end > max || end - start < step) return;
      update({ ...ev, start: atMinutes(days[day], start), end: atMinutes(days[day], end) }, ev, dStart === dEnd ? "Moved to" : "Now");
    };
    const keys: Record<string, () => void> = {
      ArrowUp: () => (e.shiftKey ? move(0, 0, -step) : move(0, -step, -step)),
      ArrowDown: () => (e.shiftKey ? move(0, 0, step) : move(0, step, step)),
      ArrowLeft: () => move(-1, 0, 0),
      ArrowRight: () => move(1, 0, 0),
      Enter: () => setNaming(it.id),
      Delete: () => remove(ev),
      Backspace: () => remove(ev),
      Escape: () => columnsRef.current?.focus({ preventScroll: true }),
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    e.stopPropagation();
    run();
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const c = cursor ?? { day: Math.max(0, now ? days.findIndex((d) => sameDay(d, now)) : 0), minute: 9 * 60 };
    const set = (day: number, minute: number) => {
      const next = { day: Math.max(0, Math.min(span - 1, day)), minute: Math.max(min, Math.min(max - step, minute)) };
      setCursor(next);
      setAnnounce(`${fmt.long.format(atMinutes(days[next.day], next.minute))}`);
      const sc = scrollerRef.current;
      const y = (next.minute - min) * ppm;
      if (sc && (y < sc.scrollTop || y > sc.scrollTop + sc.clientHeight - 40)) sc.scrollTop = y - sc.clientHeight / 3;
    };
    const keys: Record<string, () => void> = {
      ArrowUp: () => set(c.day, c.minute - step),
      ArrowDown: () => set(c.day, c.minute + step),
      ArrowLeft: () => set(c.day - 1, c.minute),
      ArrowRight: () => set(c.day + 1, c.minute),
      PageUp: () => go(-1),
      PageDown: () => go(1),
      Enter: () => create(c.day, c.minute, Math.min(max, c.minute + defaultDuration)),
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    if (!cursor && e.key !== "Enter") setCursor(c);
    run();
  };

  // Handlers the memoised blocks call through a stable ref, so they never re-render just because these were re-created.
  const shownRef = React.useRef(shown);
  const fallbackActions = React.useMemo<BlockActions>(
    () => ({
      key: () => {},
      focus: () => {},
      blur: () => {},
      name: () => {},
    }),
    [],
  );
  const actions = React.useRef<BlockActions>(fallbackActions);
  React.useLayoutEffect(() => {
    shownRef.current = shown;
    actions.current = {
      key: (e, id) => {
        const it = shownRef.current.find((x) => x.id === id);
        if (it) onEventKey(e, it);
      },
      focus: (id) => setSelected(id),
      blur: (id) => setSelected((s) => (s === id ? null : s)),
      name: (id, value) => finishNaming(id, value),
    };
  });

  // ── Render ─────────────────────────────────────────────
  const today = now ? days.findIndex((d) => sameDay(d, now)) : -1;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = (max - min) * ppm;

  return (
    <div ref={rootRef} className={`w-full text-foreground ${className}`} {...props}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[14px] font-medium tracking-[-0.01em]">
          <TextMorph>{rangeLabel}</TextMorph>
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => go(0)}
            className={`mr-1 inline-flex h-7 cursor-pointer items-center rounded-full px-2.5 text-[12px] font-medium shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-accent ${FOCUS}`}
          >
            Today
          </button>
          <button type="button" aria-label="Previous" onClick={() => go(-1)} className={`flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}>
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          </button>
          <button type="button" aria-label="Next" onClick={() => go(1)} className={`flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}>
            <ChevronRight className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: notice ? "1fr" : "0fr", transitionTimingFunction: EASE }}>
        <div className="min-w-0 overflow-hidden">
          <Line text={notice?.text ?? ""} className="pt-1.5 text-[12.5px] text-red-600 dark:text-red-400" />
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[16px] border border-border">
        {/* Day heads */}
        <div className="flex border-b border-border">
          <div className="w-11 shrink-0" />
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }}>
            {days.map((d, i) => (
              <DayHead key={i} weekday={fmt.weekday.format(d)} date={d.getDate()} today={i === today} dir={slide ? (slide.dir > 0 ? "up" : "down") : undefined} />
            ))}
          </div>
        </div>

        <div ref={scrollerRef} className="relative overflow-y-auto overscroll-contain" style={{ height }}>
          <div className="relative flex" style={{ height: gridHeight }}>
            {/* Hours */}
            <div className="relative w-11 shrink-0" aria-hidden="true">
              {hours.slice(1).map((h) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[10.5px] tabular-nums text-muted-foreground" style={{ top: (h * 60 - min) * ppm }}>
                  {fmt.hour.format(atMinutes(days[0], h * 60))}
                </span>
              ))}
            </div>

            <div
              ref={columnsRef}
              tabIndex={0}
              role="group"
              aria-label={`${label}, ${rangeLabel}`}
              aria-describedby={`${uid}-grid-keys`}
              onKeyDown={onGridKey}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCursor(null);
              }}
              {...grid}
              className="relative flex-1 cursor-cell touch-pan-y select-none outline-none"
              style={{
                backgroundImage: `linear-gradient(to bottom, var(--border) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 45%, transparent) 1px, transparent 1px)`,
                backgroundSize: `100% ${hourHeight}px, 100% ${hourHeight}px`,
                backgroundPosition: `0 ${hourHeight - 0.5}px, 0 ${hourHeight / 2 - 0.5}px`,
              }}
            >
              {/* Day separators */}
              <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }} aria-hidden="true">
                {days.map((_, i) => (
                  <div key={i} className="border-l border-border" />
                ))}
              </div>

              {/* The keyboard's slot */}
              {cursor && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-[8px] shadow-[inset_0_0_0_1.5px_var(--ring)]"
                  style={{ ...geometry({ id: "cursor", busy: true, day: cursor.day, start: cursor.minute, end: cursor.minute + defaultDuration }), transition: reduced ? "none" : `top 180ms ${EASE}, left 220ms ${EASE}` }}
                />
              )}

              {outgoing && (
                <div
                  key={outgoing.key}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  ref={(el) => {
                    if (!el || el.dataset.out) return;
                    el.dataset.out = "1";
                    el.animate(
                      [
                        { transform: "none", opacity: 1, filter: "blur(0px)" },
                        { transform: `translateX(${-outgoing.dir * 32}px)`, opacity: 0, filter: "blur(4px)" },
                      ],
                      { duration: 260, easing: EASE, fill: "forwards" },
                    ).onfinish = () => setOutgoing((o) => (o?.key === outgoing.key ? null : o));
                  }}
                >
                  {outgoing.blocks.map((b) => (
                    <div
                      key={b.id}
                      className="absolute overflow-hidden rounded-[8px] px-1.5 py-1 text-[12px] font-medium"
                      style={
                        b.ev.busy
                          ? { ...b.style, backgroundImage: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--foreground) 9%, transparent) 0 1px, transparent 1px 6px)", boxShadow: "inset 0 0 0 1px var(--border)" }
                          : { ...b.style, background: tint(b.ev.tone ?? 1, 13), boxShadow: ring(b.ev.tone ?? 1, 42) }
                      }
                    >
                      <span className="block truncate">{b.ev.busy ? "" : b.ev.title || "New event"}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Events: one layer for the whole range, so an event dragged across days glides there. */}
              <div
                key={slide?.key ?? 0}
                className="absolute inset-0"
                ref={(el) => {
                  if (!el || !slide || reduced || el.dataset.in) return;
                  el.dataset.in = "1";
                  el.animate(
                    [
                      { transform: `translateX(${slide.dir * 32}px)`, opacity: 0, filter: "blur(4px)" },
                      { transform: "none", opacity: 1, filter: "blur(0px)" },
                    ],
                    { duration: 460, easing: EASE },
                  );
                }}
              >
                {shown.map((it) => {
                  const ev = it.ev;
                  const lifted = draft?.id === it.id;
                  const g = geometry(it);
                  if (it.busy)
                    return (
                      <div
                        key={it.id}
                        data-event-id={it.id}
                        data-busy="1"
                        aria-label={`Busy, ${fmt.long.format(atMinutes(days[it.day], it.start))} to ${fmt.time.format(atMinutes(days[it.day], it.end))}`}
                        role="note"
                        className="pointer-events-none absolute overflow-hidden rounded-[8px] px-1.5 py-1 text-[11px] text-muted-foreground"
                        style={{
                          ...g,
                          backgroundImage: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--foreground) 9%, transparent) 0 1px, transparent 1px 6px)",
                          boxShadow: "inset 0 0 0 1px var(--border)",
                        }}
                      >
                        {ev.title || "Busy"}
                      </div>
                    );
                  const over = lifted ? (overlapsOf(it)[0] ?? "") : "";
                  const tall = (it.end - it.start) * ppm - 2 >= 34;
                  return (
                    <EventBlock
                      key={it.id}
                      id={it.id}
                      title={ev.title}
                      tone={ev.tone ?? 1}
                      draft={!!it.draft}
                      top={g.top as number}
                      height={g.height as number}
                      left={g.left as string}
                      width={g.width as string}
                      zIndex={g.zIndex}
                      lifted={lifted}
                      selected={selected === it.id && !lifted}
                      tall={tall}
                      roomy={tall && (it.end - it.start) * ppm >= 52}
                      over={over}
                      live={lifted || rolling.has(it.id)}
                      naming={naming === it.id}
                      saving={saving.has(it.id)}
                      start={it.start}
                      end={it.end}
                      hour12={hour12}
                      reduced={reduced}
                      label={describe(ev, it) + (over ? `. Overlaps ${over}.` : "")}
                      keysId={`${uid}-event-keys`}
                      actions={actions}
                    />
                  );
                })}

                {gone.map((g) => (
                  <div
                    key={g.key}
                    aria-hidden="true"
                    className="pointer-events-none absolute overflow-hidden rounded-[8px] px-1.5 py-1 text-[12px] font-medium"
                    style={{ ...g.style, background: tint(g.ev.tone ?? 1, 13), boxShadow: ring(g.ev.tone ?? 1, 42) }}
                    ref={(el) => {
                      if (!el || el.dataset.out) return;
                      el.dataset.out = "1";
                      el.animate(
                        [
                          { opacity: 1, transform: "none", filter: "blur(0px)" },
                          { opacity: 0, transform: "scale(0.94)", filter: "blur(4px)" },
                        ],
                        { duration: 280, easing: EASE, fill: "forwards" },
                      ).onfinish = () => setGone((all) => all.filter((x) => x.key !== g.key));
                    }}
                  >
                    {g.ev.title || "New event"}
                  </div>
                ))}
              </div>

              {/* Now */}
              {today >= 0 && now && minutesOf(now) >= min && minutesOf(now) <= max && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute z-50 h-px bg-primary"
                  style={{
                    top: (minutesOf(now) - min) * ppm,
                    left: `${(today / span) * 100}%`,
                    width: `${100 / span}%`,
                    transition: reduced ? "none" : `top 1s ${EASE}`,
                  }}
                >
                  <span className="absolute -left-[3.5px] -top-[3px] size-[7px] rounded-full bg-primary" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p id={`${uid}-grid-keys`} className="sr-only">
        Arrow keys pick a time, Enter adds an event there, Page Up and Page Down change the {span === 1 ? "day" : "week"}. Tab moves to the events.
      </p>
      <p id={`${uid}-event-keys`} className="sr-only">
        Arrow keys move the event, Shift with up or down changes its length, Enter renames it, Delete removes it.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
