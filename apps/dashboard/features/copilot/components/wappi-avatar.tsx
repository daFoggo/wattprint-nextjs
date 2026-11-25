"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useSyncExternalStore } from "react"
import type { AvatarHandle } from "@bible-strong/avatar-react"

import { cn } from "@workspace/ui/lib/utils"

import { answerState, GESTURES, MOODS } from "../moods"
import { useCopilot } from "./copilot-provider"

// Wappi's character is shared with the landing (@workspace/ui-patterns/wappi). Which state it plays is moods.ts's choice.
// The renderer draws nothing on the server, so it loads on its own after hydration instead of in the layout's chunk that
// every dashboard page waits on (Lighthouse, mobile: about a second of script in front of the page's LCP).
const Wappi = dynamic(
  () => import("@workspace/ui-patterns/wappi").then((m) => m.Wappi),
  { ssr: false }
)

// The character fills about 60 % of its box: a box reads as a glyph about two thirds its size.
const SIZE = { sm: 16, md: 24, lg: 32, card: 40, xl: 72 } as const

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
 * to the pointer. Changing to a state with a GESTURES line plays that beat once. A number `size` is in px (voice mode
 * sizes it to its stage). The renderer needs `window`: on the server (and before hydration) the box stays empty at its size.
 */
export function WappiAvatar({
  size = "md",
  state = MOODS.idle,
  live = false,
  follow = false,
  className,
}: {
  size?: keyof typeof SIZE | number
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
  const px = typeof size === "number" ? size : SIZE[size]
  const avatar = useRef<AvatarHandle>(null)
  // Only a change of state plays its beat: a page of past answers (all "approving", say) mounts still.
  const shown = useRef(state)
  useEffect(() => {
    if (shown.current === state) return
    shown.current = state
    const gesture = GESTURES[state]
    if (gesture) avatar.current?.poke(gesture)
  }, [state])
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0", className)}
      style={{ width: px, height: px }}
    >
      {client ? (
        <Wappi
          ref={avatar}
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
