import { useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"

import { ModelBadge } from "@/components/shared/model-badge"
import { Tile } from "@/components/shared/tile"

import { cyclePassed, forecastConfidence } from "../forecast"

import type { CurrentBill, Forecast, PastBill } from "../schemas"

/**
 * The cycle's bill at its end if the home keeps its weekday pattern (the pitch's forecast): amount and kWh at the end, the tier it ends in,
 * against last month, and when the next, dearer tier starts.
 */
export function BillForecast({
  bill,
  forecast: p,
  lastMonth,
  className,
}: {
  bill: CurrentBill
  /** Null before the home has a week of full days. */
  forecast: Forecast | null
  lastMonth?: PastBill
  className?: string
}) {
  const t = useTranslations("billing.forecast")
  const locale = useLocale()
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
  if (!p)
    return (
      <Tile title={t("title")} className={className}>
        <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
      </Tile>
    )
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
      action={<ModelBadge kind="forecast" confidence={forecastConfidence(p)} />}
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
      <p className="text-xs text-muted-foreground">
        {t("why", {
          days: p.basis_days,
          pct: pct.format(cyclePassed(p)),
        })}
      </p>
    </Tile>
  )
}
