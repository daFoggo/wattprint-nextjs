"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * INLINE EDIT: rename it where it stands
 *
 *   rest      plain text in your own type; a hairline frame,
 *             sized by the text, fades in under the pointer
 *   edit      a click puts the caret exactly where you clicked
 *             (it's a real field under the text, so double-click
 *             selects a word); Tab or F2 selects it all. The text
 *             never moves: the frame just turns to the focus
 *             colour, and grows with what you type
 *   save      Enter or leaving the field. The new name stays, a
 *             spinner opens beside it and a check draws itself;
 *             if the server stores something else ("relay-web"),
 *             the text morphs into it
 *   refused   onSave throws: the field opens again with what you
 *             typed, shakes, turns red and says why under it
 *   cancel    Escape morphs the text back to the saved name
 *   elsewhere a new value from outside (someone renamed it)
 *             morphs in, unless you're in the middle of an edit
 *
 * Type comes from where you put it: the frame and its padding
 * are in em, so a 13px table cell and a 24px page title both
 * look right.
 * ───────────────────────────────────────────────────────── */

export interface InlineEditProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "defaultValue" | "onChange"> {
  /** The saved text, controlled. */
  value?: string;
  defaultValue?: string;
  /** The saved text after a successful save. */
  onValueChange?: (value: string) => void;
  /** Saves a new value. Return what was stored (it morphs in if it differs); throw an Error to refuse with its message. */
  onSave?: (value: string, previous: string) => Promise<string | void> | string | void;
  /** Refuse a value before it's sent; the message opens under the field. */
  validate?: (value: string) => string | null | undefined | void;
  /** Applied before validating and saving. Collapses spaces and trims by default. */
  normalize?: (value: string) => string;
  /** Accessible name, e.g. "Project name". */
  label: string;
  placeholder?: string;
  /** Fill the width and wrap onto more lines (titles). Off: one line that sizes to its text (cells, breadcrumbs). */
  wrap?: boolean;
  maxLength?: number;
  /** What leaving the field does with an edit. */
  blurAction?: "save" | "cancel";
  /** An empty value cancels the edit unless allowed. */
  allowEmpty?: boolean;
  /** Submits the saved value with a form. */
  name?: string;
  disabled?: boolean;
}

type Status = "idle" | "pending" | "success" | "error";
type Morph = { from: string; to: string; key: number };

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const TIDY = (v: string) => v.replace(/\s+/g, " ").trim();
/** Same box, same letters: the field and the text must lay out identically, so neither kerns nor ligates. */
const TYPE: React.CSSProperties = { fontKerning: "none", fontVariantLigatures: "none" };
/** Frame padding in em, so it follows the type it's set in. */
const PAD_X = "0.4em";
const PAD_Y = "0.12em";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const swap = (on: boolean, reduced: boolean): React.CSSProperties => ({
  opacity: on ? 1 : 0,
  transform: on ? "none" : "scale(0.6)",
  filter: on ? "none" : "blur(3px)",
  transition: reduced ? "none" : `opacity 240ms ${EASE}, transform 380ms ${EASE}, filter 240ms ${EASE}`,
});

/** One line of words that morphs from one text to the next: TextMorph, started from the text that was showing. */
function MorphOnce({ from, to, onDone }: { from: string; to: string; onDone: () => void }) {
  const [text, setText] = React.useState(from);
  React.useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setText(to))));
    const timer = window.setTimeout(onDone, 780);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      window.clearTimeout(timer);
    };
  }, [to, onDone]);
  return <TextMorph className="whitespace-pre">{text}</TextMorph>;
}

/** Wrapped text changes as a whole: the old lines lift out through a blur while the new ones rise in. */
function SwapOnce({ from, to, onDone }: { from: string; to: string; onDone: () => void }) {
  const inRef = React.useRef<HTMLSpanElement>(null);
  const outRef = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    inRef.current?.animate(
      [
        { opacity: 0, transform: "translateY(0.3em)", filter: "blur(4px)" },
        { opacity: 1, transform: "none", filter: "blur(0px)" },
      ],
      { duration: 420, delay: 60, easing: EASE, fill: "backwards" },
    );
    outRef.current?.animate(
      [
        { opacity: 1, transform: "none", filter: "blur(0px)" },
        { opacity: 0, transform: "translateY(-0.3em)", filter: "blur(4px)" },
      ],
      { duration: 220, easing: EASE, fill: "forwards" },
    );
    const timer = window.setTimeout(onDone, 560);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <span className="relative block min-w-0">
      <span ref={inRef} className="block">
        {to || " "}
      </span>
      <span ref={outRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 block">
        {from}
      </span>
    </span>
  );
}

