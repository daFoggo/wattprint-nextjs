"use server"

import { refresh } from "next/cache"
import { getLocale, getTranslations } from "next-intl/server"
import { z } from "zod"

import { DASHBOARD_PATH } from "@/config/routes"
import { redirect } from "@/i18n/navigation"
import { requirePermission } from "@/lib/dal"
import { isExpectedDataError } from "@/lib/errors"

import {
  HomePatchSchema,
  PreferencesPatchSchema,
  type SaveResult,
} from "./schemas"
import { acceptInvite, patchHome, patchPreferences } from "./server"

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

const JOIN_REFUSALS = [
  "invite_invalid",
  "already_has_home",
  "guest_cannot_join",
  "invite_rate_limited",
  "demo_home_read_only",
] as const

/** Joins a home with its invite code, then opens the dashboard on it; a refusal comes back as words. */
export async function acceptInviteAction(
  code: string
): Promise<{ error: string } | void> {
  const { accessToken } = await requirePermission("account:view")
  const t = await getTranslations("home.join.errors")
  const valid = z.string().trim().min(1).max(32).safeParse(code)
  if (!valid.success) return { error: t("invite_invalid") }
  try {
    await acceptInvite(accessToken, valid.data)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
    const refused = (error.body as { code?: string } | undefined)?.code
    return { error: t(JOIN_REFUSALS.find((c) => c === refused) ?? "other") }
  }
  refresh() // the layouts too: the sidebar shows the new home
  redirect({ href: DASHBOARD_PATH, locale: await getLocale() })
}
