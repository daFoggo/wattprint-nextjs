"use client";

import * as React from "react";
import { ChevronLeft, Ellipsis } from "lucide-react";
import { DropdownMenu } from "./dropdown-menu";
import { NumberRoll } from "./number-roll";
import { StatusButton, type ActionStatus } from "./status-button";
import { TextMorph } from "./text-morph";
import { EASE_OUT } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * PAGE HEADER: where you are, what this is, what you can do
 *
 *   condense  scroll and the large title glides up and shrinks
 *             into a sticky bar, in step with the scroll (not a
 *             toggle). The trail scrolls away and the parent page
 *             becomes a back link, the actions ride into the bar,
 *             the tabs stay pinned under it
 *   trail     going deeper, the crumbs you share stay and the new
 *             one slides in from the right; going up, the crumbs
 *             you leave slide out the same way. The title morphs
 *   actions   async buttons that say what happened in place;
 *             narrow, the secondary ones fold into a menu
 *   tabs      the underline is thrown to the new tab, counts roll
 *
 * Layout follows the header's own width, not the screen's.
 * ───────────────────────────────────────────────────────── */

export interface PageCrumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface PageAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** The main action of the page: filled, and kept out of the narrow menu. */
  primary?: boolean;
  destructive?: boolean;
  /** Run the action. Return a promise and the button shows pending, then done or failed. */
  onAction?: () => unknown | Promise<unknown>;
  /** Labels while it runs, after it works, and after it fails. */
  pendingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
}

export interface PageTab {
  id: string;
  label: string;
  count?: number;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** The trail to this page, without the page itself. The last crumb is the parent. */
  breadcrumbs?: PageCrumb[];
  /** Beside the title: a status badge, a visibility pill. */
  badge?: React.ReactNode;
  /** A line under the description: owners, dates, counts. */
  meta?: React.ReactNode;
  actions?: PageAction[];
  tabs?: PageTab[];
  tab?: string;
  defaultTab?: string;
  onTabChange?: (id: string) => void;
  /** Shrink into a sticky bar on scroll. */
  condense?: boolean;
  /** The element that scrolls. Defaults to the nearest scrolling ancestor, or the window. */
  scrollContainer?: React.RefObject<HTMLElement | null>;
  /** The link component for crumbs and tabs with href, e.g. Next.js Link. */
  linkAs?: React.ElementType;
  className?: string;
}

const BAR = 52;
const NO_CRUMBS: PageCrumb[] = [];
const NO_ACTIONS: PageAction[] = [];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () => React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const keyOf = (c: PageCrumb) => c.href ?? c.label;

/** The nearest ancestor that scrolls vertically, or null for the window. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const y = getComputedStyle(node).overflowY;
    if ((y === "auto" || y === "scroll" || y === "overlay") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/** offsetTop of el inside ancestor, summed through offset parents (transforms don't count). */
function offsetIn(el: HTMLElement, ancestor: HTMLElement) {
  let top = 0;
  let left = 0;
  for (let node: HTMLElement | null = el; node && node !== ancestor; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop;
    left += node.offsetLeft;
  }
  return { top, left };
}

/* ── the trail ────────────────────────────────────────────── */

type TrailEntry = { crumb: PageCrumb; key: string; out: boolean; fresh: boolean };

