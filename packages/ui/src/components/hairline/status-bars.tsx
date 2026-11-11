"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { RelativeTime, type DateLike } from "./relative-time";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * STATUS BARS: a status page that reads at a glance
 *
 *   overall   one line says how things are; it morphs when a
 *             service changes ("All systems operational" →
 *             "Some systems degraded") and its dot changes
 *             colour with it
 *   days      ninety days a service, a bar a day, drawn up
 *             from the baseline left to right; thirty on a
 *             narrow card
 *   read      point at a day (or arrow along with the keys) and
 *             one card glides from bar to bar above them, saying
 *             what happened that day
 *   incidents an open incident shows its updates newest first;
 *             a new update opens in on top and the status pill
 *             morphs (Investigating → Identified → Monitoring →
 *             Resolved). Past incidents fold behind a toggle
 *
 * Everything is props: feed it from your own checks or from
 * Better Stack, Instatus or Atlassian Statuspage.
 * ───────────────────────────────────────────────────────── */

export type { DateLike };
export type ServiceStatus = "operational" | "degraded" | "major" | "maintenance";
export type DayStatus = "operational" | "degraded" | "major" | "maintenance" | "none";

export interface StatusDay {
  /** "2026-10-14". */
  date: string;
  status: DayStatus;
  /** Minutes the service was degraded or down that day. */
  minutes?: number;
  /** Incident titles that touched this day. */
  incidents?: string[];
}

export interface StatusService {
  id: string;
  name: string;
  status: ServiceStatus;
  /** Uptime over the days shown, as a percentage. */
  uptime?: number;
  /** Oldest first; the last is today. */
  days: StatusDay[];
}

export type IncidentStage = "investigating" | "identified" | "monitoring" | "resolved";

export interface StatusIncident {
  id: string;
  title: string;
  impact: "minor" | "major" | "maintenance";
  stage: IncidentStage;
  /** Newest first. */
  updates: { id: string; at: DateLike; stage: IncidentStage; message: string }[];
  /** Names of affected services. */
  services?: string[];
}

