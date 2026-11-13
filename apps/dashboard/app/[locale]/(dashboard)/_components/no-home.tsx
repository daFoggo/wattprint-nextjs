import { useTranslations } from "next-intl"

/** In place of a page's tiles while the account belongs to no home: they would describe a home it does not have. */
export function NoHome() {
  const t = useTranslations("layout.overview")
  return (
    <section className="flex flex-col gap-2 rounded-3xl bg-card p-6 lg:col-span-12">
      <h2 className="text-base font-medium">{t("noHomeTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("noHomeDescription")}</p>
    </section>
  )
}
