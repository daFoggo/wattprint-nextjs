"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"

import { Combobox } from "@workspace/ui/components/hairline/combobox"
import {
  SettingsForm,
  SettingsFormError,
  type SettingsSection,
  type SettingsValues,
} from "@workspace/ui/components/hairline/settings-form"

import type { Home, Preferences, Province, SaveResult } from "../schemas"

type Patch = Record<string, string | boolean | null>
type Save = (patch: Patch) => Promise<SaveResult>

/** A number field's check: empty when `optional`, else a whole or decimal number within [min, max]. */
const within =
  (min: number, max: number, message: string, optional = false) =>
  (value: string) => {
    if (optional && value.trim() === "") return null
    const n = Number(value)
    return Number.isFinite(n) && n >= min && n <= max ? null : message
  }

/** The action's refusal becomes the form's: the edit stays and the reason shows under the field. */
const saving = (action: Save) => async (patch: SettingsValues) => {
  const result = await action(patch)
  if (!result.ok) throw new SettingsFormError(result.error)
}

/**
 * The home's settings (Sense's Settings): the home, where it is, its bill (owner only) and what this account is
 * told about. Switches save as they change; text edits gather into one bar. Takes the Server Action as `action`.
 */
export function HomeSettingsForm({
  home,
  preferences,
  provinces,
  action,
  className,
}: {
  home: Home
  preferences: Preferences
  provinces: Province[]
  action: Save
  className?: string
}) {
  const t = useTranslations("home.settings")
  const owner = home.role === "owner"
  const values: SettingsValues = Object.fromEntries(
    Object.entries({ ...home, ...preferences }).map(([k, v]) => [
      k,
      typeof v === "boolean" ? v : v === null ? "" : String(v),
    ])
  )
  const notify: SettingsSection = {
    title: t("notify"),
    description: t("notifyHint"),
    fields: [
      { type: "toggle", name: "notify_anomaly", label: t("anomaly") },
      { type: "toggle", name: "notify_tier", label: t("tier") },
      { type: "toggle", name: "weekly_summary", label: t("weekly") },
    ],
  }
  const homeSections: SettingsSection[] = [
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
            { value: "", label: t("unset") },
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
          placeholder: t("areaPlaceholder"),
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
      ],
    },
  ]
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {owner ? (
        <HomeLocation home={home} provinces={provinces} action={action} />
      ) : (
        <p className="rounded-3xl border border-border px-4 py-3 text-sm text-muted-foreground md:px-5">
          {t("memberNote", { name: home.name })}
        </p>
      )}
      <SettingsForm
        defaultValue={values}
        onSave={saving(action)}
        autosave
        warnOnLeave
        sections={owner ? [...homeSections, notify] : [notify]}
      />
    </div>
  )
}

/** Where the home is: the weather, and later the forecast, are read for this province. */
function HomeLocation({
  home,
  provinces,
  action,
}: {
  home: Home
  provinces: Province[]
  action: Save
}) {
  const t = useTranslations("home.settings")
  const options = provinces.map((p) => ({ value: p.code, label: p.name }))
  const [value, setValue] = useState(
    options.find((o) => o.value === home.province_code) ?? null
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <section className="grid gap-3 rounded-3xl border border-border px-4 py-4 md:px-5 md:py-5">
      <div className="min-w-0">
        <h3 className="text-sm font-medium">{t("location")}</h3>
        <p className="mt-0.5 text-xs leading-normal text-muted-foreground">
          {t("locationHint")}
        </p>
      </div>
      <div className="min-w-0">
        <Combobox
          label={t("location")}
          options={options}
          value={value}
          placeholder={t("provincePlaceholder")}
          searchPlaceholder={t("provinceSearch")}
          disabled={pending}
          onValueChange={(next) => {
            const before = value
            setValue(next)
            setError(null)
            start(async () => {
              const result = await action({
                province_code: next?.value ?? null,
              })
              if (!result.ok) {
                setValue(before)
                setError(result.error)
              }
            })
          }}
          clearable
        />
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
