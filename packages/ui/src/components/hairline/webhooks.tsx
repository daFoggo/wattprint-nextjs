"use client";

import * as React from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { ConfirmAction } from "./confirm-action";
import { NumberRoll } from "./number-roll";
import { RelativeTime, type DateLike } from "./relative-time";
import { StatusButton, type ActionStatus } from "./status-button";
import { TextMorph } from "./text-morph";
import { DeliveryList, StatusChip, type WebhookDelivery } from "./webhook-deliveries";
import { WebhookWire } from "./webhook-wire";

/* ─────────────────────────────────────────────────────────
 * WEBHOOKS: Settings → Webhooks, done properly
 *
 *   add       "Add endpoint" opens the form above the list: the
 *             URL and the events it wants. The new endpoint
 *             fades in on top, already open on "Send test"
 *   test      the test is drawn as the request it is: a bead
 *             runs the hairline to the endpoint, waits while it
 *             answers, and comes home in the answer's colour;
 *             "200 OK in 182 ms" rolls in, and the delivery
 *             lands on top of the list
 *   inspect   every delivery opens into its request and
 *             response; Redeliver sends it again and the new
 *             attempt arrives on top
 *   secret    the signing secret stays dots until you reveal
 *             it, then copies with a drawn check
 *   pause     Enabled is a switch that saves itself; Delete
 *             stretches the bin into a confirm and folds the
 *             endpoint away
 *
 * Endpoints and deliveries are plain records; every action is
 * one async function, so it fits Svix, Hookdeck or your own
 * queue.
 * ───────────────────────────────────────────────────────── */

export type { WebhookDelivery, DateLike };

export interface WebhookEndpoint {
  id: string;
  url: string;
  /** The event types it receives. */
  events: string[];
  enabled?: boolean;
  /** Shown on the collapsed row. */
  lastDelivery?: { status: number | null; at: DateLike } | null;
}

export interface WebhookEventType {
  value: string;
  description?: string;
}

export interface WebhooksProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "onToggle"> {
  value?: WebhookEndpoint[];
  defaultValue?: WebhookEndpoint[];
  onValueChange?: (endpoints: WebhookEndpoint[]) => void;
  /** Event types an endpoint can subscribe to. */
  events: WebhookEventType[];
  /** Creates an endpoint. Throw to keep the form and say why. */
  onCreate: (input: { url: string; events: string[] }) => Promise<WebhookEndpoint>;
  /** Sends a test event and returns the delivery it made. */
  onTest: (endpoint: WebhookEndpoint, event: string) => Promise<WebhookDelivery>;
  /** Recent deliveries, newest first; pass the oldest one shown to page back. An empty list means there are no more. */
  loadDeliveries?: (endpoint: WebhookEndpoint, before?: WebhookDelivery) => Promise<WebhookDelivery[]>;
  onRedeliver?: (delivery: WebhookDelivery, endpoint: WebhookEndpoint) => Promise<WebhookDelivery>;
  onRevealSecret?: (endpoint: WebhookEndpoint) => Promise<string>;
  /** Turns an endpoint on or off. Throw to put the switch back. */
  onToggle?: (endpoint: WebhookEndpoint, enabled: boolean) => Promise<unknown>;
  onDelete?: (endpoint: WebhookEndpoint) => Promise<unknown>;
  /** Your app's name, at the near end of the test's wire. */
  appName?: string;
  title?: string;
  description?: string;
}

type Draft = { url: string; events: string[]; status: ActionStatus; error: string | null };
type Log = { items: WebhookDelivery[]; loading: boolean; more: boolean; loaded: boolean };

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const THROW = "cubic-bezier(0.34,1.36,0.64,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const NONE: WebhookEndpoint[] = [];
const SHAKE = [{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "none" }];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const split = (url: string) => {
  try {
    const u = new URL(url);
    return { host: u.host, path: `${u.pathname === "/" ? "" : u.pathname}${u.search}` };
  } catch {
    return { host: url, path: "" };
  }
};
const checkUrl = (v: string) => {
  try {
    const u = new URL(v.trim());
    if (u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname))) return null;
    return "Endpoints need https:// (http:// works for localhost).";
  } catch {
    return v.trim() ? "That isn't a full URL. Start it with https://." : "Enter the URL that should receive events.";
  }
};

