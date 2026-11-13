import { useTranslations } from "next-intl"

import { LogStream } from "@workspace/ui/components/hairline/log-stream"

import { DEMO_EVENTS } from "../demo"

/** Device events today, newest at the bottom. Sample data until NILM runs (see demo.ts). */
export function DeviceTimeline({
  latest,
  className,
}: {
  latest: number
  className?: string
}) {
  const t = useTranslations("energy")
  // Timed back from `latest` (ms) so the sample reads as recent, oldest first.
  const lines = [...DEMO_EVENTS].reverse().map((e) => ({
    id: `${e.device}-${e.ago}`,
    at: latest - e.ago * 60_000,
    level: "info" as const,
    message: t(`demo.events.${e.event}`, {
      device: t(`demo.devices.${e.device}`),
      min: e.values?.min ?? 0,
      count: e.values?.count ?? 0,
    }),
    source: t(`demo.rooms.${e.room}`),
  }))
  return (
    <LogStream
      className={className}
      title={t("deviceTimeline.title")}
      defaultValue={lines}
      height={290}
    />
  )
}
