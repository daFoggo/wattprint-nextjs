"use client";

import * as React from "react";
import { TextMorph } from "./text-morph";
import { createSpring, projectInertia, rubberBand, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * TOAST STACK: notifications with continuous squircle craft
 *
 *   squircle   concentric Figma superellipse curves for the card
 *              and icon tile with hairline specular lighting
 *   motion     smooth delayed spring arrival for the icon tile,
 *              self-drawing vector glyphs, and settle micro-bump
 *   stack      three peek out behind the newest; hover or focus
 *              fans them out into a list at measured heights
 *   clean      zero bottom borders or progress bars; pristine
 *   promise    one toast from start to finish: spinner, letter-by-
 *              letter title morphing, self-drawing check or shake
 *   swipe      frictionless swipe-to-dismiss with kinetic inertia
 *
 * Call toast() from anywhere; render <Toaster /> once.
 * ───────────────────────────────────────────────────────── */

export type ToastType = "default" | "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition = "bottom-right" | "bottom-center" | "bottom-left" | "top-right" | "top-center" | "top-left";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  description?: React.ReactNode;
  type?: ToastType;
  /** How long it stays (ms). Loading toasts stay until they settle. */
  duration?: number;
  action?: ToastAction;
  /** Whether a close button is shown. Defaults to true. */
  dismissible?: boolean;
  /** Reuse an id to update a toast in place. */
  id?: string;
}

export type ToastPromiseMessages<T> = {
  loading: React.ReactNode;
  success: React.ReactNode | ((data: T) => React.ReactNode);
  error: React.ReactNode | ((error: unknown) => React.ReactNode);
  description?: React.ReactNode;
};

interface ToastData extends ToastOptions {
  id: string;
  title: React.ReactNode;
  type: ToastType;
  duration: number;
  dismissible: boolean;
  /** Bumped when it changes, so its timer restarts. */
  version: number;
  dismissed: boolean;
}

/* ── Concentric Squircle Geometry ── */

const PADDING = 10;
const TILE = 36;
const TILE_RADIUS = 11;
const CARD_RADIUS = TILE_RADIUS + PADDING; // 21px for concentric corner curvature

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function squirclePath(width: number, height: number, radius: number, smoothing = 0.9): string {
  if (width <= 0 || height <= 0) return "";
  const maxRadius = Math.min(width, height) / 2;
  const cornerRadius = Math.min(radius, maxRadius);
  const cornerSmoothing = Math.min(Math.max(smoothing, 0), 1);

  const budget = maxRadius;
  let p = (1 + cornerSmoothing) * cornerRadius;
  p = Math.min(p, budget);

  const arcMeasure = 90 * (1 - cornerSmoothing);
  const arcSectionLength = Math.sin(toRadians(arcMeasure / 2)) * cornerRadius * Math.SQRT2;
  const angleAlpha = (90 - arcMeasure) / 2;
  const p3ToP4Distance = cornerRadius * Math.tan(toRadians(angleAlpha / 2));
  const angleBeta = 45 * cornerSmoothing;
  const c = p3ToP4Distance * Math.cos(toRadians(angleBeta));
  const d = c * Math.tan(toRadians(angleBeta));
  const b = (p - arcSectionLength - c - d) / 3;
  const a = 2 * b;

  const r = (val: number) => val.toFixed(3);

  const tr = cornerRadius
    ? `c ${r(a)} 0 ${r(a + b)} 0 ${r(a + b + c)} ${r(d)} a ${r(cornerRadius)} ${r(cornerRadius)} 0 0 1 ${r(arcSectionLength)} ${r(arcSectionLength)} c ${r(d)} ${r(c)} ${r(d)} ${r(b + c)} ${r(d)} ${r(a + b + c)}`
    : `l ${r(p)} 0`;

  const br = cornerRadius
    ? `c 0 ${r(a)} 0 ${r(a + b)} ${r(-d)} ${r(a + b + c)} a ${r(cornerRadius)} ${r(cornerRadius)} 0 0 1 ${r(-arcSectionLength)} ${r(arcSectionLength)} c ${r(-c)} ${r(d)} ${r(-(b + c))} ${r(d)} ${r(-(a + b + c))} ${r(d)}`
    : `l 0 ${r(p)}`;

  const bl = cornerRadius
    ? `c ${r(-a)} 0 ${r(-(a + b))} 0 ${r(-(a + b + c))} ${r(-d)} a ${r(cornerRadius)} ${r(cornerRadius)} 0 0 1 ${r(-arcSectionLength)} ${r(-arcSectionLength)} c ${r(-d)} ${r(-c)} ${r(-d)} ${r(-(b + c))} ${r(-d)} ${r(-(a + b + c))}`
    : `l ${r(-p)} 0`;

  const tl = cornerRadius
    ? `c 0 ${r(-a)} 0 ${r(-(a + b))} ${r(d)} ${r(-(a + b + c))} a ${r(cornerRadius)} ${r(cornerRadius)} 0 0 1 ${r(arcSectionLength)} ${r(-arcSectionLength)} c ${r(c)} ${r(-d)} ${r(b + c)} ${r(-d)} ${r(a + b + c)} ${r(-d)}`
    : `l 0 ${r(-p)}`;

  return `M ${r(width - p)} 0 ${tr} L ${r(width)} ${r(height - p)} ${br} L ${r(p)} ${r(height)} ${bl} L 0 ${r(p)} ${tl} Z`;
}

