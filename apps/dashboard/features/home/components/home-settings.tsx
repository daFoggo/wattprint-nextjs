"use client"

import { useTranslations } from "next-intl"

import {
  SettingsForm,
  type SettingsValues,
} from "@workspace/ui/components/hairline/settings-form"

import type { HomeSettings } from "../schemas"

type Patch = Record<string, string | boolean>

/** A number field's check: empty when `optional`, else a whole or decimal number within [min, max]. */
const within =
  (min: number, max: number, message: string, optional = false) =>
  (value: string) => {
    if (optional && value.trim() === "") return null
    const n = Number(value)
    return Number.isFinite(n) && n >= min && n <= max ? null : message
  }

/**
 * The home's settings (Sense's Settings): the home, its bill and what to be told about. Switches save as they
 * change; text edits gather into one bar. The form takes the Server Action as `action`.
 */
export function HomeSettingsForm({
  settings,
  action,
  className,
}: {
  settings: HomeSettings
  action: (patch: Patch) => Promise<Patch>
  className?: string
}) {
  const t = useTranslations("home.settings")
  const values: SettingsValues = Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [
      k,
      typeof v === "boolean" ? v : v === null ? "" : String(v),
    ])
  )
  return (
    <SettingsForm
      className={className}
      defaultValue={values}
      onSave={action}
      autosave
      warnOnLeave
      sections={[
        {
          title: t("home"),
          description: t("homeHint"),
          fields: [
            { type: "text", name: "name", label: t("name"), maxLength: 255 },
            {
              type: "choice",
              name: "home_type",
              label: t("homeType"),
              options: [
                { value: "apartment", label: t("apartment") },
                { value: "house", label: t("house") },
                { value: "other", label: t("other") },
              ],
            },
            {
              type: "text",
              name: "floor_area_m2",
              label: t("area"),
              placeholder: t("areaPlaceholder"),
              inputMode: "decimal",
              validate: within(1, 10_000, t("areaInvalid"), true),
            },
            {
              type: "text",
              name: "occupants",
              label: t("occupants"),
              inputMode: "numeric",
              validate: within(1, 30, t("occupantsInvalid"), true),
            },
          ],
        },
        {
          title: t("bill"),
          description: t("billHint"),
          fields: [
            {
              type: "text",
              name: "billing_cycle_day",
              label: t("cycleDay"),
              description: t("cycleDayHint"),
              inputMode: "numeric",
              validate: within(1, 28, t("cycleDayInvalid")),
            },
            {
              type: "toggle",
              name: "show_cost",
              label: t("showCost"),
              description: t("showCostHint"),
            },
          ],
        },
        {
          title: t("notify"),
          description: t("notifyHint"),
          fields: [
            { type: "toggle", name: "notify_anomaly", label: t("anomaly") },
            { type: "toggle", name: "notify_tier", label: t("tier") },
            { type: "toggle", name: "weekly_summary", label: t("weekly") },
          ],
        },
      ]}
    />
  )
}
