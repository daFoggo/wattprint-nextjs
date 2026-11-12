"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";
import { MATERIAL_RECESS } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * TOKEN BUCKET: a rate limit you can watch refill
 *
 *   tokens    what's left sits as a row of tokens packed against
 *             the outlet on the right of a recessed tube
 *   refill    the next token grows at the inlet on the left at
 *             the real refill rate, then slides down the tube to
 *             the back of the row; an empty tube is a long slide
 *   take      a request takes the front token: it slips out
 *             through the outlet and the row closes up
 *   waiting   when requests wait for a token, a queue opens past
 *             the outlet as hollow slots; each new token runs the
 *             length of the tube straight into the first slot and
 *             carries that request away
 *
 * The numbers are yours (a limiter's remaining count, e.g. the
 * X-RateLimit-Remaining header); between your updates the tube
 * refills on its own at refillPerSecond. Tokens and slots are
 * plain elements moved by transform; one frame loop grows the
 * next token and sleeps when the bucket is full or off screen.
 * ───────────────────────────────────────────────────────── */

export interface TokenBucketProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** How many tokens the bucket holds. */
  limit: number;
  /** Tokens left now, as your limiter reports them. */
  remaining: number;
  /** Tokens added a second. The tube refills on its own between your updates. */
  refillPerSecond?: number;
  /** Requests your client is holding until a token frees up. */
  waiting?: number;
  title?: string;
  /** A second line under the title, e.g. the key or route. */
  caption?: string;
  /** What a token stands for. */
  unit?: string;
  /** Overrides the refill text, e.g. "60 a minute". */
  rateLabel?: string;
  /** Replaces the title row (title, caption, rate) with your own node; `title` still names the meter (patched (hairline/patch.mjs)). */
  header?: React.ReactNode;
  /** The tokens' colour: any CSS colour. Defaults to --chart-1. */
  color?: string;
  locales?: string | string[];
  /** Tokens are what is used (pass it as `remaining`), packed from the left; the figure counts what is left (patched (hairline/patch.mjs)). */
  fillUsed?: boolean;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const PAD = 8;
/** The inlet chamber on the left, where the next token grows. */
const INLET = 22;
const RING = 10;

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

interface Engine {
  track: HTMLDivElement | null;
  gateEl: HTMLSpanElement | null;
  ghosts: HTMLSpanElement | null;
  instant: boolean;
  w: number;
  h: number;
  slots: number;
  per: number;
  gate: number;
  base: number;
  t0: number;
  rate: number;
  limit: number;
  fillUsed?: boolean; // patched (hairline/patch.mjs)
  stack: HTMLSpanElement[];
  rings: HTMLSpanElement[];
  forming: HTMLSpanElement | null;
  serve: number;
  ringsWanted: number;
  frame: number;
  visible: boolean;
  arrived: boolean;
  reduced: boolean;
  shown: number;
  onShown: (n: number) => void;
}

const levelAt = (e: Engine, now: number) => (e.rate > 0 ? Math.min(e.limit, e.base + ((now - e.t0) / 1000) * e.rate) : Math.min(e.limit, e.base));

/** Geometry for the bucket part of the tube (left of the gate). */
function geometry(e: Engine) {
  const left = INLET + 4;
  const pitch = Math.max(1, (e.gate - PAD - left) / Math.max(1, e.slots));
  const tw = Math.max(2, Math.min(5, pitch * 0.5));
  const x = (i: number) => left + (e.fillUsed /* patched (hairline/patch.mjs) */ ? i : e.slots - 1 - i) * pitch + (pitch - tw) / 2;
  return { pitch, tw, x, left, inlet: (INLET - tw) / 2 + 1 };
}

function tokenEl(e: Engine, color: string, hollow = false) {
  const el = document.createElement("span");
  const s = el.style;
  s.position = "absolute";
  s.left = "0";
  s.top = "8px";
  s.bottom = "8px";
  s.borderRadius = "999px";
  s.willChange = "transform, opacity";
  if (hollow) {
    s.width = `${RING - 4}px`;
    s.boxShadow = "inset 0 0 0 1.5px var(--tb-wait)";
  } else {
    s.width = `${geometry(e).tw}px`;
    s.background = color;
    s.boxShadow = "inset 0 1px 0 rgb(255 255 255 / 0.32)";
  }
  e.track!.appendChild(el);
  return el;
}

