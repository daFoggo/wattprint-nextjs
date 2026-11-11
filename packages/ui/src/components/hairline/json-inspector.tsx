"use client";

import * as React from "react";
import { buildTree, diffTree, flatten, formatPath, parseError, searchTree, type JsonKey, type JsonNode } from "./json-tree";
import { NumberRoll } from "./number-roll";
import { StatusButton, type ActionStatus } from "./status-button";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * JSON INSPECTOR: a payload you can read, search and quote
 *
 *   fold      objects and arrays open and close by height, the
 *             chevron turns; closed ones show what's inside
 *             ({ id, amount, … } or 12 items)
 *   search    every key and value that matches; the branches
 *             above them unfold, the count rolls, Enter steps
 *             from match to match and scrolls to it
 *   path      the row you're on is written out below, morphing
 *             letter by letter as you move (data.lines[0].id),
 *             ready to copy along with its value
 *   read      the row you're on shows its whole string, and
 *             timestamps say when they are
 *   diff      give it the value before: added, removed and
 *             changed keys are marked, old values sit struck
 *             through beside the new, and what didn't change
 *             folds into "12 unchanged"
 *   broken    text that isn't JSON points at the line and column
 *
 * It's a tree for the keyboard: arrows move and open, Home and
 * End jump, / searches, ⌘C copies the value you're on.
 * ───────────────────────────────────────────────────────── */

export interface JsonInspectorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** A value to show. */
  data?: unknown;
  /** Or JSON text; if it doesn't parse, the error is shown where it is. */
  text?: string;
  /** The value before: shows how it became `data`. */
  compare?: unknown;
  /** In a diff, match array items by this key ("id") instead of by position. */
  arrayKey?: string;
  /** Levels open at first. */
  expandDepth?: number;
  /** Shown at the top left, e.g. the event name. */
  title?: React.ReactNode;
  /** Height of the scrolling body in px. */
  maxHeight?: number;
  /** How paths are written when copied. */
  pathStyle?: "js" | "jq";
  /** Accessible name of the tree. */
  label?: string;
  /** Start with this search, e.g. from a "find in payload" link. */
  defaultQuery?: string;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const CHUNK = 100;
const INDENT = 14;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
// GitHub's palette for light and dark, as in Code block.
const TONE = {
  string: "text-[#0a3069] dark:text-[#a5d6ff]",
  number: "text-[#0550ae] dark:text-[#79c0ff]",
  boolean: "text-[#cf222e] dark:text-[#ff7b72]",
  null: "italic text-muted-foreground",
};

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const isContainer = (n: JsonNode) => n.children !== undefined;
const removedIndex = (k: JsonKey) => (typeof k === "string" && /^\d+ \(removed\)$/.test(k) ? parseInt(k) : k);

function valueAt(value: unknown, path: JsonKey[]) {
  let v = value;
  for (const k of path) {
    if (v === null || typeof v !== "object") return undefined;
    v = (v as Record<string | number, unknown>)[removedIndex(k)];
  }
  return v;
}

