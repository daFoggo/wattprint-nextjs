"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  EASE_OUT,
  INTERACTION_FOCUS,
  INTERACTION_PRESS,
  MATERIAL_LIFT,
  createSpring,
  useInteractionReducedMotion,
  type Spring,
} from "./ui-interaction-motion";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";
import { playSound } from "./ui-sounds";

/* ─────────────────────────────────────────────────────────
 * PAGE OUTLINE: spring-guided stepped hairline TOC & scroll pill
 *
 *   path     measures each heading row and builds one continuous
 *            stepped SVG hairline track (indenting smoothly along
 *            a crisp 45° elbow for nested H3 sections). Coupled
 *            createSpring springs drive stroke-dasharray and
 *            stroke-dashoffset directly on the SVG path so the
 *            active indicator literally glides around corners.
 *
 *   variants "rail" for sticky desktop docs sidebars; "pill" for
 *            a compact floating reading pill with a circular
 *            progress ring that unfolds into the full stepped
 *            outline on tap and folds cleanly back on jump.
 *
 *   spy      tracks either window scroll or any scrollable
 *            containerRef, locking cleanly to the last section at
 *            the bottom and respecting prefers-reduced-motion.
 * ───────────────────────────────────────────────────────── */

export interface OutlineItem {
  /** Matching DOM element id on the page or inside containerRef. */
  id: string;
  /** Heading label shown in the outline and collapsed pill. */
  title: string;
  /** Heading depth: 2 for top-level sections, 3 (or higher) for indented sub-sections. */
  level?: number;
}

export interface PageOutlineProps extends Omit<React.HTMLAttributes<HTMLElement>, "onSelect"> {
  /** Ordered list of document headings to track. */
  items: OutlineItem[];
  /** "rail" renders a sidebar outline; "pill" renders a compact expanding reading pill (default "rail"). */
  variant?: "rail" | "pill";
  /** Optional scroll container to spy on; defaults to the browser window. */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Controlled active heading id (bypasses automatic scroll-spy when supplied). */
  activeId?: string;
  /** Controlled reading progress 0..1 (bypasses automatic scroll-spy when supplied). */
  progress?: number;
  /** Called whenever the user clicks a section or scroll-spy updates the active heading. */
  onActiveChange?: (id: string) => void;
  /** Reading line offset from top of viewport or container in px (default 84). */
  topOffset?: number;
  /** Heading above the rail outline (default "On this page"). */
  title?: string;
  /** Show circular scroll ring and reading percentage (default true). */
  showProgress?: boolean;
  /** Highlight already-read portion of the stepped rail (default true). */
  showTrail?: boolean;
  /** Direction the pill outline panel opens: "down" (default) or "up". */
  popoverSide?: "down" | "up";
  /** Opt-in quiet Web Audio tick on section jump (from ui-sounds.ts). */
  sound?: boolean;
}

interface PathSegment {
  id: string;
  startLen: number;
  endLen: number;
}

interface RailGeometry {
  width: number;
  height: number;
  d: string;
  totalLen: number;
  segments: PathSegment[];
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v: number) => (Number.isFinite(v) ? clamp(v, 0, 1) : 0);

function ProgressRing({ progress, size = 16 }: { progress: number; size?: number }) {
  const stroke = 1.75;
  const r = (size - stroke) * 0.5;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamp01(progress));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

interface SteppedListProps {
  items: OutlineItem[];
  activeId: string;
  showTrail: boolean;
  reduced: boolean;
  onJump: (id: string) => void;
}

