"use client"

import { useSyncExternalStore } from "react"
import { createAvatar } from "@bible-strong/avatar-react"

import { cn } from "@workspace/ui/lib/utils"

import { answerState, MOODS } from "../moods"
import character from "../wappi.avatar.json"
import { useCopilot } from "./copilot-provider"

// Wappi's character (features/copilot/wappi.avatar.json: a plug-headed sphere in the brand green), drawn and
// animated by @bible-strong/avatar-react (MIT). Which state it plays is moods.ts's choice.
const Wappi = createAvatar(character)

const SIZE = { sm: 16, md: 24, lg: 32, xl: 72 } as const

const subscribeNever = () => () => {}

/** Wappi's face for the conversation as a whole: a reaction, else what the latest answer is doing. */
export function useWappiState(): string {
  const { active, reaction } = useCopilot()
  if (reaction) return MOODS[reaction]
  const last = active?.messages?.at(-1)
  return last?.role === "assistant" ? answerState(last) : MOODS.idle
}

/**
 * Wappi's face: in the titles and the sidebar, on the opening screen, and beside each answer. `live` keeps it
 * moving; otherwise it plays its state, then settles (a page of past answers stays still). `follow` turns its head
 * to the pointer. The renderer needs `window`: on the server (and before hydration) the box stays empty at its size.
 */
export function WappiAvatar({
  size = "md",
  state = MOODS.idle,
  live = false,
  follow = false,
  className,
}: {
  size?: keyof typeof SIZE
  state?: string
  live?: boolean
  follow?: boolean
  className?: string
}) {
  const client = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )
  const px = SIZE[size]
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0", className)}
      style={{ width: px, height: px }}
    >
      {client ? (
        <Wappi
          state={state}
          size={px}
          settleAfterMs={live ? 0 : 3000}
          followPointer={follow}
          ariaLabel=""
        />
      ) : null}
    </span>
  )
}
