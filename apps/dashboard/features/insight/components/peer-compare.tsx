import { useLocale, useTranslations } from "next-intl"

import { BalanceMeter } from "@workspace/ui/components/hairline/balance-meter"

import { median, shareBelow } from "../cohort"
import type { Cohort } from "../schemas"

/**
 * This home against similar ones (Sense's "Compare"): the figure is how many kWh more (or fewer) than the median
 * home, lit to the right when more; the line under it says what share of similar homes use less.
 */
export function PeerCompare({
  cohort,
  kwh,
  className,
}: {
  cohort: Cohort
  /** This home's energy over the cohort's `days`. */
  kwh: number
  className?: string
}) {
  const t = useTranslations("insight.peers")
  const share = shareBelow(kwh, cohort)
  const more = share >= 0.5
  const pct = new Intl.NumberFormat(useLocale(), {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(more ? share : 1 - share)
  return (
    <BalanceMeter
      className={className}
      title={t(more ? "more" : "less", { pct })}
      unit="kWh"
      inflow={{
        label: t("you", { days: cohort.days }),
        value: Math.round(kwh),
      }}
      outflow={{
        label: t("median", { homes: cohort.homes }),
        value: Math.round(median(cohort)),
      }}
      format={{ maximumFractionDigits: 0 }}
      locales={useLocale()}
    />
  )
}
