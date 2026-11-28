import { IconArrowRight, IconShieldLock } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { cn } from "@workspace/ui/lib/utils"

import { FOCUS, LINK_ARROW, LINK_DOT } from "@/components/shared/nav-links"
import { PRIVACY_PATH } from "@/config/routes"
import { Link } from "@/i18n/navigation"

/** The way into the privacy page from Settings: the whole card is the link. */
export function PrivacyEntry() {
  const t = useTranslations("privacy")
  return (
    <Link
      href={PRIVACY_PATH}
      className={cn(
        "group flex items-center gap-4 rounded-3xl border bg-background p-4 transition-colors duration-200 hover:bg-accent md:px-5",
        FOCUS
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <IconShieldLock aria-hidden className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{t("link")}</span>
        <span className="text-xs text-muted-foreground">{t("entry")}</span>
      </span>
      <span
        className={cn(LINK_DOT, "shrink-0 bg-primary text-primary-foreground")}
      >
        <IconArrowRight aria-hidden className={LINK_ARROW} />
      </span>
    </Link>
  )
}
