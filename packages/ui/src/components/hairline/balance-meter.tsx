"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { createSpring, type Spring } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * BALANCE METER: what came in against what went out, and the net
 *
 *   scale     a row of upright hairline ticks centred on zero; the
 *             ticks from zero to the net light in the colour of the
 *             side that's ahead, brighter toward the needle
 *   settle    when the numbers change the needle swings to the new
 *             net on a spring and settles like a scale's pointer;
 *             the ticks it sweeps over keep a little light and let
 *             it go slowly behind it
 *   range     the scale picks round limits for you; when they
 *             change, the labels roll to the new ones
 *
 * One canvas draws the ticks and the needle; it redraws only while
 * the needle moves or the light fades, and takes the theme's colours.
 * ───────────────────────────────────────────────────────── */

export interface BalanceFlow {
  label: string;
  value: number;
  /** Any CSS colour. Inflow defaults to --chart-1, outflow to --chart-2. */
  color?: string;
  icon?: React.ReactNode;
}

export interface BalanceMeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** What came in: money in, calories eaten, capacity added. The net is inflow minus outflow. */
  inflow: BalanceFlow;
  /** What went out: money out, calories burned, capacity used. */
  outflow: BalanceFlow;
  /** The scale's limit either side of zero. Picked from the numbers when left out. */
  range?: number;
  title?: string;
  unit?: string;
  format?: Intl.NumberFormatOptions;
  locales?: string | string[];
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const PITCH = 5; // one tick every 5px
const TICK = 2;
const H = 40; // the canvas
const PAD = 16; // room for the end labels to sit centred under their ticks
const AFTERGLOW = 900; // ms for the light a passing needle leaves to fade to a third

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const subscribeNothing = () => () => {};
const useHydrated = () => React.useSyncExternalStore(subscribeNothing, () => true, () => false);

/** A round limit a little past what's shown: 1, 2, 2.5 or 5 times a power of ten. */
function niceRange(net: number, inflow: number, outflow: number) {
  const want = Math.max(Math.abs(net) * 1.4, (Math.abs(inflow) + Math.abs(outflow)) * 0.12, 1);
  const power = 10 ** Math.floor(Math.log10(want));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * power >= want) return step * power;
  return 10 * power;
}

interface Engine {
  width: number;
  half: number;
  needle: Spring | null;
  last: number;
  glow: Float32Array;
  glowSide: Int8Array;
  frame: number;
  time: number;
  colors: { inflow: string; outflow: string; ink: string; bg: string };
}

