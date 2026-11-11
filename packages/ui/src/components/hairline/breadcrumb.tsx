"use client";

import * as React from "react";
import { EASE_OUT, INTERACTION_FOCUS, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * BREADCRUMB: where you are, and the way back
 *
 *   long     past `max` crumbs (or on a narrow screen) the middle
 *            folds into "…"; pressing it opens them in place, each
 *            crumb's width easing open with a short stagger
 *   current  the last crumb is the page you're on: not a link,
 *            aria-current="page"
 * ───────────────────────────────────────────────────────── */

export interface Crumb {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: Crumb[];
  /** Crumbs shown before the middle folds; the first and the last two stay. */
  max?: number;
  className?: string;
}

function Slash() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/60">
      <path d="M10 3.5 6 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Breadcrumb({ items, max = 4, className = "" }: BreadcrumbProps) {
  const reduced = useInteractionReducedMotion();
  const [expanded, setExpanded] = React.useState(false);
  const fold = items.length > max && !expanded;
  // Folded crumbs: everything between the first and the last two.
  const hiddenFrom = 1;
  const hiddenTo = items.length - 2;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-y-1 text-[13px]">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          const folds = items.length > max && i >= hiddenFrom && i < hiddenTo;
          const crumbClass = `inline-flex items-center gap-1.5 whitespace-nowrap rounded-md [&_svg]:size-3.5 ${INTERACTION_FOCUS}`;
          const body = (
            <>
              {item.icon}
              {item.label}
            </>
          );
          const node = last ? (
            <span aria-current="page" className={`${crumbClass} font-medium text-foreground`}>
              {body}
            </span>
          ) : item.href ? (
            <a href={item.href} onClick={item.onClick} className={`${crumbClass} text-muted-foreground transition-colors duration-200 hover:text-foreground`}>
              {body}
            </a>
          ) : (
            <button type="button" onClick={item.onClick} className={`${crumbClass} text-muted-foreground cursor-pointer transition-colors duration-200 hover:text-foreground`}>
              {body}
            </button>
          );
          return (
            <React.Fragment key={`${item.label}-${i}`}>
              {folds && i === hiddenFrom && (
                <li
                  className="grid"
                  style={{ gridTemplateColumns: fold ? "1fr" : "0fr", opacity: fold ? 1 : 0, transition: reduced ? "none" : `grid-template-columns 320ms ${EASE_OUT}, opacity 160ms ${EASE_OUT}` }}
                  aria-hidden={!fold || undefined}
                >
                  <span className="flex min-w-0 items-center overflow-hidden">
                    <button
                      type="button"
                      tabIndex={fold ? 0 : -1}
                      aria-label={`Show ${hiddenTo - hiddenFrom} more`}
                      onClick={() => setExpanded(true)}
                      className={`mx-0.5 inline-flex h-6 items-center rounded-full px-1.5 text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground ${INTERACTION_FOCUS}`}
                    >
                      …
                    </button>
                    <Slash />
                  </span>
                </li>
              )}
              <li
                className={folds ? "grid" : "flex items-center"}
                aria-hidden={(folds && fold) || undefined}
                style={
                  folds
                    ? {
                        gridTemplateColumns: fold ? "0fr" : "1fr",
                        opacity: fold ? 0 : 1,
                        transition: reduced ? "none" : `grid-template-columns 380ms ${EASE_OUT} ${(i - hiddenFrom) * 40}ms, opacity 260ms ${EASE_OUT} ${(i - hiddenFrom) * 40 + 80}ms`,
                      }
                    : undefined
                }
              >
                <span className={`flex min-w-0 items-center ${folds ? "overflow-hidden" : ""}`} inert={(folds && fold) || undefined}>
                  {node}
                  {!last && <Slash />}
                </span>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
