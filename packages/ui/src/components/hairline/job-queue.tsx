"use client";

import * as React from "react";
import { Check, ChevronDown, Copy, Pause, Play, X } from "lucide-react";
import { NumberRoll } from "./number-roll";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * JOB QUEUE: a worker pool's jobs, grouped by what needs you
 *
 *   groups    Needs review first, then Running, Failed, Queued,
 *             Completed; each a quiet label with its count. When a
 *             job moves to another group, its row glides there
 *   the clock each job's status mark is also its clock: a running
 *             job's ring fills with its progress, a review's amber
 *             ring drains as its window runs out, a failed job's red
 *             ring fills until it retries by itself. The draining
 *             and filling are single linear animations, so nothing
 *             re-renders to move them
 *   workers   the pool's workers as hairline slots in the header,
 *             each busy one filled to its job's progress
 *   act       Approve, Reject, Retry and Cancel call your async
 *             functions and show a pending state until you update
 *             the jobs; rows you remove fold away
 *   details   a payload or a stack opens in place under its row,
 *             with Copy
 *
 * Laid out for the card's own width: on a narrow card the buttons
 * take a line of their own under the reason; on a wide one they sit
 * at the end of the row. The jobs you pass are the truth: the
 * component never changes a job's status itself.
 * ───────────────────────────────────────────────────────── */

export type JobStatus = "running" | "approval" | "queued" | "failed" | "completed";

export interface JobItem {
  id: string;
  /** What the job is, e.g. "billing.refund-exec". */
  title: string;
  queue?: string;
  status: JobStatus;
  /** 0 to 100, for running jobs. */
  progress?: number;
  /** When it started (ms since epoch), for the running clock. */
  startedAt?: number;
  /** How long it took, for completed jobs. */
  durationMs?: number;
  approval?: {
    reason: string;
    /** When the review window closes (ms since epoch). */
    expiresAt?: number;
    /** When it was asked for (ms since epoch); sets how full the draining ring starts. */
    requestedAt?: number;
  };
  error?: {
    message: string;
    stack?: string;
    attempt?: number;
    maxAttempts?: number;
    /** When it will retry by itself (ms since epoch). */
    retryAt?: number;
    /** How long the backoff is; with retryAt it sets how full the ring starts, alone it counts from when the job first shows as failed. */
    backoffMs?: number;
  };
  payload?: Record<string, unknown> | string;
}

export interface JobQueueProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The pool or queue's name. */
  title?: string;
  jobs: JobItem[];
  /** How many workers the pool has. */
  concurrency?: number;
  /** Jobs finished per second. */
  throughput?: number;
  isPaused?: boolean;
  onTogglePause?: (paused: boolean) => void;
  onApprove?: (jobId: string) => Promise<unknown> | void;
  onReject?: (jobId: string) => Promise<unknown> | void;
  onRetry?: (jobId: string) => Promise<unknown> | void;
  onCancel?: (jobId: string) => Promise<unknown> | void;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const PRESS = "transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.97] motion-reduce:active:scale-100";
/** The mark: 2px hairlines every 4px, counted up from the bottom. */
const RULE = "repeating-linear-gradient(to top, #000 0 2px, transparent 2px 4px)";
const ORDER: JobStatus[] = ["approval", "running", "failed", "queued", "completed"];
const GROUP: Record<JobStatus, string> = { approval: "Needs review", running: "Running", failed: "Failed", queued: "Queued", completed: "Completed" };
const R = 8;
const C = 2 * Math.PI * R;

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

// The clock starts after hydration, so the server and the first client render agree and nothing reads the time while rendering.
const subscribeNothing = () => () => {};
const useHydrated = () => React.useSyncExternalStore(subscribeNothing, () => true, () => false);

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const seconds = (ms: number) => (ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : clock(ms));

/** A countdown on a ring: where it is now (0–1), where it ends, and how long until then. */
type Countdown = { from: number; to: number; ms: number; key: string };

