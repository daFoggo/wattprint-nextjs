import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { ShareBar } from "@workspace/ui/components/hairline/share-bar"
import { TokenBucket } from "@workspace/ui/components/hairline/token-bucket"
import { cn } from "@workspace/ui/lib/utils"

import { PillLink } from "@/components/shared/nav-links"
import { BILL_PATH } from "@/config/routes"

import type { CurrentBill } from "../schemas"
import { tierColor } from "../tier-color"

const VND = { style: "currency", currency: "VND" } as const
const formats = (locale: string) => ({
  vnd: new Intl.NumberFormat(locale, VND),
  kwh: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
})

type Tier = CurrentBill["tiers"][number]

const Dot = ({ tier }: { tier: Tier }) => (
  <span
    aria-hidden
    className="size-2 shrink-0 rounded-full"
    style={{ background: tierColor(tier.tier_no) }}
  />
)

/** Above the tube, the tier you are in: its name, its price and its range together. */
function TierNow({ tier }: { tier: Tier }) {
  const t = useTranslations("billing")
  const { vnd } = formats(useLocale())
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-base font-medium">
          <Dot tier={tier} />
          {t("tier", { tier: tier.tier_no })}
          <Badge tone="primary" size="sm" dot>
            {t("now")}
          </Badge>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {tier.from_kwh}–{tier.to_kwh} kWh ·{" "}
          <span className="font-medium whitespace-nowrap text-foreground">
            {vnd.format(tier.price_per_kwh)}/kWh
          </span>
        </span>
      </div>
    </div>
  )
}

/** Under the tube's last compartment, the tier it stands for: where it starts, its price and the rise together. */
function TierNext({ from, to }: { from: Tier; to: Tier }) {
  const t = useTranslations("billing")
  const { vnd } = formats(useLocale())
  const rise = Math.round((to.price_per_kwh / from.price_per_kwh - 1) * 100)
  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <Dot tier={to} />
        {t("billSummary.nextTier", { tier: to.tier_no, kwh: to.from_kwh })}
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="font-medium text-foreground">
          {vnd.format(to.price_per_kwh)}/kWh
        </span>
        <Badge tone="warning" size="sm">{`+${rise}%`}</Badge>
      </span>
    </div>
  )
}

/**
 * The Overview's bill, a tray of two stacked cards: what the cycle costs so far, folded until opened into its
 * tiers and VAT, and how much of the current tier is left before the next price. Today's cost and
 * the link to the bill run along the tray's foot.
 */
export function BillSummary({
  bill,
  className,
}: {
  bill: CurrentBill
  className?: string
}) {
  const t = useTranslations("billing")
  const locale = useLocale()
  const { vnd, kwh } = formats(locale)
  const tier = bill.tiers.find((x) => x.tier_no === bill.tier_no)
  const next = bill.tiers.find((x) => x.tier_no === bill.tier_no + 1)
  const parts = bill.tiers
    .filter((x) => x.amount > 0)
    .map((x) => ({
      key: `tier-${x.tier_no}`,
      label: t("billSummary.part", {
        tier: x.tier_no,
        kwh: kwh.format(x.kwh),
      }),
      value: x.amount,
      color: tierColor(x.tier_no),
    }))
  parts.push({
    key: "vat",
    label: t("vat", { vat: Math.round(bill.vat_rate * 100) }),
    value: bill.vat_amount,
    color: "var(--muted-foreground)",
  })
  return (
    <section
      aria-label={t("title")}
      className={cn("flex flex-col gap-2 rounded-3xl bg-card p-2", className)}
    >
      <ShareBar
        title={t("title")}
        caption={t("billSummary.caption", { kwh: kwh.format(bill.kwh) })}
        items={parts}
        format={VND}
        locales={locale}
      />
      {/* The tier card takes what height the row adds, so the foot stays at the bottom. */}
      {tier?.to_kwh != null && next ? (
        // fillUsed (a local patch): the kWh used fill the tube from the left, the figure is what is left.
        <TokenBucket
          className="flex-1"
          title={t("tier", { tier: tier.tier_no })}
          header={<TierNow tier={tier} />}
          footer={<TierNext from={tier} to={next} />}
          limit={tier.to_kwh - tier.from_kwh}
          remaining={bill.kwh - tier.from_kwh}
          fillUsed
          unit="kWh"
          color={tierColor(tier.tier_no)}
          locales={locale}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-1.5 rounded-xl border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            {t("billSummary.topTier", { tier: bill.tier_no })}
          </p>
          <p className="text-lg font-medium">
            {vnd.format(tier?.price_per_kwh ?? 0)}/kWh
          </p>
        </div>
      )}
      {/* The tray's foot: today and the way to the bill. */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
        <p className="text-sm text-muted-foreground">
          {t.rich("billSummary.today", {
            kwh: kwh.format(bill.today_kwh),
            amount: () => (
              <NumberRoll
                className="font-medium text-foreground"
                value={bill.today_amount}
                format={VND}
                locales={locale}
              />
            ),
          })}
        </p>
        <PillLink href={BILL_PATH} className="ml-auto">
          {t("billSummary.viewDetails")}
        </PillLink>
      </div>
    </section>
  )
}
