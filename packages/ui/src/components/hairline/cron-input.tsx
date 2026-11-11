"use client";

import * as React from "react";
import { CRON_FIELDS, cronTokens, describeCron, nextRuns, parseCron, parseSchedule, type CronParse, type CronSchedule } from "./cron-parse";
import { NumberRoll } from "./number-roll";
import { PillSelect } from "./pill-select";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * CRON INPUT: a schedule field people can read
 *
 *   type      a cron expression; each part has its name under
 *             it, and the part your caret is in lights up and
 *             gets a hairline that glides from part to part
 *   explain   the line below says it in words ("At 09:00,
 *             Monday to Friday") and crossfades as you type
 *   runs      the next five times it fires, in the schedule's
 *             time zone; hours and minutes roll as you edit
 *   english   "every weekday at 9am" works too: it's read as
 *             you type, and Enter turns the words into cron
 *   presets   a highlight slides to the preset that matches,
 *             and picking one morphs the expression into it:
 *             the parts both share stay where they are
 *   wrong     the part at fault turns red and says why; the last
 *             good runs stay, dimmed, so nothing jumps
 *   clocks    a run that a clock change skips or repeats says so
 * ───────────────────────────────────────────────────────── */

export interface CronPreset {
  label: string;
  expression: string;
}

export interface CronInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** The schedule, controlled: a cron expression. */
  value?: string;
  /** A cron expression, or a schedule in English ("every weekday at 9am"). */
  defaultValue?: string;
  /** Called with each valid expression (tidied) and what it means. */
  onValueChange?: (expression: string, schedule: CronSchedule) => void;
  /** The zone the schedule runs in. Many schedulers only run in UTC. */
  timeZone?: string;
  defaultTimeZone?: string;
  /** Zones to choose from; with two or more, the zone becomes a dropdown. */
  timeZones?: string[];
  onTimeZoneChange?: (timeZone: string) => void;
  /** How many upcoming runs to list; 0 hides the list. */
  runs?: number;
  /** Shortcuts above the field; [] hides them. */
  presets?: CronPreset[];
  /** Read schedules typed in English. */
  english?: boolean;
  /** 1:30pm instead of 13:30. */
  hour12?: boolean;
  /** Accessible name of the field. */
  label?: string;
  locales?: string | string[];
  disabled?: boolean;
  name?: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: "Every 15 min", expression: "*/15 * * * *" },
  { label: "Hourly", expression: "0 * * * *" },
  { label: "Daily 09:00", expression: "0 9 * * *" },
  { label: "Weekdays 09:00", expression: "0 9 * * 1-5" },
  { label: "Mondays 08:00", expression: "0 8 * * 1" },
  { label: "Monthly", expression: "0 0 1 * *" },
];

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FIELD_LABELS = ["minute", "hour", "day", "month", "weekday"];
const NAMES = new Set(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT", "L", "W"]);
/** The field's type: one size for the input, its measuring copy and its morphing copy. */
const TYPE = "font-mono text-[14.5px] tracking-[0.02em] [@media(pointer:coarse)]:text-[16px]";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const tidy = (text: string) => text.trim().split(/\s+/).join(" ");
/** English if any word isn't a cron name (MON, JAN, L). */
const looksEnglish = (text: string) => (text.match(/[a-z]+/gi) ?? ([] as string[])).some((w) => !NAMES.has(w.toUpperCase()) && !/^\d*L$/i.test(w));

function relative(ms: number) {
  const min = Math.round(ms / 60000);
  if (min < 1) return "in under a minute";
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  if (h < 36) return `in ${h} h`;
  const d = Math.round(h / 24);
  if (d < 14) return `in ${d} days`;
  if (d < 60) return `in ${Math.round(d / 7)} weeks`;
  const mo = Math.round(d / 30.4);
  if (mo < 24) return `in ${mo} months`;
  return `in ${Math.round(d / 365)} years`;
}

function zoneOffset(timeZone: string) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName");
    return part?.value.replace("GMT", "UTC") ?? "";
  } catch {
    return "";
  }
}
const cityOf = (tz: string) => (tz === "UTC" ? "UTC" : (tz.split("/").pop() ?? tz).replace(/_/g, " "));

