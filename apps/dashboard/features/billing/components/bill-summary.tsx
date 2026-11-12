import Link from "next/link"
import { IconArrowRight } from "@tabler/icons-react"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { ShareBar } from "@workspace/ui/components/hairline/share-bar"
import { TokenBucket } from "@workspace/ui/components/hairline/token-bucket"
import { cn } from "@workspace/ui/lib/utils"
import { linkButton } from "@workspace/ui-patterns/link-button"

import { BILL_PATH } from "@/config/routes"

import type { CurrentBill } from "../schemas"

const VND = { style: "currency", currency: "VND" } as const
const vnd = new Intl.NumberFormat("en-US", VND)
const kwh = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })
// One colour per tier everywhere (ShareBar ranks its parts, so they would recolour by size).
const tierColor = (n: number) => `var(--chart-${n})`

type Tier = CurrentBill["tiers"][number]

/** One side of the price step: the tier's colour and name, its price large, a note under it. */
function PriceSide({
  tier,
  label,
  note,
  end,
  badge,
}: {
  tier: Tier
  label: string
  note: string
  end?: boolean
  badge?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5",
        end && "items-end text-right"
      )}
    >
      <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: tierColor(tier.tier_no) }}
        />
        {label} · Tier {tier.tier_no}
        {badge}
      </span>
      <span className="text-lg font-medium tabular-nums">
        {vnd.format(tier.price_per_kwh)}/kWh
      </span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  )
}

/** The price now and the one the left kWh run into, read left to right. */
function PriceStep({ from, to, left }: { from: Tier; to: Tier; left: number }) {
  const rise = Math.round((to.price_per_kwh / from.price_per_kwh - 1) * 100)
  return (
    <div className="flex items-center gap-3">
      <PriceSide
        tier={from}
        label="Now"
        note={`${from.from_kwh}–${from.to_kwh} kWh`}
      />
      <IconArrowRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground"
      />
      <PriceSide
        tier={to}
        label="Next"
        note={`after ${kwh.format(left)} kWh`}
        end
        badge={
          <Badge tone="warning" size="sm">
            {`+${rise}%`}
          </Badge>
        }
      />
    </div>
  )
}

/**
 * The Overview's bill, a tray of two stacked cards: what the cycle costs so far, opened into its
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
  const tier = bill.tiers.find((t) => t.tier_no === bill.tier_no)
  const next = bill.tiers.find((t) => t.tier_no === bill.tier_no + 1)
  const parts = bill.tiers
    .filter((t) => t.amount > 0)
    .map((t) => ({
      key: `tier-${t.tier_no}`,
      label: `Tier ${t.tier_no}, ${kwh.format(t.kwh)} kWh`,
      value: t.amount,
      color: tierColor(t.tier_no),
    }))
  parts.push({
    key: "vat",
    label: `VAT ${Math.round(bill.vat_rate * 100)}%`,
    value: bill.vat_amount,
    color: "var(--muted-foreground)",
  })
  return (
    <section
      aria-label="This bill"
      className={cn("flex flex-col gap-2 rounded-3xl bg-card p-2", className)}
    >
      <ShareBar
        title="This bill"
        caption={`So far this cycle, ${kwh.format(bill.kwh)} kWh`}
        items={parts}
        format={VND}
        locales="en-US"
        defaultExpanded
      />
      {/* The tier card takes what height the row adds, so the foot stays at the bottom. */}
      {tier?.to_kwh != null && next ? (
        // fillUsed (a local patch): the kWh used fill the tube from the left, the figure is what is left.
        <TokenBucket
          className="flex-1"
          title={`Tier ${tier.tier_no}`}
          header={
            <PriceStep from={tier} to={next} left={tier.to_kwh - bill.kwh} />
          }
          limit={tier.to_kwh - tier.from_kwh}
          remaining={bill.kwh - tier.from_kwh}
          fillUsed
          unit="kWh"
          color={tierColor(tier.tier_no)}
          locales="en-US"
        />
      ) : (
        <div className="flex flex-1 flex-col gap-1.5 rounded-xl border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            Tier {bill.tier_no}, the top one
          </p>
          <p className="text-lg font-medium">
            {vnd.format(tier?.price_per_kwh ?? 0)}/kWh
          </p>
        </div>
      )}
      {/* The tray's foot: today and the way to the bill. */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
        <p className="text-sm text-muted-foreground">
          Today{" "}
          <NumberRoll
            className="font-medium text-foreground"
            value={bill.today_amount}
            format={VND}
            locales="en-US"
          />{" "}
          · {kwh.format(bill.today_kwh)} kWh
        </p>
        <Link
          href={BILL_PATH}
          className={linkButton({
            variant: "outline",
            size: "md",
            className: "group ml-auto",
          })}
        >
          View bill details
          <IconArrowRight
            aria-hidden
            className="size-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:translate-x-1"
          />
        </Link>
      </div>
    </section>
  )
}
