"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Badge } from "@workspace/ui/components/hairline/badge"
import { Button } from "@workspace/ui/components/hairline/button"
import { Checkbox } from "@workspace/ui/components/hairline/checkbox"
import { DatePicker } from "@workspace/ui/components/hairline/date-picker"
import { EmptyState } from "@workspace/ui/components/hairline/empty-state"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { Progress } from "@workspace/ui/components/hairline/progress"
import { StepperInput } from "@workspace/ui/components/hairline/stepper-input"

import { DeviceIcon } from "@/components/shared/device-icon"
import { Tile } from "@/components/shared/tile"

import {
  alwaysOnKwh,
  alwaysOnPresets,
  alwaysOnSteps,
  billFor,
  detectable,
  preselected,
  tierOf,
} from "../math"
import { startPlanAction } from "../actions"
import type { PlanAction } from "../schemas"
import { at, formats, type CommitKey, type PlanData } from "./plan-data"

const MAX_ACTIONS = 3
const ALWAYS_ON = "always_on" as const
/** The backend's refusals the page words (plan.json `summary.refused`); others read as "invalid". */
const REFUSALS = {
  plan_exists: 1,
  bad_start: 1,
  bad_actions: 1,
  no_forecast: 1,
  invalid: 1,
}

/**
 * Step 1 and 2: the actions this home's data supports (device advice priced by the backend, plus an always-on cut the
 * user sizes), and the plan they make: the cycle's bill with and without it, the tier it avoids, whether it can be
 * measured, the commitments and the start day.
 */
