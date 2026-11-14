"use client";

import * as React from "react";
import { createSpring, useInteractionActivity, useInteractionReducedMotion, type Spring } from "./ui-interaction-motion";
import { BANDS, createAudioMeter, elementSource, type AudioMeter } from "./voice-audio";
import { createFluidOrb, resolveColors, waterCss, type Emitter, type FluidOrb, type Rgb, type Water } from "./voice-orb-gl";

/* ─────────────────────────────────────────────────────────
 * VOICE ORB: ink in water that the voice moves
 *
 * A real fluid runs inside a round vessel, and each state is a way
 * of moving it, so the orb shows which way the sound is going:
 *   listening  sound comes in: the voice's frequency bands push
 *              ink in from the rim, low notes in the first colour,
 *              high notes in the last
 *   speaking   sound goes out: each syllable blooms ink outward
 *              from the centre, band by band
 *   thinking   no sound: a slow vortex stirs the ink and folds the
 *              colours into each other
 *   idle       the ink drifts, barely moving; a finger or a cursor
 *              stirs it
 *
 * The states are spring weights, so they blend: speech fading into
 * thought hands the ink from one motion to the next. Loudness and
 * bands are read once a frame from functions, never through React
 * state. Off screen or in a hidden tab it stops.
 *
 * Reduced motion: one still, settled picture per state.
 * ───────────────────────────────────────────────────────── */

export type VoiceOrbState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceOrbProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  state?: VoiceOrbState;
  /** Read every frame, 0 to 1: the microphone while listening, the voice while speaking. useVoiceAudio makes one. */
  getLevel?: () => number;
  /** Read every frame: loudness per frequency band, 0 to 1, low to high (eight is plenty). useVoiceAudio makes one. */
  getSpectrum?: () => ArrayLike<number>;
  /** The loudness as a prop instead; getLevel wins when both are given. */
  level?: number;
  /** Diameter in px. */
  size?: number;
  /** Three CSS colours for the ink, low notes to high. Theme variables welcome. */
  colors?: [string, string, string];
  /** What it's called for screen readers; the state is added to it. */
  label?: string;
}

const COLORS: [string, string, string] = ["var(--chart-1, var(--primary))", "var(--chart-3, var(--primary))", "var(--chart-2, var(--primary))"];
/** Inks for themes without colour of their own: blue, teal and coral. */
const INKS: Rgb[] = [
  [0.23, 0.42, 0.95],
  [0.08, 0.66, 0.6],
  [0.96, 0.46, 0.38],
];
const SAY: Record<VoiceOrbState, string> = { idle: "ready", listening: "listening", thinking: "thinking", speaking: "speaking" };
const SILENT = new Float32Array(BANDS);
const TAU = Math.PI * 2;

// How each state moves the water: accelerations in grid cells per second², and ink poured per second.
const PULL_IN = 1450;
const PUSH_OUT = 1750;
const DRIFT = 45;
const INK_IN = 7;
const INK_OUT = 7;
const MOOD = { stiffness: 60, damping: 15 };
const LEVEL = { stiffness: 320, damping: 30 };

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Low notes in the first colour, through the second, high notes in the third. */
const bandColor = (palette: Rgb[], b: number) => {
  const t = (b / (BANDS - 1)) * 2;
  return t <= 1 ? mixRgb(palette[0], palette[1], t) : mixRgb(palette[1], palette[2], t - 1);
};

/** Where the three pools of dilute ink sit in the water (the vessel's box, y down): low notes top left, high notes below. */
const POOLS: [number, number][] = [
  [0.32, 0.36],
  [0.68, 0.4],
  [0.5, 0.72],
];

/** The water's look: the pools turned by phase (they drift a full turn in about a minute), deeper in the dark. */
function waterLook(dark: boolean, phase: number): Omit<Water, "inks"> {
  const c = Math.cos(phase), s = Math.sin(phase);
  return {
    pools: POOLS.map(([x, y]): [number, number] => [0.5 + (x - 0.5) * c - (y - 0.5) * s, 0.5 + (x - 0.5) * s + (y - 0.5) * c]),
    poolAlpha: dark ? 0.36 : 0.3,
    poolRadius: 0.46,
    base: dark ? [0.09, 0.2] : [0.07, 0.16],
    line: dark ? 0.4 : 0.32,
  };
}

