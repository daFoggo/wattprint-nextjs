# Spec: Wappi's plans hand off to the plan page
Intent (user, 2026-11-24): "xử lý triệt để debt đi … có debt thì phải giải quyết triệt để cho xong". Debt entry:
"Wappi's `propose_plan` plans (tb_suggestion, LLM-written kWh, average price, 14-day before/after) are separate
from the plan page's plans. Pay: make `propose_plan` hand off to the plan page (prefill its actions)."
Status: approved by delegation. Lane L (copilot, insight jobs, web). Bases: backend snapshot 9df6724, web snapshot 42ade52.

## Requirements
1. `device_forecast`'s advice items carry `id` = `<device_id>.<key>`, the plan page's action id.
2. `propose_plan(actions: list[str])` (1–3 ids) reads `device_forecasts(now)` again and keeps the ids that are
   advice now (order kept, duplicates dropped, at most 3). None left: an error telling the model to call
   `device_forecast` and pass its ids. Every figure is the service's (`saved_kwh`, `saved_amount`), none the
   model's. It writes nothing (no `tb_suggestion` row): it is a read tool, so a demo viewer gets it too.
3. Its widget `plan`: `actions: [{id, key, device, params, kwh, vnd}]`, `kwh` (sum), `vnd` (sum of each action's
   saving, "khoảng": the plan page prices the combination). The web draws the actions with the plan page's tip
   copy and links to `/dashboard/plan?add=<id>&add=<id>…`.
4. The plan page preselects every `add` id still in its advice (up to 3); when some are gone it says so. A running
   plan ignores them (its progress shows).
5. The separate trial goes: `POST /copilot/plans/{id}/accept`, `accept_plan`, `measure_plans` (insight job), the
   web's `acceptPlan` action and the widget's approval card.

## Areas of concern
1. Old conversations hold `plan` widgets of the old shape: the web drops a widget it cannot read, never the answer,
   so they lose the card only.
2. `tb_suggestion`, `tb_suggestion_feedback`, `tb_savings_measure` stay (their rows are history; dropping tables
   deletes data and needs the user). Nothing writes them after this change.
3. The summed ₫ can differ from the plan page's combined price by a tier step; the widget calls it "khoảng" and the
   page shows the exact figure.
4. Advice can change between the chat and the click; the page drops ids that are gone and says so.
