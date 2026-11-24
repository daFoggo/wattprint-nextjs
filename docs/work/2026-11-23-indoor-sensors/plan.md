# Plan: Cảm biến trong nhà (gói Pro)

- Spec: spec.md (đã duyệt 2026-11-23) · Base: backend 7baf2d0 (có Change 1 chưa commit)

| # | Bước | File | Test chứng minh | Standards |
|---|---|---|---|---|
| 1 | Bảng `tb_home_sensor_hourly` + cột `tb_expect_hourly.c_indoor` (default 0) | alembic `20261123_f3a7c9e5d124`, energy/models/model_home_sensor_hourly.py, expect/models | `alembic upgrade head` + downgrade/upgrade | backend conventions, supabase-postgres |
| 2 | Script nhập: xml → biến của Building, zip → lọc, gộp giờ (nhiệt độ/độ ẩm trung bình phòng; phòng có người = chuyển động `-10003` hoặc sự kiện cửa; `sensing_rooms`; gas tổng; trạm), dời bằng shift, upsert | scripts/import_refit_sensors.py | tests/test_refit_sensors.py: gộp giờ trên dữ liệu nhỏ | scripts pattern của import_refit_weather |
| 3 | `sensor_inputs(s, home, lo, hi, now)`: số đo cho giờ `< now`, giờ sau = trung bình cùng giờ 7 ngày trước; `occupied` theo giờ (NaN khi `sensing_rooms = 0`). `weather_inputs` ưu tiên trạm cho giờ quan sát `< now` | energy/services/sensor_inputs.py, weather_inputs.py, api.py | tests/test_sensor_inputs.py: không nhìn trước, tương lai = nếp, trạm thay ERA5 | |
| 4 | Feature `motion` (presence_frame trên occupied), nhóm `indoor` (`indoor_temp_c`, `indoor_rh_pct`, `gas_m3`); MIN_KNOWN ngoại lệ 28 ngày gần nhất; HOUR_COLS tự có c_indoor | expect/services/features.py, train.py | test_expect_model: giữ feature đủ ở 28 ngày cuối | |
| 5 | Billing `GROUP_KEYS` và copilot `GROUPS` lấy từ `expect.api.GROUPS`; change_parts coi nhóm thiếu là 0 | billing/services/forecast.py, copilot/services/tools.py | test hiện có + snapshot cũ thiếu indoor | |
| 6 | A1 `nobody_home`; D4 nhiệt độ bếp (`temp_source`) | insight/services/detectors.py, mail.py | test_usage_anomaly, test_device_anomaly | |
| 7 | Endpoint `GET /homes/{id}/indoor` + Wappi tool `indoor` | energy/routes, schemas; copilot tools, chat prompt | test route + tool `available:false` | fastapi skill |
| 8 | Web: thẻ "Trong nhà" ở Overview, nhóm indoor trong CHANGE_PARTS, câu cảnh báo, messages vi/en | features/energy (indoor), billing/forecast.ts, insight/alert-values, messages | vitest + pnpm check/build + mở app | web docs, design-system, hairline |
| 9 | Nhập dữ liệu 3 nhà, migrate, train lại, refresh, backtest trước/sau (chạy nền) | — | số MAPE ghi vào kết quả và debt.md | |
| 10 | Review R1 (opus) → sửa → R2/R3 | — | — | REVIEW.md |

Rủi ro: B02 thiếu nhiệt độ phòng giữa kỳ (spec §8.1); gói review chứa Change 1 (spec §8.4).
