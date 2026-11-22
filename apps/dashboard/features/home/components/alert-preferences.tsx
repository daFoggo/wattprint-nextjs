"use client"

import { useTranslations } from "next-intl"

import {
  SettingsForm,
  SettingsFormError,
  type SettingsValues,
} from "@workspace/ui/components/hairline/settings-form"

import type { Preferences, SaveResult } from "../schemas"

/** The alerts the system raises on its own (unusual use, a price tier ahead): on or off, saved as flipped. */
export function AlertPreferences({
  preferences,
  action,
}: {
  preferences: Preferences
  action: (
    patch: Record<string, string | boolean | null>
  ) => Promise<SaveResult>
}) {
  const t = useTranslations("home.settings")
  return (
    <SettingsForm
      defaultValue={{
        notify_anomaly: preferences.notify_anomaly,
        notify_tier: preferences.notify_tier,
      }}
      onSave={async (patch: SettingsValues) => {
        const result = await action(patch)
        if (!result.ok) throw new SettingsFormError(result.error)
      }}
      autosave
      sections={[
        {
          title: t("notify"),
          description: t("notifyHint"),
          fields: [
            { type: "toggle", name: "notify_anomaly", label: t("anomaly") },
            { type: "toggle", name: "notify_tier", label: t("tier") },
          ],
        },
      ]}
    />
  )
}
