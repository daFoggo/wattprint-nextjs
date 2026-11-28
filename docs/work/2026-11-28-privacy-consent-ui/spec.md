# Privacy consent UI (Đ3-W1..W6), lane L

Record: backend docs/work/2026-11-28-privacy-load-data (R3.3, R3.4, R3.6)

Intent: before Wappi or the mic sends anything outside, the user agrees once per purpose; every answer shows what left.

## Requirements
- R1 Copy in messages/{vi,en}/copilot.json first (`consent`, `sent`, `feedback`).
- R2 Consent dialog (ResponsiveDialog): purpose wappi on first Wappi open, voice on first mic / voice-mode press. Says what, to whom, where, who is responsible, where to turn off; voice also says raw audio cannot be masked. AstralX: no country (not stated in any repo doc: proposal2.md marks it unchecked). Agree = PUT granted true; "Để sau" closes.
- R3 One line under the composer; per answer a collapsed "Đã gửi ra ngoài" from `reply.sent`.
- R4 On thumbs-down a checkbox (unticked) "send content to maintainers"; rating is sent on confirm with `share_content`.
- R7 Read-aloud also needs voice consent. A failed consent read shows a retry, never "not agreed".
- R5 Not granted (or withdrawn / 403 consent_required): Hairline EmptyState in place of the chat, button opens the dialog.
- R6 A 403 `consent_required` from chat or transcribe opens the dialog (server flag is off today).

## Areas of concern
- Consent state is read lazily when the chat mounts, not on every dashboard load.
- Invite version: The backend checks the version and its list already says `granted: false` for an old one, so the UI re-asks.
- Withdraw UI belongs to the Privacy settings page (later); the provider already holds `ask`.