/** A sentence that changes crossfades whole: the old one lifts away through a blur while the new one rises in. */
function Line({ text, reduced }: { text: string; reduced: boolean }) {
  const [shown, setShown] = React.useState({ text, key: 0 });
  const [leaving, setLeaving] = React.useState<{ text: string; key: number }[]>([]);
  if (text !== shown.text) {
    if (shown.text && !reduced) setLeaving((l) => [...l.slice(-2), shown]);
    setShown({ text, key: shown.key + 1 });
  }
  return (
    <span className="relative block">
      <span
        key={shown.key}
        className="block"
        ref={(el) => {
          if (!el || reduced || shown.key === 0 || el.dataset.in) return;
          el.dataset.in = "1";
          el.animate(
            [
              { opacity: 0, transform: "translateY(0.3em)", filter: "blur(4px)" },
              { opacity: 1, transform: "none", filter: "blur(0px)" },
            ],
            { duration: 380, delay: 60, easing: EASE, fill: "backwards" },
          );
        }}
      >
        {shown.text || " "}
      </span>
      {leaving.map((l) => (
        <span
          key={l.key}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 block"
          ref={(el) => {
            if (!el || el.dataset.out) return;
            el.dataset.out = "1";
            el.animate(
              [
                { opacity: 1, transform: "none", filter: "blur(0px)" },
                { opacity: 0, transform: "translateY(-0.3em)", filter: "blur(4px)" },
              ],
              { duration: 180, easing: EASE, fill: "forwards" },
            ).onfinish = () => setLeaving((all) => all.filter((x) => x.key !== l.key));
          }}
        >
          {l.text}
        </span>
      ))}
    </span>
  );
}

/** The expression on its way from one text to another: TextMorph, started from what the field showed. */
function MorphOnce({ from, to, onDone }: { from: string; to: string; onDone: () => void }) {
  const [text, setText] = React.useState(from);
  React.useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setText(to))));
    const timer = window.setTimeout(onDone, 820);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      window.clearTimeout(timer);
    };
  }, [to, onDone]);
  return (
    <TextMorph animateWidth={false} className="whitespace-pre">
      {text}
    </TextMorph>
  );
}

