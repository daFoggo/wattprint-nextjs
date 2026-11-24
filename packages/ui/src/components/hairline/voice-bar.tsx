"use client";

import * as React from "react";
import { ArrowUp, Mic, MicOff, Plus, X } from "lucide-react";
import {
  DitherHorizon,
  type DitherHorizonHandle,
  type DitherHorizonPalette,
  type DitherHorizonProps,
  type DitherHorizonPulseOptions,
  type DitherHorizonState,
} from "./dither-horizon";
import { TextMorph } from "./text-morph";
import {
  EASE_OUT,
  INTERACTION_FOCUS,
  INTERACTION_PRESS,
  createSpring,
  interactionIcon,
  useInteractionReducedMotion,
  type Spring,
} from "./ui-interaction-motion";
import { BANDS, createAudioMeter, elementSource, type AudioMeter } from "./voice-audio";

/* ─────────────────────────────────────────────────────────
 * VOICE BAR: multimodal AI & voice composer on a dither lattice
 *
 *   idle        clean hairline bar ("Ask me anything…") with a prompt that
 *               grows line by line up to six lines (Shift+Enter for a new
 *               line, Enter sends), left leading/attach control and one
 *               right waveform button. Typing sends a quiet tick of cells
 *               under the caret and morphs Waveform into Send
 *   activate    clicking the waveform stretches one circle through a
 *               concave liquid waist (analytic SVG geometry, no blur
 *               filter) into [Mic] and [X], while cell comets burst
 *               out of the button and light the dither wave
 *   actions     every control talks to the dither: attaching a file,
 *               switching Agent mode or calling ref.pulse() fires a
 *               localized Bayer shockwave + micro-sparks from that button;
 *               muting sweeps a directional wipe out of [Mic]
 *   listening   multi-band wave driven by real mic FFT (useVoiceAudio) or
 *               level/spectrum props; muting folds it into a dotted row
 *   words       every new word of the transcript condenses out of the
 *               wave: its cells lift off, land in the word's shape on the
 *               same grid and dissolve as the crisp word fades in
 *   thinking    cools into cyan → periwinkle → lavender → violet and
 *               flattens into a horizontal scanner gliding edge to edge
 *   speaking    center-weighted crest; the reply's words condense the
 *               same way
 *   dismiss     clicking [X] (or Escape) merges [Mic] and [X] back
 *               through the liquid waist into [Waveform] while the wave
 *               breaks into cell comets drawn into the button, then sleeps
 * ───────────────────────────────────────────────────────── */

export type VoiceBarState = DitherHorizonState;
export type VoiceBarLayout = "bar" | "card";
export type VoiceBarHandle = DitherHorizonHandle;

export interface VoiceBarLabels {
  placeholder: string;
  listening: string;
  muted: string;
  thinking: string;
  speaking: string;
  startVoice: string;
  send: string;
  mute: string;
  unmute: string;
  cancel: string;
  attach: string;
}

