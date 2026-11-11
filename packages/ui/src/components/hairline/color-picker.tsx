"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Field, fieldSurface, useFieldIds, useShake } from "./field";
import { enterStyle, themeVars, useDismiss, useFloating, usePresence } from "./floating";
import { TextMorph } from "./text-morph";
import { EASE_OUT, EASE_THROW, INTERACTION_FOCUS, INTERACTION_PRESS, interactionIcon, useInteractionReducedMotion } from "./ui-interaction-motion";
import { colorCss, formatColor, parseColor, sameColor, type ColorFormat, type Hsla } from "./color-picker-color";

export type { ColorFormat } from "./color-picker-color";

export interface ColorPickerProps {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  onValueCommit?: (value: string | null) => void;
  format?: ColorFormat;
  alpha?: boolean;
  swatches?: readonly string[];
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

const FALLBACK: Hsla = { h: 224, s: 72, l: 53, a: 1 };
const FORMATS: ColorFormat[] = ["hex", "rgb", "hsl"];
const DEFAULT_SWATCHES = ["#305DDE", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#0891B2"];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const areaTransform = (color: Hsla, size: { w: number; h: number }) => `translate3d(${(color.s / 100) * size.w}px, ${(1 - color.l / 100) * size.h}px, 0) translate(-50%, -50%)`;
const railTransform = (value: number, width: number) => `translate3d(${value * width}px, -50%, 0) translateX(-50%)`;
/** Drawn under anything that can be see-through, so opacity reads as opacity. Theme tokens only. */
const CHECKER: React.CSSProperties = {
  backgroundImage: "repeating-conic-gradient(color-mix(in oklab, var(--foreground) 14%, transparent) 0 25%, transparent 0 50%)",
  backgroundSize: "8px 8px",
  backgroundColor: "var(--background)",
};

function ClockwiseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
      <path d="m4.5 6 3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
      <rect x="5.5" y="5.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M10.5 3.5h-6a1 1 0 0 0-1 1v6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function ColorPicker({
  value,
  defaultValue = "#305DDE",
  onValueChange,
  onValueCommit,
  format = "hex",
  alpha = false,
  swatches = DEFAULT_SWATCHES,
  label,
  hint,
  error,
  disabled,
  name,
  id,
  className = "",
}: ColorPickerProps) {
  const reduced = useInteractionReducedMotion();
  const ids = useFieldIds(id);
  const [own, setOwn] = React.useState<string | null>(defaultValue);
  const current = value !== undefined ? value : own;
  const parsed = current ? parseColor(current) : null;
  const [lastColor, setLastColor] = React.useState<Hsla>(() => parsed ?? FALLBACK);
  const color = parsed ?? lastColor;
  const [outputFormat, setOutputFormat] = React.useState<ColorFormat>(format);
  const [seenFormat, setSeenFormat] = React.useState(format);
  if (format !== seenFormat) {
    setSeenFormat(format);
    setOutputFormat(format);
  }
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const [badInput, setBadInput] = React.useState(false);
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");
  const [areaSize, setAreaSize] = React.useState({ w: 256, h: 144 });
  const [railWidth, setRailWidth] = React.useState(224);
  const anchor = React.useRef<HTMLDivElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const area = React.useRef<HTMLDivElement>(null);
  const areaThumb = React.useRef<HTMLSpanElement>(null);
  const hueTrack = React.useRef<HTMLDivElement>(null);
  const hueThumb = React.useRef<HTMLSpanElement>(null);
  const alphaTrack = React.useRef<HTMLDivElement>(null);
  const alphaThumb = React.useRef<HTMLSpanElement>(null);
  const alphaFill = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const triggerSwatch = React.useRef<HTMLSpanElement>(null);
  const previewSwatch = React.useRef<HTMLSpanElement>(null);
  const gesture = React.useRef<"area" | "hue" | "alpha" | null>(null);
  const latest = React.useRef(color);
  const copyTimer = React.useRef(0);
  // Thumbs glide to a colour picked from a swatch, the field or the keys, but follow a drag exactly; nothing glides
  // until the panel's first frames are placed.
  const settled = React.useRef(false);
  const shakeRef = useShake<HTMLDivElement>(badInput);
  const { mounted, shown } = usePresence(open, 180);
  const place = useFloating({ open: mounted, anchor, floating: surface, side: "bottom", align: "start", offset: 6 });
  const [vars, setVars] = React.useState<React.CSSProperties>({});

  const text = current ? formatColor(color, outputFormat) : "";

  const paint = React.useCallback(
    (next: Hsla) => {
      const glide = settled.current && !gesture.current && !reduced;
      const move = `${glide ? `transform 420ms ${EASE_OUT}, ` : ""}scale 220ms ${EASE_THROW}`;
      for (const thumb of [areaThumb.current, hueThumb.current, alphaThumb.current]) thumb?.style.setProperty("transition", reduced ? "none" : move);
      areaThumb.current?.style.setProperty("transform", areaTransform(next, areaSize));
      hueThumb.current?.style.setProperty("transform", railTransform(next.h / 360, railWidth));
      alphaThumb.current?.style.setProperty("transform", railTransform(next.a, railWidth));
      if (area.current) {
        area.current.style.transition = glide ? `background-color 420ms ${EASE_OUT}` : "none";
        area.current.style.backgroundColor = `hsl(${next.h} 100% 50%)`;
      }
      if (alphaFill.current) alphaFill.current.style.background = `linear-gradient(to right, transparent, hsl(${next.h} ${next.s}% ${next.l}%))`;
      if (triggerSwatch.current) triggerSwatch.current.style.backgroundColor = colorCss(next);
      if (previewSwatch.current) previewSwatch.current.style.backgroundColor = colorCss(next);
      if (input.current && document.activeElement !== input.current) input.current.value = formatColor(next, outputFormat);
    },
    [areaSize, railWidth, outputFormat, reduced],
  );

  React.useLayoutEffect(() => {
    latest.current = color;
    if (mounted) paint(color);
  }, [color, mounted, paint]);

  React.useLayoutEffect(() => {
    if (!mounted) return;
    setVars(themeVars(anchor.current));
    const measure = () => {
      const box = area.current?.getBoundingClientRect();
      if (box) setAreaSize((old) => (old.w === box.width && old.h === box.height ? old : { w: box.width, h: box.height }));
      const width = hueTrack.current?.getBoundingClientRect().width;
      if (width) setRailWidth((old) => (old === width ? old : width));
    };
    measure();
    settled.current = false;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        settled.current = true;
      });
    });
    const observer = new ResizeObserver(measure);
    if (area.current) observer.observe(area.current);
    if (hueTrack.current) observer.observe(hueTrack.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [mounted, alpha]);

  React.useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const close = (refocus: boolean) => {
    setOpen(false);
    setDraft(null);
    setBadInput(false);
    if (refocus) trigger.current?.focus({ preventScroll: true });
  };
  useDismiss(open, (reason) => close(reason === "escape"), [anchor, surface]);

  const emit = (next: Hsla | null) => {
    const formatted = next ? formatColor(next, outputFormat) : null;
    if (value === undefined) setOwn(formatted);
    onValueChange?.(formatted);
    return formatted;
  };

  const commit = (next: Hsla, notify = true) => {
    const normalised = { ...next, a: alpha ? next.a : 1 };
    latest.current = normalised;
    setLastColor(normalised);
    setCopyState("idle");
    const formatted = formatColor(normalised, outputFormat);
    if (value === undefined) setOwn(formatted);
    if (notify) onValueChange?.(formatted);
    return formatted;
  };

  const changeFromPointer = (kind: "area" | "hue" | "alpha", e: React.PointerEvent<HTMLDivElement>) => {
    const target = kind === "area" ? area.current : kind === "hue" ? hueTrack.current : alphaTrack.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const old = latest.current;
    let next: Hsla;
    if (kind === "area") {
      next = { ...old, s: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100), l: clamp(100 - ((e.clientY - rect.top) / rect.height) * 100, 0, 100), a: alpha ? old.a : 1 };
    } else if (kind === "hue") {
      next = { ...old, h: clamp(((e.clientX - rect.left) / rect.width) * 360, 0, 359.999), a: alpha ? old.a : 1 };
    } else {
      next = { ...old, a: clamp((e.clientX - rect.left) / rect.width, 0, 1) };
    }
    latest.current = next;
    paint(next);
    onValueChange?.(formatColor(next, outputFormat));
  };

  const begin = (kind: "area" | "hue" | "alpha", e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    gesture.current = kind;
    const held = kind === "area" ? areaThumb.current : kind === "hue" ? hueThumb.current : alphaThumb.current;
    held?.style.setProperty("scale", "1.25");
    e.currentTarget.setPointerCapture(e.pointerId);
    changeFromPointer(kind, e);
  };

  const end = () => {
    if (!gesture.current) return;
    for (const thumb of [areaThumb.current, hueThumb.current, alphaThumb.current]) thumb?.style.setProperty("scale", "1");
    gesture.current = null;
    const formatted = commit(latest.current, false);
    onValueCommit?.(formatted);
  };

  const keyAdjust = (kind: "area" | "hue" | "alpha", e: React.KeyboardEvent<HTMLDivElement>) => {
    const old = latest.current;
    let next = { ...old };
    const direction = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (kind === "area") {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") next.s = clamp(old.s + direction * 2, 0, 100);
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") next.l = clamp(old.l + direction * 2, 0, 100);
      else if (e.key === "PageUp" || e.key === "PageDown") next.l = clamp(old.l + (e.key === "PageUp" ? 10 : -10), 0, 100);
      else if (e.key === "Home") next = { ...old, s: 0, l: 100 };
      else if (e.key === "End") next = { ...old, s: 100, l: 0 };
      else return;
    } else if (kind === "hue") {
      if (direction) next.h = (old.h + direction * (e.shiftKey ? 15 : 2) + 360) % 360;
      else if (e.key === "Home") next.h = 0;
      else if (e.key === "End") next.h = 359;
      else return;
    } else {
      if (direction) next.a = clamp(old.a + direction * (e.shiftKey ? 0.1 : 0.02), 0, 1);
      else if (e.key === "Home") next.a = 0;
      else if (e.key === "End") next.a = 1;
      else return;
    }
    e.preventDefault();
    const formatted = commit(next);
    onValueCommit?.(formatted);
  };

  const settle = () => {
    if (draft === null) return;
    const next = parseColor(draft);
    if (!next) {
      setBadInput(true);
      return;
    }
    setBadInput(false);
    setDraft(null);
    const formatted = commit(next);
    onValueCommit?.(formatted);
  };

  const cycleFormat = () => {
    const next = FORMATS[(FORMATS.indexOf(outputFormat) + 1) % FORMATS.length];
    setOutputFormat(next);
    if (current) {
      const formatted = formatColor(color, next);
      if (value === undefined) setOwn(formatted);
      onValueChange?.(formatted);
    }
  };

  const copy = async () => {
    if (!text) return;
    window.clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    copyTimer.current = window.setTimeout(() => setCopyState("idle"), 1600);
  };

  const describedBy = [hint && !error ? ids.hint : null, error ? ids.error : null].filter(Boolean).join(" ") || undefined;
  const copyLabel = copyState === "copied" ? "Copied" : copyState === "failed" ? "Failed" : "Copy";

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
          onClick={() => (open ? close(false) : setOpen(true))}
          className={`${fieldSurface({ invalid: !!error, disabled })} h-9 cursor-pointer gap-2.5 px-3 text-left text-[16px] sm:text-[13.5px] ${INTERACTION_FOCUS}`}
        >
          <span className="relative flex size-5 shrink-0 overflow-hidden rounded-full" style={CHECKER}>
            <span ref={triggerSwatch} className="size-full transition-[background-color] duration-300" style={{ backgroundColor: current ? colorCss(color) : "transparent" }} />
            <span aria-hidden="true" className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_12%,transparent)]" />
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">
            <TextMorph animateWidth={false}>{text || "Choose a colour"}</TextMorph>
          </span>
          <span className="text-muted-foreground transition-transform duration-300" style={{ transform: open ? "rotate(180deg)" : "none" }}>
            <ClockwiseIcon />
          </span>
        </button>
      </div>
      {name && <input type="hidden" name={name} value={current ?? ""} />}
      {mounted &&
        createPortal(
          <div
            ref={surface}
            role="dialog"
            aria-label="Choose a colour"
            className="fixed left-0 top-0 z-[55] w-[280px] max-w-[calc(100vw-16px)] rounded-[18px] bg-popover p-3 text-popover-foreground shadow-[0_0_0_1px_var(--border)]"
            style={{ ...vars, left: place.x, top: place.y, transformOrigin: place.origin, ...enterStyle(shown, place.side, reduced) }}
          >
            <div
              ref={area}
              role="slider"
              tabIndex={0}
              aria-label="Saturation and lightness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(color.l)}
              aria-valuetext={`${Math.round(color.s)}% saturation, ${Math.round(color.l)}% lightness`}
              onPointerDown={(e) => begin("area", e)}
              onPointerMove={(e) => gesture.current === "area" && changeFromPointer("area", e)}
              onPointerUp={end}
              onPointerCancel={end}
              onLostPointerCapture={end}
              onKeyDown={(e) => keyAdjust("area", e)}
              className="relative h-36 w-full cursor-crosshair touch-none rounded-[12px] bg-[linear-gradient(to_top,#000,transparent),linear-gradient(to_right,#fff,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)] outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--ring)]"
              style={{ backgroundColor: `hsl(${color.h} 100% 50%)` }}
            >
              <span
                ref={areaThumb}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 size-4 rounded-full border border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]"
                style={{ transform: areaTransform(color, areaSize) }}
              />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className="relative flex size-9 shrink-0 overflow-hidden rounded-full" style={CHECKER}>
                <span ref={previewSwatch} className="size-full" style={{ backgroundColor: colorCss(color) }} />
                <span aria-hidden="true" className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_var(--border)]" />
              </span>
              <div className="min-w-0 flex-1">
                <div
                  ref={hueTrack}
                  role="slider"
                  tabIndex={0}
                  aria-label="Hue"
                  aria-valuemin={0}
                  aria-valuemax={359}
                  aria-valuenow={Math.round(color.h)}
                  onPointerDown={(e) => begin("hue", e)}
                  onPointerMove={(e) => gesture.current === "hue" && changeFromPointer("hue", e)}
                  onPointerUp={end}
                  onPointerCancel={end}
                  onLostPointerCapture={end}
                  onKeyDown={(e) => keyAdjust("hue", e)}
                  className={`relative h-4 cursor-ew-resize touch-pan-y rounded-full outline-none ${INTERACTION_FOCUS}`}
                >
                  <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]" />
                  <span ref={hueThumb} aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 size-4 rounded-full bg-background shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_35%,var(--border))]" style={{ transform: railTransform(color.h / 360, railWidth) }} />
                </div>
                {alpha && (
                  <div
                    ref={alphaTrack}
                    role="slider"
                    tabIndex={0}
                    aria-label="Opacity"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(color.a * 100)}
                    onPointerDown={(e) => begin("alpha", e)}
                    onPointerMove={(e) => gesture.current === "alpha" && changeFromPointer("alpha", e)}
                    onPointerUp={end}
                    onPointerCancel={end}
                    onLostPointerCapture={end}
                    onKeyDown={(e) => keyAdjust("alpha", e)}
                    className={`relative mt-2 h-4 cursor-ew-resize touch-pan-y rounded-full outline-none ${INTERACTION_FOCUS}`}
                  >
                    <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full" style={CHECKER}>
                      <div ref={alphaFill} className="size-full" style={{ background: `linear-gradient(to right, transparent, hsl(${color.h} ${color.s}% ${color.l}%))` }} />
                      <div className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_var(--border)]" />
                    </div>
                    <span ref={alphaThumb} aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 size-4 rounded-full bg-background shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_35%,var(--border))]" style={{ transform: railTransform(color.a, railWidth) }} />
                  </div>
                )}
              </div>
            </div>

            <div ref={shakeRef} className="mt-3 flex h-8 items-center rounded-full bg-background shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--ring),0_0_0_3px_color-mix(in_oklab,var(--ring)_16%,transparent)]">
              <input
                ref={input}
                value={draft ?? text}
                placeholder="#305DDE"
                aria-label="Colour value"
                aria-invalid={badInput || undefined}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setBadInput(false);
                }}
                onBlur={settle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    settle();
                  }
                }}
                className="h-full min-w-0 flex-1 bg-transparent pl-3 font-mono text-[12px] uppercase outline-none placeholder:text-muted-foreground/60"
              />
              <button type="button" onClick={cycleFormat} className={`h-6 shrink-0 rounded-full px-2 font-mono text-[10.5px] uppercase text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}>
                {outputFormat}
              </button>
              <button type="button" onClick={copy} disabled={!text} aria-label={copyLabel} className={`mr-1 flex h-6 min-w-6 shrink-0 items-center justify-center gap-1 rounded-full px-1.5 text-[11px] text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-40 ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}>
                <span aria-hidden="true" className="relative flex size-3.5 items-center justify-center">
                  <span className="absolute inset-0 flex items-center justify-center" style={interactionIcon(copyState !== "copied", reduced)}>
                    <CopyIcon />
                  </span>
                  <svg viewBox="0 0 16 16" fill="none" className="absolute size-3.5">
                    <path
                      d="m3.75 8.25 2.75 2.75 5.75-6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      strokeDasharray={1}
                      style={{ strokeDashoffset: copyState === "copied" ? 0 : 1, transition: reduced ? "none" : `stroke-dashoffset ${copyState === "copied" ? 360 : 120}ms ${EASE_OUT}` }}
                    />
                  </svg>
                </span>
                <TextMorph>{copyLabel}</TextMorph>
              </button>
            </div>
            <div className="grid" style={{ gridTemplateRows: badInput ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-rows 280ms ${EASE_OUT}` }}>
              <p className="min-h-0 overflow-hidden pt-1.5 text-[11.5px] text-red-600 dark:text-red-400">Use hex, RGB or HSL, for example #305DDE.</p>
            </div>

            {swatches.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                {swatches.map((swatch) => {
                  const parsedSwatch = parseColor(swatch);
                  if (!parsedSwatch) return null;
                  const active = sameColor(parsedSwatch, color);
                  return (
                    <button
                      key={swatch}
                      type="button"
                      aria-label={`Use ${swatch}`}
                      aria-pressed={active}
                      onClick={() => {
                        const formatted = commit(parsedSwatch);
                        onValueCommit?.(formatted);
                      }}
                      className={`relative flex size-6 cursor-pointer items-center justify-center rounded-full bg-muted ${INTERACTION_FOCUS}`}
                      style={{ transition: reduced ? "none" : `transform 300ms ${EASE_THROW}`, transform: active ? "scale(1.12)" : "scale(1)" }}
                    >
                      <span className="size-5 rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_12%,transparent)]" style={{ backgroundColor: swatch }} />
                      <span
                        className="absolute size-7 rounded-full shadow-[0_0_0_1px_var(--ring)]"
                        aria-hidden="true"
                        style={{ opacity: active ? 1 : 0, scale: active ? "1" : "0.7", transition: reduced ? "none" : `opacity 220ms ${EASE_OUT}, scale 320ms ${EASE_THROW}` }}
                      />
                    </button>
                  );
                })}
                {current && (
                  <button
                    type="button"
                    onClick={() => {
                      emit(null);
                      onValueCommit?.(null);
                      setDraft(null);
                    }}
                    className={`ml-auto h-7 rounded-full px-2 text-[11.5px] text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body,
        )}
    </Field>
  );
}

export { parseColor } from "./color-picker-color";
export default ColorPicker;