export function PlanBuilder({
  data,
  preselect,
}: {
  data: PlanData
  /** `<deviceId>.<key>` ids from `?add=`: a device's "Thêm vào kế hoạch" link or Wappi's plan. */
  preselect: string[]
}) {
  const t = useTranslations("plan")
  const bf = useTranslations("billing.deviceForecast")
  const locale = useLocale()
  const f = formats(locale)
  const steps = alwaysOnSteps(data.alwaysOnW)
  const [{ picked: first, gone }] = useState(() =>
    preselected(preselect, data.advice, MAX_ACTIONS)
  )
  const [picked, setPicked] = useState(first)
  const [watts, setWatts] = useState(steps?.value ?? 0)
  const [start, setStart] = useState(data.today)
  const [pending, startTransition] = useTransition()
  const [refused, setRefused] = useState<string | null>(null)

  const toggle = (id: string, on: boolean) =>
    setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)))
  const full = picked.length >= MAX_ACTIONS
  const alwaysOn = picked.includes(ALWAYS_ON)
  const alwaysOnDelta = alwaysOnKwh(watts, data.daysLeft)
  const chosen = data.advice.filter((a) => picked.includes(a.id))

  // One price for the sum: tiers are not linear, so the actions' own amounts do not add up.
  const delta =
    chosen.reduce((s, a) => s + a.kwh, 0) + (alwaysOn ? alwaysOnDelta : 0)
  const low =
    chosen.reduce((s, a) => s + (a.range?.low ?? a.kwh), 0) +
    (alwaysOn ? alwaysOnDelta : 0)
  const high =
    chosen.reduce((s, a) => s + (a.range?.high ?? a.kwh), 0) +
    (alwaysOn ? alwaysOnDelta : 0)
  const without = billFor(data.forecastKwh, data.tiers, data.vat)
  const withPlan = billFor(
    Math.max(data.forecastKwh - delta, 0),
    data.tiers,
    data.vat
  )
  const tierNow = tierOf(data.forecastKwh, data.tiers)
  const tierPlan = tierOf(data.forecastKwh - delta, data.tiers)
  const alwaysOnAmount =
    billFor(data.forecastKwh, data.tiers, data.vat) -
    billFor(Math.max(data.forecastKwh - alwaysOnDelta, 0), data.tiers, data.vat)

  function begin() {
    const actions: PlanAction[] = [
      ...chosen.map((a) => ({
        device_id: a.deviceId,
        key: a.key,
        label: a.label,
        kwh: a.kwh,
        amount: a.amount,
        baseline: a.baseline,
        watts: null,
      })),
      ...(alwaysOn
        ? [
            {
              device_id: null,
              key: ALWAYS_ON,
              label: t("opportunities.alwaysOn"),
              kwh: alwaysOnDelta,
              amount: alwaysOnAmount,
              baseline: data.alwaysOnW,
              watts,
            },
          ]
        : []),
    ]
    startTransition(async () => {
      const result = await startPlanAction({ start_on: start, actions })
      setRefused(result.ok ? null : result.code)
    })
  }

  const max = Math.max(
    ...data.advice.map((a) => a.range?.high ?? a.kwh),
    steps ? alwaysOnKwh(steps.max, data.daysLeft) : 0,
    0.001
  )
  const ratio = detectable(
    delta / Math.max(data.daysLeft, 1),
    data.sigma,
    data.daysLeft
  )
  const commitments = [
    ...chosen.map((a) => ({ key: a.key, type: a.type })),
    ...(alwaysOn ? [{ key: ALWAYS_ON, type: ALWAYS_ON }] : []),
  ]

  return (
    <div
      className={`grid grid-cols-1 gap-4 lg:grid-cols-12 ${delta > 0 ? "pb-24 lg:pb-0" : ""}`}
    >
      <Tile
        title={t("opportunities.title")}
        description={t("opportunities.description", {
          end: f.date.format(at(data.periodEnd)),
        })}
        action={
          <Badge size="sm" tone={full ? "primary" : "neutral"} outline>
            {t("opportunities.picked", { n: picked.length, max: MAX_ACTIONS })}
          </Badge>
        }
        className="lg:col-span-7"
      >
        {gone ? (
          <Alert tone="info" title={t("opportunities.gone", { n: gone })} />
        ) : null}
        {full ? (
          // The rest grey out at three: say why, where the eye is.
          <p className="text-sm text-muted-foreground">
            {t("opportunities.full")}
          </p>
        ) : null}
        {data.advice.length || steps ? (
          <ul className="flex flex-col divide-y divide-border">
            {data.advice.map((a) => {
              const on = picked.includes(a.id)
              return (
                <Opportunity
                  key={a.id}
                  type={a.type}
                  title={a.label}
                  on={on}
                  disabled={!on && full}
                  onToggle={(v) => toggle(a.id, v)}
                  meta={
                    <>
                      <span>{a.device}</span>
                      {a.simulated ? (
                        <Badge size="sm" outline>
                          {bf("simulated")}
                        </Badge>
                      ) : null}
                      {a.avoidsTier ? (
                        <Badge size="sm" tone="success">
                          {t("summary.avoidsTier", { tier: a.avoidsTier })}
                        </Badge>
                      ) : null}
                    </>
                  }
                  amount={f.vnd.format(a.amount)}
                  kwh={t("opportunities.kwh", { kwh: f.kwh.format(a.kwh) })}
                  bar={{
                    value: a.kwh,
                    low: a.range?.low ?? null,
                    high: a.range?.high ?? null,
                    max,
                  }}
                  note={
                    a.range
                      ? t("opportunities.range", {
                          low: f.kwh.format(a.range.low),
                          high: f.kwh.format(a.range.high),
                        })
                      : t("opportunities.rough")
                  }
                />
              )
            })}
            {steps ? (
              <Opportunity
                type={ALWAYS_ON}
                title={t("opportunities.alwaysOn")}
                on={alwaysOn}
                disabled={!alwaysOn && full}
                onToggle={(v) => toggle(ALWAYS_ON, v)}
                meta={
                  <span>
                    {t("opportunities.alwaysOnNow", {
                      watts: f.watts.format(data.alwaysOnW ?? 0),
                    })}
                  </span>
                }
                amount={f.vnd.format(alwaysOnAmount)}
                kwh={t("opportunities.kwh", {
                  kwh: f.kwh.format(alwaysOnDelta),
                })}
                bar={{ value: alwaysOnDelta, low: null, high: null, max }}
                note={t("opportunities.alwaysOnHint")}
              >
                {alwaysOn ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span aria-hidden className="text-sm text-muted-foreground">
                      {t("opportunities.alwaysOnCut")}
                    </span>
                    {/* A share of the load is easier to judge than watts; the stepper fine-tunes it. */}
                    <span className="flex gap-2">
                      {alwaysOnPresets(steps.max).map((p) => (
                        <Button
                          key={p.share}
                          size="sm"
                          variant={watts === p.watts ? "secondary" : "outline"}
                          aria-pressed={watts === p.watts}
                          onClick={() => setWatts(p.watts)}
                        >
                          {t("opportunities.share", { share: p.share })}
                        </Button>
                      ))}
                    </span>
                    <StepperInput
                      label={t("opportunities.alwaysOnCut")}
                      value={watts}
                      onValueChange={setWatts}
                      min={steps.min}
                      max={steps.max}
                      step={5}
                      largeStep={20}
                      unit="W"
                      locales={locale}
                      size="sm"
                    />
                  </div>
                ) : null}
              </Opportunity>
            ) : null}
          </ul>
        ) : (
          <EmptyState
            scene="done"
            title={t("opportunities.emptyTitle")}
            description={t("opportunities.empty")}
          />
        )}
      </Tile>

      <div id="plan-summary" className="scroll-mt-24 lg:col-span-5">
        {/* Empty, it fills the row beside the list; with picks it is taller and follows the scroll instead. */}
        <Tile
          title={t("summary.title")}
          className={delta > 0 ? "lg:sticky lg:top-24" : "h-full"}
        >
          {delta > 0 ? (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">
                  {t("summary.saves")}
                </span>
                <NumberRoll
                  value={without - withPlan}
                  format={{
                    style: "currency",
                    currency: "VND",
                    maximumFractionDigits: 0,
                  }}
                  locales={locale}
                  className="text-4xl font-medium tracking-tight tabular-nums"
                />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {low !== high
                    ? t("summary.totalRange", {
                        kwh: f.kwh.format(delta),
                        low: f.kwh.format(low),
                        high: f.kwh.format(high),
                        end: f.date.format(at(data.periodEnd)),
                      })
                    : t("summary.totalKwh", {
                        kwh: f.kwh.format(delta),
                        end: f.date.format(at(data.periodEnd)),
                      })}
                </span>
              </div>

              <section className="flex flex-col gap-3">
                <BillBar
                  label={t("summary.without")}
                  amount={f.vnd.format(without)}
                  share={1}
                  tone="muted"
                />
                <BillBar
                  label={t("summary.with")}
                  amount={f.vnd.format(withPlan)}
                  share={without ? withPlan / without : 0}
                  tone="primary"
                />
                {tierPlan < tierNow ? (
                  <Badge tone="success" className="self-start">
                    {t("summary.avoidsTier", { tier: tierNow })}
                  </Badge>
                ) : null}
              </section>

              {ratio !== null ? (
                <section className="flex flex-col gap-1.5">
                  <Progress
                    value={Math.min(ratio, 1) * 100}
                    label={t("summary.clarity")}
                    doneLabel={t("summary.clear")}
                    showValue={false}
                  />
                  {ratio < 1 ? (
                    <p className="text-xs text-muted-foreground">
                      {t("summary.hardToMeasure")}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">
                  {t("summary.commitTitle")}
                </h3>
                <ul className="flex flex-col gap-2">
                  {commitments.map((c) => (
                    <li key={c.key} className="flex items-start gap-3 text-sm">
                      <DeviceIcon type={c.type} size="sm" />
                      <span className="text-muted-foreground">
                        {t(`commit.${c.key as CommitKey}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <DatePicker
                label={t("summary.start")}
                hint={t("summary.startHint", {
                  date: f.date.format(at(data.minStart)),
                })}
                value={start}
                onValueChange={(v) => setStart(v ?? data.today)}
                min={data.minStart}
                max={data.today}
                locale={locale}
                weekStartsOn={1}
              />
              {refused ? (
                <Alert
                  tone="danger"
                  title={t(
                    `summary.refused.${refused in REFUSALS ? (refused as keyof typeof REFUSALS) : "invalid"}`
                  )}
                />
              ) : null}
              <Button size="lg" onClick={begin} disabled={pending}>
                {t("summary.begin")}
              </Button>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                scene="inbox"
                title={t("summary.noneTitle")}
                description={t("summary.none")}
              />
            </div>
          )}
        </Tile>
      </div>

      {/* On a phone the summary sits below the list: the total and the way to it stay in reach. */}
      {delta > 0 ? (
        <div className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between gap-3 rounded-3xl border bg-background p-3 pl-4 lg:hidden">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">
              {t("summary.saves")}
            </span>
            <span className="text-lg font-medium tabular-nums">
              {f.vnd.format(without - withPlan)}
            </span>
          </div>
          <Button
            onClick={() =>
              document
                .getElementById("plan-summary")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            {t("summary.review")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** One action to pick: its device, what it saves (₫ first), and a bar of its kWh against the largest, its range lighter. */
function Opportunity({
  type,
  title,
  on,
  disabled,
  onToggle,
  meta,
  amount,
  kwh,
  bar,
  note,
  children,
}: {
  type: string
  title: string
  on: boolean
  disabled: boolean
  onToggle: (on: boolean) => void
  meta: React.ReactNode
  amount: string
  kwh: string
  bar: { value: number; low: number | null; high: number | null; max: number }
  note: string
  children?: React.ReactNode
}) {
  const pct = (v: number) => `${Math.min((v / bar.max) * 100, 100)}%`
  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <Checkbox
        checked={on}
        disabled={disabled}
        onCheckedChange={onToggle}
        aria-label={title}
        className="mt-2"
      />
      <DeviceIcon type={type} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium">{title}</span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {meta}
            </span>
          </div>
          <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0.5">
            <span className="text-lg font-medium tabular-nums">{amount}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {kwh}
            </span>
          </div>
        </div>
        <span aria-hidden className="relative h-1.5 rounded-full bg-muted">
          {bar.low !== null && bar.high !== null ? (
            <span
              className="absolute inset-y-0 rounded-full bg-primary/20"
              style={{
                left: pct(bar.low),
                width: `calc(${pct(bar.high)} - ${pct(bar.low)})`,
              }}
            />
          ) : null}
          <span
            className={`absolute inset-y-0 left-0 rounded-full transition-colors duration-150 ${on ? "bg-primary" : "bg-muted-foreground/40"}`}
            style={{ width: pct(bar.value) }}
          />
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {note}
        </span>
        {children}
      </div>
    </li>
  )
}

/** A bill as a bar against the bill as usual, so the cut reads at a glance. */
function BillBar({
  label,
  amount,
  share,
  tone,
}: {
  label: string
  amount: string
  share: number
  tone: "muted" | "primary"
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={`tabular-nums ${tone === "primary" ? "font-medium" : ""}`}
        >
          {amount}
        </span>
      </div>
      <span aria-hidden className="relative h-2 rounded-full bg-muted">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${tone === "primary" ? "bg-primary" : "bg-muted-foreground/40"}`}
          style={{ width: `${Math.max(share, 0) * 100}%` }}
        />
      </span>
    </div>
  )
}