/** The inks and whether the page is dark, read from the theme. A theme whose chart colours are greys (shadcn's default)
 * would pour grey ink, so then the orb uses inks of its own. */
function readTheme(host: HTMLElement, colorKey: string) {
  const [r1, r2, r3, bg] = resolveColors(host, [...colorKey.split("|"), "var(--background, #fff)"]);
  const chroma = (c: Rgb) => Math.max(...c) - Math.min(...c);
  const inks = [r1, r2, r3].some((c) => chroma(c) > 0.12) ? [r1, r2, r3] : INKS;
  return { inks, dark: 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.45 };
}

const rgbCss = (c: Rgb) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;

type Weights = { listen: number; speak: number; think: number };
const WEIGHTS: Record<VoiceOrbState, Weights> = {
  idle: { listen: 0, speak: 0, think: 0 },
  listening: { listen: 1, speak: 0, think: 0 },
  thinking: { listen: 0, speak: 0, think: 1 },
  speaking: { listen: 0, speak: 1, think: 0 },
};

interface Clock {
  time: number;
  turn: number;
  stir: number;
}

/** Everything a state does to the water this frame. Pure: the same inputs make the same emitters. */
function emittersFor(w: Weights, bands: ArrayLike<number>, palette: Rgb[], clock: Clock, dt: number): Emitter[] {
  const out: Emitter[] = [];
  const idle = Math.max(0, 1 - w.listen - w.speak - w.think);
  for (let b = 0; b < BANDS; b++) {
    const e = clamp01(bands[b] ?? 0);
    const color = bandColor(palette, b);
    if (w.listen > 0.02 && e > 0.03) {
      const a = clock.turn + (b * TAU) / BANDS;
      const c = Math.cos(a), s = Math.sin(a);
      const k = e * w.listen;
      out.push({ x: 0.5 + 0.43 * c, y: 0.5 + 0.43 * s, radius: 0.038, fx: -c * PULL_IN * k * dt, fy: -s * PULL_IN * k * dt, color, amount: k * INK_IN * dt });
    }
    if (w.speak > 0.02 && e > 0.03) {
      // Each band blooms out on two opposite sides, so the voice opens the ink evenly instead of shooting one plume.
      const a = -clock.turn * 1.3 + (b * Math.PI) / BANDS + (b % 2) * Math.PI + 0.4;
      const c = Math.cos(a), s = Math.sin(a);
      const k = e * w.speak;
      out.push({ x: 0.5 + 0.04 * c, y: 0.5 + 0.04 * s, radius: 0.036, fx: c * PUSH_OUT * k * dt, fy: s * PUSH_OUT * k * dt, color, amount: k * INK_OUT * dt });
    }
  }
  // Thinking and idle feed the body from two points circling near the middle; the turning water winds it into arms.
  const feed = 0.9 * w.think;
  if (feed > 0.02) {
    for (let k = 0; k < 2; k++) {
      const a = clock.stir + k * Math.PI;
      out.push({ x: 0.5 + 0.12 * Math.cos(a), y: 0.5 + 0.12 * Math.sin(a), radius: 0.026, color: palette[k], amount: feed * 2.2 * dt });
    }
  }
  if (idle > 0.02) {
    const t = clock.time;
    const x = 0.5 + 0.2 * Math.cos(t * 0.23), y = 0.5 + 0.2 * Math.sin(t * 0.17 + 1);
    const a = Math.atan2(y - 0.5, x - 0.5) + Math.PI / 2;
    out.push({ x, y, radius: 0.09, fx: Math.cos(a) * DRIFT * idle * dt, fy: Math.sin(a) * DRIFT * idle * dt });
  }
  return out;
}

/** How the water itself behaves in a blend of states: eddies, how fast motion and ink fade, and the turn. */
function waterFor(w: Weights) {
  const idle = Math.max(0, 1 - w.listen - w.speak - w.think);
  const voice = w.listen + w.speak;
  return {
    curl: 2 * idle + 1.2 * w.think + 6 * voice,
    velocityFade: 0.9 * idle + 0.7 * w.think + 0.8 * voice,
    inkFade: 0.1 * idle + 0.22 * w.think + 0.34 * voice,
    rimFade: 0.35 * idle + 0.25 * w.think + 0.05 * w.listen + 0.12 * w.speak,
    swirl: 0.08 * idle + 0.6 * w.think + 0.05 * w.listen - 0.04 * w.speak,
  };
}