export interface StatusBarsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  services: StatusService[];
  incidents?: StatusIncident[];
  updatedAt?: DateLike;
  title?: string;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const BAR: Record<DayStatus, string> = {
  operational: "bg-emerald-500/80",
  degraded: "bg-amber-500",
  major: "bg-red-500",
  maintenance: "bg-foreground/35",
  none: "bg-muted shadow-[inset_0_0_0_1px_var(--border)]",
};
const WORD: Record<ServiceStatus, string> = { operational: "Operational", degraded: "Degraded", major: "Outage", maintenance: "Maintenance" };
const WORD_TONE: Record<ServiceStatus, string> = {
  operational: "text-emerald-600 dark:text-emerald-400",
  degraded: "text-amber-700 dark:text-amber-400",
  major: "text-red-600 dark:text-red-400",
  maintenance: "text-muted-foreground",
};
const STAGES: Record<IncidentStage, string> = { investigating: "Investigating", identified: "Identified", monitoring: "Monitoring", resolved: "Resolved" };
const NONE: StatusIncident[] = [];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  return `${DAYS[t.getDay()]} ${d} ${MONTHS[m - 1]}`;
};
const span = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`);
const said = (d: StatusDay) =>
  d.status === "none"
    ? "No data"
    : d.status === "operational"
      ? "No incidents"
      : d.status === "maintenance"
        ? `Maintenance${d.minutes ? ` for ${span(d.minutes)}` : ""}`
        : `${d.status === "major" ? "Down" : "Degraded"}${d.minutes ? ` for ${span(d.minutes)}` : ""}`;

function overall(services: StatusService[]) {
  if (services.some((s) => s.status === "major")) return { text: "Major outage", tone: "major" as const };
  if (services.some((s) => s.status === "degraded")) return { text: "Some systems degraded", tone: "degraded" as const };
  if (services.some((s) => s.status === "maintenance")) return { text: "Maintenance in progress", tone: "maintenance" as const };
  return { text: "All systems operational", tone: "operational" as const };
}

/** A sentence that changes by lifting the old one out and the new one in. */
function Line({ text, className = "", reduced }: { text: string; className?: string; reduced: boolean }) {
  const [shown, setShown] = React.useState(text);
  const [old, setOld] = React.useState<{ k: number; t: string }[]>([]);
  const key = React.useRef(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  if (text !== shown) {
    if (!reduced) setOld((o) => [...o, { k: ++key.current, t: shown }]);
    setShown(text);
  }
  React.useLayoutEffect(() => {
    if (!reduced && old.length) ref.current?.animate([{ opacity: 0, transform: "translateY(0.3em)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }], { duration: 420, delay: 80, easing: EASE, fill: "backwards" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  return (
    <span className={`relative inline-block ${className}`}>
      <span ref={ref} className="inline-block">
        {shown}
      </span>
      {old.map((o) => (
        <Gone key={o.k} text={o.t} onDone={() => setOld((all) => all.filter((x) => x.k !== o.k))} />
      ))}
    </span>
  );
}

function Gone({ text, onDone }: { text: string; onDone: () => void }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const a = ref.current?.animate([{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, transform: "translateY(-0.3em)", filter: "blur(4px)" }], { duration: 220, easing: EASE, fill: "forwards" });
    if (a) a.onfinish = onDone;
    return () => a?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span ref={ref} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 whitespace-nowrap">
      {text}
    </span>
  );
}

function Service({ s, reduced }: { s: StatusService; reduced: boolean }) {
  const id = React.useId();
  const barsRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<number | null>(null);
  const [place, setPlace] = React.useState({ x: 0, ready: false });
  const [keyed, setKeyed] = React.useState(false);
  const [spoken, setSpoken] = React.useState("");
  const last = s.days.length - 1;

  // The bars draw up from the baseline, left to right, once.
  React.useLayoutEffect(() => {
    if (reduced) return;
    barsRef.current?.querySelectorAll<HTMLElement>("[data-bar]").forEach((b, i) =>
      b.animate([{ transform: "scaleY(0)" }, { transform: "none" }], { duration: 520, delay: 60 + i * 5, easing: EASE, fill: "backwards" }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The card glides to sit over the day, kept inside the row.
  React.useLayoutEffect(() => {
    if (active === null) return;
    const bars = barsRef.current;
    const card = cardRef.current;
    const bar = bars?.querySelector<HTMLElement>(`[data-bar="${active}"]`);
    if (!bars || !card || !bar) return;
    const center = bar.offsetLeft + bar.offsetWidth / 2;
    const x = Math.max(0, Math.min(bars.offsetWidth - card.offsetWidth, center - card.offsetWidth / 2));
    setPlace((p) => (p.x === x && p.ready ? p : { x, ready: true }));
  }, [active]);

  const day = active === null ? null : s.days[active];
  const move = (to: number) => {
    const visible = [...(barsRef.current?.querySelectorAll<HTMLElement>("[data-bar]") ?? [])].filter((b) => b.offsetParent !== null).map((b) => Number(b.dataset.bar));
    const first = visible[0] ?? 0;
    const i = Math.max(first, Math.min(last, to));
    setActive(i);
    setKeyed(true);
    const d = s.days[i];
    setSpoken(`${dayLabel(d.date)}: ${said(d)}${d.incidents?.length ? `. ${d.incidents.join(". ")}` : ""}`);
  };

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex min-w-0 items-baseline gap-2">
          <span id={`${id}-name`} className="truncate text-[13.5px] font-medium tracking-[-0.01em]">
            {s.name}
          </span>
          <span className={`shrink-0 text-[11.5px] transition-colors duration-500 ${WORD_TONE[s.status]}`}>
            <TextMorph>{WORD[s.status]}</TextMorph>
          </span>
        </p>
        {s.uptime !== undefined && (
          <p className="shrink-0 text-[11.5px] text-muted-foreground tabular-nums">
            <NumberRoll value={s.uptime / 100} format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }} /> uptime
          </p>
        )}
      </div>

      <div className="relative mt-2">
        {/* One card for every day: it glides between bars instead of a tooltip per bar. */}
        <div
          ref={cardRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-[13.5rem] rounded-[12px] bg-popover px-3 py-2 text-popover-foreground shadow-[inset_0_0_0_1px_var(--border)]"
          style={{
            transform: `translateX(${place.x}px) translateY(${day ? 0 : 4}px)`,
            opacity: day ? 1 : 0,
            transition: reduced ? "none" : `transform ${place.ready && day ? 320 : 0}ms ${EASE}, opacity 180ms ${EASE}`,
          }}
        >
          {day && (
            <>
              <p className="text-[11.5px] text-muted-foreground">{dayLabel(day.date)}</p>
              <p className={`mt-0.5 text-[12.5px] font-medium ${day.status === "major" ? "text-red-600 dark:text-red-400" : day.status === "degraded" ? "text-amber-700 dark:text-amber-400" : ""}`}>{said(day)}</p>
              {day.incidents?.map((t) => (
                <p key={t} className="mt-1 text-[11.5px] leading-[1.4] text-muted-foreground">
                  {t}
                </p>
              ))}
            </>
          )}
        </div>

        <div
          ref={barsRef}
          role="group"
          tabIndex={0}
          aria-labelledby={`${id}-name`}
          aria-describedby={`${id}-help`}
          onPointerMove={(e) => {
            const bar = (e.target as HTMLElement).closest<HTMLElement>("[data-bar]");
            if (bar) {
              setKeyed(false);
              setActive(Number(bar.dataset.bar));
            }
          }}
          onPointerLeave={() => !keyed && setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            const at = active ?? last;
            if (e.key === "ArrowLeft") move(at - 1);
            else if (e.key === "ArrowRight") move(at + 1);
            else if (e.key === "Home") move(0);
            else if (e.key === "End") move(last);
            else if (e.key === "Escape") return setActive(null);
            else return;
            e.preventDefault();
          }}
          onFocus={() => active === null && move(last)}
          className={`flex h-8 items-stretch gap-[2px] rounded-[4px] ${FOCUS} focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
        >
          {s.days.map((d, i) => (
            <span
              key={d.date}
              data-bar={i}
              className={`min-w-[2px] flex-1 origin-bottom rounded-[2px] transition-[background-color,opacity] duration-500 ${BAR[d.status]} ${i < s.days.length - 30 ? "hidden @lg:block" : ""}`}
              style={{ opacity: active === null || active === i ? 1 : 0.55 }}
            />
          ))}
        </div>
        <span id={`${id}-help`} className="sr-only">
          {`${s.name} is ${WORD[s.status].toLowerCase()}. Arrow keys read each day.`}
        </span>
        <span className="sr-only" role="status">
          {keyed ? spoken : ""}
        </span>
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>
          <span className="@lg:hidden">{Math.min(30, s.days.length)} days ago</span>
          <span className="hidden @lg:inline">{s.days.length} days ago</span>
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}

