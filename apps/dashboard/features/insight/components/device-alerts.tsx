"use client"

import { useState, useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"
import { Switch } from "@workspace/ui/components/hairline/switch"
import { ThresholdLine } from "@workspace/ui/components/hairline/threshold-line"
import { toast } from "@workspace/ui/components/hairline/toast-stack"

import { DeviceIcon } from "@/components/shared/device-icon"

import type { SaveResult } from "../actions"
import { formatFigure, type Watch } from "../schemas"
import { lineScale, toKwh } from "../sources"

type Device = { id: string; name: string; type: string }
type SetEvent = (
  deviceId: string,
  event: "device_on" | "device_off",
  on: boolean,
  label: string
) => Promise<SaveResult>

const active = (watches: Watch[], device: string, metric: string) =>
  watches.some(
    (w) =>
      w.status === "active" && w.device_id === device && w.metric === metric
  )

/** Sense's basic notifications for one device: tell me each time it turns on, each time it turns off. */
function EventSwitches({
  device,
  watches,
  setEvent,
}: {
  device: Device
  watches: Watch[]
  setEvent: SetEvent
}) {
  const t = useTranslations("insight.devices")
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {(["device_on", "device_off"] as const).map((event) => (
        <Switch
          key={event}
          defaultChecked={active(watches, device.id, event)}
          onCheckedChange={async (on) => {
            const result = await setEvent(
              device.id,
              event,
              on,
              t(`${event}.label`, { device: device.name })
            )
            if (!result.ok) {
              toast.error(result.error)
              throw new Error(result.error) // the switch flips back
            }
          }}
          label={t(`${event}.switch`)}
          size="sm"
        />
      ))}
    </div>
  )
}

/** Every device with its two switches, on the alerts page (`#devices`, where the builder's card points). */
export function DeviceAlertList({
  devices,
  watches,
  setEvent,
}: {
  devices: Device[]
  watches: Watch[]
  setEvent: SetEvent
}) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {devices
        .filter((d) => d.type !== "other") // the unknown remainder is always on
        .map((d) => (
          <li
            key={d.id}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-center gap-3">
              <DeviceIcon type={d.type} />
              <span className="text-sm font-medium">{d.name}</span>
            </span>
            <EventSwitches device={d} watches={watches} setEvent={setEvent} />
          </li>
        ))}
    </ul>
  )
}

type Day = { date: string; kwh: number; peak_w: number; longest_min: number }
const LEVELS = ["device_run_min", "device_power_w", "device_kwh_today"] as const
type Level = (typeof LEVELS)[number]

/**
 * A device's alerts on its page (Sense's device settings): the two switches, then a level to watch each run or
 * day: running too long, drawing too much, or costing too much a day, set on this month's days.
 */
export function DeviceAlertTile({
  device,
  days,
  price,
  watches,
  save,
  setEvent,
}: {
  device: Device
  days: Day[]
  price: number | null
  watches: Watch[]
  save: (input: unknown) => Promise<SaveResult>
  setEvent: SetEvent
}) {
  const t = useTranslations("insight.devices")
  const locale = useLocale()
  const [level, setLevel] = useState<Level>("device_run_min")
  const [values, setValues] = useState<Partial<Record<Level, number>>>({})
  const [pending, startSaving] = useTransition()
  const whole = days.slice(0, -1)
  const read = (d: Day) =>
    level === "device_run_min"
      ? d.longest_min
      : level === "device_power_w"
        ? Math.round(d.peak_w)
        : price
          ? Math.round(d.kwh * price)
          : d.kwh
  const unit =
    level === "device_run_min"
      ? "min"
      : level === "device_power_w"
        ? "w"
        : price
          ? "vnd"
          : "kwh"
  const data = whole.map((d) => ({
    key: d.date,
    value: read(d),
    label: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      timeZone: "UTC",
    }),
    tick: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(locale, {
      day: "numeric",
      month: "numeric",
      timeZone: "UTC",
    }),
  }))
  const scale = lineScale(data.map((d) => d.value))
  const value = values[level] ?? scale.start
  const threshold =
    level === "device_kwh_today" && price ? toKwh(value, price) : value

  const onSave = () =>
    startSaving(async () => {
      const result = await save({
        metric: level,
        op: "gt",
        threshold,
        label: t(`${level}.label`, { device: device.name }),
        device_id: device.id,
        repeat: true,
      })
      if (result.ok) toast.success(t("saved"))
      else toast.error(result.error)
    })

  return (
    <div className="flex flex-col gap-5">
      <EventSwitches device={device} watches={watches} setEvent={setEvent} />
      <SegmentedControl
        label={t("level")}
        options={LEVELS.map((l) => ({ value: l, label: t(`${l}.name`) }))}
        value={level}
        onValueChange={(v) => setLevel(v as Level)}
        size="sm"
      />
      {data.length >= 2 ? (
        <ThresholdLine
          key={level}
          title={t(`${level}.title`, { device: device.name })}
          period={t("period", { count: data.length })}
          label={t(`${level}.name`)}
          data={data}
          value={value}
          step={scale.step}
          onValueChange={(v) => setValues((all) => ({ ...all, [level]: v }))}
          format={
            unit === "vnd"
              ? { style: "currency", currency: "VND", maximumFractionDigits: 0 }
              : { maximumFractionDigits: 1 }
          }
          locales={locale}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm">
          {t(`${level}.summary`, {
            device: device.name,
            value: formatFigure(value, unit, locale),
          })}
          {level === "device_kwh_today" && price ? (
            <span className="text-muted-foreground">
              {" "}
              {t("approxKwh", { kwh: formatFigure(threshold, "kwh", locale) })}
            </span>
          ) : null}
        </p>
        <Button onClick={onSave} disabled={pending || data.length < 2}>
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  )
}
