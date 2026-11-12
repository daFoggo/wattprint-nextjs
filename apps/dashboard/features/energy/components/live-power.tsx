"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  LiveLineChart,
  type LivePoint,
} from "@workspace/ui/components/hairline/live-line-chart"

import { PowerSchema } from "../schemas"

const WINDOW = 5 * 60_000 // ~40 samples at REFIT's ~7 s cadence; the stream opens with this backlog
const KEEP = 80
const RETRY_FIRST = 10_000
const RETRY_MAX = 5 * 60_000

/**
 * The live power tile (option A of the backend plan
 * wattprint-backend/docs/superpowers/plans/2026-11-12-data-pipeline-live-dashboard.md): one
 * EventSource per page feeds the line. No other tile on the Overview changes within the day,
 * so a sample does not refresh the route.
 */
export function LivePower({ className }: { className?: string }) {
  const router = useRouter()
  const [points, setPoints] = useState<LivePoint[]>([])
  const [, startRefresh] = useTransition()

  useEffect(() => {
    let source: EventSource
    let retry = 0
    let wait = RETRY_FIRST
    let newest = 0 // a reconnect resends the backlog: skip what is already shown
    const open = () => {
      source = new EventSource("/api/energy/stream")
      source.onopen = () => (wait = RETRY_FIRST)
      source.addEventListener("reading", (event) => {
        let reading
        try {
          reading = PowerSchema.safeParse(JSON.parse(event.data))
        } catch {
          return // a malformed frame: skip it, the next sample comes in seconds
        }
        if (!reading.success) return
        const t = Date.parse(reading.data.ts)
        if (t <= newest) return
        newest = t
        setPoints((prev) => [
          ...prev.slice(-KEEP),
          { t, value: reading.data.watts },
        ])
      })
      // A non-200 answer (expired session, backend down) closes it for good: refresh renews the
      // session through proxy.ts, then reopen, waiting twice as long after each failure.
      source.onerror = () => {
        if (source.readyState !== EventSource.CLOSED) return
        retry = window.setTimeout(() => {
          startRefresh(() => router.refresh())
          open()
        }, wait)
        wait = Math.min(wait * 2, RETRY_MAX)
      }
    }
    open()
    return () => {
      source.close()
      window.clearTimeout(retry)
    }
  }, [router])

  return (
    <LiveLineChart
      className={className}
      data={points}
      window={WINDOW}
      label="Using now"
      unit="W"
      format={{ maximumFractionDigits: 0 }}
      locales="en-US"
      height={230}
    />
  )
}
