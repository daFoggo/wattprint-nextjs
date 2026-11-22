# Intent: Set and manage alerts by hand or through Wappi
Author: project owner. Status: accepted (2026-11-20, "cứ cho người dùng khả năng làm tùy ý họ muốn, flex lên";
2026-11-21 "tiếp tục").
Source: conversation 2026-11-20, Sense reference frames 09, 20, 21 (read-only/wattprint-document/_archive).
Record: none

## Problem
A user can ask Wappi to watch a figure ("tell me when this month's bill passes 1 million"), but the web has no
place to see, set or cancel those alerts. After Wappi saves one, the chat gives no way to reach it. Sense offers
alerts from a device's settings, from a Goals card and from Settings; Wattprint offers them only by voice or chat.

## Proposed outcome
- One alerts page lists every alert the user set (active first), with its condition, the latest value and its
  state, and lets them cancel it or set a new one with a form.
- A device's page shows that device's alerts and sets one for it, with the device filled in, and links to the page.
- When Wappi saves an alert, the answer shows a card with it and a link straight to it on the alerts page.
- Both ways (form and Wappi) create the same kind of alert, so each shows up everywhere.

## Affected users and systems
Every signed-in member of a home. wattprint-backend `insight` (watches route, schema) and `copilot` (the
`create_watch` tool's widget); wattprint-web `features/insight`, `features/copilot`, a new route, the device page,
the sidebar.

## Constraints
- Alerts stay per user per home, at most 10 active (`MAX_ACTIVE`); the backend's checks in `create_watch` are the
  single source of what is allowed.
- Builds on the uncommitted Watch work and on the widget registry (docs/work/2026-11-20-copilot-widgets).
- Out of scope: "tell me when a device turns on/off" (Sense's basic notifications); editing an alert in place
  (cancel and set again); a free-form question in the form (Wappi handles those).

## Open questions
None blocking.
