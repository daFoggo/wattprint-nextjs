"use client"

import { useState, useTransition } from "react"
import {
  IconBolt,
  IconCalendarDollar,
  IconChevronRight,
  IconClockHour4,
  IconPlug,
  IconPlugOff,
  IconReceipt2,
  type Icon,
} from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Button } from "@workspace/ui/components/hairline/button"
import { PillSelect } from "@workspace/ui/components/hairline/pill-select"
import { StepperInput } from "@workspace/ui/components/hairline/stepper-input"
import { Switch } from "@workspace/ui/components/hairline/switch"
import { toast } from "@workspace/ui/components/hairline/toast-stack"
import { Sheet, SheetTitle } from "@workspace/ui/components/ui/sheet"

import {
  DetailSheetClose,
  DetailSheetContent,
  DetailSheetHeader,
} from "@/components/shared/detail-sheet"

import type { SaveResult } from "../actions"
import { formatFigure } from "../schemas"
import { toKwh, type AlertSource } from "../sources"
import {
  previewCount,
  RUN_MINUTES,
  templatesFor,
  type Template,
  type TemplateKey,
  watchInput,
} from "../templates"

const ICON: Record<TemplateKey, Icon> = {
  daily: IconCalendarDollar,
  cycle: IconReceipt2,
  power: IconBolt,
  device_run_min: IconClockHour4,
  device_on: IconPlug,
  device_off: IconPlugOff,
}
const GROUPS = ["money", "device", "home"] as const
type DeviceKey = "device_run_min" | "device_on" | "device_off"
type LevelKey = "daily" | "cycle" | "power"

export type AlertDevice = {
  id: string
  name: string
  type: string
  /** The longest run of each day this month (minutes), for the run-length preview. */
  longest: number[]
  /** kWh of each of the last 7 days, for how often it ran. */
  week: number[]
}

/**
 * Adding an alert (Sense's custom alerts, as a sentence): a button opens a sheet; step 1 picks what to be told
 * about, step 2 reads it back as one sentence whose parts change in place, with how often it would have fired.
 */
export function AddAlert({
  sources,
  devices,
  price,
  save,
  setEvent,
}: {
  sources: AlertSource[]
  devices: AlertDevice[]
  price: number | null
  save: (input: unknown) => Promise<SaveResult>
  setEvent: (
    deviceId: string,
    event: "device_on" | "device_off",
    on: boolean,
    label: string
  ) => Promise<SaveResult>
}) {
  const t = useTranslations("insight.add")
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Template | null>(null)
  const templates = templatesFor(sources, devices.length > 0)
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setPicked(null)
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>{t("button")}</Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <DetailSheetContent storageKey="add-alert-width">
          <DetailSheetHeader>
            <DetailSheetClose />
            <SheetTitle>
              {picked ? t(`templates.${picked.key}.title`) : t("title")}
            </SheetTitle>
          </DetailSheetHeader>
          <div className="flex flex-col gap-6 overflow-y-auto p-4 md:p-6">
            {picked ? (
              <Sentence
                key={picked.key}
                template={picked}
                devices={devices}
                price={price}
                save={save}
                setEvent={setEvent}
                onBack={() => setPicked(null)}
                onSaved={() => onOpenChange(false)}
              />
            ) : (
              <Pick templates={templates} onPick={setPicked} />
            )}
          </div>
        </DetailSheetContent>
      </Sheet>
    </>
  )
}

