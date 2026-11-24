"use client";

import * as React from "react";
import { createSpring, useInteractionActivity, useInteractionReducedMotion } from "./ui-interaction-motion";
import { BANDS } from "./voice-audio";

/* ─────────────────────────────────────────────────────────
 * DITHER HORIZON: an 8×8 Bayer light field under a voice bar
 *
 *   field      each column's cells are lit where the wave's energy
 *              clears an 8×8 Bayer threshold: a fused white-hot base on
 *              dark (deep ink on light), checkerboards with dark holes
 *              through the middle, single grains at the crest. Cells are
 *              a whole number of device pixels, so every cell is the same
 *              size and sharp; a soft wash and a 1.5px rim sit under them
 *   listening  eight audio bands shape the crest; clear onsets send
 *              ripples across; a pointer lifts embers toward it
 *   muted      the wave folds into one dotted row that breathes
 *   thinking   cools into a scanner gliding edge to edge, densest where
 *              it is working
 *   spawn      leaving idle fires comet streaks out of originRef along
 *              the rim; returning to idle draws them back into it
 *   words      ref.condense(el): the cells of a word lift off the wave
 *              and land in that word's shape on the grid, then dissolve
 *              in Bayer order as the real text fades in over them
 *   idle       nothing is drawn and the frame loop sleeps
 * ───────────────────────────────────────────────────────── */

export type DitherHorizonState = "idle" | "listening" | "thinking" | "speaking";
export type DitherHorizonPalette = "spectral" | "theme";
export type DitherPulseKind = "ripple" | "wipe" | "spark";

export interface DitherHorizonPulseOptions {
  /** Normalized horizontal origin (0..1) or an element whose center determines the origin. */
  origin?: number | HTMLElement | null;
  /** Optional CSS color accent for the shockwave crest. */
  color?: string;
  /** Impulse strength 0.2..1.4 (default 0.85). */
  strength?: number;
  /** "ripple" expands outward with micro-comets, "wipe" sweeps smoothly, "spark" is a quiet keystroke tick. */
  kind?: DitherPulseKind;
}

export interface DitherHorizonHandle {
  /** Trigger a localized shockwave from any action, mode change or keystroke. */
  pulse: (options?: DitherHorizonPulseOptions) => void;
  /** Lift cells off the wave into the shape of this element's text (a word just recognised). Returns the landing time in ms. */
  condense: (target: HTMLElement) => number;
}

export interface DitherHorizonProps extends Omit<React.CanvasHTMLAttributes<HTMLCanvasElement>, "children"> {
  ref?: React.Ref<DitherHorizonHandle>;
  state?: DitherHorizonState;
  /** While listening, folds the wave down into a quiet dotted row along the edge. */
  muted?: boolean;
  /** Read every frame (0..1) without re-rendering React. */
  getLevel?: () => number;
  /** Read every frame (frequency bands 0..1, low to high). */
  getSpectrum?: () => ArrayLike<number>;
  /** Scalar loudness fallback (0..1) when getLevel is not passed. */
  level?: number;
  /** Element whose center comets burst out from on spawn and return to on dismiss. */
  originRef?: React.RefObject<HTMLElement | null>;
  /** Container that captures pointer movement for ember lift. Defaults to the canvas parent. */
  pointerRef?: React.RefObject<HTMLElement | null>;
  /** Wave envelope: "bar" spans the full edge, "card" rises through the lower center channel. */
  shape?: "bar" | "card";
  /** "spectral" (full rainbow listening + cool cyan/violet thinking) or "theme" (--chart-1..5 / --primary). */
  palette?: DitherHorizonPalette;
  /** Custom CSS color stops (theme vars work too). Overrides palette. */
  colors?: readonly string[];
  /** Hovering lifts single-cell embers off the crest toward the pointer. */
  interactive?: boolean;
  /** Cell size in CSS px, rounded to whole device pixels (default 2.5). */
  cellSize?: number;
}

type Rgb = [number, number, number];

interface Comet {
  mode: "spawn" | "dismiss" | "burst";
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  ex: number;
  ey: number;
  age: number;
  delay: number;
  life: number;
  size: number;
  rgb: Rgb;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  seed: number;
  rgb: Rgb;
}

interface PulseWave {
  kind: DitherPulseKind;
  originU: number;
  age: number;
  life: number;
  strength: number;
  rgb: Rgb | null;
}

/** One cell of a word: flies from the wave to its place in the word, holds, then dissolves. */
interface Grain {
  col: number;
  row: number;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  age: number;
  delay: number;
  fly: number;
  rgb: Rgb;
}

// 8×8 ordered Bayer matrix: 64 thresholds, the same everywhere, so the pattern never swims.
const BAYER8: Float32Array = (() => {
  const m = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ];
  const out = new Float32Array(64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out[(y << 3) | x] = (m[y][x] + 0.5) / 64;
  return out;
})();
const bayer = (col: number, row: number) => BAYER8[((row & 7) << 3) | (col & 7)];

const SPECTRAL_DARK: Rgb[] = [
  [255, 132, 28],
  [255, 48, 108],
  [230, 68, 245],
  [98, 118, 255],
  [32, 198, 255],
  [28, 234, 172],
  [250, 202, 42],
];

const SPECTRAL_LIGHT: Rgb[] = [
  [222, 88, 12],
  [218, 24, 84],
  [176, 32, 212],
  [66, 78, 228],
  [6, 140, 218],
  [8, 162, 116],
  [208, 142, 10],
];

const THINK_DARK: Rgb[] = [
  [28, 228, 248],
  [76, 184, 255],
  [136, 148, 255],
  [198, 112, 248],
  [238, 96, 180],
  [76, 184, 255],
];

const THINK_LIGHT: Rgb[] = [
  [6, 152, 186],
  [24, 120, 222],
  [88, 88, 226],
  [152, 62, 214],
  [196, 44, 136],
  [24, 120, 222],
];

const EMBER_DARK: Rgb = [255, 104, 34];
const EMBER_LIGHT: Rgb = [226, 64, 18];

const SPAWN_SPRING = { stiffness: 155, damping: 20 };
const DISMISS_SPRING = { stiffness: 265, damping: 28 };
const MOOD_SPRING = { stiffness: 70, damping: 16 };
const LEVEL_SPRING = { stiffness: 145, damping: 20 };

/** A word's cells: flight, hold on landing, Bayer dissolve (s). */
const GRAIN_FLY = 0.42;
const GRAIN_SPREAD = 0.16;
const GRAIN_HOLD = 0.16;
const GRAIN_FADE = 0.34;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v: number) => (Number.isFinite(v) ? clamp(v, 0, 1) : 0);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const IS_LE = (() => {
  const b = new ArrayBuffer(4);
  new Uint32Array(b)[0] = 0x0a0b0c0d;
  return new Uint8Array(b)[0] === 0x0d;
})();

