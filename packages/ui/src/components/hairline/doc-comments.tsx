"use client";

import * as React from "react";
import { Check, MessageSquare, MessageSquarePlus } from "lucide-react";
import { NumberRoll } from "./number-roll";
import { StatusButton, type ActionStatus } from "./status-button";

/* ─────────────────────────────────────────────────────────
 * DOC COMMENTS: review threads beside the text they're about
 *
 *   margin    every thread sits level with the line it quotes;
 *             threads that would overlap stack downwards
 *   focus     choose a thread (or its highlighted text) and it
 *             lines up exactly with its line while the others
 *             slide up and down out of its way
 *   comment   select text and a Comment pill appears in the
 *             margin beside it; the pill grows into the
 *             composer, and the thread takes its place
 *   reply     replies rise in and the count rolls; a reply that
 *             fails keeps its words and says Try again
 *   resolve   the highlight fades and the card holds "Resolved ·
 *             Undo" over a draining hairline, then folds away
 *   narrow    no margin: a count sits at the end of the line,
 *             and the paragraph opens a gap for the thread under
 *             itself
 *
 * Threads find their text by quoting it ({ quote, prefix,
 * suffix }), so they survive edits around them. Highlights are
 * drawn under the text, never written into it: any content works.
 * ───────────────────────────────────────────────────────── */

export interface CommentAuthor {
  id: string;
  name: string;
  image?: string;
}

export interface DocComment {
  id: string;
  author: CommentAuthor;
  body: string;
  createdAt: Date | string | number;
}

/** The text a thread is about: the words themselves, and a little of what comes before and after to tell repeats apart. */
export interface CommentAnchor {
  quote: string;
  prefix?: string;
  suffix?: string;
}

export interface DocThread {
  id: string;
  anchor: CommentAnchor;
  comments: DocComment[];
  resolved?: boolean;
}

export interface DocCommentsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  /** The document. Any markup: it's read, never changed. */
  children: React.ReactNode;
  threads?: DocThread[];
  defaultThreads?: DocThread[];
  onThreadsChange?: (threads: DocThread[]) => void;
  /** Who is commenting. */
  user: CommentAuthor;
  /** Turns on commenting on a selection. Resolve with the stored thread to take its ids; throw to keep the words and say Try again. */
  onCreate?: (anchor: CommentAnchor, body: string) => Promise<DocThread | void> | DocThread | void;
  /** Turns on replies. Resolve with the stored comment; throw to keep the words and say Try again. */
  onReply?: (thread: DocThread, body: string) => Promise<DocComment | void> | DocComment | void;
  /** Turns on Resolve. Runs once the chance to undo is over; throw to open the thread again. */
  onResolve?: (thread: DocThread) => Promise<void> | void;
  undoFor?: number;
  locales?: string;
  label?: string;
}

type Box = { top: number; left: number; width: number; height: number };
type Found = { id: string; rects: Box[]; top: number; bottom: number; order: number; endOffset: number };
type Draft = { id: string; anchor: CommentAnchor; status: ActionStatus };
type Pending = { anchor: CommentAnchor; top: number; bottom: number; left: number };
type TextIndex = { text: string; nodes: { node: Text; start: number }[] };

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const GLIDE = "cubic-bezier(0.77,0,0.175,1)";
const GAP = 8;
const MARGIN_W = 256;
const NARROW = 620;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const NO_THREADS: DocThread[] = [];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

let seq = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

function indexText(root: HTMLElement): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: TextIndex["nodes"] = [];
  let text = "";
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    nodes.push({ node: n, start: text.length });
    text += n.data;
  }
  return { text, nodes };
}

/** The text node and offset at a place in the text; an end prefers the node it closes. */
function locate(index: TextIndex, offset: number, isEnd: boolean): [Text, number] | null {
  for (const { node, start } of index.nodes) {
    const end = start + node.data.length;
    if (isEnd ? offset > start && offset <= end : offset >= start && offset < end) return [node, offset - start];
  }
  return null;
}

/** Where the quote is: the occurrence whose surroundings match the anchor best. */
function findAnchor({ text }: TextIndex, anchor: CommentAnchor): [number, number] | null {
  const q = anchor.quote;
  if (!q) return null;
  const p = anchor.prefix ?? "";
  const s = anchor.suffix ?? "";
  let best = -1;
  let bestScore = -1;
  for (let at = text.indexOf(q); at >= 0; at = text.indexOf(q, at + 1)) {
    let score = 0;
    for (let k = 1; k <= p.length && text[at - k] === p[p.length - k]; k++) score++;
    for (let k = 0; k < s.length && text[at + q.length + k] === s[k]; k++) score++;
    if (score > bestScore) {
      best = at;
      bestScore = score;
    }
  }
  return best < 0 ? null : [best, best + q.length];
}

