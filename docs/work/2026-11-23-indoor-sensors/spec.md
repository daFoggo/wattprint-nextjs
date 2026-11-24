# Spec: Cảm biến trong nhà (gói Pro) cho dự báo và bất thường

- Ngày: 2026-11-23 · Trạng thái: **đã duyệt** (Product Owner 2026-11-23, "ok") · Intent: intent.md cùng thư mục · Record: none
- **Đã hủy 2026-11-24** (Product Owner: "không cần nguồn data từ sensor nữa", chỉ dùng thời tiết của vùng ghi dữ liệu). Code đã gỡ; migration b5c9e1a7f346 xóa bảng và cột. Giữ tài liệu làm hồ sơ.
- Xây trên Đợt 1 (`expect`, `weather_inputs`, cảnh báo A1) và Change 1 (cảnh báo thiết bị D1–D4).

## 1. Dữ liệu (đã kiểm tra, REFIT Smart Home, figshare 2070091, CC BY 4.0)

Cùng hộ với bộ điện: House 2 = Building02, House 5 = Building05 (nhà `5-heat` dùng Building05). Demo đang phát lại
khoảng nguồn **2013-12-08 → 2014-12-08** (shift 4368 ngày) và tiếp tục chạy về sau.

| Tín hiệu | B02 | B05 | Phủ khoảng demo |
|---|---|---|---|
| Nhiệt độ, độ ẩm phòng (Hobo, 15–30 phút) | 6 phòng | 6 phòng | B05 đủ (hở 8 ngày 10/2014). B02: đủ đến 2014-06-18, sau đó chỉ còn Landing (nhiệt độ) cho tới 2015-01-26 |
| Chuyển động (RWE, sự kiện) | 6 phòng | 5 phòng | B02 từ 2014-07-23, B05 từ 2014-08-29, tới 2015-04 |
| Cửa ra vào/cửa sổ (sự kiện) | 2 | không | từ 2014-07 |
| Gas (30 phút) | có | không | đủ |
| Trạm thời tiết khuôn viên (15 phút): nhiệt độ, độ ẩm, gió, bức xạ, mưa | dùng chung | dùng chung | đủ |

Đo trước khi thiết kế, theo giờ, trong khoảng có chuyển động:

| | B02 | B05 |
|---|---|---|
| kWh/giờ khi không phòng nào có chuyển động / khi có | 0,27 / 0,74 | 0,55 / 1,11 |
| Tương quan kWh với số phòng có chuyển động (cùng giờ trong ngày) | 0,25 | 0,36 |
| Tương quan kWh với nhiệt độ trong nhà | −0,06 | 0,07 |

Kết luận: chuyển động là tín hiệu mạnh nhất. Nhiệt độ và độ ẩm trong nhà gần như không liên quan đến điện (hai nhà
sưởi bằng gas). Vẫn đưa vào theo yêu cầu, để mô hình tự cân, và lý do sẽ hiện ra đúng mức nhỏ của chúng.

Mã sự kiện: `-10003` là "có chuyển động" (chiếm phần lớn sự kiện). `-10009/-10010` là đóng/mở cửa. Bảng mã nằm trong
file xsd chưa tải, nên ghi `shortcut:` ở chỗ dùng.

## 2. Lưu trữ

Bảng mới `tb_home_sensor_hourly` (home_id, ts) theo mẫu `tb_home_weather_hourly`:
`indoor_temp_c`, `indoor_rh_pct` (trung bình các phòng có số đo trong giờ), `occupied_rooms` (số phòng có chuyển động
hoặc cửa có sự kiện), `sensing_rooms` (số cảm biến chuyển động đang hoạt động trong giờ, để phân biệt "0 người" với
"không biết"), `gas_m3`, `station_temp_c`, `station_rh_pct`, `station_wind_ms`, `station_radiation_wm2`,
`station_precip_mm`, `rooms` JSONB (theo phòng: nhiệt độ, độ ẩm, có người).

Script `scripts/import_refit_sensors.py --house 2|5|5-heat` đọc trực tiếp zip và xml gốc, gộp theo giờ, dời thời gian
bằng shift của nhà (như `import_refit_weather`), rồi upsert. Script nhập cả dòng thời gian một lần. Mọi chỗ đọc chỉ
lấy giờ `< now` để không nhìn trước tương lai. Dữ liệu ERA5 đã lưu giữ nguyên.

## 3. Mô hình kỳ vọng (`expect`)

- Feature mới:
  - nhóm **occupancy**: `motion`, là nếp có người theo chuyển động (cùng giờ cùng thứ, 4 tuần trước, như `presence`).
    `presence` theo NILM giữ nguyên.
  - nhóm mới **indoor**: `indoor_temp_c`, `indoor_rh_pct`, `gas_m3`.
