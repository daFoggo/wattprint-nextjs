import { useTranslations } from "next-intl"

type Row = { value: string; label: string; source: string }

/** The pitch's impact slide as a ledger: one estimate per row, its source under it, and a note that they are estimates. */
export function ImpactLedger() {
  const t = useTranslations("landing.impact")
  const rows = t.raw("rows") as Row[]
  return (
    <section
      aria-labelledby="impact-title"
      className="max-w-lp px-lp-gutter mx-auto flex w-full flex-col gap-10"
    >
      <h2
        id="impact-title"
        className="text-lp-head text-lp-ink max-w-3xl font-medium text-balance"
      >
        {t("title")}
      </h2>
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.source}
            className="border-lp-line grid grid-cols-1 gap-2 border-t py-6 lg:grid-cols-12 lg:gap-8"
          >
            <dt className="text-lp-lead text-lp-ink font-medium tabular-nums lg:col-span-5">
              {row.value}
            </dt>
            <dd className="flex flex-col gap-1 lg:col-span-7">
              <span className="text-lp-body text-lp-ink">{row.label}</span>
              <span className="text-lp-small text-lp-muted">{row.source}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-lp-small text-lp-muted max-w-3xl">{t("note")}</p>
    </section>
  )
}
