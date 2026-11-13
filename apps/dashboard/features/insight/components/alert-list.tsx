import { useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"

import { CardLink, DeviceChip } from "@/components/shared/nav-links"
import { Tile } from "@/components/shared/tile"
import { DEVICES_PATH } from "@/config/routes"

import type { Alert as AlertData } from "../schemas"

const TONE = { info: "info", warning: "warning", critical: "danger" } as const

/** "5 hours ago" from two instants: the server passes `now`, so nothing reads the clock while rendering. */
function ago(ts: number, now: number, locale: string) {
  const minutes = Math.round((ts - now) / 60_000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (minutes > -60) return rtf.format(minutes, "minute")
  if (minutes > -24 * 60) return rtf.format(Math.round(minutes / 60), "hour")
  return rtf.format(Math.round(minutes / 1440), "day")
}

/**
 * Devices doing something out of the ordinary, open ones first: what happened, with its figures, and the way
 * to the device. A resolved alert stays in the list, in the success tone. `brief` keeps to the open ones and
 * their headlines (the Overview).
 */
export function AlertList({
  alerts,
  now,
  brief = false,
  className,
}: {
  alerts: AlertData[]
  now: number
  brief?: boolean
  className?: string
}) {
  const t = useTranslations("insight.alerts")
  const locale = useLocale()
  const shown = brief
    ? alerts.filter((a) => a.status !== "resolved")
    : [...alerts].sort(
        (a, b) =>
          Number(a.status === "resolved") - Number(b.status === "resolved")
      )
  const open = alerts.filter((a) => a.status !== "resolved").length
  return (
    <Tile
      title={t("title")}
      description={open ? t("open", { count: open }) : t("none")}
      className={className}
      action={<CardLink href={DEVICES_PATH}>{t("allDevices")}</CardLink>}
    >
      <div className="flex flex-col gap-3">
        {shown.map((a) => {
          const values = { device: a.device?.name ?? "", ...a.payload }
          return (
            <Alert
              key={a.id}
              tone={a.status === "resolved" ? "success" : TONE[a.severity]}
              title={t(`${a.kind}.title`, values)}
              action={
                a.device ? (
                  // The device itself is the link: its icon and name say where it goes.
                  <DeviceChip
                    href={`${DEVICES_PATH}/${encodeURIComponent(a.device.id)}`}
                    type={a.device.type}
                    name={a.device.name}
                  />
                ) : undefined
              }
            >
              {brief ? null : `${t(`${a.kind}.body`, values)} `}
              <span className="text-muted-foreground">
                {brief ? "" : "· "}
                {ago(a.ts, now, locale)}
                {a.status === "resolved" ? ` · ${t("resolved")}` : ""}
              </span>
            </Alert>
          )
        })}
      </div>
    </Tile>
  )
}