const TIME_KEY = /(^|_)(at|created|updated|date|time|timestamp|period_start|period_end|expires|due)($|_)/i;
/** When a value is a moment: an ISO string, or Unix seconds under a key that sounds like a time. */
function when(node: JsonNode): string | null {
  const v = node.value;
  let date: Date | null = null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) date = new Date(v);
  else if (typeof v === "number" && typeof node.key === "string" && TIME_KEY.test(node.key) && v > 9e8 && v < 4e9) date = new Date(v * 1000);
  else if (typeof v === "number" && typeof node.key === "string" && TIME_KEY.test(node.key) && v > 9e11 && v < 4e12) date = new Date(v);
  if (!date || isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function Marked({ text, query, current }: { text: string; query: string; current: boolean }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (let i = lower.indexOf(q); i !== -1; i = lower.indexOf(q, i + q.length)) {
    if (i > at) parts.push(text.slice(at, i));
    parts.push(
      <mark key={i} className={`rounded-[3px] text-inherit ${current ? "bg-primary/30 shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_55%,transparent)]" : "bg-primary/15"}`}>
        {text.slice(i, i + q.length)}
      </mark>,
    );
    at = i + q.length;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

function Value({ node, query, current, before }: { node: JsonNode; query: string; current: boolean; before?: boolean }) {
  const v = before ? node.before : node.value;
  const kind = before ? (node.beforeKind ?? node.kind) : node.kind;
  if (kind === "object" || kind === "array") return <span className="text-muted-foreground">{String(v)}</span>;
  if (kind === "string" && !before) return <span className={TONE.string}>“<Marked text={String(v)} query={query} current={current} />”</span>;
  if (kind === "string") return <span className={TONE.string}>“{String(v)}”</span>;
  const tone = kind === "null" ? TONE.null : kind === "boolean" ? TONE.boolean : TONE.number;
  return <span className={tone}>{before ? String(v) : <Marked text={String(v)} query={query} current={current} />}</span>;
}

function preview(node: JsonNode) {
  if (node.kind === "array") return `${node.size} ${node.size === 1 ? "item" : "items"}`;
  const keys = (node.children ?? []).slice(0, 3).map((c) => String(c.key));
  return `{ ${keys.join(", ")}${(node.size ?? 0) > 3 ? ", …" : ""} }`;
}

function Chevron({ open, reduced }: { open: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3 text-muted-foreground" style={{ transform: open ? "rotate(90deg)" : "none", transition: reduced ? "none" : `transform 260ms ${EASE}` }}>
      <path d="M6.25 4.5 9.75 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A block that opens and closes by height; its children stay mounted once shown, so closing animates too. */
function Fold({ open, reduced, children, id }: { open: boolean; reduced: boolean; children: React.ReactNode; id?: string }) {
  const [kept, setKept] = React.useState(children);
  if (open && kept !== children) {
    setKept(children);
  }
  return (
    <div
      id={id}
      role="group"
      className="grid"
      style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, transition: reduced ? "none" : `grid-template-rows 280ms ${EASE}, opacity ${open ? 240 : 140}ms ${EASE}` }}
      inert={!open || undefined}
    >
      <div className="min-h-0 overflow-hidden">{open ? children : kept}</div>
    </div>
  );
}

export function JsonInspector({
  data,
  text,
  compare,
  arrayKey,
  expandDepth = 2,
  title,
  maxHeight = 360,
  pathStyle = "js",
  label = "JSON",
  defaultQuery = "",
  className = "",
  ...props
}: JsonInspectorProps) {
  const uid = React.useId();
  const reduced = useReducedMotion();
  const diff = compare !== undefined;

  // The value: given, or parsed from text.
  const parsed = React.useMemo(() => {
    if (text === undefined) return { ok: true as const, value: data };
    try {
      return { ok: true as const, value: JSON.parse(text) as unknown };
    } catch (err) {
      return { ok: false as const, error: parseError(text, err) };
    }
  }, [text, data]);
  const value = parsed.ok ? parsed.value : undefined;
  const root = React.useMemo(() => (diff ? diffTree(compare, value, { arrayKey }) : buildTree(value)), [diff, compare, value, arrayKey]);
  const { all, parent } = React.useMemo(() => flatten(root), [root]);
  const byId = React.useMemo(() => new Map(all.map((n) => [n.id, n])), [all]);

  const initialOpen = React.useCallback(() => {
    const open = new Set<string>();
    for (const n of all) if (isContainer(n) && (diff ? n.change === "changed" && n.children?.length : n.depth < expandDepth)) open.add(n.id);
    open.add(root.id);
    return open;
  }, [all, diff, expandDepth, root.id]);

  const [expanded, setExpanded] = React.useState(initialOpen);
  const [seenRoot, setSeenRoot] = React.useState(root);
  const [focusId, setFocusId] = React.useState(root.id);
  const [query, setQuery] = React.useState(defaultQuery);
  const [typed, setTyped] = React.useState(defaultQuery);
  const [matchIndex, setMatchIndex] = React.useState(0);
  const [onlyChanges, setOnlyChanges] = React.useState(true);
  const [showSame, setShowSame] = React.useState<Set<string>>(() => new Set());
  const [chunks, setChunks] = React.useState<Map<string, number>>(() => new Map());
  const [copied, setCopied] = React.useState<{ path: ActionStatus; value: ActionStatus }>({ path: "idle", value: "idle" });
  const [announce, setAnnounce] = React.useState("");
  const [keyed, setKeyed] = React.useState(false);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const rowRefs = React.useRef(new Map<string, HTMLDivElement>());

  // New data: start again from its own first view.
  if (root !== seenRoot) {
    setSeenRoot(root);
    setExpanded(initialOpen());
    setFocusId(root.id);
    setShowSame(new Set());
    setChunks(new Map());
  }

  // Typing settles before it searches.
  React.useEffect(() => {
    const t = window.setTimeout(() => setQuery(typed), 120);
    return () => window.clearTimeout(t);
  }, [typed]);

  const matches = React.useMemo(() => searchTree(all, query), [all, query]);
  const current = matches.length ? matches[Math.min(matchIndex, matches.length - 1)] : null;
  const [seenCurrent, setSeenCurrent] = React.useState<string | null>(null);
  if (current !== seenCurrent) {
    setSeenCurrent(current);
    if (current) setFocusId(current);
  }
  // The branches above every match open while you search.
  const forced = React.useMemo(() => {
    const out = new Set<string>();
    for (const id of matches) for (let p = parent.get(id); p; p = parent.get(p)) out.add(p);
    return out;
  }, [matches, parent]);
  const isOpen = (id: string) => expanded.has(id) || forced.has(id);

  // A match that sits past a "show more" or among hidden unchanged keys is shown too.
  const matchSet = React.useMemo(() => new Set(matches), [matches]);
  const hiddenSame = (n: JsonNode, p: JsonNode) => diff && onlyChanges && n.change === "same" && !showSame.has(p.id) && !forced.has(n.id) && !matchSet.has(n.id);
  const shownChildren = (n: JsonNode) => {
    const kids = (n.children ?? []).filter((c) => !hiddenSame(c, n));
    const limit = chunks.get(n.id) ?? CHUNK;
    const needed = kids.findIndex((c, i) => i >= limit && (c.id === current || forced.has(c.id)));
    return kids.slice(0, Math.max(limit, needed + 1));
  };

  /** Where a row's key starts, so brackets and "show more" line up with it. */
  const keyStart = (depth: number) => 6 + depth * INDENT + (diff ? 12 : 0) + 18;

  // Rows in the order the keyboard walks them.
  const order = React.useMemo(() => {
    const out: string[] = [];
    const walk = (n: JsonNode) => {
      out.push(n.id);
      if (isContainer(n) && isOpen(n.id)) shownChildren(n).forEach(walk);
    };
    walk(root);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, expanded, forced, onlyChanges, showSame, chunks, current]);

  const toggle = (id: string, open?: boolean) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (open ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const move = (id: string, scroll = true) => {
    setFocusId(id);
    const row = rowRefs.current.get(id);
    row?.focus({ preventScroll: !scroll });
  };

  // Stepping through matches brings each one into view.
  React.useEffect(() => {
    if (!current) return;
    const frame = requestAnimationFrame(() => {
      const row = rowRefs.current.get(current);
      const scroller = scrollerRef.current;
      if (!row || !scroller) return;
      const top = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      if (top < scroller.scrollTop + 8 || top + row.offsetHeight > scroller.scrollTop + scroller.clientHeight - 8)
        scroller.scrollTo({ top: Math.max(0, top - scroller.clientHeight / 3), behavior: reduced ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [current, reduced]);

  React.useEffect(() => {
    if (!query) return;
    const t = window.setTimeout(() => setAnnounce(matches.length ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}` : "No matches"), 300);
    return () => window.clearTimeout(t);
  }, [matches.length, query]);

  const step = (dir: 1 | -1) => {
    if (!matches.length) return;
    setMatchIndex((i) => (Math.min(i, matches.length - 1) + dir + matches.length) % matches.length);
  };

  const focused = byId.get(focusId) ?? root;
  const focusPath = formatPath(focused.path, pathStyle);
  const focusValue = () => {
    const from = focused.change === "removed" ? compare : value;
    const v = focused.path.length ? valueAt(from, focused.path) : from;
    return typeof v === "string" ? v : JSON.stringify(v, null, 2);
  };

  const copy = async (what: "path" | "value") => {
    try {
      await navigator.clipboard.writeText(what === "path" ? focusPath : (focusValue() ?? ""));
      setCopied((c) => ({ ...c, [what]: "success" }));
      setAnnounce(what === "path" ? `Copied ${focusPath}` : "Copied the value");
    } catch {
      setCopied((c) => ({ ...c, [what]: "error" }));
    }
  };

  const onTreeKey = (e: React.KeyboardEvent) => {
    setKeyed(true);
    const at = order.indexOf(focusId);
    const n = focused;
    if (e.key === "ArrowDown" && at < order.length - 1) move(order[at + 1]);
    else if (e.key === "ArrowUp" && at > 0) move(order[at - 1]);
    else if (e.key === "Home") move(order[0]);
    else if (e.key === "End") move(order[order.length - 1]);
    else if (e.key === "ArrowRight" && isContainer(n)) {
      if (!isOpen(n.id)) toggle(n.id, true);
      else if (order[at + 1] && parent.get(order[at + 1]) === n.id) move(order[at + 1]);
    } else if (e.key === "ArrowLeft") {
      if (isContainer(n) && isOpen(n.id) && !forced.has(n.id)) toggle(n.id, false);
      else if (parent.get(n.id)) move(parent.get(n.id)!);
    } else if ((e.key === "Enter" || e.key === " ") && isContainer(n)) toggle(n.id);
    else if (e.key === "/" ) {
      searchRef.current?.focus();
      searchRef.current?.select();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c" && !window.getSelection()?.toString()) {
      void copy("value");
    } else return;
    e.preventDefault();
  };

  const allOpen = all.every((n) => !isContainer(n) || expanded.has(n.id));
  const counts = root.counts ?? { added: 0, removed: 0, changed: 0 };

  /* ── Rows ── */

  const renderNode = (n: JsonNode, p: JsonNode | null, index: number, siblings: number): React.ReactNode => {
    const container = isContainer(n);
    const open = container && isOpen(n.id);
    const isFocus = n.id === focusId;
    const isMatch = n.id === current;
    const keyText = n.key === null ? null : String(removedIndex(n.key));
    const kids = container && open ? shownChildren(n) : [];
    const sameHidden = container && diff && onlyChanges && !showSame.has(n.id) ? (n.children ?? []).filter((c) => hiddenSame(c, n)).length : 0;
    const total = container ? (n.children ?? []).length - sameHidden : 0;
    const limit = chunks.get(n.id) ?? CHUNK;
    const moment = isFocus && !container ? when(n) : null;
    const removed = n.change === "removed";
    const sign = !diff ? null : n.change === "added" ? "+" : removed ? "−" : n.change === "changed" && !container ? "~" : "";
    const tint = n.change === "added" ? "bg-emerald-500/[0.07]" : removed ? "bg-red-500/[0.07]" : "";
    return (
      <React.Fragment key={n.id}>
        <div
          ref={(el) => {
            if (el) rowRefs.current.set(n.id, el);
            else rowRefs.current.delete(n.id);
          }}
          role="treeitem"
          data-id={n.id}
          aria-level={n.depth + 1}
          aria-setsize={siblings}
          aria-posinset={index + 1}
          aria-expanded={container ? open : undefined}
          aria-selected={isFocus}
          aria-owns={container && open ? `${uid}-g${n.id}` : undefined}
          aria-label={`${keyText ?? label}${container ? `, ${n.kind === "array" ? `${n.size} items` : `${n.size} keys`}` : `: ${String(n.value)}`}${removed ? ", removed" : n.change === "added" ? ", added" : !container && n.change === "changed" ? `, was ${String(n.before)}` : ""}`}
          tabIndex={isFocus ? 0 : -1}
          onClick={() => {
            setKeyed(false);
            setFocusId(n.id);
            if (container) toggle(n.id);
          }}
          onFocus={() => setFocusId(n.id)}
          className={`relative flex min-h-[24px] cursor-pointer items-start rounded-[7px] pr-2 font-mono text-[12px] leading-[24px] outline-none transition-colors duration-150 ${tint} ${
            isFocus ? (keyed ? "bg-accent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ring)_45%,transparent)]" : "bg-accent") : "hover:bg-accent/60"
          }`}
          style={{ paddingLeft: 6 + n.depth * INDENT }}
        >
          {/* Hairline guides for each level above this row. */}
          {Array.from({ length: n.depth }, (_, d) => (
            <span key={d} aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-border" style={{ left: 6 + d * INDENT + (diff ? 12 : 0) + 7 }} />
          ))}
          {diff && (
            <span aria-hidden="true" className={`w-3 shrink-0 text-center ${n.change === "added" ? "text-emerald-600 dark:text-emerald-400" : removed ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
              {sign}
            </span>
          )}
          <span aria-hidden="true" className="flex h-6 w-3.5 shrink-0 items-center justify-center">
            {container && <Chevron open={open} reduced={reduced} />}
          </span>
          <span className={`flex min-w-0 flex-1 gap-x-1.5 pl-1 ${isFocus && !container ? "flex-wrap" : ""}`}>
            {keyText !== null && (
              <span className={`shrink-0 ${typeof removedIndex(n.key!) === "number" ? "text-muted-foreground" : "text-foreground"} ${removed ? "line-through decoration-red-500/50" : ""}`}>
                {typeof n.key === "string" && !/^\d+ \(removed\)$/.test(n.key) ? <Marked text={keyText} query={query} current={isMatch} /> : keyText}
                <span className="text-muted-foreground">:</span>
              </span>
            )}
            {container ? (
              <span className="min-w-0 truncate text-muted-foreground">
                {open ? (n.kind === "array" ? "[" : "{") : preview(n)}
                {diff && !open && n.change === "changed" && (
                  <span className="ml-1.5 text-[11px]">
                    {n.counts && [n.counts.added ? `+${n.counts.added}` : "", n.counts.removed ? `−${n.counts.removed}` : "", n.counts.changed ? `~${n.counts.changed}` : ""].filter(Boolean).join(" ")}
                  </span>
                )}
              </span>
            ) : (
              <span className={`min-w-0 ${isFocus ? "whitespace-pre-wrap break-all" : "truncate"} ${removed ? "line-through decoration-red-500/50" : ""}`}>
                {n.change === "changed" && (
                  <>
                    <span className="line-through decoration-red-500/60 opacity-70">
                      <Value node={n} query={query} current={isMatch} before />
                    </span>
                    <span className="px-1.5 text-muted-foreground">→</span>
                  </>
                )}
                <Value node={n} query={query} current={isMatch} />
              </span>
            )}
            {moment && <span className="shrink-0 font-sans text-[11px] text-muted-foreground animate-[ui-fade-in_300ms_ease-out_both]">{moment}</span>}
          </span>
        </div>
        {container && (
          <Fold open={open} reduced={reduced} id={`${uid}-g${n.id}`}>
            {kids.map((c, i) => renderNode(c, n, i, kids.length))}
            {kids.length < total && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setChunks((m) => new Map(m).set(n.id, limit + CHUNK))}
                className="flex h-6 w-full cursor-pointer items-center rounded-[7px] text-left font-sans text-[11.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                style={{ paddingLeft: keyStart(n.depth + 1) }}
              >
                Show {Math.min(CHUNK, total - kids.length)} more · {(total - kids.length).toLocaleString()} left
              </button>
            )}
            {sameHidden > 0 && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowSame((s) => new Set(s).add(n.id))}
                className="flex h-6 w-full cursor-pointer items-center rounded-[7px] text-left font-sans text-[11.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                style={{ paddingLeft: keyStart(n.depth + 1) }}
              >
                {sameHidden} unchanged
              </button>
            )}
            <div aria-hidden="true" className="font-mono text-[12px] leading-[22px] text-muted-foreground" style={{ paddingLeft: keyStart(n.depth) }}>
              {n.kind === "array" ? "]" : "}"}
            </div>
          </Fold>
        )}
      </React.Fragment>
    );
  };

  /* ── Parse error ── */

  if (!parsed.ok) {
    const { message, line, column } = parsed.error;
    const lines = (text ?? "").split("\n");
    const from = Math.max(1, line - 2);
    const to = Math.min(lines.length, line + 2);
    return (
      <div className={`overflow-hidden rounded-[18px] border border-border bg-background text-foreground ${className}`} {...props}>
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400" role="alert">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5 shrink-0">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.75v3.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="8" cy="11" r="1" fill="currentColor" />
          </svg>
          <span className="min-w-0">
            Not valid JSON: {message}. Line {line}, column {column}.
          </span>
        </div>
        <pre className="overflow-x-auto py-2 font-mono text-[12px] leading-[22px]">
          {lines.slice(from - 1, to).map((l, i) => {
            const n = from + i;
            const bad = n === line;
            return (
              <React.Fragment key={n}>
                <div className={`flex ${bad ? "bg-red-500/[0.07]" : ""}`}>
                  <span className="w-10 shrink-0 select-none pr-3 text-right text-muted-foreground">{n}</span>
                  <span className="whitespace-pre pr-4">{l || " "}</span>
                </div>
                {bad && (
                  <div className="flex text-red-600 dark:text-red-400" aria-hidden="true">
                    <span className="w-10 shrink-0" />
                    <span className="whitespace-pre">{" ".repeat(Math.max(0, column - 1))}^</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </pre>
      </div>
    );
  }

  /* ── The inspector ── */

  return (
    <div className={`@container overflow-hidden rounded-[18px] border border-border bg-background text-foreground ${className}`} {...props}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-border px-3 py-2">
        {/* The title keeps room to be read; the search wraps onto its own line before it truncates. */}
        {title && <div className="min-w-[min(100%,13rem)] flex-1 truncate text-[12.5px] font-medium">{title}</div>}
        {diff && (
          <div className="flex shrink-0 items-center gap-2 text-[11.5px] tabular-nums">
            {counts.changed > 0 && <span className="text-amber-700 dark:text-amber-400">{counts.changed} changed</span>}
            {counts.added > 0 && <span className="text-emerald-700 dark:text-emerald-400">{counts.added} added</span>}
            {counts.removed > 0 && <span className="text-red-600 dark:text-red-400">{counts.removed} removed</span>}
            {!counts.changed && !counts.added && !counts.removed && <span className="text-muted-foreground">No changes</span>}
          </div>
        )}
        <div className="ml-auto flex min-w-0 items-center gap-1 @max-[460px]:w-full">
          <label className="relative flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-full px-2.5 shadow-[inset_0_0_0_1px_var(--border)] transition-shadow focus-within:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ring)_55%,var(--border))] @min-[460px]:w-[190px] @min-[460px]:flex-none">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground">
              <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.25 10.25 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setMatchIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  step(e.shiftKey ? -1 : 1);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  step(1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  step(-1);
                } else if (e.key === "Escape" && typed) {
                  e.preventDefault();
                  e.stopPropagation();
                  setTyped("");
                }
              }}
              placeholder="Search keys and values"
              aria-label={`Search ${label}`}
              aria-controls={`${uid}-tree`}
              className="h-full min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground [@media(pointer:coarse)]:text-[16px]"
            />
            {/* The count and the arrows open in once there's something to step through. */}
            <span
              className="grid shrink-0"
              style={{ gridTemplateColumns: query ? "1fr" : "0fr", opacity: query ? 1 : 0, transition: reduced ? "none" : `grid-template-columns 300ms ${EASE}, opacity 200ms ${EASE}` }}
            >
              <span className="flex min-w-0 items-center overflow-hidden [clip-path:inset(-4px)]">
                <span className={`whitespace-nowrap pl-1 text-[11.5px] tabular-nums ${matches.length ? "text-muted-foreground" : "text-red-600 dark:text-red-400"}`}>
                  {matches.length ? (
                    <>
                      <NumberRoll value={Math.min(matchIndex, matches.length - 1) + 1} duration={500} />/<NumberRoll value={matches.length} duration={500} />
                    </>
                  ) : (
                    "0"
                  )}
                </span>
                <button type="button" tabIndex={query ? 0 : -1} aria-label="Previous match" onClick={() => step(-1)} className={`ml-1 flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground ${FOCUS}`}>
                  <svg viewBox="0 0 16 16" fill="none" className="size-3" aria-hidden="true">
                    <path d="M4.5 9.75 8 6.25l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button type="button" tabIndex={query ? 0 : -1} aria-label="Next match" onClick={() => step(1)} className={`flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground ${FOCUS}`}>
                  <svg viewBox="0 0 16 16" fill="none" className="size-3" aria-hidden="true">
                    <path d="M4.5 6.25 8 9.75l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </span>
            </span>
          </label>
          {diff ? (
            <button
              type="button"
              aria-pressed={!onlyChanges}
              onClick={() => setOnlyChanges((v) => !v)}
              className={`h-7 shrink-0 cursor-pointer rounded-full px-2.5 text-[12px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}
            >
              <TextMorph>{onlyChanges ? "Show all" : "Only changes"}</TextMorph>
            </button>
          ) : (
            <button
              type="button"
              aria-label={allOpen ? "Collapse all" : "Expand all"}
              onClick={() => {
                if (allOpen) setExpanded(new Set([root.id]));
                else setExpanded(new Set(all.filter((n) => isContainer(n)).slice(0, 3000).map((n) => n.id)));
                setFocusId(root.id);
              }}
              className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}
            >
              <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden="true">
                <path
                  d="M5 6.5 8 3.5l3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: allOpen ? "translateY(2.5px) rotate(180deg)" : "none", transformOrigin: "8px 5px", transition: reduced ? "none" : `transform 320ms ${EASE}` }}
                />
                <path
                  d="M5 9.5 8 12.5l3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: allOpen ? "translateY(-2.5px) rotate(180deg)" : "none", transformOrigin: "8px 11px", transition: reduced ? "none" : `transform 320ms ${EASE}` }}
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div ref={scrollerRef} className="overflow-auto overscroll-contain p-1.5" style={{ maxHeight }}>
        <div id={`${uid}-tree`} role="tree" aria-label={label} onKeyDown={onTreeKey} className="min-w-0">
          {renderNode(root, null, 0, 1)}
        </div>
      </div>

      <div className="flex h-10 items-center gap-1 border-t border-border pl-3.5 pr-1.5">
        <code className="flex min-w-0 flex-1 justify-end overflow-hidden whitespace-nowrap font-mono text-[11.5px] text-muted-foreground [mask-image:linear-gradient(to_right,transparent,black_16px)]">
          <span className="ml-auto shrink-0">
            <TextMorph duration={360}>{focusPath}</TextMorph>
          </span>
        </code>
        <StatusButton variant="ghost" size="sm" status={copied.path} labels={{ idle: "Copy path", success: "Copied", error: "Couldn’t copy" }} onClick={() => void copy("path")} onReset={() => setCopied((c) => ({ ...c, path: "idle" }))} resetAfter={1400} />
        <StatusButton variant="ghost" size="sm" status={copied.value} labels={{ idle: "Copy value", success: "Copied", error: "Couldn’t copy" }} onClick={() => void copy("value")} onReset={() => setCopied((c) => ({ ...c, value: "idle" }))} resetAfter={1400} />
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
