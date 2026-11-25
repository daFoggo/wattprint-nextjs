"use client";

import * as React from "react";
import { useHairlineText } from "../hairline-text"; // patched (hairline/patch.mjs)
import { INTERACTION_FOCUS, INTERACTION_PRESS } from "./ui-interaction-motion";

/*
 * The text of an art-led footer: brand lockup, link columns and small print.
 * It sits inside the picture, so it carries no panels, rules or labels of its own:
 * the plate sets the colours (--fp-fg, --fp-muted, --fp-accent) and the art does the rest.
 */

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const mixColor = (color: string, amount: number, into = "transparent") => `color-mix(in oklab, ${color} ${amount}%, ${into})`;

/**
 * Plate colours. "auto" follows the theme (card in light, card in dark); "night" holds
 * a near-black plate tinted by the accent on any page, for art that only reads at night.
 */
export function plateColors(night: boolean, accent: string): React.CSSProperties {
  return night
    ? {
        ["--fp-accent" as string]: accent,
        ["--fp-fg" as string]: mixColor("white", 94, accent),
        ["--fp-muted" as string]: mixColor("white", 60),
        backgroundColor: mixColor(accent, 7, mixColor("white", 5, "black")),
        color: "var(--fp-fg)",
        boxShadow: `0 0 0 1px ${mixColor("white", 9)}, inset 0 1px 0 ${mixColor("white", 9)}`,
      }
    : {
        ["--fp-accent" as string]: accent,
        ["--fp-fg" as string]: "var(--card-foreground)",
        ["--fp-muted" as string]: "var(--muted-foreground)",
        backgroundColor: "var(--card)",
        color: "var(--fp-fg)",
        boxShadow: "0 0 0 1px var(--border)",
      };
}

export function FooterLockup({
  logo,
  name,
  tagline,
  contact,
  action,
}: {
  logo?: React.ReactNode;
  name: string;
  tagline?: string;
  contact?: FooterLink;
  action?: FooterLink;
}) {
  return (
    <div className="flex max-w-[36ch] flex-col items-start gap-3.5">
      <div className="flex items-center gap-2.5">
        {logo}
        <p className="text-[17px] font-semibold tracking-[-0.02em]">{name}</p>
      </div>
      {tagline && <p className="text-pretty text-[14px] leading-6 text-[color:var(--fp-muted)]">{tagline}</p>}
      {contact && (
        <a href={contact.href} className={`group/contact mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-[14px] font-medium ${INTERACTION_FOCUS}`}>
          <span className="underline decoration-[color:var(--fp-muted)] decoration-1 underline-offset-[5px] transition-colors group-hover/contact:decoration-[color:var(--fp-accent)]">
            {contact.label}
          </span>
          <span aria-hidden="true" className="transition-transform duration-200 group-hover/contact:translate-x-0.5">
            →
          </span>
        </a>
      )}
      {action && (
        <a
          href={action.href}
          className={`group/action mt-1.5 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13.5px] font-medium ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
          style={{
            backgroundColor: "var(--fp-accent)",
            // The label picks its side from the accent itself, so any brand colour stays legible.
            color: "oklch(from var(--fp-accent) clamp(0.16, (0.68 - l) * 100, 0.985) calc(c * 0.25) h)",
          }}
        >
          {action.label}
          <span aria-hidden="true" className="transition-transform duration-200 group-hover/action:translate-x-0.5">
            →
          </span>
        </a>
      )}
    </div>
  );
}

/**
 * Link columns. `onAim` reports the column the pointer or keyboard is in (null when it leaves),
 * so the picture can answer it.
 */
export function FooterNav({ columns, onAim }: { columns: FooterColumn[]; onAim?: (column: HTMLElement | null, index: number) => void }) {
  const t = useHairlineText(); // patched (hairline/patch.mjs)
  if (!columns.length) return null;
  return (
    <nav
      aria-label={t("Footer")}
      onPointerLeave={() => onAim?.(null, -1)}
      className="grid grid-cols-2 gap-x-[clamp(16px,4cqi,56px)] gap-y-7 @[440px]:grid-cols-[repeat(3,auto)]"
    >
      {columns.map((col, index) => (
        <div
          key={col.title}
          onPointerEnter={(e) => onAim?.(e.currentTarget, index)}
          onFocus={(e) => onAim?.(e.currentTarget, index)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onAim?.(null, -1);
          }}
          className="flex min-w-0 flex-col gap-2.5"
        >
          <p className="text-[12px] text-[color:var(--fp-muted)]">{col.title}</p>
          <ul className="flex flex-col gap-1.5">
            {col.links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className={`cursor-pointer rounded-sm text-[13.5px] transition-colors duration-150 hover:text-[color:var(--fp-accent)] @[480px]:text-[14px] ${INTERACTION_FOCUS}`}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** The small print, set as the picture's caption: no rule above it. */
export function FooterCaption({
  legal,
  links,
  note,
  className = "",
}: {
  legal?: string;
  links: FooterLink[];
  /** Anything that belongs beside the copyright, e.g. a local clock. */
  note?: React.ReactNode;
  className?: string;
}) {
  if (!legal && !links.length && !note) return null;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px] ${className}`}>
      {(legal || note) && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {legal && <span>{legal}</span>}
          {note}
        </p>
      )}
      {links.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} className={`cursor-pointer rounded-sm opacity-80 transition-opacity hover:opacity-100 ${INTERACTION_FOCUS}`}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A theme colour (any CSS colour, `var(...)` included) resolved to what the browser paints, for canvas and WebGL. */
export function resolveColor(host: HTMLElement, value: string): string {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;display:none";
  probe.style.color = value;
  host.appendChild(probe);
  const out = getComputedStyle(probe).color;
  probe.remove();
  return out;
}
