"use client";

import * as React from "react";
import { ArrowUpRight, Eye, EyeOff, KeyRound } from "lucide-react";
import { CodeInput } from "./code-input";
import { NumberRoll } from "./number-roll";
import { StatusButton, type ActionStatus } from "./status-button";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * AUTH CARD: sign-in that asks one thing at a time
 *
 *   email     sign-in providers, then the email field; your
 *             server decides what comes next (a password, a
 *             code or a link), the way identifier-first sign-in
 *             works at Google and Clerk
 *   identity  the email field doesn't go anywhere: its frame
 *             shrinks round the address into a chip as the
 *             providers fold away above it, and "Change" opens
 *             at its end to take you back
 *   step      each next step slides in from the right (Change
 *             slides back from the left) while the card eases
 *             to its new height; titles lift out and in
 *   code      the code boxes (code input) check as the last
 *             digit lands, and resend counts down
 *   link      "Check your inbox", with a button that opens the
 *             inbox itself for Gmail, Outlook, iCloud, Yahoo
 *             and Proton addresses
 *   done      a ring draws, a check draws inside it, "Signed in"
 *
 * The card never calls a service: every step is one async
 * function, so it fits Better Auth, Clerk, Supabase or Auth.js.
 * ───────────────────────────────────────────────────────── */

export type AuthNext = "password" | "code" | "link";
export type AuthStep = "email" | AuthNext | "reset" | "done";

export interface AuthProvider {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface AuthCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  mode?: "sign-in" | "sign-up";
  /** Above the title: your mark. */
  logo?: React.ReactNode;
  /** Words per step: { email: { title, description }, code: { … }, … }. */
  copy?: Partial<Record<AuthStep, { title?: string; description?: string }>>;
  providers?: AuthProvider[];
  /** Starts a provider's sign-in; usually it redirects, so the button keeps spinning. */
  onProvider?: (id: string) => Promise<unknown> | unknown;
  /** Shows "Sign in with a passkey". Resolve when signed in. */
  onPasskey?: () => Promise<unknown>;
  /** Your server says what comes next for this address. Throw to say why not. */
  onEmail: (email: string) => Promise<AuthNext> | AuthNext;
  onPassword?: (email: string, password: string) => Promise<unknown>;
  /** Resolve when the code is right; throw when it isn't. */
  onCode?: (email: string, code: string) => Promise<unknown>;
  /** Sends the code or link again. */
  onResend?: (email: string) => Promise<unknown>;
  /** Shows "Forgot password?" on the password step; sends a reset link. */
  onForgot?: (email: string) => Promise<unknown>;
  /** After "Signed in" has shown, e.g. to redirect. */
  onSuccess?: () => void;
  defaultEmail?: string;
  codeLength?: number;
  /** Seconds before a code or link can be sent again. */
  resendAfter?: number;
  /** Under the card's content: terms, a link to sign up. */
  footer?: React.ReactNode;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHAKE = [{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "none" }];
const ORDER: AuthStep[] = ["email", "password", "code", "link", "reset", "done"];
const INBOXES: [RegExp, string, string][] = [
  [/^(gmail|googlemail)\.com$/, "Gmail", "https://mail.google.com/mail/u/0/#inbox"],
  [/^(outlook|hotmail|live|msn)\.[a-z.]+$/, "Outlook", "https://outlook.live.com/mail/"],
  [/^(icloud|me|mac)\.com$/, "iCloud Mail", "https://www.icloud.com/mail"],
  [/^yahoo\.[a-z.]+$/, "Yahoo Mail", "https://mail.yahoo.com"],
  [/^(proton\.me|protonmail\.com|pm\.me)$/, "Proton Mail", "https://mail.proton.me"],
];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const inboxFor = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const hit = INBOXES.find(([re]) => re.test(domain));
  return hit ? { name: hit[1], href: hit[2] } : null;
};

