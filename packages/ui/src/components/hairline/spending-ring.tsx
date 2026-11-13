"use client";

import * as React from "react";
import { useHairlineText } from "../hairline-text"; // patched (hairline/patch.mjs)
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";
import { createSpring, INTERACTION_FOCUS, useInteractionReducedMotion, type Spring } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * SPENDING RING: where the money went, and what's inside
 *
 *   tiles     each category is a thick tile of the ring with
 *             its amount written on it, so the ring reads on
 *             its own; no legend needed (legend adds a list)
 *   point     point at a tile (or tab to it) and it slides out
 *             while the others turn to the muted surface; the
 *             centre's label morphs to it and the total rolls
 *   open      click a category and its tile splits into its
 *             parts, then blooms open from where it sits,
 *             pushing the others out of the ring until it is
 *             the whole ring: Food becomes Groceries, Dining
 *             and Coffee. "All" (or Escape) folds it home.
 *   budget    the overspent end of a tile is hatched in red
 *
 * Every angle is computed from one spring, so an open can be
 * turned back mid-way and nothing jumps. Tiles are buttons:
 * Tab to point, Enter to open.
 * ───────────────────────────────────────────────────────── */

export interface SpendCategory {
  id: string;
  label: string;
  value: number;
  /** Over this, the overspent end of the tile is hatched in red and the centre says so. */
  budget?: number;
  /** Any CSS colour. Top-level slices without one take --chart-1 to --chart-5; parts take shades of their category. */
  color?: string;
  /** What the category is made of. A category with parts opens into its own ring. */
  children?: SpendCategory[];
}

export interface SpendingRingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  data: SpendCategory[];
  /** Above the total while nothing is open, e.g. "Spent in October". */
  label?: string;
  format?: Intl.NumberFormatOptions;
  locales?: string | string[];
  /** The open category's id; controlled. */
  open?: string | null;
  defaultOpen?: string | null;
  onOpenChange?: (id: string | null) => void;
  /** Ring diameter in px. */
  size?: number;
  thickness?: number;
  /** Also list the categories under the ring. */
  legend?: boolean;
}

const GAP = 5; // px between tiles, measured along the middle of the ring
const CORNER = 7; // px, the tiles' corner radius
const LIFT = 5; // px a pointed tile moves out
const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
// Parts are lighter and darker steps of their category's colour, so they read as one family in light and dark.
const SHADES = [0, 0.12, -0.12, 0.2, -0.2, 0.06];
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sum = (list: SpendCategory[]) => list.reduce((s, c) => s + Math.max(0, c.value), 0);
const RAD = Math.PI / 180;
// Ink that reads on a colour: black on light tiles, white on dark ones (relative colour, so it follows the theme).
const inkOn = (fill: string) => `oklch(from ${fill} calc((0.7 - l) * 100) 0 0)`;

/** A tile of the ring: an annular sector from a0 to a1 degrees (0 at the top, clockwise), corners rounded by ca / cb. */
function sector(c: number, r0: number, r1: number, a0: number, a1: number, ca = CORNER, cb = CORNER) {
  if (a1 - a0 <= 0.01) return "";
  const pt = (r: number, deg: number) => {
    const a = (deg - 90) * RAD;
    return `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  };
  // Corners can't be bigger than half the tile in either direction.
  const fit = (k: number) => Math.max(0, Math.min(k, (r1 - r0) / 2, (((a1 - a0) * RAD) * r0) / 2 - 0.01));
  const A = fit(ca), B = fit(cb);
  const oA = A / r1 / RAD, iA = A / r0 / RAD, oB = B / r1 / RAD, iB = B / r0 / RAD;
  const big = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${pt(r1, a0 + oA)}`,
    `A ${r1} ${r1} 0 ${big} 1 ${pt(r1, a1 - oB)}`,
    `Q ${pt(r1, a1)} ${pt(r1 - B, a1)}`,
    `L ${pt(r0 + B, a1)}`,
    `Q ${pt(r0, a1)} ${pt(r0, a1 - iB)}`,
    `A ${r0} ${r0} 0 ${big} 0 ${pt(r0, a0 + iA)}`,
    `Q ${pt(r0, a0)} ${pt(r0 + A, a0)}`,
    `L ${pt(r1 - A, a0)}`,
    `Q ${pt(r1, a0)} ${pt(r1, a0 + oA)}`,
    "Z",
  ].join(" ");
}

type Shown = { id: string; label: string; value: number; color: string; budget?: number; share: number; parent?: SpendCategory };

