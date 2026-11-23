"use client";

import * as React from "react";
import { createSpring, useInteractionActivity, useInteractionReducedMotion } from "./ui-interaction-motion";
import { BANDS, createAudioMeter, elementSource, type AudioMeter } from "./voice-audio";

/* ─────────────────────────────────────────────────────────
 * VOICE ORB: plasma in a glass globe that the voice moves
 *
 * A dark globe with a feathered edge holds a core of light and six
 * long ribbons of plasma on tilted orbits. Each state moves them its
 * own way, so the orb shows which way the sound is going:
 *   listening  sound comes in: the ribbons draw toward the core and
 *              brighten with their bands of the voice; a clear onset
 *              sends one soft pulse in from the edge
 *   speaking   sound goes out: the core swells with loudness and a
 *              clear syllable sends a soft pulse outward
 *   thinking   no sound: the ribbons lengthen and wind into a slow
 *              spiral and the core breathes, dimmer
 *   idle       a slow drift; a finger or a cursor draws the light
 *              toward it
 *
 * Everything is smoothed: loudness through a soft spring, bands that
 * rise quickly and fall slowly, states blending over about a second
 * and a half, and turning that accumulates, so nothing jolts. The
 * globe is always dark, so it reads the same on any page. Loudness
 * and bands are read once a frame from functions, never through React
 * state; off screen or in a hidden tab it stops.
 *
 * Reduced motion: one still picture per state.
 * ───────────────────────────────────────────────────────── */

export type VoiceOrbState = "idle" | "listening" | "thinking" | "speaking";
export type VoiceOrbTone = "ice" | "solar" | "rose";

export interface VoiceOrbProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  state?: VoiceOrbState;
  /** Read every frame, 0 to 1: the microphone while listening, the voice while speaking. useVoiceAudio makes one. */
  getLevel?: () => number;
  /** Read every frame: loudness per frequency band, 0 to 1, low to high (eight is plenty). useVoiceAudio makes one. */
  getSpectrum?: () => ArrayLike<number>;
  /** The loudness as a prop instead; getLevel wins when both are given. */
  level?: number;
  /** Diameter of the orb's box in px; the globe fills most of it and its light spills a little past. */
  size?: number;
  /** The plasma's colour. */
  tone?: VoiceOrbTone;
  /** Your own three colours instead of a tone: the deep plasma, the streams, the core. Any CSS colour, theme variables too. */
  colors?: [string, string, string];
  /** What it's called for screen readers; the state is added to it. */
  label?: string;
}

type Rgb = [number, number, number];

interface Plasma {
  halo: Rgb;
  deep: Rgb;
  nebulaA: Rgb;
  nebulaB: Rgb;
  arc: Rgb;
  arcCore: Rgb;
  coreMid: Rgb;
  rim: Rgb;
  rimHighlight: Rgb;
}

const TONES: Record<VoiceOrbTone, Plasma> = {
  ice: {
    halo: [56, 189, 248],
    deep: [3, 19, 38],
    nebulaA: [37, 134, 232],
    nebulaB: [125, 224, 255],
    arc: [72, 198, 255],
    arcCore: [235, 250, 255],
    coreMid: [135, 226, 255],
    rim: [165, 232, 255],
    rimHighlight: [235, 250, 255],
  },
  solar: {
    halo: [245, 158, 11],
    deep: [34, 12, 4],
    nebulaA: [234, 88, 12],
    nebulaB: [251, 191, 36],
    arc: [251, 146, 60],
    arcCore: [255, 250, 235],
    coreMid: [253, 212, 130],
    rim: [253, 212, 145],
    rimHighlight: [255, 248, 230],
  },
  rose: {
    halo: [244, 114, 182],
    deep: [31, 6, 18],
    nebulaA: [225, 29, 110],
    nebulaB: [251, 146, 190],
    arc: [244, 114, 182],
    arcCore: [255, 240, 246],
    coreMid: [251, 170, 205],
    rim: [251, 182, 206],
    rimHighlight: [255, 240, 246],
  },
};

const SAY: Record<VoiceOrbState, string> = { idle: "ready", listening: "listening", thinking: "thinking", speaking: "speaking" };
const SILENT = new Float32Array(BANDS);
// States blend over about a second and a half; loudness is followed smoothly, never frame by frame.
const MOOD = { stiffness: 34, damping: 11.5 };
const LEVEL = { stiffness: 110, damping: 19 };