/** A sentence under the field that crossfades whole when it changes, and folds away when there's nothing to say. */
function Line({ children, show, id, tone, wide, reduced }: { children: React.ReactNode; show: boolean; id: string; tone: string; wide: boolean; reduced: boolean }) {
  // While it folds away it keeps saying what it said, instead of emptying first.
  const [kept, setKept] = React.useState(children);
  if (show && kept !== children) {
    setKept(children);
  }
  return (
    // Under one-line text the message may run past the field's width without widening it (or wrapping what's beside it).
    <span className={`grid ${wide ? "[contain:inline-size]" : ""}`} style={{ gridTemplateRows: show ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-rows 320ms ${EASE}` }}>
      <span className={`min-h-0 min-w-0 ${wide ? "[clip-path:inset(0_-100vw_0_0)]" : "overflow-hidden"}`}>
        <span
          id={id}
          className={`block pt-1.5 text-[12.5px] leading-[1.45] font-normal tracking-normal normal-case transition-[color,opacity,filter] duration-300 ${wide ? "w-max max-w-[min(24rem,calc(100vw_-_3rem))]" : ""} ${tone}`}
          style={{ opacity: show ? 1 : 0, filter: show ? "none" : "blur(3px)" }}
        >
          {show ? children : kept}
        </span>
      </span>
    </span>
  );
}

export function InlineEdit({
  value,
  defaultValue = "",
  onValueChange,
  onSave,
  validate,
  normalize = TIDY,
  label,
  placeholder = "Untitled",
  wrap = false,
  maxLength,
  blurAction = "save",
  allowEmpty = false,
  name,
  disabled = false,
  className = "",
  ...props
}: InlineEditProps) {
  const uid = React.useId();
  const reduced = useReducedMotion();
  const [own, setOwn] = React.useState(defaultValue);
  const saved = value ?? own;
  const [editing, setEditing] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  // Edits started with the keyboard keep a focus frame after saving; a mouse user sees the text settle.
  const [viaKeys, setViaKeys] = React.useState(false);
  const [draft, setDraft] = React.useState(saved);
  const [optimistic, setOptimistic] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [morph, setMorph] = React.useState<Morph | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const rootRef = React.useRef<HTMLSpanElement>(null);
  const fieldRef = React.useRef<HTMLTextAreaElement>(null);
  const pointerFocus = React.useRef(false);
  const selectAll = React.useRef(false);
  const saveId = React.useRef(0);
  const morphKey = React.useRef(0);
  const lastHeight = React.useRef(0);

  // What the text says when it isn't being edited: the name on its way to the server, or the saved one.
  const shown = optimistic ?? saved;
  const editingRef = React.useRef(editing);

  const startMorph = React.useCallback(
    (from: string, to: string) => {
      if (from === to || reduced) return;
      // A morph that's still running is re-aimed rather than restarted, so it never jumps.
      setMorph((m) => (m ? { ...m, to } : { from, to, key: ++morphKey.current }));
    },
    [reduced],
  );
  const morphDone = React.useCallback(() => setMorph(null), []);

  // A new value from outside (someone else renamed it) morphs in, unless you're editing.
  const [seen, setSeen] = React.useState(value);
  const currentShown = morph ? morph.to : shown;
  const [lastShown, setLastShown] = React.useState(currentShown);
  if (value !== seen) {
    setSeen(value);
    if (value !== undefined && !editing && optimistic === null && value !== lastShown) startMorph(lastShown, value);
  }
  if (currentShown !== lastShown) {
    setLastShown(currentShown);
  }
  React.useLayoutEffect(() => {
    editingRef.current = editing;
  });

  const shake = () => {
    if (reduced) return;
    rootRef.current?.animate(
      [{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "none" }],
      { duration: 380, easing: "ease-out" },
    );
  };

  const begin = (select: boolean, keys = select) => {
    if (disabled) return;
    if (!editing) {
      setDraft(shown);
      setEditing(true);
    }
    if (status === "success") setStatus("idle");
    selectAll.current = select;
    setViaKeys(keys);
  };

  // Keyboard entry selects everything (like renaming a file); a click leaves the caret where it landed.
  React.useLayoutEffect(() => {
    if (!editing || !selectAll.current) return;
    selectAll.current = false;
    fieldRef.current?.select();
  }, [editing]);

  const cancel = () => {
    if (draft !== saved) startMorph(draft, saved);
    setEditing(false);
    setError(null);
    if (status === "error") setStatus("idle");
  };

  const settle = (result: string, sent: string, id: number) => {
    if (id !== saveId.current) return;
    setOptimistic(null);
    if (result !== sent) startMorph(sent, result);
    if (value === undefined) setOwn(result);
    onValueChange?.(result);
    setStatus("success");
    setAnnounce(result === sent ? "Saved" : `Saved as ${result}`);
  };

  const refuse = (message: string, sent: string, id: number) => {
    if (id !== saveId.current) return;
    setOptimistic(null);
    // Already typing something newer: keep it, just say why the last one failed.
    if (!editingRef.current) setDraft(sent);
    setEditing(true);
    setStatus("error");
    setError(message);
    setAnnounce(`Not saved. ${message}`);
    shake();
  };

  const commit = () => {
    const next = normalize(draft);
    if (next === normalize(saved) || (!next && !allowEmpty)) {
      // Nothing to save (or an emptied name): the text settles back to what's saved.
      cancel();
      return;
    }
    const problem = validate?.(next);
    if (problem) {
      setError(problem);
      setStatus("error");
      setAnnounce(problem);
      shake();
      return;
    }
    const id = ++saveId.current;
    setEditing(false);
    setError(null);
    if (draft !== next) startMorph(draft, next);
    setOptimistic(next);
    let result: Promise<string | void> | string | void;
    try {
      result = onSave?.(next, saved);
    } catch (err) {
      refuse(err instanceof Error ? err.message : "Couldn't save that.", next, id);
      return;
    }
    if (result && typeof (result as Promise<string | void>).then === "function") {
      setStatus("pending");
      (result as Promise<string | void>).then(
        (stored) => settle(typeof stored === "string" ? stored : next, next, id),
        (err) => refuse(err instanceof Error ? err.message : "Couldn't save that.", next, id),
      );
    } else settle(typeof result === "string" ? result : next, next, id);
  };

  // The check stays a moment, then the slot closes.
  React.useEffect(() => {
    if (status !== "success") return;
    const timer = window.setTimeout(() => setStatus("idle"), 1400);
    return () => window.clearTimeout(timer);
  }, [status]);

  // Wrapped text that changes line count eases to its new height (typing follows the text at once).
  React.useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const h = el.offsetHeight;
    const prev = lastHeight.current;
    lastHeight.current = h;
    if (wrap && !editing && !reduced && prev && Math.abs(prev - h) > 0.5)
      el.animate([{ height: `${prev}px` }, { height: `${h}px` }], { duration: 420, easing: EASE });
  });

  const left = maxLength !== undefined ? maxLength - draft.length : Infinity;
  const counting = editing && left <= 10;
  const lineText = error ?? (counting ? "count" : wrap && (status === "pending" || status === "success") ? status : null);
  const tone = error ? "text-red-600 dark:text-red-400" : "text-muted-foreground";
  const framed = editing || (focused && viaKeys && !disabled);
  const shell: React.CSSProperties = {
    opacity: framed || status === "error" ? 1 : undefined,
    background: status === "error" && error ? "color-mix(in oklab, #ef4444 7%, var(--background))" : editing ? "var(--background)" : "transparent",
    boxShadow:
      status === "error" && error
        ? "inset 0 0 0 1px color-mix(in oklab, #ef4444 45%, transparent)"
        : editing
          ? "inset 0 0 0 1px color-mix(in oklab, var(--ring) 55%, var(--border))"
          : focused && viaKeys
            ? "inset 0 0 0 1px color-mix(in oklab, var(--ring) 40%, var(--border))"
            : "inset 0 0 0 1px var(--border)",
    transition: reduced ? "none" : `opacity 160ms ${EASE}, box-shadow 200ms ${EASE}, background-color 200ms ${EASE}`,
  };
  const pad: React.CSSProperties = { padding: `${PAD_Y} calc(${PAD_X} + 2px) ${PAD_Y} ${PAD_X}` };
  const flow = wrap ? "whitespace-pre-wrap [overflow-wrap:break-word]" : "whitespace-pre";

  let display: React.ReactNode;
  if (morph) display = wrap ? <SwapOnce key={morph.key} from={morph.from} to={morph.to} onDone={morphDone} /> : <MorphOnce key={morph.key} from={morph.from} to={morph.to} onDone={morphDone} />;
  else display = shown || <span className="text-muted-foreground">{placeholder}</span>;

  return (
    // Spans throughout: it goes inside headings, paragraphs and table cells.
    <span className={`${wrap ? "flex w-full flex-col" : "inline-flex max-w-full flex-col align-baseline"} ${className}`} {...props}>
      <span className={`flex min-w-0 items-center ${wrap ? "w-full" : ""}`}>
        <span
          ref={rootRef}
          className={`group relative flex min-w-0 rounded-[0.4em] ${wrap ? "w-full" : ""} ${disabled ? "" : "cursor-text"}`}
          style={{ ...TYPE, ...pad, margin: `-${PAD_Y} -${PAD_X}`, overflow: "clip" }}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 ${disabled ? "" : "group-hover:opacity-100"}`}
            style={shell}
          />
          {editing ? (
            <span aria-hidden="true" className={`invisible relative min-w-[2ch] ${wrap ? "w-full" : "overflow-hidden"} ${flow}`}>
              {draft || placeholder || "​"}
            </span>
          ) : (
            <span aria-hidden="true" className={`relative min-w-0 ${wrap ? `w-full ${flow}` : morph ? "whitespace-pre" : "overflow-hidden text-ellipsis whitespace-pre"}`}>
              {display}
            </span>
          )}
          <textarea
            ref={fieldRef}
            rows={1}
            wrap={wrap ? "soft" : "off"}
            value={editing ? draft : shown}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={editing ? placeholder : undefined}
            aria-label={label}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={lineText ? `${uid}-line` : undefined}
            spellCheck={editing}
            autoComplete="off"
            onPointerDown={() => {
              pointerFocus.current = true;
            }}
            onFocus={() => {
              setFocused(true);
              begin(!pointerFocus.current);
              pointerFocus.current = false;
            }}
            onBlur={() => {
              setFocused(false);
              if (!editing) return;
              if (blurAction === "save") commit();
              else cancel();
            }}
            onChange={(e) => {
              // A title is one line: pasted line breaks become spaces.
              const text = e.target.value.replace(/\s*\r?\n\s*/g, " ");
              if (!editing) begin(false, true);
              setDraft(text);
              if (error) {
                setError(null);
                setStatus("idle");
              }
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" || (e.key === "F2" && !editing)) {
                e.preventDefault();
                if (editing) commit();
                else begin(true);
              } else if (e.key === "Escape" && editing) {
                e.preventDefault();
                e.stopPropagation();
                cancel();
              }
            }}
            className={`absolute inset-0 m-0 block size-full resize-none overflow-hidden border-0 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-default ${flow}`}
            style={{
              ...TYPE,
              ...pad,
              font: "inherit",
              letterSpacing: "inherit",
              wordSpacing: "inherit",
              textAlign: "inherit",
              textTransform: "inherit",
              color: editing ? "inherit" : "transparent",
              caretColor: editing ? undefined : "transparent",
            }}
          />
        </span>

        {/* Spinner, drawn check or alert beside one-line text; wrapped text says it in the line below. */}
        {!wrap && (
          <span
            aria-hidden="true"
            className="relative flex h-[1em] shrink-0 items-center justify-center"
            style={{
              width: status === "idle" ? 0 : 14,
              marginLeft: status === "idle" ? 0 : 8,
              transition: reduced ? "none" : `width 380ms ${EASE}, margin 380ms ${EASE}`,
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center" style={swap(status === "pending", reduced)}>
              <span className={`size-3 rounded-full border-[1.5px] border-muted-foreground border-t-transparent motion-reduce:animate-none ${status === "pending" ? "animate-spin" : ""}`} />
            </span>
            <span className="absolute inset-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400" style={swap(status === "success", reduced)}>
              <Check drawn={status === "success"} reduced={reduced} />
            </span>
            <span className="absolute inset-0 flex items-center justify-center text-red-600 dark:text-red-400" style={swap(status === "error", reduced)}>
              <Alert />
            </span>
          </span>
        )}
      </span>

      <Line id={`${uid}-line`} show={lineText !== null} tone={tone} wide={!wrap} reduced={reduced}>
        {error ? (
          error
        ) : counting ? (
          <span className="inline-flex items-baseline tabular-nums">
            <NumberRoll value={Math.max(0, left)} duration={600} />
            <TextMorph className="ml-1">{left === 1 ? "character left" : "characters left"}</TextMorph>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex size-3.5 items-center justify-center">
              <span className="absolute inset-0 flex items-center justify-center" style={swap(status === "pending", reduced)}>
                <span className={`size-3 rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none ${status === "pending" ? "animate-spin" : ""}`} />
              </span>
              <span className="absolute inset-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400" style={swap(status === "success", reduced)}>
                <Check drawn={status === "success"} reduced={reduced} />
              </span>
            </span>
            <TextMorph>{status === "success" ? "Saved" : "Saving"}</TextMorph>
          </span>
        )}
      </Line>

      {name && <input type="hidden" name={name} value={saved} />}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </span>
  );
}

function Check({ drawn, reduced }: { drawn: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        style={{ strokeDashoffset: drawn ? 0 : 1, transition: drawn && !reduced ? `stroke-dashoffset 420ms ${EASE} 120ms` : "none" }}
      />
    </svg>
  );
}

function Alert() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75v3.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="8" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}
