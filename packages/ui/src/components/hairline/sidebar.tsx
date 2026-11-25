"use client";

import * as React from "react";
import { ChevronRight, ChevronsUpDown, Search } from "lucide-react";
import { Avatar } from "./avatar";
import { DropdownMenu, type MenuEntry } from "./dropdown-menu";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";
import { SCRIM } from "./modal";
import {
  EASE_OUT,
  createSpring,
  projectInertia,
  releaseVelocity,
  rubberBand,
  samplePointer,
  softenVelocity,
  type PointerSample,
  type Spring,
} from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * SIDEBAR: the app's navigation, and the frame around the page
 *
 *   fold     the panel folds into an icon rail on one spring.
 *            Icons never move: labels fade as the edge passes,
 *            section names turn into short rules, and each count
 *            travels onto its icon's corner
 *   drag     the edge is a handle: drag to resize, keep going
 *            and the fold follows your hand; let go and the
 *            throw decides, rail or open
 *   peek     in the rail, the hover fill grows out of the rail
 *            into the label (and the children, for a group)
 *   glide    the current page's fill glides to the new row
 *   drawer   below 768px of its own width the panel is a
 *            drawer: swipe in from the edge, drag it shut
 *
 * One layout for the whole app: <Sidebar …>{page}</Sidebar>.
 * ───────────────────────────────────────────────────────── */

export type SidebarIcon = React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }>;

export interface SidebarItem {
  id: string;
  label: string;
  /** A lucide icon (or any component taking className). */
  icon?: SidebarIcon;
  /** A colour tile instead of an icon, for projects, teams and channels. */
  color?: string;
  /** Rendered as a link (linkAs) when set, else as a button. */
  href?: string;
  /** A count; 0 hides it. In the rail it rides on the icon's corner. */
  badge?: number;
  /** An unread dot on the icon. */
  dot?: boolean;
  /** One level of children; the row becomes a group that opens and closes. */
  items?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  label?: string;
  items: SidebarItem[];
}

export interface SidebarWorkspace {
  id: string;
  name: string;
  /** A second line under the name: a plan, a member count. */
  detail?: string;
  /** A logo image; otherwise initials on a tile. */
  logo?: string;
  /** The tile's colour. Defaults to --chart-1…5 in turn. */
  color?: string;
}

export interface SidebarUser {
  name: string;
  detail?: string;
  avatar?: string;
}

export interface SidebarProps {
  sections: SidebarSection[];
  /** Rows above the account, e.g. Support and Settings. */
  footer?: SidebarItem[];
  /** The current page's item id. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string, item: SidebarItem) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** The open width, px. */
  width?: number;
  defaultWidth?: number;
  onWidthChange?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  /** Drag the edge to resize and fold. */
  resizable?: boolean;
  workspaces?: SidebarWorkspace[];
  workspace?: string;
  defaultWorkspace?: string;
  onWorkspaceChange?: (id: string) => void;
  /** Extra entries under the workspace list, e.g. "Create workspace". */
  workspaceActions?: MenuEntry[];
  user?: SidebarUser;
  /** The account menu, opened from the user row. */
  userMenu?: MenuEntry[];
  /** Shows a search row; open your command palette here. */
  onSearch?: () => void;
  searchLabel?: string;
  /** The hint on the search row. Display only: your palette owns the shortcut. */
  searchShortcut?: string;
  /** A card above the footer (an upgrade, an announcement). Hidden in the rail. */
  notice?: React.ReactNode;
  /** The link component for items with href, e.g. Next.js Link. */
  linkAs?: React.ElementType;
  /** Below this width of its own, the sidebar becomes a drawer. */
  drawerBelow?: number;
  /** ⌘B / Ctrl+B toggles the sidebar (not while typing). */
  shortcut?: boolean;
  /** Accessible name of the navigation. */
  label?: string;
  className?: string;
  /** The page beside the sidebar. */
  children?: React.ReactNode;
}

const RAIL = 60;
const FOLD = { stiffness: 520, damping: 46 };
const SLIDE = { stiffness: 340, damping: 34 };
const EMPTY: SidebarItem[] = [];
const NO_ENTRIES: MenuEntry[] = [];

/** 1 when open, 0 in the rail; written to --p on the panel every frame of the fold. */
const LABEL: React.CSSProperties = { opacity: "clamp(0, calc(var(--p, 1) * 1.5 - 0.35), 1)" };
const LABEL_FAST: React.CSSProperties = { opacity: "clamp(0, calc(var(--p, 1) * 3 - 2), 1)" };
const RULE: React.CSSProperties = { opacity: "calc(1 - clamp(0, calc(var(--p, 1) * 1.5 - 0.35), 1))" };
const BADGE: React.CSSProperties = {
  transform: "translateY(calc((1 - var(--p, 1)) * -9px)) scale(calc(0.74 + 0.26 * var(--p, 1)))",
  transformOrigin: "right center",
  background: "color-mix(in oklab, var(--primary) calc((1 - var(--p, 1)) * 100%), var(--ui-sb-badge))",
  color: "color-mix(in oklab, var(--primary-foreground) calc((1 - var(--p, 1)) * 100%), var(--ui-sb-badge-fg))",
  boxShadow: "0 0 0 calc((1 - var(--p, 1)) * 2px) var(--ui-sb-bg)",
};

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () => React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};
/** Whether a className already sets the height (h-dvh, size-full, md:h-screen…; min-h-* works beside it); then the default h-full must stay out of its way. */
const SIZED = /(^|[\s:])(h|size)-/;
const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.closest("[contenteditable='true']"));

