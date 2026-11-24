# Intent: Bất thường và dự báo theo từng thiết bị
Author: project owner. Status: accepted (2026-11-23, "tôi muốn phát triển 2 tính năng chính đó", "ok. Chạy theo plan đó", "ok chọn (a)").
Source: conversation 2026-11-22/23, after wave 1 of docs/work/2026-11-21-ai-forecast-anomaly.
Record: none

## Problem
Owner: "Phần anomaly detection tôi vẫn chưa thực sự ưng. Tôi muốn nó sẽ phát đi cảnh báo với những thiết bị có dữ
liệu lệch bất thường so với cùng các insight ở trong quá khứ." Wave 1 alerts on the whole home only.
Owner: "Phần forecast thì tôi nghĩ nó cần là một tính năng lớn hơn: dựa vào các yếu tố tác động nó sẽ dự đoán giá trị
cho tương lai, kèm giải thích và đưa ra độ chắc chắn. Cùng với đó là đưa ra lời khuyên để sử dụng như nào cho tối ưu.
Cần chi tiết đến mức từng thiết bị." Wave 1 forecasts the whole home's bill only.

## Proposed outcome
1. Device anomaly: an alert when a device behaves unlike itself in the same context (how long, how much, when it runs).
2. Device forecast: per device, the coming days and the cycle's end in kWh and ₫ with a range, the reasons, how sure,
   and advice with its computed saving.

## Affected users and systems
Members of demo homes. wattprint-backend `expect`, `insight`, `energy`, `copilot`, scripts (scenarios, replay);
wattprint-web device page, Statistics, Overview, Wappi.

## Constraints
- Per-device figures from NILM output only; exception (owner, 2026-11-23, option a): the simulated heater of home
  5-heat gets its own device series, labelled simulated.
- Honest certainty: a device model that does not beat a simple baseline in its backtest shows no forecast (wave 1's
  lesson: the home model lost on 2 of 3 homes).
- Tiered tariff, no time-of-use: advice saves by fewer kWh or by staying under a tier, never by shifting hours.
- NILM revises the newest ~30 minutes: device anomalies read only analysed (final) estimates.
- Two changes, in this order: device anomaly, then device forecast and advice.

## Open questions
None blocking; the BA calls are in spec.md §8.