/** One box per line of a range, in the content's coordinates. */
function lineBoxes(range: Range, origin: DOMRect): Box[] {
  const out: Box[] = [];
  for (const r of range.getClientRects()) {
    if (r.width < 0.5 || r.height < 1) continue;
    const top = r.top - origin.top;
    const last = out[out.length - 1];
    if (last && Math.abs(last.top - top) < 3) {
      const right = Math.max(last.left + last.width, r.right - origin.left);
      last.left = Math.min(last.left, r.left - origin.left);
      last.width = right - last.left;
      last.height = Math.max(last.height, r.height);
    } else out.push({ top, left: r.left - origin.left, width: r.width, height: r.height });
  }
  return out;
}

/** Cards in the margin: each wants to sit at its line; the chosen one does, the rest make way above and below it. */
function solve(items: { id: string; want: number }[], height: (id: string) => number, active: string | null) {
  const pos = new Map<string, number>();
  const down = (from: number, floor: number) => {
    let y = floor;
    for (let i = from; i < items.length; i++) {
      const top = Math.max(items[i].want, y);
      pos.set(items[i].id, top);
      y = top + height(items[i].id) + GAP;
    }
  };
  const a = items.findIndex((i) => i.id === active);
  if (a < 0) {
    down(0, 0);
    return pos;
  }
  pos.set(items[a].id, items[a].want);
  down(a + 1, items[a].want + height(items[a].id) + GAP);
  let ceiling = items[a].want - GAP;
  for (let i = a - 1; i >= 0; i--) {
    const top = Math.min(items[i].want, ceiling - height(items[i].id));
    pos.set(items[i].id, top);
    ceiling = top - GAP;
  }
  // No room above the chosen one: stack from the top instead.
  if (items.length && (pos.get(items[0].id) ?? 0) < 0) down(0, 0);
  return pos;
}

function Avatar({ author }: { author: CommentAuthor }) {
  return author.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={author.image} alt="" className="size-5 shrink-0 rounded-full object-cover shadow-[0_0_0_1px_var(--border)]" />
  ) : (
    <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9.5px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
      {author.name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}

/** A textarea that grows with what's typed. */
function Grow({ value, onChange, onKeyDown, placeholder, label, autoFocus }: { value: string; onChange: (v: string) => void; onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void; placeholder: string; label: string; autoFocus?: boolean }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  React.useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label={label}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className="block max-h-40 w-full resize-none bg-transparent text-[13px] leading-[1.45] outline-none placeholder:text-muted-foreground [@media(pointer:coarse)]:text-[16px]"
    />
  );
}

type CardActions = {
  activate: (id: string) => void;
  reply: (thread: DocThread, body: string) => Promise<boolean>;
  resolve: (thread: DocThread) => void;
  undo: (thread: DocThread) => void;
  finish: (thread: DocThread) => void;
  create: (draft: Draft, body: string) => void;
  cancel: () => void;
  height: (id: string, h: number) => void;
};

