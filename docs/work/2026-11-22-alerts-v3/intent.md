# Intent: Alerts v3, a page with one flow

Source: owner feedback 2026-11-22, after alerts-v2 shipped.
Record: none

## In the owner's words

- "trang cảnh báo nhìn qua có chart tưởng ghê nhưng thực tế khó dùng khó hiểu kinh khủng, xem tư duy lại từ đầu, ko
  phụ thuộc ui đang có nữa, tư duy lại luồng giao diện của việc trang cảnh báo là gì, là người dùng muốn thao tác,
  thấy cái gì, kết quả gì"
- "giao diện trang cảnh báo khó dùng kiểu gì ấy, nó ko có 1 flow nhất định mà mọi thứ nằm cùng 1 mặt"
- Picked direction A ("what happened" first, then what is being watched, add through templates) and: "xử lí sao để UI
  thành flow và gọn gàng, dễ hiểu, như trang thiết bị chẳng hạn, chứ đừng nhét mọi thứ vào, ví dụ phần chọn thiết bị
  để cảnh báo thay vì list hết ra thì chỉ cần 1 nút thêm mới kèm ui tạo mới, đừng đặt hết ra ngoài mặt trang, làm sao
  để tối giản, dễ hiểu, vì càng nhiều thông tin 1 lúc trong dashboard càng khiến người dùng rối"
- "cứ làm theo tự đề xuất đến khi xong": the owner handed over the remaining decisions.

## Outcome

A household member opens Alerts and, without reading instructions, can answer three questions in order:
1. What did WattPrint tell me lately? (the alerts that fired, newest first, each with what to do next)
2. What is it watching for me? (one short list: the automatic alerts and the ones I set, each removable)
3. How do I add one? (one button, a short guided panel, a sentence I can read back, a preview from my own data)

## Who and what it touches

- Users of the dashboard (Vietnamese households, demo homes REFIT 2 and 5).
- wattprint-web `apps/dashboard`: the Alerts page, `features/insight` components, i18n. The backend already has every
  alert kind and watch metric needed: no backend change.

## Constraints

- Hairline UI first; sheets for "more than a row" (docs/design-system.md, Detail sheets); money first (₫ with kWh).
- sdlc lane L; tests first for new logic; signed-in check at 375/1440, both themes.

## Research (2026-11-22)

Ranked jobs users hire home-energy alerts for: bill shock and the next tier (EVNHANOI threshold alert, Sense goals,
utilities' projected-bill alerts); appliance left on (Emporia "Oven left on", Sense custom device alerts); unusual
usage; something broken; always-on creep. Complaints: too many alerts, false device alerts, raw kW forms. Best flows:
a history feed first and the rule list behind it (Emporia), rules as sentences with chips, presets with defaults.
