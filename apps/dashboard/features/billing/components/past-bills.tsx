import { IconChevronRight } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { Sparkline } from "@workspace/ui/components/hairline/sparkline"

import { Tile } from "@/components/shared/tile"
import { STATISTICS_PATH } from "@/config/routes"
import { Link } from "@/i18n/navigation"

import type { PastBill } from "../schemas"

const SHOWN = 6

/** The last few bills, newest first, each against the month before; the year's chart is on the statistics page. */
export function PastBills({
  bills,
  className,
}: {
  /** Oldest first. */
  bills: PastBill[]
  className?: string
}) {
  const t = useTranslations("billing.past")
  const locale = useLocale()
  const vnd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
  })
  const kwh = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const pct = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  })
  const month = (m: string) =>
    new Date(`${m}-15T00:00:00Z`).toLocaleDateString(locale, {
      month: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
  const rows = bills
    .map((b, i) => ({ ...b, before: bills[i - 1] }))
    .slice(-SHOWN)
    .reverse()
  return (
    <Tile
      title={t("title")}
      description={t("description")}
      className={className}
      action={
        // A preview of where it goes: the year's line in a chip.
        <Link
          href={STATISTICS_PATH}
          className="group inline-flex h-7 items-center gap-2 rounded-full bg-background pr-1.5 pl-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-border transition-colors duration-200 ring-inset hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <span aria-hidden>
            <Sparkline
              data={bills.slice(-12).map((b) => b.amount)}
              width={40}
              height={14}
              variant="line"
              color="primary"
              showScrubber={false}
              showLastPoint={false}
            />
          </span>
          {t("chart")}
          <IconChevronRight
            aria-hidden
            className="size-3.5 text-muted-foreground motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
          />
        </Link>
      }
    >
      <table className="w-full text-sm tabular-nums">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 text-left font-normal">{t("colMonth")}</th>
            <th className="pb-2 text-right font-normal">{t("colKwh")}</th>
            <th className="pb-2 pl-4 text-right font-normal">
              {t("colAmount")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((b) => {
            const change = b.before ? b.amount / b.before.amount - 1 : null
            return (
              <tr key={b.month} className="h-14">
                <td>{month(b.month)}</td>
                <td className="text-right text-muted-foreground">
                  {kwh.format(b.kwh)}
                </td>
                <td className="pl-4 text-right">
                  <span className="block">{vnd.format(b.amount)}</span>
                  {change !== null ? (
                    <Badge tone={change > 0 ? "warning" : "success"} size="sm">
                      {pct.format(change)}
                    </Badge>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Tile>
  )
}
