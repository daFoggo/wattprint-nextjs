"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Field, fieldSurface, useFieldIds, useShake } from "./field";
import { enterStyle, themeVars, useDismiss, useFloating, usePresence } from "./floating";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";
import { Wheel, WheelPicker } from "./wheel-picker";
import { EASE_OUT, INTERACTION_FOCUS, INTERACTION_PRESS, useInteractionReducedMotion } from "./ui-interaction-motion";

export interface TimePickerProps {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  hour12?: boolean;
  minuteStep?: number;
  min?: string;
  max?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

const MINUTES = 24 * 60;
const pad = (n: number) => String(n).padStart(2, "0");
const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const timeOf = (minutes: number) => {
  const wrapped = ((minutes % MINUTES) + MINUTES) % MINUTES;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
};

export function parseTime(input: string): string | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, "").replace(".", ":");
  const match = text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/);
  if (!match) return null;
  let h = Number(match[1]);
  const m = Number(match[2] ?? 0);
  const period = match[3];
  if (m > 59) return null;
  if (period) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (period.startsWith("p") ? 12 : 0);
  } else if (h > 23) return null;
  return `${pad(h)}:${pad(m)}`;
}

function snapTime(time: string, step: number) {
  return timeOf(Math.round(minutesOf(time) / step) * step);
}

function clampTime(time: string, min?: string, max?: string) {
  const value = minutesOf(time);
  if (min && value < minutesOf(min)) return min;
  if (max && value > minutesOf(max)) return max;
  return time;
}