/** Step 1: what to be told about, in three short groups. */
function Pick({
  templates,
  onPick,
}: {
  templates: Template[]
  onPick: (t: Template) => void
}) {
  const t = useTranslations("insight.add")
  return (
    <>
      <p className="text-base font-medium">{t("pick")}</p>
      {GROUPS.map((group) => {
        const list = templates.filter((x) => x.group === group)
        if (!list.length) return null
        return (
          <section key={group} className="flex flex-col gap-2">
            <h3 className="text-xs text-muted-foreground">
              {t(`groups.${group}`)}
            </h3>
            <ul className="flex flex-col gap-2">
              {list.map((x) => {
                const Glyph = ICON[x.key]
                return (
                  <li key={x.key}>
                    <button
                      type="button"
                      onClick={() => onPick(x)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-background p-4 text-left hover:bg-accent"
                    >
                      <Glyph
                        aria-hidden
                        stroke={1.5}
                        className="size-5 shrink-0 text-muted-foreground"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium">
                          {t(`templates.${x.key}.title`)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(`templates.${x.key}.hint`)}
                        </span>
                      </span>
                      <IconChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </>
  )
}

/** Step 2: the alert as one sentence, its parts changed in place, how often it would have fired, then save. */
function Sentence({
  template,
  devices,
  price,
  save,
  setEvent,
  onBack,
  onSaved,
}: {
  template: Template
  devices: AlertDevice[]
  price: number | null
  save: (input: unknown) => Promise<SaveResult>
  setEvent: (
    deviceId: string,
    event: "device_on" | "device_off",
    on: boolean,
    label: string
  ) => Promise<SaveResult>
  onBack: () => void
  onSaved: () => void
}) {
  const t = useTranslations("insight.add")
  const tDevice = useTranslations("insight.devices")
  const locale = useLocale()
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "")
  const [value, setValue] = useState(template.start)
  const [repeat, setRepeat] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startSaving] = useTransition()
  const device = devices.find((d) => d.id === deviceId)
  const isDevice = template.group === "device"
  const preview =
    template.key === "device_run_min"
      ? previewCount(device?.longest ?? [], value)
      : previewCount(template.history, value)
  const ran = device?.week.filter((kwh) => kwh > 0).length ?? 0

  const onSave = () =>
    startSaving(async () => {
      setError(null)
      const name = device?.name ?? ""
      const result =
        template.key === "device_on" || template.key === "device_off"
          ? await setEvent(
              deviceId,
              template.key,
              true,
              tDevice(`${template.key as DeviceKey}.label`, { device: name })
            )
          : await save(
              watchInput({
                template,
                value,
                price,
                repeat,
                deviceId,
                label: isDevice
                  ? tDevice(`${template.key as DeviceKey}.label`, {
                      device: name,
                    })
                  : t(`templates.${template.key as LevelKey}.label`),
              })
            )
      if (!result.ok) return setError(result.error)
      toast.success(t("saved"))
      onSaved()
    })

  const amount =
    template.unit === "vnd" || template.unit === "kwh" || template.unit === "w"
      ? template.unit
      : null
  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2 text-base">
          <span>{t(`templates.${template.key}.lead`)}</span>
          {isDevice ? (
            <PillSelect
              label={t("device")}
              options={devices.map((d) => ({ value: d.id, label: d.name }))}
              value={deviceId}
              onValueChange={setDeviceId}
            />
          ) : null}
          {isDevice ? (
            <span>{t(`templates.${template.key as DeviceKey}.verb`)}</span>
          ) : null}
          {template.key === "device_run_min" ? (
            <PillSelect
              label={t("minutes")}
              options={RUN_MINUTES.map((m) => ({
                value: String(m),
                label: formatFigure(m, "min", locale),
              }))}
              value={String(value)}
              onValueChange={(v) => setValue(Number(v))}
            />
          ) : null}
          {amount ? (
            <StepperInput
              label={t("amount")}
              value={value}
              onValueChange={setValue}
              min={0}
              step={template.step}
              largeStep={template.step * 10}
              format={
                amount === "vnd"
                  ? {
                      style: "currency",
                      currency: "VND",
                      maximumFractionDigits: 0,
                    }
                  : { maximumFractionDigits: amount === "kwh" ? 1 : 0 }
              }
              unit={amount === "w" ? "W" : amount === "kwh" ? "kWh" : undefined}
              locales={locale}
              size="sm"
            />
          ) : null}
        </div>
        {template.key === "daily" && template.unit === "vnd" && price ? (
          <p className="text-xs text-muted-foreground">
            {tDevice("approxKwh", {
              kwh: formatFigure(toKwh(value, price), "kwh", locale),
            })}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {template.key === "device_on" || template.key === "device_off"
            ? t("ran", { device: device?.name ?? "", count: ran })
            : preview === null
              ? t("noPreview")
              : t("preview", {
                  period: t(
                    `period.${template.key as LevelKey | "device_run_min"}`
                  ),
                  count: preview,
                })}
        </p>
      </div>
      {isDevice ? null : (
        <Switch
          checked={repeat}
          onCheckedChange={setRepeat}
          label={t(`repeat.${template.key as LevelKey}`)}
          size="sm"
        />
      )}
      {error ? <Alert tone="danger" title={error} /> : null}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} disabled={pending}>
          {t("back")}
        </Button>
        <Button onClick={onSave} disabled={pending || (isDevice && !deviceId)}>
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </>
  )
}