/** One frame: the faint field, the lit run from zero to the needle, the light the needle left behind, and the needle. */
function draw(e: Engine, canvas: HTMLCanvasElement | null) {
  if (!canvas || !e.width || !e.needle) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = e.width;
  if (canvas.width !== Math.round(w * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(H * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, H);

  const now = performance.now();
  const dt = e.time ? Math.min(now - e.time, 100) : 0;
  e.time = now;
  const fade = Math.exp(-dt / (AFTERGLOW / Math.log(3)));
  const half = e.half;
  const cx = w / 2;
  const pos = Math.max(-1.04, Math.min(1.04, e.needle.get())) * half; // in ticks
  // The ticks the needle crossed since the last frame keep its light.
  const lo = Math.min(pos, e.last);
  const hi = Math.max(pos, e.last);
  let glowing = false;
  for (let k = -half; k <= half; k++) {
    const i = k + half;
    e.glow[i] *= fade;
    if (k !== 0 && k >= Math.ceil(lo) && k <= Math.floor(hi) && hi - lo > 0.05) {
      e.glow[i] = 1;
      e.glowSide[i] = k > 0 ? 1 : -1;
    }
    if (e.glow[i] > 0.01) glowing = true;
    else e.glow[i] = 0;
  }
  e.last = pos;

  const base = H - 6;
  for (let k = -half; k <= half; k++) {
    const i = k + half;
    const x = cx + k * PITCH - TICK / 2;
    const major = k === 0 ? 2 : k % (half / 2) === 0 ? 1 : 0;
    const h = major === 2 ? 26 : major === 1 ? 19 : 13;
    // Faint field
    ctx.globalAlpha = major === 2 ? 0.42 : major === 1 ? 0.24 : 0.13;
    ctx.fillStyle = e.colors.ink;
    const lit = k !== 0 && (k > 0 ? k <= pos : k >= pos) && Math.abs(pos) > 0.01;
    const light = lit ? 0.32 + 0.68 * Math.min(1, Math.abs(k) / Math.max(1, Math.abs(pos))) ** 1.4 : 0;
    const after = e.glow[i] * 0.55;
    if (light <= 0 && after <= 0) {
      ctx.fillRect(x, base - h, TICK, h);
      continue;
    }
    const side = lit ? (k > 0 ? 1 : -1) : e.glowSide[i];
    ctx.globalAlpha = Math.max(light, after);
    ctx.fillStyle = side > 0 ? e.colors.inflow : e.colors.outflow;
    ctx.fillRect(x, base - h, TICK, h);
  }

  // The needle, with a gap of the card's colour cut round it so it reads over the ticks.
  const nx = cx + pos * PITCH;
  ctx.globalAlpha = 1;
  ctx.fillStyle = e.colors.bg;
  ctx.fillRect(nx - 3.5, 0, 7, H);
  ctx.fillStyle = e.colors.ink;
  ctx.beginPath();
  ctx.roundRect(nx - 1.25, 3, 2.5, H - 6, 1.25);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(nx, 4.5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  const moving = e.needle.getVelocity() !== 0;
  if (glowing && !moving && !e.frame) {
    e.frame = requestAnimationFrame(() => {
      e.frame = 0;
      draw(e, canvas);
    });
  }
  if (!glowing && !moving) e.time = 0;
}

export function BalanceMeter({ inflow, outflow, range: rangeProp, title = "Net", unit, format, locales, className = "", ...props }: BalanceMeterProps) {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const locale = locales ?? (hydrated ? undefined : "en-US");
  const net = inflow.value - outflow.value;
  const range = rangeProp ?? niceRange(net, inflow.value, outflow.value);
  const inColor = inflow.color ?? "var(--chart-1, var(--primary))";
  const outColor = outflow.color ?? "var(--chart-2, var(--primary))";

  const [visible, setVisible] = React.useState(false);
  const [width, setWidth] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const probes = React.useRef<(HTMLSpanElement | null)[]>([]);
  const engine = React.useRef<Engine>({
    width: 0,
    half: 0,
    needle: null,
    last: 0,
    glow: new Float32Array(0),
    glowSide: new Int8Array(0),
    frame: 0,
    time: 0,
    colors: { inflow: "#305dde", outflow: "#e8743b", ink: "#454545", bg: "#fff" },
  });

  const paint = React.useCallback(() => draw(engine.current, canvasRef.current), []);

  // The needle's spring, made before anything paints.
  React.useLayoutEffect(() => {
    const e = engine.current;
    // A little under critical damping: it swings past and settles, like a scale's pointer.
    e.needle = createSpring(0, { stiffness: 150, damping: 15 }, paint, 0.0005);
    return () => {
      e.needle?.stop();
      e.needle = null;
      if (e.frame) cancelAnimationFrame(e.frame);
      e.frame = 0;
    };
  }, [paint]);

  React.useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setWidth((w) => (w === box.offsetWidth ? w : box.offsetWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Ticks to fit the width, an even number either side so the half-way ticks land on whole ticks.
  const half = Math.max(4, Math.floor((width - PAD * 2) / PITCH / 4) * 2);
  React.useLayoutEffect(() => {
    const e = engine.current;
    e.width = width;
    if (e.half !== half) {
      e.half = half;
      e.glow = new Float32Array(half * 2 + 1);
      e.glowSide = new Int8Array(half * 2 + 1);
      e.last = (e.needle?.get() ?? 0) * half;
    }
    paint();
  }, [width, half, paint]);

  // The theme's colours, read again whenever the theme changes.
  React.useEffect(() => {
    const read = () => {
      const [a, b, c, d] = probes.current.map((p) => (p ? getComputedStyle(p).color : ""));
      engine.current.colors = { inflow: a || "#305dde", outflow: b || "#e8743b", ink: c || "#454545", bg: d || "#fff" };
      paint();
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", read);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", read);
    };
  }, [inColor, outColor, paint]);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const target = visible ? net / range : 0;
  React.useEffect(() => {
    const needle = engine.current.needle;
    if (!needle) return;
    if (reduced) needle.jump(target);
    else needle.set(target);
  }, [target, reduced]);

  const fmt = (v: number) => new Intl.NumberFormat(locale, format).format(v);
  const signed: Intl.NumberFormatOptions = { ...format, signDisplay: "exceptZero" };
  const unitText = unit ? ` ${unit}` : "";
  // Five labels where they fit, the ends and zero where they don't.
  const marks = half * PITCH * 2 >= 300 ? [-1, -0.5, 0, 0.5, 1] : [-1, 0, 1];
  const low = -range;

  return (
    <div ref={rootRef} className={`w-full rounded-[22px] bg-background shadow-[0_0_0_1px_var(--border)] ${className}`} {...props}>
      <div aria-hidden="true" data-natural-width className="grid h-0" style={{ gridTemplateColumns: "minmax(0, 460px)" }} />
      <div className="@container w-full">
        <div className="p-4 @md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <p className="text-[26px] font-medium leading-none tracking-[-0.035em] text-foreground tabular-nums @md:text-[32px]">
                <NumberRoll value={visible ? net : 0} format={signed} locales={locale} duration={1000} />
                {unit && <span className="ml-1 text-[14px] font-normal tracking-normal text-muted-foreground @md:text-[15px]">{unit}</span>}
              </p>
              <p className="mt-1.5 truncate text-[12px] text-muted-foreground @md:text-[13px]">{title}</p>
            </div>
            <dl className="flex items-baseline gap-x-4 text-[12px] @md:text-[13px]">
              {[outflow, inflow].map((flow, i) => {
                const color = i === 0 ? outColor : inColor;
                return (
                  <div key={i} className="flex items-baseline gap-1.5">
                    <dt className="flex items-center gap-1.5 self-center text-muted-foreground">
                      {flow.icon ? (
                        <span className="flex size-3.5 items-center justify-center [&>svg]:size-3.5" style={{ color }}>
                          {flow.icon}
                        </span>
                      ) : (
                        <span className="size-2 rounded-[2px]" style={{ background: color }} />
                      )}
                      {flow.label}
                    </dt>
                    <dd className="font-medium tabular-nums" style={{ color: `color-mix(in oklab, ${color} 82%, var(--foreground))` }}>
                      <NumberRoll value={visible ? flow.value : 0} format={format} locales={locale} duration={1000} />
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div
            ref={boxRef}
            role="meter"
            aria-label={title}
            aria-valuemin={low}
            aria-valuemax={range}
            aria-valuenow={net}
            aria-valuetext={`${new Intl.NumberFormat(locale, signed).format(net)}${unitText}: ${inflow.label} ${fmt(inflow.value)}, ${outflow.label} ${fmt(outflow.value)}`}
            className="relative mt-5 @md:mt-6"
          >
            <canvas ref={canvasRef} aria-hidden="true" className="block w-full" style={{ height: H }} />
            <div aria-hidden="true" className="relative mt-1.5 h-4 text-[11px] text-muted-foreground tabular-nums @md:text-[11.5px]">
              {width > 0 &&
                marks.map((m) => (
                  <span
                    key={m}
                    className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
                    style={{ left: width / 2 + m * half * PITCH, transition: `left 300ms ${EASE}` }}
                  >
                    <NumberRoll value={m * range} format={format} locales={locale} duration={reduced ? 0 : 900} />
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
      {/* Colour probes for the canvas. */}
      <span ref={(el) => void (probes.current[0] = el)} aria-hidden="true" className="hidden" style={{ color: inColor }} />
      <span ref={(el) => void (probes.current[1] = el)} aria-hidden="true" className="hidden" style={{ color: outColor }} />
      <span ref={(el) => void (probes.current[2] = el)} aria-hidden="true" className="hidden text-foreground" />
      <span ref={(el) => void (probes.current[3] = el)} aria-hidden="true" className="hidden text-background" />
    </div>
  );
}