function place(el: HTMLElement, x: number, animate: boolean, ms = 320) {
  el.style.transition = animate ? `transform ${ms}ms ${EASE}, opacity 200ms ${EASE}` : "none";
  el.style.transform = `translateX(${x}px)`;
}

function leave(el: HTMLElement, x: number, reduced: boolean, after = 0) {
  if (reduced) return el.remove();
  el.style.transition = `transform 240ms ${EASE} ${after}ms, opacity 200ms ${EASE} ${after + 60}ms`;
  el.style.transform = `translateX(${x}px) scaleY(0.6)`;
  el.style.opacity = "0";
  window.setTimeout(() => el.remove(), 320 + after);
}

/** Put every token and waiting slot where it belongs now. */
function layout(e: Engine, animate: boolean) {
  const g = geometry(e);
  e.stack.forEach((el, i) => {
    el.style.width = `${g.tw}px`;
    place(el, g.x(i), animate && !e.reduced);
  });
  if (e.forming) {
    e.forming.style.width = `${g.tw}px`;
    e.forming.style.transform = `translateX(${g.inlet}px) scaleY(${e.forming.dataset.k ?? 0})`;
  }
  if (e.ghosts) {
    // Empty slots: the same marks, faint, so the bucket's size reads at a glance.
    const s = e.ghosts.style;
    s.transition = animate && !e.reduced ? `width 420ms ${EASE}, background-size 420ms ${EASE}, background-position 420ms ${EASE}` : "none";
    s.left = `${g.left}px`;
    s.width = `${e.slots * g.pitch}px`;
    s.backgroundSize = `${g.pitch}px 100%`;
    s.backgroundPosition = `${(g.pitch - g.tw) / 2}px 0`;
    s.backgroundImage = `linear-gradient(to right, var(--tb-ghost) 0 ${g.tw}px, transparent ${g.tw}px)`;
  }
  e.rings.forEach((el, i) => place(el, e.gate + 8 + i * RING, animate && !e.reduced));
  if (e.gateEl) {
    e.gateEl.style.transition = animate && !e.reduced ? `transform 420ms ${EASE}, opacity 300ms ${EASE}` : "none";
    e.gateEl.style.transform = `translateX(${e.gate}px)`;
    e.gateEl.style.opacity = e.gate < e.w ? "1" : "0";
  }
}

/** How many slots the tube has at this width and limit, and how many tokens each stands for. */
function fit(e: Engine) {
  const cap = Math.max(8, Math.min(48, Math.floor((e.w - PAD * 2) / 8)));
  const slots = Math.max(1, Math.min(Math.round(e.limit), cap));
  if (slots !== e.slots && e.arrived) {
    // A different number of slots: lay the row out again in place, without replaying its arrival.
    e.stack.forEach((el) => el.remove());
    e.stack = [];
    e.instant = true;
  }
  e.slots = slots;
  e.per = e.limit / e.slots;
}

