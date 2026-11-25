import type { Metadata } from "next"

import type { Locale } from "@/i18n/routing"

/** A page's path in one language: Vietnamese has no prefix, English lives under /en. */
export const localized = (path: string, locale: Locale) =>
  locale === "en" ? `/en${path === "/" ? "" : path}` : path

/**
 * Canonical plus hreflang for one page (`path` is the Vietnamese path, "/" for home): the page in this language, its
 * twin, and x-default on the Vietnamese one. Relative; the layout's metadataBase makes them absolute.
 */
export function alternatesFor(
  path: string,
  locale: Locale
): Metadata["alternates"] {
  return {
    canonical: localized(path, locale),
    languages: { vi: path, en: localized(path, "en"), "x-default": path },
  }
}

/** The pages' last real edit, for the sitemap: a date that moves on every request teaches crawlers to ignore it. */
export const LAST_EDITED = { home: "2026-11-25", legal: "2026-11-25" } as const

/**
 * A section anchor on the home page from any page: `home` is the localized home path ("/" or "/en"), kept whole so
 * "/#how" still leaves /terms for the home page.
 */
export const sectionHref = (home: string, id: string) => `${home}#${id}`

/** JSON for a `<script type="application/ld+json">`: `<` is escaped, so no string in it can close the tag. */
export const jsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c")

/** Open Graph shared by every page; a page adds its own title, description and url. */
export function openGraphBase(locale: Locale, imageAlt: string) {
  return {
    siteName: "WattPrint",
    type: "website" as const,
    locale: locale === "en" ? "en_US" : "vi_VN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: imageAlt }],
  }
}
