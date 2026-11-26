# Deleting a Wappi chat must stick (lane M)

Goal: a chat deleted from Wappi's history stays deleted. Problem (user report "xóa hội thoại không được"): reproduced
on prod as a demo guest — a chat deleted and then left within the 5 s undo window (in-app navigation, closing the
mobile history sheet, reload or closing the tab) came back; deleting and staying on the page worked.

Root cause: Hairline `ChatHistory` holds a delete in its undo window with a timer; its unmount cleanup cleared every
pending timer, so leaving dropped the delete. A reload or closed tab never runs that cleanup, and a Server Action
fired while the page unloads is cancelled with it (seen: no action reached the server).

Requirements
1. Leaving the history (unmount) or the page (`pagehide`) commits every delete still in its undo window or row fold.
2. Undo works as before inside the window; once the row folds, Undo no longer cancels it.
3. The delete request survives page unload: `fetch(..., { keepalive: true })` to a new Route Handler
   `DELETE /api/copilot/conversations/[id]` (authorize with `requirePermission`, Zod-validate the id, pass backend
   errors on with `failure`); the Server Action `deleteConversationAction` is removed (no second path).
4. A failed delete (non-2xx, or an ended session's redirect) reloads the list from the backend, as before.

Vendored file: the fix is a patch in `packages/ui/hairline/patch.mjs` (applied with `node patch.mjs`), listed in
docs/design-system.md's patch table.

Tests: `app/api/copilot/__tests__/conversation-route.test.ts` (route), `e2e/copilot-history.spec.ts` (real flow as a
demo guest: in-app navigation and reload right after a delete; failed on prod before the fix).

## Areas of concern
- `useEffectEvent` called from an unmount cleanup and a `pagehide` listener (React 19.3).
- A reload's list read could in principle run before the keepalive DELETE commits (seen only on a cold dev route).
- bfcache: `pagehide` commits pending deletes even when the page is only cached, not closed.
