"use server"

import { refresh } from "next/cache"
import { getTranslations } from "next-intl/server"
import { z } from "zod"

import { requirePermission } from "@/lib/dal"
import { isExpectedDataError } from "@/lib/errors"

import { AiHomeSchema, type AiDetail } from "./schemas"
import { deleteHistory, patchAiDetail } from "./server"

type Result = { ok: true } | { ok: false; error: string }

/** The backend's refusal as words to show; anything unexpected throws. */
async function refusal(error: unknown): Promise<Result> {
  if (!isExpectedDataError(error)) throw error
  const t = await getTranslations("privacy.refused")
  const code = (error.body as { code?: string } | undefined)?.code
  return {
    ok: false,
    error: t(
      code === "demo_home_read_only"
        ? "demo"
        : code === "home_owner_required"
          ? "owner"
          : "other"
    ),
  }
}

/** Owner only (the backend decides). */
export async function setAiDetailAction(detail: AiDetail): Promise<Result> {
  const { accessToken } = await requirePermission("account:view")
  const valid = AiHomeSchema.shape.ai_detail_effective.parse(detail)
  try {
    await patchAiDetail(accessToken, valid)
  } catch (error) {
    return refusal(error)
  }
  refresh()
  return { ok: true }
}

/** Erases the home's history before a day; `null` erases all of it. */
export async function eraseHistoryAction(
  before: string | null
): Promise<Result> {
  const { accessToken } = await requirePermission("account:view")
  // null, never a missing or empty date: those must not turn into "everything".
  const valid = z.iso.date().nullable().parse(before)
  try {
    await deleteHistory(accessToken, valid ?? undefined)
  } catch (error) {
    return refusal(error)
  }
  refresh()
  return { ok: true }
}
