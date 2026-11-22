"use client"

import { useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { Switch } from "@workspace/ui/components/hairline/switch"
import { toast } from "@workspace/ui/components/hairline/toast-stack"

import type { SaveResult } from "../actions"

const KEYS = ["notify_anomaly", "notify_tier"] as const

/** The alerts WattPrint raises by itself (unusual use, a price tier ahead), as rows of the watched list: on or off. */
export function AutoAlerts({
  preferences,
  save,
}: {
  preferences: Record<(typeof KEYS)[number], boolean>
  save: (patch: Record<string, boolean>) => Promise<SaveResult>
}) {
  const t = useTranslations("insight.auto")
  return (
    <ul className="flex flex-col divide-y divide-border">
      {KEYS.map((key) => (
        <li
          key={key}
          className="flex items-start justify-between gap-3 py-4 first:pt-0"
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-sm font-medium">{t(`${key}.title`)}</p>
            <p className="text-xs text-muted-foreground">{t(`${key}.hint`)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone="neutral" outline>
              {t("tag")}
            </Badge>
            <Switch
              defaultChecked={preferences[key]}
              onCheckedChange={async (on) => {
                const result = await save({ [key]: on })
                if (!result.ok) {
                  toast.error(result.error)
                  throw new Error(result.error) // the switch flips back
                }
              }}
              aria-label={t(`${key}.title`)}
              size="sm"
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
