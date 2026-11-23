"use client";

import * as React from "react";
import { useHairlineText } from "../hairline-text"; // patched (hairline/patch.mjs)
import { ArrowUp, Mic, RotateCcw, Square, X } from "lucide-react";
import { TextMorph } from "./text-morph";
import { EASE_OUT, INTERACTION_FOCUS, INTERACTION_PRESS, useInteractionReducedMotion } from "./ui-interaction-motion";
import { VoiceOrb } from "./voice-orb";
import { useVoiceSession, type VoiceError, type VoicePhase, type VoiceSession, type VoiceSessionOptions } from "./voice-session";

/* ─────────────────────────────────────────────────────────
 * VOICE TALK: the voice orb with its controls, wired to a session
 *
 *   one button  says what pressing it does next and morphs into
 *               it: Talk → Send → Thinking (press to cancel) →
 *               Interrupt → Talk. Hold mode: press and talk,
 *               let go to send
 *   end         slides in beside it while a session is on, and
 *               ends everything
 *   errors      the button turns into the fix ("Allow the
 *               microphone", "Try again") and the reason folds
 *               open under it
 *
 * Give it onTurn or connect (see useVoiceSession), or pass a
 * session you made yourself to drive it from elsewhere too.
 * ───────────────────────────────────────────────────────── */

export interface VoiceTalkLabels {
  idle: string;
  hold: string;
  starting: string;
  listening: string;
  holding: string;
  thinking: string;
  speaking: string;
  live: string;
  end: string;
  retry: string;
  permission: string;
  noMicrophone: string;
  noSpeech: string;
}

export interface VoiceTalkProps extends VoiceSessionOptions {
  /** A session from useVoiceSession, to control it from elsewhere too. Without one it makes its own from these props. */
  session?: VoiceSession;
  /** Tap to talk (it sends when you stop talking, or when tapped), or hold to talk and let go to send. */
  mode?: "tap" | "hold";
  /** The orb's diameter in px. */
  size?: number;
  colors?: [string, string, string];
  /** The plasma's colour, when no colors are given. */
  tone?: "ice" | "solar" | "rose";
  /** The assistant's name, for screen readers. */
  label?: string;
  labels?: Partial<VoiceTalkLabels>;
  className?: string;
}

const LABELS: VoiceTalkLabels = {
  idle: "Talk",
  hold: "Hold to talk",
  starting: "Starting",
  listening: "Send",
  holding: "Release to send",
  thinking: "Thinking",
  speaking: "Interrupt",
  live: "Listening",
  end: "End",
  retry: "Try again",
  permission: "Allow the microphone",
  noMicrophone: "No microphone",
  noSpeech: "Didn't hear you",
};

const HELP: Partial<Record<VoiceError["kind"], string>> = {
  permission: "Microphone access is blocked. Allow it from the icon in the address bar, then try again.",
  "no-microphone": "No microphone was found. Plug one in or pick one in your system settings.",
  unsupported: "This browser can't record audio on this page. It needs a secure (https) page and a recent browser.",
};

type Icon = "mic" | "send" | "stop" | "spin" | "retry";

function iconFor(phase: VoicePhase, mode: "tap" | "hold", realtime: boolean): Icon {
  if (phase === "starting") return "spin";
  if (phase === "listening") return realtime || mode === "hold" ? "stop" : "send";
  if (phase === "thinking") return realtime ? "stop" : "spin";
  if (phase === "speaking") return realtime ? "stop" : "mic";
  if (phase === "error") return "retry";
  return "mic";
}