function packRgba(r: number, g: number, b: number, a: number): number {
  const ri = r < 0 ? 0 : r > 255 ? 255 : r | 0;
  const gi = g < 0 ? 0 : g > 255 ? 255 : g | 0;
  const bi = b < 0 ? 0 : b > 255 ? 255 : b | 0;
  const ai = a < 0 ? 0 : a > 255 ? 255 : a | 0;
  return IS_LE ? ((ai << 24) | (bi << 16) | (gi << 8) | ri) >>> 0 : ((ri << 24) | (gi << 16) | (bi << 8) | ai) >>> 0;
}

function sampleStops(stops: readonly Rgb[], pos: number, out: Rgb): Rgb {
  const n = stops.length;
  if (n === 0) {
    out[0] = 56;
    out[1] = 189;
    out[2] = 248;
    return out;
  }
  if (n === 1) {
    out[0] = stops[0][0];
    out[1] = stops[0][1];
    out[2] = stops[0][2];
    return out;
  }
  const wrapped = ((pos % 1) + 1) % 1;
  const scaled = wrapped * n;
  const i0 = Math.floor(scaled) % n;
  const i1 = (i0 + 1) % n;
  const f = scaled - Math.floor(scaled);
  const a = stops[i0];
  const b = stops[i1];
  out[0] = a[0] + (b[0] - a[0]) * f;
  out[1] = a[1] + (b[1] - a[1]) * f;
  out[2] = a[2] + (b[2] - a[2]) * f;
  return out;
}

