"use client";

import * as React from "react";
import { FooterCaption, FooterLockup, FooterNav, plateColors, resolveColor, type FooterColumn, type FooterLink } from "./footer-parts";
import { createRidgeRenderer, readRidgeRgb, type Rgb, type RidgeRenderer } from "./ridge-gl";
import { useInteractionReducedMotion } from "./ui-interaction-motion";

/*
 * A footer that ends in a range of mountains, printed in dots: five ridges in an ordered
 * dither, a low sun, and the brand's name standing among the peaks. The text sits in the
 * sky above. The ridges drift apart a little as the pointer moves (nearer ones move more),
 * and reading a column pans the view toward it.
 */

export type RidgeLink = FooterLink;
export type RidgeColumn = FooterColumn;

export interface RidgeFooterProps {
  /** Brand name: shown in the lockup and set among the mountains. */
  wordmark: string;
  /** Optional logo beside the name. */
  logo?: React.ReactNode;
  /** One short line about the product. */
  tagline?: string;
  /** A contact link under the tagline, e.g. an email address. */
  contact?: RidgeLink;
  /** Link columns. */
  columns?: RidgeColumn[];
  /** "auto" follows the theme; "night" keeps the dusk plate on light pages too. */
  tone?: "auto" | "night";
  /** The ink of the mountains and the sun. Any CSS colour or token. Defaults to `var(--chart-1)`. */
  accent?: string;
  /** Copyright line. */
  legal?: string;
  /** Small links beside the copyright. */
  legalLinks?: RidgeLink[];
  className?: string;
}

const NO_COLUMNS: RidgeColumn[] = [];
const NO_LINKS: RidgeLink[] = [];
const DEFAULT_ACCENT = "var(--chart-1, var(--primary))";

function seedFromString(s: string): number {
  let h = 13;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return (h % 47) * 0.37;
}

function DefaultMark() {
  return (
    <svg viewBox="0 0 26 26" className="size-[26px] shrink-0" aria-hidden="true">
      <rect x="0.5" y="0.5" width="25" height="25" rx="6.5" fill="color-mix(in oklab, var(--fp-accent) 14%, transparent)" stroke="color-mix(in oklab, var(--fp-accent) 36%, transparent)" />
      <circle cx="17" cy="8.5" r="2.5" fill="var(--fp-accent)" />
      <path d="M5 19.5 10.5 11.5l3.3 4.6 2.2-2.7 4.5 6.1Z" fill="currentColor" opacity="0.88" />
    </svg>
  );
}

