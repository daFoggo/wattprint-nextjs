# Demo và video: debt cần trả, checklist, kịch bản

Cập nhật 2026-11-24. Demo chạy trên prod `https://wattprint.ptitai.org`, vào bằng nút "Xem nhà demo" (tài khoản
khách, chỉ xem, tự xoá sau 24 giờ). Dữ liệu là REFIT phát lại theo giờ thật; NILM chạy mỗi 60 s, insight mỗi 60 s.

## 1. Debt chọn để trả trước khi quay

Tiêu chí: lỗi người xem nhìn thấy hoặc làm demo hỏng, sửa trong vài giờ, không cần nghiên cứu.

| # | Việc | Vì sao ảnh hưởng demo | Nơi |
|---|---|---|---|
| 1 | Replay REFIT thành service riêng `restart: unless-stopped` | Replay chạy bằng `exec -d` trong api: restart api hay reboot là số liệu đứng, "Hôm nay 0 ₫" (xảy ra 24/11 16:40) | backend `docker-compose.yml` |
| 2 | `echo_run` không làm mốc so sánh D2 | Mỗi lần diễn "ấm quên tắt" đẩy P95 của thiết bị lên: lần quay sau có thể không ra cảnh báo (House 5 đã có 5 lần echo_run) | backend insight cycles |
| 3 | Tín hiệu yếu hơn không ghi đè cảnh báo đã lưu | Cảnh báo đang quay có thể đổi sang nội dung yếu hơn | backend insight alerts |
| 4 | Wappi "không có mô hình" lúc 00:00–00:59 | Hỏi Wappi trong giờ đầu ngày là hỏng | backend `explain_usage` dùng chung `_cycle_start` |
| 5 | Card "Bậc 5, bậc cao nhất" trống một khối lớn | Trang Tổng quan, ngay khung đầu video | web `bill-summary.tsx` |
| 6 | Mục "Vì sao" có tiêu đề mà không có nội dung | Trang thiết bị | web/backend device forecast |
| 7 | Tên "Máy sưởi điện (mô phỏng)" cạnh nhãn "Mô phỏng" | Lặp chữ ở mọi chỗ có máy sưởi (nhà đó đã xoá 24/11) | web |
| 8 | Dự báo thiết bị tính trọn giờ đang chạy; gợi ý máy sưởi bỏ qua giờ kết thúc kịch bản | Số ₫ của máy sưởi lệch so với bill | backend `device_forecast.py` |
| 9 | Cache dự báo thiết bị không xoá khi đổi ngày chốt kỳ/biểu giá | Số cũ tới 1 giờ sau khi đổi cài đặt | backend `_CACHE.pop(home_id)` |
| 10 | Ghi chú dự báo ở trang Hóa đơn thiếu khoảng kWh | Hai trang nói cùng dự báo khác cách | web `bill-overview.tsx` |

Ngoài ra: chuyển hai nhóm debt của module dự báo thiết bị (change 2, change 3) đang nằm nhầm ở "Paid" về "Open".

**Để sau (nghiên cứu, không chặn demo):** độ chính xác mô hình nhà (House 2 thua cách đơn giản, khoảng P10–P90
hẹp), phản ứng thời tiết yếu, NILM chạy bù dữ liệu cũ, 13/18 mô hình thiết bị thua mốc, lần chạy NILM bị vụn,
các giới hạn quy mô (`shortcut:`). Trong video không nhắc số đo độ chính xác, chỉ nói mức tin cậy (Cao/Vừa/Thấp).

## 2. Checklist trước khi quay (30 phút trước)

1. Container `wattprint-replay` đang Up (tự chạy lại khi api restart hay máy reboot) và "Hôm nay … kWh" trên
   Tổng quan khác 0.
2. Các container `wattprint-api`, `wattprint-replay`, `wattprint-nilm`, `wattprint-insight`, `wattprint-dashboard` đều Up.
3. Không còn kịch bản demo đang chạy: `docker compose exec -T api python -m scripts.scenario list`
   (nhà sưởi mô phỏng đã xoá nên cột cuối `True` không được còn dòng nào). Dừng cái thừa bằng `scenario stop --house <key> --name <name>`.
