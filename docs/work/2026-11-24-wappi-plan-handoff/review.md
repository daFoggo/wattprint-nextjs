# Review: Wappi's plans hand off to the plan page

Bases: wattprint-backend 9df6724b5fa45a56fb3a5c26549b1de315f3b340 (snapshot), wattprint-web
42ade52bfd39e1c5131c1190cac550ddf6e8eaff (snapshot).

## R1 (full, opus)
Backend package snapshot: ea929eb39a750a8a9b82e76266f879b7005a7209. Web package snapshot:
8c3f99acd5e7ea2ef07ab08c5c570f736c50c336 (plus the widget's link and figure styling after it).

Web, verdict fix 1, 2:
1. Must: `?add=` read once in the builder's `useState`; Wappi's panel stays open on the plan page, so a click there
   only changes the search params and picks nothing. Fixed: `PlanBuilder` keyed by the ids (`savings-plan.tsx`).
   Checked in the browser (no component test harness in the app): on `/dashboard/plan`, before 0/3, Wappi's card
   clicked in the panel, after 2/3.
2. Should: a third copy of the advice keys in the copilot schema. Fixed: `config/advice.ts` `DEVICE_ADVICE`, read by
   billing, plan (`PLAN_KEYS` = it + `always_on`) and copilot.
3. Minor: hand-written `<dl>` beside the file's `Stats`. Fixed: `Stats` (kWh and ₫ as two figures).
4. Minor: "Wappi gợi ý" in the gone notice, also shown for a device page's link. Fixed: "được chọn sẵn".

Backend, verdict ship; Minors fixed: the read-only error, comment, `chat.py` comment and `docs/keycloak-auth.md` no
longer say plans cannot be saved; the viewer test is a plain `create_watch` test.

## R2 (scoped, sonnet)
Backend package `--since` ea929eb (snapshot 59484af); web package `--since` 8c3f99a (snapshot f6094d2).
All six R1 findings addressed; verdict ship. Its one Minor (a comment's indent in `savings-plan.tsx`) fixed with
prettier. Loop closed at R2.

After the loop: the full backend suite found `tests/test_copilot_widgets.py` still round-tripping the old `plan`
widget (no reviewer ran the whole suite); its fixture now has the new shape (38 passed).