function drawRidgeWordMask(ctx: CanvasRenderingContext2D, word: string, w: number, h: number, sceneTop: number, sceneH: number, family: string) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const label = word.trim() || "Ridge";
  const setFont = (size: number) => {
    ctx.font = `700 ${size}px ${family}`;
    if ("letterSpacing" in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(-0.045 * size).toFixed(2)}px`;
    }
  };
  setFont(100);
  const m = ctx.measureText(label);
  const hRatio = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 100 || 0.72;
  const size = Math.max(24, Math.min((w * 0.88) / Math.max(0.5, m.width / 100), (sceneH * 0.56) / hRatio));
  setFont(size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgb(255, 0, 0)";
  ctx.fillText(label, w * 0.5, sceneTop + sceneH * 0.55);
}

export function RidgeFooter({
  wordmark,
  logo,
  tagline,
  contact,
  columns = NO_COLUMNS,
  tone = "auto",
  accent = DEFAULT_ACCENT,
  legal,
  legalLinks = NO_LINKS,
  className = "",
}: RidgeFooterProps) {
  const reduced = useInteractionReducedMotion();
  const plateRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const parallaxTargetRef = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const plate = plateRef.current;
    const canvas = canvasRef.current;
    const sceneBand = sceneRef.current;
    if (!plate || !canvas || !sceneBand) return;

    let renderer: RidgeRenderer | null = null;
    try {
      renderer = createRidgeRenderer(canvas);
    } catch {
      renderer = null;
    }
    if (!renderer) return;
    const gl = renderer;

    let raf = 0;
    let visible = false;
    let hidden = document.hidden;
    let disposed = false;
    let revealStart = -1;
    let born = performance.now();
    let px = 0;
    let py = 0;

    const readColors = (): [Rgb, Rgb, Rgb, boolean] => {
      const css = getComputedStyle(plate);
      const paper = readRidgeRgb(css.backgroundColor, [0.06, 0.07, 0.1]);
      const fg = readRidgeRgb(css.color, [0.92, 0.94, 0.98]);
      const primary = readRidgeRgb(resolveColor(plate, "var(--fp-accent)"), [0.19, 0.36, 0.87]);
      const lum = 0.2126 * paper[0] + 0.7152 * paper[1] + 0.0722 * paper[2];
      const isDark = tone === "night" || lum < 0.42;
      return [paper, fg, primary, isDark];
    };

    const seed = seedFromString(wordmark);

    const measure = () => {
      if (disposed) return;
      const box = plate.getBoundingClientRect();
      const band = sceneBand.getBoundingClientRect();
      const w = Math.max(1, box.width);
      const h = Math.max(1, box.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(w * dpr);
      const H = Math.round(h * dpr);
      const topFrac = Math.max(0.05, Math.min(0.9, (band.top - box.top) / h));
      gl.layout(W, H, dpr, topFrac, seed);

      const mask = document.createElement("canvas");
      mask.width = W;
      mask.height = H;
      const mctx = mask.getContext("2d");
      if (mctx) {
        const family = getComputedStyle(plate).fontFamily || "system-ui, sans-serif";
        drawRidgeWordMask(mctx, wordmark, W, H, (band.top - box.top) * dpr, band.height * dpr, family);
        gl.mask(mask);
      }
      gl.colors(...readColors());
      if (reduced) gl.draw(0, 1, 0, 0);
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed || !visible || hidden || reduced) return;
      if (revealStart < 0) revealStart = now;
      const reveal = 1 - Math.pow(1 - Math.min(1, (now - revealStart) / 1300), 3);
      const t = (now - born) / 1000;
      const tgt = parallaxTargetRef.current;
      px += (tgt.x - px) * 0.07;
      py += (tgt.y - py) * 0.07;
      gl.draw(t, reveal, px, py);
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!raf && visible && !hidden && !reduced && !disposed) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (disposed) return;
      born = performance.now();
      measure();
      plate.dataset.ready = "";
      kick();
    };
    if (document.fonts?.status === "loaded") start();
    else document.fonts.ready.then(start, start);

    const ro = new ResizeObserver(() => !disposed && plate.dataset.ready !== undefined && measure());
    ro.observe(plate);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && reduced) gl.draw(0, 1, 0, 0);
        else kick();
      },
      { threshold: 0.12 },
    );
    io.observe(plate);

    const onVis = () => {
      hidden = document.hidden;
      if (!hidden) kick();
    };
    document.addEventListener("visibilitychange", onVis);

    const mo = new MutationObserver(() => {
      gl.colors(...readColors());
      if (reduced) gl.draw(0, 1, 0, 0);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });

    const onMove = (e: PointerEvent) => {
      if (reduced || e.pointerType === "touch") return;
      const r = plate.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
      const ny = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
      parallaxTargetRef.current = { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };
    };
    const onLeave = () => {
      parallaxTargetRef.current = { x: 0, y: 0 };
    };

    plate.addEventListener("pointermove", onMove);
    plate.addEventListener("pointerleave", onLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      plate.removeEventListener("pointermove", onMove);
      plate.removeEventListener("pointerleave", onLeave);
      gl.dispose();
      delete plate.dataset.ready;
    };
  }, [wordmark, tone, accent, reduced]);

  const panToColumn = (index: number, total: number) => {
    if (reduced) return;
    const norm = total <= 1 ? 0 : (index / (total - 1)) * 2 - 1;
    parallaxTargetRef.current = { x: norm * 0.72, y: -0.15 };
  };

  return (
    <footer className={`w-full max-w-[1200px] ${className}`}>
      <div aria-hidden="true" data-natural-width className="grid h-0" style={{ gridTemplateColumns: "minmax(0, 1200px)" }} />
      <div className="@container w-full">
        <div ref={plateRef} className="group/plate relative isolate touch-pan-y overflow-clip rounded-[28px]" style={plateColors(tone === "night", accent)}>
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 size-full opacity-0 transition-opacity duration-700 group-data-[ready]/plate:opacity-100"
          />

          <div className="grid grid-cols-1 gap-x-10 gap-y-9 px-[max(20px,5cqi)] pt-[clamp(28px,4.5cqi,56px)] @[700px]:grid-cols-[minmax(0,1fr)_auto]">
            <FooterLockup logo={logo ?? <DefaultMark />} name={wordmark} tagline={tagline} contact={contact} />
            <FooterNav
              columns={columns}
              onAim={(el, index) => {
                if (el) panToColumn(index, columns.length);
                else parallaxTargetRef.current = { x: 0, y: 0 };
              }}
            />
          </div>

          {/* The range. Until WebGL is ready, and without it, the name shows as faint type. */}
          <div ref={sceneRef} aria-hidden="true" className="relative mt-[clamp(8px,2cqi,24px)] h-[clamp(210px,30cqi,360px)] w-full select-none">
            <p className="absolute inset-0 flex items-center justify-center text-[15cqi] font-bold tracking-[-0.045em] opacity-20 transition-opacity duration-700 group-data-[ready]/plate:opacity-0">
              {wordmark}
            </p>
          </div>

          {/* The nearest ridge is dark in both themes, so the small print is always light. */}
          <div style={{ color: "color-mix(in oklab, white 88%, var(--fp-accent))" }}>
            <FooterCaption legal={legal} links={legalLinks} className="relative px-[max(20px,5cqi)] pb-[clamp(18px,2.4cqi,26px)] pt-2" />
          </div>
        </div>
      </div>
    </footer>
  );
}
