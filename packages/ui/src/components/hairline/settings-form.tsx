"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { StatusButton, type ActionStatus } from "./status-button";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * SETTINGS FORM: a settings page that saves the way people
 * expect it to
 *
 *   switch    toggles and choices save the moment they change:
 *             the thumb is thrown across, "Saving" opens beside
 *             the label, a check draws and fades. If the server
 *             says no, the thumb is thrown back with a shake
 *             and the reason opens under the field
 *   edit      text edits wait for you: a dot swells beside each
 *             changed label and one bar rises at the foot of
 *             the form, "2 unsaved changes", rolling as you go
 *   check     a field with an async check (is this address
 *             free?) asks a moment after you stop typing:
 *             "Checking", then "Available" or why not
 *   save      Save (or ⌘S) sends just what changed; the bar says
 *             Saving, then Saved, and folds away. Errors your
 *             server sends per field open under those fields
 *             and focus goes to the first
 *   reset     the edits blur back to what's saved
 *
 * Fields are plain objects; onSave gets only the changed values
 * and returns what was stored.
 * ───────────────────────────────────────────────────────── */

export type SettingsValue = string | boolean;
export type SettingsValues = Record<string, SettingsValue>;

type Base = { name: string; label: string; description?: string };

export type SettingsField =
  | (Base & { type: "toggle" })
  | (Base & { type: "choice"; options: { value: string; label: string }[] })
  | (Base & {
      type: "text" | "textarea";
      placeholder?: string;
      /** Shown inside the field before the value, e.g. "relay.app/". */
      prefix?: string;
      /** Textarea height in lines. */
      rows?: number;
      maxLength?: number;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
      autoComplete?: string;
      /** Return a message to refuse the value before it's sent. */
      validate?: (value: string, values: SettingsValues) => string | null | undefined | void;
      /** Asked a moment after typing stops: return null when the value is fine, or why it isn't. */
      check?: (value: string, options: { signal: AbortSignal }) => Promise<string | null | undefined | void>;
      /** What a passed check says. */
      checkPassed?: string;
    });

export interface SettingsSection {
  title: string;
  description?: string;
  fields: SettingsField[];
}

/** Throw this from onSave to put messages under particular fields. */
export class SettingsFormError extends Error {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "SettingsFormError";
    this.fields = fields;
  }
}

export interface SettingsFormProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  sections: SettingsSection[];
  /** Saved values, controlled. */
  value?: SettingsValues;
  defaultValue?: SettingsValues;
  /** The saved values after every successful save. */
  onValueChange?: (values: SettingsValues) => void;
  /** Saves the changed values. Return what was stored (or nothing); throw to keep the edits and say why. */
  onSave: (patch: SettingsValues, values: SettingsValues) => Promise<SettingsValues | void> | SettingsValues | void;
  /** Toggles and choices save the moment they change. */
  autosave?: boolean;
  /** Ask before leaving the page with unsaved edits. */
  warnOnLeave?: boolean;
}

type Check = { state: "checking" | "ok" | "no"; message: string };
type TextField = Extract<SettingsField, { type: "text" | "textarea" }>;

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const THROW = "cubic-bezier(0.34,1.36,0.64,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const EMPTY: SettingsValues = {};
const SHAKE = [{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "none" }];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const without = <T,>(o: Record<string, T>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k))) as Record<string, T>;
const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

function DrawnCheck({ drawn, reduced, className = "size-3.5" }: { drawn: boolean; reduced: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        style={{ strokeDashoffset: drawn ? 0 : 1, transition: drawn && !reduced ? `stroke-dashoffset 380ms ${EASE} 100ms` : "none" }}
      />
    </svg>
  );
}

function Spinner({ on }: { on: boolean }) {
  return <span className={`size-3 rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none ${on ? "animate-spin" : ""}`} />;
}

