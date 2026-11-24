# Intent: savings plan (kế hoạch tiết kiệm)
Author: user (cuongpd). Status: accepted. Record: none.
Source: conversation 2026-11-24. Research: [research.md](research.md)

## Problem
In the user's words: "trong read only wattprint document cũng có mô tả giả định về tính năng lập kế hoạch tiết kiệm,
tuy nhiên thì mô tả khá mơ hồ và cũng chưa chắc đã hợp với stack dự án, bài toán dự án, cơ chế,... và thực tế nhu cầu
người dùng … làm sao để thiết thực và cơ chế bài toán đáp ứng được, chỉ dựa trên data nilm thu được, tránh bị tình
trạng như tính năng dự báo bất thường kia làm sai bài toán."

What exists today:
- A plan is only a widget in the Wappi chat. The LLM writes its kWh, and its money is priced at the average rate.
- It is measured on the whole home over 14 days before and after, with no weather adjustment.
- No one can see the result.
- The document's flagship example (AC plus water heater) does not exist in the demo homes.

## Proposed outcome
A savings plan page in the dashboard, reached from Wappi, the device pages and the bill page:
1. **Opportunities:** actions found in this home's own NILM data, each with a kWh and đ range priced at the marginal
   tier, and a confidence level.
2. **Make a plan:** pick one to three actions, each with an if-then commitment. See the cycle's bill with and without
   the plan, and the tier it avoids. Be warned when the goal is too small to measure.
3. **Follow and verify:** the plan runs to the end of the billing cycle with a weekly check-in. Actual use is compared
   with the weather-adjusted expected use, as a band. The app says "chưa đủ dữ liệu" until the effect can be measured,
   and checks the planned devices and the whole home separately, so rebound shows.

## Affected users and systems
- Households on the web dashboard, including read-only demo viewers.
- `apps/dashboard`: a new feature folder; links from copilot, billing, energy and the device page.
- The backend is read only. No new endpoint.

## Constraints
- Web-only prototype; the backend is not changed.
- Use real data wherever an existing API gives it, and keep the mocked part as small as possible (user answer).
- The plan runs for the billing cycle with weekly check-ins (user answer).
- Rules carried over: numbers never come from the LLM; kWh is always paired with đ; no time-shifting advice; per-device
  numbers come from NILM; simulated data is labelled; uncertainty is shown as a range.
- Out of scope:
  - Backend storage of plans.
  - Changing Wappi's `propose_plan` tool.
  - The Expo app.
  - Push reminders.

## Open questions
- Where the plan lives without a backend: in the browser (this proposal). The backend endpoint that replaces it is
  future work for the backend owner.
