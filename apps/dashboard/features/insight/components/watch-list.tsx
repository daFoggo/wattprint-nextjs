"use client"

import { IconX } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Badge, type BadgeTone } from "@workspace/ui/components/hairline/badge"
import { ConfirmAction } from "@workspace/ui/components/hairline/confirm-action"
import { EmptyState } from "@workspace/ui/components/hairline/empty-state"
import { UsageMeter } from "@workspace/ui/components/hairline/usage-meter"

import { DeviceChip, PillLink } from "@/components/shared/nav-links"
import { COPILOT_PATH, DEVICES_PATH } from "@/config/routes"

import { formatFigure, isWatched, unitLabel, type Watch } from "../schemas"

const TONE: Record<Watch["status"], BadgeTone> = {
  active: "success",
  fired: "warning",
  expired: "neutral",
  cancelled: "neutral",
  broken: "danger",
}
const RUN_METRICS = [
  "device_on",
  "device_off",
  "device_run_min",
  "device_power_w",
] as const
type RunMetric = (typeof RUN_METRICS)[number]
const isRun = (metric: string): metric is RunMetric =>
  (RUN_METRICS as readonly string[]).includes(metric)
/** How often a repeating alert can fire, by metric. */
const PERIOD: Record<string, "day" | "cycle" | "hour" | "run"> = {
  today_kwh: "day",
  device_kwh_today: "day",
  bill_vnd: "cycle",
  bill_kwh: "cycle",
  forecast_vnd: "cycle",
  power_w: "hour",
  sql: "day",
}

/**
 * The alerts being watched, each as one sentence: what, when, and the money a kWh stands for. Only active ones
 * (and broken ones, which need a look): the ended ones are history, and their alerts are in the list above. An
 * active "above" alert draws how close its last reading is. Each row is `#watch-<id>` (Wappi's card points here).
 */
export function WatchList({
  watches,
  devices,
  price,
  cancel,
  add,
}: {
  watches: Watch[]
  devices: { id: string; name: string; type: string }[]
  price: number | null
  cancel: (id: string) => Promise<void>
  /** The add button, offered when nothing is watched. */
  add?: React.ReactNode
}) {
  const t = useTranslations("insight.watches")
  const locale = useLocale()
  const when = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const watched = watches.filter(isWatched)
  if (!watched.length)
    return (
      <EmptyState
        scene="inbox"
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {add}
            <PillLink href={COPILOT_PATH}>{t("emptyAction")}</PillLink>
          </div>
        }
      />
    )

  return (
    <ul className="flex flex-col divide-y divide-border">
      {watched.map((w) => {
        const device = devices.find((d) => d.id === w.device_id)
        // Money first: a kWh figure reads as its cost, the kWh after it.
        const figure = (n: number) =>
          w.unit === "kwh" && price
            ? `${formatFigure(n * price, "vnd", locale)} ${t("approxMoney", { money: formatFigure(n, "kwh", locale) })}`
            : formatFigure(n, w.unit, locale)
        const active = w.status === "active"
        const run = isRun(w.metric)
        const sentence = isRun(w.metric)
          ? t(`run.${w.metric}`, {
              device: device?.name ?? w.label,
              value: figure(w.threshold),
            })
          : t(`condition.${w.op}`, { value: figure(w.threshold) })
        return (
          <li
            key={w.id}
            id={`watch-${w.id}`}
            className="flex scroll-mt-24 flex-col gap-3 py-4 first:pt-0 last:pb-0 target:bg-accent"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-sm font-medium">
                  {run ? sentence : w.label}
                </p>
                {run ? null : (
                  <p className="text-sm text-muted-foreground">{sentence}</p>
                )}
                {device ? (
                  <DeviceChip
                    href={`${DEVICES_PATH}/${encodeURIComponent(device.id)}`}
                    type={device.type}
                    name={device.name}
                  />
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {w.repeat ? (
                  <Badge tone="neutral" outline>
                    {t(`repeat.${PERIOD[w.metric] ?? "run"}`)}
                  </Badge>
                ) : null}
                {active ? null : (
                  <Badge tone={TONE[w.status]} dot>
                    {t(`status.${w.status}`)}
                  </Badge>
                )}
                {active ? (
                  <ConfirmAction
                    icon={<IconX aria-hidden className="size-4" />}
                    label={t("cancel", { label: w.label })}
                    labels={{
                      idle: t("confirm"),
                      pending: t("cancelling"),
                      success: t("cancelled"),
                    }}
                    tone="danger"
                    resetAfter={0}
                    onConfirm={() => cancel(w.id)}
                  />
                ) : null}
              </div>
            </div>
            {active &&
            !run &&
            w.op === "gt" &&
            w.last_value !== null &&
            w.threshold > 0 ? (
              <UsageMeter
                used={Math.max(0, w.last_value)}
                limit={w.threshold}
                unit={unitLabel(w.unit, locale)}
                label={t("meter")}
                locales={locale}
              />
            ) : null}
            {run ? (
              w.fired_at ? (
                <p className="text-xs text-muted-foreground">
                  {t("lastFired", { at: when.format(w.fired_at) })}
                </p>
              ) : null
            ) : (
              <p className="text-xs text-muted-foreground">
                {w.last_value === null
                  ? t("noValue")
                  : t("lastValue", {
                      value: figure(w.last_value),
                      at: when.format(w.last_checked_at ?? w.created_at),
                    })}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
