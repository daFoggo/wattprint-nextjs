"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { NumberRoll } from "./number-roll";

/* ─────────────────────────────────────────────────────────
 * VOICE NOTE: a voice message you can read along with
 *
 *   the wave  drawn in hairlines, one every 3px along a smooth
 *             envelope, standing on a hairline baseline with a
 *             faint, shorter reflection under it
 *   arrive    the wave rises out of the baseline, left to right
 *   play      the triangle splits and squares off into pause (one
 *             shape, two halves); a hairline playhead with a dot on
 *             the baseline glides through the wave every frame, the
 *             lines it has passed turn to ink and the time rolls up
 *   scrub     press anywhere on the wave and drag: the lines under
 *             your finger swell like a lens and the time follows;
 *             let go and it carries on from there
 *   speed     1× rolls to 1.5× and 2×
 *   read      "Transcript" folds the words open under the note; a
 *             highlight glides from word to word as they're said,
 *             the words ahead wait in grey, and tapping a word
 *             plays from it
 *   end       it holds full for a beat, then the fill runs back
 *             and pause turns back into play
 *
 * Only one voice note plays at a time on a page.
 * ───────────────────────────────────────────────────────── */

export interface VoiceNoteWord {
  /** The word as written, punctuation included. */
  text: string;
  /** When it's said, in seconds. */
  start: number;
}

export interface VoiceNoteProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  src: string;
  /** Loudness from 0 to 1, any length; worked out from the audio when left out. */
  peaks?: number[];
  /** Seconds, shown before the audio's own length is known. */
  duration?: number;
  transcript?: VoiceNoteWord[];
  defaultTranscriptOpen?: boolean;
  speeds?: number[];
  /** Mark it as not listened to yet. */
  unread?: boolean;
  /** What it is, for assistive tech, e.g. "Voice note from Sam". */
  label?: string;
  onPlay?: () => void;
  onEnded?: () => void;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const PITCH = 3; // one hairline every 3px
const WAVE = 40; // the wave's height: the sound above the baseline, its reflection under it
const BASE = 27; // the baseline, from the top
const PLAY_EVENT = "hairline:voice-note-play";

