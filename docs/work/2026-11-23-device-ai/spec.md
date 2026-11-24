# Spec: Bất thường và dự báo theo từng thiết bị

- Ngày: 2026-11-23 · Trạng thái: **đã duyệt** (Product Owner 2026-11-23, "ok") · Intent: intent.md cùng thư mục · Record: none
- Xây trên Đợt 1 (docs/work/2026-11-21-ai-forecast-anomaly): tín hiệu ngữ cảnh (§5 spec cũ), `expect` (features,
  LightGBM phân vị theo tỉ lệ mức nền, CQR, TreeSHAP), cảnh báo + phản hồi (C6), kịch bản demo.

## 1. Mục tiêu và phản mục tiêu

Mục tiêu: (A) báo khi **một thiết bị** khác chính nó trong cùng ngữ cảnh; (B) dự báo **từng thiết bị** cho những ngày
tới và cuối kỳ, có khoảng, lý do, độ chắc chắn và lời khuyên có con số.

Phản mục tiêu:
- Hiện một dự báo thiết bị "chắc chắn" mà backtest của nó thua cách đơn giản.
- Lời khuyên dời giờ dùng (biểu giá bậc thang không thưởng việc đó), hay lời khuyên không có kWh/₫ đi kèm.
- Cảnh báo bật tắt theo các phút NILM còn đang viết lại.
- Số do LLM nghĩ ra.

## 2. Change 1: Bất thường theo thiết bị

### 2.1 Tín hiệu (mỗi thiết bị, chỉ trên ước tính NILM đã chốt: `≤ analyzed_until`)
| # | Lệch gì | So với gì (quá khứ của chính thiết bị, cùng ngữ cảnh) | Ví dụ câu |
|---|---|---|---|
| D1 | Điện năng trong ngày | Dải P10–P95 của **mô hình kỳ vọng theo thiết bị** cho ngày đó (thời tiết, lịch, nếp sinh hoạt) | "Fridge-Freezer hôm nay dùng 2,1 kWh, thường 1,2–1,6 kWh ở nhiệt độ này" |
| D2 | Một lần chạy dài hoặc tốn bất thường | Các lần chạy của thiết bị trong 60 ngày qua **cùng khung giờ và nhiệt độ ±3 °C**: vượt P95 và ≥ 1,5× trung vị | "Washing Machine chạy 3 giờ 10 phút, thường khoảng 1 giờ 40" |
| D3 | Chạy vào giờ hiếm | Thiết bị chạy ở giờ địa phương đó trong < 3% số ngày của 60 ngày qua | "Dishwasher chạy lúc 3:10 sáng, giờ nó gần như chưa chạy bao giờ" |
| D4 | Thiết bị chu kỳ chạy dày lên (tủ lạnh, tủ đông) | Tỉ lệ thời gian chạy trong ngày so với cùng nhiệt độ 4–8 tuần trước: tăng ≥ 20% kéo dài ≥ 3 ngày | "Fridge-Freezer chạy nhiều hơn 25% so với cùng nhiệt độ tháng trước, có thể gioăng cửa hở" |

- Thiết bị **đủ điều kiện** khi có ≥ 28 ngày ước tính và ≥ 20 lần chạy (D2, D3); D1 cần mô hình thiết bị đạt
  backtest (§3.2); thiếu điều kiện thì thiết bị đó im lặng, không đoán.
- Mỗi cảnh báo có: thiết bị, điều bất thường, mức thường lệ, ngữ cảnh ("cùng nhiệt độ", "cùng khung giờ"), tác động
  ₫ (D1, D2, D4), việc nên làm, nút phản hồi (C6, độ nhạy riêng theo thiết bị và tín hiệu).
- Giới hạn: tối đa 1 cảnh báo mỗi thiết bị mỗi ngày (khóa `device_anomaly:{device}:{ngày}`), chọn tín hiệu mạnh nhất;
  D1/D2/D4 chỉ báo khi tác động ≥ 2.000 ₫ (cấu hình).
- Thay `longer_than_usual` (D2 + D4 bao trùm nó). Loại cảnh báo mới `device_anomaly`, payload có `signal`.
- Hiển thị: Overview (danh sách cảnh báo), trang Thiết bị (ô "Bất thường gần đây" của thiết bị đó), Mail, Wappi tool
  `alerts`.

