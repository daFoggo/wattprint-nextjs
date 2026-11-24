# Plan: Change 2 — dự báo, lý do, độ chắc chắn và lời khuyên theo thiết bị

- Spec: spec.md §3 và §3.1a (sửa đổi 2026-11-24). Bỏ cảm biến: spec 2026-11-23-indoor-sensors đã hủy.
- Nơi làm: worktree `.worktrees/backend-device` và `.worktrees/web-device` (nhánh `feat/device-forecast`, từ `main`
  + Change 1 khôi phục từ `wip/device-ai-indoor-sensors`), áp sang cây chính khi session demo-view commit xong.
  Test backend: `~/.local/state/wattprint/wt-test.sh` (container riêng, cùng DB test).

| # | Bước | File | Test | Standards |
|---|---|---|---|---|
| 0 | Gỡ cảm biến; migration `b5c9e1a7f346` xóa bảng + `c_indoor` | alembic, energy, expect, insight, copilot, web | suite cũ xanh | migrations card |
| 1 | `heater_w` + `HEATER` chuyển vào `ops` (app), scripts dùng lại | ops/services/scenarios.py, ops/api.py, scripts/scenarios.py | test_scenarios | data card |
| 2 | NILM tách máy sưởi khỏi Other khi nhà có kịch bản `heater` (train=true); thiết bị `electric_heater` | nilm/services/runner.py, devices.py | test_nilm_heater: Other + Heater = Other cũ, Heater ≤ Other | data card |
| 3 | Holdout thiết bị thêm `wape_model`, `wape_base`, `base_q10/q90`; `device_method(b)` và `confidence(bt, method)` | expect/services/device.py | test_expect_device | |
| 4 | `device_outlook(s, home, device, now, days)`: kWh theo ngày P10/P50/P90 + nhóm đóng góp, theo mô hình hoặc theo thứ | expect/services/device.py, expect/api.py | test: rơi về theo thứ khi mô hình thua; khoảng từ phân vị | |
| 5 | `device_forecasts(s, home, now)` trong billing: 7 ngày tới, đến cuối kỳ, ₫ theo giá cận biên, lý do ₫, độ chắc chắn, lời khuyên | billing/services/device_forecast.py, schemas, routes `GET /billing/devices/forecast` | test lời khuyên từng loại; tránh bậc | fastapi skill |
| 6 | Wappi `device_forecast(device?)` | copilot tools, chat | test tool | |
| 7 | Web: ô "Dự báo 7 ngày tới" trang thiết bị; ô "Dự báo theo thiết bị đến cuối kỳ" ở Thống kê; vi/en | features/billing (device-forecast), pages | vitest + pnpm check | ui, i18n, dashboard-features cards |
| 8 | Dữ liệu: migrate, chạy lại NILM 5-heat (lùi checkpoint), train lại thiết bị, in độ chắc chắn từng thiết bị 3 nhà | runner nền | số in ra | |
| 9 | Review R1 (opus) → sửa → R2 | | | REVIEW.md |

Rủi ro: chạy lại NILM 5-heat 365 ngày (đo trước: ~0,4 s/ngày); thiết bị người dùng bật tay (ấm, lò vi sóng) sẽ phần
lớn ở mức "Thấp" — đó là sự thật về dữ liệu, hiển thị đúng như vậy.