export interface VoiceBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit" | "defaultValue"> {
  ref?: React.Ref<VoiceBarHandle>;
  /** Controlled state. Omit for uncontrolled state via defaultState. */
  state?: VoiceBarState;
  defaultState?: VoiceBarState;
  onStateChange?: (state: VoiceBarState) => void;
  /** Controlled text prompt in idle mode. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called when the user submits typed text. Returning a Promise holds thinking until it settles. */
  onSubmit?: (value: string) => void | Promise<unknown>;
  /** Called when voice mode starts from the waveform button. */
  onVoiceStart?: () => void;
  /** Called when active mode is dismissed via X or Escape. */
  onCancel?: () => void;
  /** Controlled muted state while listening. */
  muted?: boolean;
  defaultMuted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  /** Live partial dictation or streamed reply shown with word-by-word blur reveal. */
  transcript?: string;
  /** Optional attachment chips that fold smoothly open above the prompt input. */
  attachments?: React.ReactNode;
  /** Inline error message shown in place (e.g. microphone blocked or failed request). */
  error?: React.ReactNode;
  /** Read every frame (0..1) without re-rendering React. Pairs with useVoiceAudio. */
  getLevel?: () => number;
  /** Read every frame (frequency bands 0..1). Pairs with useVoiceAudio. */
  getSpectrum?: () => ArrayLike<number>;
  /** Scalar loudness fallback (0..1). */
  level?: number;
  /** "bar" (compact multimodal prompt bar) or "card" (voice agent card with centered transcript and grounded controls). */
  layout?: VoiceBarLayout;
  /** Left-side control (e.g. an Agent/mode pill). Defaults to a + button when omitted. */
  leading?: React.ReactNode;
  /** Click handler for the default + button when `leading` is omitted. */
  onAttach?: () => void;
  /** Hide the default + button when neither `leading` nor `onAttach` is wanted. */
  showAttach?: boolean;
  /** "spectral" (vivid rainbow listening + cool cyan/violet thinking) or "theme" (--chart-1..5). */
  palette?: DitherHorizonPalette;
  /** Custom CSS color stops for the dither horizon. */
  colors?: readonly string[];
  /** Pointer hover pulls pinpoint embers up off the dither crest. */
  interactive?: boolean;
  /** Dither cell size in CSS px, rounded to whole device pixels (default 2.5). */
  cellSize?: number;
  /** Prompt placeholder (shorthand for labels.placeholder). */
  placeholder?: string;
  labels?: Partial<VoiceBarLabels>;
  disabled?: boolean;
}

const DEFAULT_LABELS: VoiceBarLabels = {
  placeholder: "Ask me anything...",
  listening: "Listening...",
  muted: "Muted",
  thinking: "Thinking...",
  speaking: "Speaking...",
  startVoice: "Start voice mode",
  send: "Send prompt",
  mute: "Mute microphone",
  unmute: "Unmute microphone",
  cancel: "End voice mode",
  attach: "Add attachment",
};

const SHEEN =
  "[mask-image:linear-gradient(90deg,rgb(0_0_0/0.48)_34%,#000_50%,rgb(0_0_0/0.48)_66%)] [mask-size:200%_100%] animate-[ui-sheen_1.6s_linear_infinite] motion-reduce:animate-none motion-reduce:[mask-image:none]";

// Analytic liquid mitosis constants (two 36px circles with a 10px gap inside an 84×38 stage)
const STAGE_W = 84;
const STAGE_H = 38;
const CIRCLE_R = 18;
const CY = 19;
const CX_RIGHT = 65;
const SPLIT_DIST = 46; // cx1 = 19, cx2 = 65 -> 10px gap between two 36px circles
const SNAP_DIST = CIRCLE_R * 2 + 7; // 43px: concave neck thins and snaps cleanly into two circles
const MITOSIS_SPRING = { stiffness: 195, damping: 23 };

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const n2 = (v: number) => Math.round(v * 100) / 100;
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function circleSubpath(cx: number, cy: number, r: number) {
  return `M${n2(cx - r)} ${n2(cy)}A${n2(r)} ${n2(r)} 0 1 0 ${n2(cx + r)} ${n2(cy)}A${n2(r)} ${n2(r)} 0 1 0 ${n2(cx - r)} ${n2(cy)}Z`;
}

