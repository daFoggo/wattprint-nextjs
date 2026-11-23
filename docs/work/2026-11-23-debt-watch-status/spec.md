# Spec: pay three debt items (lane M)

Record: docs/debt.md Open entries "alerts v3 watch widget", "T02 R1 Minors", "T02 hairline voice-talk".

1. Watch widget live status. A Wappi watch widget stored in a chat linked to `#watch-<id>` after its watch ended.
   On conversation load (`loadConversationAction`), when the chat holds a watch widget, read `/insights/watches`
   (id + status only, in features/copilot: features may not import each other) and mark widgets whose watch is
   listed as fired/expired/cancelled `ended: true`. The widget then hides the "View alert" link and shows "Ended"
   instead of the end date. Active and broken watches are still listed on the alerts page and stay live; a watch
   not in the list (newer than the read, or past its 50 rows) stays live. Live answers (streamed) are not marked.
2. Tests the T02 review asked for: LogStream `timeZone` patch formats in that zone; `getDevice` shares
   `getDevices`' read for the same bill; a room whose second device spent 0 makes the first lone and named by device.
3. Re-cut the Hairline voice-talk patch: upstream added a `tone` prop to `VoiceTalk`'s signature, the anchor of the
   useHairlineText hook patch. `pnpm --filter @workspace/ui hairline` must pass; it also brings upstream voice-orb.

## Areas of concern
- Upstream `voice-orb.tsx` rewrite (740 lines) comes in with the re-cut; the app passes `colors`, not `tone`.
- One extra backend read per opened conversation that holds a watch widget.