function Fold({ open, reduced, children }: { open: boolean; reduced: boolean; children: React.ReactNode }) {
  const [kept, setKept] = React.useState(children);
  if (open && kept !== children) {
    setKept(children);
  }
  return (
    <div className="grid" inert={!open} aria-hidden={!open || undefined} style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, transition: reduced ? "none" : `grid-template-rows 460ms ${EASE}, opacity ${open ? 320 : 180}ms ${EASE}` }}>
      <div className="min-h-0 min-w-0 overflow-clip [overflow-clip-margin:6px]">{open ? children : kept}</div>
    </div>
  );
}

function Check({ drawn, reduced }: { drawn: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} style={{ strokeDashoffset: drawn ? 0 : 1, transition: drawn && !reduced ? `stroke-dashoffset 420ms ${EASE} 100ms` : "none" }} />
    </svg>
  );
}

function EventChip({ value, on, reduced, onToggle }: { value: string; on: boolean; reduced: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`inline-flex h-7 cursor-pointer items-center rounded-full px-2.5 font-mono text-[11.5px] transition-[background-color,color,box-shadow] duration-200 ${FOCUS} ${
        on ? "bg-accent text-foreground shadow-[inset_0_0_0_1px_var(--border)]" : "text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:text-foreground"
      }`}
    >
      <span className="grid" style={{ gridTemplateColumns: on ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-columns 320ms ${EASE}` }}>
        <span className="min-w-0 overflow-clip">
          <span className="mr-1 block">
            <Check drawn={on} reduced={reduced} />
          </span>
        </span>
      </span>
      {value}
    </button>
  );
}

/** The signing secret: dots until it's revealed, then the value and a copy button. */
function Secret({ value, onReveal, onHide, reduced }: { value: string | null; onReveal?: () => Promise<void>; onHide: () => void; reduced: boolean }) {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [copied, setCopied] = React.useState(false);
  const ref = React.useRef<HTMLElement>(null);
  React.useLayoutEffect(() => {
    if (value && !reduced) ref.current?.animate([{ opacity: 0, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0px)" }], { duration: 360, easing: EASE });
  }, [value, reduced]);
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <code ref={ref} className="min-w-0 flex-1 truncate rounded-[8px] bg-muted px-2 py-1 font-mono text-[11.5px] text-foreground shadow-[inset_0_0_0_1px_var(--border)]">
        {value ?? "whsec_••••••••••••••••"}
      </code>
      {value ? (
        <>
          <button
            type="button"
            aria-label={copied ? "Secret copied" : "Copy secret"}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                setCopied(true);
              } catch {
                /* Selectable on screen. */
              }
            }}
            className={`relative grid size-7 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:bg-accent ${FOCUS} ${copied ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}
          >
            {[false, true].map((on) => (
              <span key={String(on)} aria-hidden="true" className="absolute inset-0 grid place-items-center" style={{ opacity: copied === on ? 1 : 0, transform: copied === on ? "none" : "scale(0.6)", transition: reduced ? "none" : `opacity 220ms ${EASE}, transform 340ms ${EASE}` }}>
                {on ? <Check drawn={copied} reduced={reduced} /> : <Copy className="size-3.5" strokeWidth={1.75} />}
              </span>
            ))}
          </button>
          <button type="button" onClick={onHide} className={`h-7 shrink-0 cursor-pointer rounded-full px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}>
            Hide
          </button>
        </>
      ) : onReveal ? (
        <StatusButton
          size="sm"
          variant="ghost"
          status={status}
          labels={{ idle: "Reveal", pending: "Revealing", success: "Reveal", error: "Try again" }}
          onClick={async () => {
            setStatus("pending");
            try {
              await onReveal();
              setStatus("idle");
            } catch {
              setStatus("error");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function Switch({ on, label, onToggle, reduced, busy }: { on: boolean; label: string; onToggle: () => void; reduced: boolean; busy: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-busy={busy || undefined}
      onClick={onToggle}
      className={`inline-flex h-7 cursor-pointer items-center gap-2 rounded-full pr-2.5 pl-1 text-[12px] font-medium transition-colors hover:bg-accent aria-busy:cursor-default ${FOCUS}`}
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-[background-color,box-shadow] duration-300 ${on ? "bg-primary" : "bg-muted shadow-[inset_0_0_0_1px_var(--border)]"}`}>
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow-[0_0_0_1px_var(--border)]" style={{ transform: on ? "translateX(16px)" : "none", transition: reduced ? "none" : `transform 420ms ${THROW}` }} />
      </span>
      <TextMorph>{busy ? "Saving" : label}</TextMorph>
    </button>
  );
}

interface EndpointProps {
  ep: WebhookEndpoint;
  open: boolean;
  log?: Log;
  secret: string | null;
  fresh: boolean;
  gone: boolean;
  toggling: boolean;
  reduced: boolean;
  appName: string;
  canReveal: boolean;
  canToggle: boolean;
  canDelete: boolean;
  canRedeliver: boolean;
  act: React.RefObject<Actions>;
}

type Actions = {
  open: (id: string) => void;
  test: (ep: WebhookEndpoint, event: string) => Promise<WebhookDelivery>;
  delivered: (ep: WebhookEndpoint, d: WebhookDelivery) => void;
  more: (ep: WebhookEndpoint) => void;
  redeliver: (ep: WebhookEndpoint, d: WebhookDelivery) => Promise<unknown>;
  reveal: (ep: WebhookEndpoint) => Promise<void>;
  hide: (ep: WebhookEndpoint) => void;
  toggle: (ep: WebhookEndpoint) => void;
  remove: (ep: WebhookEndpoint) => Promise<void>;
};

const Endpoint = React.memo(function Endpoint({ ep, open, log, secret, fresh, gone, toggling, reduced, appName, canReveal, canToggle, canDelete, canRedeliver, act }: EndpointProps) {
  const ref = React.useRef<HTMLLIElement>(null);
  const { host, path } = split(ep.url);
  const enabled = ep.enabled !== false;
  const last = ep.lastDelivery;
  const failing = enabled && last && (last.status === null || last.status >= 500);

  React.useLayoutEffect(() => {
    if (fresh && !reduced) ref.current?.animate([{ opacity: 0, filter: "blur(4px)", transform: "translateY(-6px)" }, { opacity: 1, filter: "blur(0px)", transform: "none" }], { duration: 460, easing: EASE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <li ref={ref} className="border-t border-border first:border-t-0">
      <Fold open={!gone} reduced={reduced}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => act.current.open(ep.id)}
          className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 @md:px-5 ${FOCUS} focus-visible:ring-inset`}
        >
          <span
            aria-hidden="true"
            className={`size-1.5 shrink-0 rounded-full transition-colors duration-500 ${!enabled ? "bg-muted-foreground/40" : failing ? "bg-red-500" : "bg-emerald-500"}`}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-[12.5px]">
              <span className="text-foreground">{host}</span>
              <span className="text-muted-foreground">{path}</span>
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-baseline tabular-nums">
                <NumberRoll value={ep.events.length} />
                &nbsp;<TextMorph>{ep.events.length === 1 ? "event" : "events"}</TextMorph>
              </span>
              <span aria-hidden="true">·</span>
              {!enabled ? (
                <span>Disabled</span>
              ) : last ? (
                <span className="inline-flex items-center gap-1.5">
                  <StatusChip status={last.status} />
                  <RelativeTime date={last.at} />
                </span>
              ) : (
                <span>No deliveries yet</span>
              )}
            </span>
          </span>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" style={{ transform: open ? "rotate(180deg)" : "none", transition: reduced ? "none" : `transform 340ms ${EASE}` }}>
            <path d="M4.5 6.25 8 9.75l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <Fold open={open} reduced={reduced}>
          <div className="space-y-5 px-4 pt-1 pb-4 @md:px-5 @md:pb-5">
            <section aria-label="Send a test event">
              <p className="mb-2 text-[11.5px] font-medium text-muted-foreground">Send a test</p>
              <WebhookWire
                host={host}
                events={ep.events}
                from={appName}
                reduced={reduced}
                autoFocus={fresh && open}
                onSend={(event) => act.current.test(ep, event)}
                onDelivered={(d) => act.current.delivered(ep, d)}
              />
            </section>

            <section aria-label="Recent deliveries">
              <p className="mb-1 text-[11.5px] font-medium text-muted-foreground">Recent deliveries</p>
              <div className="rounded-[14px] px-1 shadow-[inset_0_0_0_1px_var(--border)]">
                <DeliveryList
                  deliveries={log?.items ?? []}
                  loading={Boolean(log?.loading) || !log}
                  more={Boolean(log?.more)}
                  onMore={() => act.current.more(ep)}
                  onRedeliver={canRedeliver ? (d) => act.current.redeliver(ep, d) : undefined}
                  reduced={reduced}
                />
              </div>
            </section>

            <div className="grid gap-4 @lg:grid-cols-2">
              <section aria-label="Signing secret" className="min-w-0">
                <p className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">Signing secret</p>
                <Secret value={secret} onReveal={canReveal ? () => act.current.reveal(ep) : undefined} onHide={() => act.current.hide(ep)} reduced={reduced} />
              </section>
              <section aria-label="Events" className="min-w-0">
                <p className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">Events</p>
                <p className="flex flex-wrap gap-1">
                  {ep.events.map((e) => (
                    <span key={e} className="rounded-full px-2 py-0.5 font-mono text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
                      {e}
                    </span>
                  ))}
                </p>
              </section>
            </div>

            {(canToggle || canDelete) && (
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                {canToggle ? <Switch on={enabled} label={enabled ? "Enabled" : "Disabled"} busy={toggling} reduced={reduced} onToggle={() => !toggling && act.current.toggle(ep)} /> : <span />}
                {canDelete && (
                  <ConfirmAction
                    icon={<Trash2 strokeWidth={1.75} />}
                    label={`Delete endpoint ${host}`}
                    labels={{ idle: "Delete endpoint", pending: "Deleting", success: "Deleted", error: "Try again" }}
                    onConfirm={() => act.current.remove(ep)}
                  />
                )}
              </div>
            )}
          </div>
        </Fold>
      </Fold>
    </li>
  );
});

export function Webhooks({
  value,
  defaultValue = NONE,
  onValueChange,
  events,
  onCreate,
  onTest,
  loadDeliveries,
  onRedeliver,
  onRevealSecret,
  onToggle,
  onDelete,
  appName = "Your app",
  title = "Webhooks",
  description = "Send events to your own server as they happen.",
  className = "",
  ...props
}: WebhooksProps) {
  const reduced = useReducedMotion();
  const id = React.useId();
  const [inner, setInner] = React.useState(defaultValue);
  const endpoints = value ?? inner;
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<Record<string, Log>>({});
  const [secrets, setSecrets] = React.useState<Record<string, string>>({});
  const [toggling, setToggling] = React.useState<Record<string, boolean>>({});
  const [gone, setGone] = React.useState<string[]>([]);
  const [fresh, setFresh] = React.useState<string | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const urlRef = React.useRef<HTMLInputElement>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const latest = React.useRef(endpoints);
  latest.current = endpoints;

  const commit = (next: WebhookEndpoint[]) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  const patch = (epId: string, p: Partial<WebhookEndpoint>) => commit(latest.current.map((e) => (e.id === epId ? { ...e, ...p } : e)));
  const setLog = (epId: string, f: (l: Log) => Log) => setLogs((all) => ({ ...all, [epId]: f(all[epId] ?? { items: [], loading: false, more: false, loaded: false }) }));

  const load = async (ep: WebhookEndpoint, before?: WebhookDelivery) => {
    if (!loadDeliveries) return setLog(ep.id, (l) => ({ ...l, loaded: true }));
    setLog(ep.id, (l) => ({ ...l, loading: true }));
    try {
      const page = await loadDeliveries(ep, before);
      setLog(ep.id, (l) => ({ items: before ? [...l.items, ...page] : page, loading: false, loaded: true, more: page.length > 0 }));
    } catch {
      setLog(ep.id, (l) => ({ ...l, loading: false, loaded: true }));
    }
  };

  const act = React.useRef<Actions>(null!);
  act.current = {
    open: (epId) => {
      setFresh(null);
      setOpenId((o) => (o === epId ? null : epId));
      const ep = latest.current.find((e) => e.id === epId);
      if (ep && openId !== epId && !logs[epId]?.loaded && !logs[epId]?.loading) load(ep);
    },
    test: (ep, event) => onTest(ep, event),
    delivered: (ep, d) => {
      setLog(ep.id, (l) => ({ ...l, loaded: true, items: [d, ...l.items.filter((x) => x.id !== d.id)] }));
      patch(ep.id, { lastDelivery: { status: d.status, at: d.at } });
    },
    more: (ep) => {
      const items = logs[ep.id]?.items ?? [];
      load(ep, items[items.length - 1]);
    },
    redeliver: async (ep, d) => {
      if (!onRedeliver) return;
      const next = await onRedeliver(d, ep);
      act.current.delivered(ep, next);
      setAnnounce(`Redelivered ${d.event}: ${next.status ?? "no answer"}.`);
    },
    reveal: async (ep) => {
      if (!onRevealSecret) return;
      const s = await onRevealSecret(ep);
      setSecrets((all) => ({ ...all, [ep.id]: s }));
    },
    hide: (ep) => setSecrets((all) => Object.fromEntries(Object.entries(all).filter(([k]) => k !== ep.id))),
    toggle: async (ep) => {
      const next = ep.enabled === false;
      patch(ep.id, { enabled: next });
      setToggling((t) => ({ ...t, [ep.id]: true }));
      try {
        await onToggle?.(ep, next);
        setAnnounce(`${split(ep.url).host} ${next ? "enabled" : "disabled"}.`);
      } catch (e) {
        patch(ep.id, { enabled: !next });
        setAnnounce(message(e, "That change couldn't be saved."));
      } finally {
        setToggling((t) => Object.fromEntries(Object.entries(t).filter(([k]) => k !== ep.id)));
      }
    },
    remove: async (ep) => {
      await onDelete?.(ep);
      setAnnounce(`${split(ep.url).host} deleted.`);
      window.setTimeout(() => setGone((g) => [...g, ep.id]), 500);
      window.setTimeout(() => {
        commit(latest.current.filter((e) => e.id !== ep.id));
        setGone((g) => g.filter((x) => x !== ep.id));
        setOpenId((o) => (o === ep.id ? null : o));
      }, 1000);
    },
  };

  const openDraft = () => {
    if (draft) return;
    setDraft({ url: "", events: events.slice(0, 1).map((e) => e.value), status: "idle", error: null });
    requestAnimationFrame(() => urlRef.current?.focus({ preventScroll: true }));
  };
  const closeDraft = () => {
    setDraft(null);
    requestAnimationFrame(() => addRef.current?.focus({ preventScroll: true }));
  };

  const submit = async () => {
    if (!draft || draft.status === "pending") return;
    const why = checkUrl(draft.url) ?? (draft.events.length ? null : "Pick at least one event.");
    if (why) {
      setDraft({ ...draft, error: why, status: "idle" });
      if (!reduced) formRef.current?.querySelector("[data-url]")?.animate(SHAKE, { duration: 380, easing: "ease-out" });
      return;
    }
    setDraft({ ...draft, status: "pending", error: null });
    try {
      const ep = await onCreate({ url: draft.url.trim(), events: draft.events });
      commit([ep, ...latest.current]);
      setLogs((all) => ({ ...all, [ep.id]: { items: [], loading: false, more: false, loaded: true } }));
      setFresh(ep.id);
      setOpenId(ep.id);
      setDraft(null);
      setAnnounce(`${split(ep.url).host} added. Send a test to check it.`);
    } catch (e) {
      setDraft((d) => d && { ...d, status: "error", error: message(e, "The endpoint couldn't be added.") });
    }
  };

  const busyDraft = draft?.status === "pending";
  return (
    <div className={`@container w-full rounded-[22px] border border-border bg-background text-foreground ${className}`} {...props}>
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3.5 @md:px-5 @md:pt-5">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2 text-[14px] font-medium tracking-[-0.01em]">
            {title}
            <span className="text-[12px] font-normal text-muted-foreground tabular-nums">
              <NumberRoll value={endpoints.length} />
            </span>
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
        </div>
        <button
          ref={addRef}
          type="button"
          onClick={openDraft}
          aria-disabled={Boolean(draft) || undefined}
          aria-expanded={Boolean(draft)}
          aria-controls={`${id}-form`}
          className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12px] font-medium shadow-[inset_0_0_0_1px_var(--border)] transition-[background-color,opacity] hover:bg-accent aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent ${FOCUS}`}
        >
          <Plus className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          Add endpoint
        </button>
      </div>

      <Fold open={Boolean(draft)} reduced={reduced}>
        <form
          ref={formRef}
          id={`${id}-form`}
          noValidate
          className="border-t border-border px-4 py-3.5 @md:px-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busyDraft) {
              e.preventDefault();
              closeDraft();
            }
          }}
        >
          <label htmlFor={`${id}-url`} className="text-[11.5px] text-muted-foreground">
            Endpoint URL
          </label>
          <input
            ref={urlRef}
            data-url=""
            id={`${id}-url`}
            type="url"
            inputMode="url"
            value={draft?.url ?? ""}
            readOnly={busyDraft}
            onChange={(e) => setDraft((d) => d && { ...d, url: e.target.value, error: null, status: "idle" })}
            placeholder="https://api.yourcompany.com/webhooks"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(draft?.error) || undefined}
            aria-describedby={`${id}-line`}
            className={`mt-1 h-9 w-full rounded-[10px] bg-transparent px-3 font-mono text-[16px] text-foreground outline-none transition-shadow placeholder:font-sans placeholder:text-muted-foreground/70 [@media(pointer:fine)]:text-[12.5px] ${
              draft?.error ? "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-red-500)_45%,transparent)]" : "shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--ring)]"
            }`}
          />
          <p className="mt-3 text-[11.5px] text-muted-foreground">Events</p>
          <div role="group" aria-label="Events to send" className="mt-1.5 flex flex-wrap gap-1.5">
            {events.map((ev) => {
              const on = Boolean(draft?.events.includes(ev.value));
              return (
                <EventChip
                  key={ev.value}
                  value={ev.value}
                  on={on}
                  reduced={reduced}
                  onToggle={() => setDraft((d) => d && { ...d, error: null, events: on ? d.events.filter((x) => x !== ev.value) : [...d.events, ev.value] })}
                />
              );
            })}
          </div>
          <div className="mt-3.5 flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            <p id={`${id}-line`} className={`mr-auto min-w-0 text-[11.5px] ${draft?.error ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              {draft?.error ?? "We sign every request so your server can check it came from us."}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={closeDraft} disabled={busyDraft} className={`h-7 cursor-pointer rounded-full px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-50 ${FOCUS}`}>
                Cancel
              </button>
              <StatusButton type="submit" size="sm" status={draft?.status ?? "idle"} labels={{ idle: "Add endpoint", pending: "Adding", error: "Try again" }} />
            </div>
          </div>
        </form>
      </Fold>

      <div className="border-t border-border">
        <ul aria-label={title}>
          {endpoints.map((ep) => (
            <Endpoint
              key={ep.id}
              ep={ep}
              open={openId === ep.id}
              log={logs[ep.id]}
              secret={secrets[ep.id] ?? null}
              fresh={fresh === ep.id}
              gone={gone.includes(ep.id)}
              toggling={Boolean(toggling[ep.id])}
              reduced={reduced}
              appName={appName}
              canReveal={Boolean(onRevealSecret)}
              canToggle={Boolean(onToggle)}
              canDelete={Boolean(onDelete)}
              canRedeliver={Boolean(onRedeliver)}
              act={act}
            />
          ))}
        </ul>
        <Fold open={!endpoints.length && !draft} reduced={reduced}>
          <p className="px-4 py-6 text-center text-[12.5px] text-muted-foreground @md:px-5">No endpoints yet. Add one to start receiving events.</p>
        </Fold>
      </div>

      <span className="sr-only" role="status">
        {announce}
      </span>
    </div>
  );
}
