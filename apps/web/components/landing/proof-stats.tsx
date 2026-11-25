import { useTranslations } from "next-intl"

type Item = { value: string; label: string; source: string }

/** Three published findings, each with its source. Plain figures: they are ranges and decimals in the page's language. */
export function ProofStats() {
  const t = useTranslations("landing.stats")
  const items = t.raw("items") as Item[]
  return (
    <section
      aria-labelledby="stats-title"
      className="max-w-lp px-lp-gutter mx-auto flex w-full flex-col gap-10"
    >
      <h2
        id="stats-title"
        className="text-lp-head text-lp-ink font-medium text-balance"
      >
        {t("title")}
      </h2>
      <dl className="border-lp-line grid grid-cols-1 border-t md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.source}
            className="border-lp-line flex flex-col gap-3 py-8 not-first:max-md:border-t md:px-8 md:not-first:border-l md:first:pl-0"
          >
            <dd className="lp-reveal text-lp-display text-lp-ink font-medium tabular-nums">
              {item.value}
            </dd>
            <dt className="flex flex-col gap-1">
              <span className="text-lp-body text-lp-ink">{item.label}</span>
              <span className="text-lp-small text-lp-muted">{item.source}</span>
            </dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
