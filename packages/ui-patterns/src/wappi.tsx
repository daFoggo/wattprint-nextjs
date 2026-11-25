"use client"

import { createAvatar, type AvatarHandle } from "@bible-strong/avatar-react"

import character from "./wappi.avatar.json"

/**
 * Wappi, the copilot's mascot: a plug-headed sphere in the brand green (wappi.avatar.json), drawn and animated by
 * @bible-strong/avatar-react (MIT). Shared by the dashboard (features/copilot/components/wappi-avatar.tsx picks its
 * state) and the landing. Avatar-core validates the character with Ajv, which needs `new Function`: each app aliases
 * `ajv/dist/2020.js` to ./ajv-browser.ts for the browser (next.config.ts).
 */
export const Wappi = createAvatar(character)

export { character as wappiCharacter }
/** What a ref on `Wappi` gives: `poke(gesture)` plays a one-off beat. */
export type WappiHandle = AvatarHandle
