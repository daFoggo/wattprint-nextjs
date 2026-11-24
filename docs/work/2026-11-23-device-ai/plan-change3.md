# Plan: Change 3 — giải thích dự báo thiết bị "so với bình thường"

- Duyệt: Product Owner 2026-11-24 (thiết kế "so với mức bình thường của chính thiết bị", thêm các biến thời tiết khác
  ngoài nhiệt độ; bỏ dòng "thử trên N ngày", chỉ giữ nhãn độ chắc chắn).

**Logic** (expect/services/device.py `explain_outlook`, thuần, có test):
- Mốc "bình thường" = kWh trung bình mỗi ngày của thiết bị trong 28 ngày trước (đo, NILM).
- Dự báo = P50 trung bình mỗi ngày của 7 ngày trọn vẹn tới (từ ngày mai).
- Yếu tố = (đóng góp TreeSHAP trung bình mỗi ngày của các feature thuộc yếu tố ở 7 ngày tới) − (của 28 ngày trước):
  nhiệt độ (temp_c, temp_24h, temp_72h, apparent_c), độ ẩm, nắng & mây (radiation, cloud, is_day), mưa, ngày nghỉ
  (hour, weekday, holiday), nếp sinh hoạt (presence), xu hướng (base_7d). "Yếu tố khác" = phần còn lại, nên các dòng
  cộng đúng bằng chênh lệch. Mỗi yếu tố kèm bằng chứng (giá trị trung bình tới so với trước).
- Hiện tối đa 3 yếu tố có |Δ| ≥ 5% mức bình thường (và "khác" khi cũng đủ lớn). Cách theo thứ: không có yếu tố, chỉ
  mốc bình thường và ngày tốn nhất.
- ₫ của mỗi yếu tố = Δ kWh/ngày × 7 × giá trung bình kỳ.

**Đổi:** predict trả thêm đóng góp từng feature khi cần; device_outlook trả `explain`; billing `DeviceForecast.explain`
thay `reasons`; Wappi `device_view`; web ô dự báo (tiêu đề "khoảng X kWh · Y ₫, cao/thấp hơn bình thường Z%",
danh sách yếu tố có thanh hai chiều, lời khuyên dạng thẻ), danh sách Thống kê giữ.
**Test:** explain cộng đúng; chọn yếu tố; bằng chứng; cách theo thứ; web schema + câu chữ.

**Sau R1 (2026-11-24):** yếu tố tính ở cùng một mức nền (mức trung bình 28 ngày trước, TreeSHAP theo đơn vị mô hình);
"xu hướng" = phần còn lại của thay đổi trong mô hình (gồm việc mức nền dịch chuyển). Chỉ tách yếu tố khi P50 của mô
hình trên 28 ngày trước lệch ≤ 15% so với mức đo được (`explainable`); không thì ô ghi "thiết bị dùng thất thường" và
không có phần trăm. Phán quyết phạm vi: dịch mẹo theo loại thiết bị (energy.about.tips) nằm trong change này vì Product
Owner yêu cầu trực tiếp trong cùng lượt ("lời khuyên vẫn là tiếng Anh").

