"use client";

import * as React from "react";
import { Field, fieldSurface, useFieldIds, useShake } from "./field";
import { NumberRoll } from "./number-roll";
import { EASE_OUT, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * TEXTAREA: grows with what you write
 *
 *   grow     a hidden copy of the text is measured and the box
 *            eases to its height, between minRows and maxRows,
 *            then scrolls; it never snaps a line taller
 *   scroll   past maxRows the browser's scrollbar never shows:
 *            lines fade out at the top and bottom edges instead of
 *            being sliced, and a 3px thumb inside the padding
 *            shows where you are while you scroll, then fades;
 *            it can be dragged
 *   compose  `footer` (tools) and `action` (send) sit inside the box;
 *            `onSubmit` sends on ⌘↵ / Ctrl+Enter, with the hint rising
 *            in beside the action once there's something to send
 *   count    with maxLength, the count rolls as you type and turns
 *            amber in the last tenth, red at the limit
 *   error    same as every field: red line, hint gives way, shake
 *
 * Text is 16px on phones so iOS never zooms the page on focus.
 * ───────────────────────────────────────────────────────── */

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onSubmit"> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  minRows?: number;
  maxRows?: number;
  /** Show "12 / 280" beside the label when maxLength is set. */
  showCount?: boolean;
  /** Tools inside the box, under the text on the left (attach, emoji). */
  footer?: React.ReactNode;
  /** The main action inside the box on the right (send). */
  action?: React.ReactNode;
  /** ⌘↵ / Ctrl+Enter calls this with the text. */
  onSubmit?: (value: string) => void;
  onValueChange?: (value: string) => void;
  ref?: React.Ref<HTMLTextAreaElement>;
  className?: string;
  textareaClassName?: string;
}

const TYPE = "px-4 py-[9px] text-[16px] leading-[1.5] sm:text-[13.5px] sm:leading-[1.55]";
const FADE = 14;

const subscribeNoop = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

