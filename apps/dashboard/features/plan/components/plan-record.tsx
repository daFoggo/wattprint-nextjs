"use client"

import { useLocale, useTranslations } from "next-intl"

import { BalanceMeter } from "@workspace/ui/components/hairline/balance-meter"
import { ComboChart } from "@workspace/ui/components/hairline/combo-chart"
import { EmptyState } from "@workspace/ui/components/hairline/empty-state"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { Progress } from "@workspace/ui/components/hairline/progress"

import { DeviceIcon } from "@/components/shared/device-icon"
import { Tile } from "@/components/shared/tile"

import { billFor, outcomeOf } from "../math"
import type { PlanHistoryItem } from "../schemas"
import { at, formats, type CommitKey, type PlanData } from "./plan-data"

const DAY = 86_400_000

/**
 * One past plan on its own page: the result against the frozen expectation and the goal it had (row 1), what was
 * picked (row 2), each day's use (row 3). Priced at the cycle's forecast, on today's tariff.
 */
export function PlanRecord({
  plan: p,
  tiers,
  vat,
  deviceTypes,
}: {
  plan: PlanHistoryItem
  tiers: PlanData["tiers"]
  vat: number
  deviceTypes: Record<string, string>
}) {
  const t = useTranslations("plan")
  const locale = useLocale()
  const f = formats(locale)
  const o = outcomeOf(p)
  const price = (kwh: number) =>
    billFor(p.forecast_kwh, tiers, vat) -
    billFor(p.forecast_kwh - kwh, tiers, vat)
  const targetKwh = p.actions.reduce((s, a) => s + a.kwh, 0)
  const target = price(targetKwh)
  const worth = Math.abs(price(o.saved))
  const saved = o.saved > 0 ? worth : 0
  const total =
    Math.round((Date.parse(p.end_on) - Date.parse(p.start_on)) / DAY) + 1
  const expected = p.days.reduce((s, d) => s + d.expected, 0)
  const actual = p.days.reduce((s, d) => s + d.actual, 0)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {p.days.length ? (
        <BalanceMeter
          title={t(`history.result.${o.verdict}`, {
            kwh: f.kwh.format(Math.abs(o.saved)),
            amount: f.vnd.format(worth),
          })}
          unit="kWh"
          inflow={{ label: t("progress.expected"), value: expected }}
          outflow={{ label: t("progress.actual"), value: actual }}
          range={Math.max((o.band ?? 0) * 1.25, Math.abs(o.saved) * 1.25, 1)}
          format={{ maximumFractionDigits: 1 }}
          locales={locale}
          className="lg:col-span-8"
        />
      ) : (
        <Tile title={t("progress.heroTitle")} className="lg:col-span-8">
          <EmptyState
            scene="chart"
            title={t("progress.firstDayTitle")}
            description={t("history.noDays")}
          />
        </Tile>
      )}

      <Tile title={t("history.goalTitle")} className="lg:col-span-4">
        <div className="flex flex-1 flex-col justify-between gap-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <NumberRoll
                value={target}
                format={{
                  style: "currency",
                  currency: "VND",
                  maximumFractionDigits: 0,
                }}
                locales={locale}
                className="text-4xl font-medium tracking-tight tabular-nums"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("progress.goalKwh", { kwh: f.kwh.format(targetKwh) })}
              </span>
            </div>
            <Progress
              variant="ring"
              size={64}
              value={target > 0 ? Math.min((saved / target) * 100, 100) : 0}
              label={t("progress.reachedLabel")}
            />
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm tabular-nums">
              {saved > 0
                ? t("progress.reached", { amount: f.vnd.format(saved) })
                : t("history.notSaved")}
            </span>
            <Progress
              value={(p.days.length / total) * 100}
              label={t("history.measured", { days: p.days.length, total })}
              showValue={false}
            />
            <span className="text-xs text-muted-foreground">
              {o.whole
                ? t("history.whole")
                : t("history.stoppedAfter", { n: o.ranDays })}
            </span>
          </div>
        </div>
      </Tile>

      {/* Full width, side by side: a short list never stands beside the taller chart. */}
      <Tile title={t("history.actions")} className="lg:col-span-12">
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {p.actions.map((a) => (
            <li
              key={`${a.device_id ?? ""}.${a.key}`}
              className="flex items-start gap-3"
            >
              <DeviceIcon
                type={
                  a.device_id === null
                    ? "always_on"
                    : (deviceTypes[a.device_id] ?? "other")
                }
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium">{a.label}</span>
                <span className="text-xs text-muted-foreground">
                  {t(`commit.${a.key as CommitKey}`)}
                </span>
                <span className="text-sm tabular-nums">
                  {f.vnd.format(a.amount)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Tile>

      {p.days.length ? (
        <ComboChart
          title={t("progress.daily")}
          unit="kWh"
          series={[t("progress.actual"), t("progress.expected")]}
          days={p.days.map((d) => ({
            key: d.date,
            label: f.date.format(at(d.date)),
            value: d.actual,
          }))}
          average={p.days.map((d) => d.expected)}
          format={{ maximumFractionDigits: 1 }}
          locales={locale}
          className="lg:col-span-12"
        />
      ) : null}
    </div>
  )
}
