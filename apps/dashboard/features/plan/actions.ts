"use server"

import { refresh } from "next/cache"

import { requirePermission } from "@/lib/dal"
import { isExpectedDataError } from "@/lib/errors"

import { PlanCreateSchema } from "./schemas"
import { createPlan, stopPlan } from "./server"

export type PlanResult = { ok: true } | { ok: false; code: string }

/** Starts a plan: authorize, validate (the trust boundary), create; a refusal comes back as its code. */
export async function startPlanAction(input: unknown): Promise<PlanResult> {
  const { accessToken } = await requirePermission("account:view")
  const parsed = PlanCreateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, code: "invalid" }
  try {
    await createPlan(accessToken, parsed.data)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
    return {
      ok: false,
      code: (error.body as { code?: string } | undefined)?.code ?? "invalid",
    }
  }
  refresh()
  return { ok: true }
}

/** Stops the running plan; one already gone (another tab stopped it) is nothing to do. */
export async function stopPlanAction() {
  const { accessToken } = await requirePermission("account:view")
  try {
    await stopPlan(accessToken)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
  }
  refresh()
}
