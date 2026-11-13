import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { cn } from "@workspace/ui/lib/utils"

import { Tile } from "@/components/shared/tile"

import type { CurrentBill } from "../schemas"
import { tierColor } from "../tier-color"

/**
 * The bill as the power company prices it: every tier with its range and price, how full it is this cycle, and
 * what it costs; then the subtotal, VAT and total. Tiers not reached yet are muted.
 */
export function TierLadder({
  bill,
  className,
}: {
  bill: CurrentBill
  className?: string
}) {
  const t = useTranslations("billing")
  const locale = useLocale()
  const vnd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
  })
  const kwh = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const vat = Math.round(bill.vat_rate * 100)
  return (
    <Tile
      title={t("ladder.title")}
      description={t("ladder.description")}
      className={className}
    >
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">{t("ladder.caption")}</caption>
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 text-left font-normal">
              {t("ladder.colTier")}
            </th>
            <th className="w-2/5 pb-2 pl-4 text-left font-normal">
              {t("ladder.colUsed")}
            </th>
            <th className="pb-2 pl-4 text-right font-normal">
              {t("ladder.colAmount")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bill.tiers.map((x) => {
            const current = x.tier_no === bill.tier_no
            const reached = x.kwh > 0 || current
            const size = x.to_kwh === null ? null : x.to_kwh - x.from_kwh
            return (
              <tr
                key={x.tier_no}
                aria-current={current || undefined}
                className={cn("h-14", !reached && "text-muted-foreground")}
              >
                <td>
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: tierColor(x.tier_no) }}
                    />
                    {t("tier", { tier: x.tier_no })}
                    {current ? (
                      <Badge tone="primary" size="sm">
                        {t("now")}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block pl-4 text-xs text-muted-foreground">
                    {t(x.to_kwh === null ? "ladder.rangeTop" : "ladder.range", {
                      from: x.from_kwh,
                      to: x.to_kwh ?? 0,
                      price: vnd.format(x.price_per_kwh),
                    })}
                  </span>
                </td>
                <td className="pl-4">
                  {size !== null ? (
                    <span
                      aria-hidden
                      className="mb-1.5 block h-1.5 overflow-hidden rounded-full bg-muted"
                    >
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (x.kwh / size) * 100)}%`,
                          background: tierColor(x.tier_no),
                        }}
                      />
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {size === null
                      ? t("ladder.usedTop", { used: kwh.format(x.kwh) })
                      : t("ladder.used", {
                          used: kwh.format(x.kwh),
                          size,
                        })}
                  </span>
                </td>
                <td className="pl-4 text-right">{vnd.format(x.amount)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="border-t">
          <tr className="text-muted-foreground">
            <td colSpan={2} className="pt-3">
              {t("ladder.subtotal")}
            </td>
            <td className="pt-3 text-right">
              {vnd.format(bill.amount_before_vat)}
            </td>
          </tr>
          <tr className="text-muted-foreground">
            <td colSpan={2} className="pt-1">
              {t("vat", { vat })}
            </td>
            <td className="pt-1 text-right">{vnd.format(bill.vat_amount)}</td>
          </tr>
          <tr className="font-medium">
            <td colSpan={2} className="pt-1">
              {t("ladder.total")}
            </td>
            <td className="pt-1 text-right">{vnd.format(bill.amount_total)}</td>
          </tr>
        </tfoot>
      </table>
    </Tile>
  )
}
