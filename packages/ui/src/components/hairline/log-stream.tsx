"use client";

import * as React from "react";
import { ArrowDown, Search } from "lucide-react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * LOG STREAM: a live tail you can actually read
 *
 *   tail      lines arrive in batches, one render per frame
 *             however fast they come, and the view stays
 *             pinned to the newest line
 *   read      scroll up and the view lets go: lines keep
 *             arriving underneath, and a "↓ 128 new" pill rises
 *             with its count rolling; one tap takes you back
 *             down and pins it again
 *   pause     Live → Paused holds new lines back without
 *             losing them ("Paused · 42 waiting"); Live plays
 *             them in
 *   filter    level chips count as lines arrive and hide what
 *             you don't need; search marks every match ("/"
 *             focuses it)
 *   open      a line with data opens into its fields under it,
 *             by height, with Copy
 *   earlier   reach the top and older lines load in above
 *             without moving what you're reading
 *
 * Lines are plain records; subscribe() feeds them from SSE, a
 * WebSocket, Supabase Realtime or a poll.
 * ───────────────────────────────────────────────────────── */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type DateLike = Date | string | number;

export interface LogLine {
  id: string;
  at: DateLike;
  level: LogLevel;
  message: string;
  /** Where it came from: "api", "worker", "cron". */
  source?: string;
  /** Fields shown when the line is opened. */
  data?: Record<string, unknown>;
}

export interface LogStreamProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  /** Lines to start with, oldest first. */
  defaultValue?: LogLine[];
  /** Starts the tail: call push with new lines; return a function that stops it. */
  subscribe?: (push: (lines: LogLine | LogLine[]) => void) => () => void;
  /** Loads lines older than the first one shown, oldest first; an empty list means there are no more. */
  loadEarlier?: (before: LogLine) => Promise<LogLine[]>;
  /** Lines kept in memory while you're at the bottom. */
  max?: number;
  /** The scrolling area's height. */
  height?: number | string;
  title?: string;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const LEVELS: LogLevel[] = ["error", "warn", "info", "debug"];
const NAMES: Record<LogLevel, string> = { error: "Errors", warn: "Warnings", info: "Info", debug: "Debug" };
const TONE: Record<LogLevel, string> = {
  error: "text-red-600 dark:text-red-400",
  warn: "text-amber-700 dark:text-amber-400",
  info: "text-muted-foreground",
  debug: "text-muted-foreground/60",
};
const TICK: Record<LogLevel, string> = { error: "bg-red-500", warn: "bg-amber-500", info: "bg-transparent", debug: "bg-transparent" };
const NONE: LogLine[] = [];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const toTime = (d: DateLike) => (d instanceof Date ? d.getTime() : typeof d === "number" ? d : new Date(d).getTime());
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const clock = (d: DateLike) => {
  const t = new Date(toTime(d));
  return `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}.${pad(t.getMilliseconds(), 3)}`;
};