// Play and pause as the same two quads: the halves of a triangle, or two bars.
const SHAPES = {
  play: ["polygon(30% 12%, 58% 30%, 58% 70%, 30% 88%)", "polygon(58% 30%, 88% 50%, 88% 50%, 58% 70%)"],
  pause: ["polygon(22% 14%, 42% 14%, 42% 86%, 22% 86%)", "polygon(58% 14%, 78% 14%, 78% 86%, 58% 86%)"],
};

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const clock = (t: number) => {
  const s = Math.max(0, Math.round(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const EMPTY_PEAKS: number[] = [];

/**
 * The envelope at n hairlines: the peaks are squeezed to at most one per two lines (keeping each stretch's loudest
 * moment), then eased between, so the wave reads as one smooth shape rather than a row of blocks.
 */
function envelope(source: number[], n: number) {
  if (!source.length || n < 2) return Array.from({ length: Math.max(0, n) }, () => 0);
  const m = Math.max(2, Math.min(source.length, Math.ceil(n / 2)));
  const knots = Array.from({ length: m }, (_, i) => {
    const a = Math.floor((i * source.length) / m);
    const b = Math.max(a + 1, Math.floor(((i + 1) * source.length) / m));
    let top = 0;
    for (let k = a; k < b && k < source.length; k++) top = Math.max(top, source[k]);
    return top;
  });
  return Array.from({ length: n }, (_, i) => {
    const at = (i / (n - 1)) * (m - 1);
    const k = Math.floor(at);
    const f = at - k;
    const a = knots[k];
    const b = knots[Math.min(m - 1, k + 1)];
    return a + (b - a) * (0.5 - Math.cos(Math.PI * f) / 2);
  });
}

/** Loudness peaks straight from the audio file, when none were given. */
async function decodePeaks(src: string, n = 128, signal?: AbortSignal) {
  const data = await (await fetch(src, { signal })).arrayBuffer();
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audio = await ctx.decodeAudioData(data);
    const channel = audio.getChannelData(0);
    const size = channel.length / n;
    const rms = Array.from({ length: n }, (_, i) => {
      let sum = 0;
      const from = Math.floor(i * size);
      const to = Math.floor((i + 1) * size);
      for (let k = from; k < to; k++) sum += channel[k] * channel[k];
      return Math.sqrt(sum / Math.max(1, to - from));
    });
    const top = Math.max(...rms) || 1;
    return rms.map((v) => Math.min(1, (v / top) ** 0.7));
  } finally {
    void ctx.close();
  }
}

export function VoiceNote({
  src,
  peaks,
  duration: durationProp = 0,
  transcript,
  defaultTranscriptOpen = false,
  speeds = [1, 1.5, 2],
  unread = false,
  label = "Voice note",
  onPlay,
  onEnded,
  className = "",
  ...props
}: VoiceNoteProps) {
  const reduced = useReducedMotion();
  const id = React.useId();
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const waveRef = React.useRef<HTMLDivElement>(null);
  const wordsRef = React.useRef<HTMLParagraphElement>(null);
  const [duration, setDuration] = React.useState(durationProp);
  const [time, setTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [rewinding, setRewinding] = React.useState(false);
  const [heard, setHeard] = React.useState(!unread);
  const [speed, setSpeed] = React.useState(0);
  const [open, setOpen] = React.useState(defaultTranscriptOpen);
  const [scrub, setScrub] = React.useState<number | null>(null);
  const [width, setWidth] = React.useState(0);
  const [decoded, setDecoded] = React.useState<number[] | null>(null);
  const [rise, setRise] = React.useState(0);
  const playheadRef = React.useRef<HTMLSpanElement>(null);
  const [band, setBand] = React.useState({ x: 0, y: 0, w: 0, h: 0, on: false });
  const resume = React.useRef(false);
  const derived = React.useRef("");

  const source = React.useMemo(() => peaks ?? decoded ?? EMPTY_PEAKS, [peaks, decoded]);
  const lines = Math.max(16, Math.floor((width + PITCH - 1) / PITCH));
  const heights = React.useMemo(() => envelope(source, lines), [source, lines]);
  const length = duration || durationProp || 1;
  const shown = scrub !== null ? scrub * length : time;
  const progress = Math.min(1, shown / length);
  const filled = Math.floor(progress * lines + 0.5);
  const spoken = transcript ? transcript.reduce((at, w, i) => (w.start <= shown + 0.05 ? i : at), -1) : -1;
  const reading = playing || scrub !== null || (time > 0 && !rewinding);
  const display = reading ? shown : length;

  // As many hairlines as fit the width.
  React.useLayoutEffect(() => {
    const wave = waveRef.current;
    if (!wave) return;
    const measure = () => setWidth((w) => (w === wave.clientWidth ? w : wave.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wave);
    return () => observer.disconnect();
  }, []);

  // No peaks given: read them off the audio itself.
  React.useEffect(() => {
    if (peaks) return;
    const controller = new AbortController();
    decodePeaks(src, 128, controller.signal)
      .then((p) => !controller.signal.aborted && setDecoded(p))
      .catch(() => {});
    return () => controller.abort();
  }, [src, peaks]);

  // The wave rises out of the baseline, left to right, once there's something to show.
  const hasShape = source.length > 0 && width > 0;
  React.useEffect(() => {
    if (!hasShape) return;
    let frame = 0;
    let begin = 0;
    const step = (now: number) => {
      begin ||= now;
      const k = reduced ? 1 : Math.min(1, (now - begin) / 900);
      setRise(k);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [hasShape, reduced]);

  const pause = React.useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const play = async (from?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    document.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
    if (from !== undefined) {
      audio.currentTime = from;
      setTime(from);
    }
    audio.playbackRate = speeds[speed] ?? 1;
    setRewinding(false);
    setPlaying(true);
    setHeard(true);
    try {
      await audio.play();
      onPlay?.();
    } catch {
      setPlaying(false);
    }
  };

  // Another voice note started: this one stops.
  React.useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) pause();
    };
    document.addEventListener(PLAY_EVENT, onOther);
    return () => document.removeEventListener(PLAY_EVENT, onOther);
  }, [id, pause]);

  // While it plays, follow the audio, but only re-render when a bar, a second or a word changes.
  React.useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        const t = audio.currentTime;
        // The playhead follows the audio every frame without re-rendering.
        const head = playheadRef.current;
        if (head) head.style.transform = `translate3d(${Math.min(1, t / length) * width}px,0,0)`;
        const word = transcript ? transcript.reduce((at, w, i) => (w.start <= t + 0.05 ? i : at), -1) : -1;
        const key = `${Math.floor((t / length) * lines)}|${Math.floor(t)}|${word}`;
        if (key !== derived.current) {
          derived.current = key;
          setTime(t);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, length, lines, transcript, width]);

  // At the end: hold full for a beat, then run the fill back to the start.
  const finish = () => {
    setPlaying(false);
    setTime(length);
    onEnded?.();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setRewinding(true);
    if (reduced) return setTime(0);
    const begin = performance.now() + 500;
    const step = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - begin) / 600));
      setTime(length * (1 - (1 - (1 - k) ** 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const fraction = (clientX: number) => {
    const r = waveRef.current?.getBoundingClientRect();
    return r ? Math.min(1, Math.max(0, (clientX - r.left) / r.width)) : 0;
  };
  const seek = (t: number) => {
    const next = Math.min(length, Math.max(0, t));
    if (audioRef.current) audioRef.current.currentTime = next;
    setRewinding(false);
    setTime(next);
  };

  // The current word's highlight, measured where the word sits.
  React.useLayoutEffect(() => {
    const el = wordsRef.current?.querySelector<HTMLElement>(`[data-w="${spoken}"]`);
    setBand((b) => (el && open ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, on: true } : { ...b, on: false }));
  }, [spoken, open]);

  // Four paths of hairlines: played and still to come, each above the baseline and as a reflection under it.
  // The lines under a scrubbing finger swell like a lens.
  const wave = React.useMemo(() => {
    const out = { inkUp: "", inkDown: "", restUp: "", restDown: "" };
    const up = BASE - 3;
    const down = WAVE - BASE - 3;
    for (let i = 0; i < lines; i++) {
      const x = i * PITCH + 0.5;
      const grow = reduced ? 1 : Math.min(1, Math.max(0, rise * 1.6 - (i / lines) * 0.6));
      const g = 1 - (1 - grow) ** 3;
      const d = scrub === null || reduced ? Infinity : i - scrub * lines;
      const lens = 1 + 0.55 * Math.exp(-(d * d) / 40);
      const a = Math.max(0.05, heights[i] ?? 0) * g * lens;
      const top = Math.max(1, Math.min(up, a * up));
      const bottom = Math.max(0.5, Math.min(down, a * down * 0.62));
      const upPath = `M${x} ${BASE - 1}V${(BASE - 1 - top).toFixed(2)}`;
      const downPath = `M${x} ${BASE + 1}V${(BASE + 1 + bottom).toFixed(2)}`;
      if (i < filled) {
        out.inkUp += upPath;
        out.inkDown += downPath;
      } else {
        out.restUp += upPath;
        out.restDown += downPath;
      }
    }
    return out;
  }, [lines, heights, rise, filled, scrub, reduced]);
  const showHead = playing || scrub !== null || (time > 0 && !rewinding);

  return (
    <div
      role="group"
      aria-label={label}
      className={`@container w-full rounded-[20px] border border-border bg-card p-2 pr-2.5 text-card-foreground ${className}`}
      {...props}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onEnded={finish}
        onPause={() => scrub === null && !audioRef.current?.ended && setPlaying(false)}
      />

      {/* The button and the speed line up with the waveform, the time sits under it. */}
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => (playing ? pause() : play())}
          className={`cursor-pointer relative mt-[3px] flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 ${FOCUS}`}
        >
          <span aria-hidden="true" className="relative size-3.5">
            {[0, 1].map((half) => (
              <span
                key={half}
                className="absolute inset-0 bg-current"
                style={{
                  clipPath: (playing ? SHAPES.pause : SHAPES.play)[half],
                  transition: reduced ? "none" : `clip-path 320ms ${EASE}`,
                }}
              />
            ))}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div
            ref={waveRef}
            role="slider"
            tabIndex={0}
            aria-label="Position"
            aria-valuemin={0}
            aria-valuemax={Math.round(length)}
            aria-valuenow={Math.round(shown)}
            aria-valuetext={`${clock(shown)} of ${clock(length)}`}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              resume.current = playing;
              if (playing) audioRef.current?.pause();
              setScrub(fraction(e.clientX));
            }}
            onPointerMove={(e) => scrub !== null && setScrub(fraction(e.clientX))}
            onPointerUp={() => {
              if (scrub === null) return;
              const t = scrub * length;
              setScrub(null);
              if (resume.current) play(t);
              else seek(t);
            }}
            onPointerCancel={() => {
              setScrub(null);
              if (resume.current) play();
            }}
            onKeyDown={(e) => {
              const moves: Record<string, number> = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2 };
              if (e.key in moves) seek(shown + moves[e.key]);
              else if (e.key === "Home") seek(0);
              else if (e.key === "End") seek(length - 0.05);
              else return;
              e.preventDefault();
            }}
            className={`relative cursor-pointer touch-pan-y select-none rounded-[6px] ${FOCUS}`}
            style={{ height: WAVE }}
          >
            <svg aria-hidden="true" width={width || "100%"} height={WAVE} className="absolute inset-0 block overflow-visible">
              <rect x={0} y={BASE - 0.5} width={width} height={1} className="fill-border" />
              <g fill="none" strokeWidth={1} strokeLinecap="round">
                <path d={wave.restUp} className="stroke-muted-foreground/45" />
                <path d={wave.restDown} className="stroke-muted-foreground/20" />
                <path d={wave.inkUp} className="stroke-foreground" />
                <path d={wave.inkDown} className="stroke-foreground/30" />
              </g>
            </svg>
            {/* The playhead: a hairline through the wave with a dot where it meets the baseline. */}
            <span
              ref={playheadRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0"
              style={{
                transform: `translate3d(${progress * width}px,0,0)`,
                opacity: showHead ? 1 : 0,
                transition: reduced ? "none" : `opacity 200ms ${EASE}${playing ? "" : `, transform 160ms ${EASE}`}`,
              }}
            >
              <span className="absolute left-0 top-0.5 w-px -translate-x-1/2 bg-foreground" style={{ height: WAVE - 4 }} />
              <span className="absolute left-0 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={{ top: BASE }} />
            </span>
          </div>
          <div className="mt-0.5 flex h-5 items-center gap-1.5 text-[11.5px] tabular-nums text-muted-foreground">
            <span aria-hidden="true">
              <NumberRoll value={Math.floor(Math.round(display) / 60)} duration={400} />:
              <NumberRoll value={Math.round(display) % 60} format={{ minimumIntegerDigits: 2 }} duration={400} />
            </span>
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary"
              style={{ transform: heard ? "scale(0)" : "scale(1)", opacity: heard ? 0 : 1, transition: reduced ? "none" : `transform 300ms ${EASE}, opacity 300ms` }}
            />
            {transcript && (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-transcript`}
                onClick={() => setOpen((o) => !o)}
                className={`cursor-pointer ml-auto inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground ${FOCUS}`}
              >
                Transcript
                <ChevronDown
                  aria-hidden="true"
                  className="size-3"
                  style={{ transform: open ? "rotate(180deg)" : "none", transition: reduced ? "none" : `transform 300ms ${EASE}` }}
                />
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label={`Playback speed, ${speeds[speed]}×`}
          onClick={() => {
            const next = (speed + 1) % speeds.length;
            setSpeed(next);
            if (audioRef.current) audioRef.current.playbackRate = speeds[next];
          }}
          className={`cursor-pointer mt-[11px] inline-flex h-6 min-w-10 shrink-0 items-center justify-center rounded-full border border-border px-2 text-[11.5px] font-medium tabular-nums text-foreground transition-colors hover:bg-accent ${FOCUS}`}
        >
          <span aria-hidden="true">
            <NumberRoll value={speeds[speed]} format={{ maximumFractionDigits: 2 }} duration={450} />×
          </span>
        </button>
      </div>

      {transcript && (
        <div
          id={`${id}-transcript`}
          className="grid"
          style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-rows 420ms ${EASE}` }}
        >
          <div className="overflow-hidden" inert={!open || undefined}>
            <p
              ref={wordsRef}
              className="relative mx-1 mb-1 mt-2 border-t border-border pt-2.5 text-[13px] leading-[1.6]"
              style={{ opacity: open ? 1 : 0, transition: reduced ? "none" : `opacity 300ms ${EASE}` }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 rounded-[5px] bg-primary/[0.12]"
                style={{
                  transform: `translate(${band.x - 3}px, ${band.y}px)`,
                  width: band.w + 6,
                  height: band.h,
                  opacity: band.on ? 1 : 0,
                  transition: reduced ? "none" : `transform 260ms ${EASE}, width 260ms ${EASE}, opacity 200ms`,
                }}
              />
              {transcript.map((w, i) => (
                <React.Fragment key={i}>
                  {i > 0 && " "}
                  <span
                    data-w={i}
                    onClick={() => play(w.start)}
                    className={`relative cursor-pointer rounded-[4px] transition-colors duration-200 hover:text-foreground ${
                      spoken === -1 || i <= spoken ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {w.text}
                  </span>
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
