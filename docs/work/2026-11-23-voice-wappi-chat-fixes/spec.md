# Spec

1. Voice mode (features/copilot/components/voice-mode.tsx): Hairline `VoiceTalk` takes a new `visual` prop (patch.mjs)
   drawn in place of the orb; the orb import is removed from voice-talk.tsx. The visual is a `size`-px stage: Hairline
   `DitherHorizon` (new item `@hairline/voice-bar`, shape "card", colours `--chart-1`/`--primary`) fed by the session's
   `state`, `getLevel`, `getSpectrum`; Wappi (`WappiAvatar`, numeric size = 56 % of the stage) on top, its face from the
   existing phase→mood table, bobbing to `getLevel()` each frame while listening or speaking (off under reduced motion).
   The separate xl avatar above the title is dropped (it duplicated the stage).
2. Expressions that scale (features/copilot/moods.ts): `GESTURES` maps an avatar state to a catalogue gesture (nod,
   bounce, spin); `WappiAvatar` pokes it once when it arrives in that state. Test: every key is a catalogue state, every
   value a catalogue gesture, and answered/liked/celebrating have one.
3. "Có lỗi khi trả lời": root cause = proxy matcher excluded `/api`, so route handlers never refreshed the 5-minute
   access token; after it expired `/api/copilot/chat` redirected the POST to /auth/expired (307 → 405 → "other").
   Fix: the proxy runs on `/api/*` (session refresh only: no intl rewrite, no redirect; handlers still authorize).
   The client fetches the chat with `redirect: "manual"` and reads an opaque redirect as the "session" error.
4. Dictation label cut: Vietnamese "Đang chép lời" (shorter, same meaning) and a Hairline patch so the invisible timer
   and Cancel leave the layout while transcribing (they kept their width).
5. Composer draft per conversation ("" = new chat), including a held privacy warning.
6. Debt: a stored chat whose watch statuses cannot be read opens anyway (watch widgets shown live, error logged);
   rule card dashboard-data lists the exception.

## Areas of concern
- Proxy on `/api/*`: the proxy now runs before every route handler (cost: a cookie read, a refresh at most every 5 min).
  SSE responses are returned by the handler unchanged. A path like `/apiary` is no longer excluded (it is a page path
  now going through intl like any other).
- `redirect: "manual"` also turns any other redirect of /api/copilot/chat into "session".
- `pnpm hairline` strips globals.css's final newline on each run (upstream CLI); re-added by hand.