- Giờ đã qua dùng số đo. Giờ tương lai dùng trung bình cùng giờ của 7 ngày trước `now`.
  `shortcut:` mô hình học trên số đo, dự báo trên trung bình nên hơi lệch, chấp nhận vì các tín hiệu này đổi chậm.
- Quy tắc bỏ feature thiếu (MIN_KNOWN 0,5) thêm một ngoại lệ: feature có đủ dữ liệu trong 28 ngày gần nhất thì được
  giữ. Lý do: chuyển động chỉ có khoảng 4 tháng trong 365 ngày học, nhưng có đủ ở thời điểm dự báo. LightGBM tự xử lý
  phần thiếu.
- Thời tiết: với giờ đã qua, `weather_inputs` ưu tiên số của trạm tại chỗ (nhiệt độ, độ ẩm, gió, bức xạ, mưa), thiếu
  thì dùng ERA5. Giờ tương lai giữ cách cũ.
- `tb_expect_hourly` thêm cột `c_indoor` (migration, mặc định 0). Billing `GROUP_KEYS`, copilot `GROUPS` và web
  `CHANGE_PARTS` thêm `indoor`.
- Nghiệm thu: chạy lại backtest cả ba nhà (`backtest_expect.py`), ghi MAPE trước và sau vào `debt.md` hoặc kết quả,
  dù tốt hay xấu. Cổng `trusted()` giữ nguyên: thua thì vẫn rơi về cách cũ.

## 4. Bất thường

- **A1 (điện cả nhà cao)**: khi trong cửa sổ cảnh báo cảm biến chuyển động hoạt động mà không phòng nào có người,
  **và** đó là những giờ thường có người đi lại (nếp chuyển động cùng giờ 4 tuần trước ≥ 0,5; sửa sau R1: người ngủ
  không làm cảm biến bật, ban đêm gần như luôn "không chuyển động"), payload thêm `nobody_home: true`. Câu chữ (web, mail) đổi thành "… trong lúc không có ai ở nhà". Đây là loại cảnh báo đáng
  hành động nhất: thiết bị quên tắt.
- **D4 (tủ lạnh chạy dày)**: khi có nhiệt độ bếp thì so với những ngày có **nhiệt độ bếp** ±3 °C thay cho nhiệt độ
  ngoài trời; payload ghi `temp_source: "kitchen"` để câu chữ nói đúng.
- Không thêm tín hiệu mới. "Kettle chạy khi không ai ở nhà" chỉ bắt lỗi NILM, không giúp người dùng.

## 5. Wappi
Tool mới `indoor` trả về: nhiệt độ và độ ẩm từng phòng hiện tại, phòng nào đang có người, số giờ có người hôm nay so
với thường lệ, gas hôm nay. Không có cảm biến thì trả `{"available": false}`. Prompt thêm một dòng.

## 6. Giao diện
- **Overview**: cạnh thẻ thời tiết ở đầu trang thêm thẻ nhỏ "Trong nhà": nhiệt độ, độ ẩm, "có người ở 2 phòng" hoặc
  "không có ai". Nhãn phụ "Cảm biến Pro". Không có dữ liệu thì ẩn thẻ. Endpoint mới `GET /homes/{id}/indoor`.
- **Lý do dự báo và lý do thay đổi**: nhóm "Trong nhà" hiện như các nhóm khác (chỉ hiện khi đủ ngưỡng 2%).
- **Cảnh báo**: câu chữ `nobody_home` và `temp_source` (vi/en).

## 7. Phản mục tiêu
- Không bịa dữ liệu cảm biến cho nhà thật. Nhà không có cảm biến thì feature thiếu, bị bỏ, mọi thứ như cũ.
- Không dùng số đo của chính giờ đang dự báo làm feature cho giờ đó (rò rỉ). Chuyển động vào mô hình qua nếp sinh hoạt,
  không qua số đo của chính giờ đó.
- Không đặt cổng gói Pro trong code ("coi như Pro hết"): có dữ liệu là dùng.

## 8. Areas of concern
1. B02 mất nhiệt độ và độ ẩm của hầu hết các phòng từ demo-time 2026-06-03 đến 2027-01-11. Trung bình nhà khi đó chỉ
   còn Landing, nên mức trung bình sẽ nhảy. Ảnh hưởng nhỏ vì tín hiệu này yếu. Ghi vào debt.
2. Chuyển động có nhiều khoảng sensor im lặng (độ phủ theo giờ khoảng 0,47). Một giờ không có sự kiện được coi là "0
   người" chỉ khi trong giờ đó cảm biến có hoạt động (`sensing_rooms > 0`). Không phân biệt được "pin hết" với "không ai".
3. Cột `c_indoor` làm thay đổi phiên bản đầu ra của mô hình. Các snapshot dự báo cũ không có nhóm này: `change_parts`
   coi thiếu là 0, và vẫn chỉ so cùng `model_version`.
4. Change 1 chưa commit, nên gói review của change này sẽ chứa cả Change 1. Reviewer được dặn chỉ xét các file của
   change này.