let swatchCtx: CanvasRenderingContext2D | null = null;
function cssToRgb(host: Element, cssColor: string, fallback: Rgb): Rgb {
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = cssColor;
  host.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  if (/^rgba?\(/.test(resolved)) {
    const m = resolved.match(/[\d.]+/g)?.map(Number);
    if (m && m.length >= 3) return [m[0], m[1], m[2]];
  }
  if (!swatchCtx) {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    swatchCtx = c.getContext("2d", { willReadFrequently: true });
  }
  if (swatchCtx) {
    swatchCtx.clearRect(0, 0, 1, 1);
    swatchCtx.fillStyle = "#808080";
    swatchCtx.fillStyle = resolved;
    swatchCtx.fillRect(0, 0, 1, 1);
    const d = swatchCtx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  return fallback;
}

function detectLightSurface(el: Element | null): boolean {
  if (!el) return false;
  const rgb = cssToRgb(el, getComputedStyle(el).color, [240, 240, 240]);
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  return lum < 0.52;
}

function resolvePalette(host: Element, palette: DitherHorizonPalette, colors: readonly string[] | undefined, isLight: boolean): Rgb[] {
  if (colors && colors.length > 0) {
    return colors.map((c, i) => cssToRgb(host, c, SPECTRAL_DARK[i % SPECTRAL_DARK.length]));
  }
  if (palette === "theme") {
    const vars = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
    const resolved = vars.map((v, i) => cssToRgb(host, v, SPECTRAL_DARK[i % SPECTRAL_DARK.length]));
    const spread = resolved.reduce((acc, c, i) => {
      const next = resolved[(i + 1) % resolved.length];
      return acc + Math.abs(c[0] - next[0]) + Math.abs(c[1] - next[1]) + Math.abs(c[2] - next[2]);
    }, 0);
    if (spread < 30) {
      const p = cssToRgb(host, "var(--primary)", [48, 93, 222]);
      return [p, [56, 189, 248], [168, 85, 247], [244, 63, 94], p];
    }
    return resolved;
  }
  return isLight ? SPECTRAL_LIGHT : SPECTRAL_DARK;
}

/** Organic syllable-like speech stand-in when no microphone level/spectrum is supplied. */
function speechFallback(t: number, out: Float32Array): number {
  const phrase = 0.5 + 0.5 * Math.sin(t * 1.02 + Math.sin(t * 0.41) * 1.2);
  const pause = phrase < 0.14 ? 0.24 : 1;
  const syll = Math.pow(Math.max(0, Math.sin(t * 5.6 + Math.sin(t * 1.85) * 2.1)), 1.35);
  const lv = clamp01((0.28 + 0.62 * syll * (0.55 + 0.45 * phrase)) * pause);
  const formant = 2.4 + Math.sin(t * 2.0) * 1.6;
  const sibilant = Math.sin(t * 3.6 + 0.8) > 0.72 ? 0.75 : 0;
  for (let b = 0; b < BANDS; b++) {
    const bell = Math.exp(-((b - formant) ** 2) / 3.8);
    const wave = 0.5 + 0.5 * Math.sin(t * 4.1 + b * 1.35);
    out[b] = clamp01(lv * (0.45 + 0.75 * bell + (b > 5 ? sibilant * 0.55 : 0)) * (0.65 + 0.35 * wave));
  }
  return lv;
}

/**
 * An element's box in the canvas's own CSS px, from layout offsets: unaffected by any CSS transform on the page, a zoomed
 * container or the element's own entrance. Null when the element isn't laid out inside the canvas's positioned parent.
 */
function boxWithin(el: HTMLElement, canvas: HTMLCanvasElement) {
  const root = canvas.offsetParent;
  let x = 0;
  let y = 0;
  let node: Element | null = el;
  while (node && node !== root) {
    if (!(node instanceof HTMLElement)) return null;
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  if (!node || !el.offsetWidth) return null;
  return { left: x - canvas.offsetLeft, top: y - canvas.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
}

function quadPoint(sx: number, sy: number, cx: number, cy: number, ex: number, ey: number, t: number, out: [number, number]) {
  const it = 1 - t;
  out[0] = it * it * sx + 2 * it * t * cx + t * t * ex;
  out[1] = it * it * sy + 2 * it * t * cy + t * t * ey;
  return out;
}

export function DitherHorizon({
  ref,
  state = "idle",
  muted = false,
  getLevel,
  getSpectrum,
  level,
  originRef,
  pointerRef,
  shape = "bar",
  palette = "spectral",
  colors,
  interactive = true,
  cellSize = 2.5,
  className = "",
  ...props
}: DitherHorizonProps) {
  const reduced = useInteractionReducedMotion();
  const { ref: canvasRef, active: onScreen } = useInteractionActivity<HTMLCanvasElement>();
  const colorsKey = colors?.join("|") ?? "";

  const inputRef = React.useRef({ state, muted, getLevel, getSpectrum, level, shape, interactive, cellSize, reduced });
  React.useLayoutEffect(() => {
    inputRef.current = { state, muted, getLevel, getSpectrum, level, shape, interactive, cellSize, reduced };
  });

  const engineRef = React.useRef<{
    firePulse: (opts?: DitherHorizonPulseOptions) => void;
    condense: (el: HTMLElement) => number;
    triggerTransition: (prev: DitherHorizonState, next: DitherHorizonState) => void;
    stepAndDraw: (dt: number) => boolean;
    wake: () => void;
    springs: Record<"active" | "listen" | "think" | "speak" | "mute" | "level", ReturnType<typeof createSpring>>;
    clearParticles: () => void;
    lastState: DitherHorizonState;
  } | null>(null);

  const rafRef = React.useRef(0);
  const runningRef = React.useRef(false);
  const wakeRef = React.useRef<() => void>(() => {});

  React.useImperativeHandle(
    ref,
    () => ({
      pulse(opts) {
        engineRef.current?.firePulse(opts);
      },
      condense(el) {
        return engineRef.current?.condense(el) ?? 0;
      },
    }),
    [],
  );

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // The lattice: one ImageData cell per grid cell, scaled up by a whole number of device pixels with no smoothing.
    const gridCanvas = document.createElement("canvas");
    const gridCtx = gridCanvas.getContext("2d");
    if (!gridCtx) return;
    let gridImg: ImageData | null = null;
    let gridU32 = new Uint32Array(0);
    // 16×2 strip stretched with bilinear filtering: the soft wash under the cells, in one drawImage.
    const BLOOM_W = 16;
    const bloomCanvas = document.createElement("canvas");
    bloomCanvas.width = BLOOM_W;
    bloomCanvas.height = 2;
    const bloomCtx = bloomCanvas.getContext("2d");
    const bloomImg = bloomCtx?.createImageData(BLOOM_W, 2) ?? null;
    const bloomU32 = bloomImg ? new Uint32Array(bloomImg.data.buffer) : null;
    let frameLevel = new Uint8Array(0); // what each cell got this frame (0 = off), so a word's cells draw over the wave
    let cols = 0;
    let rows = 0;
    let cellPx = 6; // device px
    let offY = 0; // device px: the grid sits on the canvas's bottom edge
    let cellCss = 3;

    const layoutGrid = () => {
      const raw = clamp(inputRef.current.cellSize, 2, 6);
      cellPx = Math.max(2, Math.round(raw * dpr));
      cellCss = cellPx / dpr;
      const nc = Math.max(1, Math.ceil(canvas.width / cellPx));
      const nr = Math.max(1, Math.ceil(canvas.height / cellPx));
      offY = canvas.height - nr * cellPx;
      if (nc === cols && nr === rows && gridImg) return;
      cols = nc;
      rows = nr;
      gridCanvas.width = cols;
      gridCanvas.height = rows;
      gridImg = gridCtx.createImageData(cols, rows);
      gridU32 = new Uint32Array(gridImg.data.buffer);
      frameLevel = new Uint8Array(cols * rows);
    };

    const quiet = () => {};
    const initState = inputRef.current.state;
    const isInitActive = initState !== "idle";
    const springs = {
      active: createSpring(isInitActive ? 1 : 0, SPAWN_SPRING, quiet, 0.002),
      listen: createSpring(initState === "listening" ? 1 : 0, MOOD_SPRING, quiet, 0.002),
      think: createSpring(initState === "thinking" ? 1 : 0, MOOD_SPRING, quiet, 0.002),
      speak: createSpring(initState === "speaking" ? 1 : 0, MOOD_SPRING, quiet, 0.002),
      mute: createSpring(inputRef.current.muted ? 1 : 0, MOOD_SPRING, quiet, 0.002),
      level: createSpring(0.45, LEVEL_SPRING, quiet, 0.002),
    };

    const tempA: Rgb = [0, 0, 0];
    const tempB: Rgb = [0, 0, 0];
    const cellRgb: Rgb = [0, 0, 0];
    const pt: [number, number] = [0, 0];
    const fallbackBands = new Float32Array(BANDS);
    let colHeights = new Float32Array(0);
    let colBoost = new Float32Array(0);
    let colTint = new Float32Array(0);
    let colTintR = new Float32Array(0);
    let colTintG = new Float32Array(0);
    let colTintB = new Float32Array(0);

    let w = 0; // CSS px
    let h = 0;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let isLight = false;
    let stops: Rgb[] = SPECTRAL_DARK;
    let thinkStops: Rgb[] = THINK_DARK;
    let originX = 0;
    let originY = 0;
    let time = 2.1;
    let colorPhase = 0.4;
    let thinkPhase = 0.6;
    let ignite = isInitActive ? 1 : 0;
    let igniteOriginU = 0.88;
    let recentLv = 0;
    let lastOnset = -5;
    let emberClock = 0;
    const bands = new Float32Array(BANDS);
    let comets: Comet[] = [];
    const embers: Ember[] = [];
    const pulses: PulseWave[] = [];
    let grains: Grain[] = [];
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, on: 0, target: 0, speed: 0 };

    // The three tones of a colour: dim (the colour, see-through), colour, and the hot core (toward white on dark, deeper ink on light).
    const tones = (rgb: Rgb, out: Uint32Array, i: number, dimOut: Uint32Array, topOut: Uint32Array) => {
      dimOut[i] = packRgba(rgb[0], rgb[1], rgb[2], isLight ? 108 : 118);
      out[i] = packRgba(rgb[0], rgb[1], rgb[2], 255);
      topOut[i] = isLight
        ? packRgba(rgb[0] * 0.7, rgb[1] * 0.7, rgb[2] * 0.7, 255)
        : packRgba(lerp(rgb[0], 255, 0.62), lerp(rgb[1], 255, 0.62), lerp(rgb[2], 255, 0.62), 255);
    };
    const one = { dim: new Uint32Array(1), mid: new Uint32Array(1), top: new Uint32Array(1) };
    const toneOf = (rgb: Rgb, level: number) => {
      tones(rgb, one.mid, 0, one.dim, one.top);
      return level >= 3 ? one.top[0] : level === 2 ? one.mid[0] : one.dim[0];
    };

    /** Write a cell if it is brighter than what's there this frame. */
    const plot = (col: number, row: number, level: number, color: number) => {
      if (col < 0 || row < 0 || col >= cols || row >= rows || level <= 0) return;
      const i = row * cols + col;
      if (frameLevel[i] >= level) return;
      frameLevel[i] = level;
      gridU32[i] = color;
    };
    /** CSS px → lattice cell. */
    const colAt = (x: number) => Math.floor((x * dpr) / cellPx);
    const rowAt = (y: number) => Math.floor((y * dpr - offY) / cellPx);

    const measureOrigin = () => {
      if (w <= 0 || h <= 0) return;
      const originEl = originRef?.current;
      const box = originEl ? boxWithin(originEl, canvas) : null;
      if (box) {
        originX = clamp(box.left + box.width * 0.5, 12, w - 12);
        originY = clamp(box.top + box.height * 0.5, 12, h - 12);
        return;
      }
      originX = Math.max(16, w - 34);
      originY = Math.max(16, h - 32);
    };

    const refreshTheme = () => {
      const host = canvas.parentElement ?? canvas;
      isLight = detectLightSurface(host);
      stops = resolvePalette(host, palette, colorsKey ? colorsKey.split("|") : undefined, isLight);
      thinkStops = isLight ? THINK_LIGHT : THINK_DARK;
    };

    const liveColor = (u: number, wThink: number, scanU: number, out: Rgb): Rgb => {
      const phase = u * 1.45 - colorPhase * 0.22 + 0.05 * Math.sin(u * 7.5 + time * 0.6);
      sampleStops(stops, phase, tempA);
      if (wThink > 0.01) {
        sampleStops(thinkStops, (u - scanU) * 0.92 + 0.35 - colorPhase * 0.12, tempB);
        out[0] = lerp(tempA[0], tempB[0], wThink);
        out[1] = lerp(tempA[1], tempB[1], wThink);
        out[2] = lerp(tempA[2], tempB[2], wThink);
      } else {
        out[0] = tempA[0];
        out[1] = tempA[1];
        out[2] = tempA[2];
      }
      return out;
    };

    const eng: NonNullable<typeof engineRef.current> = {
      springs,
      lastState: initState,

      clearParticles() {
        comets = [];
        embers.length = 0;
        pulses.length = 0;
        grains = [];
      },

      firePulse(opts = {}) {
        if (inputRef.current.reduced || w <= 0 || h <= 0) return;
        const kind = opts.kind ?? "ripple";
        const strength = clamp(opts.strength ?? 0.85, 0.2, 1.4);
        let originU = 0.5;
        let ox = w * 0.5;
        let oy = h - 24;
        if (typeof opts.origin === "number") {
          originU = clamp01(opts.origin);
          ox = originU * w;
          oy = h - 6;
        } else if (opts.origin instanceof HTMLElement) {
          const box = boxWithin(opts.origin, canvas);
          if (box) {
            ox = clamp(box.left + box.width * 0.5, 10, w - 10);
            oy = clamp(box.top + box.height * 0.5, 10, h - 10);
            originU = clamp01(ox / w);
          }
        }
        const host = canvas.parentElement ?? canvas;
        const rgb = opts.color ? cssToRgb(host, opts.color, stops[0]) : null;
        const life = kind === "spark" ? 0.34 : kind === "wipe" ? 0.55 : 0.72;
        if (pulses.length > 10) pulses.shift();
        pulses.push({ kind, originU, age: 0, life, strength, rgb });

        // Action ripples (attach, mode switch) throw a few cell comets out of that control along the rim.
        if (kind === "ripple") {
          const dir = originU < 0.5 ? 1 : -1;
          for (let i = 0; i < 7; i++) {
            const reach = (0.14 + (i / 6) * 0.42 + Math.random() * 0.08) * dir;
            const targetU = clamp(originU + reach, 0.05, 0.95);
            const ex = targetU * w;
            const ey = h - 2 - Math.random() * 10;
            const sx = ox + (Math.random() - 0.5) * 10;
            const sy = oy + (Math.random() - 0.5) * 8;
            const cRgb: Rgb = rgb ? [rgb[0], rgb[1], rgb[2]] : [0, 0, 0];
            if (!rgb) sampleStops(stops, targetU * 1.4 - colorPhase * 0.22, cRgb);
            comets.push({ mode: "burst", sx, sy, cx: lerp(sx, ex, 0.38), cy: h - 1, ex, ey, age: 0, delay: i * 0.015, life: 0.28 + Math.random() * 0.16, size: 2.5 + Math.random() * 0.9, rgb: cRgb });
          }
        }
        eng.wake();
      },

      condense(el) {
        if (inputRef.current.reduced || w <= 0 || h <= 0 || cols === 0) return 0;
        const text = el.textContent?.trim();
        if (!text) return 0;
        // Where the word rests in layout (offsets ignore its entrance and any zoom or tilt on the page).
        const r = boxWithin(el, canvas);
        if (!r || r.width <= 0 || r.height <= 0) return 0;
        const left = r.left;
        const top = r.top;
        // Rasterise the word on the lattice itself: one mask pixel per cell.
        const c0 = colAt(left);
        const r0 = rowAt(top);
        const mw = Math.max(1, Math.ceil((left + r.width) * dpr / cellPx) - c0 + 1);
        const mh = Math.max(1, Math.ceil(((top + r.height) * dpr - offY) / cellPx) - r0 + 1);
        const mask = document.createElement("canvas");
        mask.width = mw;
        mask.height = mh;
        const mctx = mask.getContext("2d", { willReadFrequently: true });
        if (!mctx) return 0;
        const cs = getComputedStyle(el);
        const scale = 1 / cellCss;
        mctx.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * scale}px ${cs.fontFamily}`;
        mctx.textBaseline = "middle";
        mctx.fillStyle = "#000";
        // Where the word's box starts inside its first cell, in mask px.
        const fx = (left * dpr) / cellPx - c0;
        const fy = ((top * dpr - offY) / cellPx - r0);
        mctx.fillText(text, fx, fy + (r.height * scale) / 2);
        const data = mctx.getImageData(0, 0, mw, mh).data;
        const sym = Math.abs(clamp01((left + r.width / 2) / w) - 0.5);
        const added: Grain[] = [];
        for (let y = 0; y < mh; y++) {
          for (let x = 0; x < mw; x++) {
            if (data[(y * mw + x) * 4 + 3] < 96) continue;
            const col = c0 + x;
            const row = r0 + y;
            const tx = ((col + 0.5) * cellPx) / dpr;
            // Each cell starts on the wave, a little to either side of where it will land, and rises to it.
            const sx = clamp(tx + (Math.random() - 0.5) * 64, 4, w - 4);
            const sy = h - 3 - Math.random() * Math.min(26, h * 0.25);
            const ty = ((row + 0.5) * cellPx + offY) / dpr;
            const rgb: Rgb = [0, 0, 0];
            sampleStops(stops, (sx / w) * 1.45 - colorPhase * 0.22 + sym * 0.1, rgb);
            added.push({ col, row, sx, sy, cx: lerp(sx, tx, 0.7), cy: Math.min(sy, ty) - 14 - Math.random() * 18, age: 0, delay: (x / Math.max(1, mw)) * GRAIN_SPREAD + Math.random() * 0.05, fly: GRAIN_FLY * (0.8 + Math.random() * 0.4), rgb });
          }
        }
        if (grains.length + added.length > 1400) grains.splice(0, grains.length + added.length - 1400);
        grains.push(...added);
        eng.wake();
        return Math.round((GRAIN_SPREAD + GRAIN_FLY) * 1000);
      },

      triggerTransition(prev, next) {
        if (w <= 0 || h <= 0) return;
        measureOrigin();
        const ox = originX;
        const oy = originY;
        const origU = clamp01(ox / w);

        // SPAWN: idle -> active. Cell comets burst out of the button and light the field.
        if (prev === "idle" && next !== "idle") {
          ignite = 0;
          igniteOriginU = origU;
          comets = comets.filter((c) => c.mode !== "dismiss");
          const count = Math.min(28, Math.max(16, Math.round(w / 20)));
          const st = next === "thinking" ? thinkStops : stops;
          for (let i = 0; i < count; i++) {
            const frac = (i + 0.3 + Math.random() * 0.4) / count;
            const targetU = clamp(0.05 + frac * 0.88, 0.04, 0.95);
            const ex = targetU * w;
            const ey = h - 2 - Math.random() * 12;
            const sx = ox + (Math.random() - 0.5) * 12;
            const sy = oy + (Math.random() - 0.5) * 10;
            const rgb: Rgb = [0, 0, 0];
            sampleStops(st, targetU * 1.35 - colorPhase * 0.22, rgb);
            comets.push({
              mode: "spawn",
              sx,
              sy,
              cx: lerp(sx, ex, 0.34) - (sx - ex) * 0.06,
              cy: h - 1 + Math.random() * 4,
              ex,
              ey,
              age: 0,
              delay: (1 - targetU) * 0.08 + Math.random() * 0.06,
              life: 0.34 + Math.abs(origU - targetU) * 0.26 + Math.random() * 0.07,
              size: 2.6 + Math.random() * 1.1,
              rgb,
            });
          }
        }

        // DISMISS: active -> idle. The wave breaks into cell comets drawn back into the button.
        if (prev !== "idle" && next === "idle") {
          comets = comets.filter((c) => c.mode !== "spawn");
          grains = [];
          const count = Math.min(32, Math.max(18, Math.round(w / 17)));
          const st = springs.think.get() > 0.5 ? thinkStops : stops;
          const peakH = inputRef.current.shape === "card" ? Math.min(h * 0.38, 66) : Math.min(h * 0.42, 46);
          for (let i = 0; i < count; i++) {
            const u = clamp(0.06 + (i / Math.max(1, count - 1)) * 0.8 + (Math.random() - 0.5) * 0.05, 0.04, 0.9);
            const sx = u * w;
            const sy = h - 2.5 - Math.random() * peakH * (0.25 + 0.75 * Math.sin(Math.PI * u));
            const ex = ox + (Math.random() - 0.5) * 8;
            const ey = oy + (Math.random() - 0.5) * 8;
            const rgb: Rgb = [0, 0, 0];
            sampleStops(st, u * 1.35 - colorPhase * 0.22, rgb);
            comets.push({ mode: "dismiss", sx, sy, cx: lerp(sx, ex, 0.75), cy: h - 2 - Math.random() * 7, ex, ey, age: 0, delay: (1 - u) * 0.055 + Math.random() * 0.075, life: 0.34 + (1 - u) * 0.2 + Math.random() * 0.07, size: 2.6 + Math.random() * 1.1, rgb });
          }
        }
      },

      stepAndDraw(dt) {
        if (w <= 0 || h <= 0) return false;
        layoutGrid();
        const { state: s, muted: isMuted, getLevel: readLevel, getSpectrum: readSpec, level: scalarLevel, shape: sh, interactive: canHover } = inputRef.current;

        const wActive = clamp01(springs.active.get());
        const wListen = clamp01(springs.listen.get());
        const wThink = clamp01(springs.think.get());
        const wSpeak = clamp01(springs.speak.get());
        const wMute = clamp01(springs.mute.get());

        time += dt;
        colorPhase += dt * (0.42 + 0.38 * wListen + 0.52 * wSpeak + 0.72 * wThink);
        thinkPhase += dt * (1.82 + 1.05 * wThink);
        if (s !== "idle" && ignite < 1) ignite = Math.min(1, ignite + dt / 0.5);

        const voiced = (s === "listening" && !isMuted) || s === "speaking";
        let targetLv = 0;
        if (voiced) {
          if (readLevel) targetLv = clamp01(readLevel());
          else if (scalarLevel !== undefined) targetLv = clamp01(scalarLevel);
          else targetLv = speechFallback(time + (s === "speaking" ? 2.4 : 0), fallbackBands);
        }
        springs.level.set(targetLv);
        const lv = clamp01(springs.level.get());

        // A clear spoken syllable sends a ripple outward across the cells.
        if (voiced && dt > 0 && lv - recentLv > 0.16 && lv > 0.42 && time - lastOnset > 0.65) {
          lastOnset = time;
          if (pulses.length < 8) pulses.push({ kind: "wipe", originU: 0.5 + (Math.random() - 0.5) * 0.24, age: 0, life: 0.68, strength: 0.42, rgb: null });
        }
        recentLv += (lv - recentLv) * (1 - Math.exp(-dt * 4.5));

        const riseRate = 1 - Math.exp(-dt * 12);
        const fallRate = 1 - Math.exp(-dt * 3.4);
        for (let b = 0; b < BANDS; b++) {
          let v = 0;
          if (voiced && readSpec) {
            const got = readSpec();
            v = clamp01(got[Math.floor((b * got.length) / BANDS)] ?? 0);
          } else if (voiced && readLevel === undefined && scalarLevel === undefined) v = fallbackBands[b];
          else if (voiced) v = clamp01(lv * (0.55 + 0.45 * Math.sin(time * 4.8 + b * 1.5)));
          bands[b] += (v - bands[b]) * (v > bands[b] ? riseRate : fallRate);
        }

        if (pulses.length > 0 && dt > 0) {
          let pw = 0;
          for (let i = 0; i < pulses.length; i++) {
            const p = pulses[i];
            p.age += dt;
            if (p.age < p.life) pulses[pw++] = p;
          }
          pulses.length = pw;
        }

        const ptrSmooth = 1 - Math.exp(-dt * 14);
        const px0 = ptr.x;
        const py0 = ptr.y;
        ptr.x += (ptr.tx - ptr.x) * ptrSmooth;
        ptr.y += (ptr.ty - ptr.y) * ptrSmooth;
        ptr.on += (ptr.target - ptr.on) * (1 - Math.exp(-dt * 7));
        ptr.speed = dt > 0 ? Math.hypot(ptr.x - px0, ptr.y - py0) / dt : 0;

        gridU32.fill(0);
        frameLevel.fill(0);

        const isCard = sh === "card";
        const maxH = isCard ? Math.min(h * 0.42, 78) : Math.min(h * 0.56, 62);
        if (colHeights.length !== cols) {
          colHeights = new Float32Array(cols);
          colBoost = new Float32Array(cols);
          colTint = new Float32Array(cols);
          colTintR = new Float32Array(cols);
          colTintG = new Float32Array(cols);
          colTintB = new Float32Array(cols);
        }

        const hasField = wActive > 0.004 || pulses.length > 0;
        const t = time;
        const ptrU = clamp01(ptr.x / Math.max(1, w));
        const ptrBoost = canHover ? ptr.on * wActive * (1 - wMute * 0.72) : 0;
        const scanU = 0.5 + 0.44 * Math.sin(thinkPhase);
        const scanDir = Math.cos(thinkPhase) >= 0 ? 1 : -1;
        const muteRowH = cellCss * (1.5 + 0.4 * Math.sin(t * 1.6)); // the folded, breathing dotted row
        const muteMix = wMute * wListen;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        if (hasField) {
          for (let c = 0; c < cols; c++) {
            const u = (c + 0.5) / cols;
            const taper = isCard ? Math.pow(Math.sin(Math.PI * u), 1.45) : Math.pow(Math.sin(Math.PI * u), 0.52);
            const distFromOrigin = Math.abs(u - igniteOriginU);
            const ign = wActive > 0.004 ? smoothstep(distFromOrigin - 0.14, distFromOrigin + 0.08, ignite * 1.18) : 0;

            let pHeight = 0;
            let pBoost = 0;
            let pTint = 0;
            let pR = 0;
            let pG = 0;
            let pB = 0;
            for (let pi = 0; pi < pulses.length; pi++) {
              const p = pulses[pi];
              const k = p.age / p.life;
              const env = Math.sin(Math.PI * Math.pow(k, 0.65));
              if (p.kind === "spark") {
                const d = (u - p.originU) / (0.065 + 0.12 * k);
                const g = Math.exp(-d * d) * env * p.strength;
                pHeight += g * 16;
                pBoost += g * 0.55;
              } else {
                const d = (Math.abs(u - p.originU) - k * 1.05) / (p.kind === "wipe" ? 0.11 : 0.085);
                const ring = Math.exp(-d * d) * env * p.strength;
                pHeight += ring * (p.kind === "ripple" ? 26 : 16);
                pBoost += ring * 0.6;
                if (p.rgb && ring > 0.02) {
                  pTint = Math.min(1, pTint + ring * 0.78);
                  pR = p.rgb[0];
                  pG = p.rgb[1];
                  pB = p.rgb[2];
                }
              }
            }
            colBoost[c] = pBoost;
            colTint[c] = pTint;
            colTintR[c] = pR;
            colTintG[c] = pG;
            colTintB[c] = pB;

            let baseH = 0;
            if (wActive > 0.004) {
              const sym = Math.abs(u - 0.5) * 2;
              const bandVal = bands[clamp(Math.floor(sym * (BANDS - 1)), 0, BANDS - 1)];
              const centerDome = Math.exp(-((u - 0.5) ** 2) / (isCard ? 0.056 : 0.105));
              const peakA = Math.exp(-((u - (0.31 + 0.11 * Math.sin(t * 0.9))) ** 2) / 0.022);
              const peakB = Math.exp(-((u - (0.65 + 0.1 * Math.cos(t * 0.78))) ** 2) / 0.024);
              const harmonic = 0.5 + 0.5 * Math.sin(u * 14 - t * 3.1) * Math.cos(u * 7.5 + t * 2.1);
              const listenLive = (0.18 + 0.46 * centerDome + 0.24 * peakA + 0.22 * peakB + 0.16 * harmonic) * (0.45 + 0.7 * (0.55 * lv + 0.45 * bandVal));
              const hListen = lerp(listenLive, muteRowH / maxH, wMute);

              const dx = u - scanU;
              const scanner = Math.tanh(Math.exp(-(dx * dx) / 0.07) * 1.45);
              const behind = -dx * scanDir;
              const trail = behind > 0 ? Math.exp(-behind / 0.36) * 0.34 : 0;
              const floor = 0.11 + 0.05 * (0.5 + 0.5 * Math.sin(u * 22 - t * 3.8));
              const hThink = clamp01((floor + 0.54 * scanner + trail) * 0.86);

              const speakDome = Math.exp(-((u - 0.5) ** 2) / (isCard ? 0.048 : 0.082));
              const speakRipple = 0.13 * (0.5 + 0.5 * Math.sin(u * 16 + t * 3.8));
              const hSpeak = clamp01((0.2 + 0.74 * speakDome + speakRipple) * (0.48 + 0.65 * (0.6 * lv + 0.4 * bandVal)));

              const totalW = Math.max(0.001, wListen + wThink + wSpeak);
              let hNorm = (hListen * wListen + hThink * wThink + hSpeak * wSpeak) / totalW;
              if (ptrBoost > 0.01) {
                const pDist = u - ptrU;
                hNorm += 0.28 * ptrBoost * Math.exp(-(pDist * pDist) / 0.016);
              }
              // A muted row runs the full width (no taper), so it reads as a dotted line, not a hump.
              baseH = clamp(hNorm, 0, 1.14) * maxH * lerp(taper, 1, muteMix) * wActive * ign;
            }
            colHeights[c] = Math.min(maxH * 1.3, baseH + pHeight * (0.35 + 0.65 * taper));
          }

          // LAYER 1: the soft horizon wash, one bilinear drawImage of a 16×2 strip.
          if (bloomCtx && bloomImg && bloomU32) {
            bloomU32.fill(0);
            for (let i = 0; i < BLOOM_W; i++) {
              const u = (i + 0.5) / BLOOM_W;
              const ch = colHeights[clamp(Math.floor(u * cols), 0, cols - 1)];
              if (ch < 2) continue;
              liveColor(u, wThink, scanU, cellRgb);
              const alpha = (isLight ? 0.09 : 0.24) * clamp01(ch / (maxH * 0.52)) * (1 - 0.6 * muteMix);
              bloomU32[BLOOM_W + i] = packRgba(cellRgb[0], cellRgb[1], cellRgb[2], alpha * 255);
            }
            bloomCtx.putImageData(bloomImg, 0, 0);
            const washH = Math.max(24, maxH * 1.15);
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.globalCompositeOperation = isLight ? "source-over" : "lighter";
            ctx.drawImage(bloomCanvas, 0, h - washH, w, washH + 2);
            ctx.restore();
          }

          // LAYER 2: the 1.5px rim along the bottom edge, faded out before the corners so it never pokes past them.
          if (muteMix < 0.5) {
            const rimGrad = ctx.createLinearGradient(0, 0, w, 0);
            for (let i = 0; i <= 8; i++) {
              const u = i / 8;
              const strength = clamp01(colHeights[clamp(Math.floor(u * (cols - 1)), 0, cols - 1)] / (maxH * 0.25)) * smoothstep(0, 0.1, u) * smoothstep(1, 0.9, u);
              liveColor(u, wThink, scanU, cellRgb);
              const a = (isLight ? 0.36 : 0.76) * strength * (1 - muteMix * 2);
              rimGrad.addColorStop(u, `rgba(${cellRgb[0] | 0},${cellRgb[1] | 0},${cellRgb[2] | 0},${a.toFixed(3)})`);
            }
            ctx.fillStyle = rimGrad;
            ctx.fillRect(0, h - 1.5, w, 1.5);
          }

          // LAYER 3: the ordered 8×8 Bayer field. Each column's cells from the bottom up: lit where its energy clears the
          // Bayer threshold, so density falls from a fused base through checkerboards (the dark holes) into single grains.
          const breath = 0.5 + 0.06 * Math.sin(t * 1.6); // the muted row: about every other cell lit, breathing
          for (let c = 0; c < cols; c++) {
            const ch = colHeights[c];
            if (ch < 1.2) continue;
            const u = (c + 0.5) / cols;
            liveColor(u, wThink, scanU, cellRgb);
            const pTint = colTint[c];
            if (pTint > 0.01) {
              cellRgb[0] = lerp(cellRgb[0], colTintR[c], pTint);
              cellRgb[1] = lerp(cellRgb[1], colTintG[c], pTint);
              cellRgb[2] = lerp(cellRgb[2], colTintB[c], pTint);
            }
            const pBoost = colBoost[c];
            const scan = wThink > 0.01 ? wThink * Math.exp(-((u - scanU) ** 2) / 0.012) : 0;
            const maxR = Math.min(rows, Math.ceil((ch + cellCss) / cellCss));
            for (let r = 0; r < maxR; r++) {
              const v = ((r + 0.35) * cellCss) / Math.max(cellCss, ch);
              if (v >= 1.04) break;
              const baseE = Math.pow(clamp01(1 - v), 1.22);
              const shimmer = 0.035 * Math.sin(c * 0.65 + r * 1.15 - t * 5.6);
              let energy = clamp01(baseE + pBoost * 0.22 * (1 - v * 0.4) + scan * 0.18 * (1 - v) + shimmer * (1 - baseE * 0.6));
              if (muteMix > 0.01) energy = lerp(energy, r === 0 ? breath + pBoost * 0.3 : 0, muteMix);

              const threshold = BAYER8[((r & 7) << 3) | (c & 7)];
              const hit = clamp01((energy - threshold + 0.035) / 0.075);
              if (hit <= 0.02) continue;

              let cr = cellRgb[0];
              let cg = cellRgb[1];
              let cb = cellRgb[2];
              if (!isLight) {
                // White-hot where the cells fuse along the base, plus a glint on a passing wavefront.
                const hot = (Math.pow(clamp01((energy - 0.5) / 0.5), 1.35) * (0.72 - 0.08 * wThink) + pBoost * 0.32 * (1 - v * 0.5)) * (1 - muteMix);
                if (hot > 0.005) {
                  const k = Math.min(0.86, hot);
                  cr = lerp(cr, 255, k);
                  cg = lerp(cg, 255, k);
                  cb = lerp(cb, 255, k);
                }
              } else {
                // Deeper ink where the cells fuse on light surfaces.
                const deep = Math.pow(clamp01((energy - 0.58) / 0.42), 1.15) * 0.2 * (1 - muteMix);
                if (deep > 0.005) {
                  cr *= 1 - deep;
                  cg *= 1 - deep;
                  cb *= 1 - deep;
                }
              }
              const alpha = hit * (isLight ? 0.94 : 0.98) * (0.55 + 0.45 * Math.pow(energy, 0.38));
              const i = (rows - 1 - r) * cols + c;
              gridU32[i] = packRgba(cr, cg, cb, alpha * 255);
              frameLevel[i] = 1;
            }
          }
        }

        // A word's cells: rise from the wave, land in the word's shape, hold, then switch off in Bayer order.
        if (grains.length > 0) {
          let write = 0;
          for (let i = 0; i < grains.length; i++) {
            const g = grains[i];
            g.age += dt;
            const tl = g.age - g.delay;
            if (tl < 0) {
              grains[write++] = g;
              continue;
            }
            if (tl < g.fly) {
              const k = 1 - Math.pow(1 - tl / g.fly, 3);
              const tx = ((g.col + 0.5) * cellPx) / dpr;
              const ty = ((g.row + 0.5) * cellPx + offY) / dpr;
              quadPoint(g.sx, g.sy, g.cx, g.cy, tx, ty, k, pt);
              plot(colAt(pt[0]), rowAt(pt[1]), 3, toneOf(g.rgb, 3));
              quadPoint(g.sx, g.sy, g.cx, g.cy, tx, ty, Math.max(0, k - 0.12), pt);
              plot(colAt(pt[0]), rowAt(pt[1]), 2, toneOf(g.rgb, 1));
              grains[write++] = g;
              continue;
            }
            const after = tl - g.fly;
            if (after >= GRAIN_HOLD + GRAIN_FADE) continue;
            const fade = after < GRAIN_HOLD ? 0 : (after - GRAIN_HOLD) / GRAIN_FADE;
            if (fade < bayer(g.col, g.row)) {
              const level = after < GRAIN_HOLD * 0.5 ? 3 : 2;
              plot(g.col, g.row, level, toneOf(g.rgb, level));
            }
            grains[write++] = g;
          }
          grains.length = write;
        }

        // The grid, scaled up by whole device pixels with no smoothing, on the canvas's bottom edge.
        if (gridImg) {
          gridCtx.putImageData(gridImg, 0, 0);
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(gridCanvas, 0, offY, cols * cellPx, rows * cellPx);
          ctx.restore();
        }

        // LAYER 4A: embers the pointer lifts off the crest.
        if (ptrBoost > 0.08 && wActive > 0.35 && dt > 0) {
          const emitInterval = clamp(0.03 - Math.min(ptr.speed, 600) * 0.000025, 0.014, 0.03);
          emberClock += dt;
          while (emberClock >= emitInterval && embers.length < 56) {
            emberClock -= emitInterval;
            const ex = clamp(ptr.x + (Math.random() - 0.5) * 72, 6, w - 6);
            const localH = colHeights[clamp(colAt(ex), 0, Math.max(0, cols - 1))] ?? 10;
            const ey = h - Math.max(3, localH * (0.52 + Math.random() * 0.48));
            const waveRgb: Rgb = [0, 0, 0];
            sampleStops(wThink > 0.5 ? thinkStops : stops, (ex / Math.max(1, w)) * 1.45 - colorPhase * 0.22, waveRgb);
            const warm = isLight ? EMBER_LIGHT : EMBER_DARK;
            const mix = wThink > 0.5 ? 0.22 : 0.58;
            embers.push({
              x: ex,
              y: ey,
              vx: (ptr.x - ex) * (0.75 + Math.random() * 0.55) + (Math.random() - 0.5) * 16,
              vy: -34 - Math.random() * 42,
              age: 0,
              life: 0.54 + Math.random() * 0.4,
              size: 2.2 + Math.random() * 0.9,
              seed: Math.random() * Math.PI * 2,
              rgb: [lerp(waveRgb[0], warm[0], mix), lerp(waveRgb[1], warm[1], mix), lerp(waveRgb[2], warm[2], mix)],
            });
          }
        }
        if (embers.length > 0) {
          let write = 0;
          for (let i = 0; i < embers.length; i++) {
            const p = embers[i];
            p.age += dt;
            if (p.age >= p.life) continue;
            const k = p.age / p.life;
            if (ptr.on > 0.1) {
              p.vx += (ptr.x - p.x) * 2.2 * dt;
              p.vy += (Math.min(ptr.y, h - 16) - p.y) * 1.15 * dt;
            }
            p.vx += Math.sin(p.age * 8.5 + p.seed) * 30 * dt;
            p.vy -= 20 * dt;
            const damp = Math.pow(0.24, dt);
            p.vx *= damp;
            p.vy *= damp;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const sz = p.size * (1 - 0.35 * k);
            ctx.globalAlpha = clamp01(Math.sin(Math.PI * Math.pow(k, 0.72)) * (isLight ? 0.92 : 0.96));
            ctx.fillStyle = `rgb(${p.rgb[0] | 0},${p.rgb[1] | 0},${p.rgb[2] | 0})`;
            ctx.fillRect(p.x - sz * 0.5, p.y - sz * 0.5, sz, sz);
            embers[write++] = p;
          }
          embers.length = write;
          ctx.globalAlpha = 1;
        }

        // LAYER 4B: comets (spawn burst, dismiss return, action bursts).
        if (comets.length > 0) {
          ctx.save();
          ctx.lineCap = "round";
          if (!isLight) ctx.globalCompositeOperation = "lighter";
          let write = 0;
          for (let i = 0; i < comets.length; i++) {
            const c = comets[i];
            c.age += dt;
            const tl = c.age - c.delay;
            if (tl < 0) {
              comets[write++] = c;
              continue;
            }
            const k = tl / c.life;
            if (k >= 1) continue;
            const isOut = c.mode !== "dismiss";
            const eased = isOut ? 1 - Math.pow(1 - k, 2.7) : Math.pow(k, 2.35);
            const tailK = isOut ? Math.max(0, 1 - Math.pow(1 - Math.max(0, k - 0.14), 2.7)) : Math.pow(Math.max(0, k - 0.17), 2.35);
            quadPoint(c.sx, c.sy, c.cx, c.cy, c.ex, c.ey, eased, pt);
            const nx = pt[0];
            const ny = pt[1];
            quadPoint(c.sx, c.sy, c.cx, c.cy, c.ex, c.ey, tailK, pt);
            const tx = pt[0];
            const ty = pt[1];
            const alpha = isOut ? Math.sin(Math.PI * Math.min(1, k * 1.05)) : smoothstep(0, 0.12, k) * (1 - smoothstep(0.84, 1, k));
            const r = c.rgb[0] | 0;
            const g = c.rgb[1] | 0;
            const b = c.rgb[2] | 0;
            if (Math.hypot(nx - tx, ny - ty) > 1.2) {
              const streak = ctx.createLinearGradient(tx, ty, nx, ny);
              streak.addColorStop(0, `rgba(${r},${g},${b},0)`);
              streak.addColorStop(0.55, `rgba(${r},${g},${b},${(alpha * 0.55).toFixed(3)})`);
              streak.addColorStop(1, `rgba(${r},${g},${b},${(alpha * 0.95).toFixed(3)})`);
              ctx.strokeStyle = streak;
              ctx.lineWidth = c.mode === "burst" ? 1.25 : 1.5;
              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(nx, ny);
              ctx.stroke();
            }
            const head = c.size * (1 - 0.25 * k);
            ctx.globalAlpha = clamp01(alpha);
            ctx.fillStyle = isLight ? `rgb(${r},${g},${b})` : `rgb(${Math.min(255, r + 68)},${Math.min(255, g + 68)},${Math.min(255, b + 68)})`;
            ctx.fillRect(nx - head * 0.5, ny - head * 0.5, head, head);
            ctx.globalAlpha = 1;
            comets[write++] = c;
          }
          comets.length = write;
          ctx.restore();
        }

        // Sleep when idle and every particle, pulse and spring has settled.
        return (
          s !== "idle" ||
          wActive > 0.004 ||
          comets.length > 0 ||
          embers.length > 0 ||
          pulses.length > 0 ||
          grains.length > 0 ||
          Math.abs(springs.active.getVelocity()) > 0.005
        );
      },

      wake() {
        wakeRef.current();
      },
    };

    engineRef.current = eng;

    const resize = () => {
      // Layout size, not screen size: a zoomed or tilted container mustn't change the lattice.
      const nw = canvas.offsetWidth;
      const nh = canvas.offsetHeight;
      if (nw <= 0 || nh <= 0) return;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw !== w || nh !== h || nd !== dpr) {
        w = nw;
        h = nh;
        dpr = nd;
        canvas.width = Math.round(nw * nd);
        canvas.height = Math.round(nh * nd);
        cols = 0; // re-lay the grid
      }
      measureOrigin();
      refreshTheme();
      eng.stepAndDraw(0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mo = new MutationObserver(() => {
      refreshTheme();
      eng.stepAndDraw(0);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });

    const hostEl = pointerRef?.current ?? canvas.parentElement;
    const onPointerMove = (ev: PointerEvent) => {
      if (!inputRef.current.interactive) return;
      const cr = canvas.getBoundingClientRect();
      ptr.tx = ev.clientX - cr.left;
      ptr.ty = ev.clientY - cr.top;
      if (ptr.target === 0) {
        ptr.x = ptr.tx;
        ptr.y = ptr.ty;
      }
      ptr.target = 1;
      eng.wake();
    };
    const onPointerLeave = () => {
      ptr.target = 0;
    };
    hostEl?.addEventListener("pointermove", onPointerMove, { passive: true });
    hostEl?.addEventListener("pointerleave", onPointerLeave, { passive: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
      hostEl?.removeEventListener("pointermove", onPointerMove);
      hostEl?.removeEventListener("pointerleave", onPointerLeave);
      Object.values(springs).forEach((sp) => sp.stop());
      engineRef.current = null;
    };
  }, [canvasRef, palette, colorsKey, originRef, pointerRef]);

  React.useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const prev = eng.lastState;
    eng.lastState = state;
    const isAct = state !== "idle";
    if (reduced) {
      eng.clearParticles();
      eng.springs.active.jump(isAct ? 1 : 0);
      eng.springs.listen.jump(state === "listening" ? 1 : 0);
      eng.springs.think.jump(state === "thinking" ? 1 : 0);
      eng.springs.speak.jump(state === "speaking" ? 1 : 0);
      eng.springs.mute.jump(muted ? 1 : 0);
      eng.springs.level.jump(muted ? 0.1 : 0.62);
      eng.stepAndDraw(0);
      return;
    }
    if (prev !== state) eng.triggerTransition(prev, state);
    eng.springs.active.configure(isAct ? SPAWN_SPRING : DISMISS_SPRING);
    eng.springs.active.set(isAct ? 1 : 0);
    eng.springs.listen.set(state === "listening" ? 1 : 0);
    eng.springs.think.set(state === "thinking" ? 1 : 0);
    eng.springs.speak.set(state === "speaking" ? 1 : 0);
    eng.springs.mute.set(muted ? 1 : 0);
    eng.wake();
  }, [state, muted, reduced]);

  React.useEffect(() => {
    if (!onScreen || reduced) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      runningRef.current = false;
      if (reduced) engineRef.current?.stepAndDraw(0);
      return;
    }
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(1 / 24, (now - last) / 1000) : 1 / 60;
      last = now;
      const eng = engineRef.current;
      if (!eng) {
        rafRef.current = 0;
        runningRef.current = false;
        return;
      }
      if (eng.stepAndDraw(dt)) rafRef.current = requestAnimationFrame(tick);
      else {
        rafRef.current = 0;
        runningRef.current = false;
      }
    };
    const start = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      last = 0;
      rafRef.current = requestAnimationFrame(tick);
    };
    wakeRef.current = start;
    start();
    return () => {
      wakeRef.current = () => {};
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      runningRef.current = false;
    };
  }, [onScreen, reduced]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 size-full ${className}`} {...props} />;
}

export default DitherHorizon;
