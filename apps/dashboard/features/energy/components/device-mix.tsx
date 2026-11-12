"use client"

import { useState } from "react"

import { DonutChart } from "@workspace/ui/components/hairline/donut-chart"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { DEMO_DEVICES_NOW, DEMO_DEVICES_TODAY } from "../demo"

const VIEWS = {
  now: { data: DEMO_DEVICES_NOW, center: "Using now", unit: "W", digits: 0 },
  today: {
    data: DEMO_DEVICES_TODAY,
    center: "Today so far",
    unit: "kWh",
    digits: 1,
  },
}

/** Where the power goes, now (W) or today so far (kWh), like Sense's device view. Sample data until NILM runs. */
export function DeviceMix({ className }: { className?: string }) {
  const [view, setView] = useState<keyof typeof VIEWS>("now")
  const { data, center, unit, digits } = VIEWS[view]
  return (
    <DonutChart
      className={className}
      title="By device"
      description="Sample data until device detection runs."
      action={
        <SegmentedControl
          label="Period"
          size="sm"
          value={view}
          onValueChange={(v) => setView(v as keyof typeof VIEWS)}
          options={[
            { value: "now", label: "Now" },
            { value: "today", label: "Today" },
          ]}
        />
      }
      data={data}
      centerLabel={center}
      unit={unit}
      format={{ maximumFractionDigits: digits }}
      locales="en-US"
    />
  )
}
