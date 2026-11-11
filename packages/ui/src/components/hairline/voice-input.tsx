"use client";

import * as React from "react";
import { Mic, MicOff, RotateCcw, Square, X } from "lucide-react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * VOICE INPUT: dictating a prompt
 *
 *   idle          a mic button
 *   listening     the button stretches into a bar: the mic blurs
 *                 into Stop, and your voice runs through it as a
 *                 trace of hairlines on a baseline, with a faint
 *                 reflection under it. New sound arrives in ink at
 *                 the far end and greys as it travels back, so the
 *                 trace reads like a tape of the last few seconds.
 *                 A timer whose seconds roll, and Cancel; the live
 *                 transcript opens above
 *   transcribing  the trace settles flat into its baseline as
 *                 "Transcribing" rises over it and Stop becomes a
 *                 spinner; then the bar shrinks back into the mic
 *   blocked       the browser denied the microphone; the mic blurs
 *                 into a crossed-out one and how to fix it opens in
 *   error         it didn't catch that; try again
 *
 * One surface throughout: give it the width the bar should fill
 * and the mic stretches across it from its own side (align="end"
 * for a mic beside Send, so it grows leftwards). Your recording
 * code owns the mic: pass
 * status and the current level (0 to 1). Without a level the
 * bars move in a gentle wave.
 * ───────────────────────────────────────────────────────── */

export type VoiceStatus = "idle" | "listening" | "transcribing" | "blocked" | "error";