export function SpendingRing({
  data,
  label = "Spent",
  format,
  locales,
  open: openProp,
  defaultOpen = null,
  onOpenChange,
  size = 256,
  thickness = 42,
  legend = false,
  className = "",
  ...props
}: SpendingRingProps) {
  const t = useHairlineText(); // patched (hairline/patch.mjs)
  const reduced = useInteractionReducedMotion();
  const hatch = React.useId().replace(/:/g, "");
  const [openState, setOpenState] = React.useState<string | null>(defaultOpen);
  const open = openProp !== undefined ? openProp : openState;
  const [point, setPoint] = React.useState<string | null>(null);
  // The category whose parts are drawn: the open one, and it stays while it folds back home.
  const [unfolded, setUnfolded] = React.useState<string | null>(open);

  const colour = (c: SpendCategory, i: number) => c.color ?? PALETTE[i % PALETTE.length];
  const total = sum(data);
  const home = data.find((c) => c.id === unfolded) ?? null;
  const homeIndex = home ? data.indexOf(home) : -1;
  const parts = home?.children ?? [];
  const partColour = (c: SpendCategory, i: number) =>
    c.color ?? `oklch(from ${colour(home!, homeIndex)} calc(l + ${SHADES[i % SHADES.length]}) c h)`;
  const money = (n: number) => new Intl.NumberFormat(locales, format).format(n);

  const setOpen = React.useCallback(
    (id: string | null) => {
      if (openProp === undefined) setOpenState(id);
      onOpenChange?.(id);
    },
    [openProp, onOpenChange],
  );

  const svg = React.useRef<SVGSVGElement>(null);
  const live = React.useRef({ data, total, unfolded, open, thickness, size });
  React.useLayoutEffect(() => {
    live.current = { data, total, unfolded, open, thickness, size };
  });

  // One spring opens and closes; each tile has its own for pointing (1 lifted, -1 stepped back).
  const paintRef = React.useRef<() => void>(() => {});
  // Made on first use (from an effect or an event, never while rendering), starting where the ring first rendered.
  const springsRef = React.useRef<{ open: Spring; point: Map<string, Spring> } | null>(null);
  const getSprings = React.useCallback(() => {
    if (!springsRef.current) {
      springsRef.current = {
        open: createSpring(live.current.unfolded && live.current.open ? 1 : 0, { stiffness: 64, damping: 16 }, () => paintRef.current()),
        point: new Map(),
      };
    }
    return springsRef.current;
  }, []);

  const draw = React.useCallback(() => {
    const root = svg.current;
    if (!root) return;
    const s = getSprings();
    const { data: list, total: whole, unfolded: id, thickness: T, size: D } = live.current;
    const p = clamp01(s.open.get());
    const C = D / 2, R = C - T / 2 - LIFT - 3;
    const gapDeg = GAP / R / RAD;
    const spans = list.map((c) => (whole > 0 ? (360 * Math.max(0, c.value)) / whole : 0));
    const k = list.findIndex((c) => c.id === id);
    const emphasis = (key: string) => s.point.get(key)?.get() ?? 0;
    type Paint = { opacity?: number; width?: number; budget?: { value: number; budget?: number }; ca?: number; cb?: number; text?: number };
    const paint = (key: string, from: number, to: number, { opacity = 1, width = T, budget, ca = CORNER, cb = CORNER, text = 1 }: Paint = {}) => {
      const tile = root.querySelector<SVGGElement>(`[data-tile="${CSS.escape(key)}"]`);
      if (!tile) return;
      const shape = tile.querySelector<SVGPathElement>("[data-shape]")!;
      const e = emphasis(key);
      const lift = Math.max(0, e), quiet = Math.max(0, -e);
      const mid = ((from + to) / 2 - 90) * RAD;
      tile.setAttribute("transform", `translate(${(Math.cos(mid) * lift * LIFT).toFixed(2)} ${(Math.sin(mid) * lift * LIFT).toFixed(2)})`);
      tile.style.opacity = opacity.toFixed(3);
      const r0 = R - width / 2, r1 = R + width / 2;
      shape.setAttribute("d", sector(C, r0, r1, from, to, ca, cb));
      // Stepping back is a change of colour, not of opacity: the others turn to the muted surface.
      const base = tile.dataset.color!;
      const fill = quiet > 0.002 ? `color-mix(in oklab, ${base} ${(100 - 84 * quiet).toFixed(1)}%, var(--muted))` : base;
      shape.style.fill = fill;
      // The amount sits on the tile if there's room along it.
      const amount = tile.querySelector<SVGTextElement>("[data-amount]");
      if (amount) {
        const room = (to - from) * RAD * R;
        const fits = room >= Number(amount.dataset.w) + 18 && width > 30;
        amount.setAttribute("x", (C + R * Math.cos(mid)).toFixed(2));
        amount.setAttribute("y", (C + R * Math.sin(mid)).toFixed(2));
        amount.style.fill = inkOn(fill);
        amount.style.opacity = fits ? (text * (1 - 0.35 * quiet)).toFixed(3) : "0";
      }
      // Over budget: the overspent end of the tile is hatched in red.
      const over = tile.querySelector<SVGPathElement>("[data-over]");
      if (over) {
        const share = budget?.budget !== undefined && budget.value > budget.budget ? (budget.value - budget.budget) / budget.value : 0;
        const start = to - (to - from) * share;
        over.setAttribute("d", share > 0 ? sector(C, r0, r1, start, to, 3, cb) : "");
        over.style.opacity = (1 - quiet * 0.7).toFixed(3);
      }
    };

    if (k < 0) {
      let at = 0;
      list.forEach((c, i) => {
        paint(c.id, at + gapDeg / 2, at + spans[i] - gapDeg / 2, { budget: c });
        at += spans[i];
      });
      return;
    }
    // Opening: the tile blooms from its middle to the whole ring and the others are pushed out of what's left.
    const starts: number[] = [];
    spans.reduce((at, span, i) => ((starts[i] = at), at + span), 0);
    const mid = starts[k] + spans[k] / 2;
    const S = lerp(spans[k], 360, p);
    const from = mid - S / 2;
    const rest = 360 - S, before = 360 - spans[k];
    const squeeze = before > 0 ? rest / before : 0;
    let at = from + S;
    for (let step = 1; step < list.length; step++) {
      const i = (k + step) % list.length;
      const len = spans[i] * squeeze;
      const g = gapDeg * (1 - p);
      paint(list[i].id, at + g / 2, at + len - g / 2, { opacity: clamp01(1 - p * 1.5), width: T * (1 - p * 0.5), budget: list[i], text: clamp01(1 - p * 3) });
      at += len;
    }
    // The parts stand in for the tile from the first frame: in its colour, touching, so they look like it. As it
    // opens, gaps and corners appear between them and each takes its own shade.
    const children = list[k].children ?? [];
    const parent = list[k].color ?? PALETTE[k % PALETTE.length];
    const split = clamp01(p / 0.3);
    paint(list[k].id, from + gapDeg / 2, from + S - gapDeg / 2, { opacity: 0, budget: list[k] });
    const childTotal = sum(children);
    const g = gapDeg * split;
    let c0 = from;
    children.forEach((child, j) => {
      const len = childTotal > 0 ? (S * Math.max(0, child.value)) / childTotal : 0;
      const first = j === 0, last = j === children.length - 1;
      const tile = root.querySelector<SVGGElement>(`[data-tile="${CSS.escape(`${list[k].id}/${child.id}`)}"]`);
      const shade = child.color ?? `oklch(from ${parent} calc(l + ${SHADES[j % SHADES.length]}) c h)`;
      if (tile) tile.dataset.color = split >= 1 ? shade : `color-mix(in oklab, ${shade} ${(split * 100).toFixed(1)}%, ${parent})`;
      paint(`${list[k].id}/${child.id}`, c0 + (first ? gapDeg : g) / 2, c0 + len - (last ? gapDeg : g) / 2, {
        budget: child,
        ca: first ? CORNER : CORNER * split,
        cb: last ? CORNER : CORNER * split,
        text: clamp01((p - 0.45) / 0.4),
      });
      c0 += len;
    });
  }, [getSprings]);

  // Open and close: unfold the new category first, then run the spring; once folded home, drop its parts.
  React.useEffect(() => {
    const s = getSprings();
    if (open) {
      if (unfolded !== open) {
        if (s.open.get() > 0.02 && unfolded) {
          s.open.set(0); // fold the other one home first; the effect runs again when it has
          return;
        }
        const frame = requestAnimationFrame(() => setUnfolded(open));
        return () => cancelAnimationFrame(frame);
      }
      if (reduced) s.open.jump(1);
      else s.open.set(1);
    } else if (reduced) {
      s.open.jump(0);
    } else {
      s.open.set(0);
    }
  }, [open, unfolded, reduced, getSprings]);

  // Watch the fold: when it's home, forget the parts (or move on to the next one asked for).
  React.useEffect(() => {
    if (!unfolded || open === unfolded) return;
    const s = getSprings();
    let frame = 0;
    const wait = () => {
      if (s.open.get() <= 0.002 && Math.abs(s.open.getVelocity()) < 0.01) setUnfolded(open && open !== unfolded ? open : null);
      else frame = requestAnimationFrame(wait);
    };
    frame = requestAnimationFrame(wait);
    return () => cancelAnimationFrame(frame);
  }, [open, unfolded, getSprings]);

  // Pointing lifts one tile and steps the rest back.
  React.useEffect(() => {
    const s = getSprings();
    const keys = open && home ? parts.map((c) => `${home.id}/${c.id}`) : data.map((c) => c.id);
    const all = new Set([...data.map((c) => c.id), ...(home ? parts.map((c) => `${home.id}/${c.id}`) : [])]);
    all.forEach((key) => {
      if (!s.point.has(key)) s.point.set(key, createSpring(0, { stiffness: 380, damping: 34 }, () => paintRef.current()));
      const target = !point || !keys.includes(key) ? 0 : key === point ? 1 : -1;
      const spring = s.point.get(key)!;
      if (reduced) spring.jump(target);
      else spring.set(target);
    });
  }, [point, open, home, parts, data, reduced, getSprings]);

  React.useLayoutEffect(() => {
    paintRef.current = draw;
    draw();
  });

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // What the centre (and the list, if shown) say.
  const opened = open ? data.find((c) => c.id === open) ?? null : null;
  const rows: Shown[] = opened && opened.id === unfolded
    ? parts.map((c, i) => ({ id: `${opened.id}/${c.id}`, label: c.label, value: c.value, budget: c.budget, color: partColour(c, i), share: sum(parts) ? c.value / sum(parts) : 0, parent: opened }))
    : data.map((c, i) => ({ id: c.id, label: c.label, value: c.value, budget: c.budget, color: colour(c, i), share: total ? c.value / total : 0 }));
  const pointed = rows.find((r) => r.id === point) ?? null;
  const centre = pointed
    ? { label: pointed.label, value: pointed.value, note: noteFor(pointed.value, pointed.budget, pointed.parent ? t("{pct}% of {part}", { pct: Math.round(pointed.share * 100), part: pointed.parent.label }) : t("{pct}% of spending", { pct: Math.round(pointed.share * 100) })) }
    : opened
      ? { label: opened.label, value: opened.value, note: noteFor(opened.value, opened.budget, t("{pct}% of spending", { pct: Math.round((total ? opened.value / total : 0) * 100) })) }
      : { label, value: total, note: { text: "", over: false } };

  function noteFor(value: number, budget: number | undefined, fallback: string) {
    if (budget === undefined) return { text: fallback, over: false };
    return value > budget ? { text: t("{amount} over budget", { amount: money(value - budget) }), over: true } : { text: t("of {amount} budget", { amount: money(budget) }), over: false };
  }

  const opens = (row: Shown) => !row.parent && !!data.find((c) => c.id === row.id)?.children?.length;
  const pick = (row: Shown) => {
    if (!opens(row)) return;
    setPoint(null);
    setOpen(row.id);
  };

  // Every tile that may be drawn: the categories, and the open one's parts.
  const tiles = [
    ...data.map((c, i) => ({ key: c.id, color: colour(c, i), value: c.value, over: c.budget !== undefined })),
    ...(home ? parts.map((c, i) => ({ key: `${home.id}/${c.id}`, color: partColour(c, i), value: c.value, over: c.budget !== undefined })) : []),
  ];
  const live_ = new Set(rows.map((r) => r.id));
  const amountText = (n: number) => money(n);

  return (
    <div className={`flex w-full flex-col items-center gap-5 ${className}`} {...props}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          ref={svg}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block overflow-visible"
          role="group"
          aria-label={opened ? `${opened.label}, by part` : label}
          onPointerLeave={() => setPoint(null)}
        >
          <defs>
            <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" className="fill-red-500 dark:fill-red-400" />
              <rect width="2.4" height="6" fill="rgb(255 255 255 / 0.55)" />
            </pattern>
          </defs>
          {tiles.map(({ key, color, value, over }) => {
            const row = rows.find((r) => r.id === key);
            const active = live_.has(key);
            const text = amountText(value);
            return (
              <g
                key={key}
                data-tile={key}
                data-color={color}
                role={active ? "button" : undefined}
                tabIndex={active ? 0 : -1}
                aria-hidden={!active}
                aria-label={row ? `${row.label}, ${money(row.value)}, ${Math.round(row.share * 100)}%${opens(row) ? t(", opens its parts") : ""}` : undefined}
                className={`outline-none ${row && opens(row) ? "cursor-pointer" : "cursor-default"} [&:focus-visible>path[data-shape]]:stroke-ring [&:focus-visible>path[data-shape]]:[stroke-width:2.5]`}
                onPointerMove={(event) => {
                  // Only a hand that moves points: tiles sliding under a resting cursor while it opens don't count.
                  const p = getSprings().open.get();
                  if (event.pointerType === "mouse" && active && (p < 0.02 || p > 0.98) && point !== key) setPoint(key);
                }}
                onClick={() => row && pick(row)}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && row) {
                    event.preventDefault();
                    pick(row);
                  }
                }}
                onFocus={() => active && setPoint(key)}
                onBlur={() => setPoint(null)}
              >
                <path data-shape="" style={{ fill: color }} />
                {over ? <path data-over="" fill={`url(#${hatch})`} className="pointer-events-none" /> : null}
                <text
                  data-amount=""
                  data-w={text.length * 7.1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none select-none text-[12.5px] font-semibold tracking-[-0.01em] tabular-nums"
                  aria-hidden="true"
                >
                  {text}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <button
            type="button"
            onClick={() => setOpen(null)}
            tabIndex={opened ? 0 : -1}
            aria-hidden={!opened}
            className={`pointer-events-auto mb-1 flex h-6 cursor-pointer items-center gap-0.5 rounded-full pr-2 pl-1 text-[12px] font-medium text-muted-foreground transition-[opacity,translate,background-color] duration-300 hover:bg-muted hover:text-foreground motion-reduce:transition-none ${INTERACTION_FOCUS} ${opened ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            {t("All")}
          </button>
          <TextMorph className="text-[12.5px] text-muted-foreground">{centre.label}</TextMorph>
          <span className="mt-1 text-[34px] leading-none font-semibold tracking-[-0.04em] tabular-nums text-foreground">
            <NumberRoll value={centre.value} format={format} locales={locales} duration={700} />
          </span>
          <span className="mt-2 h-4">
            <TextMorph className={`text-[12px] ${centre.note.over ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>{centre.note.text}</TextMorph>
          </span>
        </div>
      </div>

      {legend ? (
        <div className="flex w-full max-w-[320px] flex-col items-start gap-1">
        {/* patched (hairline/patch.mjs): back to every category, above the list */}
        {opened ? (
          <button type="button" onClick={() => setOpen(null)} className={`flex h-7 cursor-pointer items-center gap-0.5 rounded-full border border-border pr-2.5 pl-1.5 text-[12px] font-medium text-foreground transition-colors duration-200 hover:bg-muted ${INTERACTION_FOCUS}`}>
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            {t("All")}
          </button>
        ) : null}
        <ul className="w-full" aria-label={opened ? `${opened.label}, by part` : "Spending by category"}>
          {rows.map((row, i) => {
            const over = row.budget !== undefined && row.value > row.budget;
            return (
              <li key={row.id} className="motion-safe:animate-[ui-fade-up_360ms_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: `${i * 35}ms` }}>
                <button
                  type="button"
                  onClick={() => pick(row)}
                  onPointerEnter={(event) => event.pointerType === "mouse" && setPoint(row.id)}
                  onPointerLeave={() => setPoint(null)}
                  onFocus={() => setPoint(row.id)}
                  onBlur={() => setPoint(null)}
                  aria-disabled={!opens(row)}
                  className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] transition-colors duration-200 hover:bg-muted/70 ${opens(row) ? "cursor-pointer" : "cursor-default"} ${INTERACTION_FOCUS}`}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{row.label}</span>
                  {over ? <span className="text-[11.5px] text-red-600 tabular-nums dark:text-red-400">+{money(row.value - row.budget!)}</span> : null}
                  <span className="w-9 text-right text-[11.5px] text-muted-foreground tabular-nums">{Math.round(row.share * 100)}%</span>
                  <span className="w-[72px] text-right font-medium text-foreground tabular-nums">{money(row.value)}</span>
                  <ChevronRight className={`size-3.5 shrink-0 text-muted-foreground ${opens(row) ? "" : "invisible"}`} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        </div>
      ) : null}
    </div>
  );
}

export default SpendingRing;
