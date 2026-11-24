"use client"

import { IconPlayerStop } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"
import { useTransition } from "react"

import { Badge, type BadgeTone } from "@workspace/ui/components/hairline/badge"
import { BalanceMeter } from "@workspace/ui/components/hairline/balance-meter"
import { Button } from "@workspace/ui/components/hairline/button"
import { ComboChart } from "@workspace/ui/components/hairline/combo-chart"
import { HoldToConfirm } from "@workspace/ui/components/hairline/hold-to-confirm"
import { EmptyState } from "@workspace/ui/components/hairline/empty-state"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { Progress } from "@workspace/ui/components/hairline/progress"
import { Tabs } from "@workspace/ui/components/hairline/tabs"

import { DeviceIcon } from "@/components/shared/device-icon"
import { Tile } from "@/components/shared/tile"

import { stopPlanAction } from "../actions"
import {
  billFor,
  deviceVs,
  plannedDevices,
  verdict,
  weekOf,
} from "../math"
import type { Plan, PlanAction } from "../schemas"
import { at, formats, type CommitKey, type PlanData } from "./plan-data"

const TONE: Record<ReturnType<typeof verdict>, BadgeTone> = {
  early: "neutral",
  saving: "success",
  more: "warning",
}
const DAY = 86_400_000
/** The page's id for an action: `<deviceId>.<key>`, as the advice and the "Thêm vào kế hoạch" links use. */
const actionId = (a: PlanAction) => `${a.device_id ?? ""}.${a.key}`

/**
 * Step 3: the running plan against the frozen expectation. The whole home (weather-adjusted, ±2σ√n band) and each
 * planned device (against its baseline) are told apart, so savings one place and more use another both show.
 */