### 2.2 Nghiệm thu
- Test đơn vị cho từng tín hiệu với dữ liệu tổng hợp (có và không có ngữ cảnh tương đồng, thiếu lịch sử, phút chưa chốt).
- Kịch bản demo mới `device_long_run` (kéo dài một lần chạy của thiết bị chỉ định) và `device_odd_hour`: mỗi kịch bản
  bắn đúng tín hiệu trong ≤ 1 giờ sau khi NILM chốt; trên dữ liệu sạch ≤ 1 cảnh báo thiết bị mỗi nhà mỗi ngày.

## 3. Change 2: Dự báo theo thiết bị và lời khuyên

### 3.1 Mô hình
- Mỗi thiết bị một mô hình (dùng lại `fit`/`predict` của `expect`): mục tiêu kWh theo giờ của thiết bị, đặc trưng
  ngữ cảnh như mô hình nhà + mức nền 7 ngày của chính thiết bị. Lưu như `tb_expect_model` (thêm `device_id`).
- **Máy sưởi mô phỏng (lựa chọn a):** nhà 5-heat có thiết bị "Máy sưởi (mô phỏng)" (`electric_heater`), chuỗi số
  liệu riêng = công suất sưởi mô phỏng; phần "Other" của NILM trừ đúng lượng đó để tổng các thiết bị vẫn bằng công
  tơ. Mọi nơi hiện thiết bị này ghi "mô phỏng".

### 3.1a Sửa đổi 2026-11-24 (Product Owner: "forecast và detect chi tiết ở cấp từng thiết bị, khi predict kèm nguyên nhân lí giải kèm độ tin cậy"; bỏ cảm biến, chỉ thời tiết)
- **Mỗi thiết bị luôn có dự báo** (thay cho "Thấp thì không hiện số", vì chỉ 5/18 mô hình thiết bị thắng mốc): mô hình
  thiết bị khi nó thắng backtest, ngược lại **trung bình cùng thứ-giờ 4 tuần trước** (như dự báo hóa đơn rơi về cách
  theo thứ). Nguồn đang dùng luôn ghi rõ.
- **Độ chắc chắn = sai số thật của cách đang hiện**, đo trên 21 ngày holdout: sai số tuyệt đối trung bình của kWh
  ngày chia cho kWh ngày trung bình (WAPE). **Cao** ≤ 25%, **Vừa** ≤ 50%, **Thấp** > 50% hoặc < 7 ngày đo (cấu hình).
  Luôn hiện "thử trên N ngày: lệch trung bình X%".
- **Khoảng P10–P90:** mô hình thì tổng P10/P90 của các giờ (đã nới CQR); cách theo thứ thì nhân mức theo thứ với phân vị
  10%/90% của tỉ lệ thật/dự báo trong holdout.
- **Lý do:** mô hình thì đóng góp TreeSHAP theo nhóm (thời tiết, ngày nghỉ, nếp sinh hoạt, xu hướng) so với mức thường
  của thiết bị, bằng kWh và ₫; cách theo thứ thì một lý do duy nhất "theo nếp 4 tuần gần đây" (không bịa yếu tố).
- **Máy sưởi mô phỏng (a):** tách ngay trong bước cân bằng của NILM: phần "Other" trả lại đúng công suất sưởi mô phỏng
  (công thức đã biết, giới hạn bởi chính "Other"), ghi vào thiết bị `electric_heater` "Máy sưởi (mô phỏng)". Lịch sử
  5-heat được chạy lại NILM bằng cách lùi checkpoint (không xóa gì).
- **Lời khuyên** tính bằng số học trên dữ liệu đã có thay cho chạy lại mô hình: số lần chạy và kWh mỗi lần
  (`tb_device_cycle`) cho máy giặt/rửa bát, công thức sưởi cho máy sưởi, 30% năng lượng mỗi lần cho ấm đun (lò vi sóng không có lời khuyên: không có con số tiết kiệm có cơ sở; quyết sau R1 2026-11-24),
  phần chạy dày lên (D4) cho tủ lạnh. Giá ₫ theo giá bậc cận biên của kỳ; ghi "tránh được bậc N" khi tiết kiệm kéo
  dự báo cuối kỳ xuống dưới ngưỡng bậc.

