"use client"

import { useLocale, useTranslations } from "next-intl"

import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { getPathname, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

// Each language is named in itself, so it reads right whatever language the page is in.
const NAMES = { vi: "Tiếng Việt", en: "English" } as const

/**
 * VI | EN: the same page in the other language (`/en/...` or no prefix). A full page load, not a client
 * navigation: `[locale]` is the root layout, whose client re-render trips on next-themes' inline script,
 * and the reload also drops client caches holding the old language.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations("common")
  const locale = useLocale()
  const pathname = usePathname()
  return (
    <SegmentedControl
      label={t("language")}
      size="sm"
      className={className}
      value={locale}
      onValueChange={(next) =>
        window.location.assign(
          getPathname({ href: pathname, locale: next as typeof locale }) +
            window.location.search
        )
      }
      options={routing.locales.map((value) => ({
        value,
        label: value.toUpperCase(),
        ariaLabel: NAMES[value],
      }))}
    />
  )
}