/** Bands from loudness alone, for sources that only give a level: speech-like, never all bands in step. */
function bandsFromLevel(level: number, time: number, out: Float32Array) {
  for (let b = 0; b < BANDS; b++) out[b] = clamp01(level * (0.55 + 0.45 * Math.sin(time * 5.3 + b * 1.9 + Math.sin(time * 1.3 + b * 0.7) * 2)));
  return out;
}

/** The first drops: three small ones, wound into wisps before the first frame, so it never starts empty. */
function seedFor(palette: Rgb[]): Emitter[] {
  return [
    { x: 0.44, y: 0.56, radius: 0.045, color: palette[0], amount: 1.4 },
    { x: 0.58, y: 0.47, radius: 0.04, color: palette[1], amount: 1.2 },
    { x: 0.46, y: 0.41, radius: 0.03, color: palette[2], amount: 0.8 },
  ];
}

export function VoiceOrb({ state = "idle", getLevel, getSpectrum, level, size = 160, colors = COLORS, label = "Voice assistant", className = "", style, ...props }: VoiceOrbProps) {
  const reduced = useInteractionReducedMotion();
  const { ref: activityRef, active } = useInteractionActivity<HTMLDivElement>();
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const fallback = React.useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = React.useState(false);
  const colorKey = colors.join("|");

  const input = React.useRef({ state, getLevel, getSpectrum, level });
  React.useLayoutEffect(() => {
    input.current = { state, getLevel, getSpectrum, level };
  });

  const engine = React.useRef<{
    fluid: FluidOrb;
    palette: Rgb[];
    dark: boolean;
    /** Seconds the water has been shown; the pools drift with it. */
    waterTime: number;
    springs: { listen: Spring; speak: Spring; think: Spring; level: Spring };
    clock: Clock;
    bands: Float32Array;
    stirs: Emitter[];
    /** True while the first ink is being folded, a few steps a frame; the loop waits for it. */
    pouring: boolean;
    frame: (dt: number) => void;
    settle: (target: Weights) => void;
  } | null>(null);

  // The fluid lives as long as the canvas; its size is fixed when it starts.
  React.useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(size * dpr);
    el.height = Math.round(size * dpr);
    let fluid: FluidOrb | null = null;
    try {
      fluid = createFluidOrb(el);
    } catch {
      fluid = null;
    }
    if (!fluid) {
      const frame = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(frame);
    }
    const f = fluid;
    const start = WEIGHTS[input.current.state];
    const quiet = () => {};
    const springs = {
      listen: createSpring(start.listen, MOOD, quiet, 0.002),
      speak: createSpring(start.speak, MOOD, quiet, 0.002),
      think: createSpring(start.think, MOOD, quiet, 0.002),
      level: createSpring(0, LEVEL, quiet, 0.002),
    };
    const clock: Clock = { time: 0, turn: 0, stir: 0 };
    const bands = new Float32Array(BANDS);

    const e: NonNullable<typeof engine.current> = {
      fluid: f,
      palette: [[0.19, 0.36, 0.87], [0.11, 0.69, 0.48], [0.91, 0.45, 0.23]],
      dark: false,
      waterTime: 0,
      springs,
      clock,
      bands,
      stirs: [],
      pouring: false,
      frame(dt) {
        if (e.pouring) return;
        const { state: s, getLevel: read, getSpectrum: spectrum, level: given } = input.current;
        const moving = s === "listening" || s === "speaking";
        const raw = moving ? clamp01(read ? read() : (given ?? 0)) : 0;
        springs.level.set(raw);
        const lv = Math.max(0, springs.level.get());
        if (moving && spectrum) {
          const got = spectrum();
          for (let b = 0; b < BANDS; b++) bands[b] = clamp01(got[Math.floor((b * got.length) / BANDS)] ?? 0);
        } else bandsFromLevel(lv, clock.time, bands);
        const w = { listen: Math.max(0, springs.listen.get()), speak: Math.max(0, springs.speak.get()), think: Math.max(0, springs.think.get()) };
        clock.time += dt;
        clock.turn += dt * (0.22 + 0.5 * w.think);
        clock.stir += dt * 1.5;
        const emitters = emittersFor(w, bands, e.palette, clock, dt);
        if (e.stirs.length) emitters.push(...e.stirs.splice(0));
        f.step({ dt, emitters, ...waterFor(w) });
        e.waterTime += dt;
        f.draw({ radius: 0.455 + 0.025 * lv * (w.listen + w.speak) - 0.012 * w.think, water: { inks: e.palette, ...waterLook(e.dark, e.waterTime * 0.1) }, dark: e.dark });
      },
      settle(target) {
        if (e.pouring) return;
        // A still picture of a state: run it for a moment at speech-like loudness, then hold.
        const w = target;
        bandsFromLevel(0.55, clock.time, bands);
        for (let i = 0; i < 50; i++) {
          clock.time += 1 / 30;
          clock.turn += (1 / 30) * 0.3;
          clock.stir += (1 / 30) * 1.5;
          f.step({ dt: 1 / 30, emitters: emittersFor(w, bands, e.palette, clock, 1 / 30), ...waterFor(w) });
        }
        f.draw({ radius: 0.455, water: { inks: e.palette, ...waterLook(e.dark, e.waterTime * 0.1) }, dark: e.dark });
      },
    };
    engine.current = e;

    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    el.addEventListener("webglcontextlost", lost);
    return () => {
      el.removeEventListener("webglcontextlost", lost);
      Object.values(springs).forEach((s) => s.stop());
      f.dispose();
      engine.current = null;
    };
  }, [size]);

  // The stand-in is the same water the fluid starts in, in CSS, so handing over to the fluid changes nothing but the ink.
  // It is painted with the resolved theme before the first paint (the markup's own picture only shows before hydration).
  const paintStandIn = React.useCallback((theme: { inks: Rgb[]; dark: boolean }) => {
    const el = fallback.current;
    if (!el) return;
    const css = waterCss(waterLook(theme.dark, 0), theme.inks.map(rgbCss));
    el.style.background = css.background;
    el.style.boxShadow = css.boxShadow;
  }, []);
  React.useLayoutEffect(() => {
    const el = fallback.current;
    if (el) paintStandIn(readTheme(el.parentElement ?? document.body, colorKey));
  }, [colorKey, paintStandIn]);

  // Colours from the theme, again whenever the theme changes. The first time, the ink is poured and settled before it shows.
  const poured = React.useRef(false);
  React.useEffect(() => {
    const el = canvas.current;
    if (!el || failed) return;
    poured.current = false;
    let pour = 0;
    const apply = () => {
      const e = engine.current;
      if (!e) return;
      const theme = readTheme(el.parentElement ?? document.body, colorKey);
      e.palette = theme.inks;
      e.dark = theme.dark;
      paintStandIn(theme);
      const reveal = () => {
        // A true crossfade: both show the same water, so fading one in as the other fades out keeps the water still and
        // only the ink appears. (The stand-in's slow fade is only for a WebGL failure.)
        const standIn = fallback.current;
        if (!standIn) return;
        el.style.transition = standIn.style.transition = "opacity 240ms linear";
        el.style.opacity = "1";
        standIn.style.opacity = "0";
      };
      if (poured.current) {
        e.frame(0.0001);
        return reveal();
      }
      poured.current = true;
      // Pour, then fold it with a stir before it shows, so it starts as ink that has been moving. It waits for the shaders
      // to finish compiling in the background, then folds a few steps a frame behind the stand-in, never as one long task.
      const fold = { listen: 0, speak: 0, think: 1 };
      const stir = (steps: number) => {
        for (let i = 0; i < steps; i++) {
          e.clock.time += 1 / 30;
          e.clock.stir += (1 / 30) * 1.5;
          e.fluid.step({ dt: 1 / 30, emitters: emittersFor(fold, e.bands, e.palette, e.clock, 1 / 30), ...waterFor(fold) });
        }
      };
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      e.pouring = true;
      let left = -1;
      const chunk = () => {
        if (engine.current !== e) return;
        try {
          if (!e.fluid.ready()) {
            pour = requestAnimationFrame(chunk);
            return;
          }
        } catch {
          setFailed(true);
          return;
        }
        if (left < 0) {
          e.fluid.seed(seedFor(e.palette));
          left = 54;
        }
        const n = still ? left : Math.min(6, left);
        stir(n);
        left -= n;
        if (left > 0) {
          pour = requestAnimationFrame(chunk);
          return;
        }
        e.pouring = false;
        if (still) e.settle(WEIGHTS[input.current.state]);
        else e.frame(1 / 60);
        reveal();
      };
      pour = requestAnimationFrame(chunk);
    };
    apply();
    // Only a theme switch matters (a class or data-theme on <html>); other attribute writes are ignored.
    const root = document.documentElement;
    let theme = `${root.className}|${root.dataset.theme ?? ""}`;
    const watch = new MutationObserver(() => {
      const next = `${root.className}|${root.dataset.theme ?? ""}`;
      if (next === theme) return;
      theme = next;
      apply();
    });
    watch.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => {
      watch.disconnect();
      cancelAnimationFrame(pour);
      if (engine.current) engine.current.pouring = false;
    };
  }, [colorKey, failed, size, paintStandIn]);

  // A state change re-aims the weights from wherever they are; under reduced motion it settles a still of the new state.
  React.useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const w = WEIGHTS[state];
    if (reduced) {
      e.springs.listen.jump(w.listen);
      e.springs.speak.jump(w.speak);
      e.springs.think.jump(w.think);
      e.settle(w);
      return;
    }
    e.springs.listen.set(w.listen);
    e.springs.speak.set(w.speak);
    e.springs.think.set(w.think);
  }, [state, reduced]);

  // The loop: only while on screen and the tab is visible, never under reduced motion.
  React.useEffect(() => {
    if (!active || reduced || failed) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      engine.current?.frame(dt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reduced, failed]);

  // A finger or a cursor stirs the water: no ink, just a push along the way it moved.
  const lastPoint = React.useRef<{ x: number; y: number } | null>(null);
  const stir = (event: React.PointerEvent<HTMLDivElement>) => {
    const e = engine.current;
    if (!e || reduced) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = 1 - (event.clientY - box.top) / box.height;
    const prev = lastPoint.current;
    lastPoint.current = { x, y };
    if (!prev || Math.hypot(x - 0.5, y - 0.5) > 0.46) return;
    const dx = x - prev.x, dy = y - prev.y;
    if (Math.abs(dx) + Math.abs(dy) < 0.002) return;
    e.stirs.push({ x, y, radius: 0.06, fx: Math.max(-120, Math.min(120, dx * 4000)), fy: Math.max(-120, Math.min(120, dy * 4000)) });
  };

  return (
    <div
      ref={activityRef}
      role="img"
      aria-label={`${label}, ${SAY[state]}`}
      {...props}
      onPointerMove={(event) => {
        props.onPointerMove?.(event);
        stir(event);
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        lastPoint.current = null;
      }}
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {/* First paint, and the whole orb where WebGL 2 isn't available: the fluid's water, without the moving ink. */}
      <span
        ref={fallback}
        aria-hidden="true"
        className="absolute rounded-full transition-[opacity,scale] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          width: "91%",
          height: "91%",
          opacity: 1,
          // The vessel's size in the state it opens in, so the hand-over to the fluid has one edge.
          scale: state === "thinking" ? 0.443 / 0.455 : 1,
          ["--orb-d" as string]: `${size * 0.91}px`,
          ...waterCss(waterLook(false, 0), colors),
        }}
      />
      <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 size-full" style={{ display: failed ? "none" : undefined, opacity: 0 }} />
      <span role="status" className="sr-only">
        {SAY[state]}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * useVoiceAudio: what the orb reads from a real source
 *
 *   MediaStream        a microphone from getUserMedia, or a
 *                      remote track from WebRTC
 *   HTMLMediaElement   an <audio> playing the assistant's voice
 *
 * Returns { getLevel, getSpectrum }: functions that read the sound
 * right now, so the orb can call them every frame without
 * re-rendering anything. Spread them onto the orb.
 * ───────────────────────────────────────────────────────── */

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
      getSpectrum: (): ArrayLike<number> => meter.current?.getSpectrum() ?? SILENT,
    }),
    [],
  );
}

export default VoiceOrb;