/** One thread (or the draft of one): its outer box eases to the height of what's inside, measured once per change. */
function Card({
  id,
  thread,
  draft,
  active,
  resolving,
  canReply,
  canResolve,
  user,
  when,
  note,
  holdKey,
  undoFor,
  grow,
  reduced,
  actions,
}: {
  id: string;
  thread?: DocThread;
  draft?: Draft;
  active: boolean;
  resolving: number | null;
  canReply: boolean;
  canResolve: boolean;
  user: CommentAuthor;
  when: (d: DocComment["createdAt"]) => string;
  note?: string;
  holdKey?: number;
  undoFor: number;
  grow: boolean;
  reduced: boolean;
  actions: React.RefObject<CardActions>;
}) {
  const outer = React.useRef<HTMLElement>(null);
  const inner = React.useRef<HTMLDivElement>(null);
  const [h, setH] = React.useState<number | null>(null);
  const [text, setText] = React.useState("");
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [hold, setHold] = React.useState(false);
  const [initialCommentIds] = React.useState(() => new Set(thread?.comments.map((c) => c.id) ?? []));
  // A draft that became its thread: the composer starts empty for replies.
  const [prevDraft, setPrevDraft] = React.useState(!!draft);
  if (prevDraft !== !!draft) {
    setPrevDraft(!!draft);
    if (prevDraft && !draft && text) setText("");
  }

  React.useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => {
      const next = el.offsetHeight;
      setH((p) => (p === next ? p : next));
      actions.current.height(id, next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [id, actions]);

  // The Comment pill grows into the composer: one clip, once.
  React.useLayoutEffect(() => {
    if (grow && !reduced)
      outer.current?.animate(
        [
          { clipPath: "inset(0 calc(100% - 104px) calc(100% - 28px) 0 round 14px)", opacity: 0.7 },
          { clipPath: "inset(0 0 0 0 round 14px)", opacity: 1 },
        ],
        { duration: 320, easing: EASE },
      );
  }, [grow, reduced]);

  const comments = thread?.comments ?? [];
  const first = comments[0];
  const replies = Math.max(0, comments.length - 1);
  const quote = draft?.anchor.quote ?? thread?.anchor.quote ?? "";
  const send = async () => {
    const body = text.trim();
    if (!body || status === "pending") return;
    if (draft) {
      actions.current.create(draft, body);
      return;
    }
    if (!thread) return;
    setStatus("pending");
    const ok = await actions.current.reply(thread, body);
    setStatus(ok ? "success" : "error");
    if (ok) setText("");
  };
  const keys = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (draft) actions.current.cancel();
      else (outer.current as HTMLElement | null)?.focus();
    }
  };

  return (
    <article
      ref={outer}
      tabIndex={draft ? -1 : 0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || !thread) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          actions.current.activate(thread.id);
        }
        if (e.key === "Escape") actions.current.activate("");
      }}
      aria-label={draft ? `New comment on “${quote}”` : `${first?.author.name ?? "Comment"} on “${quote}”${replies ? `, ${replies} ${replies === 1 ? "reply" : "replies"}` : ""}`}
      onClick={() => thread && !active && actions.current.activate(thread.id)}
      className={`overflow-clip rounded-[14px] bg-background text-left ${active ? "" : "cursor-pointer"} ${FOCUS}`}
      style={{
        height: h ?? undefined,
        boxShadow: active ? "inset 0 0 0 1px var(--ring), 0 0 0 0 transparent" : "inset 0 0 0 1px var(--border)",
        transition: reduced || h === null ? "none" : `height 260ms ${EASE}, box-shadow 200ms ${EASE}`,
      }}
    >
      <div ref={inner} className="p-3">
        {draft ? (
          <>
            <div className="flex items-center gap-2 text-[12.5px] font-medium">
              <Avatar author={user} />
              {user.name}
            </div>
            <div className="mt-2">
              <Grow value={text} onChange={setText} onKeyDown={keys} placeholder="Add a comment…" label={`Comment on “${quote}”`} autoFocus />
            </div>
            <div className="mt-2.5 flex items-center justify-end gap-1">
              <button type="button" onClick={() => actions.current.cancel()} className={`inline-flex h-7 cursor-pointer items-center rounded-full px-2.5 text-[12.5px] text-muted-foreground hover:bg-accent hover:text-foreground ${FOCUS}`}>
                Cancel
              </button>
              <StatusButton size="sm" status={draft.status} labels={{ idle: "Comment", pending: "Posting", success: "Posted", error: "Try again" }} disabled={!text.trim()} onClick={send} />
            </div>
          </>
        ) : resolving !== null && thread ? (
          <div className="relative flex h-7 items-center gap-2 text-[12.5px]" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
            <span className="flex size-5 items-center justify-center text-emerald-600 dark:text-emerald-400" aria-hidden="true">
              <Check className="size-3.5" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">Resolved</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.current.undo(thread);
              }}
              className={`inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full px-2.5 font-medium hover:bg-accent ${FOCUS}`}
            >
              Undo
            </button>
            <span
              key={holdKey}
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-3 h-px origin-left bg-foreground/40"
              style={{ animation: `ui-progress ${undoFor}ms linear reverse forwards`, animationPlayState: hold ? "paused" : "running" }}
              onAnimationEnd={() => actions.current.finish(thread)}
            />
          </div>
        ) : (
          <>
            {comments.map((c, i) => (
              <CommentItem key={c.id} comment={c} when={when} clamp={!active && i === 0} hidden={!active && i > 0} enter={!initialCommentIds.has(c.id)} reduced={reduced}>
                {i === 0 && active && canResolve && thread && (
                  <button
                    type="button"
                    aria-label={`Resolve the thread on “${quote}”`}
                    title="Resolve"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.current.resolve(thread);
                    }}
                    className={`-my-1 -mr-1 ml-auto flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground ${FOCUS}`}
                  >
                    <Check className="size-3.5" strokeWidth={2} />
                  </button>
                )}
              </CommentItem>
            ))}
            {!active && replies > 0 && (
              <p className="mt-1.5 text-[12px] tabular-nums text-muted-foreground">
                <NumberRoll value={replies} /> {replies === 1 ? "reply" : "replies"}
              </p>
            )}
            {active && canReply && thread && (
              <div className="mt-2.5 border-t border-border pt-2.5" onClick={(e) => e.stopPropagation()}>
                <Grow value={text} onChange={(v) => (setText(v), status === "error" && setStatus("idle"))} onKeyDown={keys} placeholder="Reply…" label={`Reply to ${first?.author.name ?? "the thread"}`} />
                <div className="grid transition-[grid-template-rows] duration-200" style={{ gridTemplateRows: text.trim() || status !== "idle" ? "1fr" : "0fr", transitionTimingFunction: EASE }}>
                  <div className="min-h-0 overflow-hidden">
                    <div className="flex justify-end pt-2">
                      <StatusButton size="sm" status={status} labels={{ idle: "Reply", pending: "Sending", success: "Sent", error: "Try again" }} onClick={send} onReset={() => setStatus("idle")} resetAfter={1200} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {note && <p className="mt-2 text-[12px] text-red-600 dark:text-red-400">{note}</p>}
          </>
        )}
      </div>
    </article>
  );
}

