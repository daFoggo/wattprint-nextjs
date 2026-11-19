"use server"

import { getTranslations } from "next-intl/server"

import { requirePermission } from "@/lib/dal"
import { isExpectedDataError } from "@/lib/errors"

import {
  HomePatchSchema,
  PreferencesPatchSchema,
  type SaveResult,
} from "./schemas"
import { patchHome, patchPreferences } from "./server"

type Patch = Record<string, string | boolean | null>

const PREFERENCES = new Set(["notify_anomaly", "notify_tier", "weekly_summary"])

/**
 * Saves the changed settings: the account's own choices, and the home's profile (the backend lets only its owner).
 * Authorize, then validate (the form checks first; this is the trust boundary).
 */
export async function saveHomeSettingsAction(
  patch: Patch
): Promise<SaveResult> {
  const { accessToken } = await requirePermission("account:view")
  const t = await getTranslations("home.settings")
  const split = (prefs: boolean) =>
    Object.fromEntries(
      Object.entries(patch).filter(([k]) => PREFERENCES.has(k) === prefs)
    )
  const home = HomePatchSchema.safeParse(split(false))
  const preferences = PreferencesPatchSchema.safeParse(split(true))
  if (!home.success || !preferences.success)
    return { ok: false, error: t("invalid") }
  try {
    if (Object.keys(home.data).length) await patchHome(accessToken, home.data)
    if (Object.keys(preferences.data).length)
      await patchPreferences(accessToken, preferences.data)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
    const code = (error.body as { code?: string } | undefined)?.code
    return {
      ok: false,
      error:
        code === "home_owner_required"
          ? t("ownerOnly")
          : code === "unknown_province"
            ? t("provinceInvalid")
            : t("invalid"),
    }
  }
  return { ok: true }
}
