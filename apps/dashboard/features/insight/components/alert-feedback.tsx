"use client"

import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { Button } from "@workspace/ui/components/hairline/button"

import type { Verdict } from "../schemas"

/** Under a model alert: was it right? A "not an anomaly" makes this kind of alert less eager for the home. */
export function AlertFeedback({
  id,
  given,
  onFeedback,
}: {
  id: string
  given: Verdict | null
  onFeedback: (id: string, verdict: Verdict) => Promise<void>
}) {
  const t = useTranslations("insight.alerts.feedback")
  const [done, setDone] = useState(given)
  const [pending, start] = useTransition()
  if (done)
    return (
      <span className="block pt-2 text-sm text-muted-foreground">
        {t(done === "useful" ? "thanks" : "noted")}
      </span>
    )
  const send = (verdict: Verdict) =>
    start(async () => {
      await onFeedback(id, verdict)
      setDone(verdict)
    })
  return (
    <span className="flex flex-wrap gap-2 pt-2">
      <Button
        size="xs"
        variant="outline"
        disabled={pending}
        onClick={() => send("useful")}
      >
        {t("useful")}
      </Button>
      <Button
        size="xs"
        variant="ghost"
        disabled={pending}
        onClick={() => send("not_anomaly")}
      >
        {t("notAnomaly")}
      </Button>
    </span>
  )
}