/* ── context, for SidebarTrigger and the page ─────────────── */

interface SidebarState {
  /** The desktop panel is folded into the rail. */
  collapsed: boolean;
  /** The sidebar is a drawer (narrow layout). */
  drawer: boolean;
  /** The drawer is out. */
  drawerOpen: boolean;
  /** Fold or unfold on wide layouts, open or close the drawer on narrow ones. */
  toggle: () => void;
  setDrawerOpen: (open: boolean) => void;
  /** A callback ref for the trigger, so focus can return to it when the drawer closes. */
  setTrigger: (el: HTMLButtonElement | null) => void;
}
const SidebarContext = React.createContext<SidebarState | null>(null);

export function useSidebar() {
  const state = React.useContext(SidebarContext);
  if (!state) throw new Error("useSidebar must be used inside <Sidebar>.");
  return state;
}

/** The panel glyph: its pane slides shut as the sidebar folds. */
function PanelGlyph({ open, reduced }: { open: boolean; reduced: boolean }) {
  const t = reduced ? "none" : `transform 380ms ${EASE_OUT}, opacity 240ms ${EASE_OUT}`;
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="size-4" aria-hidden="true">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2.5" />
      <rect x="3" y="4" width="3.25" height="8" rx="1" fill="currentColor" stroke="none" style={{ opacity: open ? 0.28 : 0, transform: open ? "none" : "scaleX(0.2)", transformOrigin: "3px 8px", transition: t }} />
      <path d="M6.75 3v10" style={{ transform: open ? "none" : "translateX(-2.25px)", transition: t }} />
    </svg>
  );
}

/** The button that opens the drawer on phones and folds the panel on wide screens. Put it in your page header. */
export function SidebarTrigger({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { collapsed, drawer, drawerOpen, toggle, setTrigger } = useSidebar();
  const reduced = useReducedMotion();
  const open = drawer ? drawerOpen : !collapsed;
  return (
    <button
      ref={setTrigger}
      type="button"
      aria-label={open ? "Close sidebar" : "Open sidebar"}
      aria-expanded={open}
      aria-keyshortcuts="Meta+B Control+B"
      onClick={toggle}
      className={`inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${className}`}
      {...props}
    >
      <PanelGlyph open={open} reduced={reduced} />
    </button>
  );
}

/* ── small parts ──────────────────────────────────────────── */

function WorkspaceMark({ workspace, index }: { workspace: SidebarWorkspace; index: number }) {
  const tint = workspace.color ?? `var(--chart-${(index % 5) + 1}, var(--primary))`;
  return (
    <span
      key={workspace.id}
      className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[8px] text-[11.5px] font-semibold text-primary-foreground motion-safe:animate-[ui-empty-in_320ms_cubic-bezier(0.16,1,0.3,1)_backwards]"
      style={{ background: tint, color: `oklch(from ${tint} clamp(0.2, (0.66 - l) * 100, 0.97) calc(c * 0.6) h)` }}
    >
      {workspace.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={workspace.logo} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(workspace.name)
      )}
    </span>
  );
}

function ItemIcon({ item }: { item: SidebarItem }) {
  const Icon = item.icon;
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      {Icon ? (
        <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <span className="size-2.5 rounded-[3px]" style={{ background: item.color ?? "var(--muted-foreground)" }} />
      )}
      {item.dot && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-[7px] rounded-full bg-primary shadow-[0_0_0_2px_var(--ui-sb-bg)]" />}
    </span>
  );
}

