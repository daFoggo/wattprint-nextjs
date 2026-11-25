import { useLocale, useTranslations } from "next-intl"

import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { ThemeToggle } from "@workspace/ui-patterns/theme-toggle"

import { dashboardHref } from "@/config/site"
import { getPathname } from "@/i18n/navigation"
import { sectionHref } from "@/lib/seo"

import { CardNav } from "./card-nav"
import { EnergyButton } from "./landing/energy-button"
import { LocaleSwitch } from "./locale-switch"

/** The landing's bar (React Bits CardNav): Menu, the logo, the demo. Shared by the landing and the legal pages. */
export function SiteHeader() {
  const t = useTranslations("landing")
  const locale = useLocale()
  const demo = dashboardHref("/sign-in", locale)
  // "/#how" and "/en#how", the same form as the footer: next-intl's Link puts a slash before the hash on /en.
  const home = getPathname({ href: "/", locale })
  const section = (id: string) => sectionHref(home, id)
  return (
    <header className="px-lp-gutter sticky top-0 z-30 pt-3">
      <CardNav
        label={t("nav.label")}
        logoLabel={t("nav.home")}
        logo={<AppLogo />}
        words={{ open: t("nav.menu"), close: t("nav.close") }}
        items={[
          {
            label: t("nav.product"),
            description: t("nav.productText"),
            links: [
              { label: t("nav.how"), href: section("how"), external: true },
              { label: t("nav.wappi"), href: section("wappi"), external: true },
              { label: t("nav.faq"), href: section("faq"), external: true },
            ],
          },
          {
            label: t("nav.demoTitle"),
            description: t("nav.demoText"),
            tinted: true,
            links: [{ label: t("nav.demo"), href: demo, external: true }],
          },
          {
            label: t("footer.legal"),
            description: t("nav.legalText"),
            links: [
              { label: t("footer.terms"), href: "/terms" },
              { label: t("footer.privacy"), href: "/privacy" },
            ],
          },
        ]}
        tools={
          <>
            <LocaleSwitch size="md" />
            <ThemeToggle />
          </>
        }
        cta={
          <EnergyButton href={demo} size="md">
            {t("nav.demo")}
          </EnergyButton>
        }
      />
    </header>
  )
}