function countdownOf(job: JobItem, now: number, firstSeen: number): Countdown | null {
  if (!now) return null;
  if (job.status === "approval" && job.approval?.expiresAt) {
    const start = job.approval.requestedAt ?? firstSeen;
    const total = Math.max(1, job.approval.expiresAt - start);
    const left = Math.max(0, job.approval.expiresAt - now);
    return { from: left / total, to: 0, ms: left, key: `a${job.approval.expiresAt}` };
  }
  if (job.status === "failed" && (job.error?.retryAt || job.error?.backoffMs)) {
    const at = job.error.retryAt ?? firstSeen + (job.error.backoffMs ?? 0);
    const start = job.error.retryAt && job.error.backoffMs ? job.error.retryAt - job.error.backoffMs : firstSeen;
    const total = Math.max(1, at - start);
    const left = Math.max(0, at - now);
    return { from: 1 - left / total, to: 1, ms: left, key: `f${at}` };
  }
  return null;
}

/**
 * The status mark, which is also the job's clock. Running: a ring filling with progress. Review: an amber ring draining
 * as the window closes. Failed: a red ring filling until the retry. A countdown runs as one linear animation of the
 * ring's dash, started from where it is now, so the per-second re-render never touches it.
 */
function Glyph({ job, paused, countdown, reduced }: { job: JobItem; paused: boolean; countdown: Countdown | null; reduced: boolean }) {
  const ring = React.useRef<SVGCircleElement>(null);
  const counting = !!countdown && countdown.ms > 0 && !reduced;
  const startFrom = countdown?.from ?? 0;
  const endAt = countdown?.to ?? 0;
  const ms = countdown?.ms ?? 0;
  React.useLayoutEffect(() => {
    const el = ring.current;
    if (!el || !counting) return;
    const run = el.animate([{ strokeDashoffset: C * (1 - startFrom) }, { strokeDashoffset: C * (1 - endAt) }], { duration: ms, easing: "linear", fill: "both" });
    return () => run.cancel();
    // Restarts only when the job's own times change, not on every second's re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown?.key, counting]);

  const s = job.status;
  const arc =
    s === "running"
      ? Math.max(0.04, (job.progress ?? 0) / 100)
      : countdown && !counting
        ? countdown.from
        : s === "approval" || s === "failed"
          ? 1
          : 0;
  const tone =
    s === "running" ? (paused ? "stroke-muted-foreground" : "stroke-primary") : s === "approval" ? "stroke-amber-500" : s === "failed" ? "stroke-red-500" : "";
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0">
      {s === "completed" ? (
        <>
          <circle cx="10" cy="10" r={R} className="fill-emerald-500/12 stroke-emerald-500" strokeWidth="1.5" />
          <path d="M6.8 10.2l2.2 2.2 4.2-4.6" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="stroke-emerald-600 dark:stroke-emerald-400" />
        </>
      ) : s === "queued" ? (
        <circle cx="10" cy="10" r={R} fill="none" strokeWidth="1.5" strokeDasharray="2.6 2.6" className="stroke-muted-foreground/60" />
      ) : (
        <>
          <circle cx="10" cy="10" r={R} fill="none" strokeWidth="1.5" className="stroke-border" />
          <circle
            ref={ring}
            cx="10"
            cy="10"
            r={R}
            fill="none"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - arc)}
            transform="rotate(-90 10 10)"
            className={tone}
            style={{ transition: counting || reduced ? "none" : `stroke-dashoffset 700ms ${EASE}, stroke 300ms` }}
          />
          {s === "approval" && (
            <>
              <path d="M10 6.4v4.2" strokeWidth="1.7" strokeLinecap="round" className="stroke-amber-600 dark:stroke-amber-400" />
              <circle cx="10" cy="13.3" r="1" className="fill-amber-600 dark:fill-amber-400" />
            </>
          )}
          {s === "failed" && <path d="M7.7 7.7l4.6 4.6M12.3 7.7l-4.6 4.6" strokeWidth="1.6" strokeLinecap="round" className="stroke-red-600 dark:stroke-red-400" />}
        </>
      )}
    </svg>
  );
}