export function Textarea({
  label,
  hint,
  error,
  minRows = 3,
  maxRows = 10,
  showCount = true,
  footer,
  action,
  onSubmit,
  onValueChange,
  ref,
  id,
  className = "",
  textareaClassName = "",
  value,
  defaultValue,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  maxLength,
  disabled,
  required,
  ...props
}: TextareaProps) {
  const reduced = useInteractionReducedMotion();
  const ids = useFieldIds(id);
  const mac = React.useSyncExternalStore(subscribeNoop, isMac, () => true);
  const [text, setText] = React.useState(String(defaultValue ?? ""));
  const current = value !== undefined ? String(value) : text;
  const mirror = React.useRef<HTMLDivElement>(null);
  const area = React.useRef<HTMLTextAreaElement>(null);
  const thumb = React.useRef<HTMLSpanElement>(null);
  const [height, setHeight] = React.useState<number | null>(null);
  const [overflows, setOverflows] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const fadeTimer = React.useRef(0);
  const drag = React.useRef<{ y: number; top: number } | null>(null);
  const shakeRef = useShake<HTMLDivElement>(!!error);

  // Height from the mirror, in whole lines between minRows and maxRows (line metrics read from CSS, so
  // the 16px phone type and the 13.5px desktop type both measure right).
  React.useLayoutEffect(() => {
    const el = mirror.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const line = parseFloat(style.lineHeight) || 21;
      const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const next = Math.round(Math.min(maxRows * line + pad, Math.max(minRows * line + pad, el.offsetHeight)));
      setHeight((h) => (h === next ? h : next));
      setOverflows((o) => (o === el.offsetHeight > maxRows * line + pad + 1 ? o : !o));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [current, minRows, maxRows]);

  // Edge fades and thumb, written straight to the elements: no render per scroll frame.
  const paint = React.useCallback(
    (show: boolean) => {
      const el = area.current;
      const t = thumb.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      const top = max > 1 ? Math.min(FADE, el.scrollTop) : 0;
      const bottom = max > 1 ? Math.min(FADE, max - el.scrollTop) : 0;
      const mask = `linear-gradient(to bottom, transparent 0, #000 ${top}px, #000 calc(100% - ${bottom}px), transparent 100%)`;
      el.style.maskImage = mask;
      el.style.webkitMaskImage = mask;
      if (!t) return;
      if (max <= 1) {
        t.style.opacity = "0";
        return;
      }
      const track = el.clientHeight - 12;
      const size = Math.max(24, (el.clientHeight / el.scrollHeight) * track);
      t.style.height = `${size}px`;
      t.style.transform = `translateY(${6 + (el.scrollTop / max) * (track - size)}px)`;
      if (show) {
        t.style.opacity = "1";
        window.clearTimeout(fadeTimer.current);
        fadeTimer.current = window.setTimeout(() => {
          if (!drag.current && thumb.current) thumb.current.style.opacity = "0";
        }, 900);
      }
    },
    [],
  );

  React.useEffect(() => () => window.clearTimeout(fadeTimer.current), []);
  React.useLayoutEffect(() => paint(false), [paint, height, current]);

  const setRefs = (el: HTMLTextAreaElement | null) => {
    area.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = el;
  };

  const count = current.length;
  const near = maxLength ? count >= maxLength * 0.9 : false;
  const full = maxLength ? count >= maxLength : false;
  const describedBy = [hint && !error ? ids.hint : null, error ? ids.error : null].filter(Boolean).join(" ") || undefined;
  const canSend = !!onSubmit && focused && current.trim().length > 0;

  return (
    <Field
      id={ids.id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
      aside={
        maxLength && showCount ? (
          <span className={full ? "text-red-600 dark:text-red-400" : near ? "text-amber-600 dark:text-amber-400" : ""} style={{ transition: "color 200ms" }}>
            <NumberRoll value={count} /> / {maxLength}
          </span>
        ) : undefined
      }
    >
      <div ref={shakeRef} className={`${fieldSurface({ invalid: !!error, disabled, round: false })} flex-col items-stretch`}>
        <div className="relative">
          {/* The measuring copy: same type and padding, never seen. */}
          <div ref={mirror} aria-hidden="true" className={`pointer-events-none invisible absolute inset-x-0 top-0 whitespace-pre-wrap break-words ${TYPE} ${textareaClassName}`}>
            {current + "​"}
          </div>
          <textarea
            ref={setRefs}
            id={ids.id}
            value={value}
            defaultValue={defaultValue}
            maxLength={maxLength}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-keyshortcuts={onSubmit ? "Meta+Enter Control+Enter" : undefined}
            onChange={(e) => {
              if (value === undefined) setText(e.target.value);
              onChange?.(e);
              onValueChange?.(e.target.value);
            }}
            onKeyDown={(e) => {
              onKeyDown?.(e);
              if (onSubmit && e.key === "Enter" && (e.metaKey || e.ctrlKey) && current.trim()) {
                e.preventDefault();
                onSubmit(current);
              }
            }}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            onScroll={() => paint(true)}
            style={{ height: height ?? undefined, transition: reduced ? "none" : `height 260ms ${EASE_OUT}` }}
            className={`block w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${overflows ? "pr-6" : ""} ${TYPE} ${textareaClassName}`}
            {...props}
          />
          {/* Our scroll thumb: 3px, inside the padding, shown while scrolling; a wider strip takes the drag. */}
          {overflows && (
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 h-full w-4 touch-none"
              onPointerDown={(e) => {
                const el = area.current;
                if (!el) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { y: e.clientY, top: el.scrollTop };
                paint(true);
              }}
              onPointerMove={(e) => {
                const el = area.current;
                const d = drag.current;
                if (!el || !d) return;
                const size = parseFloat(thumb.current?.style.height ?? "24");
                const track = el.clientHeight - 12 - size;
                el.scrollTop = d.top + ((e.clientY - d.y) / Math.max(1, track)) * (el.scrollHeight - el.clientHeight);
              }}
              onPointerUp={() => {
                drag.current = null;
                paint(true);
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <span
                ref={thumb}
                className="absolute right-1.5 top-0 w-[3px] rounded-full bg-foreground/25 transition-[opacity,width] duration-300 hover:w-[5px] hover:bg-foreground/35"
                style={{ opacity: 0 }}
              />
            </span>
          )}
        </div>
        {(footer || action || onSubmit) && (
          <div className="flex min-h-10 items-center gap-2 px-2 pb-2">
            <div className="flex min-w-0 flex-1 items-center gap-1">{footer}</div>
            {onSubmit && (
              <span
                aria-hidden="true"
                className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline"
                style={{ opacity: canSend ? 1 : 0, filter: canSend || reduced ? "none" : "blur(3px)", transition: reduced ? "none" : `opacity 200ms ${EASE_OUT}, filter 200ms ${EASE_OUT}` }}
              >
                {mac ? "⌘↵" : "Ctrl ↵"} to send
              </span>
            )}
            {action}
          </div>
        )}
      </div>
    </Field>
  );
}

export default Textarea;