function Incident({ inc, reduced, open, onToggle }: { inc: StatusIncident; reduced: boolean; open: boolean; onToggle?: () => void }) {
  const seen = React.useRef(new Set(inc.updates.map((u) => u.id)));
  const listRef = React.useRef<HTMLOListElement>(null);
  // A new update opens in on top.
  React.useLayoutEffect(() => {
    const fresh = inc.updates.filter((u) => !seen.current.has(u.id));
    fresh.forEach((u) => seen.current.add(u.id));
    if (reduced || !fresh.length) return;
    for (const u of fresh) {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-update="${CSS.escape(u.id)}"]`);
      el?.animate([{ opacity: 0, transform: "translateY(-6px)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }], { duration: 460, easing: EASE });
    }
  }, [inc.updates, reduced]);
  const tick = inc.stage === "resolved" ? "bg-emerald-500" : inc.impact === "major" ? "bg-red-500" : inc.impact === "minor" ? "bg-amber-500" : "bg-foreground/35";
  const updates = open ? inc.updates : inc.updates.slice(0, 1);
  return (
    <article className="relative rounded-[14px] py-3 pr-3 pl-4 shadow-[inset_0_0_0_1px_var(--border)]">
      <span aria-hidden="true" className={`absolute top-3 bottom-3 left-0 w-0.5 rounded-full transition-colors duration-500 ${tick}`} />
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[13.5px] font-medium tracking-[-0.01em]">{inc.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium shadow-[inset_0_0_0_1px_var(--border)] transition-colors duration-500 ${inc.stage === "resolved" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
          <TextMorph>{STAGES[inc.stage]}</TextMorph>
        </span>
      </div>
      {inc.services?.length ? <p className="mt-0.5 text-[11.5px] text-muted-foreground">{inc.services.join(", ")}</p> : null}
      <ol ref={listRef} className="mt-2.5 space-y-2.5">
        {updates.map((u) => (
          <li key={u.id} data-update={u.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 text-[12.5px]">
            <span className="text-[11.5px] text-muted-foreground">
              <span className="block font-medium text-foreground">{STAGES[u.stage]}</span>
              <RelativeTime date={u.at} />
            </span>
            <p className="leading-[1.5] text-foreground/90">{u.message}</p>
          </li>
        ))}
      </ol>
      {onToggle && inc.updates.length > 1 && (
        <button type="button" aria-expanded={open} onClick={onToggle} className={`mt-2 -ml-2 h-7 cursor-pointer rounded-full px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}>
          <TextMorph>{open ? "Fewer updates" : `All ${inc.updates.length} updates`}</TextMorph>
        </button>
      )}
    </article>
  );
}

