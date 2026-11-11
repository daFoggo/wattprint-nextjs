"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { PillSelect } from "./pill-select";
import { StatusButton, type ActionStatus } from "./status-button";
import { TextMorph } from "./text-morph";
import type { WebhookDelivery } from "./webhook-deliveries";

/* ─────────────────────────────────────────────────────────
 * WEBHOOK WIRE: "Send test", drawn as the request it is
 *
 *   out       a bead leaves your app and runs the hairline to
 *             the endpoint
 *   waiting   the endpoint's chip pulses while it answers
 *   back      the bead comes home in the answer's colour, and
 *             the result rolls in: "200 OK in 182 ms"
 *   failed    a 5xx, or no answer, comes back red and the
 *             button shakes
 * ───────────────────────────────────────────────────────── */

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const TRAVEL = "cubic-bezier(0.65,0,0.35,1)";

const REASONS: Record<number, string> = {
  200: "OK", 201: "Created", 202: "Accepted", 204: "No Content", 301: "Moved", 302: "Found", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
  405: "Method Not Allowed", 408: "Request Timeout", 410: "Gone", 413: "Too Large", 422: "Unprocessable", 429: "Too Many Requests", 500: "Internal Server Error",
  502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout",
};
export const reasonFor = (status: number | null) => (status === null ? "No answer" : REASONS[status] ?? (status < 300 ? "OK" : status < 500 ? "Refused" : "Server error"));
export const toneFor = (status: number | null) =>
  status === null || status >= 500 ? "red" : status >= 400 ? "amber" : status >= 300 ? "amber" : "emerald";
const COLOR = { emerald: "var(--color-emerald-500)", amber: "var(--color-amber-500)", red: "var(--color-red-500)" };
const TEXT = { emerald: "text-emerald-600 dark:text-emerald-400", amber: "text-amber-700 dark:text-amber-400", red: "text-red-600 dark:text-red-400" };

export interface WebhookWireProps {
  /** The endpoint's host, shown at the far end of the wire. */
  host: string;
  /** Events the test can send; the first is picked. */
  events: string[];
  onSend: (event: string) => Promise<WebhookDelivery>;
  /** Called with the delivery the test made, e.g. to add it to the list. */
  onDelivered?: (delivery: WebhookDelivery) => void;
  reduced: boolean;
  autoFocus?: boolean;
  /** Your app's name at the near end. */
  from?: string;
}

export function WebhookWire({ host, events, onSend, onDelivered, reduced, autoFocus, from = "You" }: WebhookWireProps) {
  const [event, setEvent] = React.useState(events[0] ?? "");
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [result, setResult] = React.useState<{ status: number | null; ms: number } | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const lineRef = React.useRef<HTMLSpanElement>(null);
  const beadRef = React.useRef<HTMLSpanElement>(null);
  const hostRef = React.useRef<HTMLSpanElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  if (!events.includes(event)) {
    setEvent(events[0] ?? "");
  }

  React.useEffect(() => {
    if (autoFocus) wrapRef.current?.querySelector<HTMLButtonElement>("button[data-send]")?.focus({ preventScroll: true });
  }, [autoFocus]);

  const send = async () => {
    if (status === "pending" || !event) return;
    setStatus("pending");
    setFailure(null);
    const answer = onSend(event);
    const bead = beadRef.current;
    const line = lineRef.current;
    const far = line ? Math.max(0, line.offsetWidth - 7) : 0;
    let ping: Animation | undefined;
    if (bead && !reduced) {
      bead.style.background = "var(--primary)";
      await bead
        .animate([{ transform: "translateX(0px)", opacity: 0 }, { opacity: 1, offset: 0.12 }, { transform: `translateX(${far}px)`, opacity: 1 }], { duration: 620, easing: TRAVEL, fill: "forwards" })
        .finished.catch(() => {});
      ping = hostRef.current?.animate([{ boxShadow: "inset 0 0 0 1px var(--border), 0 0 0 0px color-mix(in oklab, var(--primary) 35%, transparent)" }, { boxShadow: "inset 0 0 0 1px var(--border), 0 0 0 6px transparent" }], {
        duration: 900,
        iterations: Infinity,
        easing: "ease-out",
      });
    }
    try {
      const d = await answer;
      ping?.cancel();
      const tone = toneFor(d.status);
      if (bead && !reduced) {
        bead.style.background = COLOR[tone];
        await bead
          .animate([{ transform: `translateX(${far}px)`, opacity: 1 }, { transform: "translateX(0px)", opacity: 1, offset: 0.88 }, { transform: "translateX(0px)", opacity: 0 }], { duration: 640, easing: TRAVEL, fill: "forwards" })
          .finished.catch(() => {});
      }
      setResult({ status: d.status, ms: Math.round(d.durationMs ?? 0) });
      setStatus(tone === "emerald" ? "success" : "error");
      onDelivered?.(d);
    } catch (e) {
      ping?.cancel();
      bead?.getAnimations().forEach((a) => a.cancel());
      setFailure(e instanceof Error && e.message ? e.message : "The test couldn't be sent.");
      setStatus("error");
    }
  };

  const tone = result ? toneFor(result.status) : null;
  return (
    <div ref={wrapRef}>
      <div className="flex flex-wrap items-center gap-2">
        <PillSelect
          label="Event to send"
          mono
          options={events.map((ev) => ({ value: ev, label: ev }))}
          value={event}
          onValueChange={setEvent}
          width={260}
        />
        <StatusButton
          data-send=""
          size="sm"
          variant="outline"
          status={status}
          labels={{ idle: "Send test", pending: "Sending", success: "Delivered", error: "Send again" }}
          onClick={send}
          onReset={() => setStatus("idle")}
          resetAfter={2200}
        />
      </div>

      {/* The wire: your app, the hairline, the endpoint. */}
      <div aria-hidden="true" className="mt-3 flex items-center gap-2 font-mono text-[11px]">
        <span className="shrink-0 rounded-full px-2 py-0.5 text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">{from}</span>
        <span ref={lineRef} className="relative h-px min-w-6 flex-1 bg-border">
          <span ref={beadRef} className="absolute -top-[3px] left-0 size-[7px] rounded-full opacity-0 will-change-transform" />
        </span>
        <span ref={hostRef} className="max-w-[55%] shrink truncate rounded-full px-2 py-0.5 text-foreground shadow-[inset_0_0_0_1px_var(--border)]">
          {host}
        </span>
      </div>

      <div
        className="grid"
        style={{ gridTemplateRows: result || failure ? "1fr" : "0fr", opacity: result || failure ? 1 : 0, transition: reduced ? "none" : `grid-template-rows 380ms ${EASE}, opacity 260ms ${EASE}` }}
      >
        <div className="min-h-0 min-w-0 overflow-clip">
          <p role="status" className={`flex flex-wrap items-baseline gap-x-1 pt-2 text-[12px] tabular-nums ${failure ? TEXT.red : tone ? TEXT[tone] : "text-muted-foreground"}`}>
            {failure ? (
              failure
            ) : result ? (
              <>
                {result.status !== null && <NumberRoll value={result.status} className="font-mono font-medium" />}
                <TextMorph>{reasonFor(result.status)}</TextMorph>
                <span className="text-muted-foreground">in</span>
                <span className="inline-flex items-baseline text-muted-foreground">
                  <NumberRoll value={result.ms} format={{ maximumFractionDigits: 0 }} />
                  &nbsp;ms
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
