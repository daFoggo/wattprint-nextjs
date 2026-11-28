# Privacy page (Đ6), spec and plan

Source: wattprint-backend `docs/work/2026-11-28-privacy-load-data/spec.md` R5.1-R5.3. Lane M. No member block (backend
not built), retention shown as the API reports it.

## Design (app screen, house system)
One column of four `Tile`s under `PageHead`: what is kept (four steps, finest first), sent outside (one switch row per
service, 30-day log behind a button), delete (three rows, each with a dialog naming the loss), how AI uses the data.

## Plan
- `features/privacy`: schemas, server, queries, actions, blocks; test for the erase date and the log grouping.
- `app/.../settings/privacy`: page, plus the two blocks that also need the chat or auth features.
- Chat provider: `saveConsent` (chat follows the switch) and `deleteAll` (clears the thread list).
- Links: Settings page head, account menu (the menu now closes on navigation).
- Follow-up feedback: the way in from Settings is a full-width link card at the top (`privacy-entry.tsx`).

## Checked (dev 11092, demo guest REFIT House 2)
Both entry points (phone menu too); Wappi switch on via the invite, off with the chat open (chat asks again); email
on/off and after reload; log; chats deleted and gone from the thread list; account dialog opened only; 375/768/1024
without horizontal scroll; English. Not tried: owner view (history erase, level switch), voice switch, account delete.

## Open, outside this change
- Backend `consent_enforced` is False: a switch off is not yet refused server-side (email is sent regardless).
- `copilot_llm_order` falls back to AstralX for chat; the Wappi consent wording names only OpenRouter.