4. Mở sẵn một cửa sổ ẩn danh ở `/sign-in`, độ phân giải 1440×900, theme tối.
5. Cảnh báo không tự hiện đúng lúc quay: đo ngày 24/11 trên House 5, bật `echo_run` ấm (30 lần, rồi 3 lần) hoặc
   `forgotten_load` 1500 W đều không ra cảnh báo mới sau 9–14 phút (NILM xếp phụ tải 2 kW vào "khác"; lỗi thiết bị
   chỉ xét lần chạy đã kết thúc). Vì vậy chuẩn bị trước: cảnh báo `usage_anomaly` đang mở của House 5 là thứ để quay;
   kiểm tra nó còn trong danh sách trước giờ quay.

## 3. Kịch bản video (~7 phút)

Nhà dùng: **Plegma House 1 · Hy Lạp** (điều hòa và bình nóng lạnh là tải lớn như nhà Việt) cho cảnh 3–4, 6–7 và
**REFIT House 5** cho cảnh 5 (cảnh báo có sẵn). Nhà **ENERTALK House 0 · Hàn Quốc** (nồi cơm điện) chỉ để mở ở cảnh 2.
Trước khi quay: mở từng nhà, ghi lại bậc giá và số tiền thật rồi điền vào lời dẫn (còn dấu …).

| Cảnh | Thời lượng | Màn hình | Lời dẫn (gợi ý) | Thao tác vận hành |
|---|---|---|---|---|
| 1. Vấn đề | 0:00–0:30 | Trang đăng nhập | "Hóa đơn điện bậc thang tăng nhanh, nhưng chủ nhà chỉ có một công tơ, không biết tiền đi vào thiết bị nào." | — |
| 2. Vào nhà demo | 0:30–0:50 | Bấm "Xem nhà demo" → Plegma House 1 (rồi lướt qua danh sách nhà) | "Không cần đăng ký: tài khoản khách xem nhà thật từ ba nước, Anh, Hy Lạp, Hàn Quốc, phát lại theo giờ. Nhà Hy Lạp có điều hòa, nhà Hàn có nồi cơm." | — |
| 3. Tổng quan | 0:50–1:50 | Hóa đơn kỳ này, thanh bậc giá; Điện năng theo thiết bị, rê chuột lên vạch tin cậy | "Chỉ từ công tơ tổng, mô hình NILM tách ra từng thiết bị. Mỗi thiết bị có mức tin cậy để biết con số chắc đến đâu." | — |
| 4. Thống kê | 1:50–2:40 | Tiền điện theo thiết bị + dự báo hóa đơn cuối kỳ (mở nút ⓘ), công suất cả nhà | "Đến cuối kỳ hóa đơn dự kiến khoảng … ₫, kết thúc ở bậc … Khoảng dự báo cho biết 8/10 khả năng rơi vào đâu." | — |
| 5. Cảnh báo bất thường | 2:40–3:50 | Trang Cảnh báo / thông báo trên Tổng quan | "Hệ thống so mức dùng hiện tại với thói quen của chính nhà này và báo khi lệch bất thường." | Không bật kịch bản trực tiếp (không đảm bảo ra cảnh báo): dùng cảnh báo đã có trong danh sách (checklist #5) |
| 6. Hỏi Wappi | 3:50–5:00 | Hỏi Wappi | "Vì sao tháng này tiền điện cao?" → biểu đồ, thiết bị; "Tôi nên làm gì để không lên bậc cao hơn?" → đề xuất kế hoạch | — |
| 7. Kế hoạch tiết kiệm | 5:00–6:10 | Từ link của Wappi sang trang Kế hoạch (việc đã chọn sẵn), chọn thêm "Giảm điện chờ" 50 % | "Mỗi việc có số tiền tiết kiệm đến cuối kỳ, tính theo bậc giá. Kế hoạch này tiết kiệm khoảng … ₫, đủ lớn để thấy rõ trên hóa đơn." | Nhà demo chỉ xem: không bấm "Bắt đầu" (bị chặn). Muốn quay cảnh theo dõi thì mở "Kế hoạch trước đây" |
| 8. Kết | 6:10–6:40 | Quay lại Tổng quan | "Từ một công tơ: biết tiền đi đâu, được báo khi có gì bất thường, và có kế hoạch cụ thể để tiết kiệm." | Không còn kịch bản nào cần dừng (checklist #3) |

Lưu ý khi dẫn: nói "ước tính", "mức tin cậy cao/vừa/thấp", không nói phần trăm độ chính xác hay "so với ổ cắm đo
riêng" (sản phẩm thật không có công tơ phụ).

Cảnh dự phòng: REFIT House 5 `forgotten_load` (`--param watts=1500 --hours 3`) làm nền tăng thấy ngay trên biểu đồ công
suất cả nhà (không kèm cảnh báo mới); nhớ `scenario stop` sau khi quay.