/** Pure analytic liquid mitosis outline for two circles separating by `dist`. Zero SVG blur filters. */
export function mitosisPath(dist: number, cx2 = CX_RIGHT, cy = CY, r = CIRCLE_R) {
  const d = Math.max(0, dist);
  if (d < 0.35) return circleSubpath(cx2, cy, r);
  const cx1 = cx2 - d;
  if (d >= SNAP_DIST) return `${circleSubpath(cx1, cy, r)} ${circleSubpath(cx2, cy, r)}`;

  const u = clamp(d / SNAP_DIST, 0, 1);
  const pinch = smoothstep(0.14, 1, u);
  const thin = r * (1 - 0.88 * Math.pow(pinch, 1.3));
  const mid = (cx1 + cx2) * 0.5;
  const pull = (mid - cx1) * 0.56;

  return (
    `M${n2(cx1)} ${n2(cy - r)}` +
    `C${n2(cx1 + pull)} ${n2(cy - r)} ${n2(mid - pull)} ${n2(cy - thin)} ${n2(mid)} ${n2(cy - thin)}` +
    `C${n2(mid + pull)} ${n2(cy - thin)} ${n2(cx2 - pull)} ${n2(cy - r)} ${n2(cx2)} ${n2(cy - r)}` +
    `A${n2(r)} ${n2(r)} 0 0 1 ${n2(cx2)} ${n2(cy + r)}` +
    `C${n2(cx2 - pull)} ${n2(cy + r)} ${n2(mid + pull)} ${n2(cy + thin)} ${n2(mid)} ${n2(cy + thin)}` +
    `C${n2(mid - pull)} ${n2(cy + thin)} ${n2(cx1 + pull)} ${n2(cy + r)} ${n2(cx1)} ${n2(cy + r)}` +
    `A${n2(r)} ${n2(r)} 0 0 1 ${n2(cx1)} ${n2(cy - r)}Z`
  );
}

function WaveformGlyph({ className = "size-[17px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" className={className}>
      <rect x="2.25" y="7" width="1.9" height="4" rx="0.95" />
      <rect x="6.05" y="4.5" width="1.9" height="9" rx="0.95" />
      <rect x="9.85" y="2.75" width="1.9" height="12.5" rx="0.95" />
      <rect x="13.65" y="6" width="1.9" height="6" rx="0.95" />
    </svg>
  );
}

/** When a condensing word's text fades in: as its cells land (DitherHorizon: spread 0.16 s + flight 0.42 s). */
const WORD_LANDS_MS = 380;

/**
 * Word-by-word streaming transcript. Words already shown stay mounted; a word at a new position is reported through
 * onNewWords (the bar condenses it out of the dither) and fades in as its cells land. A revised last word just blurs in.
 */
