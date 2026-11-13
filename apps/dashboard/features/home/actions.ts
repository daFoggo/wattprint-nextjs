"use server"

import { requirePermission } from "@/lib/dal"

import { HomeSettingsSchema } from "./schemas"

type Patch = Record<string, string | boolean>

/**
 * Saves the changed settings: authorize, then validate (the form checks first; this is the trust boundary).
 * shortcut: no endpoint stores them yet (PATCH /homes/current), so the checked values are returned, not kept;
 * add the write and `updateTag` here when it exists.
 */
export async function saveHomeSettingsAction(patch: Patch): Promise<Patch> {
  await requirePermission("account:view")
  const parsed = HomeSettingsSchema.partial().safeParse(patch)
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message)
  return patch
}
