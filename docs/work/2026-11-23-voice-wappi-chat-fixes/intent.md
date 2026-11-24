# Intent: Wappi in voice mode, chat fixes, watch-status debt

Record: user request 2026-11-23 (chat session). Approval: the user set the direction in the request; lane stepped up
to L because `apps/dashboard/proxy.ts` (riskyPaths) is the root cause of one bug.

- Problem (user's words, paraphrased): the Hairline voice orb looks bad after the upstream update: put Wappi where the orb
  is, with expressions that scale, using Hairline's dither look (voice-bar / dither-veil). While testing: "Đang chuyển
  thành chữ" is cut off after pressing stop; the AI answered "Có lỗi khi trả lời"; the composer keeps its text across
  chat threads (clear it, or keep one per thread). Also pay the open web debt "a stored chat with a watch widget does not
  open when /insights/watches fails" and the voice-orb debt.
- Outcome: voice mode shows Wappi over a brand-green DitherHorizon driven by the voice session; Wappi's states, one-shot
  gestures and loudness bob come from data tables; the four bugs are fixed at their root.
- Touches: apps/dashboard (copilot feature, proxy), packages/ui (Hairline set + patches, vi messages).
- Constraints: vendored Hairline changes only through patch.mjs; design-system rules; both themes; 375–1440 px.
