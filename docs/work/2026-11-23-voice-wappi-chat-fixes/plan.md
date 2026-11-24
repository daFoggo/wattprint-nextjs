# Plan

| Step | Files | Proof |
| --- | --- | --- |
| 1 proxy on /api | apps/dashboard/proxy.ts, lib/__tests__/proxy.test.ts | test fails then passes; Playwright: access cookie dropped → chat 200 event-stream |
| 2 session code | features/copilot/components/copilot-provider.tsx | read |
| 3 drafts per thread | features/copilot/components/copilot-composer.tsx | Playwright drafts.cjs (new/old/new) |
| 4 dictation label | packages/ui/src/lib/hairline-messages.ts, hairline/patch.mjs | screenshots 375/1440 |
| 5 gestures | features/copilot/moods.ts, __tests__/moods.test.ts, wappi-avatar.tsx | test |
| 6 voice stage | hairline/items.json, hairline/patch.mjs, voice-mode.tsx | screenshots idle/listen/think/speak, dark 1440 + light 375 |
| 7 watch statuses | features/copilot/actions.ts, __tests__/actions.test.ts, .claude/rules/dashboard-data.md | test |

Standards: .claude/rules/dashboard-data.md, auth.md, ui.md, vendored-ui.md, i18n.md.
