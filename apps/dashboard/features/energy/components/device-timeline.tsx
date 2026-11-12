import { LogStream } from "@workspace/ui/components/hairline/log-stream"

import { demoDeviceEvents } from "../demo"

/** Device events today, newest at the bottom. Sample data until NILM runs (see demo.ts). */
export function DeviceTimeline({
  latest,
  className,
}: {
  latest: number
  className?: string
}) {
  return (
    <LogStream
      className={className}
      title="Device activity, sample"
      defaultValue={demoDeviceEvents(latest)}
      height={290}
    />
  )
}
