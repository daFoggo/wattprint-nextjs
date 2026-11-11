"use client";

import * as React from "react";
import { TextMorph } from "./text-morph";

/* ─────────────────────────────────────────────────────────
 * ROLE MENU: a role pill that grows into the list of roles
 *
 *   open      the pill's own surface grows from its right edge
 *             into the panel (size and radius ease) while its
 *             label fades into the list; it opens upward when
 *             there's no room below
 *   pick      the panel folds back into the pill and the label
 *             morphs to the new role; while it saves, the
 *             chevron gives way to a small spinner
 *   refuse    if saving fails the label morphs back and the
 *             pill gives a short shake
 * ───────────────────────────────────────────────────────── */

export interface TeamRole {
  value: string;
  label: string;
  /** One line under the role in the menu: what it can do. */
  description?: string;
}

export interface RoleMenuProps {
  roles: TeamRole[];
  value: string;
  onValueChange: (role: string) => void;
  /** Shows a spinner in place of the chevron. */
  saving?: boolean;
  /** Bumped by the parent to shake the pill (a save failed). */
  shake?: number;
  /** Accessible name, e.g. "Role for Maya Chen". */
  label: string;
  /** Said before the role inside the pill, e.g. "as". */
  prefix?: string;
  disabled?: boolean;
  className?: string;
}

type Phase = "closed" | "opening" | "open" | "closing";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const DURATION = 420;
const PANEL = 248;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