/** A line that changes by lifting the old words out through a blur and the new ones in. */
function Line({ text, className = "", reduced, as: Tag = "p", id }: { text: string; className?: string; reduced: boolean; as?: "p" | "h2"; id?: string }) {
  const [shown, setShown] = React.useState(text);
  const [old, setOld] = React.useState<{ key: number; text: string }[]>([]);
  const key = React.useRef(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  if (text !== shown) {
    if (!reduced && shown) setOld((o) => [...o, { key: ++key.current, text: shown }]);
    setShown(text);
  }
  React.useLayoutEffect(() => {
    if (reduced || !old.length) return;
    ref.current?.animate([{ opacity: 0, transform: "translateY(0.3em)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }], { duration: 380, delay: 80, easing: EASE, fill: "backwards" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  return (
    <Tag id={id} className={`relative ${className}`}>
      <span ref={ref} className="block">
        {shown}
      </span>
      {old.map((o) => (
        <Leaving key={o.key} onDone={() => setOld((all) => all.filter((x) => x.key !== o.key))}>
          {o.text}
        </Leaving>
      ))}
    </Tag>
  );
}

function Leaving({ children, onDone }: { children: React.ReactNode; onDone: () => void }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const a = ref.current?.animate([{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, transform: "translateY(-0.3em)", filter: "blur(4px)" }], { duration: 220, easing: EASE, fill: "forwards" });
    if (a) a.onfinish = onDone;
    return () => a?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 block">
      {children}
    </span>
  );
}

function Fold({ open, reduced, children }: { open: boolean; reduced: boolean; children: React.ReactNode }) {
  const [kept, setKept] = React.useState(children);
  if (open && kept !== children) {
    setKept(children);
  }
  return (
    <div className="grid" inert={!open} aria-hidden={!open || undefined} style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, transition: reduced ? "none" : `grid-template-rows 460ms ${EASE}, opacity ${open ? 320 : 180}ms ${EASE}` }}>
      <div className="min-h-0 overflow-clip [overflow-clip-margin:6px]">{open ? children : kept}</div>
    </div>
  );
}

/** The steps under the identity: the new one slides in from the side you went, the old one out the other way, and the box eases to fit. */
function Slides({ step, dir, reduced, render }: { step: AuthStep; dir: number; reduced: boolean; render: (s: AuthStep) => React.ReactNode }) {
  const [faces, setFaces] = React.useState<{ s: AuthStep; out: boolean; dir: number; enter: boolean }[]>([{ s: step, out: false, dir, enter: false }]);
  const [seen, setSeen] = React.useState(step);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const height = React.useRef(0);
  // Clipped only while a step slides; at rest a menu can open past its edge.
  const [moving, setMoving] = React.useState(false);
  React.useEffect(() => {
    if (!moving) return;
    const timer = window.setTimeout(() => setMoving(false), 560);
    return () => window.clearTimeout(timer);
  }, [moving, step]);
  if (seen !== step) {
    setSeen(step);
    if (!reduced) setMoving(true);
    setFaces((f) => [...f.filter((x) => x.out && x.s !== step && x.s !== seen), ...(reduced ? [] : [{ s: seen, out: true, dir, enter: false }]), { s: step, out: false, dir, enter: true }]);
  }

  React.useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    height.current = el.offsetHeight;
    const observer = new ResizeObserver(() => (height.current = el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || reduced) return;
    const to = el.offsetHeight;
    if (Math.abs(to - height.current) > 0.5) el.animate([{ height: `${height.current}px` }, { height: `${to}px` }], { duration: 460, easing: EASE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div ref={boxRef} className="relative [overflow-clip-margin:8px]" style={{ overflowY: moving ? "clip" : "visible" }}>
      {faces.map((f) => (
        <Face key={f.s} out={f.out} enter={f.enter} dir={f.dir} reduced={reduced} onGone={() => setFaces((all) => all.filter((x) => !(x.s === f.s && x.out)))}>
          {render(f.s)}
        </Face>
      ))}
    </div>
  );
}

function Face({ out, enter, dir, reduced, onGone, children }: { out: boolean; enter: boolean; dir: number; reduced: boolean; onGone: () => void; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A face that comes back while it was still leaving drops its exit first.
    el.getAnimations().forEach((a) => a.cancel());
    if (reduced) return;
    if (out) {
      const a = el.animate([{ opacity: 1, transform: "none", filter: "blur(0px)" }, { opacity: 0, transform: `translateX(${-dir * 28}px)`, filter: "blur(4px)" }], { duration: 240, easing: EASE, fill: "forwards" });
      a.onfinish = onGone;
      return;
    }
    if (!enter) return;
    el.animate([{ opacity: 0, transform: `translateX(${dir * 28}px)`, filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }], { duration: 440, delay: 80, easing: EASE, fill: "backwards" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [out]);
  return (
    <div ref={ref} inert={out} aria-hidden={out || undefined} className={out ? "pointer-events-none absolute inset-x-0 top-0" : ""}>
      {children}
    </div>
  );
}

/** "Resend in 0:28", rolling down; then Resend → Sending → Sent, and the clock starts again. */
function Resend({ after, reduced, onResend }: { after: number; reduced: boolean; onResend: () => Promise<unknown> }) {
  const [since, setSince] = React.useState(() => Date.now());
  const [now, setNow] = React.useState(since);
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const left = Math.max(0, since + after * 1000 - now);
  const counting = left > 0;
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
  const ready = !counting && status !== "pending" && status !== "success";
  const label = status === "pending" ? "Sending" : status === "success" ? "Sent" : status === "error" ? "Try again" : counting ? "Resend in" : "Resend";
  const s = Math.ceil(left / 1000);
  return (
    <button
      type="button"
      aria-disabled={!ready || undefined}
      aria-label={counting ? "Resend, available shortly" : "Resend"}
      onClick={async () => {
        if (!ready) return;
        setStatus("pending");
        try {
          await onResend();
          setStatus("success");
          setSince(Date.now());
          setNow(Date.now());
        } catch {
          setStatus("error");
        }
      }}
      className={`inline-flex h-7 cursor-pointer items-center rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap tabular-nums transition-colors aria-disabled:cursor-default ${FOCUS} ${
        status === "error" ? "text-red-600 dark:text-red-400" : ready ? "text-foreground hover:bg-accent" : "text-muted-foreground"
      }`}
    >
      <TextMorph>{label}</TextMorph>
      <span
        aria-hidden="true"
        className="inline-grid"
        style={{ gridTemplateColumns: counting && status === "idle" ? "1fr" : "0fr", opacity: counting && status === "idle" ? 1 : 0, transition: reduced ? "none" : `grid-template-columns 380ms ${EASE}, opacity 260ms ${EASE}` }}
      >
        <span className="min-w-0 [clip-path:inset(-4px_0)]">
          <span className="inline-flex items-baseline pl-[0.25em]">
            <NumberRoll value={Math.floor(s / 60)} direction="down" />:
            <NumberRoll value={s % 60} format={{ minimumIntegerDigits: 2 }} direction="down" />
          </span>
        </span>
      </span>
    </button>
  );
}

/** A ring that draws itself, then a check inside it. */
function Done({ reduced }: { reduced: boolean }) {
  const ring = React.useRef<SVGCircleElement>(null);
  const check = React.useRef<SVGPathElement>(null);
  React.useLayoutEffect(() => {
    if (reduced) return;
    ring.current?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 640, delay: 120, easing: EASE, fill: "backwards" });
    check.current?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 420, delay: 560, easing: EASE, fill: "backwards" });
  }, [reduced]);
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="size-12 text-emerald-600 dark:text-emerald-400">
      <circle cx="24" cy="24" r="22.5" stroke="var(--border)" strokeWidth="1" />
      <circle
        ref={ring}
        cx="24"
        cy="24"
        r="22.5"
        stroke="currentColor"
        strokeWidth="1.25"
        pathLength={1}
        strokeDasharray={1}
        transform="rotate(-90 24 24)"
        strokeDashoffset={0}
      />
      <path
        ref={check}
        d="M16.5 24.5 21.5 29.5 31.5 18.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={0}
      />
    </svg>
  );
}

export function AuthCard({
  mode = "sign-in",
  logo,
  copy,
  providers = [],
  onProvider,
  onPasskey,
  onEmail,
  onPassword,
  onCode,
  onResend,
  onForgot,
  onSuccess,
  defaultEmail = "",
  codeLength = 6,
  resendAfter = 30,
  footer,
  className = "",
  ...props
}: AuthCardProps) {
  const id = React.useId();
  const reduced = useReducedMotion();
  const [step, setStep] = React.useState<AuthStep>("email");
  const [dir, setDir] = React.useState(1);
  const [email, setEmail] = React.useState(defaultEmail);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const [chipWidth, setChipWidth] = React.useState(0);
  const shellRef = React.useRef<HTMLDivElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const mirrorRef = React.useRef<HTMLSpanElement>(null);
  const changeRef = React.useRef<HTMLButtonElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const identity = step !== "email";
  const signUp = mode === "sign-up";

  const words: Record<AuthStep, { title: string; description: string }> = {
    email: { title: signUp ? "Create your account" : "Sign in", description: signUp ? "Start with your work email." : "Welcome back. Use the email you signed up with." },
    password: { title: "Enter your password", description: "" },
    code: { title: "Check your email", description: "We sent you a code. It works for 10 minutes." },
    link: { title: "Check your inbox", description: "We sent you a sign-in link. It works for 10 minutes." },
    reset: { title: "Check your inbox", description: "We sent a link to reset your password." },
    done: { title: signUp ? "You're in" : "Signed in", description: "Taking you to your workspace." },
  };
  const title = copy?.[step]?.title ?? words[step].title;
  const description = copy?.[step]?.description ?? words[step].description;

  const go = (next: AuthStep) => {
    setDir(ORDER.indexOf(next) >= ORDER.indexOf(step) ? 1 : -1);
    setError(null);
    setStatus("idle");
    setStep(next);
    setAnnounce(copy?.[next]?.title ?? words[next].title);
  };

  const shake = (el: Element | null | undefined) => {
    if (!reduced) el?.animate(SHAKE, { duration: 380, easing: "ease-out" });
  };

  // The chip is as wide as the address plus "Change".
  React.useLayoutEffect(() => {
    const m = mirrorRef.current;
    const c = changeRef.current;
    if (!m || !c) return;
    const w = Math.ceil(m.offsetWidth + c.offsetWidth + 6);
    setChipWidth((p) => (p === w ? p : w));
  }, [email, identity]);

  // Each step puts focus on the thing to do next.
  React.useEffect(() => {
    const body = bodyRef.current;
    if (step === "email") {
      if (dir < 0) emailRef.current?.select();
      return;
    }
    const timer = window.setTimeout(() => {
      if (step === "password") passwordRef.current?.focus({ preventScroll: true });
      else body?.querySelector<HTMLElement>("[data-autofocus], input, a[href], button:not([aria-disabled])")?.focus({ preventScroll: true });
    }, reduced ? 0 : 120);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  React.useEffect(() => {
    if (step !== "done" || !onSuccess) return;
    const timer = window.setTimeout(onSuccess, reduced ? 400 : 1300);
    return () => window.clearTimeout(timer);
  }, [step, onSuccess, reduced]);

  const submitEmail = async () => {
    if (status === "pending") return;
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError(value ? `“${value}” doesn't look like an email address.` : "Enter your email address.");
      shake(shellRef.current);
      emailRef.current?.focus();
      return;
    }
    setEmail(value);
    setStatus("pending");
    setError(null);
    try {
      const next = await onEmail(value);
      go(next);
    } catch (e) {
      setStatus("error");
      setError(message(e, "We couldn't check that address. Try again."));
      shake(shellRef.current);
    }
  };

  const submitPassword = async () => {
    if (status === "pending" || !onPassword) return;
    if (!password) {
      setError("Enter your password.");
      shake(passwordRef.current?.parentElement);
      return;
    }
    setStatus("pending");
    setError(null);
    try {
      await onPassword(email, password);
      go("done");
    } catch (e) {
      setStatus("error");
      setError(message(e, "That password isn't right."));
      shake(passwordRef.current?.parentElement);
      passwordRef.current?.select();
    }
  };

  const runProvider = async (key: string, run: () => unknown) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      await run();
      // A redirect never gets here; a popup or a passkey does.
      go("done");
    } catch (e) {
      setBusy(null);
      setError(message(e, key === "passkey" ? "Passkey sign-in didn't finish." : "That sign-in didn't finish. Try again."));
    }
  };

  const errorLine = (
    <Fold open={Boolean(error)} reduced={reduced}>
      <p id={`${id}-error`} className="pt-2 text-[12px] text-red-600 dark:text-red-400">
        {error}
      </p>
    </Fold>
  );

  const inbox = inboxFor(email);
  const render = (s: AuthStep): React.ReactNode => {
    if (s === "email")
      return (
        <div className="pt-3">
          <StatusButton
            type="submit"
            status={status}
            labels={{ idle: "Continue", pending: "Checking", success: "Continue", error: "Try again" }}
            className="w-full"
          />
          {onPasskey && (
            <button
              type="button"
              onClick={() => runProvider("passkey", onPasskey)}
              aria-busy={busy === "passkey" || undefined}
              className={`mt-2 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-busy:cursor-default ${FOCUS}`}
            >
              {busy === "passkey" ? <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none" /> : <KeyRound className="size-4" strokeWidth={1.75} aria-hidden="true" />}
              <TextMorph>{busy === "passkey" ? "Waiting for your passkey" : "Sign in with a passkey"}</TextMorph>
            </button>
          )}
        </div>
      );
    if (s === "password")
      return (
        <div className="pt-3">
          <label htmlFor={`${id}-password`} className="text-[12px] font-medium text-muted-foreground">
            Password
          </label>
          <div className={`mt-1.5 flex h-10 items-center rounded-[12px] pr-1 transition-shadow ${error ? "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-red-500)_45%,transparent)]" : "shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--ring)]"}`}>
            <input
              ref={passwordRef}
              id={`${id}-password`}
              type={showPassword ? "text" : "password"}
              autoComplete={signUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
                if (status === "error") setStatus("idle");
              }}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-[16px] text-foreground outline-none [@media(pointer:fine)]:text-[14px]"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className={`relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}
            >
              {[false, true].map((on) => (
                <span
                  key={String(on)}
                  aria-hidden="true"
                  className="absolute inset-0 grid place-items-center"
                  style={{ opacity: showPassword === on ? 1 : 0, transform: showPassword === on ? "none" : "scale(0.6)", filter: showPassword === on || reduced ? "none" : "blur(3px)", transition: reduced ? "none" : `opacity 240ms ${EASE}, transform 360ms ${EASE}, filter 240ms ${EASE}` }}
                >
                  {on ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
                </span>
              ))}
            </button>
          </div>
          {errorLine}
          <div className="mt-3 flex items-center justify-between gap-2">
            {onForgot ? (
              <ForgotButton
                onForgot={async () => {
                  await onForgot(email);
                  go("reset");
                }}
              />
            ) : (
              <span />
            )}
            <StatusButton type="submit" status={status} labels={{ idle: "Sign in", pending: "Signing in", success: "Signed in", error: "Try again" }} />
          </div>
        </div>
      );
    if (s === "code")
      return (
        <div className="pt-4">
          <CodeInput
            length={codeLength}
            autoFocus
            onComplete={async (code) => {
              await onCode?.(email, code);
              window.setTimeout(() => go("done"), reduced ? 0 : 900);
              return true;
            }}
            onResend={onResend ? () => onResend(email) : undefined}
            resendAfter={resendAfter}
          />
        </div>
      );
    if (s === "link" || s === "reset")
      return (
        <div className="flex flex-wrap items-center gap-2 pt-4">
          {inbox && (
            <a
              data-autofocus=""
              href={inbox.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 ${FOCUS}`}
            >
              Open {inbox.name}
              <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </a>
          )}
          {onResend && <Resend after={resendAfter} reduced={reduced} onResend={() => onResend(email)} />}
        </div>
      );
    return (
      <div className="flex flex-col items-center pt-5 pb-1 text-center">
        <Done reduced={reduced} />
      </div>
    );
  };

  return (
    <div className={`w-full rounded-[22px] border border-border bg-background p-5 text-foreground sm:p-6 ${className}`} {...props}>
      {logo && <div className="mb-4">{logo}</div>}
      <Line as="h2" id={`${id}-title`} text={title} reduced={reduced} className="text-[19px] font-medium tracking-[-0.02em]" />
      <Fold open={Boolean(description)} reduced={reduced}>
        <Line text={description} reduced={reduced} className="mt-1 text-[13px] leading-[1.5] text-muted-foreground" />
      </Fold>

      <form
        noValidate
        aria-labelledby={`${id}-title`}
        onSubmit={(e) => {
          e.preventDefault();
          if (step === "email") submitEmail();
          else if (step === "password") submitPassword();
        }}
      >
        {/* Providers fold away above the address once it's chosen. */}
        <Fold open={!identity && providers.length > 0} reduced={reduced}>
          <div className="pt-5">
            <div className={`grid gap-2 ${providers.length > 1 ? "grid-cols-2" : ""}`}>
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onProvider && runProvider(p.id, () => onProvider(p.id))}
                  aria-busy={busy === p.id || undefined}
                  disabled={Boolean(busy) && busy !== p.id}
                  className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--border)] transition-[background-color,opacity] duration-200 hover:bg-accent disabled:cursor-default disabled:opacity-40 aria-busy:cursor-default ${FOCUS}`}
                >
                  <span className="relative grid size-4 place-items-center [&_svg]:size-4" aria-hidden="true">
                    <span className="absolute inset-0 grid place-items-center" style={{ opacity: busy === p.id ? 0 : 1, transform: busy === p.id ? "scale(0.6)" : "none", transition: reduced ? "none" : `opacity 200ms ${EASE}, transform 320ms ${EASE}` }}>
                      {p.icon}
                    </span>
                    <span
                      className={`absolute inset-0.5 rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none ${busy === p.id ? "animate-spin" : ""}`}
                      style={{ opacity: busy === p.id ? 1 : 0, transition: reduced ? "none" : `opacity 200ms ${EASE}` }}
                    />
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 text-[11.5px] text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        </Fold>

        <div className="pt-4">
          {!identity && (
            <label htmlFor={`${id}-email`} className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
              Email
            </label>
          )}
          {/* The address: a field, then the same frame shrunk round it as a chip. */}
          <div
            ref={shellRef}
            className="relative flex items-center overflow-hidden"
            style={{
              width: identity ? chipWidth || "auto" : "100%",
              maxWidth: "100%",
              height: identity ? 32 : 40,
              borderRadius: identity ? 16 : 12,
              boxShadow: identity ? "inset 0 0 0 1px var(--border)" : error && step === "email" ? "inset 0 0 0 1px color-mix(in oklab, var(--color-red-500) 45%, transparent)" : undefined,
              transition: reduced ? "none" : `width 520ms ${EASE}, height 520ms ${EASE}, border-radius 520ms ${EASE}, box-shadow 200ms`,
            }}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 rounded-[inherit] transition-shadow duration-200 ${identity || (error && step === "email") ? "" : "shadow-[inset_0_0_0_1px_var(--border)] [:focus-within>&]:shadow-[inset_0_0_0_1px_var(--ring)]"}`}
            />
            <span ref={mirrorRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre px-3 text-[16px] [@media(pointer:fine)]:text-[14px]">
              {email || " "}
            </span>
            <input
              ref={emailRef}
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete={onPasskey ? "username webauthn" : "email"}
              placeholder="you@company.com"
              value={email}
              readOnly={identity || status === "pending"}
              tabIndex={identity ? -1 : undefined}
              aria-label={identity ? `Signing in as ${email}` : undefined}
              aria-invalid={(Boolean(error) && step === "email") || undefined}
              aria-describedby={error && step === "email" ? `${id}-error` : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
                if (status === "error") setStatus("idle");
              }}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-[16px] text-foreground outline-none placeholder:text-muted-foreground/70 [@media(pointer:fine)]:text-[14px]"
            />
            <span
              className="inline-grid shrink-0"
              style={{
                gridTemplateColumns: identity && step !== "done" ? "1fr" : "0fr",
                opacity: identity && step !== "done" ? 1 : 0,
                transition: reduced ? "none" : `grid-template-columns 420ms ${EASE} ${identity ? 160 : 0}ms, opacity 260ms ${EASE} ${identity ? 220 : 0}ms`,
              }}
              inert={!identity || step === "done"}
            >
              <span className="min-w-0 overflow-clip">
                <button
                  ref={changeRef}
                  type="button"
                  onClick={() => {
                    setPassword("");
                    go("email");
                  }}
                  className={`mr-1 h-6 cursor-pointer rounded-full px-2 text-[12px] font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${FOCUS}`}
                >
                  Change
                </button>
              </span>
            </span>
          </div>
          {step === "email" && errorLine}
        </div>

        <div ref={bodyRef}>
          <Slides step={step} dir={dir} reduced={reduced} render={render} />
        </div>
      </form>

      {footer && (
        <Fold open={step === "email"} reduced={reduced}>
          <div className="pt-5 text-center text-[12px] text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-2 hover:[&_a]:underline">{footer}</div>
        </Fold>
      )}

      <span className="sr-only" role="status">
        {announce}
      </span>
    </div>
  );
}

function ForgotButton({ onForgot }: { onForgot: () => Promise<void> }) {
  const [status, setStatus] = React.useState<ActionStatus>("idle");
  return (
    <button
      type="button"
      aria-disabled={status === "pending" || undefined}
      onClick={async () => {
        if (status === "pending") return;
        setStatus("pending");
        try {
          await onForgot();
        } catch {
          setStatus("error");
        }
      }}
      className={`-ml-2 h-7 cursor-pointer rounded-full px-2 text-[12px] font-medium transition-colors hover:bg-accent ${FOCUS} ${status === "error" ? "text-red-600 dark:text-red-400" : "text-muted-foreground hover:text-foreground"}`}
    >
      <TextMorph>{status === "pending" ? "Sending a link" : status === "error" ? "Couldn't send it. Try again" : "Forgot password?"}</TextMorph>
    </button>
  );
}
