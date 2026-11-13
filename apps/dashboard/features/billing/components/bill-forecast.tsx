import { useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"

import { Tile } from "@/components/shared/tile"

import { projectBill } from "../forecast"
import type { CurrentBill, PastBill } from "../schemas"

/**
 * The cycle's bill at the pace so far (the pitch's forecast): amount and kWh at the end, the tier it ends in,
 * against last month, and when the next, dearer tier starts.
 */
export function BillForecast({
  bill,
  now,
  lastMonth,
  className,
}: {
  bill: CurrentBill
  now: number
  lastMonth?: PastBill
  className?: string
}) {
  const t = useTranslations("billing.forecast")
  const locale = useLocale()
  const p = projectBill(bill, now)
  const vnd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  })
  const kwh = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const pct = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  })
  const change = lastMonth ? p.amount / lastMonth.amount - 1 : null
  const date = (ms: number) =>
    new Date(ms).toLocaleDateString(locale, {
      day: "numeric",
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    })
  const stats = [
    { label: t("amount"), value: vnd.format(p.amount) },
    { label: t("kwh"), value: `${kwh.format(p.kwh)} kWh` },
    { label: t("tier"), value: t("tierValue", { tier: p.tier }) },
  ]
  return (
    <Tile
      title={t("title")}
      description={t("description", {
        end: date(Date.parse(`${bill.period_end}T12:00:00+07:00`)),
      })}
      className={className}
    >
      <dl className="flex flex-wrap gap-x-8 gap-y-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse gap-1">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="text-2xl font-medium tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {change !== null ? (
        <p className="text-sm text-muted-foreground">
          {t(change > 0 ? "higher" : "lower", {
            pct: pct.format(Math.abs(change)),
            amount: vnd.format(lastMonth!.amount),
          })}
        </p>
      ) : null}
      {p.next ? (
        <Alert
          tone="warning"
          title={t("nextTitle", {
            tier: p.next.tier.tier_no,
            date: date(p.next.at),
          })}
        >
          {t("nextBody", {
            price: vnd.format(p.next.tier.price_per_kwh),
            kwh: kwh.format(p.next.tier.from_kwh),
          })}
        </Alert>
      ) : null}
    </Tile>
  )
}
