import { useLocale, useTranslations } from "next-intl"

import { LogStream } from "@workspace/ui/components/hairline/log-stream"

import type { Activity } from "../schemas"

/**
 * Runs as log lines, newest at the bottom: a finished run at its end, a running one at its start. On one
 * device's page (`named={false}`) the lines leave out the device and its room.
 */
export function DeviceTimeline({
  activity,
  title,
  description,
  named = true,
  className,
}: {
  activity: Activity[]
  title: string
  description: string
  named?: boolean
  className?: string
}) {
  const t = useTranslations("energy.timeline")
  const kwh = new Intl.NumberFormat(useLocale(), { maximumFractionDigits: 2 })
  const lines = activity
    .map((run) => {
      const minutes = Math.max(
        1,
        Math.round(((run.end ?? run.start) - run.start) / 60_000)
      )
      return {
        id: `${run.device}-${run.start}`,
        at: run.end ?? run.start,
        level: "info" as const,
        message:
          run.end === null
            ? t(named ? "running" : "runningSelf", { device: run.name })
            : t(named ? "ran" : "ranSelf", {
                device: run.name,
                h: Math.floor(minutes / 60),
                m: minutes % 60,
                kwh: kwh.format(run.kwh),
              }),
        source: named ? (run.room ?? undefined) : undefined,
      }
    })
    .sort((a, b) => a.at - b.at)
  return (
    <LogStream
      className={className}
      title={title}
      // The same heading as the cards beside it (components/shared/tile.tsx).
      header={
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      }
      defaultValue={lines}
      height={290}
    />
  )
}
