# Plan

1. copilot.json vi/en (Standards: .claude/rules/i18n.md).
2. schemas.ts (`sent`, Consent), server.ts + actions.ts (consents, feedback share_content), test.
3. provider: consents state, `ask`, 403 handling; components/consent-dialog.tsx (Standards: ui.md).
4. thread (EmptyState gate, notice), composer (voice gate), voice-mode (403), message (sent disclosure, 👎 panel).
5. lint, tsc, vitest, click-through on 11092.
