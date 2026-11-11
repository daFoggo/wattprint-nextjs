"use client";

import * as React from "react";
import { Mail, MailX, Trash2 } from "lucide-react";
import { ConfirmAction } from "./confirm-action";
import { NumberRoll } from "./number-roll";
import { RelativeTime, toTime, type DateLike } from "./relative-time";
import { StatusButton, type ActionStatus } from "./status-button";
import { TagInput, type TagInputProps, type TagInputTag } from "./tag-input";
import { RoleMenu, type TeamRole } from "./team-role-menu";
import { TextMorph } from "./text-morph";
import { useRowMotion } from "./use-row-motion";

/* ─────────────────────────────────────────────────────────
 * TEAM MEMBERS: Settings → Members, done properly
 *
 *   invite    addresses go into the invite field (paste a list,
 *             duplicates fly into their twins); "Invite 3" sends
 *             them, and each chip lifts out of the field and
 *             flies down onto its new row in the list
 *   seats     "4 of 5 seats" rolls as people come and go; the
 *             field takes no more than the seats that are left
 *   role      the role pill grows into the list of roles and
 *             folds back with the new one; a spinner rides in
 *             the pill while it saves, and a refusal morphs the
 *             old role back with a shake
 *   resend    pending invites count down "Resend in 0:28",
 *             then offer Resend, which says Sending and Sent
 *             and starts the clock again
 *   remove    the bin stretches into "Remove", a check draws,
 *             the row folds away and the rest glide up
 *
 * Members are plain records; every change is one async
 * function, so it works with Clerk, Better Auth, WorkOS or
 * your own table.
 * ───────────────────────────────────────────────────────── */

export type { TeamRole, DateLike };

export interface TeamMember {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: string;
  /** "invited" until they accept. */
  status?: "active" | "invited";
  /** When the invite was last sent; the resend clock runs from it. */
  invitedAt?: DateLike;
  lastActiveAt?: DateLike | null;
  /** The person looking at the page. */
  you?: boolean;
  /** Can't be changed or removed here, e.g. the owner. */
  locked?: boolean;
}

export interface TeamMembersProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: TeamMember[];
  defaultValue?: TeamMember[];
  onValueChange?: (members: TeamMember[]) => void;
  roles: TeamRole[];
  /** The role new invites start with; the second role by default. */
  inviteRole?: string;
  /** Seats on the plan. Members and pending invites both take one. */
  seats?: number;
  /** Sends invites. Return the new members (status "invited"); throw to keep the addresses and say why. */
  onInvite?: (emails: string[], role: string) => Promise<TeamMember[]>;
  /** Saves a role. Throw to put the old one back. */
  onRoleChange?: (member: TeamMember, role: string) => Promise<unknown> | unknown;
  /** Removes a member or cancels an invite. */
  onRemove?: (member: TeamMember) => Promise<unknown> | unknown;
  /** Sends an invite again. */
  onResend?: (member: TeamMember) => Promise<unknown> | unknown;
  /** Seconds before an invite can be sent again. */
  resendAfter?: number;
  /** People to suggest in the invite field (your directory). */
  suggestions?: TagInputProps["suggestions"];
  title?: string;
  description?: string;
}