function Badge({ value }: { value: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-1.5 top-1/2 -mt-[9px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-medium leading-none tabular-nums"
      style={BADGE}
    >
      <NumberRoll value={value} duration={700} />
    </span>
  );
}

/** A branch from the group's icon into a child row. */
function Branch({ first, last }: { first: boolean; last: boolean }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-full w-10 overflow-visible text-[color-mix(in_oklab,var(--foreground)_16%,var(--border))]" preserveAspectRatio="none" viewBox="0 0 40 32">
      {!last && <path d={first ? "M22 -8V32" : "M22 0V32"} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      <path d={first ? "M22 -8V10Q22 16 28 16H32" : "M22 0V10Q22 16 28 16H32"} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ── the sidebar ──────────────────────────────────────────── */

type Peek = { item: SidebarItem; top: number };

export function Sidebar({
  sections,
  footer = EMPTY,
  value: valueProp,
  defaultValue,
  onValueChange,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  width: widthProp,
  defaultWidth = 256,
  onWidthChange,
  minWidth = 220,
  maxWidth = 360,
  resizable = true,
  workspaces,
  workspace: workspaceProp,
  defaultWorkspace,
  onWorkspaceChange,
  workspaceActions = NO_ENTRIES,
  user,
  userMenu,
  onSearch,
  searchLabel = "Search",
  searchShortcut = "⌘K",
  notice,
  linkAs: LinkAs = "a",
  drawerBelow = 768,
  shortcut = true,
  label = "Main",
  className = "",
  children,
}: SidebarProps) {
  const reduced = useReducedMotion();
  const navId = React.useId();

  const [ownCollapsed, setOwnCollapsed] = React.useState(defaultCollapsed);
  const collapsed = collapsedProp ?? ownCollapsed;
  const [ownWidth, setOwnWidth] = React.useState(defaultWidth);
  const openWidth = clamp(widthProp ?? ownWidth, minWidth, maxWidth);
  const firstId = sections[0]?.items[0]?.id ?? "";
  const [ownValue, setOwnValue] = React.useState(defaultValue ?? firstId);
  const value = valueProp ?? ownValue;
  const [ownWorkspace, setOwnWorkspace] = React.useState(defaultWorkspace ?? workspaces?.[0]?.id);
  const workspaceId = workspaceProp ?? ownWorkspace;
  const workspaceIndex = Math.max(0, workspaces?.findIndex((w) => w.id === workspaceId) ?? 0);
  const workspace = workspaces?.[workspaceIndex];

  // Which group holds which child, for keeping the current page visible when its group is shut.
  const parentOf = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const list of [...sections.map((s) => s.items), footer]) for (const item of list) for (const child of item.items ?? EMPTY) map.set(child.id, item.id);
    return map;
  }, [sections, footer]);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(parentOf.has(value) ? [parentOf.get(value)!] : []));

  const [drawer, setDrawer] = React.useState(false);
  const [measured, setMeasured] = React.useState(false);
  const [drawerOpen, setDrawerOpenState] = React.useState(false);
  const [wsMenu, setWsMenu] = React.useState(false);
  const [peek, setPeek] = React.useState<Peek | null>(null);
  const [peekOpen, setPeekOpen] = React.useState(false);
  const [peekGlide, setPeekGlide] = React.useState(false);
  const [resizing, setResizing] = React.useState(false);
  const [scrollEdge, setScrollEdge] = React.useState<{ top: boolean; bottom: boolean }>({ top: true, bottom: true });

  const rail = collapsed && !drawer;
  const parentId = parentOf.get(value);
  const shownActive = parentId && (rail || !expanded.has(parentId)) ? parentId : value;

  const root = React.useRef<HTMLDivElement>(null);
  const aside = React.useRef<HTMLElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const scrim = React.useRef<HTMLDivElement>(null);
  const navContent = React.useRef<HTMLDivElement>(null);
  const ghost = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const foldSpring = React.useRef<Spring | null>(null);
  const slideSpring = React.useRef<Spring | null>(null);
  const geometry = React.useRef({ drawer: false, drawerWidth: 280, minWidth });
  const resize = React.useRef<{ id: number; x: number; w: number; moved: boolean; samples: PointerSample[] } | null>(null);
  const swipe = React.useRef<{ id: number; x: number; y: number; q: number; axis: "x" | "y" | null; samples: PointerSample[] } | null>(null);
  const peekTimer = React.useRef(0);
  const [initial] = React.useState(() => ({ width: collapsed ? RAIL : openWidth, p: collapsed ? 0 : 1 }));

  const setCollapsed = React.useCallback(
    (next: boolean) => {
      if (collapsedProp === undefined) setOwnCollapsed(next);
      setPeekOpen(false);
      onCollapsedChange?.(next);
    },
    [collapsedProp, onCollapsedChange],
  );
  const commitWidth = (next: number) => {
    if (widthProp === undefined) setOwnWidth(next);
    onWidthChange?.(next);
  };
  const setDrawerOpen = React.useCallback((next: boolean) => setDrawerOpenState(next), []);
  const toggle = React.useCallback(() => {
    if (geometry.current.drawer) setDrawerOpenState((o) => !o);
    else setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  /* springs: the fold (panel width) and the drawer (0 shut … 1 out) */
  React.useLayoutEffect(() => {
    const paintFold = () => {
      const el = aside.current;
      if (!el || geometry.current.drawer) return;
      const w = fold.get();
      el.style.width = `${w}px`;
      el.style.setProperty("--p", clamp((w - RAIL) / (geometry.current.minWidth - RAIL), 0, 1).toFixed(4));
    };
    const paintSlide = () => {
      const el = aside.current;
      if (!el || !geometry.current.drawer) return;
      const q = slide.get();
      el.style.transform = `translate3d(${(Math.min(q, 1) - 1) * (geometry.current.drawerWidth + 16) + Math.max(0, q - 1) * geometry.current.drawerWidth}px,0,0)`;
      if (scrim.current) scrim.current.style.opacity = String(clamp(q, 0, 1));
    };
    const fold = createSpring(initial.width, FOLD, paintFold, 0.1);
    const slide = createSpring(0, SLIDE, paintSlide, 0.0005);
    foldSpring.current = fold;
    slideSpring.current = slide;
    return () => {
      fold.stop();
      slide.stop();
    };
  }, [initial]);

  React.useLayoutEffect(() => {
    geometry.current.minWidth = minWidth;
  }, [minWidth]);

  // Drawer or panel, from the layout's own width (so it works in any frame, not only full-screen).
  React.useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      geometry.current.drawerWidth = Math.min(openWidth, w - 56);
      setDrawer(w < drawerBelow);
      setMeasured(true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [drawerBelow, openWidth]);

  // Entering or leaving drawer mode rewrites the panel's geometry once.
  const latest = React.useRef({ collapsed, openWidth });
  React.useLayoutEffect(() => {
    latest.current = { collapsed, openWidth };
  }, [collapsed, openWidth]);
  React.useLayoutEffect(() => {
    const el = aside.current;
    if (!el || !measured) return;
    geometry.current.drawer = drawer;
    if (drawer) {
      el.style.width = `${geometry.current.drawerWidth}px`;
      el.style.setProperty("--p", "1");
      slideSpring.current?.jump(0);
    } else {
      el.style.transform = "";
      foldSpring.current?.jump(latest.current.collapsed ? RAIL : latest.current.openWidth);
    }
  }, [drawer, measured]);

  // The fold follows collapsed and the open width.
  React.useLayoutEffect(() => {
    const fold = foldSpring.current;
    if (!fold || drawer || resize.current?.moved) return;
    const target = collapsed ? RAIL : openWidth;
    if (reduced) fold.jump(target);
    else fold.set(target);
  }, [collapsed, openWidth, drawer, reduced]);

  // The drawer follows drawerOpen; focus goes in with it and back to the trigger after.
  React.useEffect(() => {
    const slide = slideSpring.current;
    if (!slide || !drawer) return;
    if (swipe.current?.axis !== "x") {
      if (reduced) slide.jump(drawerOpen ? 1 : 0);
      else slide.set(drawerOpen ? 1 : 0);
    }
    if (drawerOpen) panel.current?.focus({ preventScroll: true });
    else if (panel.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true });
  }, [drawerOpen, drawer, reduced]);

  // ⌘B / Ctrl+B, but never while someone is typing (it's bold in an editor).
  const toggleRef = React.useRef(toggle);
  React.useLayoutEffect(() => {
    toggleRef.current = toggle;
  }, [toggle]);
  React.useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "b" || isEditable(e.target)) return;
      e.preventDefault();
      toggleRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  // The current page's fill glides from the old row to the new one.
  const lastActive = React.useRef(shownActive);
  React.useLayoutEffect(() => {
    const from = lastActive.current;
    lastActive.current = shownActive;
    const content = navContent.current;
    const layer = ghost.current;
    if (!content || !layer || from === shownActive || reduced) return;
    const a = content.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(from)}"]`);
    const b = content.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(shownActive)}"]`);
    if (!a || !b || !a.offsetHeight || !b.offsetHeight) return;
    const box = content.getBoundingClientRect();
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    layer.animate(
      [
        { opacity: 1, transform: `translate3d(${ra.left - box.left}px,${ra.top - box.top}px,0)`, width: `${ra.width}px`, height: `${ra.height}px` },
        { opacity: 1, transform: `translate3d(${rb.left - box.left}px,${rb.top - box.top}px,0)`, width: `${rb.width}px`, height: `${rb.height}px` },
      ],
      { duration: 340, easing: "cubic-bezier(0.16,1,0.3,1)" },
    );
  }, [shownActive, reduced]);

  // Fades at the top and bottom of the list only where there's more to scroll.
  const onNavScroll = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const top = el.scrollTop < 2;
    const bottom = el.scrollTop + el.clientHeight > el.scrollHeight - 2;
    setScrollEdge((s) => (s.top === top && s.bottom === bottom ? s : { top, bottom }));
  };
  React.useEffect(() => {
    const el = navContent.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const top = el.scrollTop < 2;
      const bottom = el.scrollTop + el.clientHeight > el.scrollHeight - 2;
      setScrollEdge((s) => (s.top === top && s.bottom === bottom ? s : { top, bottom }));
    });
    observer.observe(el);
    if (navContent.current) observer.observe(navContent.current);
    return () => observer.disconnect();
  }, []);

  /* choosing */
  const choose = (item: SidebarItem) => {
    if (valueProp === undefined) setOwnValue(item.id);
    onValueChange?.(item.id, item);
    if (drawer) setDrawerOpenState(false);
    setPeekOpen(false);
  };
  const toggleGroup = (id: string) =>
    setExpanded((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const chooseWorkspace = (id: string) => {
    if (workspaceProp === undefined) setOwnWorkspace(id);
    onWorkspaceChange?.(id);
  };

  /* the peek, in the rail */
  const showPeek = (item: SidebarItem, row: HTMLElement) => {
    if (!rail || resize.current?.moved) return;
    window.clearTimeout(peekTimer.current);
    const box = root.current?.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    if (!box) return;
    setPeekGlide(peekOpen);
    setPeek({ item, top: r.top - box.top });
    setPeekOpen(true);
  };
  const hidePeek = (delay = 140) => {
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeekOpen(false), delay);
  };
  React.useEffect(() => () => window.clearTimeout(peekTimer.current), []);
  const peekShown = rail && peekOpen;

  /* resizing: the edge is a handle, the fold follows the hand */
  const onEdgeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || drawer || !foldSpring.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    resize.current = { id: e.pointerId, x: e.clientX, w: foldSpring.current.get(), moved: false, samples: [] };
  };
  const onEdgeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = resize.current;
    const fold = foldSpring.current;
    if (!g || !fold || e.pointerId !== g.id) return;
    if (!g.moved) {
      if (Math.abs(e.clientX - g.x) < 3) return;
      // Start from here, so the first frame doesn't jump by the slop.
      g.moved = true;
      g.x = e.clientX;
      g.w = fold.get();
      setResizing(true);
      setPeekOpen(false);
      return;
    }
    const raw = g.w + (e.clientX - g.x);
    const w = raw > maxWidth ? maxWidth + rubberBand(raw - maxWidth, 140) : raw < RAIL ? RAIL - rubberBand(RAIL - raw, 60) : raw;
    samplePointer(g.samples, raw, e.timeStamp);
    fold.jump(w);
  };
  const onEdgeUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = resize.current;
    const fold = foldSpring.current;
    resize.current = null;
    if (!g || !fold || !g.moved) return;
    setResizing(false);
    const w = fold.get();
    const v = releaseVelocity(g.samples, e.timeStamp);
    const shut = projectInertia(w, v, 0.12) < (RAIL + minWidth) / 2;
    const target = shut ? RAIL : clamp(Math.round(w), minWidth, maxWidth);
    if (!reduced) fold.push(softenVelocity(v * 1000, target - w));
    if (reduced) fold.jump(target);
    else fold.set(target);
    if (shut !== collapsed) setCollapsed(shut);
    if (!shut && target !== openWidth) commitWidth(target);
  };
  const onEdgeKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setCollapsed(!collapsed);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 16 : -16;
      if (collapsed) {
        if (step > 0) setCollapsed(false);
        return;
      }
      if (step < 0 && openWidth <= minWidth) return setCollapsed(true);
      commitWidth(clamp(openWidth + step, minWidth, maxWidth));
    }
  };

  /* the drawer: swipe in from the edge, drag it shut */
  const startSwipe = (e: React.PointerEvent<HTMLElement>, fromEdge: boolean) => {
    if (!drawer || e.pointerType === "mouse" || !slideSpring.current) return;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, q: slideSpring.current.get(), axis: fromEdge ? "x" : null, samples: [] };
    if (fromEdge) e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveSwipe = (e: React.PointerEvent<HTMLElement>) => {
    const g = swipe.current;
    const slide = slideSpring.current;
    if (!g || !slide || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (g.axis === "y") return;
      e.currentTarget.setPointerCapture(e.pointerId);
      g.x = e.clientX; // start from here: no jump by the slop
      return;
    }
    if (g.axis !== "x") return;
    const dw = geometry.current.drawerWidth;
    const q = g.q + (e.clientX - g.x) / dw;
    samplePointer(g.samples, e.clientX, e.timeStamp);
    slide.jump(q > 1 ? 1 + rubberBand((q - 1) * dw, 80) / dw : Math.max(0, q));
  };
  const endSwipe = (e: React.PointerEvent<HTMLElement>) => {
    const g = swipe.current;
    const slide = slideSpring.current;
    swipe.current = null;
    if (!g || !slide || g.axis !== "x") return;
    const dw = geometry.current.drawerWidth;
    const q = slide.get();
    const v = releaseVelocity(g.samples, e.timeStamp);
    const open = projectInertia((q - 1) * dw, v, 0.12) > -dw / 2;
    if (!reduced) slide.push(softenVelocity((v * 1000) / dw, (open ? 1 : 0) - q));
    slide.set(open ? 1 : 0);
    setDrawerOpenState(open);
  };

  /* keyboard: arrows move through the rows */
  const onNavKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const rows = [...(aside.current?.querySelectorAll<HTMLElement>("[data-nav-row]") ?? [])].filter((el) => !el.closest("[inert]"));
    const i = rows.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : clamp(i + (e.key === "ArrowDown" ? 1 : -1), 0, rows.length - 1);
    rows[next]?.focus();
  };

  /* rows */
  const renderRow = (item: SidebarItem, depth: 0 | 1, first = false, last = false) => {
    const group = !!item.items?.length;
    const open = group && expanded.has(item.id) && !rail;
    const active = shownActive === item.id;
    const current = value === item.id;
    const rowClass = `group/row relative z-[1] flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] text-left outline-none transition-[background-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50 ${
      depth ? "h-8 pl-10 pr-2 text-[13px]" : "h-9 pl-[14px] pr-2 text-[13.5px]"
    } ${
      active
        ? "bg-accent text-foreground [transition-delay:300ms] [transition-duration:0ms] motion-reduce:[transition-delay:0ms]"
        : "text-muted-foreground hover:bg-[color-mix(in_oklab,var(--accent)_65%,transparent)] hover:text-foreground"
    }`;
    const inner = (
      <>
        {depth === 0 && <ItemIcon item={item} />}
        <span className="min-w-0 flex-1 overflow-clip whitespace-nowrap [mask-image:linear-gradient(to_right,black_calc(100%-16px),transparent)]" style={depth ? undefined : LABEL}>
          {item.label}
        </span>
        {group && (
          <ChevronRight
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{ ...LABEL_FAST, transform: open ? "rotate(90deg)" : "none" }}
          />
        )}
        {!group && !!item.badge && <span className="w-7 shrink-0" />}
        {!group && !!item.badge && <Badge value={item.badge} />}
        {depth === 0 && rail && <span className="sr-only">{item.badge ? `, ${item.badge}` : ""}</span>}
      </>
    );
    const common = {
      "data-nav-row": "",
      "data-row-id": item.id,
      className: rowClass,
      onPointerEnter: (e: React.PointerEvent<HTMLElement>) => e.pointerType === "mouse" && depth === 0 && showPeek(item, e.currentTarget),
      onPointerLeave: (e: React.PointerEvent<HTMLElement>) => e.pointerType === "mouse" && rail && hidePeek(),
      onFocus: (e: React.FocusEvent<HTMLElement>) => depth === 0 && e.currentTarget.matches(":focus-visible") && showPeek(item, e.currentTarget),
      onBlur: () => rail && hidePeek(60),
    };
    const row = group ? (
      <button
        type="button"
        {...common}
        aria-expanded={rail ? undefined : open}
        aria-controls={rail ? undefined : `${navId}-${item.id}`}
        onClick={(e) => {
          // In the rail a pointer peeks; a keyboard opens the panel on the group, where its rows can be reached.
          if (rail && e.detail > 0) return showPeek(item, e.currentTarget);
          if (rail) {
            setCollapsed(false);
            return setExpanded((set) => new Set(set).add(item.id));
          }
          toggleGroup(item.id);
        }}
      >
        {inner}
      </button>
    ) : item.href ? (
      <LinkAs href={item.href} {...common} aria-current={current ? "page" : undefined} onClick={() => choose(item)}>
        {inner}
      </LinkAs>
    ) : (
      <button type="button" {...common} aria-current={current ? "page" : undefined} onClick={() => choose(item)}>
        {inner}
      </button>
    );
    return (
      <li key={item.id} className="relative">
        {depth === 1 && <Branch first={first} last={last} />}
        {row}
        {group && (
          <div
            id={`${navId}-${item.id}`}
            inert={!open}
            className="grid transition-[grid-template-rows,opacity] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
          >
            <ul className="min-h-0 overflow-clip">{item.items!.map((child, i, all) => renderRow(child, 1, i === 0, i === all.length - 1))}</ul>
          </div>
        )}
      </li>
    );
  };

  /* the parts of the panel */
  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={drawer ? "Close sidebar" : rail ? "Expand sidebar" : "Collapse sidebar"}
      aria-keyshortcuts="Meta+B Control+B"
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[9px] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <PanelGlyph open={!rail} reduced={reduced} />
    </button>
  );

  const header = workspace ? (
    <div className="relative flex h-14 shrink-0 items-center px-2">
      <div className="min-w-0 flex-1 [&>span]:flex [&>span]:w-full">
        <DropdownMenu
          open={wsMenu}
          onOpenChange={(open) => {
            if (rail && open) return setCollapsed(false);
            setWsMenu(open);
          }}
          label="Workspaces"
          minWidth={232}
          items={[
            { type: "label", label: "Workspaces" },
            ...(workspaces ?? []).map<MenuEntry>((w) => ({ type: "checkbox", id: w.id, label: w.name, checked: w.id === workspaceId, onCheckedChange: () => chooseWorkspace(w.id) })),
            ...(workspaceActions.length ? [{ type: "separator" } as MenuEntry, ...workspaceActions] : []),
          ]}
          trigger={
            <button
              type="button"
              aria-label={rail ? `Expand sidebar (${workspace.name})` : `Workspace: ${workspace.name}`}
              className={`flex h-11 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-[10px] pl-2 pr-10 text-left outline-none transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--accent)_65%,transparent)] focus-visible:ring-2 focus-visible:ring-ring/50 ${rail ? "group/ws" : ""}`}
            >
              <span className="relative flex size-7 shrink-0 items-center justify-center">
                <span className={`transition-opacity duration-200 ${rail ? "group-hover/ws:opacity-0 group-focus-visible/ws:opacity-0" : ""}`}>
                  <WorkspaceMark key={workspace.id} workspace={workspace} index={workspaceIndex} />
                </span>
                <span className={`absolute inset-0 flex items-center justify-center text-foreground opacity-0 transition-opacity duration-200 ${rail ? "group-hover/ws:opacity-100 group-focus-visible/ws:opacity-100" : ""}`}>
                  <PanelGlyph open={false} reduced />
                </span>
              </span>
              <span className="min-w-0 flex-1 overflow-clip whitespace-nowrap leading-tight" style={LABEL}>
                <TextMorph className="block text-[13.5px] font-medium text-foreground">{workspace.name}</TextMorph>
                {workspace.detail && <span className="block truncate text-[11.5px] text-muted-foreground">{workspace.detail}</span>}
              </span>
              <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" style={LABEL_FAST} />
            </button>
          }
        />
      </div>
      <div className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${rail ? "pointer-events-none" : ""}`} style={LABEL_FAST}>
        {toggleButton}
      </div>
    </div>
  ) : (
    <div className="flex h-14 shrink-0 items-center pl-[14px]">{toggleButton}</div>
  );

  const search = onSearch && (
    <div className="shrink-0 px-2 pb-2">
      <button
        type="button"
        onClick={onSearch}
        aria-keyshortcuts={searchShortcut === "⌘K" ? "Meta+K Control+K" : undefined}
        data-nav-row=""
        onPointerEnter={(e) => e.pointerType === "mouse" && rail && showPeek({ id: "__search", label: searchLabel, icon: Search }, e.currentTarget)}
        onPointerLeave={(e) => e.pointerType === "mouse" && rail && hidePeek()}
        className="relative flex h-9 w-full cursor-pointer items-center gap-2.5 overflow-clip rounded-[10px] bg-background pl-[14px] text-[13.5px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Search className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="whitespace-nowrap" style={LABEL}>
          {searchLabel}
        </span>
        {searchShortcut && (
          <kbd className="absolute right-2 rounded-[5px] px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]" style={LABEL_FAST}>
            {searchShortcut}
          </kbd>
        )}
      </button>
    </div>
  );

  const account = user && (
    <div className="shrink-0 border-t border-border px-2 py-2">
      {userMenu?.length ? (
        <div className="[&>span]:flex [&>span]:w-full">
          <DropdownMenu
            side="top"
            label="Account"
            minWidth={220}
            items={userMenu}
            trigger={
              <button
                type="button"
                aria-label={`Account: ${user.name}`}
                className="flex h-11 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-[10px] pl-2 pr-2 text-left outline-none transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--accent)_65%,transparent)] focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Avatar name={user.name} src={user.avatar} size="sm" />
                <span className="min-w-0 flex-1 overflow-clip whitespace-nowrap leading-tight" style={LABEL}>
                  <span className="block text-[13px] font-medium text-foreground">{user.name}</span>
                  {user.detail && <span className="block truncate text-[11.5px] text-muted-foreground">{user.detail}</span>}
                </span>
                <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" style={LABEL_FAST} />
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex h-11 items-center gap-2.5 pl-2">
          <Avatar name={user.name} src={user.avatar} size="sm" />
          <span className="min-w-0 flex-1 overflow-clip whitespace-nowrap leading-tight" style={LABEL}>
            <span className="block text-[13px] font-medium text-foreground">{user.name}</span>
            {user.detail && <span className="block truncate text-[11.5px] text-muted-foreground">{user.detail}</span>}
          </span>
        </div>
      )}
    </div>
  );

  const peekItem = peek?.item;
  const PeekIcon = peekItem?.icon;

  const setTrigger = React.useCallback((el: HTMLButtonElement | null) => {
    triggerRef.current = el;
  }, []);
  const state = React.useMemo<SidebarState>(() => ({ collapsed, drawer, drawerOpen, toggle, setDrawerOpen, setTrigger }), [collapsed, drawer, drawerOpen, toggle, setDrawerOpen, setTrigger]);

  return (
    <SidebarContext.Provider value={state}>
      <div
        ref={root}
        className={`@container relative flex w-full min-w-0 overflow-clip bg-background text-foreground ${SIZED.test(className) ? "" : "h-full"} ${resizing ? "cursor-ew-resize select-none" : ""} ${className}`}
        style={{ "--ui-sb-bg": "var(--sidebar, color-mix(in oklab, var(--muted) 42%, var(--background)))", "--ui-sb-badge": "color-mix(in oklab, var(--foreground) 8%, transparent)", "--ui-sb-badge-fg": "var(--muted-foreground)" } as React.CSSProperties}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          if (drawer && drawerOpen) setDrawerOpenState(false);
          if (peekOpen) setPeekOpen(false);
        }}
      >
        <aside
          ref={aside}
          data-collapsed={rail ? "" : undefined}
          inert={drawer && !drawerOpen}
          className={`flex h-full shrink-0 flex-col bg-[var(--ui-sb-bg)] text-foreground ${
            drawer ? "absolute inset-y-0 left-0 z-30 rounded-r-[20px] shadow-[0_0_0_1px_var(--border)] will-change-transform" : "relative z-[2] border-r border-border"
          } ${measured ? "" : "@max-3xl:hidden"}`}
          style={{ width: initial.width, "--p": initial.p } as React.CSSProperties}
        >
          <div
            ref={panel}
            tabIndex={-1}
            role={drawer ? "dialog" : undefined}
            aria-modal={drawer && drawerOpen ? true : undefined}
            aria-label={drawer ? `${label} navigation` : undefined}
            className="flex h-full min-h-0 w-full flex-col overflow-clip outline-none [touch-action:pan-y]"
            onPointerDown={(e) => startSwipe(e, false)}
            onPointerMove={moveSwipe}
            onPointerUp={endSwipe}
            onPointerCancel={endSwipe}
          >
            {header}
            {search}
            <nav
              aria-label={label}
              onScroll={onNavScroll}
              onKeyDown={onNavKey}
              className="relative min-h-0 flex-1 overflow-y-auto overflow-x-clip px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                maskImage: `linear-gradient(to bottom, ${scrollEdge.top ? "black" : "transparent"}, black 20px, black calc(100% - 20px), ${scrollEdge.bottom ? "black" : "transparent"})`,
              }}
            >
              <div ref={navContent} className="relative">
                <div ref={ghost} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 rounded-[10px] bg-accent opacity-0" />
                {sections.map((section, i) => (
                  <div key={section.id} className={i ? "pt-3" : ""}>
                    {section.label && (
                      <div className="relative flex h-7 items-end pb-1.5 pl-[14px] text-[11.5px] font-medium text-muted-foreground">
                        <span className="whitespace-nowrap" style={LABEL}>
                          {section.label}
                        </span>
                        <span aria-hidden="true" className="absolute bottom-[11px] left-[14px] h-px w-4 bg-border" style={RULE} />
                      </div>
                    )}
                    <ul className="flex flex-col gap-px">{section.items.map((item) => renderRow(item, 0))}</ul>
                  </div>
                ))}
              </div>
            </nav>
            {notice && (
              <div
                inert={rail}
                className="grid shrink-0 transition-[grid-template-rows] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                style={{ gridTemplateRows: rail ? "0fr" : "1fr" }}
              >
                <div className="min-h-0 overflow-clip">
                  <div className="w-full min-w-[204px] px-2 pb-2" style={LABEL}>
                    {notice}
                  </div>
                </div>
              </div>
            )}
            {footer.length > 0 && (
              <ul className="flex shrink-0 flex-col gap-px px-2 pb-2" onKeyDown={onNavKey}>
                {footer.map((item) => renderRow(item, 0))}
              </ul>
            )}
            {account}
          </div>

          {resizable && !drawer && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              aria-valuemin={RAIL}
              aria-valuemax={maxWidth}
              aria-valuenow={collapsed ? RAIL : openWidth}
              tabIndex={0}
              onPointerDown={onEdgeDown}
              onPointerMove={onEdgeMove}
              onPointerUp={onEdgeUp}
              onPointerCancel={onEdgeUp}
              onDoubleClick={() => setCollapsed(!collapsed)}
              onKeyDown={onEdgeKey}
              className="group/edge absolute inset-y-0 -right-[5px] z-10 w-[9px] cursor-ew-resize touch-none outline-none"
            >
              <span
                className={`absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[color-mix(in_oklab,var(--foreground)_22%,transparent)] transition-opacity duration-200 group-hover/edge:opacity-100 group-focus-visible/edge:opacity-100 ${resizing ? "opacity-100" : "opacity-0"}`}
              />
            </div>
          )}
        </aside>

        {/* The peek: the rail's hover fill growing out into the label. */}
        {rail && peekItem && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-2 top-0 z-40"
            style={{
              transform: `translateY(${peek!.top}px)`,
              // Closing folds the label back into the rail first, then the fill fades.
              transition: reduced ? "none" : `${peekGlide ? `transform 300ms ${EASE_OUT}, ` : ""}opacity ${peekShown ? "0ms" : `160ms ${EASE_OUT} 220ms`}`,
              opacity: peekShown ? 1 : 0,
            }}
          >
            <div
              className="pointer-events-auto rounded-[10px] text-foreground shadow-[0_0_0_1px_var(--border)]"
              // The accent laid over the sidebar's own colour: themes often make --accent translucent, and the rail must not show through.
              style={{ pointerEvents: peekShown ? "auto" : "none", background: "linear-gradient(var(--accent), var(--accent)), linear-gradient(var(--ui-sb-bg), var(--ui-sb-bg)), var(--background)" }}
              onPointerEnter={() => window.clearTimeout(peekTimer.current)}
              onPointerLeave={() => hidePeek()}
            >
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  if (peekItem.id === "__search") return onSearch?.();
                  if (!peekItem.items?.length) choose(peekItem);
                }}
                className="flex h-9 w-full cursor-pointer items-center pl-[14px] pr-1 text-[13.5px]"
              >
                <span className="relative flex size-4 shrink-0 items-center justify-center">
                  {PeekIcon ? <PeekIcon className="size-4" strokeWidth={1.75} aria-hidden="true" /> : <span className="size-2.5 rounded-[3px]" style={{ background: peekItem.color ?? "var(--muted-foreground)" }} />}
                </span>
                <span
                  className="grid transition-[grid-template-columns] duration-[340ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                  style={{ gridTemplateColumns: peekShown ? "1fr" : "0fr" }}
                >
                  <span className="flex min-w-0 items-center overflow-clip">
                    <span className="flex items-center gap-2 whitespace-nowrap pl-2.5 pr-2.5">
                      <TextMorph>{peekItem.label}</TextMorph>
                      {!!peekItem.badge && (
                        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-background px-[5px] text-[11px] font-medium tabular-nums text-muted-foreground">
                          <NumberRoll value={peekItem.badge} />
                        </span>
                      )}
                    </span>
                  </span>
                </span>
              </button>
              {!!peekItem.items?.length && (
                <div
                  className="grid transition-[grid-template-rows] duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                  style={{ gridTemplateRows: peekShown ? "1fr" : "0fr" }}
                >
                  <ul className="min-h-0 overflow-clip px-1 pb-1">
                    {peekItem.items.map((child) => (
                      <li key={child.id}>
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => choose(child)}
                          className={`flex h-8 w-full cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-[8px] pl-[34px] pr-2 text-left text-[13px] transition-colors duration-150 ${
                            value === child.id ? "bg-background text-foreground" : "text-muted-foreground hover:bg-[color-mix(in_oklab,var(--background)_60%,transparent)] hover:text-foreground"
                          }`}
                        >
                          {child.label}
                          {!!child.badge && <span className="text-[11px] tabular-nums text-muted-foreground">{child.badge}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {drawer && (
          <>
            <div ref={scrim} aria-hidden="true" className={`${SCRIM} z-20`} style={{ opacity: 0, pointerEvents: drawerOpen ? "auto" : "none" }} onClick={() => setDrawerOpenState(false)} />
            {!drawerOpen && <div aria-hidden="true" className="absolute inset-y-0 left-0 z-10 w-4 touch-none" onPointerDown={(e) => startSwipe(e, true)} onPointerMove={moveSwipe} onPointerUp={endSwipe} onPointerCancel={endSwipe} />}
          </>
        )}

        <div inert={drawer && drawerOpen} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

export default Sidebar;