function CommentItem({ comment, when, clamp, hidden, enter, reduced, children }: { comment: DocComment; when: (d: DocComment["createdAt"]) => string; clamp: boolean; hidden: boolean; enter: boolean; reduced: boolean; children?: React.ReactNode }) {
  // Decided once: a reply that arrives after the card is on screen rises in; the ones it opened with don't.
  const [isNew] = React.useState(enter);
  return (
    <div
      className={hidden ? "hidden" : "mt-2.5 first:mt-0"}
      ref={(el) => {
        if (!el || !isNew || reduced || el.dataset.in) return;
        el.dataset.in = "1";
        el.animate(
          [
            { opacity: 0, transform: "translateY(4px)", filter: "blur(3px)" },
            { opacity: 1, transform: "none", filter: "blur(0px)" },
          ],
          { duration: 320, easing: EASE, fill: "backwards" },
        );
      }}
    >
      <div className="flex items-center gap-2 text-[12.5px]">
        <Avatar author={comment.author} />
        <span className="min-w-0 truncate font-medium">{comment.author.name}</span>
        <span className="shrink-0 text-[11.5px] text-muted-foreground">{when(comment.createdAt)}</span>
        {children}
      </div>
      <p className={`mt-1 whitespace-pre-wrap break-words text-[13px] leading-[1.45] ${clamp ? "line-clamp-3" : ""}`}>{comment.body}</p>
    </div>
  );
}

const MemoCard = React.memo(Card);

