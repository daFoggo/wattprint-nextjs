import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"

import { linkButton } from "@workspace/ui-patterns/link-button"

export default function NotFound() {
  const t = useTranslations("landing.notFound")
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="text-5xl leading-tight font-normal tracking-tighter">
        {t("title")}
      </h1>
      <p className="text-muted-foreground">
        {t("description")}
      </p>
      <Link href="/" className={linkButton()}>
        {t("backHome")}
      </Link>
    </main>
  )
}
