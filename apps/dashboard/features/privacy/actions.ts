"use server"

import { refresh } from "next/cache"
import { getTranslations } from "next-intl/server"
import { z } from "zod"

import { requirePermission } from "@/lib/dal"
import { isExpectedDataError } from "@/lib/errors"

import { AiHomeSchema, type AiDetail, type Member } from "./schemas"
import {
  createInvite,
  deleteHistory,
  deleteMember,
  deleteMembership,
  patchAiDetail,
  patchMember,
} from "./server"

type Refused = { ok: false; error: string }
type Result = { ok: true } | Refused

/** The backend's refusal as words to show; anything unexpected throws. */
async function refusal(error: unknown): Promise<Refused> {
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

/** A one-time code to invite someone (owner only). */
export async function inviteAction(): Promise<
  { ok: true; code: string } | Refused
> {
  const { accessToken } = await requirePermission("account:view")
  try {
    const { code } = await createInvite(accessToken)
    return { ok: true, code }
  } catch (error) {
    return refusal(error)
  }
}

/** Runs one change to the household, then re-reads the page. */
async function change(run: (token: string) => Promise<void>): Promise<Result> {
  const { accessToken } = await requirePermission("account:view")
  try {
    await run(accessToken)
  } catch (error) {
    return refusal(error)
  }
  refresh()
  return { ok: true }
}

export async function setMemberDetailAction(
  userId: string,
  detail: Member["detail"]
) {
  const id = z.uuid().parse(userId)
  const valid = z.enum(["full", "daily"]).parse(detail)
  return change((token) => patchMember(token, id, valid))
}

export async function removeMemberAction(userId: string) {
  const id = z.uuid().parse(userId)
  return change((token) => deleteMember(token, id))
}

export async function leaveHomeAction() {
  return change(deleteMembership)
}