const TILE_CLIP = `path('${squirclePath(TILE, TILE, TILE_RADIUS, 1)}')`;

const TONES: Record<Exclude<ToastType, "default">, string> = {
  success: "bg-[#34C759] text-white dark:bg-[#30D158]",
  error: "bg-[#FF3B30] text-white dark:bg-[#FF453A]",
  warning: "bg-[#FF9500] text-white dark:bg-[#FF9F0A]",
  info: "bg-[#007AFF] text-white dark:bg-[#0A84FF]",
  loading: "bg-[#F4F4F9] text-[#868593] dark:bg-[#2C2C2E] dark:text-[#9B9AA7]",
};

/* ── Motion Springs & Timing ── */

const POP = { stiffness: 520, damping: 30 };
// critically damped, so the tile eases in smoothly without the glyph's bounce
const SETTLE = { stiffness: 320, damping: 36 };
const DRAW_MS = 300;
const DRAW_DELAY_MS = 100;
// the card enters first (~400ms), so the icon waits for most of it before smoothly blooming in
const ARRIVAL_MS = 320;
// a promise result waits for the spinner to leave, then the tile gives one soft bump
const LEAVE_MS = 140;
const BUMP_MS = 400;

/* ── The Store ── */

let toasts: ToastData[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const DEFAULT_DURATION = 4000;

function upsert(title: React.ReactNode, options: ToastOptions = {}): string {
  const id = options.id ?? `t${++counter}`;
  const existing = toasts.find((t) => t.id === id);
  const type = options.type ?? "default";
  const next: ToastData = {
    ...existing,
    ...options,
    id,
    title,
    type,
    duration: options.duration ?? existing?.duration ?? (type === "loading" ? Infinity : DEFAULT_DURATION),
    dismissible: options.dismissible ?? existing?.dismissible ?? true,
    version: (existing?.version ?? 0) + 1,
    dismissed: false,
  };
  toasts = existing ? toasts.map((t) => (t.id === id ? next : t)) : [next, ...toasts];
  emit();
  return id;
}

export function toast(title: React.ReactNode, options?: ToastOptions) {
  return upsert(title, options);
}

toast.success = (title: React.ReactNode, options?: Omit<ToastOptions, "type">) => upsert(title, { ...options, type: "success" });
toast.error = (title: React.ReactNode, options?: Omit<ToastOptions, "type">) => upsert(title, { ...options, type: "error" });
toast.warning = (title: React.ReactNode, options?: Omit<ToastOptions, "type">) => upsert(title, { ...options, type: "warning" });
toast.info = (title: React.ReactNode, options?: Omit<ToastOptions, "type">) => upsert(title, { ...options, type: "info" });
toast.loading = (title: React.ReactNode, options?: Omit<ToastOptions, "type">) => upsert(title, { ...options, type: "loading" });

toast.promise = <T,>(
  task: Promise<T> | (() => Promise<T>),
  messages: ToastPromiseMessages<T>,
  options: ToastOptions = {}
) => {
  const id = upsert(messages.loading, { ...options, type: "loading", description: messages.description, duration: Infinity });
  const pending = typeof task === "function" ? task() : task;
  pending
    .then((data) =>
      upsert(typeof messages.success === "function" ? messages.success(data) : messages.success, {
        ...options,
        id,
        type: "success",
        duration: options.duration,
      })
    )
    .catch((error) =>
      upsert(typeof messages.error === "function" ? messages.error(error) : messages.error, {
        ...options,
        id,
        type: "error",
        duration: options.duration,
      })
    );
  return pending;
};

toast.dismiss = (id?: string) => {
  toasts = toasts.map((t) => (id === undefined || t.id === id ? { ...t, dismissed: true } : t));
  emit();
};

const remove = (id: string) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getToasts = () => toasts;
const NONE: ToastData[] = [];
const getNone = () => NONE;

/* ── Motion & Animation Constants ── */

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const THROW = "cubic-bezier(0.34, 1.36, 0.64, 1)";
const GAP = 10;
const PEEK = 11;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

/* ── Vector Glyphs with Stroke Animations ── */

/** A stroke that draws itself once, after `delay` ms. */
function Stroke({ d, delay, reduced }: { d: string; delay: number; reduced: boolean }) {
  const ref = React.useRef<SVGPathElement>(null);
  React.useLayoutEffect(() => {
    if (reduced) return;
    ref.current?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: DRAW_MS, delay: DRAW_DELAY_MS + delay, easing: "ease-out", fill: "backwards" });
  }, [delay, reduced]);
  return <path ref={ref} d={d} pathLength={1} strokeDasharray={reduced ? undefined : 1} />;
}

