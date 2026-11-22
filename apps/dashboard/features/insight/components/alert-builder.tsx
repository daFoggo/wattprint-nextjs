"use client"

import { useState, useTransition } from "react"
import {
  IconBolt,
  IconCalendarDollar,
  IconPlug,
  IconReceipt2,
} from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"
import { DatePicker } from "@workspace/ui/components/hairline/date-picker"
import { Switch } from "@workspace/ui/components/hairline/switch"
import { ThresholdLine } from "@workspace/ui/components/hairline/threshold-line"
import { toast } from "@workspace/ui/components/hairline/toast-stack"
import { cn } from "@workspace/ui/lib/utils"

import type { SaveResult } from "../actions"
import { formatFigure } from "../schemas"
import { lineScale, toKwh, type AlertSource } from "../sources"

const ICON = { daily: IconCalendarDollar, cycle: IconReceipt2, power: IconBolt }

/**
 * Sense's custom alerts, without a form: pick what to watch (each card shows its figure now, money first), drag
 * the line over its own history and see how often it would have fired, then save. Repeats by default.
 */
export function AlertBuilder({
  sources,
  price,
  save,
}: {
  sources: AlertSource[]
  price: number | null
  save: (input: unknown) => Promise<SaveResult>
}) {
  const t = useTranslations("insight.builder")
  const locale = useLocale()
  const usable = sources.filter((s) => s.data.length >= 2)
  const [key, setKey] = useState(usable[0]?.key)
  const [values, setValues] = useState<Record<string, number>>({})
  const [repeat, setRepeat] = useState(true)
  const [endsOn, setEndsOn] = useState<string | null>(null)
  const [pending, startSaving] = useTransition()
  const source = usable.find((s) => s.key === key)
  if (!source)
    return <p className="text-sm text-muted-foreground">{t("noHistory")}</p>

  const scale = lineScale(source.data.map((d) => d.value))
  const value = values[source.key] ?? scale.start
  const figure = (n: number, unit: string) => formatFigure(n, unit, locale)
  const kwhOf =
    source.unit === "vnd" && source.metric === "today_kwh" && price
      ? toKwh(value, price)
      : null

  const onSave = () =>
    startSaving(async () => {
      const result = await save({
        metric: source.metric,
        op: "gt",
        threshold: kwhOf ?? value,
        label: t(`${source.key}.label`),
        repeat,
        ...(!repeat && endsOn ? { ends_on: endsOn } : {}),
      })
      if (result.ok) toast.success(t("saved"))
      else toast.error(result.error)
    })

  return (
    <div className="flex flex-col gap-5">
      <div
        role="radiogroup"
        aria-label={t("what")}
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {usable.map((s) => {
          const Icon = ICON[s.key]
          const chosen = s.key === source.key
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => setKey(s.key)}
              className={cn(
                "flex flex-col items-start gap-3 rounded-xl border bg-background p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40 motion-safe:transition-colors motion-safe:duration-150",
                chosen ? "border-primary bg-primary/10" : "hover:bg-accent"
              )}
            >
              <Icon
                aria-hidden
                className={cn("size-5", chosen && "text-primary")}
              />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {t(`${s.key}.name`)}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {s.now === null
                    ? t("noFigure")
                    : t(`${s.key}.now`, { value: figure(s.now, s.unit) })}
                </span>
              </span>
            </button>
          )
        })}
        <a
          href="#devices"
          className="flex flex-col items-start gap-3 rounded-xl border bg-background p-4 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 motion-safe:transition-colors motion-safe:duration-150"
        >
          <IconPlug aria-hidden className="size-5" />
          <span className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("devices.name")}</span>
            <span className="text-sm text-muted-foreground">
              {t("devices.now")}
            </span>
          </span>
        </a>
      </div>

      <ThresholdLine
        key={source.key}
        title={t(`${source.key}.title`)}
        period={t(`${source.key}.period`, { count: source.data.length })}
        label={t(`${source.key}.label`)}
        data={source.data}
        value={value}
        step={scale.step}
        onValueChange={(v) => setValues((all) => ({ ...all, [source.key]: v }))}
        format={
          source.unit === "vnd"
            ? { style: "currency", currency: "VND", maximumFractionDigits: 0 }
            : { maximumFractionDigits: 1 }
        }
        locales={locale}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm">
            {t("summary", {
              what: t(`${source.key}.what`),
              value: figure(value, source.unit),
            })}
            {kwhOf === null ? null : (
              <span className="text-muted-foreground">
                {" "}
                {t("approxKwh", { kwh: figure(kwhOf, "kwh") })}
              </span>
            )}
          </p>
          <Switch
            checked={repeat}
            onCheckedChange={setRepeat}
            label={t(`${source.key}.repeat`)}
            size="sm"
          />
          {repeat ? null : (
            <DatePicker
              label={t("endsOn")}
              hint={t(`${source.key}.endsOnHint`)}
              placeholder={t("endsOnPlaceholder")}
              value={endsOn}
              onValueChange={setEndsOn}
              locale={locale}
            />
          )}
        </div>
        <Button onClick={onSave} disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  )
}
