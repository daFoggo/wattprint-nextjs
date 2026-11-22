import { useTranslations } from "next-intl"

import { EmptyState } from "@workspace/ui/components/hairline/empty-state"

/** In place of a page's tiles while the account belongs to no home: they would describe a home it does not have. */
export function NoHome() {
  const t = useTranslations("layout.overview")
  return (
    <section className="rounded-3xl bg-card p-6 lg:col-span-12">
      <EmptyState
        scene="inbox"
        title={t("noHomeTitle")}
        description={t("noHomeDescription")}
      />
    </section>
  )
}