/** The message with every match marked. */
function Marked({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let i = 0;
  let at = lower.indexOf(q);
  while (at !== -1) {
    if (at > i) parts.push(text.slice(i, at));
    parts.push(
      <mark key={at} className="rounded-[3px] bg-primary/15 text-inherit">
        {text.slice(at, at + q.length)}
      </mark>,
    );
    i = at + q.length;
    at = lower.indexOf(q, i);
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
}

function Value({ v }: { v: unknown }) {
  if (v === null || v === undefined) return <span className="text-muted-foreground">{String(v)}</span>;
  if (typeof v === "number" || typeof v === "boolean") return <span className="text-primary">{String(v)}</span>;
  if (typeof v === "string") return <span className="text-foreground">&quot;{v}&quot;</span>;
  return <span className="text-foreground">{JSON.stringify(v)}</span>;
}

interface RowProps {
  line: LogLine;
  open: boolean;
  query: string;
  enter: boolean;
  reduced: boolean;
  toggle: (id: string) => void;
}

const Row = React.memo(function Row({ line, open, query, enter, reduced, toggle }: RowProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);
  const has = Boolean(line.data && Object.keys(line.data).length);

  React.useLayoutEffect(() => {
    if (enter && !reduced) ref.current?.animate([{ opacity: 0, filter: "blur(2px)" }, { opacity: 1, filter: "blur(0px)" }], { duration: 260, easing: EASE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const head = (
    <>
      <span aria-hidden="true" className={`absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full ${TICK[line.level]}`} />
      <time dateTime={new Date(toTime(line.at)).toISOString()} className="hidden w-[6.6rem] shrink-0 text-muted-foreground tabular-nums @md:block">
        {clock(line.at)}
      </time>
      <span className={`w-[2.6rem] shrink-0 uppercase ${TONE[line.level]}`}>{line.level === "error" ? "err" : line.level}</span>
      {line.source && <span className="hidden w-[4.5rem] shrink-0 truncate text-muted-foreground @sm:block">{line.source}</span>}
      <span className="min-w-0 flex-1 truncate text-foreground">
        <Marked text={line.message} query={query} />
      </span>
    </>
  );

  return (
    <div ref={ref} role="listitem" className="[contain-intrinsic-size:auto_28px] [content-visibility:auto]">
      {has ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => toggle(line.id)}
          className={`relative flex h-7 w-full cursor-pointer items-center gap-3 rounded-[6px] pr-2 pl-3 text-left transition-colors hover:bg-accent/70 ${open ? "bg-accent/70" : ""} ${FOCUS}`}
        >
          {head}
        </button>
      ) : (
        <div className="relative flex h-7 items-center gap-3 pr-2 pl-3">{head}</div>
      )}
      {has && (
        <div className="grid" inert={!open} style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-rows 320ms ${EASE}` }}>
          <div className="min-h-0 min-w-0 overflow-clip">
            {open && (
              <div className="relative my-1 ml-3 rounded-[10px] px-3 py-2 shadow-[inset_0_0_0_1px_var(--border)] @md:ml-[7.6rem]">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(JSON.stringify({ at: new Date(toTime(line.at)).toISOString(), level: line.level, source: line.source, message: line.message, ...line.data }, null, 2));
                      setCopied(true);
                    } catch {
                      /* The fields are on screen to select. */
                    }
                  }}
                  className={`absolute top-1.5 right-1.5 h-6 cursor-pointer rounded-full px-2 font-sans text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}
                >
                  <TextMorph>{copied ? "Copied" : "Copy"}</TextMorph>
                </button>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 pr-14">
                  {Object.entries(line.data!).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="min-w-0 break-all">
                        <Value v={v} />
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export function LogStream({ defaultValue = NONE, subscribe, loadEarlier, max = 1000, height = 420, title = "Logs", className = "", ...props }: LogStreamProps) {
  const reduced = useReducedMotion();
  const id = React.useId();
  const [lines, setLines] = React.useState<LogLine[]>(defaultValue);
  const [paused, setPaused] = React.useState(false);
  const [held, setHeld] = React.useState(0);
  const [below, setBelow] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [shown, setShown] = React.useState<Set<LogLevel>>(() => new Set(LEVELS));
  const [open, setOpen] = React.useState<Set<string>>(() => new Set());
  const [loading, setLoading] = React.useState(false);
  const [noMore, setNoMore] = React.useState(!loadEarlier);
  const [fresh, setFresh] = React.useState<Set<string>>(() => new Set());
  const [announce, setAnnounce] = React.useState("");

  const viewRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const incoming = React.useRef<LogLine[]>([]);
  const holding = React.useRef<LogLine[]>([]);
  const frame = React.useRef(0);
  const stuck = React.useRef(true);
  const intent = React.useRef(0);
  const keep = React.useRef<number | null>(null);
  const pausedRef = React.useRef(paused);
  const linesRef = React.useRef(lines);
  React.useLayoutEffect(() => {
    pausedRef.current = paused;
    linesRef.current = lines;
  });

  // Stable, so the memoised rows don't re-render when it's passed down.
  const toggle = React.useCallback(
    (lineId: string) =>
      setOpen((o) => {
        const next = new Set(o);
        if (next.has(lineId)) next.delete(lineId);
        else next.add(lineId);
        return next;
      }),
    [],
  );

  // New lines wait for the next frame, so a burst is one render.
  const flush = React.useCallback(() => {
    frame.current = 0;
    const batch = incoming.current;
    incoming.current = [];
    if (!batch.length) return;
    setLines((prev) => {
      const next = prev.concat(batch);
      // Trim only while pinned to the bottom, so lines never vanish from under someone reading.
      return stuck.current && next.length > max ? next.slice(next.length - max) : next;
    });
    setFresh(batch.length <= 12 ? new Set(batch.map((l) => l.id)) : new Set());
    if (!stuck.current) setBelow((b) => b + batch.length);
  }, [max]);

  const push = React.useCallback(
    (input: LogLine | LogLine[]) => {
      const list = Array.isArray(input) ? input : [input];
      if (pausedRef.current) {
        holding.current.push(...list);
        setHeld(holding.current.length);
        return;
      }
      incoming.current.push(...list);
      if (!frame.current) frame.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  React.useEffect(() => {
    if (!subscribe) return;
    const stop = subscribe(push);
    return () => {
      stop();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [subscribe, push]);

  // Pinned: every commit ends on the newest line. Loading earlier: the line you were reading stays put.
  React.useLayoutEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (keep.current !== null) {
      view.scrollTop += view.scrollHeight - keep.current;
      keep.current = null;
      return;
    }
    if (stuck.current) view.scrollTop = view.scrollHeight;
  }, [lines, shown, query]);

  const onScroll = () => {
    const view = viewRef.current;
    if (!view) return;
    const atBottom = view.scrollHeight - view.scrollTop - view.clientHeight < 24;
    if (atBottom) {
      stuck.current = true;
      setBelow(0);
    } else if (performance.now() - intent.current < 900) {
      // Only a scroll the reader made lets go; content changing size doesn't.
      stuck.current = false;
    }
  };
  const meant = () => (intent.current = performance.now());

  const toBottom = () => {
    const view = viewRef.current;
    if (!view) return;
    stuck.current = true;
    setBelow(0);
    view.scrollTo({ top: view.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  };

  const setLive = (live: boolean) => {
    setPaused(!live);
    if (live) {
      const waiting = holding.current;
      holding.current = [];
      setHeld(0);
      if (waiting.length) {
        incoming.current.push(...waiting);
        if (!frame.current) frame.current = requestAnimationFrame(flush);
      }
      setAnnounce(waiting.length ? `Live. ${waiting.length} lines played in.` : "Live.");
    } else setAnnounce("Paused. New lines are held.");
  };

  // Older lines, when the top comes into view.
  React.useEffect(() => {
    const el = sentinelRef.current;
    const view = viewRef.current;
    if (!el || !view || !loadEarlier || noMore) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loading) return;
        const first = linesRef.current[0];
        if (!first) return;
        setLoading(true);
        try {
          const older = await loadEarlier(first);
          if (!older.length) setNoMore(true);
          else {
            keep.current = viewRef.current?.scrollHeight ?? null;
            setFresh(new Set());
            setLines((prev) => older.concat(prev));
          }
        } finally {
          setLoading(false);
        }
      },
      { root: view, rootMargin: "120px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadEarlier, noMore, loading]);

  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const counts = React.useMemo(() => {
    const c: Record<LogLevel, number> = { error: 0, warn: 0, info: 0, debug: 0 };
    for (const l of lines) c[l.level]++;
    return c;
  }, [lines]);
  const q = query.trim();
  const visible = React.useMemo(() => lines.filter((l) => shown.has(l.level) && (!q || l.message.toLowerCase().includes(q.toLowerCase()) || l.source?.toLowerCase().includes(q.toLowerCase()))), [lines, shown, q]);

  return (
    <div
      className={`@container w-full rounded-[22px] border border-border bg-background text-foreground ${className}`}
      onKeyDown={(e) => {
        if (e.key === "/" && document.activeElement !== searchRef.current) {
          e.preventDefault();
          searchRef.current?.focus();
        } else if (e.key === "Escape" && document.activeElement === searchRef.current && query) {
          setQuery("");
        }
      }}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 @md:px-4">
        <button
          type="button"
          aria-pressed={!paused}
          onClick={() => setLive(paused)}
          className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-2 rounded-full px-2.5 text-[12px] font-medium shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-accent ${FOCUS}`}
        >
          <span className="relative grid size-2 place-items-center" aria-hidden="true">
            <span className={`size-1.5 rounded-full transition-colors duration-300 ${paused ? "bg-muted-foreground" : "bg-emerald-500"}`} />
            {!paused && !reduced && <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-40 animate-[ui-ping_1.6s_ease-out_infinite]" />}
          </span>
          <TextMorph>{paused ? "Paused" : "Live"}</TextMorph>
          <span
            aria-hidden={!(paused && held) || undefined}
            className="-ml-2 inline-grid text-muted-foreground"
            style={{ gridTemplateColumns: paused && held ? "1fr" : "0fr", opacity: paused && held ? 1 : 0, transition: reduced ? "none" : `grid-template-columns 380ms ${EASE}, opacity 240ms ${EASE}` }}
          >
            <span className="min-w-0 [clip-path:inset(-4px_0)]">
              <span className="inline-flex items-baseline pl-2 font-normal whitespace-nowrap tabular-nums">
                ·&nbsp;
                <NumberRoll value={held || 1} />
                &nbsp;waiting
              </span>
            </span>
          </span>
        </button>

        <label className="flex h-7 min-w-[9rem] flex-1 items-center gap-1.5 rounded-full px-2.5 shadow-[inset_0_0_0_1px_var(--border)] transition-shadow focus-within:shadow-[inset_0_0_0_1px_var(--ring)]">
          <Search className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only">Search {title}</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground/70 [@media(pointer:fine)]:text-[12.5px] [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd aria-hidden="true" className="hidden rounded-[5px] px-1 font-mono text-[10.5px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] [@media(pointer:fine)]:block">
            /
          </kbd>
        </label>

        <div role="group" aria-label="Levels" className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] @lg:mx-0 @lg:px-0">
          {LEVELS.map((lv) => {
            const on = shown.has(lv);
            return (
              <button
                key={lv}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setShown((s) => {
                    const next = new Set(s);
                    if (next.has(lv)) next.delete(lv);
                    else next.add(lv);
                    return next;
                  })
                }
                className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap transition-[background-color,color,box-shadow,opacity] duration-200 ${FOCUS} ${
                  on ? "bg-accent text-foreground shadow-[inset_0_0_0_1px_var(--border)]" : "text-muted-foreground opacity-60 hover:opacity-100"
                }`}
              >
                {(lv === "error" || lv === "warn") && <span aria-hidden="true" className={`size-1.5 rounded-full ${TICK[lv]}`} />}
                {NAMES[lv]}
                <span className="font-normal text-muted-foreground tabular-nums">
                  <NumberRoll value={counts[lv]} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div
          ref={viewRef}
          onScroll={onScroll}
          onWheel={meant}
          onTouchMove={meant}
          onKeyDown={meant}
          onPointerDown={(e) => e.target === e.currentTarget && meant()}
          tabIndex={0}
          aria-label={`${title}, newest at the bottom`}
          className={`overflow-y-auto overscroll-contain px-1.5 py-1.5 font-mono text-[12px] @md:px-2 ${FOCUS} focus-visible:ring-inset`}
          style={{ height }}
        >
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
          {loadEarlier && (
            <p className="flex h-7 items-center justify-center gap-2 font-sans text-[11.5px] text-muted-foreground">
              {noMore ? "Start of the log" : loading ? "Loading earlier lines" : "Scroll up for earlier lines"}
            </p>
          )}
          <div role="list" aria-label={title} id={`${id}-list`}>
            {visible.map((l) => (
              <Row key={l.id} line={l} open={open.has(l.id)} query={q} enter={fresh.has(l.id)} reduced={reduced} toggle={toggle} />
            ))}
          </div>
          {!visible.length && (
            <p className="flex h-24 items-center justify-center font-sans text-[12.5px] text-muted-foreground">
              {lines.length ? "No lines match." : paused ? "Paused." : "Waiting for the first line…"}
            </p>
          )}
        </div>

        {/* Lines that arrived while you were reading further up. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <button
            type="button"
            onClick={toBottom}
            tabIndex={below ? 0 : -1}
            aria-hidden={!below || undefined}
            className={`pointer-events-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 text-[12px] font-medium shadow-[inset_0_0_0_1px_var(--border)] transition-[transform,opacity] hover:bg-accent ${FOCUS} ${below ? "" : "pointer-events-none"}`}
            style={{ opacity: below ? 1 : 0, transform: below ? "none" : "translateY(10px) scale(0.96)", transitionDuration: reduced ? "0ms" : "420ms", transitionTimingFunction: EASE }}
          >
            <ArrowDown className="size-3.5" strokeWidth={2} aria-hidden="true" />
            <span className="inline-flex items-baseline tabular-nums">
              <NumberRoll value={below || 1} />
              &nbsp;new
            </span>
          </button>
        </div>
      </div>

      <span className="sr-only" role="status">
        {announce}
      </span>
    </div>
  );
}
