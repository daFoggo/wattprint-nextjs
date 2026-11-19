"use client"

import type { ComponentProps } from "react"

import { Alert } from "@workspace/ui/components/hairline/alert"

/** An open alert whose ✕ marks it seen on the backend; it folds away at once and stays off the Overview. */
export function SeenAlert({
  id,
  onSeen,
  ...props
}: Omit<ComponentProps<typeof Alert>, "onDismiss"> & {
  id: string
  onSeen: (id: string) => Promise<void>
}) {
  return <Alert {...props} onDismiss={() => void onSeen(id)} />
}
