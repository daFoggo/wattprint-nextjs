import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { UsageMeter } from "@workspace/ui/components/hairline/usage-meter"
import { cn } from "@workspace/ui/lib/utils"

import type { CurrentBill } from "../schemas"

const VND = { style: "currency", currency: "VND" } as const
const KWH = { maximumFractionDigits: 1 } as const
const DAY = 86_400_000

// Backend dates are local calendar days: read and print them in UTC so no timezone shifts them.
const noon = (date: string) => Date.parse(`${date}T12:00:00Z`)
const dayLabel = (ms: number, locale: string) =>
  new Date(ms).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })

/**
 * The running billing cycle: what it costs so far (VAT included) and today, the tier the next kWh
 * is priced in with how far it is to the next one, and every tier's kWh and amount.
 */
export function BillCard({
  bill,
  className,
}: {
  bill: CurrentBill
  className?: string
}) {
  const t = useTranslations("billing")
  const locale = useLocale()
  const vnd = new Intl.NumberFormat(locale, VND)
  const kwh1 = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const tier = bill.tiers.find((x) => x.tier_no === bill.tier_no)
  const vatPct = Math.round(bill.vat_rate * 100)
  return (
    <section
      className={cn("flex flex-col gap-5 rounded-3xl bg-card p-6", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("billCard.period", {
              start: dayLabel(noon(bill.period_start), locale),
              end: dayLabel(noon(bill.period_end), locale),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {bill.status === "partial" && (
            <Badge tone="warning" size="sm">
              {t("billCard.partial")}
            </Badge>
          )}
          {bill.tariff_straddle && (
            // The backend prices the whole cycle at the tariff valid on its first day.
            <Badge tone="warning" size="sm">
              {t("billCard.straddle")}
            </Badge>
          )}
        </div>
      </header>

      <dl className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col-reverse">
          <dt className="text-sm text-muted-foreground">
            {t.rich("billCard.soFar", {
              vat: vatPct,
              kwh: () => (
                <NumberRoll
                  value={bill.kwh}
                  format={KWH}
                  suffix=" kWh"
                  locales={locale}
                />
              ),
            })}
          </dt>
          <dd className="text-3xl font-medium tabular-nums">
            <NumberRoll
              value={bill.amount_total}
              format={VND}
              locales={locale}
            />
          </dd>
        </div>
        <div className="flex flex-col-reverse">
          <dt className="text-sm text-muted-foreground">
            {t.rich("billCard.today", {
              kwh: () => (
                <NumberRoll
                  value={bill.today_kwh}
                  format={KWH}
                  suffix=" kWh"
                  locales={locale}
                />
              ),
            })}
          </dt>
          <dd className="text-lg font-medium tabular-nums">
            <NumberRoll
              value={bill.today_amount}
              format={VND}
              locales={locale}
            />
          </dd>
        </div>
      </dl>

      {tier && tier.to_kwh !== null ? (
        <UsageMeter
          label={t("billCard.meter", {
            tier: tier.tier_no,
            price: vnd.format(tier.price_per_kwh),
          })}
          used={Math.round((bill.kwh - tier.from_kwh) * 10) / 10}
          limit={tier.to_kwh - tier.from_kwh}
          unit="kWh"
          resetAt={noon(bill.period_end) + DAY}
          locales={locale}
        />
      ) : tier ? (
        <p className="text-sm text-muted-foreground">
          {t("billCard.topTier", { price: vnd.format(tier.price_per_kwh) })}
        </p>
      ) : null}

      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">{t("billCard.caption")}</caption>
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 text-left font-normal">
              {t("billCard.colTier")}
            </th>
            <th className="pb-2 text-left font-normal">kWh</th>
            <th className="pb-2 text-right font-normal">
              {t("billCard.colPrice")}
            </th>
            <th className="pb-2 text-right font-normal">
              {t("billCard.colUsed")}
            </th>
            <th className="pb-2 text-right font-normal">
              {t("billCard.colAmount")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bill.tiers.map((x) => (
            <tr
              key={x.tier_no}
              aria-current={x.tier_no === bill.tier_no || undefined}
              className={cn(
                "h-9",
                x.kwh === 0 &&
                  x.tier_no !== bill.tier_no &&
                  "text-muted-foreground"
              )}
            >
              <td>
                <span className="inline-flex items-center gap-1.5">
                  {x.tier_no}
                  {x.tier_no === bill.tier_no && (
                    <Badge tone="primary" size="sm">
                      {t("now")}
                    </Badge>
                  )}
                </span>
              </td>
              <td>
                {x.to_kwh === null
                  ? `${x.from_kwh}+`
                  : `${x.from_kwh}–${x.to_kwh}`}
              </td>
              <td className="text-right">{vnd.format(x.price_per_kwh)}</td>
              <td className="text-right">{kwh1.format(x.kwh)}</td>
              <td className="text-right">{vnd.format(x.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="pt-3">
              {t("vat", { vat: vatPct })}
            </td>
            <td className="pt-3 text-right">{vnd.format(bill.vat_amount)}</td>
          </tr>
          <tr className="font-medium">
            <td colSpan={4}>{t("billCard.total")}</td>
            <td className="text-right">{vnd.format(bill.amount_total)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}
