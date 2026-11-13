import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { IconArrowRight } from "@tabler/icons-react"

import { linkButton } from "@workspace/ui-patterns/link-button"

import { DASHBOARD_PATH } from "@/config/routes"

/**
 * Rendered by `forbidden()` (403), e.g. from `requirePermission` in lib/dal.ts. It renders inside
 * the layouts of the route that threw, so it carries no page frame.
 */
export default function Forbidden() {
  const t = useTranslations("common.forbidden")
  return (
    <div className="flex flex-col items-start gap-5">
      <span className="text-xs font-medium tracking-widest text-foreground uppercase">
        {t("eyebrow")}
      </span>
      <h1 className="text-5xl leading-tight font-normal tracking-tighter max-sm:text-4xl">
        {t("title")}
      </h1>
      <p className="max-w-2xl text-muted-foreground">
        {t("description")}
      </p>
      <Link
        href={DASHBOARD_PATH}
        className={linkButton({ className: "group" })}
      >
        {t("back")}
        <IconArrowRight
          aria-hidden
          className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:translate-x-1"
        />
      </Link>
    </div>
  )
}