function Glyph({ type, reduced, delay }: { type: ToastType; reduced: boolean; delay: number }) {
  if (type === "loading") {
    return (
      <svg viewBox="0 0 24 24" className="size-[18px] animate-spin motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round">
        <circle cx="12" cy="12" r="8" strokeOpacity={0.25} />
        <path d="M12 4a8 8 0 0 1 8 8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      {type === "success" && <Stroke d="M6 12.5l4 4 8-9" delay={delay} reduced={reduced} />}
      {type === "error" && (
        <>
          <Stroke d="M7.5 7.5l9 9" delay={delay} reduced={reduced} />
          <Stroke d="M16.5 7.5l-9 9" delay={delay} reduced={reduced} />
        </>
      )}
      {type === "warning" && (
        <>
          <Stroke d="M12 6v7" delay={delay} reduced={reduced} />
          <circle cx="12" cy="18" r="1.6" fill="currentColor" stroke="none" />
        </>
      )}
      {type === "info" && (
        <>
          <circle cx="12" cy="6.25" r="1.6" fill="currentColor" stroke="none" />
          <Stroke d="M12 11v7" delay={delay} reduced={reduced} />
        </>
      )}
    </svg>
  );
}

/** One glyph inside the tile: it pops in on a spring after `delay` ms. */
function GlyphSlot({ type, delay, reduced, ref }: { type: ToastType; delay: number; reduced: boolean; ref?: React.Ref<HTMLSpanElement> }) {
  const own = React.useRef<HTMLSpanElement>(null);
  React.useImperativeHandle(ref, () => own.current as HTMLSpanElement);
  React.useLayoutEffect(() => {
    const el = own.current;
    if (!el || reduced) return;
    const write = () => {
      el.style.transform = `scale(${scale.get().toFixed(4)})`;
      el.style.opacity = `${Math.min(1, Math.max(0, (scale.get() - 0.4) / 0.6)).toFixed(3)}`;
    };
    const scale = createSpring(0.4, POP, write, 0.002);
    write();
    const timer = window.setTimeout(() => scale.set(1), delay);
    return () => {
      window.clearTimeout(timer);
      scale.stop();
    };
  }, [delay, reduced]);
  return (
    <span ref={own} className="absolute inset-0 grid place-items-center">
      <Glyph type={type} reduced={reduced} delay={delay} />
    </span>
  );
}

function ToastIcon({ type }: { type: Exclude<ToastType, "default"> }) {
  const reduced = useInteractionReducedMotion();
  const tileRef = React.useRef<HTMLSpanElement>(null);
  const slotRef = React.useRef<HTMLSpanElement>(null);
  // only the first icon waits for the toast to land; a promise swap animates right away
  const [arrivingType] = React.useState(type);
  // The glyph on show lags the type by the time the old one takes to leave.
  const [shown, setShown] = React.useState(type);
  const settled = shown !== arrivingType;
  const delay = settled ? 0 : ARRIVAL_MS;

  // The tile blooms in once, as the card lands.
  React.useLayoutEffect(() => {
    const tile = tileRef.current;
    if (!tile || reduced) return;
    const write = () => {
      const k = bloom.get();
      tile.style.transform = `scale(${(0.85 + 0.15 * k).toFixed(4)})`;
      tile.style.opacity = `${Math.min(1, k).toFixed(3)}`;
    };
    const bloom = createSpring(0, SETTLE, write, 0.002);
    write();
    const timer = window.setTimeout(() => bloom.set(1), ARRIVAL_MS - 80);
    return () => {
      window.clearTimeout(timer);
      bloom.stop();
    };
    // Once, for the toast's first icon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new type: the old glyph shrinks away, then the new one pops in and the tile gives one soft bump.
  React.useEffect(() => {
    if (type === shown) return;
    if (reduced) {
      const now = window.setTimeout(() => setShown(type), 0);
      return () => window.clearTimeout(now);
    }
    slotRef.current?.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.5)", opacity: 0 }], { duration: LEAVE_MS, easing: "ease-in", fill: "forwards" });
    tileRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)", offset: 0.4 }, { transform: "scale(1)" }], { duration: BUMP_MS, delay: LEAVE_MS, easing: "ease-out" });
    const timer = window.setTimeout(() => setShown(type), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [type, shown, reduced]);

  return (
    <span
      ref={tileRef}
      aria-hidden="true"
      data-slot="toast-icon"
      style={{ width: TILE, height: TILE, clipPath: TILE_CLIP }}
      className={`relative shrink-0 transition-colors duration-200 motion-reduce:transition-none ${TONES[type]}`}
    >
      <GlyphSlot key={shown} ref={slotRef} type={shown} delay={delay} reduced={reduced} />
    </span>
  );
}

/* ── Card Component ── */

function ToastCard({
  data,
  index,
  expanded,
  frontHeight,
  height,
  offset,
  top,
  side,
  limit,
  paused,
  reduced,
  onHeight,
}: {
  data: ToastData;
  index: number;
  expanded: boolean;
  frontHeight: number;
  height: number;
  offset: number;
  top: boolean;
  side: "left" | "right" | "center";
  limit: number;
  paused: boolean;
  reduced: boolean;
  onHeight: (id: string, height: number | null) => void;
}) {
  const ref = React.useRef<HTMLLIElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(reduced);
  const [drag, setDrag] = React.useState<{ x: number; active: boolean }>({ x: 0, active: false });
  const [exitX, setExitX] = React.useState(0);
  const [boxSize, setBoxSize] = React.useState({ width: 0, height: 0 });
  const start = React.useRef<{ x: number; t: number } | null>(null);
  const leaving = data.dismissed;
  const sign = top ? 1 : -1;

  // Mount animation frame
  React.useEffect(() => {
    if (mounted) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setMounted(true))));
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [mounted]);

  React.useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      onHeight(data.id, el.offsetHeight);
      setBoxSize((prev) => (prev.width === el.offsetWidth && prev.height === el.offsetHeight ? prev : { width: el.offsetWidth, height: el.offsetHeight }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      onHeight(data.id, null);
    };
  }, [data.id, onHeight]);

  // Auto-dismiss timer (paused when hovered, focused, or tab hidden)
  React.useEffect(() => {
    if (data.type === "loading" || data.duration === Infinity || paused || leaving) return;
    const t = window.setTimeout(() => toast.dismiss(data.id), data.duration);
    return () => window.clearTimeout(t);
  }, [data.id, data.duration, data.type, data.version, paused, leaving]);

  // Leaving animation
  React.useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => remove(data.id), reduced ? 0 : 340);
    return () => window.clearTimeout(t);
  }, [leaving, data.id, reduced]);

  // Small failure shake
  const lastType = React.useRef(data.type);
  React.useEffect(() => {
    if (data.type === "error" && lastType.current !== "error" && !reduced) {
      innerRef.current?.animate(
        [
          { transform: "none" },
          { transform: "translateX(-5px)" },
          { transform: "translateX(5px)" },
          { transform: "translateX(-3px)" },
          { transform: "translateX(2px)" },
          { transform: "none" },
        ],
        { duration: 400, easing: "ease-out" }
      );
    }
    lastType.current = data.type;
  }, [data.type, reduced]);

  const hiddenBehind = index >= limit;
  const scale = expanded || reduced ? 1 : Math.max(0.85, 1 - index * 0.05);
  const placed = expanded ? sign * offset : sign * index * PEEK;
  const y = !mounted ? -sign * (frontHeight + 28) : leaving && !exitX ? placed - sign * 14 : placed;
  const x = leaving ? exitX || 0 : drag.x;
  const opacity = !mounted || leaving || hiddenBehind ? 0 : 1;
  const transform = `translate3d(${x}px, ${y}px, 0) scale(${leaving && !exitX ? scale * 0.95 : scale})`;
  const cardHeight = height ? (!expanded && index > 0 && frontHeight ? frontHeight : height) : undefined;

  // Kinetic swipe-to-dismiss handlers with rational rubber-banding
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    start.current = { x: e.clientX, t: e.timeStamp };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, active: true });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const toward = side === "left" ? -1 : 1;
    const movingOut = dx * toward > 0 || side === "center";
    const adjusted = movingOut ? dx : rubberBand(dx, 360, 0.45);
    setDrag({ x: adjusted, active: true });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dt = Math.max(1, e.timeStamp - start.current.t);
    const velocity = dx / dt;
    start.current = null;
    const projected = projectInertia(dx, velocity, 0.12);

    if (Math.abs(projected) > 80 || Math.abs(dx) > 100 || (Math.abs(velocity) > 0.45 && Math.abs(dx) > 20)) {
      setExitX(Math.sign(dx || velocity) * ((ref.current?.offsetWidth ?? 360) + 50));
      toast.dismiss(data.id);
    }
    setDrag({ x: 0, active: false });
  };

  // Squircle continuous path for card
  const outline = boxSize.width > 0 && boxSize.height > 0 ? squirclePath(boxSize.width, boxSize.height, CARD_RADIUS, 1) : null;

  return (
    <li
      ref={ref}
      data-toast={data.id}
      role={data.type === "error" ? "alert" : "status"}
      aria-live={data.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      aria-hidden={hiddenBehind && !expanded ? true : undefined}
      tabIndex={-1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`group/toast pointer-events-auto absolute inset-x-0 touch-pan-y select-none outline-none ${
        top ? "top-0 origin-bottom" : "bottom-0 origin-top"
      }`}
      style={{
        zIndex: 100 - index,
        transform,
        opacity,
        filter: !mounted || (leaving && !exitX) ? "blur(6px)" : "none",
        transition: reduced
          ? "none"
          : drag.active
            ? "none"
            : `transform ${leaving ? 340 : 520}ms ${mounted && !leaving && index === 0 ? THROW : EASE}, opacity ${
                leaving ? 220 : 360
              }ms ${EASE}, filter 360ms ${EASE}`,
      }}
    >
      <div
        className="relative h-full w-full [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.04))_drop-shadow(0_8px_20px_rgba(0,0,0,0.06))] dark:[filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.3))_drop-shadow(0_8px_24px_rgba(0,0,0,0.4))]"
        style={{ height: cardHeight, transition: reduced ? "none" : `height 420ms ${EASE}` }}
      >
        <div
          ref={innerRef}
          style={{
            padding: PADDING,
            borderRadius: CARD_RADIUS,
            clipPath: outline ? `path('${outline}')` : undefined,
          }}
          className="relative flex h-full items-center bg-popover text-popover-foreground transition-colors duration-200"
        >
          {/* Concentric squircle 1px hairline border & specular highlight */}
          {outline ? (
            <svg aria-hidden="true" width={boxSize.width} height={boxSize.height} className="pointer-events-none absolute inset-0">
              <path d={outline} fill="none" strokeWidth={2} className="stroke-border/75 dark:stroke-white/10" />
            </svg>
          ) : (
            <div className="pointer-events-none absolute inset-0 rounded-[21px] shadow-[inset_0_0_0_1px_var(--border)]" />
          )}

          {/* Toast Content */}
          <div
            className="flex min-w-0 flex-1 items-center gap-3 pr-8 transition-opacity duration-300 group-data-[expanded=false]/toast:group-data-[front=false]/toast:opacity-0 motion-reduce:transition-none"
            style={{ opacity: !expanded && index > 0 ? 0 : 1, transition: reduced ? "none" : `opacity 260ms ${EASE}` }}
          >
            {data.type !== "default" && <ToastIcon type={data.type} />}
            <div className={`flex min-h-9 min-w-0 flex-1 flex-col justify-center ${data.type === "default" ? "pl-1.5" : ""}`}>
              <div className="text-[13.5px] font-semibold leading-5 tracking-[-0.01em] text-foreground">
                {typeof data.title === "string" ? <TextMorph animateWidth={false}>{data.title}</TextMorph> : data.title}
              </div>
              {data.description && <div className="mt-0.5 text-[12.5px] font-medium leading-[18px] text-muted-foreground">{data.description}</div>}
            </div>
            {data.action && (
              <button
                type="button"
                onClick={() => {
                  data.action?.onClick();
                  toast.dismiss(data.id);
                }}
                className={`cursor-pointer -my-0.5 ml-2 inline-flex h-8 shrink-0 items-center rounded-xl bg-muted/80 px-3 text-[12.5px] font-semibold text-foreground outline-none transition-[background-color,transform] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-95 motion-reduce:transition-none ${FOCUS}`}
              >
                {data.action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          {data.dismissible && (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => toast.dismiss(data.id)}
              className={`cursor-pointer absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-[opacity,color,background-color] duration-200 hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/toast:opacity-100 [@media(hover:none)]:opacity-100 ${FOCUS}`}
            >
              <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3">
                <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/* ── Toaster Container ── */

export interface ToasterProps extends React.HTMLAttributes<HTMLElement> {
  position?: ToastPosition;
  /** How many show behind the newest when stacked. */
  visible?: number;
  /** Keyboard shortcut that moves focus to the toasts (with Alt). Defaults to 't'. */
  hotkey?: string;
  gap?: number;
}

export function Toaster({ position = "bottom-right", visible = 3, hotkey = "t", gap = GAP, className = "", ...props }: ToasterProps) {
  const reduced = useInteractionReducedMotion();
  const list = React.useSyncExternalStore(subscribe, getToasts, getNone);
  const [heights, setHeights] = React.useState<Record<string, number>>({});
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const regionRef = React.useRef<HTMLOListElement>(null);

  const top = position.startsWith("top");
  const side = position.endsWith("left") ? "left" : position.endsWith("right") ? "right" : "center";
  const expanded = hovered || focused || reduced;
  const paused = hovered || focused || hidden;

  const onHeight = React.useCallback(
    (id: string, h: number | null) =>
      setHeights((m) => {
        if (h !== null) return m[id] === h ? m : { ...m, [id]: h };
        if (!(id in m)) return m;
        const next = { ...m };
        delete next[id];
        return next;
      }),
    []
  );

  React.useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // A focused button that leaves with its toast never fires blur, which would pause the timers for good.
  React.useEffect(() => {
    if (!focused || regionRef.current?.contains(document.activeElement)) return;
    const timer = window.setTimeout(() => setFocused(false), 0);
    return () => window.clearTimeout(timer);
  }, [list, focused]);

  // Alt + T shortcut jumps to newest toast; Escape dismisses
  React.useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.code !== `Key${hotkey.toUpperCase()}`) return;
      e.preventDefault();
      regionRef.current?.querySelector<HTMLElement>("li")?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hotkey]);

  const shown = list.filter((t) => !t.dismissed);
  const front = shown[0];
  const frontHeight = front ? heights[front.id] ?? 0 : 0;

  const offsets: Record<string, number> = {};
  let acc = 0;
  for (const t of list) {
    offsets[t.id] = acc;
    if (!t.dismissed) acc += (heights[t.id] ?? 0) + gap;
  }
  const stackHeight = expanded ? Math.max(0, acc - gap) : frontHeight + Math.min(shown.length - 1, visible - 1) * PEEK;

  return (
    <section
      aria-label="Notifications (Alt+T)"
      className={`pointer-events-none fixed z-[90] flex w-[min(380px,calc(100vw-32px))] ${top ? "top-4" : "bottom-4"} ${
        side === "left" ? "left-4" : side === "right" ? "right-4" : "left-1/2 -translate-x-1/2"
      } ${className}`}
      {...props}
    >
      <ol
        ref={regionRef}
        tabIndex={-1}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setFocused(false)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          const id = (e.target as HTMLElement).closest<HTMLElement>("[data-toast]")?.dataset.toast;
          if (id) toast.dismiss(id);
        }}
        className={`relative w-full outline-none ${shown.length ? "pointer-events-auto" : ""}`}
        style={{ height: stackHeight, transition: reduced ? "none" : `height 420ms ${EASE}` }}
      >
        {list.map((t) => {
          const index = t.dismissed ? Math.max(0, shown.findIndex((s) => s.id === t.id)) : shown.indexOf(t);
          return (
            <ToastCard
              key={t.id}
              data={t}
              index={index < 0 ? 0 : index}
              expanded={expanded}
              frontHeight={frontHeight}
              height={heights[t.id] ?? 0}
              offset={offsets[t.id] ?? 0}
              top={top}
              side={side}
              limit={visible}
              paused={paused}
              reduced={reduced}
              onHeight={onHeight}
            />
          );
        })}
      </ol>
    </section>
  );
}

export default Toaster;
