import { connection } from "next/server"
import { z } from "zod"

import { deleteConversation } from "@/features/copilot/server"
import { requirePermission } from "@/lib/dal"

import { failure } from "../../respond"

/**
 * Deletes one of the caller's chats. A Route Handler, not a Server Action: the history commits a delete still in its
 * undo window when the page goes away, and only a `keepalive` fetch outlives the page.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection()
  const { accessToken } = await requirePermission("account:view")
  const id = z.uuid().safeParse((await params).id)
  if (!id.success)
    return Response.json(
      { code: "invalid", detail: "Bad conversation" },
      { status: 422 }
    )
  try {
    await deleteConversation(accessToken, id.data)
    return new Response(null, { status: 204 })
  } catch (error) {
    return failure(error)
  }
}