type Actions = {
  role: (m: TeamMember, role: string) => void;
  remove: (m: TeamMember) => Promise<void>;
  resend: (m: TeamMember) => Promise<void>;
};

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const NONE: TeamMember[] = [];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPLIT = /[\s,;]+/;
const lower = (v: string) => v.toLowerCase();
const validate = (v: string) => (EMAIL.test(v) ? null : `“${v}” isn’t an email address`);
const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const two = { minimumIntegerDigits: 2 };

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const initials = (m: TeamMember) =>
  (m.name ?? m.email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

function Avatar({ m }: { m: TeamMember }) {
  if (m.status === "invited")
    return (
      <span data-avatar="" className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-border text-muted-foreground">
        <Mail className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      </span>
    );
  if (m.image)
    // eslint-disable-next-line @next/next/no-img-element
    return <img data-avatar="" src={m.image} alt="" className="size-8 shrink-0 rounded-full object-cover shadow-[0_0_0_1px_var(--border)]" />;
  return (
    <span data-avatar="" aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
      {initials(m)}
    </span>
  );
}

/** A piece of a line that opens and closes sideways (a countdown after "Resend in"). */
function Reveal({ open, reduced, children }: { open: boolean; reduced: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden={!open || undefined}
      className="inline-grid"
      style={{
        gridTemplateColumns: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        filter: open || reduced ? "none" : "blur(3px)",
        transition: reduced ? "none" : `grid-template-columns 380ms ${EASE}, opacity 260ms ${EASE}, filter 260ms ${EASE}`,
      }}
    >
      <span className="min-w-0 [clip-path:inset(-4px_0)]">{children}</span>
    </span>
  );
}

/** "Resend in 0:28", rolling down; then Resend → Sending → Sent, and the clock starts again. */
function Resend({ since, after, reduced, onResend }: { since: number; after: number; reduced: boolean; onResend: () => Promise<void> }) {
  const [now, setNow] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const left = now === null ? 0 : Math.max(0, since + after * 1000 - now);
  const counting = now !== null && left > 0;
  React.useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, [since]);
  React.useEffect(() => {
    if (!counting) return;
    const timer = window.setTimeout(() => setNow(Date.now()), 1000 - (Date.now() % 1000) + 10);
    return () => window.clearTimeout(timer);
  }, [counting, now]);
  React.useEffect(() => {
    if (status !== "success" && status !== "error") return;
    const timer = window.setTimeout(() => setStatus("idle"), status === "success" ? 1400 : 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  const busy = status === "pending" || status === "success";
  const label = status === "pending" ? "Sending" : status === "success" ? "Sent" : status === "error" ? "Try again" : counting ? "Resend in" : "Resend";
  const s = Math.ceil(left / 1000);
  const ready = !counting && !busy;

  return (
    <button
      type="button"
      aria-disabled={!ready || undefined}
      aria-label={counting ? "Resend invite, available shortly" : "Resend invite"}
      onClick={async () => {
        if (!ready) return;
        setStatus("pending");
        try {
          await onResend();
          setStatus("success");
        } catch {
          setStatus("error");
        }
      }}
      className={`inline-flex cursor-pointer items-baseline rounded-sm whitespace-nowrap tabular-nums transition-colors duration-200 aria-disabled:cursor-default ${FOCUS} ${
        status === "error" ? "text-red-600 dark:text-red-400" : ready ? "font-medium text-foreground underline-offset-2 hover:underline" : ""
      }`}
    >
      <TextMorph>{label}</TextMorph>
      <Reveal open={counting && status === "idle"} reduced={reduced}>
        <span className="inline-flex items-baseline pl-[0.25em]">
          <NumberRoll value={Math.floor(s / 60)} direction="down" />:
          <NumberRoll value={s % 60} format={two} direction="down" />
        </span>
      </Reveal>
    </button>
  );
}

/** A refusal, lifted in over the line under the name and lifted out again. */
function Note({ text, reduced }: { text?: string; reduced: boolean }) {
  const [shown, setShown] = React.useState(text);
  if (text && text !== shown) setShown(text);
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 truncate text-red-600 dark:text-red-400"
      style={{
        opacity: text ? 1 : 0,
        transform: text || reduced ? "none" : "translateY(-4px)",
        filter: text || reduced ? "none" : "blur(3px)",
        transition: reduced ? "none" : `opacity 260ms ${EASE} ${text ? 80 : 0}ms, transform 360ms ${EASE}, filter 260ms ${EASE}`,
      }}
    >
      {shown}
    </span>
  );
}

interface RowProps {
  m: TeamMember;
  roles: TeamRole[];
  saving: boolean;
  shake: number;
  /** Why the last change was refused; shown in place of the line under the name for a while. */
  note?: string;
  gone: boolean;
  canEdit: boolean;
  canRemove: boolean;
  canResend: boolean;
  resendAfter: number;
  reduced: boolean;
  act: React.RefObject<Actions>;
}

const MemberRow = React.memo(function MemberRow({ m, roles, saving, shake, note, gone, canEdit, canRemove, canResend, resendAfter, reduced, act }: RowProps) {
  const invited = m.status === "invited";
  const display = m.name ?? m.email;
  const role = roles.find((r) => r.value === m.role)?.label ?? m.role;
  const removable = canRemove && !m.locked && !m.you;
  return (
    <li data-row-id={m.id} className="border-t border-border first:border-t-0">
      <div className="flex items-center gap-3 px-4 py-2.5 transition-opacity duration-300 @md:px-5" style={{ opacity: gone ? 0.5 : 1 }}>
        <Avatar m={m} />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-medium tracking-[-0.01em]">
            <span data-name="" className="truncate">
              {display}
            </span>
            {m.you && <span className="shrink-0 rounded-full px-1.5 text-[11px] font-normal text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">You</span>}
          </p>
          <p className="relative mt-0.5 text-[11.5px] text-muted-foreground">
            <Note text={note} reduced={reduced} />
            <span
              className="flex min-w-0 items-baseline gap-x-1.5"
              style={{ opacity: note ? 0 : 1, filter: note && !reduced ? "blur(3px)" : "none", transition: reduced ? "none" : `opacity 220ms ${EASE}, filter 220ms ${EASE}` }}
            >
            {/* On a narrow card the name is enough; the address comes back when there's room. */}
            {m.name && <span className="hidden min-w-0 truncate @md:inline">{m.email}</span>}
            {m.name && (invited || m.lastActiveAt) && (
              <span aria-hidden="true" className="hidden @md:inline">
                ·
              </span>
            )}
            {invited ? (
              <>
                <span className="shrink-0 @md:hidden">Invited</span>
                <span className="hidden shrink-0 @md:inline">{m.invitedAt ? <RelativeTime date={m.invitedAt} prefix="Invited" /> : "Invited"}</span>
                {canResend && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Resend since={m.invitedAt ? toTime(m.invitedAt) : 0} after={resendAfter} reduced={reduced} onResend={() => act.current.resend(m)} />
                  </>
                )}
              </>
            ) : m.lastActiveAt ? (
              <RelativeTime className="shrink-0" date={m.lastActiveAt} prefix="Active" />
            ) : null}
            </span>
          </p>
        </div>
        {canEdit && !m.locked ? (
          <RoleMenu roles={roles} value={m.role} onValueChange={(r) => act.current.role(m, r)} saving={saving} shake={shake} label={`Role for ${display}`} />
        ) : (
          <span className="shrink-0 px-2.5 text-[12px] text-muted-foreground">{role}</span>
        )}
        {canRemove && (
          <div className="-mr-1 flex min-w-7 shrink-0 justify-end">
            {removable && (
              <ConfirmAction
                icon={invited ? <MailX strokeWidth={1.75} /> : <Trash2 strokeWidth={1.75} />}
                label={invited ? `Cancel invite for ${display}` : `Remove ${display}`}
                labels={invited ? { idle: "Cancel invite", pending: "Cancelling", success: "Cancelled", error: "Try again" } : { idle: "Remove", pending: "Removing", success: "Removed", error: "Try again" }}
                onConfirm={() => act.current.remove(m)}
              />
            )}
          </div>
        )}
      </div>
    </li>
  );
});

export function TeamMembers({
  value,
  defaultValue = NONE,
  onValueChange,
  roles,
  inviteRole,
  seats,
  onInvite,
  onRoleChange,
  onRemove,
  onResend,
  resendAfter = 30,
  suggestions,
  title = "Members",
  description = "People in this workspace and the invites waiting on them.",
  className = "",
  ...props
}: TeamMembersProps) {
  const reduced = useReducedMotion();
  const [inner, setInner] = React.useState(defaultValue);
  const members = value ?? inner;
  const [tags, setTags] = React.useState<TagInputTag[]>([]);
  const [role, setRole] = React.useState(() => inviteRole ?? roles[Math.min(1, roles.length - 1)]?.value ?? "");
  const [sending, setSending] = React.useState<ActionStatus>("idle");
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});
  const [shakes, setShakes] = React.useState<Record<string, number>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [gone, setGone] = React.useState<string[]>([]);
  const [announce, setAnnounce] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const flyRef = React.useRef<HTMLDivElement>(null);
  const flights = React.useRef(new Map<string, { rect: DOMRect; label: string }>());
  const latest = React.useRef(members);
  React.useLayoutEffect(() => {
    latest.current = members;
  });

  const commit = (next: TeamMember[]) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };

  const used = members.length;
  const left = seats === undefined ? undefined : Math.max(0, seats - used);
  const valid = tags.filter((t) => !t.error);
  const ranks = React.useMemo(() => new Map(members.map((m, i) => [m.id, i])), [members]);
  useRowMotion(listRef, { reduced, ranks, ghosts: ghostRef });

  const act = React.useRef<Actions>(null!);
  React.useLayoutEffect(() => {
    act.current = {
      role: async (m, next) => {
        const prev = m.role;
        const name = m.name ?? m.email;
        const label = roles.find((r) => r.value === next)?.label ?? next;
        commit(latest.current.map((x) => (x.id === m.id ? { ...x, role: next } : x)));
        setSaving((s) => ({ ...s, [m.id]: true }));
        try {
          await onRoleChange?.(m, next);
          setAnnounce(`${name} is now ${label}.`);
        } catch (e) {
          commit(latest.current.map((x) => (x.id === m.id ? { ...x, role: prev } : x)));
          setShakes((s) => ({ ...s, [m.id]: (s[m.id] ?? 0) + 1 }));
          const why = message(e, `${name}'s role couldn't be changed.`);
          setNotes((n) => ({ ...n, [m.id]: why }));
          setAnnounce(why);
          window.setTimeout(() => setNotes((n) => (n[m.id] === why ? Object.fromEntries(Object.entries(n).filter(([k]) => k !== m.id)) : n)), 3600);
        } finally {
          setSaving((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== m.id)));
        }
      },
      remove: async (m) => {
        await onRemove?.(m);
        setGone((g) => [...g, m.id]);
        setAnnounce(m.status === "invited" ? `Invite for ${m.email} cancelled.` : `${m.name ?? m.email} removed.`);
        // Long enough for the check to draw; then the row folds away.
        window.setTimeout(() => {
          commit(latest.current.filter((x) => x.id !== m.id));
          setGone((g) => g.filter((id) => id !== m.id));
        }, 700);
      },
      resend: async (m) => {
        await onResend?.(m);
        commit(latest.current.map((x) => (x.id === m.id ? { ...x, invitedAt: new Date() } : x)));
        setAnnounce(`Invite sent to ${m.email} again.`);
      },
    };
  });

  const invite = async () => {
    if (!onInvite || !valid.length || sending === "pending") return;
    setSending("pending");
    setInviteError(null);
    try {
      const added = await onInvite(
        valid.map((t) => t.value),
        role,
      );
      // Where each chip sits now, so its row can fly out of it.
      const at = new Map<string, { rect: DOMRect; label: string }>();
      for (const t of valid) {
        const el = fieldRef.current?.querySelector<HTMLElement>(`[data-token="${CSS.escape(t.id)}"]`);
        if (el) at.set(t.value.toLowerCase(), { rect: el.getBoundingClientRect(), label: t.label ?? t.value });
      }
      flights.current = at;
      commit([...added, ...latest.current]);
      setTags((ts) => ts.filter((t) => t.error));
      setSending("success");
      setAnnounce(`${added.length} ${added.length === 1 ? "invite" : "invites"} sent.`);
    } catch (e) {
      setSending("error");
      setInviteError(message(e, "The invites couldn't be sent. Try again."));
    }
  };

  // New rows that came from chips: each chip's copy flies from the field onto its row's name.
  React.useLayoutEffect(() => {
    const queued = flights.current;
    if (!queued.size) return;
    flights.current = new Map();
    const root = rootRef.current;
    const layer = flyRef.current;
    const list = listRef.current;
    if (!root || !layer || !list || reduced) return;
    const box = root.getBoundingClientRect();
    let i = 0;
    for (const m of members) {
      const from = queued.get(m.email.toLowerCase());
      if (!from) continue;
      const row = list.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(m.id)}"]`);
      const name = row?.querySelector<HTMLElement>("[data-name]");
      const avatar = row?.querySelector<HTMLElement>("[data-avatar]");
      if (!row || !name) continue;
      const to = name.getBoundingClientRect();
      const copy = document.createElement("span");
      copy.textContent = from.label;
      copy.className =
        "absolute left-0 top-0 inline-flex h-7 items-center whitespace-nowrap rounded-full bg-background px-2.5 text-[13px] font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)] will-change-transform";
      layer.appendChild(copy);
      const x0 = from.rect.left - box.left;
      const y0 = from.rect.top - box.top + (from.rect.height - 28) / 2;
      const x1 = to.left - box.left - 10;
      const y1 = to.top - box.top + to.height / 2 - 14;
      const delay = i++ * 60;
      // Lift off, travel, then hand over to the row's own name: the copy blurs out as the name sharpens in.
      const flight = copy.animate(
        [
          { transform: `translate(${x0}px, ${y0}px)`, opacity: 1, filter: "blur(0px)", boxShadow: "inset 0 0 0 1px var(--border)", easing: "cubic-bezier(0.3,0,0.2,1)" },
          { transform: `translate(${x0}px, ${y0 - 6}px)`, opacity: 1, filter: "blur(0px)", offset: 0.14, easing: EASE },
          { transform: `translate(${x1}px, ${y1}px)`, opacity: 1, filter: "blur(0px)", boxShadow: "inset 0 0 0 1px transparent", backgroundColor: "transparent", offset: 0.7, easing: "linear" },
          { transform: `translate(${x1}px, ${y1}px)`, opacity: 0, filter: "blur(4px)", boxShadow: "inset 0 0 0 1px transparent", backgroundColor: "transparent" },
        ],
        { duration: 680, delay, fill: "both" },
      );
      flight.onfinish = flight.oncancel = () => copy.remove();
      name.animate(
        [
          { opacity: 0, filter: "blur(4px)" },
          { opacity: 0, filter: "blur(4px)", offset: (delay + 680 * 0.66) / (delay + 680) },
          { opacity: 1, filter: "blur(0px)" },
        ],
        { duration: delay + 680, easing: "linear" },
      );
      avatar?.animate([{ opacity: 0, transform: "scale(0.6)", filter: "blur(3px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }], { duration: 420, delay: delay + 360, easing: EASE, fill: "backwards" });
    }
  }, [members, reduced]);

  const count = valid.length;
  return (
    <div ref={rootRef} className={`@container relative w-full rounded-[22px] border border-border bg-background text-foreground ${className}`} {...props}>
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3.5 @md:px-5 @md:pt-5">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2 text-[14px] font-medium tracking-[-0.01em]">
            {title}
            <span className="text-[12px] font-normal text-muted-foreground tabular-nums">
              <NumberRoll value={members.filter((m) => m.status !== "invited").length} />
            </span>
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
        </div>
        {seats !== undefined && (
          <p className={`flex shrink-0 items-baseline whitespace-nowrap pt-0.5 text-[11.5px] tabular-nums transition-colors duration-300 ${left === 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
            <NumberRoll value={used} />
            &nbsp;of&nbsp;
            <NumberRoll value={seats} />
            &nbsp;<TextMorph>{seats === 1 ? "seat" : "seats"}</TextMorph>
          </p>
        )}
      </div>

      {onInvite && (
        <div ref={fieldRef} className="px-4 pb-4 @md:px-5">
          <TagInput
            value={tags}
            onValueChange={(next) => {
              setTags(next);
              setInviteError(null);
              if (sending !== "pending") setSending("idle");
            }}
            label="Invite by email"
            placeholder="Emails, separated by commas"
            hint={inviteError ?? (left === 0 ? "Every seat is taken. Remove someone or add seats to invite more." : "Paste a list or pick from your directory.")}
            validate={validate}
            normalize={lower}
            separators={SPLIT}
            suggestions={suggestions}
            createLabel={(text) => `Invite “${text}”`}
            max={left}
            limitMessage={left === 1 ? "One seat left on your plan." : `${left} seats left on your plan.`}
            collapse={2}
            disabled={sending === "pending"}
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <RoleMenu roles={roles} value={role} onValueChange={setRole} label="Role for new members" prefix="as" />
            <StatusButton
              size="sm"
              status={sending}
              labels={{ idle: count > 1 ? `Invite ${count}` : "Invite", pending: "Inviting", success: "Invited", error: "Try again" }}
              onClick={invite}
              onReset={() => setSending("idle")}
              aria-disabled={(!count && sending === "idle") || undefined}
              className={!count && sending === "idle" ? "pointer-events-none opacity-50" : ""}
            />
          </div>
        </div>
      )}

      <div className="relative border-t border-border">
        <ul ref={listRef} aria-label={title} className="relative">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              m={m}
              roles={roles}
              saving={Boolean(saving[m.id])}
              shake={shakes[m.id] ?? 0}
              note={notes[m.id]}
              gone={gone.includes(m.id)}
              canEdit={Boolean(onRoleChange)}
              canRemove={Boolean(onRemove)}
              canResend={Boolean(onResend)}
              resendAfter={resendAfter}
              reduced={reduced}
              act={act}
            />
          ))}
        </ul>
        {/* Rows that went: their own elements, folding away where they stood (see use-row-motion). */}
        <div ref={ghostRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      </div>

      {/* Chips on their way from the field to their rows. */}
      <div ref={flyRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20" />
      <span className="sr-only" role="status">
        {announce}
      </span>
    </div>
  );
}