### 3.2 Độ chắc chắn
- Backtest theo thiết bị (như Đợt 1): sai số kWh 7 ngày tới so với **trung bình cùng thứ-giờ 4 tuần trước**, và độ
  phủ P10–P90. Mức: **Cao** (thắng mốc so sánh và phủ ≥ 70%), **Vừa** (thắng mốc so sánh), **Thấp** (không thắng: không
  hiện con số dự báo, chỉ hiện "chưa đủ chắc chắn để dự báo thiết bị này").
- Độ chắc chắn hiện cạnh mọi con số, kèm "thử trên N tuần: lệch trung bình X%".

### 3.3 Hiển thị
- **Trang thiết bị:** ô "Dự báo 7 ngày tới" (kWh và ₫ mỗi ngày, dải P10–P90, độ chắc chắn), "Vì sao" (đóng góp thời
  tiết, ngày nghỉ, nếp sinh hoạt, xu hướng), và "Lời khuyên" (§3.4).
- **Thống kê:** ô "Dự báo theo thiết bị đến cuối kỳ": mỗi thiết bị một dòng (kWh, ₫, khoảng, độ chắc chắn, lời khuyên
  hàng đầu), sắp theo ₫.
- **Wappi:** tool `device_forecast(device?)` trả cùng số liệu; LLM chỉ diễn đạt.

### 3.4 Lời khuyên (có con số, tính bằng mô hình)
- Mỗi lời khuyên là một **giả lập "nếu như"** chạy lại mô hình thiết bị (C5 của spec cũ) và trả: kWh và ₫ tiết kiệm đến
  cuối kỳ, bậc giá có thay đổi không ("giữ được bậc 4 thêm 5 ngày"). Chỉ hiện khi tiết kiệm ≥ 5.000 ₫ đến cuối kỳ.
- Danh mục theo loại thiết bị (dev mở rộng được):
  - Máy giặt, máy rửa bát: bớt 1 lần chạy mỗi tuần; chạy đầy tải (gộp 2 lần nhỏ).
  - Máy sưởi (mô phỏng): hạ nhiệt độ đặt 2 °C; tắt sớm 1 giờ buổi tối (công thức sưởi đã biết, nên giả lập chính xác).
  - Ấm đun, lò vi sóng: đun vừa đủ lượng nước (giảm 30% năng lượng mỗi lần).
  - Tủ lạnh: khi D4 bắn: kiểm tra gioăng, chỉnh nhiệt độ; tiết kiệm = phần chạy dày lên so với thường lệ.
  - "Other" và điện nền: không có lời khuyên cụ thể thiết bị (chỉ gợi ý kiểm tra thiết bị chờ).
- Lời khuyên xếp theo ₫ tiết kiệm, tối đa 3 mỗi thiết bị.

### 3.5 Nghiệm thu
- Backtest theo thiết bị in ra mức chắc chắn từng thiết bị của 3 nhà; thiết bị "Thấp" không có con số trên UI.
- Kịch bản "đợt lạnh" trên 5-heat: dự báo máy sưởi tăng rõ (≥ 30% trong các ngày lạnh) và lý do ghi "thời tiết".
- Mỗi lời khuyên có test giả lập trả đúng kWh tiết kiệm trên dữ liệu tổng hợp.

## 4. Quyết định của BA (Product Owner kiểm tra khi đọc)
- Tầm dự báo: 7 ngày tới (theo ngày) và đến cuối kỳ. Không chọn giờ tới (thiết bị quá nhiễu ở mức giờ).
- Ngưỡng: D2 P95 và 1,5× trung vị; D3 < 3% số ngày; D4 +20% trong ≥ 3 ngày; tác động tối thiểu 2.000 ₫ (cảnh báo),
  5.000 ₫ (lời khuyên). Đều là cấu hình.
- Thiết bị tham gia: 7 loại NILM hiện có + máy sưởi mô phỏng của 5-heat; "Other" không có dự báo riêng.
- Câu hỏi còn mở từ Đợt 1 (hiện khoảng và "vì sao đổi" cho nhà mà mô hình thua) giữ như đang làm (ẩn) đến khi
  Product Owner chốt.