function formatTime(time: string, hour12: boolean) {
  const [h, m] = time.split(":").map(Number);
  if (!hour12) return `${pad(h)}:${pad(m)}`;
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.35" />
      <path d="M8 4.75V8l2.25 1.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TimePicker({
  value,
  defaultValue = null,
  onValueChange,
  hour12 = false,
  minuteStep = 5,
  min,
  max,
  label,
  hint,
  error,
  placeholder = "Choose a time",
  disabled,
  name,
  id,
  className = "",
}: TimePickerProps) {
  const reduced = useInteractionReducedMotion();
  const ids = useFieldIds(id);
  const [own, setOwn] = React.useState<string | null>(defaultValue);
  const current = value !== undefined ? value : own;
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [badInput, setBadInput] = React.useState(false);
  const anchor = React.useRef<HTMLDivElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const shakeRef = useShake<HTMLDivElement>(badInput);
  const { mounted, shown } = usePresence(open, 180);
  const place = useFloating({ open: mounted, anchor, floating: surface, side: "bottom", align: "start", offset: 6 });
  const [vars, setVars] = React.useState<React.CSSProperties>({});
  const step = Math.max(1, Math.min(60, Math.round(minuteStep)));
  const selected = snapTime(parseTime(current ?? "") ?? "09:00", step);
  const selectedHour = Number(selected.slice(0, 2));
  const selectedMinute = Number(selected.slice(3));
  const hourOptions = React.useMemo(() => Array.from({ length: hour12 ? 12 : 24 }, (_, i) => (hour12 ? i + 1 : i)), [hour12]);
  const minuteOptions = React.useMemo(() => Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step).filter((n) => n < 60), [step]);
  const periodOptions = React.useMemo(() => ["AM", "PM"] as const, []);
  const shownText = current ? formatTime(current, hour12) : placeholder;

  React.useLayoutEffect(() => {
    if (mounted) setVars(themeVars(anchor.current));
  }, [mounted]);

  React.useEffect(() => {
    if (!open) return;
    input.current?.focus({ preventScroll: true });
    input.current?.select();
  }, [open]);

  const commit = (next: string | null) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  const close = (refocus: boolean) => {
    setOpen(false);
    setBadInput(false);
    if (refocus) trigger.current?.focus({ preventScroll: true });
  };
  useDismiss(open, (reason) => close(reason === "escape"), [anchor, surface]);

  const openPanel = () => {
    setDraft(current ?? "");
    setBadInput(false);
    setOpen(true);
  };

  const change = (next: string) => {
    const snapped = clampTime(snapTime(next, step), min, max);
    commit(snapped);
    setDraft(snapped);
    setBadInput(false);
  };

  const settle = (closeAfter: boolean) => {
    if (!draft.trim()) {
      commit(null);
      if (closeAfter) close(true);
      return true;
    }
    const parsed = parseTime(draft);
    const next = parsed ? snapTime(parsed, step) : null;
    if (!next || (min && minutesOf(next) < minutesOf(min)) || (max && minutesOf(next) > minutesOf(max))) {
      setBadInput(true);
      return false;
    }
    commit(next);
    setDraft(next);
    setBadInput(false);
    if (closeAfter) close(true);
    return true;
  };

  const changeHour = (hour: number) => {
    const nextHour = hour12 ? (hour % 12) + (selectedHour >= 12 ? 12 : 0) : hour;
    change(`${pad(nextHour)}:${pad(selectedMinute)}`);
  };
  const changePeriod = (period: "AM" | "PM") => {
    const nextHour = (selectedHour % 12) + (period === "PM" ? 12 : 0);
    change(`${pad(nextHour)}:${pad(selectedMinute)}`);
  };

  const describedBy = [hint && !error ? ids.hint : null, error ? ids.error : null].filter(Boolean).join(" ") || undefined;

  return (
    <Field id={ids.id} label={label} hint={hint} error={error} className={className}>
      <div ref={anchor}>
        <button
          ref={trigger}
          id={ids.id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-describedby={describedBy}
          onClick={() => (open ? close(false) : openPanel())}
          className={`${fieldSurface({ invalid: !!error, disabled })} h-9 cursor-pointer gap-2.5 px-3 text-left text-[16px] sm:text-[13.5px] ${INTERACTION_FOCUS}`}
        >
          <span className="flex shrink-0 text-muted-foreground"><ClockIcon /></span>
          {/* The hours and minutes roll the way the time moved, like a clock; AM and PM morph. */}
          <span className={`flex min-w-0 flex-1 items-baseline truncate tabular-nums ${current ? "text-foreground" : "text-muted-foreground/70"}`}>
            {current ? (
              <>
                <span className="sr-only">{shownText}</span>
                <span aria-hidden="true" className="inline-flex items-baseline">
                  <NumberRoll value={hour12 ? Number(current.slice(0, 2)) % 12 || 12 : Number(current.slice(0, 2))} format={{ minimumIntegerDigits: hour12 ? 1 : 2 }} />
                  <span className="px-px">:</span>
                  <NumberRoll value={Number(current.slice(3, 5))} format={{ minimumIntegerDigits: 2 }} />
                  {hour12 && (
                    <span className="pl-1">
                      <TextMorph>{Number(current.slice(0, 2)) < 12 ? "AM" : "PM"}</TextMorph>
                    </span>
                  )}
                </span>
              </>
            ) : (
              <TextMorph animateWidth={false}>{shownText}</TextMorph>
            )}
          </span>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300" style={{ transform: open ? "rotate(180deg)" : "none" }}>
            <path d="m4.5 6 3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {name && <input type="hidden" name={name} value={current ?? ""} />}
      {mounted &&
        createPortal(
          <div
            ref={surface}
            role="dialog"
            aria-label="Choose a time"
            className="fixed left-0 top-0 z-[55] w-[284px] max-w-[calc(100vw-16px)] rounded-[18px] bg-popover p-3 text-popover-foreground shadow-[0_0_0_1px_var(--border)]"
            style={{ ...vars, left: place.x, top: place.y, transformOrigin: place.origin, ...enterStyle(shown, place.side, reduced) }}
          >
            <div ref={shakeRef} className="flex h-8 items-center rounded-full bg-background shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--ring),0_0_0_3px_color-mix(in_oklab,var(--ring)_16%,transparent)]">
              <input
                ref={input}
                value={draft}
                placeholder={hour12 ? "9:30 am" : "09:30"}
                inputMode="numeric"
                aria-label="Type a time"
                aria-invalid={badInput || undefined}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setBadInput(false);
                }}
                onBlur={(e) => {
                  if (e.relatedTarget && !surface.current?.contains(e.relatedTarget as Node)) settle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    settle(true);
                  }
                }}
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] tabular-nums outline-none placeholder:text-muted-foreground/60"
              />
              <span className="pr-3 font-mono text-[10.5px] uppercase text-muted-foreground">{hour12 ? "12 hr" : "24 hr"}</span>
            </div>
            <div className="grid" style={{ gridTemplateRows: badInput ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-rows 280ms ${EASE_OUT}` }}>
              <p className="min-h-0 overflow-hidden pt-1.5 text-[11.5px] text-red-600 dark:text-red-400">
                Enter a valid time{min || max ? ` ${min ? `from ${formatTime(min, hour12)}` : ""}${min && max ? " " : ""}${max ? `to ${formatTime(max, hour12)}` : ""}` : ""}.
              </p>
            </div>

            <div className="mt-2 border-y border-border py-1">
              <WheelPicker itemHeight={32} aria-label="Time wheels" className="px-0">
                <Wheel options={hourOptions} value={hour12 ? selectedHour % 12 || 12 : selectedHour} onValueChange={changeHour} label="Hours" />
                <span aria-hidden="true" className="flex items-center pb-1 text-[18px] text-muted-foreground">:</span>
                <Wheel options={minuteOptions} value={selectedMinute} onValueChange={(minute) => change(`${pad(selectedHour)}:${pad(minute)}`)} label="Minutes" loop />
                {hour12 && <Wheel options={periodOptions} value={selectedHour < 12 ? "AM" : "PM"} onValueChange={changePeriod} label="AM or PM" />}
              </WheelPicker>
            </div>

            <div className="mt-2 flex items-center justify-between gap-1">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    change(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
                  }}
                  className={`h-7 rounded-full px-2.5 text-[12px] font-medium text-foreground cursor-pointer hover:bg-accent ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
                >
                  Now
                </button>
                {current && (
                  <button
                    type="button"
                    onClick={() => {
                      commit(null);
                      setDraft("");
                      close(true);
                    }}
                    className={`h-7 rounded-full px-2.5 text-[12px] text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
                  >
                    Clear
                  </button>
                )}
              </div>
              <button type="button" onClick={() => settle(true)} className={`h-7 rounded-full bg-primary px-3 text-[12px] font-medium text-primary-foreground cursor-pointer ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}>
                Done
              </button>
            </div>
          </div>,
          document.body,
        )}
    </Field>
  );
}

export default TimePicker;