type Weights = { listen: number; speak: number; think: number };
const WEIGHTS: Record<VoiceOrbState, Weights> = {
  idle: { listen: 0, speak: 0, think: 0 },
  listening: { listen: 1, speak: 0, think: 0 },
  thinking: { listen: 0, speak: 0, think: 1 },
  speaking: { listen: 0, speak: 1, think: 0 },
};

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const clamp01 = (n: number) => (Number.isFinite(n) ? clamp(n, 0, 1) : 0);
const rgba = (c: Rgb, a: number) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${clamp(a, 0, 1).toFixed(3)})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [2, 6, 14];

/** Three CSS colours (theme variables and oklch() too) resolved to sRGB through the page, then a whole plasma built from them. */
function plasmaFrom(host: Element, colors: [string, string, string]): Plasma {
  const probe = document.createElement("span");
  probe.style.display = "none";
  host.appendChild(probe);
  let swatch: CanvasRenderingContext2D | null | undefined;
  const rgb = colors.map((c): Rgb => {
    probe.style.color = "";
    probe.style.color = c;
    const resolved = getComputedStyle(probe).color;
    if (/^rgba?\(/.test(resolved)) {
      const m = resolved.match(/[\d.]+/g)?.map(Number);
      if (m && m.length >= 3) return [m[0], m[1], m[2]];
    }
    if (swatch === undefined) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      swatch = canvas.getContext("2d", { willReadFrequently: true });
    }
    if (swatch) {
      swatch.clearRect(0, 0, 1, 1);
      swatch.fillStyle = "#808080";
      swatch.fillStyle = resolved;
      swatch.fillRect(0, 0, 1, 1);
      const d = swatch.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    }
    return [128, 128, 128];
  });
  probe.remove();
  const [deep, stream, core] = rgb;
  return {
    halo: stream,
    deep: mix(deep, BLACK, 0.86),
    nebulaA: deep,
    nebulaB: mix(stream, WHITE, 0.25),
    arc: stream,
    arcCore: mix(core, WHITE, 0.82),
    coreMid: mix(core, WHITE, 0.45),
    rim: mix(stream, WHITE, 0.5),
    rimHighlight: mix(core, WHITE, 0.88),
  };
}

/** Bands from loudness alone, for sources that only give a level: speech-like, never all bands in step. */
function bandsFromLevel(level: number, time: number, out: Float32Array) {
  for (let b = 0; b < BANDS; b++) out[b] = clamp01(level * (0.55 + 0.45 * Math.sin(time * 5.3 + b * 1.9 + Math.sin(time * 1.3 + b * 0.7) * 2)));
  return out;
}

interface Pulse {
  age: number;
  inward: boolean;
}

interface Frame {
  t: number;
  /** Turns accumulated at a speed set by the state, so a change of state never jolts the ribbons. */
  phase: number;
  w: Weights;
  level: number;
  bands: Float32Array;
  pull: { x: number; y: number; on: number };
  pulses: Pulse[];
}

const RIBBONS = 6;
const PULSE_LIFE = 1.15;
const ease = (x: number) => 1 - (1 - clamp(x, 0, 1)) ** 3;