export function PlanProgress({
  data,
  plan,
  labels,
}: {
  data: PlanData
  plan: Plan
  /** Each action's text by id, from the page's advice; a device whose advice is gone falls back to its key. */
  labels: Record<string, string>
}) {
  const t = useTranslations("plan")
  const locale = useLocale()
  const f = formats(locale)

  const days = plan.days
  const cumulative = days.reduce((s, d) => s + d.expected - d.actual, 0)
  const outcome = verdict(cumulative, plan.sigma, days.length)
  const band =
    plan.sigma === null ? null : 2 * plan.sigma * Math.sqrt(days.length)
  // Priced at the cycle's forecast when the plan started, as its actions were: the top tiers it kept the bill out of.
  const worth = Math.abs(
    billFor(plan.forecast_kwh, data.tiers, data.vat) -
      billFor(plan.forecast_kwh - cumulative, data.tiers, data.vat)
  )
  const total =
    Math.round((Date.parse(plan.end_on) - Date.parse(plan.start_on)) / DAY) + 1
  const day = Math.min(
    Math.round((Date.parse(data.today) - Date.parse(plan.start_on)) / DAY) + 1,
    total
  )
  const ended = data.today > plan.end_on
  const noModel = plan.model_version === "none"
  // The backend froze the days before the refit; say why the model behind today differs.
  const refit = !noModel && data.model !== plan.model_version
  const [stopping, startStop] = useTransition()

  const expectedSum = days.reduce((s, d) => s + d.expected, 0)
  const actualSum = days.reduce((s, d) => s + d.actual, 0)
  const typeOf = (a: PlanAction) =>
    a.device_id === null
      ? "always_on"
      : (data.deviceTypes[a.device_id] ?? "other")
  const labelOf = (a: PlanAction) =>
    a.device_id === null
      ? t("opportunities.alwaysOn")
      : (labels[actionId(a)] ?? a.label)
  // The plan's worth as set: all its actions' kWh, priced together at the cycle's forecast.
  const targetKwh = plan.actions.reduce((sum, a) => sum + a.kwh, 0)
  const target =
    billFor(plan.forecast_kwh, data.tiers, data.vat) -
    billFor(plan.forecast_kwh - targetKwh, data.tiers, data.vat)
  // Banked so far, priced like the target; nothing counts toward the goal while the home uses more.
  const saved = cumulative > 0 ? worth : 0
  const reached = target > 0 ? Math.min((saved / target) * 100, 100) : 0
  const weekCount = Math.floor((total - 1) / 7) + 1
  const thisWeek = weekOf(plan.start_on, data.today)
  // The week the user is in (the last one once the cycle has ended).
  const shown = Math.min(thisWeek, weekCount - 1)
  const currentDays = days.filter(
    (d) => weekOf(plan.start_on, d.date) === shown
  )
  const current = {
    days: currentDays,
    saved: currentDays.reduce((sum, d) => sum + d.expected - d.actual, 0),
    band:
      plan.sigma === null
        ? null
        : 2 * plan.sigma * Math.sqrt(currentDays.length),
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* A slim status strip, not a card: running or ended, and the stop control. */}
      <section className="flex flex-wrap items-center justify-between gap-3 lg:col-span-12">
        <span className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-medium">
            {ended ? t("progress.endedTitle") : t("progress.runningTitle")}
          </h2>
          <Badge tone={TONE[outcome]} dot>
            {t(`progress.verdict.${outcome}`)}
          </Badge>
        </span>
        {ended ? (
          <Button
            onClick={() => startStop(() => stopPlanAction())}
            disabled={stopping}
          >
            {t("progress.again")}
          </Button>
        ) : (
          <HoldToConfirm
            onConfirm={() => stopPlanAction()}
            icon={<IconPlayerStop aria-hidden className="size-4" />}
            labels={{
              idle: t("progress.stopHold"),
              holding: t("progress.stopHolding"),
              pending: t("progress.stopping"),
              success: t("progress.stopped"),
              error: t("progress.stopRetry"),
            }}
          />
        )}
      </section>

      {/* The goal first (goal gradient): what the plan is worth, how much of it is in, and the time against it. */}
      <Tile title={t("progress.goalTitle")} className="lg:col-span-4">
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
              value={reached}
              label={t("progress.reachedLabel")}
            />
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm tabular-nums">
              {saved > 0
                ? t("progress.reached", { amount: f.vnd.format(saved) })
                : t("progress.notYet")}
            </span>
            <Progress
              value={(day / total) * 100}
              label={t("progress.day", { day, total })}
              doneLabel={t("progress.ended")}
              showValue={false}
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {ended
                ? t("progress.endedOn", {
                    date: f.date.format(at(plan.end_on)),
                  })
                : t("progress.daysLeft", { n: total - day })}
            </span>
          </div>
        </div>
      </Tile>

      {/* The proof: the frozen expectation against the meter, the needle on the side that is ahead. */}
      {days.length && !noModel ? (
        <BalanceMeter
          title={t(`progress.headline.${outcome}`, {
            kwh: f.kwh.format(Math.abs(cumulative)),
            amount: f.vnd.format(worth),
            band: f.kwh.format(band ?? 0),
          })}
          unit="kWh"
          inflow={{ label: t("progress.expected"), value: expectedSum }}
          outflow={{ label: t("progress.actual"), value: actualSum }}
          range={Math.max((band ?? 0) * 1.25, Math.abs(cumulative) * 1.25, 1)}
          format={{ maximumFractionDigits: 1 }}
          locales={locale}
          className="lg:col-span-8"
        />
      ) : (
        <Tile title={t("progress.heroTitle")} className="lg:col-span-8">
          <EmptyState
            scene="chart"
            title={t(
              noModel ? "progress.noModelTitle" : "progress.firstDayTitle"
            )}
            description={t(noModel ? "progress.noModel" : "progress.firstDay")}
          />
        </Tile>
      )}

      {/* This week, full width so its short list never sits beside a taller card: the result, then what to keep doing. */}
      <Tile
        title={ended ? t("progress.lastWeek") : t("progress.thisWeek")}
        description={
          days.length ? t("progress.basis", { days: days.length }) : undefined
        }
        className="lg:col-span-12"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-2 lg:col-span-4">
            {current.days.length && current.band !== null ? (
              <>
                <span className="text-sm tabular-nums">
                  {t("progress.weekHome", {
                    sign: current.saved > 0 ? "−" : "+",
                    kwh: f.kwh.format(Math.abs(current.saved)),
                  })}
                </span>
                <BandBar value={current.saved} band={current.band} />
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("progress.weekAhead")}
              </span>
            )}
          </div>
          <section className="flex flex-col gap-3 lg:col-span-8">
            <h3 className="text-sm font-medium">{t("progress.todo")}</h3>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {plan.actions.map((a) => (
                <li key={actionId(a)} className="flex items-start gap-3">
                  <DeviceIcon type={typeOf(a)} size="sm" />
                  <span className="text-sm text-muted-foreground">
                    {t(`commit.${a.key as CommitKey}`)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        {refit ? (
          <p className="text-xs text-muted-foreground">{t("progress.refit")}</p>
        ) : null}
      </Tile>

      {/* The detail a user opens on purpose: one view at a time, the actions first (what they do), then weeks and days. */}
      <Tabs
        label={t("progress.details")}
        className="lg:col-span-12"
        items={[
          {
            value: "actions",
            label: t("progress.tabActions"),
            content: (
              <Tile title={t("progress.actionsTitle")}>
                <ul className="flex flex-col divide-y divide-border">
                  {plan.actions.map((a) => (
                    <li
                      key={actionId(a)}
                      className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <DeviceIcon type={typeOf(a)} />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            {labelOf(a)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t(`commit.${a.key as CommitKey}`)}
                          </span>
                        </div>
                        <ActionResult action={a} plan={plan} data={data} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Tile>
            ),
          },
          {
            value: "weeks",
            label: t("progress.tabWeeks"),
            content: (
              <Tile title={t("progress.weeksTitle")}>
                <ul className="flex flex-col divide-y divide-border">
                  {Array.from({ length: weekCount }, (_, w) => {
                    const from = Date.parse(plan.start_on) + w * 7 * DAY
                    const to = Math.min(from + 6 * DAY, Date.parse(plan.end_on))
                    const week = days.filter(
                      (d) => weekOf(plan.start_on, d.date) === w
                    )
                    const saved = week.reduce(
                      (s, d) => s + d.expected - d.actual,
                      0
                    )
                    const v = verdict(saved, plan.sigma, week.length)
                    const weekBand =
                      plan.sigma === null
                        ? null
                        : 2 * plan.sigma * Math.sqrt(week.length)
                    return (
                      <li
                        key={w}
                        className="grid grid-cols-1 gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-12 lg:items-center"
                      >
                        <span className="flex items-center gap-2 text-sm lg:col-span-3">
                          {t("progress.week", {
                            n: w + 1,
                            from: f.date.format(from),
                            to: f.date.format(to),
                          })}
                          {w === thisWeek && !ended ? (
                            <Badge size="sm" tone="primary">
                              {t("progress.thisWeek")}
                            </Badge>
                          ) : null}
                        </span>
                        {week.length ? (
                          <>
                            <div className="flex flex-col gap-1.5 lg:col-span-5">
                              {weekBand !== null ? (
                                <BandBar
                                  value={saved}
                                  band={weekBand}
                                  compact
                                />
                              ) : null}
                              <span className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                                {t("progress.weekHome", {
                                  sign: saved > 0 ? "−" : "+",
                                  kwh: f.kwh.format(Math.abs(saved)),
                                })}
                                <Badge size="sm" tone={TONE[v]} outline>
                                  {t(`progress.verdict.${v}`)}
                                </Badge>
                              </span>
                            </div>
                            <WeekDevices
                              plan={plan}
                              data={data}
                              typeOf={typeOf}
                              from={localDay(from)}
                              to={localDay(
                                Math.min(to + DAY, Date.parse(data.today))
                              )}
                            />
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground lg:col-span-9">
                            {t("progress.weekAhead")}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Tile>
            ),
          },
          ...(days.length
            ? [
                {
                  value: "daily",
                  label: t("progress.tabDaily"),
                  content: (
                    // Bars the meter, line the frozen expectation; no `previous`, so no up-is-good chip on energy use.
                    <ComboChart
                      title={t("progress.daily")}
                      unit="kWh"
                      series={[t("progress.actual"), t("progress.expected")]}
                      days={days.map((d) => ({
                        key: d.date,
                        label: f.date.format(at(d.date)),
                        value: d.actual,
                      }))}
                      average={days.map((d) => d.expected)}
                      format={{ maximumFractionDigits: 1 }}
                      locales={locale}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  )
}

/** The change against before as a signed percent: "−45%", "+12%". */
function signedPct(now: number, before: number) {
  const pct = Math.round(((now - before) / (before || 1)) * 100)
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}%`
}

const localDay = (ms: number) =>
  new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10)

/**
 * The saving on a two-sided track: the shaded middle is the day-to-day swing (±2σ√n), a fill toward the right a
 * saving, toward the left more use. Inside the shade it is still noise, and the eye sees that before the words.
 */
export function BandBar({
  value,
  band,
  compact = false,
}: {
  value: number
  band: number
  compact?: boolean
}) {
  const t = useTranslations("plan.progress")
  const scale = Math.max(band, Math.abs(value)) * 1.25 || 1
  const half = (v: number) => `${Math.min(Math.abs(v) / scale, 1) * 50}%`
  const inside = Math.abs(value) <= band
  return (
    <div className="flex flex-col gap-1">
      <span
        aria-hidden
        className={`relative rounded-full bg-muted ${compact ? "h-1.5" : "h-2.5"}`}
      >
        <span
          className="absolute inset-y-0 bg-muted-foreground/15"
          style={{
            left: `calc(50% - ${half(band)})`,
            width: `calc(2 * ${half(band)})`,
          }}
        />
        <span
          className={`absolute inset-y-0 rounded-full ${inside ? "bg-muted-foreground/50" : value > 0 ? "bg-primary" : "bg-destructive"}`}
          style={
            value >= 0
              ? { left: "50%", width: half(value) }
              : { right: "50%", width: half(value) }
          }
        />
        <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
      </span>
      {compact ? null : (
        <span className="flex justify-between text-xs text-muted-foreground">
          <span>{t("bandMore")}</span>
          <span>{t("bandNoise")}</span>
          <span>{t("bandSaving")}</span>
        </span>
      )}
    </div>
  )
}

/** Two bars, now against before, on one scale; the lower one wins the accent when it is now. */
function PairBars({
  now,
  before,
  format,
  weather = false,
}: {
  now: number
  before: number
  format: (v: number) => string
  /** Against the device's own expectation for those days: "Thực tế" / "Dự kiến", not "Bây giờ" / "Trước đây". */
  weather?: boolean
}) {
  const t = useTranslations("plan.progress")
  const max = Math.max(now, before) || 1
  const rows = [
    { label: t(weather ? "actual" : "now"), value: now, accent: now < before },
    { label: t(weather ? "expected" : "before"), value: before, accent: false },
  ]
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0 text-muted-foreground">{r.label}</span>
          <span
            aria-hidden
            className="relative h-1.5 min-w-0 flex-1 rounded-full bg-muted"
          >
            <span
              className={`absolute inset-y-0 left-0 rounded-full ${r.accent ? "bg-primary" : "bg-muted-foreground/40"}`}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </span>
          <span className="shrink-0 text-right whitespace-nowrap tabular-nums">
            {format(r.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * A device's kWh a day since the start against its own expectation for those days (weather included) when its model
 * is trusted, else against its usual before the plan; or the background load against the start's.
 */
function ActionResult({
  action: a,
  plan,
  data,
}: {
  action: PlanAction
  plan: Plan
  data: PlanData
}) {
  const t = useTranslations("plan.progress")
  const f = formats(useLocale())
  if (a.device_id === null) {
    return data.alwaysOnW !== null && a.baseline !== null ? (
      <PairBars
        now={data.alwaysOnW}
        before={a.baseline}
        format={(v) => `${f.watts.format(v)} W`}
      />
    ) : (
      <span className="text-xs text-muted-foreground">{t("noDeviceDays")}</span>
    )
  }
  const vs = deviceVs(
    plan.days,
    a.device_id,
    data.deviceDays[a.device_id] ?? [],
    a.baseline,
    plan.start_on,
    data.today
  )
  if (vs === null)
    return (
      <span className="text-xs text-muted-foreground">{t("noDeviceDays")}</span>
    )
  return (
    <div className="flex flex-col gap-1.5">
      <PairBars
        now={vs.now}
        before={vs.before}
        weather={vs.weather}
        format={(v) => t("kwhDay", { kwh: f.kwhDay.format(v) })}
      />
      <span className="text-xs text-muted-foreground">
        {t(vs.weather ? "byWeather" : "notWeather")}
      </span>
    </div>
  )
}

/** Each planned device's mean that week against its expectation (`deviceVs`), as icon chips. */
function WeekDevices({
  plan,
  data,
  typeOf,
  from,
  to,
}: {
  plan: Plan
  data: PlanData
  typeOf: (a: PlanAction) => string
  from: string
  to: string
}) {
  const t = useTranslations("plan.progress")
  const f = formats(useLocale())
  const rows = plannedDevices(plan.actions).flatMap((a) => {
    if (a.device_id === null) return []
    const vs = deviceVs(
      plan.days,
      a.device_id,
      data.deviceDays[a.device_id] ?? [],
      a.baseline,
      from,
      to
    )
    return vs === null ? [] : [{ a, ...vs }]
  })
  return (
    <ul className="flex flex-wrap gap-2 lg:col-span-4 lg:justify-end">
      {rows.map(({ a, now, before, weather }) => (
        <li
          key={actionId(a)}
          className="flex items-center gap-2 rounded-full border px-2 py-1 text-xs tabular-nums"
        >
          <DeviceIcon type={typeOf(a)} size="xs" />
          <span>{t("kwhDay", { kwh: f.kwhDay.format(now) })}</span>
          <span
            className={now < before ? "text-primary" : "text-muted-foreground"}
          >
            {signedPct(now, before)}
          </span>
          {/* Which basis: a device's chips can change it between weeks (no frozen day that week). */}
          <span className="text-muted-foreground">
            {t(weather ? "chipExpected" : "chipBefore")}
          </span>
        </li>
      ))}
    </ul>
  )
}
