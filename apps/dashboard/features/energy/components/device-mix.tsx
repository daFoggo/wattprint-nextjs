"use client"

import { useState } from "react"

import { DonutChart } from "@workspace/ui/components/hairline/donut-chart"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { DEMO_DEVICES_TODAY, DEMO_DEVICES_WEEK } from "../demo"

const VIEWS = {
  today: {
    data: DEMO_DEVICES_TODAY,
    center: "Today so far",
    unit: "kWh",
    digits: 1,
  },
  week: {
    data: DEMO_DEVICES_WEEK,
    center: "Last 7 days",
    unit: "kWh",
    digits: 1,
  },
}

/** Where the power goes, today so far or over the last 7 days (kWh), like Sense's device view. Sample data until NILM runs. */
export function DeviceMix({ className }: { className?: string }) {
  const [view, setView] = useState<keyof typeof VIEWS>("today")
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
            { value: "today", label: "Today" },
            { value: "week", label: "Week" },
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