/** One picture of the orb. Lengths are fractions of R, so it draws the same at any size. */
function paint(ctx: CanvasRenderingContext2D, box: number, R: number, p: Plasma, f: Frame) {
  const { t, phase, w, level, bands, pull, pulses } = f;
  const voice = level * (w.listen + w.speak);
  const cx = box / 2;
  const cy = box / 2;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, box, box);

  // The dark heart of the globe; its edge is feathered at the end, never drawn as a line.
  const cavity = ctx.createRadialGradient(cx - R * 0.14, cy - R * 0.16, R * 0.05, cx, cy, R);
  cavity.addColorStop(0, rgba(p.nebulaA, 0.4));
  cavity.addColorStop(0.62, rgba(p.deep, 1));
  cavity.addColorStop(1, rgba(BLACK, 1));
  ctx.fillStyle = cavity;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // Everything inside leans a little toward a finger.
  const ox = cx + pull.x * R * 0.08 * pull.on;
  const oy = cy + pull.y * R * 0.08 * pull.on;

  ctx.globalCompositeOperation = "lighter";
  // Slow clouds of light.
  for (let i = 0; i < 6; i++) {
    const a = phase * (0.35 + i * 0.05) * (i % 2 ? -1 : 1) + i * 1.05;
    const d = R * (0.16 + 0.12 * Math.sin(t * 0.5 + i * 1.7));
    const px = ox + Math.cos(a) * d;
    const py = oy + Math.sin(a) * d;
    const r = R * (0.5 + 0.12 * (i % 3));
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rgba(i % 2 ? p.nebulaB : p.nebulaA, 0.24 + voice * 0.14));
    g.addColorStop(1, rgba(p.nebulaA, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Long ribbons of light on tilted orbits: drawn in toward the core while listening, opened out while speaking,
  // wound into a spiral while thinking. Only slow, smooth curves; the voice brightens and swells them, never shakes them.
  const reach = 1 - 0.18 * w.listen * (0.4 + level) + 0.14 * w.speak * level;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let k = 0; k < RIBBONS; k++) {
    const band = bands[(k * 3) % BANDS] ?? 0;
    const a = R * (0.42 + 0.075 * k) * reach;
    const squash = 0.35 + 0.5 * ((k * 0.37) % 1);
    const tilt = k * 0.52 + phase * 0.12 * (k % 2 ? 1 : -1);
    const start = phase * (0.8 + 0.1 * k) * (k % 2 ? -1 : 1) + k * 1.3;
    const span = 1.9 + 0.5 * Math.sin(t * 0.21 + k) + 1.4 * w.think;
    const pts: [number, number][] = [];
    for (let n = 0; n <= 40; n++) {
      const q = n / 40;
      const th = start + span * q;
      const swell = 1 + 0.04 * Math.sin(th * 2 + t * 0.8 + k) + 0.13 * band * (w.listen + w.speak) * Math.sin(th * 3 + t * 1.4 + k * 2);
      const r = a * swell * (1 - 0.42 * w.think * q);
      const ex = Math.cos(th) * r;
      const ey = Math.sin(th) * r * squash;
      pts.push([ox + ex * Math.cos(tilt) - ey * Math.sin(tilt), oy + ex * Math.sin(tilt) + ey * Math.cos(tilt)]);
    }
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[pts.length - 1];
    const fade = (c: Rgb, alpha: number) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, rgba(c, 0));
      g.addColorStop(0.3, rgba(c, alpha));
      g.addColorStop(0.7, rgba(c, alpha));
      g.addColorStop(1, rgba(c, 0));
      return g;
    };
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let n = 1; n < pts.length; n++) ctx.lineTo(pts[n][0], pts[n][1]);
    const lift = 0.8 + 0.7 * band * (w.listen + w.speak) + 0.2 * w.think;
    ctx.strokeStyle = fade(p.arc, 0.13 * lift);
    ctx.lineWidth = R * 0.12;
    ctx.stroke();
    ctx.strokeStyle = fade(p.arc, 0.3 * lift);
    ctx.lineWidth = R * 0.04;
    ctx.stroke();
    ctx.strokeStyle = fade(p.arcCore, Math.min(1, 0.78 * lift));
    ctx.lineWidth = Math.max(1, R * 0.012);
    ctx.stroke();
  }

  // Soft pulses: in from the edge while listening, out from the core while speaking. Never a hard line.
  for (const pulse of pulses) {
    const k = ease(pulse.age / PULSE_LIFE);
    const r = pulse.inward ? R * (0.96 - 0.5 * k) : R * (0.42 + 0.54 * k);
    const band = R * 0.14;
    const g = ctx.createRadialGradient(cx, cy, Math.max(0, r - band), cx, cy, r + band);
    g.addColorStop(0, rgba(p.arc, 0));
    // Eased in over its first fifth of a second, then fading: a pulse never pops.
    const life = pulse.age < 0.2 ? Math.sin((pulse.age / 0.2) * (Math.PI / 2)) : 1 - (pulse.age - 0.2) / (PULSE_LIFE - 0.2);
    g.addColorStop(0.5, rgba(p.rimHighlight, 0.36 * Math.max(0, life)));
    g.addColorStop(1, rgba(p.arc, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r + band, 0, Math.PI * 2);
    ctx.fill();
  }

  // The core: swells with the voice while speaking, breathes and dims while thinking.
  const breath = 0.5 + 0.5 * Math.sin(t * 0.9);
  const coreR = R * (0.48 + 0.22 * w.speak * level + 0.08 * w.listen * level - 0.08 * w.think + 0.05 * w.think * breath + 0.02 * Math.sin(t * 0.9));
  const glow = 0.95 - 0.22 * w.think * (1 - breath);
  const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, coreR);
  core.addColorStop(0, `rgba(255, 255, 255, ${glow.toFixed(3)})`);
  core.addColorStop(0.22, `rgba(255, 255, 255, ${(glow * 0.92).toFixed(3)})`);
  core.addColorStop(0.5, rgba(p.coreMid, 0.7 * glow));
  core.addColorStop(0.8, rgba(p.nebulaA, 0.3));
  core.addColorStop(1, rgba(p.nebulaA, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(ox, oy, coreR, 0, Math.PI * 2);
  ctx.fill();

  // A few motes drifting slowly.
  for (let i = 0; i < 10; i++) {
    const a = i * 2.399 + phase * (0.25 + (i % 3) * 0.08);
    const r = R * (0.3 + ((i * 0.137) % 0.5));
    ctx.fillStyle = `rgba(240, 250, 255, ${(0.18 + 0.32 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 1.9))).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.max(0.8, R * 0.009), 0, Math.PI * 2);
    ctx.fill();
  }

  // Light gathering softly inside the edge, and a faint reflection: glass felt, not outlined.
  ctx.globalCompositeOperation = "source-over";
  const rim = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R);
  rim.addColorStop(0, rgba(p.arc, 0));
  rim.addColorStop(0.82, rgba(p.arc, 0.1 + voice * 0.08));
  rim.addColorStop(1, rgba(p.rim, 0.05));
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  const sheen = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.4, 0, cx - R * 0.3, cy - R * 0.36, R * 0.5);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.16)");
  sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // Feather the edge: solid to 84% of the radius, gone at the edge.
  ctx.globalCompositeOperation = "destination-in";
  const mask = ctx.createRadialGradient(cx, cy, R * 0.84, cx, cy, R);
  mask.addColorStop(0, "rgba(0, 0, 0, 1)");
  mask.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, box, box);

  // The light around it, behind everything.
  ctx.globalCompositeOperation = "destination-over";
  const halo = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.45);
  halo.addColorStop(0, rgba(p.halo, 0.24 + voice * 0.1));
  halo.addColorStop(0.5, rgba(p.halo, 0.08 + voice * 0.04));
  halo.addColorStop(1, rgba(p.halo, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, box, box);
  ctx.globalCompositeOperation = "source-over";
}

export function VoiceOrb({ state = "idle", getLevel, getSpectrum, level, size = 160, tone = "ice", colors, label = "Voice assistant", className = "", style, ...props }: VoiceOrbProps) {
  const reduced = useInteractionReducedMotion();
  const { ref: activityRef, active } = useInteractionActivity<HTMLDivElement>();
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const colorKey = colors?.join("|") ?? "";
  const input = React.useRef({ state, getLevel, getSpectrum, level });
  React.useLayoutEffect(() => {
    input.current = { state, getLevel, getSpectrum, level };
  });

  const engine = React.useRef<{
    plasma: Plasma;
    springs: { listen: ReturnType<typeof createSpring>; speak: ReturnType<typeof createSpring>; think: ReturnType<typeof createSpring>; level: ReturnType<typeof createSpring> };
    time: number;
    bands: Float32Array;
    pull: { x: number; y: number; on: number; target: number };
    pulses: Pulse[];
    phase: number;
    /** Loudness a moment ago and when the last pulse went, to send pulses only on clear onsets. */
    recent: number;
    lastPulse: number;
    draw: (dt: number) => void;
  } | null>(null);

  // The canvas reaches past the box so the light around the glass is never cut into a square.
  const box = Math.round(size * 1.5);
  const R = size * 0.47;

  React.useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(box * dpr);
    el.height = Math.round(box * dpr);
    const quiet = () => {};
    const start = WEIGHTS[input.current.state];
    const springs = {
      listen: createSpring(start.listen, MOOD, quiet, 0.002),
      speak: createSpring(start.speak, MOOD, quiet, 0.002),
      think: createSpring(start.think, MOOD, quiet, 0.002),
      level: createSpring(0, LEVEL, quiet, 0.002),
    };
    const targetBands = new Float32Array(BANDS);
    const e: NonNullable<typeof engine.current> = {
      plasma: colorKey ? plasmaFrom(el.parentElement ?? document.body, colorKey.split("|") as [string, string, string]) : TONES[tone],
      springs,
      time: 0,
      bands: new Float32Array(BANDS),
      pull: { x: 0, y: 0, on: 0, target: 0 },
      pulses: [],
      phase: 0,
      recent: 0,
      lastPulse: -10,
      draw(dt) {
        const { state: s, getLevel: read, getSpectrum: spectrum, level: given } = input.current;
        const moving = s === "listening" || s === "speaking";
        springs.level.set(moving ? clamp01(read ? read() : (given ?? 0)) : 0);
        const lv = clamp01(springs.level.get());
        // Bands rise quickly and fall slowly, so the ribbons swell with the voice instead of flickering.
        const up = 1 - Math.exp(-dt * 9);
        const down = 1 - Math.exp(-dt * 2.5);
        if (moving && spectrum) {
          const got = spectrum();
          for (let b = 0; b < BANDS; b++) {
            const v = clamp01(got[Math.floor((b * got.length) / BANDS)] ?? 0);
            e.bands[b] += (v - e.bands[b]) * (v > e.bands[b] ? up : down);
          }
        } else {
          const target = bandsFromLevel(lv, e.time, targetBands);
          for (let b = 0; b < BANDS; b++) e.bands[b] += (target[b] - e.bands[b]) * (target[b] > e.bands[b] ? up : down);
        }
        // A clear onset (the voice rising well above where it was a moment ago) sends one soft pulse, at most every 0.5s.
        if (moving && lv - e.recent > 0.12 && lv > 0.3 && e.time - e.lastPulse > 0.5) {
          e.pulses.push({ age: 0, inward: s === "listening" });
          e.lastPulse = e.time;
        }
        e.recent += (lv - e.recent) * (1 - Math.exp(-dt * 4));
        for (const pulse of e.pulses) pulse.age += dt;
        e.pulses = e.pulses.filter((pulse) => pulse.age < PULSE_LIFE);
        e.pull.on += (e.pull.target - e.pull.on) * (1 - Math.exp(-dt * 4));
        const w = { listen: clamp01(springs.listen.get()), speak: clamp01(springs.speak.get()), think: clamp01(springs.think.get()) };
        const idle = Math.max(0, 1 - w.listen - w.speak - w.think);
        e.phase += dt * (0.32 * idle + 0.9 * w.think + 0.55 * w.listen + 0.6 * w.speak);
        e.time += dt;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paint(ctx, box, R, e.plasma, { t: e.time, phase: e.phase, w, level: lv, bands: e.bands, pull: e.pull, pulses: e.pulses });
      },
    };
    engine.current = e;
    e.time = 1.8;
    e.draw(0);
    return () => {
      Object.values(springs).forEach((sp) => sp.stop());
      engine.current = null;
    };
  }, [box, R, tone, colorKey]);

  // A state change re-aims the weights from wherever they are; under reduced motion it paints a still of the new state.
  React.useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const w = WEIGHTS[state];
    if (reduced) {
      e.springs.listen.jump(w.listen);
      e.springs.speak.jump(w.speak);
      e.springs.think.jump(w.think);
      e.time = 1.8;
      e.draw(0);
      return;
    }
    e.springs.listen.set(w.listen);
    e.springs.speak.set(w.speak);
    e.springs.think.set(w.think);
  }, [state, reduced]);

  // The loop: only while on screen and the tab is visible, never under reduced motion.
  React.useEffect(() => {
    if (!active || reduced) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      engine.current?.draw(dt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reduced]);

  return (
    <div
      ref={activityRef}
      role="img"
      aria-label={`${label}, ${SAY[state]}`}
      {...props}
      onPointerMove={(event) => {
        props.onPointerMove?.(event);
        const e = engine.current;
        if (!e) return;
        const r = event.currentTarget.getBoundingClientRect();
        e.pull.x = clamp(((event.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
        e.pull.y = clamp(((event.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
        e.pull.target = 1;
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        if (engine.current) engine.current.pull.target = 0;
      }}
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      <canvas
        ref={canvas}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
        style={{ width: box, height: box }}
      />
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
