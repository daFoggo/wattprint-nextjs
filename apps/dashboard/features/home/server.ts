import "server-only"

import { z } from "zod"

import { apiFetch } from "@/lib/http"

import {
  HomeSchema,
  PreferencesSchema,
  ProvinceSchema,
  type Preferences,
} from "./schemas"

const json = (body: unknown) => ({
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
})

export async function fetchHome(token: string) {
  return HomeSchema.parse(await apiFetch("/homes/current", { token }))
}

export async function patchHome(token: string, patch: Record<string, unknown>) {
  return HomeSchema.parse(
    await apiFetch("/homes/current", { token, method: "PATCH", ...json(patch) })
  )
}

export async function fetchPreferences(token: string) {
  return PreferencesSchema.parse(
    await apiFetch("/users/me/preferences", { token })
  )
}

export async function patchPreferences(
  token: string,
  patch: Partial<Preferences>
) {
  return PreferencesSchema.parse(
    await apiFetch("/users/me/preferences", {
      token,
      method: "PATCH",
      ...json(patch),
    })
  )
}

/** The province catalog is public reference data. */
export async function fetchProvinces() {
  return z.array(ProvinceSchema).parse(await apiFetch("/homes/provinces"))
}