export interface VoiceInputProps extends React.HTMLAttributes<HTMLDivElement> {
  status: VoiceStatus;
  /** Current microphone level, 0 to 1. */
  level?: number;
  /** The words recognised so far. */
  transcript?: string;
  /** When listening started (ms); shows a timer. */
  startedAt?: number;
  onStart?: () => void;
  onStop?: () => void;
  onCancel?: () => void;
  errorText?: string;
  /** Which side the mic sits on; the bar grows from there. "end" suits a mic beside Send. */
  align?: "start" | "end";
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const PITCH = 3; // one hairline every 3px
const RATE = 1000 / 24; // a new line of sound every this many ms
const TRACE = 24; // the trace's height
const BASE = 15; // its baseline, from the top
const MORPH = "cubic-bezier(0.16,1,0.3,1)";
// A light that sweeps across the label. A mask, not a text clip, so it reaches letters that are mid-morph.
const SHEEN =
  "text-foreground [mask-image:linear-gradient(90deg,rgb(0_0_0/0.45)_35%,#000_50%,rgb(0_0_0/0.45)_65%)] [mask-size:200%_100%] animate-[ui-sheen_1.4s_linear_infinite] motion-reduce:animate-none motion-reduce:[mask-image:none] motion-reduce:text-foreground/70";
const TWO_DIGITS = { minimumIntegerDigits: 2 };

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

/** Icons trade places through a blur: the old one shrinks away as the new one grows in. */
const swap = (on: boolean, reduced: boolean): React.CSSProperties => ({
  opacity: on ? 1 : 0,
  transform: on ? "none" : "scale(0.6)",
  filter: on ? "none" : "blur(3px)",
  transition: reduced ? "none" : `opacity 260ms ${MORPH}, transform 380ms ${MORPH}, filter 260ms ${MORPH}`,
});

/** Content that fades in once its surface has made room, and out before it closes. */
const appear = (on: boolean, reduced: boolean): React.CSSProperties => ({
  opacity: on ? 1 : 0,
  filter: on ? "none" : "blur(4px)",
  transition: reduced ? "none" : on ? `opacity 320ms ${MORPH} 140ms, filter 320ms ${MORPH} 140ms` : `opacity 140ms ease-out, filter 140ms ease-out`,
});

/**
 * Your voice as a running trace of hairlines: one line per 1/24 s, flowing from the far end, standing on a baseline
 * with a faint reflection under it. New lines are ink and grey as they travel back. Written straight to two SVG paths
 * from one frame loop that runs only while listening or settling; React never re-renders per frame.
 */
function Trace({ level, active, reduced }: { level: number | undefined; active: boolean; reduced: boolean }) {
  const boxRef = React.useRef<HTMLSpanElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const upRef = React.useRef<SVGPathElement>(null);
  const downRef = React.useRef<SVGPathElement>(null);
  const levelRef = React.useRef(level);
  const activeRef = React.useRef(active);
  React.useEffect(() => {
    levelRef.current = level;
    activeRef.current = active;
  });

  React.useEffect(() => {
    const box = boxRef.current;
    const svg = svgRef.current;
    if (!box || !svg) return;
    let width = box.clientWidth;
    let samples: number[] = [];
    let frame = 0;
    let last = 0;
    let carry = 0; // ms since the last line was added
    let smooth = 0;
    let flat = 1; // how far the trace has settled into its baseline (1 = flat)
    let t = 0;
    const observer = new ResizeObserver(() => {
      width = box.clientWidth;
      svg.setAttribute("width", String(width));
    });
    observer.observe(box);
    svg.setAttribute("width", String(width));

    const draw = () => {
      const n = Math.ceil(width / PITCH) + 1;
      const shift = (carry / RATE) * PITCH; // lines glide left between additions
      let up = "";
      let down = "";
      const scale = 1 - flat;
      for (let k = 0; k < samples.length && k < n; k++) {
        const a = samples[samples.length - 1 - k] * scale;
        const x = width - 1.5 - k * PITCH - shift;
        if (x < -1) break;
        const top = Math.max(0.75, a * (BASE - 3));
        const bottom = Math.max(0.5, a * (TRACE - BASE - 3) * 0.62);
        up += `M${x.toFixed(2)} ${BASE - 1}V${(BASE - 1 - top).toFixed(2)}`;
        down += `M${x.toFixed(2)} ${BASE + 1}V${(BASE + 1 + bottom).toFixed(2)}`;
      }
      upRef.current?.setAttribute("d", up);
      downRef.current?.setAttribute("d", down);
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(100, now - last) : 16;
      last = now;
      t += dt;
      const on = activeRef.current;
      // Settle into the baseline when listening stops; rise back out when it starts.
      flat = on ? Math.max(0, flat - dt / 260) : Math.min(1, flat + dt / 420);
      if (on) {
        const given = levelRef.current;
        // Without a level, a gentle stand-in: syllables and pauses, never a sine.
        const target =
          given !== undefined
            ? Math.min(1, Math.max(0, given))
            : Math.max(0, 0.18 + 0.42 * Math.sin(t / 140) * Math.sin(t / 530 + 1.3) + 0.22 * Math.sin(t / 61)) * (Math.sin(t / 1900) > -0.55 ? 1 : 0.15);
        smooth += (target - smooth) * Math.min(1, dt / 60);
        carry += dt;
        while (carry >= RATE) {
          carry -= RATE;
          samples.push(smooth);
          if (samples.length > 400) samples = samples.slice(-300);
        }
      }
      draw();
      if (on || flat < 1) frame = requestAnimationFrame(tick);
      else {
        frame = 0;
        samples = [];
        carry = 0;
        draw();
      }
    };

    // With reduced motion the trace doesn't run: it shows a still line of speech while listening.
    if (reduced) {
      samples = Array.from({ length: 200 }, (_, i) => Math.max(0.08, 0.3 + 0.3 * Math.sin(i / 3) * Math.sin(i / 11)));
      const still = () => {
        flat = activeRef.current ? 0 : 1;
        draw();
      };
      still();
      const poll = window.setInterval(still, 250);
      return () => {
        observer.disconnect();
        window.clearInterval(poll);
      };
    }
    const start = () => {
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    start();
    const poll = window.setInterval(() => activeRef.current && start(), 120);
    return () => {
      observer.disconnect();
      window.clearInterval(poll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <span ref={boxRef} aria-hidden="true" className="relative block h-full w-full overflow-hidden">
      {/* Older sound greys toward the start; new sound arrives in ink at the far end. */}
      <svg
        ref={svgRef}
        height={TRACE}
        className="absolute inset-y-0 left-0 my-auto block"
        style={{ maskImage: "linear-gradient(to right, transparent, #000 45%)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 45%)" }}
      >
        <rect x={0} y={BASE - 0.5} width="100%" height={1} className="fill-border" />
        <g fill="none" strokeWidth={1} strokeLinecap="round">
          <path ref={upRef} className="stroke-foreground" />
          <path ref={downRef} className="stroke-foreground/30" />
        </g>
      </svg>
    </span>
  );
}

export function VoiceInput({
  status,
  level,
  transcript,
  startedAt,
  onStart,
  onStop,
  onCancel,
  errorText,
  align = "start",
  className = "",
  ...props
}: VoiceInputProps) {
  const end = align === "end";
  const reduced = useReducedMotion();
  const listening = status === "listening";
  const transcribing = status === "transcribing";
  const wide = listening || transcribing;
  const alert = status === "blocked" || status === "error";
  const blocked = status === "blocked";
  const [now, setNow] = React.useState(startedAt ?? 0);
  const [lastTranscript, setLastTranscript] = React.useState(transcript);
  if (transcript && transcript !== lastTranscript) setLastTranscript(transcript);

  const [seenStartedAt, setSeenStartedAt] = React.useState(startedAt);
  if (startedAt !== seenStartedAt) {
    setSeenStartedAt(startedAt);
    setNow(startedAt ?? 0);
  }

  // The timer re-renders on each whole second, not every frame.
  React.useEffect(() => {
    if (!listening || startedAt === undefined) return;
    let timer = 0;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      timer = window.setTimeout(tick, 1000 - ((t - startedAt) % 1000) + 5);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [listening, startedAt]);

  const seconds = startedAt === undefined ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const icon = status === "idle" ? "mic" : listening ? "stop" : transcribing ? "spin" : "off";
  const press = status === "idle" ? onStart : listening ? onStop : undefined;
  const showTranscript = listening && Boolean(transcript);

  return (
    <div className={`flex flex-col ${className}`} {...props}>
      {/* The words so far open above the bar, and fold away with it. */}
      <div
        aria-hidden={!showTranscript || undefined}
        className="grid"
        style={{
          gridTemplateRows: showTranscript ? "1fr" : "0fr",
          opacity: showTranscript ? 1 : 0,
          transition: reduced ? "none" : `grid-template-rows 380ms ${MORPH}, opacity ${showTranscript ? "300ms" : "160ms"} ${MORPH}`,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <p aria-live="polite" className="px-1 pb-2 text-[13px] leading-relaxed text-foreground">
            {transcript ?? lastTranscript}
          </p>
        </div>
      </div>

      <div role={alert ? "alert" : undefined} className={`flex items-center ${end ? "flex-row-reverse" : ""}`}>
        {/* The one surface: a mic button that stretches into the listening bar and shrinks back. */}
        <div
          className={`flex shrink-0 items-center overflow-hidden rounded-full border border-border bg-background ${end ? "flex-row-reverse" : ""}`}
          style={{
            width: wide ? "100%" : 36,
            height: wide ? 44 : 36,
            // The button side keeps the tighter inset, whichever side that is.
            [end ? "paddingRight" : "paddingLeft"]: wide ? 5 : 1,
            [end ? "paddingLeft" : "paddingRight"]: wide ? 8 : 1,
            transition: reduced ? "none" : `width 520ms ${MORPH}, height 520ms ${MORPH}, padding 520ms ${MORPH}`,
          }}
        >
          <button
            type="button"
            aria-label={status === "idle" ? "Dictate" : listening ? "Stop and transcribe" : transcribing ? "Transcribing" : blocked ? "Microphone blocked" : "Didn’t catch that"}
            aria-disabled={!press || undefined}
            onClick={() => press?.()}
            className={`relative flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300 ${FOCUS} ${
              listening
                ? "bg-primary text-primary-foreground active:scale-95"
                : alert
                  ? "cursor-default bg-muted text-muted-foreground"
                  : transcribing
                    ? "cursor-default text-muted-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={swap(icon === "mic", reduced)}>
              <Mic className="size-4" />
            </span>
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={swap(icon === "stop", reduced)}>
              <Square className="size-3" fill="currentColor" />
            </span>
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={swap(icon === "spin", reduced)}>
              <span className={`size-3.5 rounded-full border-[1.5px] border-border border-t-foreground/70 motion-reduce:animate-none ${transcribing ? "animate-spin" : ""}`} />
            </span>
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={swap(icon === "off", reduced)}>
              <MicOff className="size-4" />
            </span>
          </button>

          {/* The waveform while listening; it settles flat as "Transcribing" rises over it. */}
          <span className="relative mx-2 flex min-w-0 flex-1 items-center justify-center" style={{ height: TRACE, ...appear(wide, reduced) }}>
            <span aria-hidden="true" className="block h-full w-full" style={appear(listening, reduced)}>
              <Trace level={level} active={listening} reduced={reduced} />
            </span>
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 flex items-center text-[13px] font-medium ${end ? "right-1" : "left-1"} ${transcribing ? SHEEN : ""}`}
              style={appear(transcribing, reduced)}
            >
              <TextMorph>{transcribing ? "Transcribing" : "Listening"}</TextMorph>
            </span>
          </span>

          {startedAt !== undefined && (
            <span aria-hidden="true" className="flex shrink-0 items-baseline font-mono text-[11.5px] tabular-nums text-muted-foreground" style={appear(listening, reduced)}>
              <NumberRoll value={Math.floor(seconds / 60)} duration={500} />:
              <NumberRoll value={seconds % 60} format={TWO_DIGITS} direction="up" duration={500} />
            </span>
          )}
          {onCancel && (
            <button
              type="button"
              aria-label="Cancel"
              inert={!listening}
              onClick={onCancel}
              className={`cursor-pointer ${end ? "mr-1" : "ml-1"} flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}
              style={appear(listening, reduced)}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Blocked or not heard: the reason and the way back open beside the same circle. */}
        <div
          aria-hidden={!alert || undefined}
          className="grid min-w-0 flex-1"
          style={{
            // Folds by height, so while hidden it takes no room (and its text can't stack up in a sliver of width).
            gridTemplateRows: alert ? "1fr" : "0fr",
            ...appear(alert, reduced),
            transition: reduced ? "none" : `grid-template-rows 420ms ${MORPH}, ${alert ? `opacity 320ms ${MORPH} 120ms, filter 320ms ${MORPH} 120ms` : "opacity 140ms ease-out, filter 140ms ease-out"}`,
          }}
        >
          <div className={`flex min-h-0 min-w-0 items-center gap-3 overflow-hidden ${end ? "pr-3" : "pl-3"}`}>
            <span className="min-w-0 flex-1 text-[12.5px] leading-5">
              <span className="block font-medium text-foreground">
                <TextMorph animateWidth={false}>{blocked ? "Microphone blocked" : "Didn’t catch that"}</TextMorph>
              </span>
              <span className="block text-muted-foreground">
                {errorText ?? (blocked ? "Allow the microphone in your browser’s site settings, then try again." : "Speak a little closer to the microphone.")}
              </span>
            </span>
            {onStart && (
              <button
                type="button"
                inert={!alert}
                onClick={onStart}
                className={`cursor-pointer flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-accent ${FOCUS}`}
              >
                <RotateCcw aria-hidden="true" className="size-3" />
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">
        {listening ? "Listening" : transcribing ? "Transcribing" : ""}
      </span>
    </div>
  );
}