function labelFor(phase: VoicePhase, error: VoiceError | null, mode: "tap" | "hold", realtime: boolean, holding: boolean, l: VoiceTalkLabels) {
  if (phase === "error") {
    if (error?.kind === "permission") return l.permission;
    if (error?.kind === "no-microphone") return l.noMicrophone;
    if (error?.kind === "no-speech") return l.noSpeech;
    return l.retry;
  }
  if (phase === "starting") return l.starting;
  if (realtime && phase !== "idle") return phase === "thinking" ? l.thinking : phase === "speaking" ? l.speaking : l.live;
  if (phase === "listening") return holding ? l.holding : l.listening;
  if (phase === "thinking") return l.thinking;
  if (phase === "speaking") return l.speaking;
  return mode === "hold" ? l.hold : l.idle;
}

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 animate-spin" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.8" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function VoiceTalk({ session: given, mode = "tap", size = 200, colors, tone, label = "Voice assistant", labels, className = "", ...options }: VoiceTalkProps) {
  const t = useHairlineText(); // patched (hairline/patch.mjs)
  const own = useVoiceSession(options);
  const session = given ?? own;
  const { phase, error } = session;
  const reduced = useInteractionReducedMotion();
  const [holding, setHolding] = React.useState(false);
  const button = React.useRef<HTMLButtonElement>(null);
  const realtime = Boolean(options.connect);
  const l = { ...LABELS, ...labels };

  // "Starting" only shows if opening the microphone takes a moment (a permission prompt); usually it's instant, and
  // flashing a word for one frame would morph the label twice.
  const [slowStart, setSlowStart] = React.useState(false);
  React.useEffect(() => {
    if (phase !== "starting") return;
    const timer = window.setTimeout(() => setSlowStart(true), 350);
    return () => {
      window.clearTimeout(timer);
      setSlowStart(false);
    };
  }, [phase]);
  const active = phase !== "idle" && phase !== "error";
  const icon = iconFor(phase, mode, realtime);
  const text = phase === "starting" && !slowStart ? labelFor("idle", null, mode, realtime, holding, l) : labelFor(phase, error, mode, realtime, holding, l);
  const help = phase === "error" && error ? t(HELP[error.kind] ?? error.message) : "";
  const primary = !active;

  // The help keeps its last words while it folds away, so it never empties on the way out.
  const [shownHelp, setShownHelp] = React.useState(help);
  if (help && help !== shownHelp) setShownHelp(help);

  const press = () => {
    if (mode === "tap") return session.toggle();
    if (phase === "idle" || phase === "error") session.start();
    else if (phase === "speaking") session.interrupt();
    else if (phase === "thinking") session.stop();
    setHolding(true);
  };
  const release = () => {
    if (mode !== "hold" || !holding) return;
    setHolding(false);
    if (phase === "listening") session.send();
    else if (phase === "starting") session.stop();
  };

  const say = phase === "error" ? t(error?.message ?? "") : phase === "idle" ? "" : phase === "starting" ? l.starting : phase === "listening" ? l.live : phase === "thinking" ? l.thinking : t("Speaking");

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={mode === "tap" ? "cursor-pointer" : undefined} onClick={mode === "tap" ? () => session.toggle() : undefined}>
        <VoiceOrb state={session.state} getLevel={session.getLevel} getSpectrum={session.getSpectrum} size={size} colors={colors} tone={tone} label={label} />
      </div>

      <div className="mt-5 flex items-center">
        <button
          ref={button}
          type="button"
          aria-pressed={mode === "hold" ? holding : undefined}
          onClick={mode === "tap" ? press : undefined}
          onPointerDown={
            mode === "hold"
              ? (event) => {
                  if (event.button !== 0) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  press();
                }
              : undefined
          }
          onPointerUp={mode === "hold" ? release : undefined}
          onPointerCancel={mode === "hold" ? release : undefined}
          onKeyDown={
            mode === "hold"
              ? (event) => {
                  if ((event.key === " " || event.key === "Enter") && !event.repeat) {
                    event.preventDefault();
                    press();
                  }
                }
              : undefined
          }
          onKeyUp={
            mode === "hold"
              ? (event) => {
                  if (event.key === " " || event.key === "Enter") release();
                }
              : undefined
          }
          className={`group/talk relative isolate inline-flex h-11 cursor-pointer touch-none select-none items-center gap-2 rounded-full pl-4 pr-5 text-[14px] font-medium transition-colors duration-300 [-webkit-touch-callout:none] ${INTERACTION_PRESS} ${INTERACTION_FOCUS} ${
            primary ? "text-primary-foreground" : "text-foreground"
          }`}
        >
          {/* The two faces of the button are layers that cross-fade, so changing face never repaints the label under it. */}
          <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-background shadow-[inset_0_0_0_1px_var(--border)] group-hover/talk:bg-accent" />
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 rounded-full bg-primary will-change-[opacity] group-hover/talk:brightness-110"
            style={{ opacity: primary ? 1 : 0, transition: reduced ? "none" : `opacity 300ms ${EASE_OUT}` }}
          />
          <span aria-hidden="true" className="relative grid size-4 place-items-center">
            {(["mic", "send", "stop", "spin", "retry"] as Icon[]).map((name) => (
              // Icons swap by scale and fade only: a blur at 16px is invisible and costs a repaint every frame.
              <span
                key={name}
                className="absolute inset-0 grid place-items-center will-change-transform"
                style={{
                  opacity: icon === name ? 1 : 0,
                  transform: icon === name ? "none" : "scale(0.6)",
                  transition: reduced ? "none" : `opacity 220ms ${EASE_OUT}, transform 380ms ${EASE_OUT}`,
                }}
              >
                {name === "mic" && <Mic className="size-4" strokeWidth={2} />}
                {name === "send" && <ArrowUp className="size-4" strokeWidth={2.2} />}
                {name === "stop" && <Square className="size-3 fill-current" strokeWidth={0} />}
                {name === "spin" && icon === "spin" && <Spinner />}
                {name === "retry" && <RotateCcw className="size-4" strokeWidth={2} />}
              </span>
            ))}
          </span>
          <TextMorph>{text}</TextMorph>
        </button>

        {/* End: slides in beside the button while a session is on. */}
        <span
          className="grid"
          style={{
            gridTemplateColumns: active ? "1fr" : "0fr",
            opacity: active ? 1 : 0,
            transition: reduced ? "none" : `grid-template-columns 420ms ${EASE_OUT}, opacity ${active ? "260ms 80ms" : "160ms"} ${EASE_OUT}`,
          }}
        >
          <span className="min-w-0 [clip-path:inset(-4px)]">
            <span className="block pl-2">
              <button
                type="button"
                aria-label={l.end}
                tabIndex={active ? undefined : -1}
                onClick={() => {
                  session.stop();
                  button.current?.focus({ preventScroll: true });
                }}
                className={`grid size-11 cursor-pointer place-items-center rounded-full bg-background text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-accent hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </span>
          </span>
        </span>
      </div>

      {/* Why it failed, folded open under the button that fixes it. */}
      <div
        className="grid w-full max-w-[300px]"
        style={{ gridTemplateRows: help ? "1fr" : "0fr", opacity: help ? 1 : 0, transition: reduced ? "none" : `grid-template-rows 420ms ${EASE_OUT}, opacity 260ms ${EASE_OUT}` }}
      >
        <p className="min-h-0 overflow-clip text-center text-[12.5px] leading-[18px] text-muted-foreground">
          <span className="block pt-3">{shownHelp}</span>
        </p>
      </div>

      <span role="status" className="sr-only">
        {say}
      </span>
    </div>
  );
}

export default VoiceTalk;
