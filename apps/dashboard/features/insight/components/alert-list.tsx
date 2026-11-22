import { useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"

import { CardLink, DeviceChip } from "@/components/shared/nav-links"
import { Tile } from "@/components/shared/tile"
import { ALERTS_PATH, DEVICES_PATH } from "@/config/routes"
import { Link } from "@/i18n/navigation"

import type { Alert as AlertData, Verdict } from "../schemas"
import { AlertFeedback } from "./alert-feedback"
import { SeenAlert } from "./seen-alert"

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
 * What the detectors found, unresolved first (the backend's order): what happened, with its figures, and the
 * way to the device. A resolved alert stays in the list, in the success tone. `brief` keeps to the open ones
 * and their headlines (the Overview). With `onSeen`, an open alert's ✕ marks it seen.
 */
export function AlertList({
  alerts,
  now,
  brief = false,
  onSeen,
  onFeedback,
  mine,
  className,
}: {
  alerts: AlertData[]
  now: number
  brief?: boolean
  onSeen?: (id: string) => Promise<void>
  /** With it, a model alert (usage_anomaly) asks whether it was right. */
  onFeedback?: (id: string, verdict: Verdict) => Promise<void>
  /** Ids of the viewer's own watches: only those have a row on the alerts page to link to. */
  mine?: Set<string>
  className?: string
}) {
  const t = useTranslations("insight.alerts")
  const locale = useLocale()
  const clock = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
  const shown = brief ? alerts.filter((a) => a.status === "open") : alerts
  const open = alerts.filter((a) => a.status === "open").length
  return (
    <Tile
      title={t("title")}
      description={open ? t("open", { count: open }) : t("none")}
      className={className}
      action={<CardLink href={ALERTS_PATH}>{t("allAlerts")}</CardLink>}
    >
      <div className="flex flex-col gap-3">
        {shown.length ? null : (
          <p className="text-sm text-muted-foreground">
            {t.rich("empty", {
              set: (chunks) => (
                <Link href={ALERTS_PATH} className="text-foreground underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}
        {shown.map((a) => {
          // ICU selects read strings: a boolean figure (a watch's `repeat`) becomes "true"/"false".
          const values = {
            device: a.device?.name ?? "",
            ...Object.fromEntries(
              Object.entries(a.payload).map(([k, v]) => [
                k,
                typeof v === "boolean"
                  ? String(v)
                  : (k === "at" || k === "start") && typeof v === "string"
                    ? clock.format(new Date(v)) // a device run's start, as a time of day
                    : v,
              ])
            ),
          }
          const props = {
            tone: a.status === "resolved" ? "success" : TONE[a.severity],
            title: t(`${a.kind}.title`, values),
            action: a.device ? (
              // The device itself is the link: its icon and name say where it goes.
              <DeviceChip
                href={`${DEVICES_PATH}/${encodeURIComponent(a.device.id)}`}
                type={a.device.type}
                name={a.device.name}
              />
            ) : typeof a.payload.watch_id === "string" &&
              mine?.has(a.payload.watch_id) ? (
              <CardLink href={`${ALERTS_PATH}#watch-${a.payload.watch_id}`}>
                {t("viewWatch")}
              </CardLink>
            ) : undefined,
            children: (
              <>
                {brief ? null : `${t(`${a.kind}.body`, values)} `}
                {!brief &&
                a.kind === "usage_anomaly" &&
                Number(a.payload.weather_kwh) > 0
                  ? `${t("usage_anomaly.weather", values)} `
                  : null}
                <span className="text-muted-foreground">
                  {brief ? "" : "· "}
                  {ago(a.ts, now, locale)}
                  {a.status === "resolved" ? ` · ${t("resolved")}` : ""}
                </span>
                {onFeedback && a.kind === "usage_anomaly" ? (
                  <AlertFeedback
                    id={a.id}
                    given={a.feedback}
                    onFeedback={onFeedback}
                  />
                ) : null}
              </>
            ),
          } as const
          return onSeen && a.status === "open" ? (
            <SeenAlert key={a.id} id={a.id} onSeen={onSeen} {...props} />
          ) : (
            <Alert key={a.id} {...props} />
          )
        })}
      </div>
    </Tile>
  )
}