function Chevron({ up, reduced }: { up: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3" style={{ transform: up ? "rotate(180deg)" : "none", transition: reduced ? "none" : `transform 320ms ${EASE}` }}>
      <path d="M4.5 6.25 8 9.75l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The pill's insides, shared by the real pill and the copy that fades out as the surface grows. */
function PillFace({ prefix, label, saving, up, reduced }: { prefix?: string; label: string; saving: boolean; up: boolean; reduced: boolean }) {
  return (
    <>
      {prefix && <span className="text-muted-foreground">{prefix}&nbsp;</span>}
      <TextMorph>{label}</TextMorph>
      <span className="relative ml-1 grid size-3 place-items-center text-muted-foreground">
        <span className="absolute inset-0 grid place-items-center" style={{ opacity: saving ? 0 : 1, transform: saving ? "scale(0.6)" : "none", transition: reduced ? "none" : `opacity 200ms ${EASE}, transform 320ms ${EASE}` }}>
          <Chevron up={up} reduced={reduced} />
        </span>
        <span
          className={`absolute inset-0.5 rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none ${saving ? "animate-spin" : ""}`}
          style={{ opacity: saving ? 1 : 0, transition: reduced ? "none" : `opacity 200ms ${EASE}` }}
        />
      </span>
    </>
  );
}

export function RoleMenu({ roles, value, onValueChange, saving = false, shake = 0, label, prefix, disabled = false, className = "" }: RoleMenuProps) {
  const id = React.useId();
  const reduced = useReducedMotion();
  const [phase, setPhase] = React.useState<Phase>("closed");
  const [active, setActive] = React.useState(0);
  const [pill, setPill] = React.useState({ width: 0, height: 28 });
  const [panelHeight, setPanelHeight] = React.useState(0);
  const [fit, setFit] = React.useState({ up: false, width: PANEL, shift: 0 });
  const [highlight, setHighlight] = React.useState({ top: 0, height: 0, ready: false });
  const [quiet, setQuiet] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const timer = React.useRef(0);
  const selected = roles.find((r) => r.value === value);
  const expanded = phase === "open";
  const mounted = phase !== "closed";
  const [prevPhase, setPrevPhase] = React.useState(phase);
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    if (phase === "closed") {
      setHighlight({ top: 0, height: 0, ready: false });
    }
  }

  const measureFit = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    const width = Math.min(PANEL, viewport - 32);
    // Anchored at the pill's right edge; pushed right if that would leave the screen.
    const shift = Math.max(0, 16 - (rect.right - width));
    const estimate = roles.length * 52 + 12;
    const up = window.innerHeight - rect.top < estimate + 24 && rect.bottom > estimate + 24;
    setFit((f) => (f.up === up && f.width === width && f.shift === shift ? f : { up, width, shift }));
  };

  const open = () => {
    if (disabled || saving || phase === "open" || phase === "opening") return;
    window.clearTimeout(timer.current);
    measureFit();
    setActive(Math.max(0, roles.findIndex((r) => r.value === value)));
    setPhase(reduced ? "open" : "opening");
  };

  const close = React.useCallback(
    (refocus = true) => {
      window.clearTimeout(timer.current);
      if (refocus) triggerRef.current?.focus({ preventScroll: true });
      if (reduced) return setPhase("closed");
      setPhase("closing");
      timer.current = window.setTimeout(() => setPhase("closed"), DURATION);
    },
    [reduced],
  );

  React.useEffect(() => {
    if (phase !== "opening") return;
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setPhase("open"))));
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [phase]);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  React.useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const measure = () => setPill((p) => (p.width === trigger.offsetWidth && p.height === trigger.offsetHeight ? p : { width: trigger.offsetWidth, height: trigger.offsetHeight }));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, []);

  React.useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    setPanelHeight(panel.offsetHeight);
  }, [mounted, roles]);

  React.useLayoutEffect(() => {
    const row = rowRefs.current[active];
    if (!row) return;
    const top = row.offsetTop;
    const height = row.offsetHeight;
    setHighlight((h) => (h.top === top && h.height === height && h.ready === (h.ready || expanded) ? h : { top, height, ready: h.ready || expanded }));
  }, [active, expanded, mounted]);

  React.useEffect(() => {
    if (expanded) listRef.current?.focus({ preventScroll: true });
  }, [expanded]);

  React.useEffect(() => {
    if (!expanded) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [expanded, close]);

  // A failed save: the pill shakes where it stands.
  React.useEffect(() => {
    if (!shake || reduced) return;
    triggerRef.current?.animate(
      [{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "none" }],
      { duration: 380, easing: "ease-out" },
    );
  }, [shake, reduced]);

  const choose = (role: TeamRole) => {
    close();
    if (role.value !== value) onValueChange(role.value);
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const last = roles.length - 1;
    const move = (to: number) => {
      e.preventDefault();
      setActive(Math.max(0, Math.min(last, to)));
    };
    if (e.key === "ArrowDown") move(active === last ? 0 : active + 1);
    else if (e.key === "ArrowUp") move(active === 0 ? last : active - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(last);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (roles[active]) choose(roles[active]);
    } else if (e.key === "Tab") close(false);
  };

  const width = expanded ? fit.width : pill.width;
  const height = expanded ? panelHeight : pill.height;
  const t = reduced ? "none" : `width ${DURATION}ms ${EASE}, height ${DURATION}ms ${EASE}, right ${DURATION}ms ${EASE}, border-radius ${DURATION}ms ${EASE}`;
  const listId = `${id}-roles`;
  const roleLabel = selected?.label ?? value;

  return (
    <div
      ref={wrapRef}
      className={`relative inline-flex shrink-0 ${className}`}
      onKeyDown={(e) => {
        setQuiet(false);
        if (e.key === "Escape" && expanded) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
      onBlur={(e) => {
        if (expanded && document.hasFocus() && !wrapRef.current?.contains(e.relatedTarget as Node)) close(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={mounted ? listId : undefined}
        aria-label={`${label}: ${roleLabel}`}
        aria-busy={saving || undefined}
        disabled={disabled}
        onClick={() => (expanded ? close() : open())}
        onPointerDown={() => setQuiet(true)}
        className={`inline-flex h-7 cursor-pointer items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium shadow-[inset_0_0_0_1px_var(--border)] transition-colors duration-150 hover:bg-accent disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent aria-busy:cursor-default ${quiet ? "outline-none" : FOCUS}`}
      >
        <PillFace prefix={prefix} label={roleLabel} saving={saving} up={expanded} reduced={reduced} />
      </button>

      {mounted && (
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            setQuiet(true);
          }}
          className="absolute z-30 overflow-hidden bg-popover text-popover-foreground"
          style={{
            [fit.up ? "bottom" : "top"]: 0,
            right: expanded ? -fit.shift : 0,
            width,
            height,
            borderRadius: expanded ? 16 : pill.height / 2,
            // The pill's own hairline, the whole way: it is the same surface.
            boxShadow: "inset 0 0 0 1px var(--border)",
            transition: t,
          }}
        >
          {/* The pill's label, fading out as the surface grows and back in as it folds. */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute right-0 inline-flex h-7 items-center whitespace-nowrap px-2.5 text-[12px] font-medium ${fit.up ? "bottom-0" : "top-0"}`}
            style={{ opacity: expanded ? 0 : 1, transition: reduced ? "none" : `opacity ${expanded ? 120 : 260}ms ${EASE} ${expanded ? 0 : 120}ms` }}
          >
            <PillFace prefix={prefix} label={roleLabel} saving={saving} up={expanded} reduced={reduced} />
          </span>
          <div
            ref={panelRef}
            className={`absolute right-0 p-1 ${fit.up ? "bottom-0" : "top-0"}`}
            style={{ width: fit.width, opacity: expanded ? 1 : 0, transition: reduced ? "none" : `opacity ${expanded ? 260 : 120}ms ${EASE} ${expanded ? 90 : 0}ms` }}
          >
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-label={label}
              aria-activedescendant={`${id}-r${active}`}
              onKeyDown={onListKey}
              className="relative outline-none"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 rounded-[12px] bg-accent"
                style={{
                  height: highlight.height,
                  transform: `translateY(${highlight.top}px)`,
                  opacity: highlight.ready ? 1 : 0,
                  transition: highlight.ready && !reduced ? `transform 300ms ${EASE}, height 300ms ${EASE}, opacity 200ms` : "none",
                }}
              />
              {roles.map((r, i) => {
                const on = r.value === value;
                return (
                  <div
                    key={r.value}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    id={`${id}-r${i}`}
                    role="option"
                    aria-selected={on}
                    onPointerMove={() => setActive(i)}
                    onClick={() => choose(r)}
                    className="relative flex cursor-pointer items-start gap-2 rounded-[12px] px-2.5 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium">{r.label}</span>
                      {r.description && <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-muted-foreground">{r.description}</span>}
                    </span>
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0">
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                        strokeDasharray={1}
                        style={{ strokeDashoffset: on && expanded ? 0 : 1, transition: reduced ? "none" : `stroke-dashoffset 380ms ${EASE} 160ms` }}
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
