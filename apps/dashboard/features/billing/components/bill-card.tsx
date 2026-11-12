import { Badge } from "@workspace/ui/components/hairline/badge"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { UsageMeter } from "@workspace/ui/components/hairline/usage-meter"
import { cn } from "@workspace/ui/lib/utils"

import type { CurrentBill } from "../schemas"

const VND = { style: "currency", currency: "VND" } as const
const KWH = { maximumFractionDigits: 1 } as const
const vnd = new Intl.NumberFormat("en-US", VND)
const DAY = 86_400_000

// Backend dates are local calendar days: read and print them in UTC so no timezone shifts them.
const noon = (date: string) => Date.parse(`${date}T12:00:00Z`)
const dayLabel = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", {
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
  const tier = bill.tiers.find((t) => t.tier_no === bill.tier_no)
  const vatPct = Math.round(bill.vat_rate * 100)
  return (
    <section
      className={cn("flex flex-col gap-5 rounded-3xl bg-card p-6", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium">This bill</h2>
          <p className="text-sm text-muted-foreground">
            {dayLabel(noon(bill.period_start))} –{" "}
            {dayLabel(noon(bill.period_end))} · tiered residential tariff
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {bill.status === "partial" && (
            <Badge tone="warning" size="sm">
              Partial data
            </Badge>
          )}
          {bill.tariff_straddle && (
            // The backend prices the whole cycle at the tariff valid on its first day.
            <Badge tone="warning" size="sm">
              Prices change this cycle
            </Badge>
          )}
        </div>
      </header>

      <dl className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col-reverse">
          <dt className="text-sm text-muted-foreground">
            So far, incl. {vatPct}% VAT ·{" "}
            <NumberRoll
              value={bill.kwh}
              format={KWH}
              suffix=" kWh"
              locales="en-US"
            />
          </dt>
          <dd className="text-3xl font-medium tabular-nums">
            <NumberRoll
              value={bill.amount_total}
              format={VND}
              locales="en-US"
            />
          </dd>
        </div>
        <div className="flex flex-col-reverse">
          <dt className="text-sm text-muted-foreground">
            Today ·{" "}
            <NumberRoll
              value={bill.today_kwh}
              format={KWH}
              suffix=" kWh"
              locales="en-US"
            />
          </dt>
          <dd className="text-lg font-medium tabular-nums">
            <NumberRoll
              value={bill.today_amount}
              format={VND}
              locales="en-US"
            />
          </dd>
        </div>
      </dl>

      {tier && tier.to_kwh !== null ? (
        <UsageMeter
          label={`Tier ${tier.tier_no} · ${vnd.format(tier.price_per_kwh)}/kWh`}
          used={Math.round((bill.kwh - tier.from_kwh) * 10) / 10}
          limit={tier.to_kwh - tier.from_kwh}
          unit="kWh"
          resetAt={noon(bill.period_end) + DAY}
        />
      ) : tier ? (
        <p className="text-sm text-muted-foreground">
          Top tier: every further kWh costs {vnd.format(tier.price_per_kwh)}{" "}
          before VAT.
        </p>
      ) : null}

      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">
          Energy and amount in each tariff tier this cycle, before VAT
        </caption>
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 text-left font-normal">Tier</th>
            <th className="pb-2 text-left font-normal">kWh</th>
            <th className="pb-2 text-right font-normal">Price</th>
            <th className="pb-2 text-right font-normal">Used</th>
            <th className="pb-2 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bill.tiers.map((t) => (
            <tr
              key={t.tier_no}
              aria-current={t.tier_no === bill.tier_no || undefined}
              className={cn(
                "h-9",
                t.kwh === 0 &&
                  t.tier_no !== bill.tier_no &&
                  "text-muted-foreground"
              )}
            >
              <td>
                <span className="inline-flex items-center gap-1.5">
                  {t.tier_no}
                  {t.tier_no === bill.tier_no && (
                    <Badge tone="primary" size="sm">
                      Now
                    </Badge>
                  )}
                </span>
              </td>
              <td>
                {t.to_kwh === null
                  ? `${t.from_kwh}+`
                  : `${t.from_kwh}–${t.to_kwh}`}
              </td>
              <td className="text-right">{vnd.format(t.price_per_kwh)}</td>
              <td className="text-right">{t.kwh.toFixed(1)}</td>
              <td className="text-right">{vnd.format(t.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="pt-3">
              VAT {vatPct}%
            </td>
            <td className="pt-3 text-right">{vnd.format(bill.vat_amount)}</td>
          </tr>
          <tr className="font-medium">
            <td colSpan={4}>Total</td>
            <td className="text-right">{vnd.format(bill.amount_total)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}
