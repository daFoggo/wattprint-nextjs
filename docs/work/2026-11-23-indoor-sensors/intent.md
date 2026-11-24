# Intent: Cảm biến trong nhà (gói Pro) cho dự báo và bất thường

- Ngày: 2026-11-23 · Người yêu cầu: Product Owner · Record: none
- Liên quan: docs/work/2026-11-21-ai-forecast-anomaly (Đợt 1), docs/work/2026-11-23-device-ai (Change 1, 2)

## Vấn đề (lời người yêu cầu)
"Trước đó tôi thấy bạn đề cập các yếu tố ảnh hưởng đến việc dự đoán có cả các yếu tố liên quan đến các sensor cảm
biến trong nhà nữa. Tuy nhiên đến khi dev hiện tại tôi không thấy bạn đề cập đến việc này. Và tôi có tìm thì bộ
refit này còn có một bộ dataset liên quan đến smart home, không biết nó có matching với các nhà mà ta đang dùng
không." Sau khi kiểm tra: "ok đưa hết vào chạy, coi như đang là pro hết".

## Kết quả mong muốn
Các nhà demo dùng dữ liệu thật của REFIT Smart Home (cùng hộ: House 2 = Building02, House 5 = Building05) như một
nhà gói Pro có cảm biến: chuyển động, nhiệt độ và độ ẩm từng phòng, cửa, đồng hồ gas, trạm thời tiết tại chỗ. Mô
hình, cảnh báo, Wappi và giao diện dùng chúng khi có; nhà không có cảm biến chạy như hiện tại.

## Đụng tới
Backend: energy (lưu, đọc), expect (feature), insight (cảnh báo), copilot (tool), billing (lý do thay đổi), scripts
(nhập dữ liệu). Web: Overview, lý do dự báo, cảnh báo. DB: một bảng mới, một cột mới.

## Ràng buộc
- Không xóa hay sửa dữ liệu đang có (đọc số đo, thời tiết ERA5 đã lưu giữ nguyên).
- Không commit, không deploy cho đến khi người yêu cầu nói.
- Dữ liệu thật của REFIT, dời thời gian như số đo điện; không bịa số.
- Chạy nền những việc dài.

## Câu hỏi mở
- Không có (đã chốt: dùng tất cả, mọi nhà coi là Pro).