function Slash() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/60">
      <path d="M10 3.5 6 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function Trail({ items, linkAs: LinkAs, reduced }: { items: PageCrumb[]; linkAs: React.ElementType; reduced: boolean }) {
  // Crumbs both trails share stay put; the rest leave or arrive, so moving between pages reads as going deeper or up.
  const [prev, setPrev] = React.useState(items);
  const [gen, setGen] = React.useState(0);
  const [entries, setEntries] = React.useState<TrailEntry[]>(() => items.map((crumb) => ({ crumb, key: keyOf(crumb), out: false, fresh: false })));
  if (prev !== items) {
    setPrev(items);
    setGen(gen + 1);
    let shared = 0;
    while (shared < items.length && shared < prev.length && keyOf(items[shared]) === keyOf(prev[shared])) shared++;
    const stay = entries.filter((e) => !e.out).slice(0, shared).map((e, i) => ({ ...e, crumb: items[i], fresh: false }));
    const leaving = entries.filter((e) => !e.out).slice(shared).map((e) => ({ ...e, out: true }));
    const arriving = items.slice(shared).map((crumb, i) => ({ crumb, key: `${keyOf(crumb)}#${gen + 1}-${i}`, out: false, fresh: !reduced }));
    setEntries(reduced ? [...stay, ...arriving] : [...stay, ...leaving, ...arriving]);
  }
  const hasLeaving = entries.some((e) => e.out);
  React.useEffect(() => {
    if (!hasLeaving) return;
    const timer = window.setTimeout(() => setEntries((list) => list.filter((e) => !e.out)), 380);
    return () => window.clearTimeout(timer);
  }, [hasLeaving]);

  let arrivingIndex = 0;
  return (
    <ol className="flex min-w-0 items-center text-[13px] text-muted-foreground">
      {entries.map((entry) => {
        const { crumb } = entry;
        const delay = entry.fresh ? 60 + arrivingIndex++ * 70 : 0;
        const inner = crumb.href ? (
          <LinkAs href={crumb.href} onClick={crumb.onClick} className="cursor-pointer rounded-[6px] px-1 py-0.5 transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            {crumb.label}
          </LinkAs>
        ) : crumb.onClick ? (
          <button type="button" onClick={crumb.onClick} className="cursor-pointer rounded-[6px] px-1 py-0.5 transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            {crumb.label}
          </button>
        ) : (
          <span className="px-1 py-0.5">{crumb.label}</span>
        );
        return (
          <li
            key={entry.key}
            aria-hidden={entry.out || undefined}
            inert={entry.out}
            className="grid min-w-0 transition-[grid-template-columns,opacity,translate,filter] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              gridTemplateColumns: entry.out ? "0fr" : "1fr",
              opacity: entry.out ? 0 : 1,
              translate: entry.out ? "10px 0" : "0 0",
              filter: entry.out ? "blur(3px)" : "none",
              animation: entry.fresh ? `ui-slide-from-right 380ms cubic-bezier(0.16,1,0.3,1) ${delay}ms backwards` : undefined,
            }}
          >
            <span className="flex min-w-0 items-center overflow-clip whitespace-nowrap">
              {inner}
              <Slash />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── tabs ─────────────────────────────────────────────────── */

function TabStrip({
  tabs,
  value,
  onChange,
  linkAs: LinkAs,
  reduced,
}: {
  tabs: PageTab[];
  value: string;
  onChange: (id: string) => void;
  linkAs: React.ElementType;
  reduced: boolean;
}) {
  const list = React.useRef<HTMLDivElement>(null);
  const line = React.useRef<HTMLSpanElement>(null);
  const placed = React.useRef(false);
  const [edges, setEdges] = React.useState({ left: false, right: false });

  // The underline is thrown to the new tab, measured from layout so it survives font loading and resizes.
  React.useLayoutEffect(() => {
    const el = list.current;
    const bar = line.current;
    if (!el || !bar) return;
    const place = () => {
      const tab = el.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
      if (!tab) return;
      bar.style.transition = placed.current && !reduced ? `transform 420ms cubic-bezier(0.34,1.36,0.64,1), width 360ms ${EASE_OUT}` : "none";
      bar.style.width = `${tab.offsetWidth - 16}px`;
      bar.style.transform = `translateX(${tab.offsetLeft + 8}px)`;
      placed.current = true;
    };
    place();
    // Keep the chosen tab in view on narrow widths, scrolling the strip only (never the page).
    const tab = el.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
    if (tab && (tab.offsetLeft < el.scrollLeft || tab.offsetLeft + tab.offsetWidth > el.scrollLeft + el.clientWidth)) {
      el.scrollTo({ left: tab.offsetLeft - 24, behavior: reduced ? "auto" : "smooth" });
    }
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, reduced, tabs]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((s) => (s.left === left && s.right === right ? s : { left, right }));
  };
  React.useEffect(() => {
    const el = list.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setEdges((s) => (s.left === left && s.right === right ? s : { left, right }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const items = [...(list.current?.querySelectorAll<HTMLElement>("[data-tab]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : Math.min(items.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)));
    items[next]?.focus();
  };

  return (
    <div className="relative border-b border-border">
      <div
        ref={list}
        role="navigation"
        aria-label="Page sections"
        onScroll={onScroll}
        onKeyDown={onKey}
        className="relative flex overflow-x-auto px-4 [scrollbar-width:none] @min-[36rem]:px-5 [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: `linear-gradient(to right, ${edges.left ? "transparent" : "black"}, black 24px, black calc(100% - 24px), ${edges.right ? "transparent" : "black"})`,
        }}
      >
        {tabs.map((t) => {
          const active = t.id === value;
          const cls = `relative flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 text-[13.5px] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 ${
            active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`;
          const body = (
            <>
              {t.label}
              {t.count !== undefined && (
                <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] tabular-nums transition-colors duration-200 ${active ? "bg-accent text-foreground" : "bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] text-muted-foreground"}`}>
                  <NumberRoll value={t.count} duration={700} />
                </span>
              )}
            </>
          );
          return t.href ? (
            <LinkAs key={t.id} href={t.href} data-tab={t.id} aria-current={active ? "page" : undefined} onClick={() => onChange(t.id)} className={cls}>
              {body}
            </LinkAs>
          ) : (
            <button key={t.id} type="button" data-tab={t.id} aria-current={active ? "page" : undefined} onClick={() => onChange(t.id)} className={cls}>
              {body}
            </button>
          );
        })}
        <span ref={line} aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-[2px] rounded-full bg-foreground" style={{ width: 0 }} />
      </div>
    </div>
  );
}

/* ── the header ───────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  breadcrumbs = NO_CRUMBS,
  badge,
  meta,
  actions = NO_ACTIONS,
  tabs,
  tab: tabProp,
  defaultTab,
  onTabChange,
  condense = true,
  scrollContainer,
  linkAs: LinkAs = "a",
  className = "",
}: PageHeaderProps) {
  const reduced = useReducedMotion();
  const [ownTab, setOwnTab] = React.useState(defaultTab ?? tabs?.[0]?.id ?? "");
  const tab = tabProp ?? ownTab;
  const [status, setStatus] = React.useState<Record<string, ActionStatus>>({});
  // A new set of actions (another page) starts idle, so a "Created" from before never greets you on the way back.
  const actionKey = actions.map((a) => a.id).join("|");
  const [lastActions, setLastActions] = React.useState(actionKey);
  if (lastActions !== actionKey) {
    setLastActions(actionKey);
    setStatus({});
  }

  const header = React.useRef<HTMLElement>(null);
  const sentinel = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const badgeRef = React.useRef<HTMLSpanElement>(null);
  const actionsRef = React.useRef<HTMLDivElement>(null);
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const metaRef = React.useRef<HTMLDivElement>(null);
  const trailRef = React.useRef<HTMLDivElement>(null);
  const backRef = React.useRef<HTMLDivElement>(null);
  const barTitleRef = React.useRef<HTMLSpanElement>(null);
  const ruleRef = React.useRef<HTMLSpanElement>(null);

  const parent = breadcrumbs[breadcrumbs.length - 1];
  const primary = actions.filter((a) => a.primary);
  const secondary = actions.filter((a) => !a.primary);

  const run = async (action: PageAction) => {
    if (!action.onAction || status[action.id] === "pending") return;
    const result = action.onAction();
    if (!(result instanceof Promise)) return;
    setStatus((s) => ({ ...s, [action.id]: "pending" }));
    try {
      await result;
      setStatus((s) => ({ ...s, [action.id]: "success" }));
    } catch {
      setStatus((s) => ({ ...s, [action.id]: "error" }));
    }
  };
  const reset = (id: string) => setStatus((s) => ({ ...s, [id]: "idle" }));

  /* the condense: geometry once per resize, transforms once per scrolled frame */
  React.useLayoutEffect(() => {
    const el = header.current;
    if (!el || !condense) return;
    const scroller = scrollContainer?.current ?? scrollParent(el);
    const target: HTMLElement | Window = scroller ?? window;
    const geo = { travel: 0, titleDy: 0, titleDx: 0, scale: 1, badgeDx: 0, badgeDy: 0, badgeTravels: true, swap: false, actionsDy: 0 };
    let frame = 0;

    const measure = () => {
      const t = titleRef.current;
      if (!t) return;
      const tabsHeight = (el.querySelector<HTMLElement>("[data-tabs]")?.offsetHeight ?? 0);
      geo.travel = Math.max(0, el.offsetHeight - BAR - tabsHeight);
      el.style.top = geo.travel > 20 ? `${-geo.travel}px` : "0px";
      const bar = geo.travel + BAR / 2;
      const tPos = offsetIn(t, el);
      const size = parseFloat(getComputedStyle(t).fontSize) || 26;
      geo.scale = 15 / size;
      geo.titleDy = bar - (tPos.top + t.offsetHeight / 2);
      const back = backRef.current;
      geo.titleDx = parent && back ? back.offsetWidth + 2 : 0;
      const a = actionsRef.current;
      const aPos = a ? offsetIn(a, el) : null;
      if (a && aPos) geo.actionsDy = bar - (aPos.top + a.offsetHeight / 2);
      if (back) back.style.top = `${bar - back.offsetHeight / 2}px`;

      // What fits in the bar: from the back link to the actions.
      const barLeft = tPos.left + geo.titleDx;
      const room = (aPos ? aPos.left - 12 : el.clientWidth - tPos.left) - barLeft;
      const oneLine = t.offsetHeight < size * 1.6;
      const scaledWidth = t.offsetWidth * geo.scale;
      const b = badgeRef.current;
      const badgeWidth = b ? b.offsetWidth + 10 : 0;
      // A one-line title that fits glides into the bar as itself; a wrapped or long one hands over to a one-line copy.
      geo.swap = !oneLine || scaledWidth > room;
      geo.badgeTravels = !!b && !geo.swap && scaledWidth + badgeWidth <= room;
      if (b) {
        const bPos = offsetIn(b, el);
        geo.badgeDx = barLeft + scaledWidth + 10 - bPos.left;
        geo.badgeDy = bar - (bPos.top + b.offsetHeight / 2);
      }
      const copy = barTitleRef.current;
      if (copy) {
        copy.style.left = `${barLeft}px`;
        copy.style.maxWidth = `${Math.max(0, room)}px`;
        copy.style.top = `${bar - copy.offsetHeight / 2}px`;
      }
      apply();
    };

    const apply = () => {
      frame = 0;
      const s = sentinel.current;
      if (!s || geo.travel <= 20) return;
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      const t = clamp01((top - s.getBoundingClientRect().top) / geo.travel);
      const titleEl = titleRef.current;
      if (titleEl) {
        titleEl.style.transform = t ? `translate3d(${geo.titleDx * t}px,${geo.titleDy * t}px,0) scale(${1 + (geo.scale - 1) * t})` : "";
        titleEl.style.opacity = geo.swap ? String(1 - smooth(0.7, 0.95, t)) : "";
      }
      const copy = barTitleRef.current;
      if (copy) {
        copy.style.opacity = geo.swap ? String(smooth(0.75, 1, t)) : "0";
        copy.style.transform = `translate3d(0,${-(1 - t) * geo.titleDy}px,0)`;
      }
      const badgeEl = badgeRef.current;
      if (badgeEl) {
        badgeEl.style.transform = t && geo.badgeTravels ? `translate3d(${geo.badgeDx * t}px,${geo.badgeDy * t}px,0)` : "";
        badgeEl.style.opacity = geo.badgeTravels ? "" : String(1 - smooth(0, 0.35, t));
      }
      if (actionsRef.current) actionsRef.current.style.transform = t ? `translate3d(0,${geo.actionsDy * t}px,0)` : "";
      // Gone before the title passes over them.
      const fade = String(1 - smooth(0, 0.3, t));
      if (descRef.current) descRef.current.style.opacity = fade;
      if (metaRef.current) metaRef.current.style.opacity = fade;
      if (trailRef.current) trailRef.current.style.opacity = String(1 - smooth(0, 0.4, t));
      const back = backRef.current;
      if (back) {
        // Rides with the title, so the chevron and the name arrive in the bar together.
        const shown = smooth(0.7, 1, t);
        back.style.opacity = String(shown);
        back.style.transform = `translate3d(${(1 - shown) * -6}px,${-(1 - t) * geo.titleDy}px,0)`;
        back.inert = shown < 0.5;
      }
      if (ruleRef.current) ruleRef.current.style.opacity = String(smooth(0.85, 1, t));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      target.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
  }, [condense, scrollContainer, parent, title, badge, description, meta, tabs, actions]);

  const actionButton = (a: PageAction) => (
    <StatusButton
      key={a.id}
      variant={a.primary ? "primary" : "outline"}
      status={status[a.id] ?? "idle"}
      icon={a.icon}
      labels={{ idle: a.label, pending: a.pendingLabel ?? a.label, success: a.successLabel ?? "Done", error: a.errorLabel ?? "Try again" }}
      onClick={() => run(a)}
      onReset={() => reset(a.id)}
      className={a.primary ? "" : "@max-[36rem]:hidden"}
    />
  );

  return (
    <>
      <div ref={sentinel} aria-hidden="true" />
      <header ref={header} className={`@container sticky top-0 z-20 bg-background ${className}`}>
        {/* The parent page as a back link: on narrow widths always, in the condensed bar always. */}
        {parent && (
          <div ref={backRef} className="absolute left-3 z-[1] opacity-0 @min-[36rem]:left-4" inert style={{ top: BAR / 2 - 16 }}>
            <BackLink crumb={parent} linkAs={LinkAs} compact />
          </div>
        )}
        {condense && (
          <span ref={barTitleRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[1] truncate whitespace-nowrap text-[15px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground opacity-0">
            {title}
          </span>
        )}
        <div className="relative px-4 pb-4 pt-4 @min-[36rem]:px-6 @min-[36rem]:pt-5">
          {breadcrumbs.length > 0 && (
            <div ref={trailRef} className="mb-2 flex h-6 min-w-0 items-center">
              <nav aria-label="Breadcrumb" className="-ml-1 hidden min-w-0 @min-[36rem]:block">
                <Trail items={breadcrumbs} linkAs={LinkAs} reduced={reduced} />
              </nav>
              {parent && (
                <div className="-ml-1.5 min-w-0 max-w-[45%] @min-[36rem]:hidden">
                  <BackLink crumb={parent} linkAs={LinkAs} />
                </div>
              )}
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h1 ref={titleRef} className="min-w-0 origin-left text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground @min-[36rem]:text-[26px]">
                <TextMorph animateWidth={false}>{title}</TextMorph>
              </h1>
              {badge && (
                <span ref={badgeRef} className="flex shrink-0 items-center">
                  {badge}
                </span>
              )}
            </div>
            {actions.length > 0 && (
              <div
                ref={actionsRef}
                className={`flex shrink-0 items-center gap-2 ${breadcrumbs.length ? "@max-[36rem]:absolute @max-[36rem]:right-4 @max-[36rem]:top-2.5" : ""}`}
              >
                {secondary.map(actionButton)}
                {secondary.length > 0 && (
                  <span className="@min-[36rem]:hidden">
                    <DropdownMenu
                      align="end"
                      label="More actions"
                      items={secondary.map((a) => ({ id: a.id, label: a.label, icon: a.icon, destructive: a.destructive, onSelect: () => run(a) }))}
                      trigger={
                        <button
                          type="button"
                          aria-label="More actions"
                          className="flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <Ellipsis className="size-4" aria-hidden="true" />
                        </button>
                      }
                    />
                  </span>
                )}
                {primary.map(actionButton)}
              </div>
            )}
          </div>
          {description && (
            <p ref={descRef} key={description} className="mt-1.5 max-w-[640px] text-[14px] leading-relaxed text-muted-foreground motion-safe:animate-[ui-empty-in_360ms_cubic-bezier(0.16,1,0.3,1)_backwards]">
              {description}
            </p>
          )}
          {meta && (
            <div ref={metaRef} className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
        {tabs?.length ? (
          <div data-tabs="">
            <TabStrip
              tabs={tabs}
              value={tab}
              linkAs={LinkAs}
              reduced={reduced}
              onChange={(id) => {
                if (tabProp === undefined) setOwnTab(id);
                onTabChange?.(id);
              }}
            />
          </div>
        ) : (
          <span ref={ruleRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border opacity-0" />
        )}
      </header>
    </>
  );
}

function BackLink({ crumb, linkAs: LinkAs, compact = false }: { crumb: PageCrumb; linkAs: React.ElementType; compact?: boolean }) {
  const cls = `flex h-8 cursor-pointer items-center gap-0.5 rounded-[8px] text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
    compact ? "w-8 justify-center" : "max-w-full pl-1 pr-2"
  }`;
  const body = (
    <>
      <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
      {compact ? <span className="sr-only">Back to {crumb.label}</span> : <span className="min-w-0 truncate">{crumb.label}</span>}
    </>
  );
  return crumb.href ? (
    <LinkAs href={crumb.href} onClick={crumb.onClick} className={cls}>
      {body}
    </LinkAs>
  ) : (
    <button type="button" onClick={crumb.onClick} className={cls}>
      {body}
    </button>
  );
}

export default PageHeader;