function StreamingTranscript({
  text,
  reduced,
  centered,
  onNewWords,
}: {
  text: string;
  reduced: boolean;
  centered: boolean;
  onNewWords?: (els: HTMLElement[]) => void;
}) {
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const ref = React.useRef<HTMLParagraphElement>(null);
  // Which positions are new since the last text: everything from the old count on (nothing on first mount).
  const [seen, setSeen] = React.useState({ text, from: words.length, count: words.length });
  if (seen.text !== text) setSeen({ text, from: Math.min(seen.count, words.length), count: words.length });
  const condensing = Boolean(onNewWords) && !reduced;

  React.useLayoutEffect(() => {
    if (!condensing) return;
    const els = ref.current ? Array.from(ref.current.querySelectorAll<HTMLElement>("[data-new]:not([data-condensed])")) : [];
    if (!els.length) return;
    els.forEach((el) => (el.dataset.condensed = ""));
    onNewWords?.(els);
  }, [text, condensing, onNewWords]);

  return (
    <p
      ref={ref}
      className={`text-foreground ${
        centered
          ? "max-w-[26ch] text-center text-[18px] leading-[1.42] tracking-[-0.018em]"
          : "text-[15px] leading-[1.45] tracking-[-0.01em]"
      }`}
    >
      {words.map((word, idx) => {
        const fresh = condensing && idx >= seen.from;
        return (
          <React.Fragment key={`${idx}:${word}`}>
            <span
              data-new={fresh ? "" : undefined}
              className={`inline-block ${reduced ? "" : "animate-[ui-empty-in_340ms_cubic-bezier(0.16,1,0.3,1)_backwards]"}`}
              style={fresh ? { animationDelay: `${WORD_LANDS_MS}ms` } : undefined}
            >
              {word}
            </span>
            {idx < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </p>
  );
}

/** Smooth height fold for optional attachment chips. */
function Fold({ show, reduced, children }: { show: boolean; reduced: boolean; children: React.ReactNode }) {
  const [last, setLast] = React.useState(children);
  if (show && children !== last) setLast(children);
  return (
    <div
      aria-hidden={!show || undefined}
      inert={!show || undefined}
      className={`grid ${!show ? "pointer-events-none" : ""}`}
      style={{
        gridTemplateRows: show ? "1fr" : "0fr",
        opacity: show ? 1 : 0,
        transition: reduced ? "none" : `grid-template-rows 340ms ${EASE_OUT}, opacity ${show ? "260ms" : "140ms"} ${EASE_OUT}`,
      }}
    >
      <div className="min-h-0 overflow-hidden">{show ? children : last}</div>
    </div>
  );
}

interface MitosisControlsProps {
  active: boolean;
  canSend: boolean;
  muted: boolean;
  disabled: boolean;
  reduced: boolean;
  labels: VoiceBarLabels;
  rightBtnRef: React.RefObject<HTMLButtonElement | null>;
  micBtnRef: React.RefObject<HTMLButtonElement | null>;
  onPrimaryClick: () => void;
  onMicClick: () => void;
}

function MitosisControls({
  active,
  canSend,
  muted,
  disabled,
  reduced,
  labels,
  rightBtnRef,
  micBtnRef,
  onPrimaryClick,
  onMicClick,
}: MitosisControlsProps) {
  const pathRef = React.useRef<SVGPathElement>(null);
  const micWrapRef = React.useRef<HTMLDivElement>(null);
  const springRef = React.useRef<Spring | null>(null);

  const paint = React.useCallback(() => {
    const s = springRef.current;
    if (!s) return;
    const dist = clamp(s.get(), 0, SPLIT_DIST + 4);
    pathRef.current?.setAttribute("d", mitosisPath(dist));
    const wrap = micWrapRef.current;
    if (wrap) {
      const offsetX = SPLIT_DIST - dist;
      const progress = clamp(dist / SPLIT_DIST, 0, 1);
      wrap.style.transform = `translate3d(${n2(offsetX)}px, 0, 0) scale(${n2(0.7 + 0.3 * progress)})`;
      wrap.style.opacity = `${n2(smoothstep(0.18, 0.72, progress))}`;
    }
  }, []);

  React.useLayoutEffect(() => {
    const start = active ? SPLIT_DIST : 0;
    const sp = createSpring(start, MITOSIS_SPRING, paint, 0.06);
    springRef.current = sp;
    paint();
    return () => {
      sp.stop();
      springRef.current = null;
    };
    // Mount only; target changes below re-aim the existing spring keeping velocity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint]);

  React.useEffect(() => {
    const sp = springRef.current;
    if (!sp) return;
    const target = active ? SPLIT_DIST : 0;
    if (reduced) sp.jump(target);
    else sp.set(target);
  }, [active, reduced]);

  const sendVisual = !active && canSend;
  const rightLabel = active ? labels.cancel : canSend ? labels.send : labels.startVoice;
  const micLabel = muted ? labels.unmute : labels.mute;

  return (
    <div className="relative shrink-0 select-none" style={{ width: STAGE_W, height: STAGE_H }}>
      <svg viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <path
          ref={pathRef}
          d={mitosisPath(active ? SPLIT_DIST : 0)}
          className={`transition-[fill,stroke] duration-200 motion-reduce:transition-none ${
            sendVisual ? "fill-primary stroke-transparent" : "fill-muted stroke-border"
          }`}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Left circle (Mic / Mute): rides out of the right circle during liquid mitosis. */}
      <div
        ref={micWrapRef}
        className="absolute left-[1px] top-[1px] size-[36px]"
        style={{
          transform: active ? "translate3d(0px, 0, 0) scale(1)" : `translate3d(${SPLIT_DIST}px, 0, 0) scale(0.7)`,
          opacity: active ? 1 : 0,
          pointerEvents: active ? "auto" : "none",
        }}
      >
        <button
          ref={micBtnRef}
          type="button"
          inert={!active || undefined}
          disabled={disabled}
          aria-label={micLabel}
          aria-pressed={muted}
          onClick={onMicClick}
          className={`relative flex size-full cursor-pointer items-center justify-center rounded-full hover:bg-foreground/[0.06] disabled:cursor-default disabled:opacity-45 ${
            muted ? "text-muted-foreground" : "text-foreground"
          } ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
        >
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={interactionIcon(!muted, reduced)}>
            <Mic className="size-[16px]" strokeWidth={1.9} />
          </span>
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={interactionIcon(muted, reduced)}>
            <MicOff className="size-[16px]" strokeWidth={1.9} />
          </span>
        </button>
      </div>

      {/* Right circle (Waveform / Send / Cancel): anchored origin for spawn & dismiss comet streaks. */}
      <button
        ref={rightBtnRef}
        type="button"
        disabled={disabled}
        aria-label={rightLabel}
        onClick={onPrimaryClick}
        className={`absolute right-[1px] top-[1px] flex size-[36px] cursor-pointer items-center justify-center rounded-full disabled:cursor-default disabled:opacity-45 ${
          sendVisual ? "text-primary-foreground hover:bg-white/10" : "text-foreground hover:bg-foreground/[0.06]"
        } ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
      >
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={interactionIcon(!active && !canSend, reduced)}>
          <WaveformGlyph />
        </span>
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={interactionIcon(sendVisual, reduced)}>
          <ArrowUp className="size-[16px]" strokeWidth={2.2} />
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
          style={{
            ...interactionIcon(active, reduced),
            transform: active ? "rotate(0deg) scale(1)" : "rotate(-45deg) scale(0.6)",
          }}
        >
          <X className="size-[16px]" strokeWidth={2.1} />
        </span>
      </button>
    </div>
  );
}

export function VoiceBar({
  ref,
  state: controlledState,
  defaultState = "idle",
  onStateChange,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onVoiceStart,
  onCancel,
  muted: controlledMuted,
  defaultMuted = false,
  onMutedChange,
  transcript,
  attachments,
  error,
  getLevel,
  getSpectrum,
  level,
  layout = "bar",
  leading,
  onAttach,
  showAttach = true,
  palette = "spectral",
  colors,
  interactive = true,
  cellSize = 2.5,
  placeholder,
  labels: labelOverrides,
  disabled = false,
  className = "",
  ...props
}: VoiceBarProps) {
  const reduced = useInteractionReducedMotion();
  const labels = React.useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelOverrides, ...(placeholder !== undefined ? { placeholder } : {}) }),
    [labelOverrides, placeholder],
  );

  const [ownState, setOwnState] = React.useState<VoiceBarState>(defaultState);
  const state = controlledState ?? ownState;
  const setState = React.useCallback(
    (next: VoiceBarState) => {
      if (controlledState === undefined) setOwnState(next);
      onStateChange?.(next);
    },
    [controlledState, onStateChange],
  );

  const [ownValue, setOwnValue] = React.useState(defaultValue);
  const text = controlledValue ?? ownValue;
  const setText = React.useCallback(
    (next: string) => {
      if (controlledValue === undefined) setOwnValue(next);
      onValueChange?.(next);
    },
    [controlledValue, onValueChange],
  );

  const [ownMuted, setOwnMuted] = React.useState(defaultMuted);
  const muted = controlledMuted ?? ownMuted;
  const setMuted = React.useCallback(
    (next: boolean) => {
      if (controlledMuted === undefined) setOwnMuted(next);
      onMutedChange?.(next);
    },
    [controlledMuted, onMutedChange],
  );

  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const displayError = error ?? submitError;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const horizonRef = React.useRef<DitherHorizonHandle>(null);
  const rightBtnRef = React.useRef<HTMLButtonElement>(null);
  const micBtnRef = React.useRef<HTMLButtonElement>(null);
  const attachBtnRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useImperativeHandle(
    ref,
    () => ({
      pulse(opts?: DitherHorizonPulseOptions) {
        horizonRef.current?.pulse(opts);
      },
      condense(el: HTMLElement) {
        return horizonRef.current?.condense(el) ?? 0;
      },
    }),
    [],
  );

  const active = state !== "idle";
  const isCard = layout === "card";
  const canSend = !active && text.trim().length > 0;
  const hasAttachments = Boolean(attachments);

  const submitText = React.useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setSubmitError(null);
    const res = onSubmit?.(trimmed);
    setText("");
    if (res && typeof (res as Promise<unknown>).then === "function") {
      setState("thinking");
      void (res as Promise<unknown>).then(
        () => {
          if (controlledState === undefined) setState("idle");
        },
        (err: unknown) => {
          // Restore the prompt so the user never loses what they typed and show the error in place.
          setText(trimmed);
          setSubmitError(err instanceof Error && err.message ? err.message : "Something went wrong. Try again.");
          if (controlledState === undefined) setState("idle");
        },
      );
    }
  }, [text, disabled, onSubmit, setText, setState, controlledState]);

  const handlePrimaryClick = React.useCallback(() => {
    if (disabled) return;
    setSubmitError(null);
    if (active) {
      setMuted(false);
      setState("idle");
      onCancel?.();
      return;
    }
    if (canSend) {
      submitText();
      return;
    }
    setMuted(false);
    setState("listening");
    onVoiceStart?.();
  }, [disabled, active, canSend, setMuted, setState, onCancel, submitText, onVoiceStart]);

  const handleMicClick = React.useCallback(() => {
    if (disabled || !active) return;
    horizonRef.current?.pulse({ kind: "wipe", origin: micBtnRef.current, strength: 0.72 });
    if (state === "thinking" || state === "speaking") {
      setMuted(false);
      setState("listening");
      return;
    }
    setMuted(!muted);
  }, [disabled, active, state, muted, setMuted, setState]);

  const handleAttachClick = React.useCallback(() => {
    if (disabled) return;
    horizonRef.current?.pulse({ kind: "ripple", origin: attachBtnRef.current, strength: 0.85 });
    onAttach?.();
  }, [disabled, onAttach]);

  const handleInputChange = (next: string) => {
    if (submitError) setSubmitError(null);
    setText(next);
    if (!active && next.length > 0) {
      // A quiet tick under the caret's approximate column on its current line.
      const line = next.slice(0, inputRef.current?.selectionStart ?? next.length).split("\n").pop() ?? "";
      const approxU = isCard ? 0.5 : clamp(0.07 + line.length * 0.018, 0.08, 0.78);
      horizonRef.current?.pulse({ kind: "spark", origin: approxU, strength: 0.55 });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && active) {
      event.preventDefault();
      setMuted(false);
      setState("idle");
      onCancel?.();
      rightBtnRef.current?.focus();
    }
  };

  const statusText =
    state === "thinking"
      ? labels.thinking
      : state === "speaking"
        ? labels.speaking
        : state === "listening"
          ? muted
            ? labels.muted
            : labels.listening
          : "";

  const hasTranscript = active && Boolean(transcript?.trim());
  // New words condense out of the dither while dictating or while the reply is spoken.
  const condenseWords = React.useCallback((els: HTMLElement[]) => {
    for (const el of els) horizonRef.current?.condense(el);
  }, []);
  const layerStyle = (on: boolean): React.CSSProperties => ({
    opacity: on ? 1 : 0,
    filter: on ? "blur(0px)" : "blur(4px)",
    transform: on ? "none" : "translateY(3px)",
    transition: reduced
      ? "none"
      : on
        ? `opacity 300ms ${EASE_OUT} 70ms, filter 300ms ${EASE_OUT} 70ms, transform 320ms ${EASE_OUT} 70ms`
        : "opacity 140ms ease-out, filter 140ms ease-out, transform 140ms ease-out",
  });

  return (
    <div
      ref={rootRef}
      data-state={state}
      data-layout={layout}
      onKeyDown={handleKeyDown}
      className={`relative isolate flex w-full flex-col justify-between overflow-clip border border-border bg-card text-card-foreground shadow-[inset_0_0.5px_0_rgb(255_255_255/0.8)] dark:shadow-[inset_0_0.5px_0_rgb(255_255_255/0.07)] ${
        isCard ? "min-h-[196px] rounded-[28px]" : "min-h-[112px] rounded-[26px]"
      } ${className}`}
      {...props}
    >
      {/* Optical 8×8 Bayer dither horizon + spawn/dismiss comets + action shockwaves + pointer embers. */}
      <DitherHorizon
        ref={horizonRef}
        state={state}
        muted={muted}
        getLevel={getLevel}
        getSpectrum={getSpectrum}
        level={level}
        originRef={rightBtnRef}
        pointerRef={rootRef}
        shape={layout}
        palette={palette}
        colors={colors}
        interactive={interactive}
        cellSize={cellSize}
        className="z-0"
      />

      {/* Optional attachment chips folding open above the prompt without shifting the bottom dock. */}
      <Fold show={hasAttachments} reduced={reduced}>
        <div className={`relative z-10 flex flex-wrap items-center gap-1.5 ${isCard ? "justify-center px-5 pt-4" : "px-4 pt-3.5"}`}>
          {attachments}
        </div>
      </Fold>

      {/* Content stage: crisp blur crossfade between editable input (idle) and live status / streaming transcript (active). */}
      <div
        className={`relative z-10 grid min-w-0 ${
          isCard ? "flex-1 place-items-center px-6 pt-7 pb-3" : hasAttachments ? "px-4 pt-2 pb-1.5" : "px-4 pt-3.5 pb-1.5"
        }`}
      >
        <div
          aria-hidden={active || undefined}
          inert={active || undefined}
          className={`[grid-area:1/1] w-full ${active ? "pointer-events-none" : ""}`}
          style={layerStyle(!active)}
        >
          {isCard && !onSubmit && transcript?.trim() ? (
            <p className="mx-auto max-w-[26ch] text-center text-[18px] leading-[1.42] tracking-[-0.018em] text-foreground">{transcript}</p>
          ) : (
            // A prompt that grows with its text, line by line, up to six lines, then scrolls. An invisible copy of the
            // text sizes the grid cell; the textarea fills it, so the height is always the text's own.
            <div className={`grid w-full ${isCard ? "text-center text-[18px] leading-[1.42] tracking-[-0.018em]" : "text-[16px] leading-[1.45] tracking-[-0.01em] sm:text-[15px]"}`}>
              <span aria-hidden="true" className="invisible max-h-[8.7em] overflow-hidden whitespace-pre-wrap [grid-area:1/1] [overflow-wrap:anywhere]">
                {text + "\u200b"}
              </span>
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                disabled={disabled}
                placeholder={labels.placeholder}
                aria-label={labels.placeholder}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submitText();
                  }
                }}
                className="max-h-[8.7em] w-full resize-none overflow-y-auto bg-transparent p-0 text-foreground outline-none [grid-area:1/1] [overflow-wrap:anywhere] [scrollbar-width:thin] placeholder:text-muted-foreground/80 disabled:opacity-50"
                style={{ font: "inherit", letterSpacing: "inherit", textAlign: "inherit" }}
              />
            </div>
          )}
        </div>

        <div
          aria-hidden={!active || undefined}
          className={`[grid-area:1/1] w-full ${!active ? "pointer-events-none" : ""}`}
          style={layerStyle(active)}
        >
          {hasTranscript ? (
            <div className={isCard ? "flex justify-center" : ""}>
              <StreamingTranscript
                text={transcript!}
                reduced={reduced}
                centered={isCard}
                onNewWords={state === "listening" || state === "speaking" ? condenseWords : undefined}
              />
            </div>
          ) : (
            <span
              className={`inline-block text-muted-foreground ${
                isCard ? "w-full text-center text-[18px] tracking-[-0.018em]" : "text-[15px] tracking-[-0.01em]"
              } ${state === "thinking" ? `text-foreground/85 ${SHEEN}` : ""}`}
            >
              <TextMorph animateWidth={false}>{statusText || labels.listening}</TextMorph>
            </span>
          )}
        </div>
      </div>

      {/* Inline error message folding smoothly open when a mic permission or async submit fails. */}
      <Fold show={Boolean(displayError)} reduced={reduced}>
        <p
          role="alert"
          className={`relative z-10 text-[12.5px] leading-5 text-red-600 dark:text-red-400 ${
            isCard ? "px-5 pb-1 text-center" : "px-4 pb-1"
          }`}
        >
          {displayError}
        </p>
      </Fold>

      {/* Bottom control dock: always grounded concentrically at the bottom corners (never floating mid-card). */}
      <div className={`relative z-10 flex items-center justify-between gap-2 ${isCard ? "px-3.5 pb-3.5 pt-2" : "px-3 pb-3 pt-1.5"}`}>
        <div className="flex min-w-0 items-center gap-2">
          {leading !== undefined ? (
            leading
          ) : showAttach ? (
            <button
              ref={attachBtnRef}
              type="button"
              disabled={disabled}
              aria-label={labels.attach}
              onClick={handleAttachClick}
              className={`flex size-[36px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-muted text-foreground hover:bg-accent disabled:cursor-default disabled:opacity-45 ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
            >
              <Plus className="size-[17px]" strokeWidth={1.9} />
            </button>
          ) : null}
        </div>

        <MitosisControls
          active={active}
          canSend={canSend}
          muted={muted}
          disabled={disabled}
          reduced={reduced}
          labels={labels}
          rightBtnRef={rightBtnRef}
          micBtnRef={micBtnRef}
          onPrimaryClick={handlePrimaryClick}
          onMicClick={handleMicClick}
        />
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {statusText}
      </span>
    </div>
  );
}

const SILENT_SPECTRUM = new Float32Array(BANDS);

/** Meter a real microphone MediaStream or playing <audio> element for DitherHorizon / VoiceBar without re-rendering React. */
export function useVoiceAudio(source: MediaStream | HTMLMediaElement | null | undefined) {
  const meter = React.useRef<AudioMeter | null>(null);

  React.useEffect(() => {
    if (!source) return;
    let context: AudioContext;
    let node: AudioNode;
    let own = false;
    if (source instanceof HTMLMediaElement) {
      ({ context, node } = elementSource(source));
    } else {
      context = new AudioContext();
      node = context.createMediaStreamSource(source);
      own = true;
    }
    meter.current = createAudioMeter(context, node);
    const resume = () => void context.resume().catch(() => {});
    resume();
    window.addEventListener("pointerdown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      meter.current?.disconnect();
      meter.current = null;
      if (own) void context.close().catch(() => {});
    };
  }, [source]);

  return React.useMemo(
    () => ({
      getLevel: () => meter.current?.getLevel() ?? 0,
      getSpectrum: (): ArrayLike<number> => meter.current?.getSpectrum() ?? SILENT_SPECTRUM,
    }),
    [],
  );
}

export { DitherHorizon };
export type { DitherHorizonHandle, DitherHorizonProps, DitherHorizonPulseOptions, DitherHorizonState, DitherHorizonPalette };
export default VoiceBar;
