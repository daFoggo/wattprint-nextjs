"use client";

import * as React from "react";
import { RelativeTime, type DateLike } from "./relative-time";
import { StatusButton, type ActionStatus } from "./status-button";
import { TextMorph } from "./text-morph";
import { useRowMotion } from "./use-row-motion";

/* ─────────────────────────────────────────────────────────
 * WEBHOOK DELIVERIES: what was sent, and what came back
 *
 *   rows      the status code in its colour, the event, when,
 *             and how long the endpoint took; new deliveries
 *             fade in on top while the rest glide down
 *   open      a row opens by height into Request and Response,
 *             the tab highlight sliding between them
 *   redeliver Redeliver → Sending → Sent; the new attempt
 *             arrives on top
 * ───────────────────────────────────────────────────────── */

export interface WebhookDelivery {
  id: string;
  event: string;
  /** The endpoint's HTTP status, or null when it never answered. */
  status: number | null;
  durationMs?: number;
  at: DateLike;
  attempt?: number;
  /** The body sent (JSON as text). */
  request?: string;
  /** What came back. */
  response?: string;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const chip = (status: number | null) =>
  status === null || status >= 500
    ? "bg-red-500/10 text-red-700 dark:text-red-400"
    : status >= 300
      ? "bg-amber-500/10 text-amber-800 dark:text-amber-400"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";

export function StatusChip({ status }: { status: number | null }) {
  return <span className={`inline-flex h-5 w-[2.6rem] shrink-0 items-center justify-center rounded-[6px] font-mono text-[11px] font-medium tabular-nums ${chip(status)}`}>{status ?? "—"}</span>;
}

const pretty = (text?: string) => {
  if (!text) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

function Bodies({ d, reduced }: { d: WebhookDelivery; reduced: boolean }) {
  const id = React.useId();
  const [tab, setTab] = React.useState<"request" | "response">("request");
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [bar, setBar] = React.useState({ left: 0, width: 0, ready: false });
  React.useLayoutEffect(() => {
    const b = refs.current[tab];
    if (b) setBar((p) => (p.left === b.offsetLeft && p.width === b.offsetWidth ? p : { left: b.offsetLeft, width: b.offsetWidth, ready: p.width > 0 }));
  }, [tab]);
  const body = pretty(tab === "request" ? d.request : d.response);
  return (
    <div className="mt-1 mb-2 ml-2 rounded-[12px] shadow-[inset_0_0_0_1px_var(--border)] @md:ml-[3.35rem]">
      <div role="tablist" aria-label="Delivery body" className="relative flex gap-1 px-1.5 pt-1.5">
        <span
          aria-hidden="true"
          className="absolute top-1.5 left-0 h-6 rounded-full bg-accent"
          style={{ width: bar.width, transform: `translateX(${bar.left}px)`, transition: bar.ready && !reduced ? `transform 360ms ${EASE}, width 360ms ${EASE}` : "none" }}
        />
        {(["request", "response"] as const).map((t) => (
          <button
            key={t}
            ref={(el) => {
              refs.current[t] = el;
            }}
            role="tab"
            id={`${id}-${t}`}
            aria-selected={tab === t}
            aria-controls={`${id}-panel`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              const next = t === "request" ? "response" : "request";
              setTab(next);
              refs.current[next]?.focus();
            }}
            className={`relative h-6 cursor-pointer rounded-full px-2.5 text-[11.5px] font-medium capitalize transition-colors ${FOCUS} ${tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <pre id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} className="max-h-56 overflow-auto px-3 py-2 font-mono text-[11.5px] leading-[1.55] whitespace-pre-wrap break-all text-foreground">
        {body || <span className="text-muted-foreground">{tab === "request" ? "No body was kept." : "The endpoint sent no body."}</span>}
      </pre>
    </div>
  );
}

function Redeliver({ onRedeliver }: { onRedeliver: () => Promise<unknown> }) {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  return (
    <StatusButton
      size="sm"
      variant="ghost"
      status={status}
      labels={{ idle: "Redeliver", pending: "Sending", success: "Sent", error: "Try again" }}
      onReset={() => setStatus("idle")}
      resetAfter={1600}
      onClick={async () => {
        setStatus("pending");
        try {
          await onRedeliver();
          setStatus("success");
        } catch {
          setStatus("error");
        }
      }}
    />
  );
}

const Row = React.memo(function Row({
  d,
  open,
  reduced,
  toggle,
  redeliver,
}: {
  d: WebhookDelivery;
  open: boolean;
  reduced: boolean;
  toggle: React.RefObject<(id: string) => void>;
  redeliver?: React.RefObject<(d: WebhookDelivery) => Promise<unknown>>;
}) {
  return (
    <li data-row-id={d.id} className="border-t border-border first:border-t-0">
      <div className="flex items-center gap-2 py-1.5 pr-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => toggle.current(d.id)}
          className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[8px] px-2 py-1 text-left transition-colors hover:bg-accent/70 ${FOCUS}`}
        >
          <StatusChip status={d.status} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-[12px] text-foreground">{d.event}</span>
            <span className="flex min-w-0 items-baseline gap-1.5 overflow-hidden text-[11.5px] whitespace-nowrap text-muted-foreground">
              <RelativeTime className="shrink-0" date={d.at} />
              {/* On a narrow card the time is enough; how long it took shows when there's room. */}
              {d.durationMs !== undefined && (
                <span className="hidden gap-1.5 @sm:inline-flex">
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{Math.round(d.durationMs).toLocaleString("en-GB")} ms</span>
                </span>
              )}
              {d.attempt && d.attempt > 1 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">attempt {d.attempt}</span>
                </>
              ) : null}
            </span>
          </span>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" style={{ transform: open ? "rotate(180deg)" : "none", transition: reduced ? "none" : `transform 320ms ${EASE}` }}>
            <path d="M4.5 6.25 8 9.75l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {redeliver && <Redeliver onRedeliver={() => redeliver.current(d)} />}
      </div>
      <div className="grid" inert={!open} style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-rows 380ms ${EASE}` }}>
        <div className="min-h-0 min-w-0 overflow-clip">{open && <Bodies d={d} reduced={reduced} />}</div>
      </div>
    </li>
  );
});

export interface DeliveryListProps {
  deliveries: WebhookDelivery[];
  loading: boolean;
  /** More can be loaded. */
  more: boolean;
  onMore?: () => void;
  onRedeliver?: (d: WebhookDelivery) => Promise<unknown>;
  reduced: boolean;
}

export function DeliveryList({ deliveries, loading, more, onMore, onRedeliver, reduced }: DeliveryListProps) {
  const [open, setOpen] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const ranks = React.useMemo(() => new Map(deliveries.map((d, i) => [d.id, i])), [deliveries]);
  useRowMotion(listRef, { reduced, ranks, ghosts: ghostRef });
  const toggle = React.useRef<(id: string) => void>(() => {});
  const redeliver = React.useRef<(d: WebhookDelivery) => Promise<unknown>>(async () => {});
  React.useLayoutEffect(() => {
    toggle.current = (id) => setOpen((o) => (o === id ? null : id));
    redeliver.current = (d) => onRedeliver?.(d) ?? Promise.resolve();
  });

  return (
    <div>
      <div className="relative">
        <ul ref={listRef} aria-label="Recent deliveries" aria-busy={loading || undefined} className="relative">
          {deliveries.map((d) => (
            <Row key={d.id} d={d} open={open === d.id} reduced={reduced} toggle={toggle} redeliver={onRedeliver ? redeliver : undefined} />
          ))}
        </ul>
        <div ref={ghostRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      </div>
      {(loading || !deliveries.length || more) && (
        <div className="flex h-9 items-center justify-center gap-2 text-[12px] text-muted-foreground">
          {loading ? (
            <>
              <span className="size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none" />
              Loading deliveries
            </>
          ) : !deliveries.length ? (
            "Nothing delivered yet. Send a test to see one here."
          ) : (
            <button type="button" onClick={onMore} className={`h-7 cursor-pointer rounded-full px-3 font-medium text-foreground transition-colors hover:bg-accent ${FOCUS}`}>
              <TextMorph>Show older</TextMorph>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
