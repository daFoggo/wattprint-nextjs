# Shorter demo flow, demo row in the sidebar, fetch at request time

Lane M. Record: none.

## Goal
1. A visitor on the sign-in page picks a demo home in the dialog, signs in (or signs up) once, and lands straight in
   that home read-only. Before: dialog → sign in → empty dashboard → pick again.
2. The "you are viewing demo home X, read-only" strip above every page moves into the sidebar as a compact row above
   the account row (Hairline Popover: what read-only means + switch home), so it no longer shifts the page layout.
3. Fix the dev "Blocking Route: Date.now() while prerendering" on Statistics → Peers.

## Requirements
- `pickDemoHomeAction(key)`: valid key → cookie `wp-demo-home` (httpOnly, secure, lax, 10 min, path /), then the
  normal Keycloak sign-in (sign-up is a link there). A malformed key still opens sign-in, remembering nothing.
- OAuth callback: after the code exchange, a valid `wp-demo-home` is deleted and viewed with the new session's token.
  Best effort: a refusal (member of a real home, backend down) is logged and the dashboard opens anyway.
- Sign-in dialog: the home cards are the buttons (no separate sign-in button); fits 375px and 1440px without scrolling.
- Sidebar row (`SessionDemo` in the dashboard layout, `<Suspense fallback={null}>`): only for role `viewer`; eye
  icon only in the icon rail; popover lists the other demo homes, picking one calls `viewDemoHomeAction`.
- `apiResponse` awaits `io()` before `fetch`: fetch reads the clock, and with the session cached
  (`"use cache: private"`) an uncached query reaches fetch during the dev prerender validation.

## Areas of concern
- `io()` inside `"use cache"` scopes (`getProvinces`, `cachedDemoHomes`) and in Route Handlers / Server Actions:
  docs say it resolves at once there and only suspends while prerendering. Unverified for Route Handlers beyond the
  running dev app.
- The callback reads the session right after `storeTokens` set the cookies in the same request.
- `secure: true` on the pick cookie: localhost dev over http (Chrome treats localhost as secure).
