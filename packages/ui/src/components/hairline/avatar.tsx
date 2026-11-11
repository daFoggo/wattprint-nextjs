"use client";

import * as React from "react";
import { NumberRoll } from "./number-roll";
import { EASE_OUT, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * AVATAR: a face, or initials until there is one
 *
 *   load     initials show at once; the photo comes up out of a
 *            blur over them once it has decoded, never a broken
 *            image or a flash of empty circle
 *   status   a dot on the edge (online, away, busy, offline), cut
 *            out of the photo by a ring of the background
 *   group    faces overlap; pointing at the stack fans it open
 *            so each face shows whole, and the "+N" rolls
 * ───────────────────────────────────────────────────────── */

export type AvatarStatus = "online" | "away" | "busy" | "offline";
export type AvatarSize = "xs" | "sm" | "md" | "lg";

export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  name: string;
  src?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  /** Square-ish (for teams and workspaces) instead of round. */
  shape?: "circle" | "square";
}

const PX: Record<AvatarSize, number> = { xs: 20, sm: 28, md: 36, lg: 48 };
const STATUS: Record<AvatarStatus, string> = { online: "bg-emerald-500", away: "bg-amber-500", busy: "bg-red-500", offline: "bg-muted-foreground/50" };

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, src, size = "md", status, shape = "circle", className = "", style, ...props }: AvatarProps) {
  const reduced = useInteractionReducedMotion();
  const [loaded, setLoaded] = React.useState<string | null>(null);
  const ready = !!src && loaded === src;
  const px = PX[size];
  const radius = shape === "circle" ? "rounded-full" : px >= 36 ? "rounded-[10px]" : "rounded-[7px]";

  return (
    <span
      role="img"
      aria-label={status ? `${name}, ${status}` : name}
      className={`relative inline-flex shrink-0 select-none ${className}`}
      style={{ width: px, height: px, ...style }}
      {...props}
    >
      <span className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-muted font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] ${radius}`} style={{ fontSize: Math.round(px * 0.38) }}>
        {initials(name)}
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            decoding="async"
            onLoad={() => setLoaded(src)}
            // A cached photo can finish before React listens; take it from the element.
            ref={(el) => {
              if (el?.complete && el.naturalWidth && loaded !== src) setLoaded(src);
            }}
            className="absolute inset-0 size-full object-cover"
            style={{
              opacity: ready ? 1 : 0,
              filter: ready || reduced ? "none" : "blur(6px)",
              scale: ready || reduced ? "1" : "1.08",
              transition: reduced ? "opacity 150ms" : `opacity 360ms ${EASE_OUT}, filter 420ms ${EASE_OUT}, scale 520ms ${EASE_OUT}`,
            }}
          />
        )}
      </span>
      {status && (
        <span
          aria-hidden="true"
          className={`absolute bottom-0 right-0 rounded-full shadow-[0_0_0_2px_var(--background)] transition-colors duration-300 ${STATUS[status]}`}
          style={{ width: Math.max(6, Math.round(px * 0.26)), height: Math.max(6, Math.round(px * 0.26)) }}
        />
      )}
    </span>
  );
}

export interface AvatarGroupProps {
  people: { name: string; src?: string }[];
  /** How many faces before "+N". */
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({ people, max = 4, size = "sm", className = "" }: AvatarGroupProps) {
  const reduced = useInteractionReducedMotion();
  const [open, setOpen] = React.useState(false);
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const px = PX[size];
  const overlap = Math.round(px * 0.22);
  const gap = open && !reduced ? 4 : -overlap;

  return (
    <div
      role="group"
      aria-label={`${people.length} people`}
      className={`flex items-center ${className}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      {shown.map((p, i) => (
        <span
          key={p.name + i}
          // A block-level wrapper the size of the face, so the cut-out ring is a true circle
          // and every face (and the +N) sits on the same line.
          className="relative flex shrink-0 rounded-full shadow-[0_0_0_2px_var(--background)]"
          style={{ marginLeft: i ? gap : 0, zIndex: shown.length - i, transition: reduced ? "none" : `margin-left 380ms ${EASE_OUT} ${i * 20}ms` }}
        >
          <Avatar name={p.name} src={p.src} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="relative flex shrink-0 items-center justify-center rounded-full bg-muted font-medium tabular-nums text-muted-foreground shadow-[inset_0_0_0_1px_var(--border),0_0_0_2px_var(--background)]"
          style={{ width: px, height: px, fontSize: Math.round(px * 0.34), marginLeft: gap, transition: reduced ? "none" : `margin-left 380ms ${EASE_OUT} ${shown.length * 20}ms` }}
          aria-label={`and ${rest} more`}
        >
          +<NumberRoll value={rest} />
        </span>
      )}
    </div>
  );
}

export default Avatar;
