import { useLocale, useTranslations } from "next-intl"

import { ThresholdLine } from "@workspace/ui/components/hairline/threshold-line"

/**
 * Try a daily limit against the last 30 days and see how often it would have fired (Sense's goals). A preview:
 * saving it waits for the alert rules endpoint (tb_device_alert_rule).
 */
export function ThresholdTry({
  days,
  className,
}: {
  /** Whole days, oldest first, in kWh. */
  days: { date: string; value: number }[]
  className?: string
}) {
  const t = useTranslations("insight.threshold")
  const locale = useLocale()
  const date = (d: string, options: Intl.DateTimeFormatOptions) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString(locale, {
      ...options,
      timeZone: "UTC",
    })
  const last = days.slice(-30)
  return (
    <ThresholdLine
      className={className}
      title={t("title")}
      period={t("period", { days: last.length })}
      label={t("label")}
      data={last.map((d) => ({
        key: d.date,
        value: d.value,
        label: date(d.date, {
          weekday: "short",
          day: "numeric",
          month: "numeric",
        }),
        tick: date(d.date, { day: "numeric", month: "numeric" }),
      }))}
      step={1}
      format={{ maximumFractionDigits: 0 }}
      locales={locale}
    />
  )
}