export function DocComments({
  children,
  threads: controlled,
  defaultThreads = NO_THREADS,
  onThreadsChange,
  user,
  onCreate,
  onReply,
  onResolve,
  undoFor = 4000,
  locales,
  label = "Comments",
  className = "",
  ...props
}: DocCommentsProps) {
  const reduced = useReducedMotion();
  const [own, setOwn] = React.useState<DocThread[]>(defaultThreads);
  const threads = controlled ?? own;
  const threadsRef = React.useRef(threads);
  const [active, setActive] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<string | null>(null);
  const [found, setFound] = React.useState<Found[]>([]);
  const [heights, setHeights] = React.useState<ReadonlyMap<string, number>>(() => new Map());
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [resolving, setResolving] = React.useState<Record<string, number>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [narrow, setNarrow] = React.useState(false);
  const [innerWidth, setInnerWidth] = React.useState(300);
  const [placed, setPlaced] = React.useState(false);
  const [now, setNow] = React.useState<number | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const [growing, setGrowing] = React.useState<string | null>(null);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const indexRef = React.useRef<TextIndex | null>(null);
  const frame = React.useRef(0);
  const pendingRef = React.useRef<Pending | null>(null);
  const draftRef = React.useRef<Draft | null>(null);
  const heightsRef = React.useRef(new Map<string, number>());
  const focusCard = React.useRef<string | null>(null);

  React.useLayoutEffect(() => {
    threadsRef.current = threads;
    pendingRef.current = pending;
    draftRef.current = draft;
  });

  const say = (text: string) => setAnnounce((a) => (a === text ? `${text} ` : text));
  const commit = (next: DocThread[]) => {
    threadsRef.current = next;
    if (controlled === undefined) setOwn(next);
    onThreadsChange?.(next);
  };

  React.useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setNow(Date.now()));
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(t);
    };
  }, []);
  const dateFmt = React.useMemo(() => new Intl.DateTimeFormat(locales, { month: "short", day: "numeric" }), [locales]);
  const when = React.useCallback(
    (d: DocComment["createdAt"]) => {
      if (now === null) return "";
      const t = new Date(d).getTime();
      const s = (now - t) / 1000;
      if (s < 60) return "now";
      if (s < 3600) return `${Math.floor(s / 60)}m`;
      if (s < 86400) return `${Math.floor(s / 3600)}h`;
      if (s < 172800) return "Yesterday";
      return dateFmt.format(t);
    },
    [now, dateFmt],
  );

  // ── Where each thread's text is ────────────────────────
  const shown = React.useMemo(() => threads.filter((t) => !t.resolved), [threads]);
  const measure = React.useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const index = (indexRef.current ??= indexText(inner));
    const origin = inner.getBoundingClientRect();
    const out: Found[] = [];
    const anchors: { id: string; anchor: CommentAnchor }[] = threadsRef.current.filter((t) => !t.resolved).map((t) => ({ id: t.id, anchor: t.anchor }));
    if (draftRef.current) anchors.push({ id: draftRef.current.id, anchor: draftRef.current.anchor });
    for (const { id, anchor } of anchors) {
      const span = findAnchor(index, anchor);
      const a = span && locate(index, span[0], false);
      const b = span && locate(index, span[1], true);
      if (!span || !a || !b) continue;
      const range = document.createRange();
      range.setStart(a[0], a[1]);
      range.setEnd(b[0], b[1]);
      const rects = lineBoxes(range, origin);
      if (!rects.length) continue;
      const last = rects[rects.length - 1];
      out.push({ id, rects, top: rects[0].top, bottom: last.top + last.height, order: span[0], endOffset: span[1] });
    }
    out.sort((x, y) => x.order - y.order);
    setFound((prev) =>
      prev.length === out.length && prev.every((p, i) => p.id === out[i].id && p.endOffset === out[i].endOffset && p.rects.length === out[i].rects.length && p.rects.every((r, k) => Math.abs(r.top - out[i].rects[k].top) < 0.5 && Math.abs(r.left - out[i].rects[k].left) < 0.5 && Math.abs(r.width - out[i].rects[k].width) < 0.5))
        ? prev
        : out,
    );
  }, []);
  const schedule = React.useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  }, [measure]);

  React.useLayoutEffect(() => {
    measure();
  }, [threads, draft, measure]);

  React.useEffect(() => {
    const inner = innerRef.current;
    const root = rootRef.current;
    if (!inner || !root) return;
    const resize = new ResizeObserver(() => {
      setNarrow(root.offsetWidth < NARROW);
      setInnerWidth(inner.offsetWidth);
      schedule();
    });
    resize.observe(inner);
    resize.observe(root);
    const mutate = new MutationObserver(() => {
      indexRef.current = null;
      schedule();
    });
    mutate.observe(inner, { childList: true, subtree: true, characterData: true });
    document.fonts?.ready.then(schedule);
    return () => {
      resize.disconnect();
      mutate.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [schedule]);

  // ── The margin ─────────────────────────────────────────
  const heightOf = React.useCallback((id: string) => heights.get(id) ?? 72, [heights]);
  const positions = React.useMemo(() => solve(found.map((f) => ({ id: f.id, want: Math.max(0, f.top - 10) })), heightOf, active), [found, heightOf, active]);
  const marginHeight = found.reduce((m, f) => Math.max(m, (positions.get(f.id) ?? 0) + heightOf(f.id)), 0);
  // Cards slide only once they've been placed: the first layout lands without a glide.
  React.useEffect(() => {
    if (!placed && found.length && heights.size) {
      const t = requestAnimationFrame(() => setPlaced(true));
      return () => cancelAnimationFrame(t);
    }
  }, [placed, found.length, heights.size]);

  // ── Selecting text to comment on ───────────────────────
  React.useEffect(() => {
    if (!onCreate) return;
    let raf = 0;
    let clear = 0;
    const read = () => {
      const inner = innerRef.current;
      const sel = window.getSelection();
      if (!inner || draftRef.current) return;
      const range = sel && sel.rangeCount && !sel.isCollapsed ? sel.getRangeAt(0) : null;
      if (!range || !inner.contains(range.commonAncestorContainer)) {
        // Hidden a moment later, so a tap on the pill (which can take the selection away first) still lands.
        window.clearTimeout(clear);
        clear = window.setTimeout(() => setPending(null), 220);
        return;
      }
      window.clearTimeout(clear);
      const before = document.createRange();
      before.setStart(inner, 0);
      before.setEnd(range.startContainer, range.startOffset);
      const text = (indexRef.current ??= indexText(inner)).text;
      let s = before.toString().length;
      let e = s + range.toString().length;
      while (s < e && /\s/.test(text[s])) s++;
      while (e > s && /\s/.test(text[e - 1])) e--;
      if (e <= s) return setPending(null);
      const origin = inner.getBoundingClientRect();
      const boxes = lineBoxes(range, origin);
      if (!boxes.length) return;
      const last = boxes[boxes.length - 1];
      setPending({
        anchor: { quote: text.slice(s, e), prefix: text.slice(Math.max(0, s - 32), s), suffix: text.slice(e, e + 32) },
        top: boxes[0].top,
        bottom: last.top + last.height,
        left: boxes[0].left,
      });
    };
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(read);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      document.removeEventListener("selectionchange", onChange);
      cancelAnimationFrame(raf);
      window.clearTimeout(clear);
    };
  }, [onCreate]);

  const openDraft = React.useCallback(() => {
    const p = pendingRef.current;
    if (!p || draftRef.current) return;
    const d = { id: newId("t"), anchor: p.anchor, status: "idle" as ActionStatus };
    setDraft(d);
    setGrowing(d.id);
    setActive(d.id);
    setPending(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Ctrl+Alt+M comments on the selection, as in most editors.
  React.useEffect(() => {
    if (!onCreate) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === "KeyM" && pendingRef.current) {
        e.preventDefault();
        openDraft();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCreate, openDraft]);

  // A press outside the comments lets the chosen thread go (a draft with words in it stays).
  React.useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node) && !draftRef.current) setActive(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [active]);

  // ── Threads ────────────────────────────────────────────
  const hit = (e: React.PointerEvent | React.MouseEvent) => {
    const inner = innerRef.current;
    if (!inner) return null;
    const o = inner.getBoundingClientRect();
    const x = e.clientX - o.left;
    const y = e.clientY - o.top;
    for (let i = found.length - 1; i >= 0; i--) if (found[i].rects.some((r) => x >= r.left - 2 && x <= r.left + r.width + 2 && y >= r.top - 2 && y <= r.top + r.height + 2)) return found[i].id;
    return null;
  };

  const create = async (d: Draft, body: string) => {
    setDraft({ ...d, status: "pending" });
    const local: DocThread = { id: d.id, anchor: d.anchor, comments: [{ id: newId("c"), author: user, body, createdAt: new Date() }] };
    try {
      const saved = (await onCreate?.(d.anchor, body)) || local;
      commit([...threadsRef.current, saved]);
      setDraft(null);
      setActive(saved.id);
      focusCard.current = saved.id;
      say("Comment added.");
    } catch {
      setDraft((x) => (x?.id === d.id ? { ...x, status: "error" } : x));
      say("Couldn't add the comment. Your words are still there.");
    }
  };

  const reply = async (thread: DocThread, body: string) => {
    try {
      const saved = (await onReply?.(thread, body)) || { id: newId("c"), author: user, body, createdAt: new Date() };
      commit(threadsRef.current.map((t) => (t.id === thread.id ? { ...t, comments: [...t.comments, saved] } : t)));
      say("Reply added.");
      return true;
    } catch {
      say("Couldn't send the reply. Your words are still there.");
      return false;
    }
  };

  const finish = async (thread: DocThread) => {
    setResolving((prev) => {
      const next = { ...prev };
      delete next[thread.id];
      return next;
    });
    setActive((a) => (a === thread.id ? null : a));
    commit(threadsRef.current.map((t) => (t.id === thread.id ? { ...t, resolved: true } : t)));
    try {
      await onResolve?.(thread);
    } catch {
      commit(threadsRef.current.map((t) => (t.id === thread.id ? { ...t, resolved: false } : t)));
      setNotes((n) => ({ ...n, [thread.id]: "Couldn't resolve this. It's open again." }));
      window.setTimeout(() => setNotes((prev) => {
        const next = { ...prev };
        delete next[thread.id];
        return next;
      }), 3600);
      say("Couldn't resolve the thread. It's open again.");
    }
  };

  // What the memoised cards call, through one ref.
  const actions = React.useRef<CardActions>({
    activate: () => {},
    reply: async () => false,
    resolve: () => {},
    undo: () => {},
    finish: () => {},
    create: () => {},
    cancel: () => {},
    height: () => {},
  });
  React.useLayoutEffect(() => {
    actions.current = {
      activate: (id) => setActive(id || null),
      reply,
      resolve: (thread) => {
        setResolving((r) => ({ ...r, [thread.id]: Date.now() }));
        say("Resolved. Undo is in the card.");
      },
      undo: (thread) => {
        setResolving((prev) => {
          const next = { ...prev };
          delete next[thread.id];
          return next;
        });
        say("Thread open again.");
      },
      finish,
      create,
      cancel: () => {
        setDraft(null);
        setActive(null);
      },
      height: (id, h) => {
        if (heightsRef.current.get(id) === h) return;
        heightsRef.current.set(id, h);
        setHeights(new Map(heightsRef.current));
      },
    };
  });

  React.useEffect(() => {
    const id = focusCard.current;
    if (!id) return;
    focusCard.current = null;
    rootRef.current?.querySelector<HTMLElement>(`[data-card="${CSS.escape(id)}"] > article`)?.focus({ preventScroll: true });
  });

  // ── Narrow: the paragraph opens a gap under itself for the chosen thread ──
  const openId = draft?.id ?? active;
  const openFound = openId ? found.find((f) => f.id === openId) : undefined;
  const want = narrow && openFound ? openFound.id : null;
  const [gap, setGap] = React.useState<{ id: string; top: number } | null>(null);

  // If gap exists for an id that is no longer wanted, clear it during render (Pattern P2)
  if (gap && gap.id !== want) {
    setGap(null);
  }

  /** The paragraph holding the gap: found once per thread opened, its own margin kept to put back. */
  const gapEl = React.useRef<{ id: string; el: HTMLElement; was: string; base: number } | null>(null);
  const restoreGap = React.useCallback(() => {
    const g = gapEl.current;
    if (!g) return;
    gapEl.current = null;
    g.el.style.marginBottom = g.was;
    window.setTimeout(() => {
      if (gapEl.current?.el !== g.el) g.el.style.transition = "";
    }, 320);
  }, []);
  React.useLayoutEffect(() => {
    if (!want || !openFound) {
      if (gapEl.current) restoreGap();
      return;
    }
    if (gapEl.current && gapEl.current.id !== want) restoreGap();
    const inner = innerRef.current;
    if (!inner) return;
    if (!gapEl.current) {
      const index = indexRef.current ?? indexText(inner);
      const loc = locate(index, openFound.endOffset, true);
      let block: HTMLElement | null = loc ? loc[0].parentElement : null;
      while (block && block !== inner && block.parentElement !== inner && !/^(block|list-item|flex|grid|table)$/.test(getComputedStyle(block).display)) block = block.parentElement;
      if (!block || block === inner) return;
      gapEl.current = { id: want, el: block, was: block.style.marginBottom, base: parseFloat(getComputedStyle(block).marginBottom) || 0 };
      block.style.transition = reduced ? "" : `margin-bottom 280ms ${EASE}`;
    }
    const g = gapEl.current;
    const margin = `${g.base + (heights.get(want) ?? 120) + 16}px`;
    if (g.el.style.marginBottom !== margin) g.el.style.marginBottom = margin;
    // The paragraph's own box doesn't move as its margin grows, so the card's place is read once per change.
    const top = g.el.offsetTop + g.el.offsetHeight + 8;
    setGap((x) => (x?.id === want && x.top === top ? x : { id: want, top }));
  }, [want, openFound, heights, reduced, restoreGap]);
  React.useEffect(() => restoreGap, [restoreGap]);

  // ── Render ─────────────────────────────────────────────
  const threadOf = (id: string) => shown.find((t) => t.id === id);
  const tone = (id: string) => {
    const on = id === openId;
    const fading = resolving[id] !== undefined;
    return {
      background: `color-mix(in oklab, var(--primary) ${on ? 26 : hover === id ? 20 : 13}%, transparent)`,
      boxShadow: on ? "inset 0 -1.5px 0 var(--primary)" : "inset 0 -1.5px 0 transparent",
      opacity: fading ? 0 : 1,
    };
  };

  const card = (id: string) => {
    const t = threadOf(id);
    const isDraft = draft?.id === id;
    if (!t && !isDraft) return null;
    return (
      <MemoCard
        id={id}
        thread={t}
        draft={isDraft ? draft! : undefined}
        active={id === openId}
        resolving={resolving[id] ?? null}
        canReply={!!onReply}
        canResolve={!!onResolve}
        user={user}
        when={when}
        note={notes[id]}
        holdKey={resolving[id]}
        undoFor={undoFor}
        grow={growing === id}
        reduced={reduced}
        actions={actions}
      />
    );
  };

  return (
    <div ref={rootRef} role="group" aria-label={label} className={`relative text-foreground ${className}`} {...props}>
      <div className={narrow ? "" : "flex items-start gap-6"}>
        {/* The document, with the highlights drawn under it. */}
        <div className={`relative min-w-0 flex-1 ${narrow ? "pr-9" : ""}`}>
          <div
            ref={innerRef}
            className="relative"
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse") return;
              const id = hit(e);
              if (id !== hover) setHover(id);
            }}
            onPointerLeave={() => hover && setHover(null)}
            onClick={(e) => {
              if (window.getSelection()?.isCollapsed === false) return;
              const id = hit(e);
              if (id && id !== draft?.id) setActive((a) => (a === id ? null : id));
              else if (!draft) setActive(null);
            }}
            style={{ cursor: hover ? "pointer" : undefined }}
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {found.map((f) =>
                f.rects.map((r, i) => (
                  <span
                    key={`${f.id}-${i}`}
                    className="absolute rounded-[3px]"
                    style={{ top: r.top - 1, left: r.left - 1, width: r.width + 2, height: r.height + 2, ...tone(f.id), transition: reduced ? "none" : `background-color 200ms ${EASE}, box-shadow 200ms ${EASE}, opacity 320ms ${EASE}` }}
                  />
                )),
              )}
            </div>
            <div className="relative">{children}</div>

            {/* Narrow: a count at the end of each thread's first line, and the open thread in the gap its paragraph made. */}
            {narrow &&
              found.map((f) => {
                const t = threadOf(f.id);
                if (!t) return null;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-label={`${t.comments.length} ${t.comments.length === 1 ? "comment" : "comments"} on “${t.anchor.quote}”`}
                    aria-expanded={openId === f.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActive((a) => (a === f.id ? null : f.id));
                    }}
                    className={`absolute -right-9 flex h-6 cursor-pointer items-center gap-1 rounded-full px-1.5 text-[11px] tabular-nums transition-colors ${openId === f.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"} ${FOCUS}`}
                    style={{ top: f.top - 2 }}
                  >
                    <MessageSquare className="size-3" strokeWidth={2} aria-hidden="true" />
                    {t.comments.length}
                  </button>
                );
              })}
            {narrow && gap && openId === gap.id && (
              <div key={gap.id} data-card={gap.id} className="absolute inset-x-0 z-10" style={{ top: gap.top }} onClick={(e) => e.stopPropagation()}>
                {card(gap.id)}
              </div>
            )}

            {/* The Comment pill: in the margin beside the selection, or under it when narrow. */}
            {pending && !draft && (
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  openDraft();
                }}
                aria-keyshortcuts="Control+Alt+M"
                className={`absolute z-20 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-background px-2.5 text-[12.5px] font-medium shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent ${FOCUS}`}
                style={
                  narrow
                    ? { top: pending.bottom + 6, left: Math.max(0, Math.min(pending.left, innerWidth - 110)) }
                    : { top: pending.top - 4, left: `calc(100% + 24px)` }
                }
                ref={(el) => {
                  if (!el || el.dataset.in || reduced) return;
                  el.dataset.in = "1";
                  el.animate(
                    [
                      { opacity: 0, transform: "scale(0.9)", filter: "blur(3px)" },
                      { opacity: 1, transform: "none", filter: "blur(0px)" },
                    ],
                    { duration: 220, easing: EASE },
                  );
                }}
              >
                <MessageSquarePlus className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                Comment
              </button>
            )}
          </div>
        </div>

        {/* Wide: the margin, every card level with its line. */}
        {!narrow && (
          <aside aria-label="Threads" className="relative shrink-0" style={{ width: MARGIN_W, minHeight: marginHeight }}>
            {found.map((f) => (
              <div
                key={f.id}
                data-card={f.id}
                className="absolute inset-x-0 top-0"
                style={{ transform: `translateY(${positions.get(f.id) ?? 0}px)`, transition: placed && !reduced ? `transform 360ms ${GLIDE}` : "none", zIndex: f.id === openId ? 2 : 1 }}
              >
                {card(f.id)}
              </div>
            ))}
          </aside>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
