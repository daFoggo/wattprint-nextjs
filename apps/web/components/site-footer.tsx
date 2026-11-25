import { useLocale, useTranslations } from "next-intl"

import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { RidgeFooter } from "@workspace/ui/components/hairline/ridge-footer"

import { dashboardHref } from "@/config/site"
import { getPathname } from "@/i18n/navigation"
import { sectionHref } from "@/lib/seo"

/**
 * Hairline's ridge footer (the user's pick): the name stands among dotted ridges in the brand green. Its links are
 * plain anchors, so every href is resolved here for the current language.
 */
export function SiteFooter() {
  const t = useTranslations("landing")
  const locale = useLocale()
  const page = (href: string) => getPathname({ href, locale })
  const section = (id: string) => sectionHref(page("/"), id)
  return (
    // A block, not a flex column: RidgeFooter sizes itself to its container. `.lp-footer` (app/landing.css) gives it the page's full width and the forest plate.
    <div className="lp-footer w-full pt-24">
      <RidgeFooter
        wordmark="WattPrint"
        logo={<AppLogo variant="mark" />}
        tagline={t("footer.tagline")}
        accent="var(--lp-accent)"
        columns={[
          {
            title: t("footer.product"),
            links: [
              { label: t("nav.how"), href: section("how") },
              { label: t("nav.wappi"), href: section("wappi") },
              { label: t("nav.faq"), href: section("faq") },
            ],
          },
          {
            title: t("footer.project"),
            links: [
              { label: t("nav.demo"), href: dashboardHref("/sign-in", locale) },
              {
                label: t("footer.signIn"),
                href: dashboardHref("/sign-in", locale),
              },
            ],
          },
          {
            title: t("footer.legal"),
            links: [
              { label: t("footer.terms"), href: page("/terms") },
              { label: t("footer.privacy"), href: page("/privacy") },
            ],
          },
        ]}
        legal={t("footer.copyright")}
        legalLinks={[
          { label: t("footer.terms"), href: page("/terms") },
          { label: t("footer.privacy"), href: page("/privacy") },
        ]}
      />
    </div>
  )
}
