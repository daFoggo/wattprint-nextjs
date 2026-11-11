"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Field, fieldSurface, useFieldIds, useShake } from "./field";
import { enterStyle, themeVars, useDismiss, useFloating, usePresence } from "./floating";
import { TextMorph } from "./text-morph";
import { EASE_OUT, EASE_THROW, INTERACTION_FOCUS, INTERACTION_PRESS, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * DATE PICKER: one date, typed or picked
 *
 *   type     the field reads what people write: "tomorrow",
 *            "next fri", "in 3 days", "4 nov", "2026-11-04"; Enter
 *            or leaving the field settles it into "Wed 4 Nov 2026",
 *            and anything it can't read shakes and says so
 *   pick     the calendar rises off the field; months slide in from
 *            the side you moved toward while the month name morphs;
 *            the chosen day's mark glides from day to day
 *   keys     arrows move a day or a week, Page Up/Down a month,
 *            Home/End the week's ends, Enter picks, Escape closes
 *
 * Values are plain "YYYY-MM-DD" strings: no time zones to trip on.
 * ───────────────────────────────────────────────────────── */

export interface DatePickerProps {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  /** Earliest and latest allowed days, "YYYY-MM-DD". */
  min?: string;
  max?: string;
  /** 1 = Monday (default), 0 = Sunday. */
  weekStartsOn?: 0 | 1;
  locale?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

// ── Plain-date helpers (UTC under the hood so no zone shifts a day) ──
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const fromISO = (s: string) => new Date(`${s}T00:00:00Z`);
const addDays = (s: string, n: number) => {
  const d = fromISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};
const addMonths = (s: string, n: number) => {
  const d = fromISO(s);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toISO(d);
};
const monthOf = (s: string) => s.slice(0, 7);
const localToday = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
const subscribeDay = (cb: () => void) => {
  const t = window.setInterval(cb, 60_000);
  return () => window.clearInterval(t);
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Reads a typed date relative to `today`; null if it can't. */
export function parseDate(input: string, today: string): string | null {
  const t = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return null;
  if (t === "today" || t === "now") return today;
  if (t === "tomorrow" || t === "tmr") return addDays(today, 1);
  if (t === "yesterday") return addDays(today, -1);
  let m = t.match(/^(?:in )?\+?(\d+) ?(d|day|days|w|wk|week|weeks|m|mo|month|months)(?: from now)?$/);
  if (m) {
    const n = Number(m[1]);
    return m[2].startsWith("m") ? addMonths(today, n) : addDays(today, m[2].startsWith("w") ? n * 7 : n);
  }
  m = t.match(/^(next |this )?(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/);
  if (m) {
    const want = DAYS.indexOf(m[2]);
    const now = fromISO(today).getUTCDay();
    let diff = (want - now + 7) % 7;
    if (diff === 0 || m[1] === "next ") diff = diff === 0 ? 7 : diff;
    return addDays(today, diff);
  }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  // "4 nov", "4 november 2027", "nov 4", "november 4, 2027"
  m = t.match(/^(\d{1,2})(?:st|nd|rd|th)? ([a-z]{3})[a-z]*,? ?(\d{4})?$/) ?? null;
  if (m) return withYear(+m[1], MONTHS.indexOf(m[2]) + 1, m[3], today);
  m = t.match(/^([a-z]{3})[a-z]* (\d{1,2})(?:st|nd|rd|th)?,? ?(\d{4})?$/);
  if (m) return withYear(+m[2], MONTHS.indexOf(m[1]) + 1, m[3], today);
  // 4/11/2026 reads day first
  m = t.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/);
  if (m) return withYear(+m[1], +m[2], m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : undefined, today);
  return null;
}
function valid(y: number, mo: number, d: number) {
  if (mo < 1 || mo > 12 || d < 1) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCMonth() === mo - 1 ? toISO(date) : null;
}
function withYear(d: number, mo: number, y: string | undefined, today: string) {
  if (mo < 1) return null;
  if (y) return valid(+y, mo, d);
  const thisYear = valid(+today.slice(0, 4), mo, d);
  // No year: the next time that date comes round.
  return thisYear && thisYear < today ? valid(+today.slice(0, 4) + 1, mo, d) : thisYear;
}

function Arrow({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
      <path d={back ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DatePicker({
  value,
  defaultValue = null,
  onValueChange,
  label,
  hint,
  error,
  placeholder = "Pick a date or type one",
  min,
  max,
  weekStartsOn = 1,
  locale = "en-GB",
  id,
  disabled,
  className = "",
}: DatePickerProps) {
  const reduced = useInteractionReducedMotion();
  const ids = useFieldIds(id);
  const today = React.useSyncExternalStore(subscribeDay, localToday, () => null);
  const [own, setOwn] = React.useState<string | null>(defaultValue);
  const current = value !== undefined ? value : own;
  const [draft, setDraft] = React.useState<string | null>(null);
  const [badInput, setBadInput] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => monthOf(current ?? defaultValue ?? "2026-01-01"));
  const [focusDay, setFocusDay] = React.useState<string | null>(null);
  const [dir, setDir] = React.useState(0);
  const anchor = React.useRef<HTMLDivElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const grid = React.useRef<HTMLDivElement>(null);
  const { mounted, shown } = usePresence(open, 180);
  const place = useFloating({ open: mounted, anchor, floating: surface, side: "bottom", align: "start", offset: 6 });
  const [vars, setVars] = React.useState<React.CSSProperties>({});
  const shakeRef = useShake<HTMLDivElement>(badInput || !!error);
  const [mark, setMark] = React.useState<{ x: number; y: number } | null>(null);
  const [markReady, setMarkReady] = React.useState(false);

  const fmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }), [locale]);
  const monthFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }), [locale]);
  const dayFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), [locale]);
  const headFmt = React.useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }), [locale]);

  const allowed = (d: string) => (!min || d >= min) && (!max || d <= max);
  const commit = (next: string | null) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  const settle = () => {
    if (draft === null) return;
    const text = draft.trim();
    if (!text) {
      setDraft(null);
      setBadInput(false);
      return commit(null);
    }
    const parsed = parseDate(text, today ?? localToday());
    if (!parsed || !allowed(parsed)) return setBadInput(true);
    setDraft(null);
    setBadInput(false);
    setView(monthOf(parsed));
    commit(parsed);
  };

  const openCalendar = () => {
    const start = current ?? today ?? localToday();
    setView(monthOf(start));
    setFocusDay(start);
    setDir(0);
    setOpen(true);
  };
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) document.getElementById(ids.id)?.focus();
  };
  useDismiss(open, (reason) => close(reason === "escape"), [anchor, surface]);

  React.useLayoutEffect(() => {
    if (mounted) setVars(themeVars(anchor.current));
  }, [mounted]);

  // Days of the shown month, padded to whole weeks.
  const days = React.useMemo(() => {
    const first = fromISO(`${view}-01`);
    const lead = (first.getUTCDay() - weekStartsOn + 7) % 7;
    const start = addDays(`${view}-01`, -lead);
    const count = Math.ceil((lead + new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()) / 7) * 7;
    return Array.from({ length: count }, (_, i) => addDays(start, i));
  }, [view, weekStartsOn]);

  const goMonth = (n: number) => {
    setDir(n);
    setView((v) => monthOf(addMonths(`${v}-01`, n)));
    setFocusDay((f) => (f ? addMonths(f, n) : f));
  };

  // The chosen day's mark glides within a month; a new month slides in from its side.
  React.useLayoutEffect(() => {
    const g = grid.current;
    if (!g) return;
    const measure = () => {
      const el = current ? g.querySelector<HTMLElement>(`[data-day="${current}"]`) : null;
      setMark((p) => (el ? (p && p.x === el.offsetLeft && p.y === el.offsetTop ? p : { x: el.offsetLeft, y: el.offsetTop }) : null));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(g);
    return () => ro.disconnect();
  }, [current, view, mounted]);
  React.useEffect(() => {
    if (!mark || markReady) return;
    const f = requestAnimationFrame(() => setMarkReady(true));
    return () => cancelAnimationFrame(f);
  }, [mark, markReady]);
  React.useLayoutEffect(() => {
    if (!dir || reduced) return;
    grid.current?.animate(
      [
        { opacity: 0, transform: `translateX(${dir * 24}px)`, filter: "blur(4px)" },
        { opacity: 1, transform: "none", filter: "blur(0px)" },
      ],
      { duration: 360, easing: EASE_OUT },
    );
  }, [view, dir, reduced]);

  // Keep keyboard focus on the focused day once the calendar is up.
  React.useEffect(() => {
    if (!open || !shown || !focusDay) return;
    grid.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true });
  }, [open, shown, focusDay, view]);

  const onGridKey = (e: React.KeyboardEvent) => {
    if (!focusDay) return;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      PageUp: () => addMonths(focusDay, -1),
      PageDown: () => addMonths(focusDay, 1),
      Home: () => addDays(focusDay, -((fromISO(focusDay).getUTCDay() - weekStartsOn + 7) % 7)),
      End: () => addDays(focusDay, 6 - ((fromISO(focusDay).getUTCDay() - weekStartsOn + 7) % 7)),
    };
    if (e.key in moves) {
      e.preventDefault();
      const next = moves[e.key]();
      if (monthOf(next) !== view) {
        setDir(next > focusDay ? 1 : -1);
        setView(monthOf(next));
      }
      setFocusDay(next);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (allowed(focusDay)) {
        commit(focusDay);
        close(true);
      }
    }
  };

  const shownText = draft ?? (current ? fmt.format(fromISO(current)) : "");
  const describedBy = [hint && !error && !badInput ? ids.hint : null, error || badInput ? ids.error : null].filter(Boolean).join(" ") || undefined;

  return (
    <Field id={ids.id} label={label} hint={hint} error={error ?? (badInput ? "Couldn't read that date. Try “tomorrow” or “4 Nov”." : undefined)} className={className}>
      <div ref={anchor}>
        <div ref={shakeRef} className={`${fieldSurface({ invalid: !!error || badInput, disabled })} h-9 text-[16px] sm:text-[13.5px]`}>
          <input
            id={ids.id}
            value={shownText}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={error || badInput ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) => {
              setDraft(e.target.value);
              setBadInput(false);
            }}
            onBlur={(e) => {
              if (!surface.current?.contains(e.relatedTarget as Node)) settle();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                settle();
              } else if (e.key === "ArrowDown" && e.altKey) {
                e.preventDefault();
                openCalendar();
              }
            }}
            className="h-full min-w-0 flex-1 bg-transparent pl-4 pr-1 outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="button"
            aria-label="Choose date"
            aria-haspopup="dialog"
            aria-expanded={open}
            disabled={disabled}
            onClick={() => (open ? close(false) : openCalendar())}
            className={`mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
              <rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {mounted &&
        createPortal(
          <div
            ref={surface}
            role="dialog"
            aria-label="Choose date"
            className="fixed left-0 top-0 z-[55] w-[284px] rounded-[18px] bg-popover p-3 text-popover-foreground shadow-[0_0_0_1px_var(--border)]"
            style={{ ...vars, left: place.x, top: place.y, transformOrigin: place.origin, ...enterStyle(shown, place.side, reduced) }}
          >
            <div className="mb-2 flex items-center justify-between pl-2">
              <span className="text-[13.5px] font-medium text-foreground" aria-live="polite">
                <TextMorph>{monthFmt.format(fromISO(`${view}-01`))}</TextMorph>
              </span>
              <div className="flex">
                {[-1, 1].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={n < 0 ? "Previous month" : "Next month"}
                    onClick={() => goMonth(n)}
                    className={`flex size-7 items-center justify-center rounded-full text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
                  >
                    <Arrow back={n < 0} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-7 pb-1 text-center text-[11px] text-muted-foreground" aria-hidden="true">
              {days.slice(0, 7).map((d) => (
                <span key={d}>{headFmt.format(fromISO(d))}</span>
              ))}
            </div>
            <div ref={grid} role="grid" aria-label={monthFmt.format(fromISO(`${view}-01`))} onKeyDown={onGridKey} className="relative grid grid-cols-7 gap-y-0.5">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 size-9 rounded-full bg-primary"
                style={{
                  transform: `translate3d(${mark?.x ?? 0}px, ${mark?.y ?? 0}px, 0)`,
                  opacity: mark ? 1 : 0,
                  transition: reduced || !markReady ? "none" : `transform 420ms ${EASE_THROW}, opacity 200ms ${EASE_OUT}`,
                }}
              />
              {days.map((d) => {
                const inMonth = monthOf(d) === view;
                const on = d === current;
                const ok = allowed(d);
                return (
                  <button
                    key={d}
                    type="button"
                    role="gridcell"
                    data-day={d}
                    aria-selected={on}
                    aria-label={dayFmt.format(fromISO(d))}
                    aria-current={d === today ? "date" : undefined}
                    tabIndex={d === focusDay ? 0 : -1}
                    disabled={!ok}
                    onClick={() => {
                      commit(d);
                      setDraft(null);
                      setBadInput(false);
                      close(true);
                    }}
                    className={`relative z-10 mx-auto flex size-9 items-center justify-center rounded-full text-[13px] tabular-nums cursor-pointer transition-colors duration-200 disabled:cursor-default disabled:opacity-30 ${INTERACTION_FOCUS} focus-visible:ring-offset-0 ${
                      on ? "text-primary-foreground" : inMonth ? "text-foreground hover:bg-accent" : "text-muted-foreground/50 hover:bg-accent"
                    } ${d === today && !on ? "shadow-[inset_0_0_0_1px_var(--border)]" : ""}`}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2">
              <button type="button" onClick={() => { const t = today ?? localToday(); commit(t); setDraft(null); close(true); }} className={`h-7 rounded-full px-2.5 text-[12.5px] font-medium text-foreground cursor-pointer hover:bg-accent ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}>
                Today
              </button>
              {current && (
                <button type="button" onClick={() => { commit(null); setDraft(null); close(true); }} className={`h-7 rounded-full px-2.5 text-[12.5px] text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}>
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </Field>
  );
}

export default DatePicker;
