"use server"

import { z } from "zod"

import { requirePermission } from "@/lib/dal"
import { isExpectedDataError } from "@/lib/errors"

import { acknowledgeAlert } from "./server"

/** Marks an alert seen. Already gone (resolved and pruned, another home's): nothing to do. */
export async function acknowledgeAlertAction(id: string) {
  const { accessToken } = await requirePermission("account:view")
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return
  try {
    await acknowledgeAlert(accessToken, parsed.data)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
  }
}