export function CronInput({
  value,
  defaultValue = "0 9 * * 1-5",
  onValueChange,
  timeZone,
  defaultTimeZone = "UTC",
  timeZones,
  onTimeZoneChange,
  runs: runCount = 5,
  presets = CRON_PRESETS,
  english = true,
  hour12 = false,
  label = "Schedule",
  locales,
  disabled = false,
  name,
  className = "",
  ...props
}: CronInputProps) {
  const uid = React.useId();
  const reduced = useReducedMotion();
  // A default written in English starts as those words, already read as cron.
  const [own, setOwn] = React.useState(() => (parseCron(defaultValue).ok || !english ? tidy(defaultValue) : (parseSchedule(defaultValue) ?? tidy(defaultValue))));
  const committed = value !== undefined ? tidy(value) : own;
  const [text, setText] = React.useState(() => (value !== undefined ? tidy(value) : defaultValue.trim()));
  const [ownZone, setOwnZone] = React.useState(defaultTimeZone);
  const zone = timeZone ?? ownZone;
  const [caret, setCaret] = React.useState<number | null>(null);
  const [focused, setFocused] = React.useState(false);
  const [morph, setMorph] = React.useState<{ from: string; to: string; key: number } | null>(null);
  const [marks, setMarks] = React.useState<{ x: number; w: number }[]>([]);
  const [labelX, setLabelX] = React.useState<number[]>([]);
  const [now, setNow] = React.useState<Date | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const [presetMark, setPresetMark] = React.useState({ x: 0, w: 0, on: false, slide: false });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const labelRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const labelRow = React.useRef<HTMLDivElement>(null);
  const mirrorRef = React.useRef<HTMLSpanElement>(null);
  const presetRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [morphSeq, setMorphSeq] = React.useState(0);
  const [lastGood, setLastGood] = React.useState<CronSchedule | null>(null);

  // What the text means: cron, English that reads as cron, or a problem with a part to point at.
  const read = React.useMemo(() => {
    const cron = parseCron(text);
    if (cron.ok) return { kind: "cron" as const, schedule: cron.schedule };
    if (english && looksEnglish(text)) {
      const converted = parseSchedule(text);
      const parsed = converted ? parseCron(converted) : null;
      if (parsed?.ok) return { kind: "english" as const, schedule: parsed.schedule };
      return { kind: "error" as const, message: "Couldn’t read that. Try “every weekday at 9am” or cron like 0 9 * * 1-5.", field: null as number | null };
    }
    const bad = cron as Extract<CronParse, { ok: false }>;
    return { kind: "error" as const, message: bad.message, field: bad.field };
  }, [text, english]);
  const schedule = read.kind === "error" ? null : read.schedule;
  if (schedule && lastGood !== schedule) {
    setLastGood(schedule);
  }
  const shownSchedule = schedule ?? lastGood;

  // A new value from outside morphs in.
  const [seen, setSeen] = React.useState(committed);
  if (committed !== seen) {
    setSeen(committed);
    if (tidy(text) !== committed) {
      const nextKey = morphSeq + 1;
      setMorphSeq(nextKey);
      if (!reduced) setMorph({ from: text, to: committed, key: nextKey });
      setText(committed);
    }
  }

  // Each valid cron expression is passed on as it's typed.
  if (value === undefined && read.kind === "cron" && read.schedule.expression !== own) {
    setOwn(read.schedule.expression);
    setSeen(read.schedule.expression);
  }

  React.useEffect(() => {
    if (read.kind === "cron" && read.schedule.expression !== committed) {
      onValueChange?.(read.schedule.expression, read.schedule);
    }
  }, [read, committed, onValueChange]);

  const morphTo = (next: string) => {
    if (!reduced && next !== text) {
      setMorphSeq((k) => {
        const nextKey = k + 1;
        setMorph((m) => ({ from: m ? m.to : text, to: next, key: nextKey }));
        return nextKey;
      });
    }
    setText(next);
  };
  const morphDone = React.useCallback(() => setMorph(null), []);

  // English becomes cron on Enter or when you leave the field.
  const settle = () => {
    if (read.kind === "english") {
      morphTo(read.schedule.expression);
      setAnnounce(`Set to ${read.schedule.expression}: ${describeCron(read.schedule, { hour12 })}`);
    }
  };

  // The clock for "in 3 h", re-read on each new minute (and only after mount, so the server's render matches).
  React.useEffect(() => {
    let timer = 0;
    const tick = () => {
      setNow(new Date());
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  const upcoming = React.useMemo(() => (shownSchedule && now && runCount ? nextRuns(shownSchedule, { from: now, count: runCount, timeZone: zone }) : []), [shownSchedule, now, runCount, zone]);

  // Where each part sits in the field, measured from a copy of the text in the same type.
  const tokens = React.useMemo(() => (read.kind === "english" ? [] : cronTokens(text)), [read.kind, text]);
  React.useLayoutEffect(() => {
    const mirror = mirrorRef.current;
    const input = inputRef.current;
    const node = mirror?.firstChild;
    if (!mirror || !input) return;
    const base = mirror.getBoundingClientRect().left;
    const next = tokens.slice(0, 6).map((t) => {
      if (!node) return { x: 0, w: 0 };
      const range = document.createRange();
      range.setStart(node, Math.min(t.start, node.textContent!.length));
      range.setEnd(node, Math.min(t.end, node.textContent!.length));
      const r = range.getBoundingClientRect();
      return { x: r.left - base - input.scrollLeft, w: r.width };
    });
    setMarks((prev) => (prev.length === next.length && prev.every((p, i) => Math.abs(p.x - next[i].x) < 0.5 && Math.abs(p.w - next[i].w) < 0.5) ? prev : next));
  }, [tokens]);

  // Each name sits centred under its part, nudged along so none overlap or run past the edges.
  React.useLayoutEffect(() => {
    const row = labelRow.current;
    if (!row) return;
    const ws = FIELD_LABELS.map((_, i) => labelRefs.current[i]?.offsetWidth ?? 0);
    const xs = FIELD_LABELS.map((_, i) => (marks[i] ? marks[i].x + marks[i].w / 2 - ws[i] / 2 : 0));
    const n = Math.min(marks.length, FIELD_LABELS.length);
    for (let i = 0; i < n; i++) xs[i] = Math.max(xs[i], i ? xs[i - 1] + ws[i - 1] + 8 : 0);
    for (let i = n - 1; i >= 0; i--) xs[i] = Math.min(xs[i], i === n - 1 ? row.offsetWidth - ws[i] : xs[i + 1] - 8 - ws[i]);
    setLabelX((prev) => (prev.length === xs.length && prev.every((x, i) => Math.abs(x - xs[i]) < 0.5) ? prev : xs));
  }, [marks]);

  const activeField = caret === null || !focused ? -1 : tokens.findIndex((t) => caret >= t.start && caret <= t.end);
  const badField = read.kind === "error" ? read.field : null;
  const underline = badField !== null && badField < marks.length ? badField : activeField;

  // The highlight slides to the preset the schedule matches.
  const presetIndex = schedule ? presets.findIndex((p) => tidy(p.expression) === schedule.expression) : -1;
  React.useLayoutEffect(() => {
    const el = presetRefs.current[presetIndex];
    setPresetMark((m) => (el ? (m.x === el.offsetLeft && m.w === el.offsetWidth && m.on ? m : { x: el.offsetLeft, w: el.offsetWidth, on: true, slide: m.on }) : m.on ? { ...m, on: false, slide: false } : m));
  }, [presetIndex, presets]);

  // The meaning, said once typing settles.
  const sentence = schedule ? describeCron(schedule, { hour12 }) : "";
  React.useEffect(() => {
    if (!focused) return;
    const t = window.setTimeout(() => setAnnounce(read.kind === "error" ? read.message : sentence), 900);
    return () => window.clearTimeout(t);
  }, [sentence, read, focused]);

  const lineText =
    read.kind === "error" ? read.message : read.kind === "english" ? `${sentence}. Press Enter to use ${read.schedule.expression}` : sentence;
  const dateFmt = React.useMemo(() => new Intl.DateTimeFormat(locales ?? "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }), [locales]);
  const yearFmt = React.useMemo(() => new Intl.DateTimeFormat(locales ?? "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }), [locales]);
  const zoneOptions = React.useMemo(() => (timeZones ?? []).map((tz) => ({ value: tz, label: cityOf(tz), description: `${tz} · ${zoneOffset(tz)}` })), [timeZones]);
  const nowYear = now?.getUTCFullYear();
  const errorTone = "text-red-600 dark:text-red-400";

  return (
    <div className={`w-full text-foreground ${className}`} {...props}>
      {presets.length > 0 && (
        <div
          role="group"
          aria-label="Presets"
          className="relative -mx-1 mb-2.5 flex gap-1 overflow-x-auto px-1 pb-0.5 [mask-image:linear-gradient(to_right,transparent,black_6px,black_calc(100%_-_20px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-7 rounded-full bg-accent shadow-[inset_0_0_0_1px_var(--border)]"
            style={{
              width: presetMark.w,
              transform: `translateX(${presetMark.x}px)`,
              opacity: presetMark.on ? 1 : 0,
              transition: reduced ? "none" : `${presetMark.slide ? `transform 380ms ${EASE}, width 380ms ${EASE}, ` : ""}opacity 200ms ${EASE}`,
            }}
          />
          {presets.map((p, i) => (
            <button
              key={p.expression}
              ref={(el) => {
                presetRefs.current[i] = el;
              }}
              type="button"
              disabled={disabled}
              aria-pressed={i === presetIndex}
              onClick={() => {
                morphTo(tidy(p.expression));
                inputRef.current?.focus({ preventScroll: true });
              }}
              className={`relative h-7 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-default ${
                i === presetIndex ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button, input")) return;
          e.preventDefault();
          inputRef.current?.focus();
        }}
        className={`rounded-[14px] border bg-background px-3 pb-1.5 pt-2 transition-[border-color] duration-200 ${disabled ? "opacity-60" : "cursor-text"}`}
        style={{
          borderColor:
            read.kind === "error" && !focused
              ? "color-mix(in oklab, #ef4444 45%, var(--border))"
              : focused
                ? "color-mix(in oklab, var(--ring) 55%, var(--border))"
                : "var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              value={text}
              disabled={disabled}
              aria-label={label}
              aria-invalid={read.kind === "error" || undefined}
              aria-describedby={`${uid}-line`}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => {
                setText(e.target.value);
                setCaret(e.target.selectionStart);
              }}
              onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                settle();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  settle();
                } else if (e.key === "Escape" && tidy(text) !== committed) {
                  e.preventDefault();
                  e.stopPropagation();
                  morphTo(committed);
                }
              }}
              placeholder="0 9 * * 1-5"
              className={`h-8 w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-default ${TYPE}`}
              style={{ wordSpacing: read.kind === "english" ? "normal" : "1.1em", color: morph ? "transparent" : undefined, caretColor: morph ? "var(--foreground)" : undefined }}
            />
            {/* A copy of the text in the same type, measured to place each part's name under it. */}
            <span
              ref={mirrorRef}
              aria-hidden="true"
              className={`pointer-events-none invisible absolute left-0 top-0 whitespace-pre ${TYPE}`}
              style={{ wordSpacing: read.kind === "english" ? "normal" : "1.1em" }}
            >
              {text}
            </span>
            {morph && (
              <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-pre ${TYPE}`} style={{ wordSpacing: "1.1em" }}>
                <MorphOnce key={morph.key} from={morph.from} to={morph.to} onDone={morphDone} />
              </span>
            )}
            {/* The part you're in, or the part at fault: a hairline that glides from part to part. */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute -bottom-px left-0 h-px ${badField !== null ? "bg-red-500" : "bg-primary"}`}
              style={{
                width: marks[underline]?.w ?? 0,
                transform: `translateX(${marks[underline]?.x ?? 0}px)`,
                opacity: underline >= 0 && marks[underline] && !morph ? 1 : 0,
                transition: reduced ? "none" : `transform 300ms ${EASE}, width 300ms ${EASE}, opacity 200ms ${EASE}`,
              }}
            />
          </div>
          {zoneOptions.length > 1 ? (
            <PillSelect
              label="Time zone"
              options={zoneOptions}
              value={zone}
              align="end"
              width={250}
              display={(o) => o?.label ?? cityOf(zone)}
              onValueChange={(tz) => {
                if (timeZone === undefined) setOwnZone(tz);
                onTimeZoneChange?.(tz);
              }}
            />
          ) : (
            <span className="shrink-0 text-[12px] font-medium text-muted-foreground">{cityOf(zone)}</span>
          )}
        </div>

        {/* The name of each part, under it; folds away while you write in English. */}
        <div className="grid" style={{ gridTemplateRows: read.kind === "english" ? "0fr" : "1fr", transition: reduced ? "none" : `grid-template-rows 320ms ${EASE}` }}>
          <div className="min-h-0 overflow-hidden">
            <div ref={labelRow} aria-hidden="true" className="relative mt-0.5 h-4 text-[10.5px] leading-4">
              {FIELD_LABELS.map((name, i) => {
                const m = marks[i];
                const tone = badField === i ? errorTone : activeField === i ? "text-foreground" : "text-muted-foreground";
                return (
                  <span
                    key={name}
                    ref={(el) => {
                      labelRefs.current[i] = el;
                    }}
                    className={`absolute left-0 top-0 whitespace-nowrap transition-colors duration-200 ${tone}`}
                    style={{
                      transform: `translateX(${labelX[i] ?? i * 48}px)`,
                      opacity: m && read.kind !== "english" ? 1 : 0,
                      transition: reduced ? "none" : `transform 340ms ${EASE}, opacity 200ms ${EASE}, color 200ms`,
                    }}
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p id={`${uid}-line`} className={`mt-2 min-h-[1.45em] pl-1 text-[12.5px] leading-[1.45] transition-colors duration-300 ${read.kind === "error" ? errorTone : "text-muted-foreground"}`}>
        <Line text={lineText} reduced={reduced} />
      </p>

      {runCount > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-baseline justify-between gap-3 text-[11.5px] text-muted-foreground">
            <span className="font-medium">Next runs</span>
            <span className="truncate">
              {zone === "UTC" ? "Times in UTC" : `Times in ${cityOf(zone)} · ${zoneOffset(zone)}`}
            </span>
          </div>
          {now && upcoming.length === 0 && shownSchedule && (
            <p className={`mt-2 text-[12.5px] ${errorTone}`}>This never runs: no date in the next six years matches it.</p>
          )}
          <ol
            aria-label="Next runs"
            className="mt-1.5 transition-opacity duration-300"
            style={{ opacity: schedule ? 1 : 0.45, transitionTimingFunction: EASE }}
          >
            {upcoming.map((r, i) => {
              const w = r.wall;
              const dayDate = new Date(Date.UTC(w.year, w.month - 1, w.day));
              const day = (w.year === nowYear ? dateFmt : yearFmt).format(dayDate);
              const h = hour12 ? w.hour % 12 || 12 : w.hour;
              const note = r.skipped
                ? `Clocks go forward that night: ${String(w.hour).padStart(2, "0")}:${String(w.minute).padStart(2, "0")} doesn’t happen in ${cityOf(zone)}.`
                : r.repeated
                  ? `Clocks go back that night: ${String(w.hour).padStart(2, "0")}:${String(w.minute).padStart(2, "0")} happens twice in ${cityOf(zone)}.`
                  : null;
              return (
                <li key={i} className="border-b border-border/60 py-1.5 last:border-b-0">
                  <span className="sr-only">
                    {day}, {String(w.hour).padStart(2, "0")}:{String(w.minute).padStart(2, "0")}, {now ? relative(r.at.getTime() - now.getTime()) : ""}
                    {note ? `. ${note}` : ""}
                  </span>
                  <span aria-hidden="true" className="flex items-baseline gap-3 text-[13px]">
                    <span className="w-[6.5rem] shrink-0">
                      <TextMorph>{day}</TextMorph>
                    </span>
                    <span className="inline-flex font-medium tabular-nums">
                      <NumberRoll value={h} format={hour12 ? undefined : { minimumIntegerDigits: 2 }} duration={700} />
                      <span>:</span>
                      <NumberRoll value={w.minute} format={{ minimumIntegerDigits: 2 }} duration={700} />
                      {hour12 && <TextMorph className="ml-0.5">{w.hour < 12 ? "am" : "pm"}</TextMorph>}
                    </span>
                    {note && (
                      <svg viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0 self-center text-amber-600 dark:text-amber-400">
                        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 4.75v3.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                        <circle cx="8" cy="11" r="1" fill="currentColor" />
                      </svg>
                    )}
                    <span className="ml-auto truncate text-[12px] text-muted-foreground">
                      <TextMorph>{now ? relative(r.at.getTime() - now.getTime()) : ""}</TextMorph>
                    </span>
                  </span>
                  {note && <span className="mt-0.5 block text-[11.5px] leading-snug text-amber-700 dark:text-amber-400">{note}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {name && <input type="hidden" name={name} value={committed} />}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

export { describeCron, nextRuns, parseCron, parseSchedule };
export type { CronSchedule };
export { CRON_FIELDS };