function SteppedRailList({ items, activeId, showTrail, reduced, onJump }: SteppedListProps) {
  const listRef = React.useRef<HTMLUListElement>(null);
  const activePathRef = React.useRef<SVGPathElement>(null);
  const trailPathRef = React.useRef<SVGPathElement>(null);
  const geomRef = React.useRef<RailGeometry | null>(null);
  const [geom, setGeom] = React.useState<RailGeometry | null>(null);

  const springsRef = React.useRef<{ start: Spring; end: Spring } | null>(null);

  // Measure real row positions and synthesize one continuous stepped SVG hairline path
  const measureRail = React.useCallback(() => {
    const list = listRef.current;
    if (!list || items.length === 0) return;

    const rowEls = list.querySelectorAll<HTMLElement>("[data-outline-row]");
    if (rowEls.length !== items.length) return;

    const X_ROOT = 2;
    const X_NEST = 12;
    const cmds: string[] = [];
    const segments: PathSegment[] = [];

    let curX = 0;
    let curY = 0;
    let totalLen = 0;

    for (let i = 0; i < items.length; i++) {
      const row = rowEls[i];
      const depth = (items[i].level ?? 2) > 2 ? 1 : 0;
      const x = depth > 0 ? X_NEST : X_ROOT;
      const top = row.offsetTop + 5;
      const bottom = row.offsetTop + Math.max(14, row.offsetHeight - 5);

      if (i === 0) {
        cmds.push(`M ${x} ${top}`);
        curX = x;
        curY = top;
      } else if (x !== curX) {
        // Crisp 45° architectural step connector between H2 and H3 depths
        const stepH = Math.min(Math.abs(x - curX), Math.max(4, top - curY));
        const midY = top - stepH;
        if (midY > curY) {
          cmds.push(`L ${curX} ${midY}`);
          totalLen += midY - curY;
          curY = midY;
        }
        cmds.push(`L ${x} ${top}`);
        totalLen += Math.hypot(x - curX, top - curY);
        curX = x;
        curY = top;
      } else if (top > curY) {
        cmds.push(`L ${x} ${top}`);
        totalLen += top - curY;
        curY = top;
      }

      const segStart = totalLen;
      cmds.push(`L ${x} ${bottom}`);
      totalLen += Math.max(0, bottom - curY);
      const segEnd = totalLen;
      curY = bottom;

      segments.push({ id: items[i].id, startLen: segStart, endLen: segEnd });
    }

    const nextGeom: RailGeometry = {
      width: 16,
      height: Math.max(1, list.offsetHeight),
      d: cmds.join(" "),
      totalLen: Math.max(1, totalLen),
      segments,
    };

    geomRef.current = nextGeom;
    setGeom(nextGeom);
  }, [items]);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(() => measureRail());
    ro.observe(list);
    return () => ro.disconnect();
  }, [measureRail]);

  // Paint active spring-gliding path stroke + read trail directly on the SVG <path> elements
  const paintStroke = React.useCallback(() => {
    const sp = springsRef.current;
    const g = geomRef.current;
    const activeEl = activePathRef.current;
    if (!sp || !g || !activeEl) return;

    const s = clamp(sp.start.get(), 0, g.totalLen);
    const e = clamp(sp.end.get(), s + 2, g.totalLen);
    const len = Math.max(2, e - s);

    activeEl.style.strokeDasharray = `${len.toFixed(2)} ${(g.totalLen + 10).toFixed(2)}`;
    activeEl.style.strokeDashoffset = `${(-s).toFixed(2)}`;

    if (trailPathRef.current) {
      trailPathRef.current.style.strokeDasharray = `${s.toFixed(2)} ${(g.totalLen + 10).toFixed(2)}`;
      trailPathRef.current.style.strokeDashoffset = "0";
    }
  }, []);

  React.useEffect(() => {
    const start = createSpring(0, { stiffness: 250, damping: 25 }, paintStroke, 0.15);
    const end = createSpring(18, { stiffness: 280, damping: 26 }, paintStroke, 0.15);
    springsRef.current = { start, end };
    return () => {
      start.stop();
      end.stop();
      springsRef.current = null;
    };
  }, [paintStroke]);

  // Aim coupled springs at the active heading's exact arc-length segment along the stepped path!
  const seededRef = React.useRef(false);
  React.useEffect(() => {
    const sp = springsRef.current;
    if (!sp || !geom) return;
    const seg = geom.segments.find((s) => s.id === activeId) ?? geom.segments[0];
    if (!seg) return;

    if (!seededRef.current || reduced) {
      sp.start.jump(seg.startLen);
      sp.end.jump(seg.endLen);
      seededRef.current = true;
    } else {
      sp.start.set(seg.startLen);
      sp.end.set(seg.endLen);
    }
    paintStroke();
  }, [activeId, geom, reduced, paintStroke]);

  return (
    <div className="relative">
      {geom && (
        <svg
          width={geom.width}
          height={geom.height}
          viewBox={`0 0 ${geom.width} ${geom.height}`}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
        >
          {/* Base stepped hairline track */}
          <path d={geom.d} fill="none" stroke="var(--border)" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />

          {/* Subtle already-read trail along the stepped path */}
          {showTrail && (
            <path
              ref={trailPathRef}
              d={geom.d}
              fill="none"
              stroke="var(--foreground)"
              strokeOpacity={0.28}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active spring-gliding indicator curving cleanly around every 45° elbow */}
          <path
            ref={activePathRef}
            d={geom.d}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <ul ref={listRef} className="flex flex-col">
        {items.map((item) => {
          const isNested = (item.level ?? 2) > 2;
          const isActive = item.id === activeId;
          return (
            <li key={item.id} data-outline-row={item.id}>
              <button
                type="button"
                aria-current={isActive ? "location" : undefined}
                onClick={() => onJump(item.id)}
                className={`block w-full cursor-pointer rounded-[8px] py-1.5 pr-2 text-left text-[13px] leading-5 transition-colors duration-150 ${
                  isNested ? "pl-6" : "pl-4"
                } ${
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                } ${INTERACTION_FOCUS}`}
              >
                <span className="block truncate">{item.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PageOutline({
  items,
  variant = "rail",
  containerRef,
  activeId: controlledActiveId,
  progress: controlledProgress,
  onActiveChange,
  topOffset = 84,
  title = "On this page",
  showProgress = true,
  showTrail = true,
  popoverSide = "down",
  sound = false,
  className = "",
  ...props
}: PageOutlineProps) {
  const reduced = useInteractionReducedMotion();
  const [ownActiveId, setOwnActiveId] = React.useState<string>(() => items[0]?.id ?? "");
  const [ownProgress, setOwnProgress] = React.useState(0);
  const [pillOpen, setPillOpen] = React.useState(false);

  const navRef = React.useRef<HTMLElement>(null);
  const scrollLockRef = React.useRef<{ id: string; until: number } | null>(null);

  const activeId = controlledActiveId ?? (items.some((i) => i.id === ownActiveId) ? ownActiveId : items[0]?.id ?? "");
  const progress = controlledProgress !== undefined ? clamp01(controlledProgress) : ownProgress;

  // Real-time scroll-spy tracking either a scrollable containerRef or full window scroll
  React.useEffect(() => {
    if (controlledActiveId !== undefined && controlledProgress !== undefined) return;
    if (items.length === 0) return;

    let raf = 0;

    const compute = () => {
      raf = 0;
      const container = containerRef?.current ?? null;
      const scrollTop = container ? container.scrollTop : window.scrollY;
      const scrollHeight = container ? container.scrollHeight : document.documentElement.scrollHeight;
      const clientHeight = container ? container.clientHeight : window.innerHeight;
      const maxScroll = Math.max(1, scrollHeight - clientHeight);
      const nextProgress = clamp01(scrollTop / maxScroll);

      if (controlledProgress === undefined) setOwnProgress(nextProgress);

      // Avoid flicker while smooth-scrolling to a clicked target
      if (scrollLockRef.current && Date.now() < scrollLockRef.current.until) return;

      if (controlledActiveId === undefined) {
        let nextActive = items[0].id;
        // Lock cleanly to the final section when scrolled to the bottom
        if (scrollTop >= maxScroll - 8) {
          nextActive = items[items.length - 1].id;
        } else {
          const baseTop = container ? container.getBoundingClientRect().top : 0;
          for (const item of items) {
            const targetEl = container
              ? container.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`)
              : document.getElementById(item.id);
            if (!targetEl) continue;
            const relTop = targetEl.getBoundingClientRect().top - baseTop;
            if (relTop <= topOffset) nextActive = item.id;
            else break;
          }
        }
        setOwnActiveId((prev) => {
          if (prev !== nextActive) onActiveChange?.(nextActive);
          return nextActive;
        });
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    onScroll();
    const target: EventTarget = containerRef?.current ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items, containerRef, controlledActiveId, controlledProgress, topOffset, onActiveChange]);

  // Close pill popover on click-outside or Escape
  React.useEffect(() => {
    if (!pillOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setPillOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPillOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pillOpen]);

  const handleJump = React.useCallback(
    (id: string) => {
      const container = containerRef?.current ?? null;
      const targetEl = container
        ? container.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
        : document.getElementById(id);

      scrollLockRef.current = { id, until: Date.now() + 550 };
      if (controlledActiveId === undefined) setOwnActiveId(id);
      onActiveChange?.(id);
      if (sound) playSound("tick", 0.3);

      if (targetEl) {
        if (container) {
          const cRect = container.getBoundingClientRect();
          const tRect = targetEl.getBoundingClientRect();
          const dest = container.scrollTop + (tRect.top - cRect.top) - Math.max(16, topOffset - 56);
          container.scrollTo({ top: Math.max(0, dest), behavior: reduced ? "auto" : "smooth" });
        } else {
          const dest = window.scrollY + targetEl.getBoundingClientRect().top - Math.max(16, topOffset - 24);
          window.scrollTo({ top: Math.max(0, dest), behavior: reduced ? "auto" : "smooth" });
        }
      }

      if (variant === "pill") setPillOpen(false);
    },
    [containerRef, controlledActiveId, onActiveChange, sound, topOffset, reduced, variant],
  );

  const activeItem = items.find((i) => i.id === activeId) ?? items[0];
  const pct = Math.round(progress * 100);

  if (variant === "pill") {
    return (
      <nav ref={navRef} aria-label={title} className={`relative inline-flex flex-col items-start ${className}`} {...props}>
        <button
          type="button"
          aria-expanded={pillOpen}
          onClick={() => setPillOpen((v) => !v)}
          className={`inline-flex h-10 max-w-[280px] cursor-pointer items-center gap-2.5 rounded-full border border-border bg-card px-3.5 text-[13px] text-card-foreground hover:bg-[color-mix(in_oklab,var(--card)_92%,var(--foreground)_8%)] ${MATERIAL_LIFT} ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
        >
          {showProgress && (
            <span className="text-foreground">
              <ProgressRing progress={progress} size={16} />
            </span>
          )}
          <span className="min-w-0 truncate font-medium text-foreground">
            <TextMorph>{activeItem?.title ?? title}</TextMorph>
          </span>
          {showProgress && (
            <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
              <NumberRoll value={pct} suffix="%" duration={420} />
            </span>
          )}
          <ChevronDown
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${pillOpen ? "rotate-180" : ""}`}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        {/* Unfolding stepped-path outline card */}
        <div
          aria-hidden={!pillOpen || undefined}
          className={`absolute left-0 z-30 w-[256px] overflow-hidden rounded-[15px] border border-border bg-card p-3 text-card-foreground ${MATERIAL_LIFT} ${
            popoverSide === "up" ? "bottom-[calc(100%_+_8px)] origin-bottom-left" : "top-[calc(100%_+_8px)] origin-top-left"
          } ${pillOpen ? "pointer-events-auto opacity-100 scale-100" : "pointer-events-none opacity-0 scale-[0.96]"}`}
          style={{ transition: reduced ? "none" : `opacity 180ms ${EASE_OUT}, transform 220ms ${EASE_OUT}` }}
        >
          <div className="mb-2 flex items-center justify-between px-1 text-[11.5px] font-medium text-muted-foreground">
            <span>{title}</span>
            {showProgress && (
              <span className="font-mono tabular-nums">
                <NumberRoll value={pct} suffix="%" duration={420} />
              </span>
            )}
          </div>
          <SteppedRailList items={items} activeId={activeId} showTrail={showTrail} reduced={reduced} onJump={handleJump} />
        </div>
      </nav>
    );
  }

  return (
    <nav ref={navRef} aria-label={title} className={`flex w-full flex-col gap-2.5 ${className}`} {...props}>
      <div className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground/85">{title}</span>
        {showProgress && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] tabular-nums">
            <ProgressRing progress={progress} size={14} />
            <NumberRoll value={pct} suffix="%" duration={420} />
          </span>
        )}
      </div>

      <SteppedRailList items={items} activeId={activeId} showTrail={showTrail} reduced={reduced} onJump={handleJump} />
    </nav>
  );
}

export default PageOutline;