/** A small button whose label morphs to its pending state. */
function Action({ label, busyLabel, busy, tone = "plain", onClick }: { label: string; busyLabel: string; busy: boolean; tone?: "plain" | "primary" | "outline"; onClick: () => void }) {
  const style =
    tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : tone === "outline"
        ? "text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent"
        : "text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent hover:text-foreground";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-disabled={busy || undefined}
      className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-medium aria-disabled:cursor-default ${PRESS} ${FOCUS} ${style}`}
    >
      {busy && <span aria-hidden="true" className="size-3 animate-spin rounded-full border-[1.5px] border-current border-r-transparent opacity-70 motion-reduce:animate-none" />}
      <TextMorph>{busy ? busyLabel : label}</TextMorph>
    </button>
  );
}

function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(text);
        setCopied(true);
      }}
      className={`inline-flex h-6 cursor-pointer items-center gap-1 rounded-full px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground ${PRESS} ${FOCUS}`}
    >
      <span className="relative size-3">
        <Copy aria-hidden="true" className="absolute inset-0 size-3 transition-[opacity,scale] duration-200" style={{ opacity: copied ? 0 : 1, scale: copied ? "0.6" : "1" }} />
        <Check aria-hidden="true" className="absolute inset-0 size-3 text-emerald-600 transition-[opacity,scale] duration-200 dark:text-emerald-400" style={{ opacity: copied ? 1 : 0, scale: copied ? "1" : "0.6" }} />
      </span>
      <TextMorph>{copied ? "Copied" : "Copy"}</TextMorph>
    </button>
  );
}

export function JobQueue({
  title = "dispatcher-pool",
  jobs,
  concurrency = 8,
  throughput,
  isPaused,
  onTogglePause,
  onApprove,
  onReject,
  onRetry,
  onCancel,
  className = "",
  ...props
}: JobQueueProps) {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const id = React.useId();
  const [ownPaused, setOwnPaused] = React.useState(false);
  const paused = isPaused ?? ownPaused;
  const [open, setOpen] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<Record<string, string>>({});

  // One clock for every countdown and running time, ticking once a second. Each tick also notes when a job was first
  // seen, for a backoff or review window given without a start.
  const [now, setNow] = React.useState(0);
  const [firstSeen, setFirstSeen] = React.useState<Record<string, number>>({});
  const jobsRef = React.useRef(jobs);
  React.useLayoutEffect(() => {
    jobsRef.current = jobs;
  });
  React.useEffect(() => {
    let t = 0;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      setFirstSeen((f) => {
        const fresh = jobsRef.current.filter((j) => f[j.id] === undefined);
        return fresh.length ? { ...f, ...Object.fromEntries(fresh.map((j) => [j.id, at])) } : f;
      });
      t = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
    return () => window.clearTimeout(t);
  }, []);

  // Rows that leave the list fold away in place instead of vanishing.
  const [last, setLast] = React.useState(jobs);
  const [leaving, setLeaving] = React.useState<JobItem[]>([]);
  if (last !== jobs) {
    const ids = new Set(jobs.map((j) => j.id));
    const gone = last.filter((j) => !ids.has(j.id));
    setLast(jobs);
    if (gone.length && !reduced) setLeaving((l) => [...l.filter((g) => !ids.has(g.id)), ...gone]);
  }
  React.useEffect(() => {
    if (!leaving.length) return;
    const t = window.setTimeout(() => setLeaving([]), 420);
    return () => window.clearTimeout(t);
  }, [leaving]);

  // A pending action ends when the job it was for changes or leaves.
  const statusKey = jobs.map((j) => `${j.id}:${j.status}`).join("|");
  const [lastKey, setLastKey] = React.useState(statusKey);
  const [pendingFor, setPendingFor] = React.useState<Record<string, string>>({});
  if (lastKey !== statusKey) {
    setLastKey(statusKey);
    const still: Record<string, string> = {};
    for (const [jid, kind] of Object.entries(pending)) {
      const job = jobs.find((j) => j.id === jid);
      if (job && pendingFor[jid] === job.status) still[jid] = kind;
    }
    setPending(still);
  }

  const rowRefs = React.useRef(new Map<string, HTMLElement>());
  const act = async (job: JobItem, kind: "approve" | "reject" | "retry" | "cancel") => {
    if (pending[job.id]) return;
    const fn = { approve: onApprove, reject: onReject, retry: onRetry, cancel: onCancel }[kind];
    setPending((p) => ({ ...p, [job.id]: kind }));
    setPendingFor((p) => ({ ...p, [job.id]: job.status }));
    try {
      await fn?.(job.id);
    } catch {
      setPending((p) => {
        const next = { ...p };
        delete next[job.id];
        return next;
      });
      // It didn't go through: the row gives a small shake and its buttons come back.
      if (!reduced) rowRefs.current.get(job.id)?.animate([{ translate: "0" }, { translate: "-4px" }, { translate: "4px" }, { translate: "-2px" }, { translate: "0" }], { duration: 380, easing: "ease-out" });
      return;
    }
    // It went through; if the jobs haven't moved on a moment later, stop showing it as pending anyway.
    window.setTimeout(() => {
      setPending((p) => {
        if (p[job.id] !== kind) return p;
        const next = { ...p };
        delete next[job.id];
        return next;
      });
    }, 2500);
  };

  // Rows glide to their new place only when a job moves to another group. Positions are refreshed on every render (the
  // clock re-renders each second), so a fold opening between changes never leaves them stale; a new glide replaces any
  // that is still running, so they never stack.
  const tops = React.useRef(new Map<string, number>());
  const glidedKey = React.useRef(statusKey);
  React.useLayoutEffect(() => {
    const moved = glidedKey.current !== statusKey;
    glidedKey.current = statusKey;
    const next = new Map<string, number>();
    rowRefs.current.forEach((el, key) => {
      const top = el.offsetTop;
      next.set(key, top);
      const before = tops.current.get(key);
      if (moved && before !== undefined && Math.abs(before - top) > 1 && !reduced) {
        el.getAnimations().forEach((a) => a.id === "glide" && a.cancel());
        const glide = el.animate([{ transform: `translateY(${before - top}px)` }, { transform: "none" }], { duration: 460, easing: EASE });
        glide.id = "glide";
      }
    });
    tops.current = next;
  });

  const togglePause = () => {
    const next = !paused;
    if (isPaused === undefined) setOwnPaused(next);
    onTogglePause?.(next);
  };

  const running = jobs.filter((j) => j.status === "running");
  const slots = Array.from({ length: Math.max(1, concurrency) }, (_, i) => running[i]);
  const review = jobs.filter((j) => j.status === "approval").length;
  const groups = ORDER.map((status) => ({
    status,
    rows: [...jobs.filter((j) => j.status === status), ...leaving.filter((j) => j.status === status)],
    count: jobs.filter((j) => j.status === status).length,
  })).filter((g) => g.rows.length);
  const tick = hydrated ? now : 0;

  return (
    <div className={`w-full rounded-[22px] bg-card text-card-foreground shadow-[0_0_0_1px_var(--border)] ${className}`} {...props}>
      {/* Its natural width where the parent sizes to its content (a centred flex column), without forcing it on narrow screens. */}
      <div aria-hidden="true" data-natural-width className="grid h-0" style={{ gridTemplateColumns: "minmax(0, 720px)" }} />
      <div className="@container w-full">
        {/* The pool: its name and Pause, then its workers as hairline slots beside the pace. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 px-4 pb-3.5 pt-4 @[34rem]:px-5">
          <p className="truncate pt-1 text-[14px] font-medium text-foreground">{title}</p>
          <button
            type="button"
            aria-pressed={paused}
            onClick={togglePause}
            className={`row-span-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full pl-2.5 pr-3 text-[12.5px] font-medium shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent ${PRESS} ${FOCUS} ${paused ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}
          >
            <span aria-hidden="true" className="relative size-3.5">
              <Pause className="absolute inset-0 size-3.5 fill-current transition-[opacity,scale] duration-300" style={{ opacity: paused ? 0 : 1, scale: paused ? "0.6" : "1" }} />
              <Play className="absolute inset-0 size-3.5 fill-current transition-[opacity,scale] duration-300" style={{ opacity: paused ? 1 : 0, scale: paused ? "1" : "0.6" }} />
            </span>
            <TextMorph>{paused ? "Resume" : "Pause"}</TextMorph>
          </button>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground tabular-nums">
            <span aria-hidden="true" className="flex h-3.5 items-end gap-[2px]">
              {slots.map((job, i) => (
                <span key={i} className="relative h-full w-[5px]" style={{ maskImage: RULE, WebkitMaskImage: RULE }}>
                  <span className="absolute inset-0 bg-foreground/[0.1]" />
                  <span
                    className={`absolute inset-x-0 bottom-0 ${paused ? "bg-muted-foreground/60" : "bg-primary"}`}
                    style={{ height: job ? `${Math.max(14, job.progress ?? 0)}%` : "0%", transition: reduced ? "none" : `height 600ms ${EASE}, background-color 300ms` }}
                  />
                </span>
              ))}
            </span>
            <span className="whitespace-nowrap">
              <span className="font-medium text-foreground">
                <NumberRoll value={paused ? 0 : running.length} duration={600} />
              </span>{" "}
              of {concurrency} busy
            </span>
            {throughput !== undefined && (
              <span className="whitespace-nowrap">
                <span className="font-medium text-foreground">
                  <NumberRoll value={paused ? 0 : throughput} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} duration={600} />
                </span>{" "}
                jobs/s
              </span>
            )}
            {review > 0 && (
              <span className="whitespace-nowrap text-amber-700 dark:text-amber-400">
                {review} to review
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-border pb-1.5">
          {groups.length === 0 && <p className="px-5 py-10 text-center text-[12.5px] text-muted-foreground">No jobs in this pool.</p>}
          {groups.map((group, gi) => (
            <section key={group.status} aria-label={`${GROUP[group.status]}, ${group.count}`} className={gi > 0 ? "border-t border-border" : ""}>
              <p className="flex items-center gap-1.5 px-4 pb-0.5 pt-3 text-[11.5px] font-medium text-muted-foreground @[34rem]:px-5">
                {GROUP[group.status]}
                <span className="tabular-nums text-muted-foreground/70">
                  <NumberRoll value={group.count} duration={500} />
                </span>
              </p>
              {group.rows.map((job) => {
                const isLeaving = leaving.some((l) => l.id === job.id) && !jobs.some((j) => j.id === job.id);
                const busy = pending[job.id];
                const details = job.error?.stack ?? (job.payload ? (typeof job.payload === "string" ? job.payload : JSON.stringify(job.payload, null, 2)) : null);
                const isOpen = open === job.id && !!details;
                const seenAt = firstSeen[job.id] ?? tick;
                const countdown = countdownOf(job, tick, seenAt);
                const elapsed = job.status === "running" && job.startedAt ? clock(tick - job.startedAt) : "";
                const time =
                  job.status === "running"
                    ? `${Math.round(job.progress ?? 0)}%`
                    : job.status === "approval" && job.approval?.expiresAt
                      ? `${clock(job.approval.expiresAt - tick)} left`
                      : job.status === "failed" && (job.error?.retryAt || job.error?.backoffMs)
                        ? `retry in ${clock((job.error.retryAt ?? seenAt + (job.error.backoffMs ?? 0)) - tick)}`
                        : job.status === "completed" && job.durationMs !== undefined
                          ? seconds(job.durationMs)
                          : "";
                const meta =
                  job.status === "approval"
                    ? job.approval?.reason
                    : job.status === "failed"
                      ? job.error?.message
                      : job.status === "queued"
                        ? `${jobs.filter((j) => j.status === "queued").findIndex((j) => j.id === job.id) + 1} in line`
                        : undefined;
                const buttons =
                  (job.status === "approval" && (onApprove || onReject)) || (job.status === "failed" && onRetry) ? (
                    <>
                      {job.status === "approval" && onApprove && <Action label="Approve" busyLabel="Approving" busy={busy === "approve"} tone="primary" onClick={() => act(job, "approve")} />}
                      {job.status === "approval" && onReject && <Action label="Reject" busyLabel="Rejecting" busy={busy === "reject"} onClick={() => act(job, "reject")} />}
                      {job.status === "failed" && onRetry && <Action label="Retry now" busyLabel="Retrying" busy={busy === "retry"} tone="outline" onClick={() => act(job, "retry")} />}
                    </>
                  ) : null;
                return (
                  <div
                    key={job.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(job.id, el);
                      else rowRefs.current.delete(job.id);
                    }}
                    className="grid"
                    style={{
                      gridTemplateRows: isLeaving ? "0fr" : "1fr",
                      opacity: isLeaving ? 0 : 1,
                      transition: reduced ? "none" : `grid-template-rows 380ms ${EASE} 60ms, opacity 200ms ${EASE}`,
                    }}
                  >
                    {/* overflow: clip, not hidden: a hidden box still scrolls when a button inside it takes focus. */}
                    <div className="min-h-0 overflow-clip" inert={isLeaving || undefined}>
                      {/* One row, laid out by the card's own width: name and time on top, the reason under the name, and
                          the buttons on a line of their own on a narrow card or at the end of the row on a wide one. */}
                      <div
                        onClick={() => details && setOpen(isOpen ? null : job.id)}
                        className={`mx-1.5 grid grid-cols-[20px_minmax(0,1fr)_auto] gap-x-3 rounded-[14px] px-2.5 py-2.5 transition-colors duration-200 @[34rem]:mx-2.5 @[34rem]:grid-cols-[20px_minmax(0,1fr)_auto_auto] ${
                          details ? "cursor-pointer hover:bg-muted/50" : ""
                        }`}
                      >
                        <span className="row-span-2 pt-px">
                          <Glyph job={job} paused={paused} countdown={countdown} reduced={reduced} />
                        </span>
                        <p className="flex min-w-0 items-baseline gap-2 pt-px">
                          <span className="truncate text-[13.5px] font-medium text-foreground">{job.title}</span>
                          <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground/70 @[34rem]:inline">{job.id}</span>
                        </p>
                        <div className="col-start-3 row-start-1 flex items-center gap-1 self-start @[34rem]:row-span-2 @[34rem]:self-center">
                          {time && (
                            <span
                              className={`whitespace-nowrap pt-0.5 text-[12px] tabular-nums @[34rem]:pt-0 ${
                                job.status === "approval" ? "text-amber-700 dark:text-amber-400" : job.status === "failed" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                              }`}
                            >
                              {hydrated ? time : ""}
                              {hydrated && elapsed ? <span className="hidden @[24rem]:inline"> · {elapsed}</span> : null}
                            </span>
                          )}
                          {job.status === "queued" && onCancel && (
                            <button
                              type="button"
                              aria-label={`Cancel ${job.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                void act(job, "cancel");
                              }}
                              className={`-my-1 -mr-1 flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground ${PRESS} ${FOCUS}`}
                            >
                              <X aria-hidden="true" className="size-3.5" />
                            </button>
                          )}
                          {details && (
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={`${id}-${job.id}`}
                              aria-label={`${isOpen ? "Hide" : "Show"} details for ${job.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpen(isOpen ? null : job.id);
                              }}
                              className={`-my-1 -mr-1 flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground ${PRESS} ${FOCUS}`}
                            >
                              <ChevronDown aria-hidden="true" className="size-3.5" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: reduced ? "none" : `transform 320ms ${EASE}` }} />
                            </button>
                          )}
                          {/* Every row ends in the same 28px slot, so the times line up down the card. */}
                          {!details && !(job.status === "queued" && onCancel) && <span aria-hidden="true" className="-mr-1 size-7 shrink-0" />}
                        </div>
                        <p
                          className={`col-start-2 col-end-4 mt-0.5 text-[12px] leading-[1.45] @[34rem]:col-end-3 ${
                            job.status === "approval" ? "text-amber-700 dark:text-amber-400" : job.status === "failed" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                          }`}
                        >
                          {meta ? <span>{meta}</span> : null}
                          {job.queue ? <span className="text-muted-foreground">{meta ? " · " : ""}{job.queue}</span> : null}
                          {job.status === "failed" && job.error?.attempt && job.error.maxAttempts ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · attempt {job.error.attempt} of {job.error.maxAttempts}
                            </span>
                          ) : null}
                        </p>
                        {buttons && (
                          <div className="col-start-2 col-end-4 mt-2.5 flex flex-wrap items-center gap-2 @[34rem]:col-start-4 @[34rem]:col-end-5 @[34rem]:row-span-2 @[34rem]:row-start-1 @[34rem]:mt-0 @[34rem]:ml-1 @[34rem]:flex-row-reverse @[34rem]:self-center">
                            {buttons}
                          </div>
                        )}
                      </div>

                      {/* Details open in place, under the row, aligned with its name. */}
                      {details && (
                        <div
                          id={`${id}-${job.id}`}
                          className="grid"
                          style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-rows 380ms ${EASE}` }}
                        >
                          <div className="min-h-0 min-w-0 overflow-clip" inert={!isOpen || undefined}>
                            <div className="mb-2 ml-4 mr-4 mt-0.5 rounded-[12px] bg-muted/50 shadow-[inset_0_0_0_1px_var(--border)] @[34rem]:ml-[52px] @[34rem]:mr-5">
                              <div className="flex items-center justify-between gap-2 py-1 pl-3 pr-1">
                                <span className="text-[11.5px] font-medium text-muted-foreground">{job.error?.stack ? "Stack trace" : "Payload"}</span>
                                <CopyText text={details} />
                              </div>
                              <pre className="max-h-48 overflow-auto whitespace-pre border-t border-border px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-foreground/85">{details}</pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {paused ? `${title} paused` : ""}
      </p>
    </div>
  );
}