/** Text that changes by lifting the old line out through a blur and the new one in (sentences don't morph letter by letter). */
function Line({ text, className = "", reduced }: { text: string; className?: string; reduced: boolean }) {
  const [shown, setShown] = React.useState(text);
  const [leaving, setLeaving] = React.useState<{ key: number; text: string }[]>([]);
  const key = React.useRef(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  if (text !== shown) {
    if (!reduced && shown) setLeaving((l) => [...l, { key: ++key.current, text: shown }]);
    setShown(text);
  }
  React.useLayoutEffect(() => {
    if (reduced || !ref.current || !leaving.length) return;
    ref.current.animate([{ opacity: 0, transform: "translateY(4px)", filter: "blur(3px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }], { duration: 320, delay: 60, easing: EASE, fill: "backwards" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  return (
    <span className={`relative block ${className}`}>
      <span ref={ref} className="block">
        {shown}
      </span>
      {leaving.map((l) => (
        <LeavingLine key={l.key} text={l.text} onDone={() => setLeaving((all) => all.filter((x) => x.key !== l.key))} />
      ))}
    </span>
  );
}

function LeavingLine({ text, onDone }: { text: string; onDone: () => void }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const a = ref.current?.animate([{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, transform: "translateY(-4px)", filter: "blur(3px)" }], { duration: 200, easing: EASE, fill: "forwards" });
    if (a) a.onfinish = onDone;
    return () => a?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 block">
      {text}
    </span>
  );
}

/** A block that opens and closes by height, keeping its last children while it closes. */
function Fold({ open, reduced, children }: { open: boolean; reduced: boolean; children: React.ReactNode }) {
  const [kept, setKept] = React.useState(children);
  if (open && kept !== children) setKept(children);
  return (
    <div className="grid" inert={!open} aria-hidden={!open || undefined} style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, transition: reduced ? "none" : `grid-template-rows 380ms ${EASE}, opacity 260ms ${EASE}` }}>
      <div className="min-h-0 overflow-clip">{open ? children : kept}</div>
    </div>
  );
}

/** "Saving" → "Saved" beside a label that saved itself; it fades once it's said it. */
function SavedMark({ status, reduced }: { status: ActionStatus; reduced: boolean }) {
  const open = status !== "idle";
  const [label, setLabel] = React.useState("Saving");
  const next = status === "pending" ? "Saving" : status === "success" ? "Saved" : status === "error" ? "Not saved" : label;
  if (next !== label) setLabel(next);
  return (
    <span
      aria-hidden="true"
      className={`inline-grid align-baseline text-[11.5px] font-normal ${status === "error" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
      style={{
        gridTemplateColumns: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        transition: reduced ? "none" : `grid-template-columns 380ms ${EASE}, opacity ${open ? 240 : 600}ms ${EASE}`,
      }}
    >
      <span className="min-w-0 [clip-path:inset(-4px_0)]">
        <span className="inline-flex items-center gap-1 pl-2 whitespace-nowrap">
          <span className="relative grid size-3 place-items-center">
            <span className="absolute inset-0 grid place-items-center" style={{ opacity: status === "pending" ? 1 : 0, transition: reduced ? "none" : `opacity 200ms ${EASE}` }}>
              <Spinner on={status === "pending"} />
            </span>
            <span className="absolute inset-0 grid place-items-center" style={{ opacity: status === "success" ? 1 : 0, transition: reduced ? "none" : `opacity 200ms ${EASE}` }}>
              <DrawnCheck drawn={status === "success"} reduced={reduced} className="size-3" />
            </span>
          </span>
          <TextMorph>{label}</TextMorph>
        </span>
      </span>
    </span>
  );
}

function Label({ field, htmlFor, dirty, status, reduced, id }: { field: SettingsField; htmlFor?: string; dirty: boolean; status: ActionStatus; reduced: boolean; id: string }) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <span className="block min-w-0">
      <Tag {...(htmlFor ? { htmlFor } : {})} id={`${id}-label`} className="flex items-center whitespace-nowrap text-[13px] font-medium tracking-[-0.01em]">
        {field.label}
        {/* A dot that swells in beside a label whose value has changed but isn't saved. */}
        <span
          aria-hidden="true"
          className="ml-1.5 size-1.5 shrink-0 rounded-full bg-primary"
          style={{ transform: dirty ? "scale(1)" : "scale(0)", opacity: dirty ? 1 : 0, transition: reduced ? "none" : `transform 420ms ${dirty ? THROW : EASE}, opacity 200ms ${EASE}` }}
        />
        <SavedMark status={status} reduced={reduced} />
      </Tag>
      {field.description && (
        <span id={`${id}-desc`} className="mt-0.5 block text-[12px] leading-[1.45] text-muted-foreground">
          {field.description}
        </span>
      )}
    </span>
  );
}

function Switch({ on, onToggle, labelledBy, describedBy, shake, reduced }: { on: boolean; onToggle: () => void; labelledBy: string; describedBy?: string; shake: number; reduced: boolean }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (shake && !reduced) ref.current?.animate(SHAKE, { duration: 380, easing: "ease-out" });
  }, [shake, reduced]);
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={onToggle}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-[background-color,box-shadow] duration-300 ${FOCUS} ${on ? "bg-primary" : "bg-muted shadow-[inset_0_0_0_1px_var(--border)]"}`}
    >
      <span
        aria-hidden="true"
        className="absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow-[0_0_0_1px_var(--border)]"
        style={{ transform: on ? "translateX(16px)" : "none", transition: reduced ? "none" : `transform 420ms ${THROW}` }}
      />
    </button>
  );
}

function Choice({ field, value, onChange, labelledBy, shake, reduced }: { field: Extract<SettingsField, { type: "choice" }>; value: string; onChange: (v: string) => void; labelledBy: string; shake: number; reduced: boolean }) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = React.useState({ left: 0, width: 0, ready: false });
  const index = Math.max(0, field.options.findIndex((o) => o.value === value));

  React.useLayoutEffect(() => {
    const measure = () => {
      const b = refs.current[index];
      if (!b) return;
      setThumb((t) => (t.left === b.offsetLeft && t.width === b.offsetWidth && t.ready ? t : { left: b.offsetLeft, width: b.offsetWidth, ready: t.width > 0 }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (wrap.current) observer.observe(wrap.current);
    return () => observer.disconnect();
  }, [index]);

  React.useEffect(() => {
    if (shake && !reduced) wrap.current?.animate(SHAKE, { duration: 380, easing: "ease-out" });
  }, [shake, reduced]);

  return (
    <div ref={wrap} role="radiogroup" aria-labelledby={labelledBy} className="relative inline-flex shrink-0 rounded-full p-0.5 shadow-[inset_0_0_0_1px_var(--border)]">
      <span
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 left-0 rounded-full bg-accent shadow-[inset_0_0_0_1px_var(--border)]"
        style={{
          width: thumb.width,
          transform: `translateX(${thumb.left}px)`,
          transition: thumb.ready && !reduced ? `transform 460ms ${THROW}, width 360ms ${EASE}` : "none",
        }}
      />
      {field.options.map((o, i) => {
        const on = i === index;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
              if (!step) return;
              e.preventDefault();
              const next = (i + step + field.options.length) % field.options.length;
              onChange(field.options[next].value);
              refs.current[next]?.focus();
            }}
            className={`relative h-7 cursor-pointer rounded-full px-3 text-[12px] font-medium transition-colors duration-300 ${FOCUS} ${on ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TextInput({
  field,
  id,
  value,
  error,
  check,
  onChange,
  reduced,
  register,
}: {
  field: TextField;
  id: string;
  value: string;
  error?: string;
  check?: Check;
  onChange: (v: string) => void;
  reduced: boolean;
  register: (name: string, el: HTMLInputElement | HTMLTextAreaElement | null) => void;
}) {
  const ring = error || check?.state === "no" ? "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-red-500)_45%,transparent)]" : "shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--ring)]";
  const common = {
    id,
    name: field.name,
    value,
    placeholder: field.placeholder,
    maxLength: field.maxLength,
    "aria-invalid": Boolean(error || check?.state === "no") || undefined,
    "aria-describedby": `${id}-desc ${id}-note`,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };
  const text = "bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground/70 [@media(pointer:fine)]:text-[13.5px]";
  return (
    <div data-field-ring="" className={`mt-2 rounded-[10px] transition-shadow duration-200 ${ring}`}>
      {field.type === "textarea" ? (
        <textarea ref={(el) => register(field.name, el)} rows={field.rows ?? 3} {...common} className={`block w-full resize-none px-3 py-2 leading-[1.5] ${text}`} />
      ) : (
        <div className="flex h-9 items-center px-3">
          {field.prefix && (
            <span aria-hidden="true" className="shrink-0 text-[13.5px] text-muted-foreground select-none">
              {field.prefix}
            </span>
          )}
          <input ref={(el) => register(field.name, el)} type="text" inputMode={field.inputMode} autoComplete={field.autoComplete ?? "off"} {...common} className={`h-full min-w-0 flex-1 ${text}`} />
          {field.check && (
            <span aria-hidden="true" className="relative ml-2 grid size-3.5 shrink-0 place-items-center">
              <span className="absolute inset-0 grid place-items-center text-muted-foreground" style={{ opacity: check?.state === "checking" ? 1 : 0, transition: reduced ? "none" : `opacity 200ms ${EASE}` }}>
                <Spinner on={check?.state === "checking"} />
              </span>
              <span className="absolute inset-0 grid place-items-center text-emerald-600 dark:text-emerald-400" style={{ opacity: check?.state === "ok" && !error ? 1 : 0, transition: reduced ? "none" : `opacity 200ms ${EASE}` }}>
                <DrawnCheck drawn={check?.state === "ok" && !error} reduced={reduced} />
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function SettingsForm({
  sections,
  value,
  defaultValue = EMPTY,
  onValueChange,
  onSave,
  autosave = true,
  warnOnLeave = true,
  className = "",
  ...props
}: SettingsFormProps) {
  const reduced = useReducedMotion();
  const id = React.useId();
  const [inner, setInner] = React.useState(defaultValue);
  const saved = value ?? inner;
  const [edits, setEdits] = React.useState<SettingsValues>({});
  const [status, setStatus] = React.useState<Record<string, ActionStatus>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [shakes, setShakes] = React.useState<Record<string, number>>({});
  const [checks, setChecks] = React.useState<Record<string, Check>>({});
  const [bar, setBar] = React.useState<ActionStatus>("idle");
  const [barNote, setBarNote] = React.useState<string | null>(null);
  const [lastCount, setLastCount] = React.useState(1);
  const [announce, setAnnounce] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputs = React.useRef(new Map<string, HTMLInputElement | HTMLTextAreaElement>());
  const runs = React.useRef(new Map<string, number>());
  const checkRuns = React.useRef(new Map<string, { timer: number; ctrl?: AbortController }>());
  const latest = React.useRef({ saved, edits });
  React.useLayoutEffect(() => {
    latest.current = { saved, edits };
  });

  const fields = React.useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const instant = (f: SettingsField) => autosave && (f.type === "toggle" || f.type === "choice");
  const values = { ...saved, ...edits };
  const dirty = fields.filter((f) => !instant(f) && f.name in edits && edits[f.name] !== (saved[f.name] ?? (f.type === "toggle" ? false : "")));
  const count = dirty.length;
  if (count && count !== lastCount) setLastCount(count);
  const barOpen = count > 0 || bar === "pending" || bar === "success";

  const commitSaved = (next: SettingsValues) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };

  const register = React.useCallback((name: string, el: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (el) inputs.current.set(name, el);
    else inputs.current.delete(name);
  }, []);

  // Toggles and choices: saved the moment they change; a newer change wins over an older answer.
  const saveNow = async (f: SettingsField, v: SettingsValue) => {
    const run = (runs.current.get(f.name) ?? 0) + 1;
    runs.current.set(f.name, run);
    setEdits((e) => ({ ...e, [f.name]: v }));
    setStatus((s) => ({ ...s, [f.name]: "pending" }));
    setErrors((e) => without(e, [f.name]));
    try {
      const patch = { [f.name]: v };
      const stored = await onSave(patch, { ...latest.current.saved, ...patch });
      if (runs.current.get(f.name) !== run) return;
      commitSaved({ ...latest.current.saved, ...patch, ...(stored ?? {}) });
      setEdits((e) => without(e, [f.name]));
      setStatus((s) => ({ ...s, [f.name]: "success" }));
      setAnnounce(`${f.label} saved.`);
      window.setTimeout(() => setStatus((s) => (runs.current.get(f.name) === run && s[f.name] === "success" ? { ...s, [f.name]: "idle" } : s)), 1600);
    } catch (e) {
      if (runs.current.get(f.name) !== run) return;
      const why = e instanceof SettingsFormError ? (e.fields[f.name] ?? e.message) : message(e, `${f.label} couldn't be saved.`);
      setEdits((x) => without(x, [f.name]));
      setStatus((s) => ({ ...s, [f.name]: "error" }));
      setErrors((x) => ({ ...x, [f.name]: why }));
      setShakes((x) => ({ ...x, [f.name]: (x[f.name] ?? 0) + 1 }));
      setAnnounce(why);
      window.setTimeout(() => setStatus((s) => (runs.current.get(f.name) === run && s[f.name] === "error" ? { ...s, [f.name]: "idle" } : s)), 2400);
    }
  };

  const edit = (f: TextField, v: string) => {
    setEdits((e) => ({ ...e, [f.name]: v }));
    setErrors((e) => without(e, [f.name]));
    setBarNote(null);
    if (bar === "error" || bar === "success") setBar("idle");
    if (!f.check) return;
    const prev = checkRuns.current.get(f.name);
    if (prev) {
      window.clearTimeout(prev.timer);
      prev.ctrl?.abort();
    }
    if (!v || v === saved[f.name]) {
      setChecks((c) => without(c, [f.name]));
      return;
    }
    const entry: { timer: number; ctrl?: AbortController } = { timer: 0 };
    entry.timer = window.setTimeout(async () => {
      const ctrl = new AbortController();
      entry.ctrl = ctrl;
      setChecks((c) => ({ ...c, [f.name]: { state: "checking", message: "Checking" } }));
      try {
        const why = await f.check!(v, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        setChecks((c) => ({ ...c, [f.name]: why ? { state: "no", message: why } : { state: "ok", message: f.checkPassed ?? "Available" } }));
      } catch {
        if (!ctrl.signal.aborted) setChecks((c) => without(c, [f.name]));
      }
    }, 450);
    checkRuns.current.set(f.name, entry);
  };

  const focusFirst = (names: string[]) => {
    const first = fields.find((f) => names.includes(f.name));
    const el = first && inputs.current.get(first.name);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  };

  const save = async () => {
    if (!count || bar === "pending") return;
    const problems: Record<string, string> = {};
    for (const f of dirty) {
      if (f.type !== "text" && f.type !== "textarea") continue;
      const v = String(values[f.name] ?? "");
      const why = f.validate?.(v, values) || (checks[f.name]?.state === "no" ? checks[f.name].message : null);
      if (why) problems[f.name] = why;
    }
    if (Object.keys(problems).length) {
      setErrors((e) => ({ ...e, ...problems }));
      setShakes((s) => ({ ...s, ...Object.fromEntries(Object.keys(problems).map((k) => [k, (s[k] ?? 0) + 1])) }));
      setBar("error");
      setBarNote(Object.keys(problems).length === 1 ? "One field needs a look." : `${Object.keys(problems).length} fields need a look.`);
      focusFirst(Object.keys(problems));
      return;
    }
    const patch = Object.fromEntries(dirty.map((f) => [f.name, values[f.name]]));
    setBar("pending");
    setBarNote(null);
    try {
      const stored = await onSave(patch, { ...latest.current.saved, ...patch });
      commitSaved({ ...latest.current.saved, ...patch, ...(stored ?? {}) });
      // Keep edits made while it was saving.
      setEdits((e) => Object.fromEntries(Object.entries(e).filter(([k, v]) => !(k in patch) || v !== patch[k])));
      setChecks((c) => without(c, Object.keys(patch)));
      setBar("success");
      setAnnounce("Changes saved.");
    } catch (e) {
      const fieldErrors = e instanceof SettingsFormError ? e.fields : {};
      setErrors((x) => ({ ...x, ...fieldErrors }));
      setShakes((s) => ({ ...s, ...Object.fromEntries(Object.keys(fieldErrors).map((k) => [k, (s[k] ?? 0) + 1])) }));
      setBar("error");
      const why = message(e, "Your changes couldn't be saved.");
      setBarNote(why);
      setAnnounce(why);
      focusFirst(Object.keys(fieldErrors));
    }
  };

  const reset = () => {
    const names = dirty.map((f) => f.name);
    setEdits((e) => without(e, names));
    setErrors((e) => without(e, names));
    setChecks((c) => without(c, names));
    setBar("idle");
    setBarNote(null);
    if (!reduced)
      for (const n of names)
        inputs.current.get(n)?.animate([{ opacity: 0.2, filter: "blur(3px)" }, { opacity: 1, filter: "blur(0px)" }], { duration: 420, easing: EASE });
    setAnnounce("Changes discarded.");
  };

  // Saved: the bar says so for a moment, then folds away.
  React.useEffect(() => {
    if (bar !== "success") return;
    const timer = window.setTimeout(() => setBar("idle"), 1100);
    return () => window.clearTimeout(timer);
  }, [bar]);

  React.useEffect(() => {
    if (!warnOnLeave || !count) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [warnOnLeave, count]);

  React.useEffect(() => () => checkRuns.current.forEach((c) => (window.clearTimeout(c.timer), c.ctrl?.abort())), []);

  const shown = count || lastCount;
  const left =
    bar === "success" ? "Changes saved" : barNote ?? `${shown} unsaved ${shown === 1 ? "change" : "changes"}`;

  return (
    <div
      ref={rootRef}
      className={`@container relative w-full rounded-[22px] border border-border bg-background text-foreground ${className}`}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          save();
        }
      }}
      {...props}
    >
      {sections.map((section, si) => (
        <section key={section.title} aria-labelledby={`${id}-s${si}`} className="grid gap-4 border-t border-border px-4 py-4 first:border-t-0 @xl:grid-cols-[minmax(0,180px)_1fr] @xl:gap-8 @md:px-5 @md:py-5">
          <div className="min-w-0">
            <h3 id={`${id}-s${si}`} className="text-[14px] font-medium tracking-[-0.01em]">
              {section.title}
            </h3>
            {section.description && <p className="mt-0.5 text-[12px] leading-[1.45] text-muted-foreground">{section.description}</p>}
          </div>
          {/* Its own container: a choice sits beside its label only when this column has room. */}
          <div className="@container/fields min-w-0 space-y-4">
            {section.fields.map((f) => {
              const fid = `${id}-${f.name}`;
              const st = status[f.name] ?? "idle";
              const err = errors[f.name];
              const isDirty = dirty.includes(f);
              const check = checks[f.name];
              const note = err ?? (check ? check.message : null);
              const noteTone = err || check?.state === "no" ? "text-red-600 dark:text-red-400" : check?.state === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground";
              return (
                <div key={f.name}>
                  {f.type === "toggle" ? (
                    <div className="flex items-start justify-between gap-4">
                      <Label field={f} dirty={isDirty} status={st} reduced={reduced} id={fid} />
                      <span className="pt-px">
                        <Switch
                          on={Boolean(values[f.name])}
                          onToggle={() => (instant(f) ? saveNow(f, !values[f.name]) : setEdits((e) => ({ ...e, [f.name]: !values[f.name] })))}
                          labelledBy={`${fid}-label`}
                          describedBy={f.description ? `${fid}-desc` : undefined}
                          shake={shakes[f.name] ?? 0}
                          reduced={reduced}
                        />
                      </span>
                    </div>
                  ) : f.type === "choice" ? (
                    <div className="flex flex-col items-start gap-2 @min-[26rem]/fields:flex-row @min-[26rem]/fields:justify-between @min-[26rem]/fields:gap-4">
                      <Label field={f} dirty={isDirty} status={st} reduced={reduced} id={fid} />
                      <Choice
                        field={f}
                        value={String(values[f.name] ?? f.options[0]?.value ?? "")}
                        onChange={(v) => (v === values[f.name] ? undefined : instant(f) ? saveNow(f, v) : setEdits((e) => ({ ...e, [f.name]: v })))}
                        labelledBy={`${fid}-label`}
                        shake={shakes[f.name] ?? 0}
                        reduced={reduced}
                      />
                    </div>
                  ) : (
                    <>
                      <Label field={f} htmlFor={fid} dirty={isDirty} status={st} reduced={reduced} id={fid} />
                      <TextInput
                        field={f}
                        id={fid}
                        value={String(values[f.name] ?? "")}
                        error={err}
                        check={check}
                        onChange={(v) => edit(f, v)}
                        reduced={reduced}
                        register={register}
                      />
                      {f.maxLength && f.type === "textarea" && (
                        <p aria-hidden="true" className="mt-1 flex justify-end text-[11px] text-muted-foreground tabular-nums">
                          <NumberRoll value={String(values[f.name] ?? "").length} />
                          &nbsp;/ {f.maxLength}
                        </p>
                      )}
                    </>
                  )}
                  <div id={`${fid}-note`}>
                    <Fold open={Boolean(note)} reduced={reduced}>
                      <p className={`flex items-center gap-1 pt-1.5 text-[11.5px] ${noteTone}`}>
                        <Line text={note ?? ""} reduced={reduced} />
                      </p>
                    </Fold>
                  </div>
                  {f.type !== "toggle" && f.type !== "choice" && <ShakeOn getTarget={() => inputs.current.get(f.name)} count={shakes[f.name] ?? 0} reduced={reduced} />}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* One bar for every unsaved edit; it rises from the foot of the form and stays in view while you scroll. */}
      <div className="sticky bottom-0 z-10">
        <Fold open={barOpen} reduced={reduced}>
          <div className="flex items-center gap-3 rounded-b-[21px] border-t border-border bg-background px-4 py-3 @md:px-5" role="group" aria-label="Unsaved changes">
            <p className={`min-w-0 flex-1 text-[12.5px] ${bar === "error" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              {bar !== "success" && !barNote ? (
                <span className="flex items-baseline tabular-nums">
                  <NumberRoll value={shown} />
                  &nbsp;<TextMorph>{shown === 1 ? "unsaved change" : "unsaved changes"}</TextMorph>
                </span>
              ) : (
                <Line text={left} reduced={reduced} />
              )}
            </p>
            <button
              type="button"
              onClick={reset}
              disabled={bar === "pending" || !count}
              className={`h-7 cursor-pointer rounded-full px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent ${FOCUS}`}
            >
              Reset
            </button>
            <StatusButton size="sm" status={bar} labels={{ idle: "Save", pending: "Saving", success: "Saved", error: "Try again" }} onClick={save} />
          </div>
        </Fold>
      </div>

      <span className="sr-only" role="status">
        {announce}
      </span>
    </div>
  );
}

/** Shakes an input when its count goes up (a refused value). */
function ShakeOn({ getTarget, count, reduced }: { getTarget: () => HTMLElement | undefined; count: number; reduced: boolean }) {
  React.useEffect(() => {
    if (count && !reduced) getTarget()?.closest("[data-field-ring]")?.animate(SHAKE, { duration: 380, easing: "ease-out" });
  }, [count, getTarget, reduced]);
  return null;
}