function step(e: Engine, color: string, now: number) {
  if (!e.track || !e.w) return false;
  // The row arrives the first time it's seen.
  if (!e.arrived && !e.visible) return false;
  const g = geometry(e);
  const level = levelAt(e, now);
  const wanted = Math.min(e.slots, Math.floor(level / e.per + 1e-9));
  // Tokens out: through the outlet, or along to the first waiting slot.
  let out = 0;
  while (e.stack.length > wanted) {
    const el = e.stack.shift()!;
    if (e.serve > 0 && e.rings.length) {
      e.serve -= 1;
      const ring = e.rings.shift()!;
      const x = Number(ring.style.transform.match(/translateX\(([-\d.]+)px/)?.[1] ?? e.gate + 8);
      place(el, x + (RING - 4 - g.tw) / 2, !e.reduced, 260);
      ring.style.transition = `opacity 200ms ${EASE} 220ms, transform 240ms ${EASE} 220ms`;
      ring.style.boxShadow = `inset 0 0 0 1.5px ${color}`;
      ring.style.opacity = "0";
      ring.style.transform += " translateY(-6px)";
      window.setTimeout(() => ring.remove(), 480);
      leave(el, x, e.reduced, 220);
    } else leave(el, e.gate + 6 + out * 4, e.reduced, out * 30);
    out += 1;
  }
  // Tokens in: they appear at the inlet and slide to the back of the row.
  let added = 0;
  while (e.stack.length < wanted) {
    const el = tokenEl(e, color);
    const i = e.stack.length;
    e.stack.push(el);
    if (e.reduced || e.instant) place(el, g.x(i), false);
    else {
      place(el, g.inlet, false);
      el.style.opacity = e.arrived ? "1" : "0";
      const delay = e.arrived ? added * 40 : i * 14;
      void el.offsetWidth;
      el.style.transition = `transform 340ms ${EASE} ${delay}ms, opacity 220ms ${EASE} ${delay}ms`;
      el.style.transform = `translateX(${g.x(i)}px)`;
      el.style.opacity = "1";
    }
    added += 1;
  }
  e.arrived = true;
  e.instant = false;
  if (out) layout(e, true);
  // Waiting slots: hollow, past the gate, the oldest nearest it.
  while (e.rings.length > e.ringsWanted) {
    const el = e.rings.pop()!;
    leave(el, e.w, e.reduced);
  }
  const room = Math.max(0, Math.floor((e.w - e.gate - 12) / RING));
  while (e.rings.length < Math.min(e.ringsWanted, room)) {
    const el = tokenEl(e, color, true);
    const i = e.rings.length;
    e.rings.push(el);
    place(el, e.w, false);
    el.style.opacity = "0";
    void el.offsetWidth;
    place(el, e.gate + 8 + i * RING, !e.reduced, 300);
    el.style.opacity = "1";
  }
  // The next token grows at the inlet.
  const full = wanted >= e.slots;
  const k = full || e.rate <= 0 ? 0 : level / e.per - wanted;
  if (e.forming) {
    e.forming.dataset.k = String(k);
    e.forming.style.width = `${g.tw}px`;
    e.forming.style.transform = `translateX(${g.inlet}px) scaleY(${k})`;
    e.forming.style.opacity = full ? "0" : "0.5";
  }
  // A serve only pairs with a token leaving in the same update.
  e.serve = 0;
  const shown = Math.floor(level + 1e-9);
  if (shown !== e.shown) {
    e.shown = shown;
    e.onShown(shown);
  }
  return e.rate > 0 && !full && e.visible;
}

export function TokenBucket({
  limit,
  remaining,
  refillPerSecond = 0,
  waiting = 0,
  title = "Rate limit",
  caption,
  unit = "requests",
  rateLabel,
  header, // patched (hairline/patch.mjs)
  color = "color-mix(in oklab, var(--chart-1, var(--primary)) 74%, var(--foreground))",
  locales,
  fillUsed, // patched (hairline/patch.mjs)
  className = "",
  ...props
}: TokenBucketProps) {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const locale = locales ?? (hydrated ? undefined : "en-US");
  const [shown, setShown] = React.useState(() => Math.max(0, Math.floor(remaining)));
  const trackRef = React.useRef<HTMLDivElement>(null);
  const formingRef = React.useRef<HTMLSpanElement>(null);
  const layerRef = React.useRef<HTMLDivElement>(null);
  const gateRef = React.useRef<HTMLSpanElement>(null);
  const ghostsRef = React.useRef<HTMLSpanElement>(null);
  const colorRef = React.useRef(color);
  const engine = React.useRef<Engine | null>(null);

  const ensure = () => {
    if (!engine.current)
      engine.current = {
        fillUsed, // patched (hairline/patch.mjs)
        track: null,
        gateEl: null,
        ghosts: null,
        instant: false,
        w: 0,
        h: 0,
        slots: 1,
        per: 1,
        gate: 0,
        base: remaining,
        t0: 0,
        rate: refillPerSecond,
        limit,
        stack: [],
        rings: [],
        forming: null,
        serve: 0,
        ringsWanted: 0,
        frame: 0,
        visible: false,
        arrived: false,
        reduced,
        shown: -1,
        onShown: setShown,
      };
    return engine.current;
  };

  const run = React.useCallback(() => {
    const e = engine.current;
    if (!e || e.frame) return;
    const loop = (now: number) => {
      e.frame = 0;
      if (step(e, colorRef.current, now)) e.frame = requestAnimationFrame(loop);
    };
    e.frame = requestAnimationFrame(loop);
  }, []);

  // Size: the tube's width sets how many slots it has and where the gate sits.
  React.useLayoutEffect(() => {
    const e = ensure();
    const track = trackRef.current;
    if (!track) return;
    e.track = layerRef.current;
    e.gateEl = gateRef.current;
    e.ghosts = ghostsRef.current;
    e.forming = formingRef.current;
    const measure = () => {
      const w = track.clientWidth;
      if (!w || w === e.w) return;
      e.w = w;
      e.gate = e.ringsWanted > 0 ? w - Math.min(96, Math.round(w * 0.26)) : w;
      fit(e);
      layout(e, false);
      if (e.frame) cancelAnimationFrame(e.frame);
      e.frame = 0;
      step(e, colorRef.current, performance.now());
      run();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // Your numbers: keep the part of a token already grown, so a request doesn't restart the refill.
  React.useEffect(() => {
    const e = ensure();
    const now = performance.now();
    const before = levelAt(e, now);
    const grown = e.rate > 0 && Number.isInteger(remaining) && remaining < limit ? before - Math.floor(before) : 0;
    if (e.limit !== limit) {
      e.limit = limit;
      if (e.w) {
        fit(e);
        layout(e, false);
      }
    }
    e.rate = refillPerSecond;
    e.reduced = reduced;
    e.base = Math.max(0, Math.min(limit, remaining + grown));
    e.t0 = now;
    const ringsBefore = e.ringsWanted;
    e.serve += Math.max(0, ringsBefore - waiting);
    e.ringsWanted = Math.max(0, waiting);
    // The queue opens past the outlet while anyone waits, and closes once it has emptied.
    const gate = e.ringsWanted > 0 ? e.w - Math.min(96, Math.round(e.w * 0.26)) : e.w;
    if (e.w && gate !== e.gate) {
      const apply = () => {
        e.gate = e.ringsWanted > 0 ? e.w - Math.min(96, Math.round(e.w * 0.26)) : e.w;
        layout(e, true);
      };
      if (gate > e.gate) window.setTimeout(apply, 420);
      else apply();
    }
    if (e.w) {
      if (e.frame) cancelAnimationFrame(e.frame);
      e.frame = 0;
      step(e, colorRef.current, now);
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, limit, refillPerSecond, waiting, reduced, run]);

  React.useEffect(() => {
    colorRef.current = color;
    engine.current?.stack.forEach((el) => (el.style.background = color));
  }, [color]);

  // The refill runs only while the tube is on screen.
  React.useEffect(() => {
    const track = trackRef.current;
    const e = ensure();
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => {
      e.visible = entry.isIntersecting;
      if (e.visible) {
        step(e, colorRef.current, performance.now());
        run();
      }
    });
    observer.observe(track);
    return () => {
      observer.disconnect();
      if (e.frame) cancelAnimationFrame(e.frame);
      e.frame = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  React.useEffect(
    () => () => {
      const e = engine.current;
      if (!e) return;
      e.stack.forEach((el) => el.remove());
      e.rings.forEach((el) => el.remove());
      e.stack = [];
      e.rings = [];
    },
    [],
  );

  const fmt = (v: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v);
  const rate = rateLabel ?? rateText(refillPerSecond, fmt);
  const waits = waiting > 0;
  const left = fillUsed ? Math.floor(Math.max(0, limit - remaining)) : shown; // patched (hairline/patch.mjs)
  const low = left <= limit * 0.1;

  return (
    <div
      className={`w-full rounded-[20px] bg-background shadow-[0_0_0_1px_var(--border)] [--tb-ghost:color-mix(in_oklab,var(--foreground)_9%,transparent)] [--tb-wait:var(--color-amber-600)] dark:[--tb-wait:var(--color-amber-400)] ${className}`}
      {...props}
    >
      <div aria-hidden="true" data-natural-width className="grid h-0" style={{ gridTemplateColumns: "minmax(0, 420px)" }} />
      <div className="@container w-full">
        <div className="p-4 @md:p-5">
          {header ?? ( /* patched (hairline/patch.mjs): your own title row */
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12.5px] text-muted-foreground">{title}</p>
              {caption && <p className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground/80">{caption}</p>}
            </div>
            <p className="relative h-5 shrink-0 text-right text-[12px] tabular-nums">
              <span
                className="block whitespace-nowrap text-muted-foreground transition-[opacity,filter,translate] duration-300"
                style={{ opacity: waits ? 0 : 1, filter: waits && !reduced ? "blur(3px)" : "none", translate: waits && !reduced ? "0 -4px" : "0 0", transitionTimingFunction: EASE }}
              >
                {rate}
              </span>
              <span
                aria-hidden={!waits}
                className="absolute right-0 top-0 inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-amber-600 transition-[opacity,filter,translate] duration-300 dark:text-amber-400"
                style={{ opacity: waits ? 1 : 0, filter: waits || reduced ? "none" : "blur(3px)", translate: waits || reduced ? "0 0" : "0 4px", transitionTimingFunction: EASE }}
              >
                <span className="size-1.5 rounded-full bg-current" />
                <NumberRoll value={Math.max(0, waiting)} locales={locale} duration={700} /> waiting
              </span>
            </p>
          </div>
          )}{/* patched (hairline/patch.mjs) */}

          <div
            role="meter"
            aria-label={title}
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={shown}
            aria-valuetext={`${fmt(left /* patched (hairline/patch.mjs) */)} of ${fmt(limit)} ${unit} left${rate ? `, refills ${rate}` : ""}${waits ? `, ${fmt(waiting)} waiting` : ""}`}
            className="mt-2.5 flex items-baseline gap-1.5"
          >
            <span className={`text-[26px] font-medium leading-none tracking-[-0.04em] tabular-nums @md:text-[30px] ${low ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`} style={{ transition: "color 300ms" }}>
              <NumberRoll value={left /* patched (hairline/patch.mjs) */} locales={locale} duration={600} />
            </span>
            <span className="text-[13px] text-muted-foreground tabular-nums">
              / {fmt(limit)} <TextMorph>{`${unit} left`}</TextMorph>
            </span>
          </div>

          <div ref={trackRef} aria-hidden="true" className={`relative mt-3.5 h-11 overflow-clip rounded-[12px] bg-muted ${MATERIAL_RECESS}`}>
            {/* The gate: the outlet tokens leave by, and the queue's edge while requests wait. */}
            <span ref={ghostsRef} className="absolute inset-y-2 bg-repeat-x" />
            {/* The inlet: the next token grows behind this line. */}
            <span className="absolute inset-y-2 w-px bg-[color-mix(in_oklab,var(--foreground)_14%,var(--border))]" style={{ left: 22 }} />
            <span ref={gateRef} className="absolute left-0 inset-y-2 w-px bg-[color-mix(in_oklab,var(--foreground)_18%,var(--border))]" style={{ opacity: 0 }} />
            <span
              ref={formingRef}
              className="absolute left-0 top-2 bottom-2 origin-bottom rounded-full"
              style={{ background: color, opacity: 0, transform: "scaleY(0)" }}
            />
            <div ref={layerRef} className="absolute inset-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

function rateText(perSecond: number, fmt: (v: number) => string) {
  if (!(perSecond > 0)) return "";
  const near = (v: number) => Math.abs(v - Math.round(v)) < 0.01;
  if (perSecond >= 1 && near(perSecond)) return `+${fmt(Math.round(perSecond))} a second`;
  if (near(perSecond * 60)) return `+${fmt(Math.round(perSecond * 60))} a minute`;
  if (perSecond < 1 && near(1 / perSecond)) return `+1 every ${fmt(Math.round(1 / perSecond))}s`;
  return `+${fmt(Math.round(perSecond * 3600))} an hour`;
}