export function StatusBars({ services, incidents = NONE, updatedAt, title = "Status", className = "", ...props }: StatusBarsProps) {
  const reduced = useReducedMotion();
  const [showPast, setShowPast] = React.useState(false);
  const [openPast, setOpenPast] = React.useState<string | null>(null);
  const now = overall(services);
  const active = incidents.filter((i) => i.stage !== "resolved");
  const past = incidents.filter((i) => i.stage === "resolved");
  const dot = { operational: "bg-emerald-500", degraded: "bg-amber-500", major: "bg-red-500", maintenance: "bg-foreground/40" }[now.tone];

  return (
    <div className={`@container w-full rounded-[22px] border border-border bg-background text-foreground ${className}`} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-4 @md:px-5">
        <h2 className="flex items-center gap-2.5 text-[17px] font-medium tracking-[-0.02em] @md:text-[19px]">
          <span className="relative grid size-2.5 place-items-center" aria-hidden="true">
            <span className={`size-2.5 rounded-full transition-colors duration-500 ${dot}`} />
            {now.tone !== "operational" && !reduced && <span className={`absolute inset-0 rounded-full opacity-40 animate-[ui-ping_1.8s_ease-out_infinite] ${dot}`} />}
          </span>
          <span className="sr-only">{title}: </span>
          <Line text={now.text} reduced={reduced} />
        </h2>
        {updatedAt !== undefined && (
          <p className="text-[11.5px] text-muted-foreground">
            <RelativeTime date={updatedAt} prefix="Updated" />
          </p>
        )}
      </div>

      {active.length > 0 && (
        <section aria-label="Open incidents" className="space-y-2.5 border-b border-border px-4 py-4 @md:px-5">
          {active.map((inc) => (
            <Incident key={inc.id} inc={inc} reduced={reduced} open />
          ))}
        </section>
      )}

      <section aria-label="Services" className="divide-y divide-border px-4 py-4 @md:px-5">
        {services.map((s) => (
          <Service key={s.id} s={s} reduced={reduced} />
        ))}
      </section>

      {past.length > 0 && (
        <section aria-label="Past incidents" className="border-t border-border px-4 py-3 @md:px-5">
          <button
            type="button"
            aria-expanded={showPast}
            onClick={() => setShowPast((v) => !v)}
            className={`-ml-2 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}
          >
            <TextMorph>{showPast ? "Hide past incidents" : "Past incidents"}</TextMorph>
            <span className="tabular-nums">
              <NumberRoll value={past.length} />
            </span>
          </button>
          <div className="grid" inert={!showPast} style={{ gridTemplateRows: showPast ? "1fr" : "0fr", opacity: showPast ? 1 : 0, transition: reduced ? "none" : `grid-template-rows 460ms ${EASE}, opacity 300ms ${EASE}` }}>
            <div className="min-h-0 min-w-0 overflow-clip">
              <div className="space-y-2.5 pt-2.5 pb-1">
                {past.map((inc) => (
                  <Incident key={inc.id} inc={inc} reduced={reduced} open={openPast === inc.id} onToggle={() => setOpenPast((o) => (o === inc.id ? null : inc.id))} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
