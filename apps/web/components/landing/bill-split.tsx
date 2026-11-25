import {
  IconAirConditioning,
  IconBath,
  IconFileInvoice,
  IconFridge,
  IconX,
} from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import CountUp from "@workspace/ui/components/react-bits/CountUp"

import { SectionHead } from "./section-head"

type Row = { label: string; kwh: string; share: number }
/** The rows' order in the messages: water heater, fridge, air conditioner. */
/** The demo home's bill for the cycle to 25/11 (dashboard overview capture), in dong. */
const BILL_VND = 234630
const ICONS = [IconBath, IconFridge, IconAirConditioning] as const

/** The EVN bill as one number beside the same cycle split by appliance (demo home, cycle to 25/11). */
export function BillSplit() {
  const t = useTranslations("landing.split")
  const locale = useLocale()
  const rows = t.raw("rows") as Row[]
  const no = t.raw("billNo") as string[]
  return (
    <section
      aria-labelledby="split-title"
      className="max-w-lp px-lp-gutter mx-auto flex w-full flex-col gap-12"
    >
      <SectionHead
        id="split-title"
        title={t("title")}
        muted={t("muted")}
        body={t("body")}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="bg-lp-surface flex flex-col gap-8 rounded-3xl p-8 lg:col-span-5">
          <div className="flex flex-col gap-2">
            <p className="text-lp-small text-lp-muted flex items-center gap-2">
              <IconFileInvoice aria-hidden size={18} />
              {t("billLabel")}
            </p>
            <p className="text-lp-head text-lp-ink font-medium tabular-nums">
              <CountUp
                to={BILL_VND}
                separator={locale === "vi" ? "." : ","}
                suffix=" ₫"
                duration={1.6}
                trigger="view"
              />
            </p>
            <p className="text-lp-small text-lp-muted">{t("billMeta")}</p>
          </div>
          <ul className="mt-auto flex flex-col gap-3">
            {no.map((line) => (
              <li
                key={line}
                className="text-lp-body text-lp-ink flex items-center gap-3"
              >
                <IconX
                  aria-hidden
                  size={18}
                  className="text-lp-muted shrink-0"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-lp-stage text-lp-stage-ink flex flex-col gap-8 rounded-3xl p-8 lg:col-span-7">
          <p className="text-lp-small text-lp-stage-muted">{t("splitLabel")}</p>
          <ul className="flex flex-col gap-6">
            {rows.map((row, i) => {
              const RowIcon = ICONS[i] ?? IconBath
              return (
                <li key={row.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-lp-lead flex items-center gap-3 font-medium">
                      <RowIcon
                        aria-hidden
                        size={24}
                        stroke={1.5}
                        className="text-lp-lime"
                      />
                      {row.label}
                    </span>
                    <span className="text-lp-body tabular-nums">
                      {row.kwh}{" "}
                      <span className="text-lp-stage-muted">{row.share}%</span>
                    </span>
                  </div>
                  <div className="bg-lp-stage-line h-2 overflow-hidden rounded-full">
                    {/* Each share fills in from the left as the card scrolls in, the largest first (landing.css,
                        `.lp-bar`, CSS only). */}
                    <div
                      className="lp-bar bg-lp-lime h-full rounded-full"
                      style={
                        {
                          "--lp-share": row.share / 100,
                          "--i": i,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="text-lp-small text-lp-stage-muted mt-auto">
            {t("rest")} {t("note")}
          </p>
        </div>
      </div>
    </section>
  )
}
