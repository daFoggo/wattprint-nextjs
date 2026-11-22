# PRD: Dự báo và phát hiện bất thường theo ngữ cảnh (AI) cho WattPrint

- Ngày: 2026-11-21 · Trạng thái: **đã duyệt** (Product Owner 2026-11-21: "ok đợt 1, 2 và 3 luôn") · Phạm vi: POC (demo)
- Record: none · Intent: intent.md cùng thư mục
- Repo liên quan: `wattprint-backend` (lõi AI, API, worker), `wattprint-web` (`apps/dashboard`), Wappi (`copilot`)
- Người đọc: team dev backend, web, ML

## 1. Bối cảnh và vấn đề

Khối 3 của sản phẩm ("Phân tích dự báo và phát hiện bất thường", pitch deck) hiện chạy bằng **luật cố định**:

| Hiện có | Ở đâu | Cách làm hiện tại | Hạn chế |
|---|---|---|---|
| Dự báo hóa đơn cuối kỳ, ngày chạm bậc | `app/modules/billing/services/forecast.py` (`weekday-profile-v1`) | Trung bình kWh theo thứ trong tuần của 28 ngày gần nhất | Không biết thời tiết, ngày lễ, nhà vắng; một con số, không có khoảng; không giải thích vì sao đổi |
| Ảnh chụp dự báo hằng ngày | `tb_forecast_snapshot`, job `forecasts` | Lưu mỗi ngày một bản | Chưa ai so dự báo với thực tế |
| Bất thường | `app/modules/insight/services/detectors.py` | `longer_than_usual` (×1,5 so với 28 ngày), `standby_high` (×1,3 và +50 W), `unexplained_load` (+300 W trong 30 phút), `tier_near` | Hệ số đặt tay; trời lạnh làm tăng điện cũng bị coi là bất thường; trên dữ liệu thật 3 luật đầu chưa bắn lần nào |
| Cảnh báo người dùng tự đặt | `insight/services/watches.py` (alerts-v2) | Ngưỡng do người dùng đặt | Đúng mục đích, giữ nguyên |
| M&V kế hoạch tiết kiệm | `copilot/services/upkeep.py::measure_plans` | 14 ngày sau so với 14 ngày trước | Không hiệu chỉnh thời tiết (docstring tự ghi "no weather adjustment yet") |

**Vấn đề cốt lõi:** điện năng của một nhà phụ thuộc vào nhiều yếu tố (thời tiết, lịch, có người ở nhà hay không, thiết bị đang có). Luật cố định không tách được "tăng vì hoàn cảnh" với "tăng bất thường", nên dự báo sai khi hoàn cảnh đổi, còn cảnh báo thì hoặc im lặng, hoặc báo nhầm.

## 2. Mục tiêu, không làm, phản mục tiêu

**Mục tiêu**
1. Một mô hình học **mức điện kỳ vọng theo ngữ cảnh** cho từng nhà; dự báo và bất thường cùng dựa trên nó.
2. Dự báo **đổi theo các yếu tố** (thời tiết sắp tới, lịch, nhà vắng...) và **nói được vì sao đổi**.
3. Bất thường = lệch khỏi kỳ vọng **sau khi đã trừ ngữ cảnh**, có lượng hóa bằng kWh và ₫, chỉ ra thiết bị gây ra.
4. Demo POC thuyết phục trên dữ liệu REFIT: người xem thấy rõ "AI hiểu ngữ cảnh", không phải luật cứng.

**Không làm trong POC**
- Cảm biến trong phòng (CO₂, độ ẩm trong nhà, chuyển động). Hướng đã chốt là **A: chỉ cảm biến aptomat + dữ liệu công khai**; mô hình chừa chỗ cắm thêm tín hiệu sau.
- So sánh với hàng xóm dùng mô hình (quyết định cũ: cohort chỉ dùng nhà thật, ≥ 10 nhà).
- Mô hình học sâu cho dự báo (Transformer, foundation model): xem §9.
- Thay cảnh báo người dùng tự đặt (watches) và `tier_near`. `tier_near` là sự thật về biểu giá, không phải chuyện thống kê, nên giữ luật.

**Phản mục tiêu (nếu xảy ra thì coi là thất bại dù chạy được)**
- Báo động khi điện tăng vì lý do mà chính ngữ cảnh đã giải thích (trời lạnh, có khách người dùng đã khai).
- Con số do LLM tự nghĩ ra. Nguyên tắc của dự án: **số do công cụ tính, mô hình ngôn ngữ chỉ giải thích**.
- Hộp đen: một dự báo hay cảnh báo không trả lời được câu "vì sao".
- Spam: nhiều cảnh báo nhỏ, không đáng tiền, người dùng tắt thông báo.
- Số liệu thiết bị lấy từ kênh appliance của CSV REFIT. Số thiết bị chỉ lấy từ output NILM (quyết định 2026-11-19); tổng cả nhà lấy từ series `main`.

## 3. Người dùng và tình huống

- **Chủ hộ / thành viên** (người dùng sản phẩm): "Cuối tháng tôi trả bao nhiêu, vì sao tăng, có gì bất thường cần xử lý, nên làm gì?"
- **Người xem demo** (giám khảo, EVN, nhà đầu tư): cần thấy trong 2–3 phút rằng hệ thống phản ứng theo ngữ cảnh và giải thích được.

Tình huống chính:
1. Mở Overview, thấy hôm nay đang cao hay thấp so với "thường lệ trong hoàn cảnh này".
2. Mở Hóa đơn hoặc Thống kê: dự báo cuối kỳ dạng khoảng, khả năng chạm bậc, vì sao dự báo đổi so với hôm qua.
3. Nhận cảnh báo (trong app và mail) kèm lý do, số tiền, thiết bị, việc nên làm; bấm phản hồi đúng hoặc sai.
4. Hỏi Wappi: "Vì sao tháng này tiền điện cao?" và nhận câu trả lời tách thời tiết, sử dụng, thiết bị.

## 4. Nguyên tắc AI (áp dụng cho mọi tính năng)

1. **Một nguồn kỳ vọng:** dự báo, bất thường, M&V và giải thích dùng chung một mô hình kỳ vọng, không mỗi tính năng một luật riêng.
2. **Luôn có khoảng:** mọi con số dự báo đi kèm khoảng, mặc định P10–P90. UI nói rõ "khoảng".
3. **Luôn có lý do:** mỗi dự báo hay cảnh báo trả về đóng góp theo **nhóm yếu tố** (thời tiết, lịch, người ở nhà, xu hướng, thiết bị), đủ để viết một câu giải thích.
4. **Ghi nguồn:** gắn nhãn cái gì là ước tính hoặc dự báo, và tạo ra bởi mô hình nào (tiếp nối việc đã làm ở commit `6427273` của web). Dữ liệu ngữ cảnh mô phỏng phải được ghi là mô phỏng.
5. **Rơi về an toàn:** chưa đủ dữ liệu hoặc mô hình lỗi thì dùng `weekday-profile-v1` hoặc luật hiện có, và nói rõ đang dùng cách đơn giản.
6. **Đáng tiền mới báo:** cảnh báo có ngưỡng tác động tối thiểu bằng ₫, và giới hạn tần suất.
7. **Phiên bản hóa:** mọi kết quả lưu `model_version`; huấn luyện lại không làm mất khả năng so sánh độ chính xác.

## 5. Tín hiệu ngữ cảnh

Cột POC ghi nguồn dùng cho demo trên REFIT. Product Owner đã đồng ý POC **không bắt buộc dữ liệu thực địa**; tín hiệu mô phỏng được phép nhưng phải gắn nhãn.

| Nhóm | Tín hiệu | Ảnh hưởng | Nguồn POC | Ưu tiên |
|---|---|---|---|---|
| Thời tiết | Nhiệt độ, độ trễ nhiệt (trung bình 24 h, 72 h), độ ẩm, nhiệt độ cảm nhận | Sưởi, làm mát, hút ẩm; nhà tích nhiệt | Open-Meteo Historical (ERA5, miễn phí, theo giờ) **tại Loughborough, đúng thời gian ghi REFIT**, dời giờ như số đo (`scripts/refit.py`) | Đợt 1 |
| | Mây, bức xạ, giờ mặt trời mọc và lặn | Giờ bật đèn, nhiệt mặt trời | Open-Meteo, tính thiên văn | Đợt 1 |
| | Mưa | Ở trong nhà, sấy đồ | Open-Meteo | Đợt 1 |
| | Đợt nóng hoặc lạnh kéo dài | Thói quen đổi theo đợt | Suy từ nhiệt độ | Đợt 2 |
| | AQI, PM2.5 | Đóng cửa, máy lọc khí | **Mô phỏng** (không có lịch sử 2013–2015) | Đợt 3 |
| Lịch | Giờ, thứ, ngày lễ, kỳ nghỉ | Nhịp sinh hoạt | **Lịch của nơi và thời gian gốc dữ liệu** (Anh, 2013–2015): hành vi trong REFIT theo lễ Anh. Nhà Việt Nam thật dùng lịch Việt Nam, kể cả Tết | Đợt 1 |
| | Vị trí trong kỳ hóa đơn, bậc giá hiện tại | Tự tiết kiệm gần bậc | Đã có (billing) | Đợt 2 |
| Người ở nhà | Có người hay vắng; mức hoạt động | Tải do người bật chỉ có khi có người | Suy từ sự kiện của thiết bị do người bật (NILM: Kettle, Microwave, Toaster, WashMach, Dishwash) | Đợt 1 |
| | Giờ dậy, giờ ngủ, thay đổi nếp | Đường tiêu thụ dịch chuyển | Suy ra | Đợt 3 |
| | Người dùng tự khai: "Đi vắng", "Có khách" | Điều chỉnh kỳ vọng | Công tắc trên web hoặc qua Wappi | Đợt 3 |
| Tình trạng nhà | Mức nền (always-on), điểm gãy (thiết bị mới), xu hướng chậm | Thay đổi bền vững, không phải bất thường tạm | Suy từ dữ liệu | Đợt 2 |
| Giá | Phiên bản biểu giá theo ngày | Hóa đơn đổi khi EVN đổi giá | Đã có (`tb_tariff_version`) | Đợt 1 (dự báo ₫) |
| Chất lượng dữ liệu | Khoảng trống số đo, độ phủ NILM | Phân biệt mất dữ liệu với bất thường | Đã có (`covered_minutes`, checkpoint NILM) | Đợt 1 |

**Cảnh báo rò rỉ (dev phải xử lý):** tín hiệu "người ở nhà" được suy từ chính các thiết bị nằm trong tổng điện. Nếu đưa thẳng vào mô hình như một biến giải thích, mô hình sẽ "giải thích" luôn cả bất thường của các thiết bị đó. Gợi ý: dùng nó làm ngữ cảnh cho **phần tải không do người bật** (nền, tủ lạnh, Other) và cho các cảnh báo nhà vắng. Khi dự báo tương lai, dùng xác suất có người theo nếp (hoặc theo khai báo), không dùng giá trị thật.

## 6. Năng lực lõi (dev xây một lần)

### C1. Mô hình mức kỳ vọng
- Đầu vào: tín hiệu ngữ cảnh §5 tại từng giờ.
- Đầu ra: kWh kỳ vọng theo giờ dưới dạng phân vị (tối thiểu P10, P50, P90; P5 và P95 cho bất thường), cho **cả nhà** (Đợt 1) và **từng thiết bị NILM** (Đợt 2).
- Huấn luyện riêng từng nhà, lại hằng đêm hoặc khi có thêm ≥ 7 ngày; lưu phiên bản (giống cách `tb_nilm_model` gắn model với nhà).
- Dữ liệu huấn luyện phải phủ **ít nhất một năm** để thấy đủ mùa. Hiện seed chỉ 90 ngày (`scripts/demo_homes.toml`, `history_days = 90`). **Quyết định (BA):** tăng `history_days` lên 365 và huấn luyện **từ database** (cùng đường đi với sản phẩm thật), kèm NILM backfill cho khoảng đó (tín hiệu người ở nhà cần NILM). Không cần seed lại với độ dời khác: với độ dời hiện tại (nhà 2: 4368 ngày, "bây giờ" tương ứng khoảng 12/2014), đã có khoảng 15 tháng ghi trước "bây giờ".
- Thời tiết và lịch được nối theo **giờ gốc của bản ghi REFIT** (UTC thật, trước khi dời), không theo timestamp đã lưu. `refit.py` dời theo năm 364 ngày nên sau 12 năm lịch lệch khoảng 15 ngày (ví dụ Giáng sinh 2014 rơi vào khoảng 10/12/2026). UI và Wappi gọi chung là **"ngày nghỉ lễ"**, không ghi tên lễ Anh.
- Bản ghi REFIT kết thúc khoảng 05/2015; từ khoảng cuối 05/2027, replay lặp lại tuần cuối (`shift_for`). Mốc này nằm ngoài thời gian POC; nếu demo sau mốc đó thì phải chọn lại độ dời.
- Đủ điều kiện khi có ≥ 28 ngày đủ số đo; dưới mức này dùng `weekday-profile-v1`.
- **Nghiệm thu:** backtest theo thời gian (huấn luyện quá khứ, thử tương lai) trên nhà 2 và nhà 5, lấy **mọi ngày trong kỳ làm điểm dự báo** (không chỉ giữa kỳ, vì mỗi nhà chỉ có khoảng 8 điểm giữa kỳ, quá ít). (a) Sai số kWh cuối kỳ trung bình **không tệ hơn `weekday-profile-v1`**. (b) Khoảng P10–P90 theo ngày phủ 72–88% số ngày thực tế. Báo cáo hai số này trong PR. **Quyết định (BA):** nếu (a) không đạt, F1 vẫn hiện con số của v1, còn khoảng, phân rã (F2) và bất thường vẫn dùng C1; không chặn cả đợt.

### C2. Phân rã nguyên nhân
- Với bất kỳ kỳ vọng hoặc chênh lệch nào, trả về đóng góp theo nhóm yếu tố: `weather`, `calendar`, `occupancy`, `trend`, `device`, `unexplained`. Tổng đóng góp bằng tổng chênh lệch (sai số làm tròn ≤ 1%).
- Dùng cho: "vì sao dự báo đổi", "vì sao hôm nay cao", "tháng này tăng 18% = 11% thời tiết + 7% sử dụng".
- **Nghiệm thu:** test đơn vị cho tính cộng dồn; trên một ngày lạnh bất thường của dữ liệu thật, nhóm `weather` chiếm phần lớn chênh lệch.

### C3. Suy luận người ở nhà và nếp sinh hoạt
- Theo giờ: `present` / `away` / `unknown` kèm độ tin cậy. Theo ngày: số sự kiện hoạt động, giờ hoạt động đầu và cuối.
- Phát hiện **vắng nhà kéo dài** (≥ 18 giờ không có hoạt động của người và tải chỉ còn nền).
- **Nghiệm thu:** đánh giá bằng mắt trên timeline của nhà 2 (đêm và ngày đi làm là `away` hoặc `sleep`, giờ nấu ăn là `present`); không cần nhãn thật trong POC.

### C4. Phát hiện thay đổi
- Lệch khỏi kỳ vọng: thực tế ngoài [P5, P95] **kéo dài** (dev chọn cụ thể: tổng kWh vượt theo cửa sổ 3 h và theo ngày), có lượng hóa phần vượt bằng kWh và ₫.
- Điểm gãy mức nền: mức nền đêm tăng hoặc giảm bền vững ≥ 3 ngày (gợi ý CUSUM, không cần thư viện mới).
- Xu hướng chậm theo thiết bị: thời lượng chu kỳ tủ lạnh ở cùng nhiệt độ tăng dần qua nhiều tuần.

### C5. Giả lập "nếu như"
- Chạy lại C1 với đầu vào đã đổi: nhiệt độ ±x °C, vắng n ngày, bớt n giờ thiết bị X/ngày, đổi biểu giá. Trả về kWh, ₫, bậc giá thay đổi.
- Là nền cho bộ giả lập trên UI (Đợt 3), cho M&V có hiệu chỉnh thời tiết (Đợt 2) và cho tool của Wappi.

### C6. Học từ phản hồi
- Mỗi cảnh báo có phản hồi `useful` hoặc `not_anomaly`. Mỗi lần `not_anomaly` thì nới ngưỡng của đúng loại cảnh báo (và thiết bị) cho nhà đó, ví dụ P95 lên P97,5; có giới hạn và có thể đặt lại.
- Lưu phản hồi để đo chất lượng (§10).

## 7. Danh mục tính năng

Mã ưu tiên: **Đợt 1** = MVP của POC, **Đợt 2**, **Đợt 3**. Mỗi dòng ghi chỗ hiện trên UI theo IA đã chốt (Overview, Thống kê, Thiết bị, Hóa đơn, Cảnh báo, Wappi, Mail).

### Đợt 1: chứng minh "AI hiểu ngữ cảnh"

**F1. Dự báo hóa đơn theo ngữ cảnh, có khoảng**
- Câu chuyện: là chủ hộ, tôi muốn biết cuối kỳ trả khoảng bao nhiêu, có tính đến thời tiết sắp tới và lịch, để chủ động.
- Hành vi: thay `weekday-profile-v1` bằng C1 khi đủ điều kiện. Ngày còn lại trong kỳ dùng dự báo thời tiết cho ≤ 5 ngày tới, sau đó dùng **khí hậu trung bình** của ngày đó trong năm. Trong demo, "dự báo thời tiết" là thời tiết lịch sử đã dời giờ. Dev nên thêm nhiễu hoặc chỉ dùng cho ≤ 5 ngày, để dự báo không đúng một cách phi thực tế.
- Hiển thị: Hóa đơn (`BillOverview`), Thống kê (`BillForecast`), tóm tắt trên Overview (`BillSummary`).
- Ví dụ: **"Cuối kỳ khoảng 640.000–720.000 ₫ (≈ 210–235 kWh)"**, dòng phụ "Dự báo bởi mô hình theo thời tiết và lịch của nhà bạn".
- Nghiệm thu: API trả P10, P50, P90 cho kWh và ₫ (kèm VAT), `model_version`, `basis_days`; khi rơi về v1 thì UI ghi rõ "ước tính đơn giản theo thứ trong tuần".

**F2. Vì sao dự báo đổi**
- Hành vi: so dự báo hôm nay với ảnh chụp hôm qua (`tb_forecast_snapshot`). Phần đổi được tách bằng C2 thành: đã dùng thực tế khác dự kiến, thời tiết sắp tới đổi, lịch, giá. Chỉ hiện khi |đổi| ≥ 2% hoặc ≥ 10.000 ₫.
- Ví dụ: **"Tăng 35.000 ₫ so với hôm qua: 3 ngày tới dự báo lạnh hơn (+28.000 ₫), hôm qua dùng nhiều hơn dự kiến (+7.000 ₫)."**
- Hiển thị: dưới con số F1; Wappi tool `bill_forecast` trả kèm.

**F3. Khả năng chạm bậc giá**
- Hành vi: từ phân phối kWh cuối kỳ của C1, tính xác suất vượt ngưỡng bậc kế tiếp và ngày có khả năng chạm (ngày P50 vượt ngưỡng).
- Ví dụ: **"Khoảng 70% khả năng sang bậc 4 (từ 201 kWh), có thể vào khoảng 26/11."**
- Hiển thị: `TierLadder` (Hóa đơn), Thống kê. Không thay cảnh báo `tier_near`; khi có xác suất thì đưa nó vào nội dung cảnh báo.

**F4. Dải "thường như thế này" hôm nay**
- Hành vi: dải P10–P90 theo giờ của C1 cho hôm nay, phía sau đường thực tế; một câu tóm tắt "Hôm nay đang cao hơn thường lệ 18% (≈ 6.000 ₫) so với một ngày như hôm nay".
- Hiển thị: Overview (biểu đồ công suất hoặc tiêu thụ trong ngày); trang Thiết bị (dải theo thiết bị ở Đợt 2).

**F5. Độ chính xác dự báo**
- Hành vi: khi kỳ đóng, so ảnh chụp giữa kỳ (và theo từng ngày) với hóa đơn thực tế; lưu sai số theo `model_version`.
- Ví dụ: **"Kỳ trước: dự báo giữa kỳ 655.000 ₫, thực tế 671.000 ₫ (lệch 2,4%)."**
- Hiển thị: Hóa đơn (kỳ đã qua), Thống kê. Wappi dùng khi được hỏi "dự báo có đúng không".

**A1. Bất thường cả nhà theo ngữ cảnh** (thay `unexplained_load`)
- Hành vi: C4 trên mức cả nhà. Chỉ báo khi phần vượt ≥ ngưỡng ₫ (đề xuất 5.000 ₫/ngày hoặc 2.000 ₫ trong cửa sổ 3 h, dev đặt thành cấu hình) và tối đa 1 cảnh báo loại này mỗi nhà mỗi ngày. Nội dung gồm: phần vượt (kWh, ₫), ngữ cảnh "bình thường" (thời tiết, lịch, người), thiết bị đóng góp nhiều nhất (NILM, theo phần vượt so với kỳ vọng của chính thiết bị đó khi có C1 thiết bị; Đợt 1 dùng so với trung bình cùng giờ), việc nên làm.
- Không báo khi phần vượt được giải thích bởi `weather` hoặc `calendar` (≥ 70% chênh lệch), hoặc khi độ phủ số đo < 90%.
- Ví dụ: **"Từ 14:00 nhà dùng hơn mức thường 2,1 kWh (≈ 6.500 ₫) dù thời tiết và lịch như mọi ngày. Phần lớn từ Washing Machine. Kiểm tra xem máy có đang chạy lặp không."**
- Hiển thị: Overview (`AlertList`), trang Cảnh báo, Mail (theo `notify_anomaly` sẵn có), Wappi tool `alerts`.
- Loại cảnh báo mới: `usage_anomaly` (migration thêm vào CHECK của `tb_alert.kind`).

**A5. Phản hồi trên cảnh báo**
- Hành vi: 2 nút "Đúng, cảm ơn" / "Không phải bất thường" trên mọi cảnh báo do mô hình tạo; áp dụng C6. Sau khi bấm, hiện "Đã ghi nhận, WattPrint sẽ ít báo kiểu này hơn cho nhà bạn".
- Hiển thị: Overview, Cảnh báo, link trong Mail.

**W1. Wappi dùng năng lực mới**
- `bill_forecast` trả khoảng, xác suất bậc và lý do đổi (F1–F3).
- Tool mới `explain_usage(period)`: trả phân rã C2 cho hôm nay, tuần hoặc kỳ, so với kỳ trước, sau khi trừ thời tiết. Đây là câu trả lời cho câu hỏi mẫu trong pitch: "Tại sao tháng này tiền điện cao bất thường so với tháng trước?"
- Số vẫn đến từ tool; LLM chỉ diễn đạt.

**D1. Kịch bản demo** (công cụ nội bộ, không phải tính năng người dùng)
- Script chèn tình huống vào luồng replay (`scripts/replay_refit.py`): "quên tắt thiết bị 800 W suốt 6 giờ", "thêm tải nền 60 W liên tục", "nhà vắng 3 ngày", "đợt lạnh" (hạ nhiệt độ mô phỏng **và** chèn tải sưởi tăng theo độ lạnh, xem §12 Q2). Tải chèn vào số đo `main`; NILM vẫn là nguồn số thiết bị.
- Để mô hình học được "lạnh thì sưởi tăng" thay vì coi đợt lạnh là bất thường, dữ liệu huấn luyện của nhà demo cần có tải sưởi mô phỏng theo cùng quy luật trên toàn bộ lịch sử (hoặc dev chọn cách khác cho kết quả tương đương), gắn nhãn mô phỏng.
- Mục đích: người trình bày bật tình huống trước buổi demo và các tính năng phản ứng trong vài phút. Chèn phải đảo ngược được và gắn nhãn (không lẫn với dữ liệu thật khi đánh giá mô hình).

### Đợt 2: thiết bị, mức nền, M&V

- **A2. Thiết bị khác thường so với chính nó** (thay `longer_than_usual`): C1 theo thiết bị (năng lượng ngày, thời lượng chạy, công suất đỉnh) và C4. Ví dụ: "Fridge-Freezer chạy dài hơn thường lệ 35% ở cùng nhiệt độ trong 3 ngày qua." Chỉ báo khi độ tin cậy NILM của thiết bị đó đủ (dev định nghĩa từ chỉ số đánh giá trong `docs/nilm-eval.md` hoặc độ ổn định của ước tính). Hiển thị trên trang Thiết bị (`DeviceAlertTile`) và Cảnh báo.
- **A3. Nhà vắng mà vẫn tốn điện**: C3 phát hiện vắng nhà, rồi liệt kê thiết bị còn chạy ngoài mức nền. Khi có người trở lại thì gửi tóm tắt: "3 ngày vắng nhà tốn 4,1 kWh (≈ 12.000 ₫), 80% do Fridge-Freezer và tải nền."
- **A4. Điện chờ học được** (thay `standby_high`): mức nền đêm kỳ vọng theo nhiệt độ và mùa; báo khi tăng bền vững (C4 điểm gãy). Ví dụ: "Từ 12/11 nhà có thêm khoảng 60 W chạy liên tục (≈ 30.000 ₫/tháng). Có thiết bị mới không?" Ô `Standby` trên Thống kê hiện mức kỳ vọng cạnh mức thực tế.
- **F6. Báo trước theo thời tiết** (chủ động): khi dự báo 5 ngày tới làm P50 cuối kỳ tăng ≥ 5% hoặc đẩy qua bậc mới, gửi một cảnh báo kèm 1–2 việc nên làm lấy từ C5 (ví dụ bớt giờ chạy của thiết bị lớn nhất). Loại cảnh báo mới `weather_ahead`.
- **M1. M&V có hiệu chỉnh thời tiết**: `measure_plans` so thực tế với **kỳ vọng của C1 trong đúng thời tiết đó** (thay cho so 14 ngày trước), trả về kWh và ₫ tiết kiệm kèm khoảng.
- **C1 nâng cấp**: so kỳ sau khi trừ thời tiết, trên trang Thống kê (`CycleCompare`, `UsageCompare`): "Tăng 18% so với kỳ trước: 11% do thời tiết, 7% do sử dụng."

### Đợt 3: tương tác và nếp sinh hoạt

- **S1. Bộ giả lập "nếu như"** (Thống kê hoặc Hóa đơn): thanh kéo nhiệt độ ±5 °C, "đi vắng n ngày", "bớt n giờ/ngày thiết bị X"; dự báo, bậc và ₫ đổi ngay (C5). Đây là cách trực quan nhất để thấy "yếu tố đổi thì kết quả đổi".
- **R1. Nếp sinh hoạt**: "Tuần này nhà dậy sớm hơn khoảng 1 giờ", "Có vẻ có người ở nhà ban ngày (làm việc ở nhà)". Ô mới trên Thống kê và Wappi.
- **U1. Người dùng tự khai ngữ cảnh**: công tắc "Đi vắng đến ngày…" và "Có khách" (web), hoặc qua Wappi; C1 và A1 dùng làm ngữ cảnh.
- **A6. Xu hướng xuống cấp thiết bị**: đường thời lượng chu kỳ theo nhiệt độ qua nhiều tuần, trên trang thiết bị.
- **E1. AQI** (mô phỏng, gắn nhãn): thêm vào ngữ cảnh và giải thích.

## 8. Thay đổi lên hệ thống hiện có

- **Thay:** `weekday-profile-v1` thành fallback; `unexplained_load` bởi A1; `standby_high` bởi A4; `longer_than_usual` bởi A2. Các kind cũ giữ trong CHECK cho dữ liệu cũ; detector cũ tắt khi bản mới bật, theo cờ cấu hình mỗi loại.
- **Giữ:** `tier_near` (bổ sung xác suất F3 vào nội dung), watches, cohort.
- **Lưu trữ mới (dev thiết kế theo `docs/database-design-guide.md`):** model kỳ vọng theo nhà (phiên bản, artifact, chỉ số backtest); kỳ vọng theo giờ (phân vị) cho cửa sổ gần; phân rã nguyên nhân gắn với forecast snapshot và alert; phản hồi cảnh báo; thời tiết lịch sử cho nhà REFIT (hiện `tb_weather_hourly` theo `province_code` và đang trống; nhà REFIT chưa có tỉnh).
- **Worker:** huấn luyện hằng đêm và tính kỳ vọng hằng giờ trong `insight` (cơ chế `each_home` và advisory lock sẵn có), hoặc một worker riêng như `nilm` nếu thời gian huấn luyện lớn. Dev quyết định, đo thời gian ở quy mô 10.000 nhà (SOM trong pitch).
- **API (mức hợp đồng, dev định nghĩa chi tiết):** mở rộng `GET /billing/forecast` (khoảng, xác suất bậc, lý do đổi, độ chính xác); mới `GET /energy/expected?from&to[&device_id]` (dải phân vị); payload alert có `explanation` (nhóm yếu tố, thiết bị, ₫); mới `POST /insights/alerts/{id}/feedback`; mới `GET /insights/explain?period=` (phân rã). Mọi endpoint giới hạn trong nhà của người hỏi như hiện tại.
- **Web:** các ô ở §7. Theo IA đã chốt, không thêm route mới ở Đợt 1–2; S1 có thể cần một ô lớn hoặc dialog ở Đợt 3.

## 9. Hướng kỹ thuật cho C1 (đề xuất của BA, dev chốt)

| Hướng | Mô tả | Được | Mất |
|---|---|---|---|
| **A. Gradient boosting dự báo phân vị (LightGBM), mỗi nhà một mô hình** | Một mô hình mỗi phân vị (hoặc phân vị + conformal để hiệu chỉnh khoảng); giải thích bằng TreeSHAP có sẵn (`predict(pred_contrib=True)`), gộp theo nhóm yếu tố | Mạnh với tương tác phi tuyến (nhiệt độ × giờ), nhanh trên CPU, giải thích được, nhiều nghiên cứu dùng cho phụ tải (GEFCom2014) | Thêm dependency `lightgbm`; cần làm feature kỹ |
| B. Mô hình cộng tính (GAM, hồi quy với degree-day) | Mỗi yếu tố một đường cong cộng lại | Giải thích tự nhiên, ổn với ít dữ liệu | Kém với tương tác; khoảng tin cậy thô hơn |
| C. Học sâu hoặc foundation model chuỗi thời gian | TFT, N-BEATS, Chronos/TimesFM có covariate | Hợp xu hướng, tốt khi nhiều nhà | Nặng, cần GPU, khó giải thích, 2 nhà là quá ít |

**Đề xuất: A**, với B hoặc `weekday-profile-v1` làm mốc so sánh và fallback. Phát hiện bất thường dùng chính phân vị của A (không thêm Isolation Forest hay autoencoder: không giải thích được và không tái dùng được cho dự báo).

## 10. Đo thành công

- Mô hình: sai số hóa đơn giữa kỳ thấp hơn v1 trên backtest; độ phủ khoảng P10–P90 trong 72–88%; pinball loss báo cáo theo phiên bản.
- Bất thường: với kịch bản D1, phát hiện ≥ 4/4 tình huống trong ≤ 1 giờ (3 h cho mức nền); trên dữ liệu sạch, ≤ 1 cảnh báo mô hình mỗi nhà mỗi tuần.
- Sản phẩm (khi có người dùng): ≥ 60% phản hồi là "Đúng, cảm ơn"; tỉ lệ tắt `notify_anomaly` không tăng.
- Demo: trong một buổi trình bày, đổi một yếu tố (D1 "đợt lạnh") thì F1, F2 đổi và giải thích đúng nhóm `weather`.

## 11. Rủi ro

| Rủi ro | Ảnh hưởng | Giảm nhẹ |
|---|---|---|
| Nhà 2 và 5 không có máy sưởi điện hay điều hòa nên hiệu ứng nhiệt độ yếu | Demo "thời tiết đổi thì dự báo đổi" kém ấn tượng | Hiệu ứng ánh sáng (giờ mặt trời lặn) và tủ lạnh theo nhiệt độ; kịch bản D1 "đợt lạnh"; nói thật mức tác động |
| Sai số NILM (F1 0,32–0,45) truyền sang cảnh báo thiết bị | Báo nhầm thiết bị | Ngưỡng tin cậy NILM; câu chữ "có thể là"; Đợt 1 chỉ dùng thiết bị để gợi ý nguyên nhân, không làm điều kiện báo |
| Rò rỉ tín hiệu người ở nhà (§5) | Mô hình che mất bất thường | Quy tắc ở §5; test có kịch bản D1 |
| Lịch và thời tiết lệch giữa dữ liệu Anh và câu chuyện Việt Nam | Người xem thấy 5 °C trong khi nhà "ở Việt Nam" | Đã chốt Q1: nhà demo tên "REFIT House n", ghi "thời tiết tại nơi ghi dữ liệu" |
| Tải sưởi mô phỏng bị hiểu là dữ liệu thật | Mất uy tín khi bị hỏi | Nhãn "kịch bản mô phỏng" trên UI khi kịch bản bật; loại khỏi đánh giá NILM và backtest so với v1 |
| Huấn luyện chỉ trên 90 ngày | Không học được mùa | Mở rộng lịch sử (C1) |
| Thời gian huấn luyện ở quy mô lớn | Worker chậm | Đo ở Đợt 1; tách worker nếu cần |

## 12. Câu hỏi còn mở cho Product Owner

Đã chốt với Product Owner (2026-11-21):
- **Q1. Thời tiết hiển thị cho nhà demo REFIT:** thời tiết lịch sử Loughborough đã dời giờ, ghi rõ "thời tiết tại nơi ghi dữ liệu". Thẻ thời tiết trên Overview và mọi lời giải thích đều dùng cùng nguồn này.
- **Q2. Kịch bản "đợt lạnh" (D1):** chèn **tải sưởi mô phỏng** vào số đo `main`, công suất tăng theo độ lạnh của thời tiết mô phỏng, gắn nhãn kịch bản. Mục tiêu demo: dự báo tăng, điện thực tế tăng, F2 và A1 giải thích "do thời tiết" và **không** báo bất thường. NILM sẽ xếp tải này vào `Other` (không có nhãn sưởi); chấp nhận được trong POC.

## 12b. Quyết định của BA (Product Owner kiểm tra khi đọc)

- POC Đợt 1–3 chỉ áp dụng cho **nhà demo REFIT**. Nhà Việt Nam thật (nạp thời tiết theo tỉnh, lịch Việt Nam có Tết, điền tỉnh cho nhà) là phạm vi sau POC. Hiện chưa có code nào ghi vào `tb_weather_hourly`.
- Lịch sử 365 ngày, huấn luyện từ database (C1). **Không xóa dữ liệu hiện có** (Product Owner, 2026-11-21): nhà 2
  và nhà 5 chỉ được thêm lịch sử cũ hơn (NILM tính bù riêng khoảng đó); tải sưởi mô phỏng nằm ở **nhà demo thứ 3**
  "REFIT House 5 · sưởi mô phỏng" (CSV và mô hình NILM của nhà 5); kịch bản "đợt lạnh" demo trên nhà này.
- Thời tiết và lịch nối theo giờ gốc REFIT; UI ghi "ngày nghỉ lễ" (C1).
- Backtest: mọi ngày trong kỳ là một điểm; C1 không thắng v1 thì không chặn đợt (C1).
- Ngưỡng ₫ (5.000 ₫/ngày, 2.000 ₫/3 h) và giới hạn 1 `usage_anomaly`/ngày là **cấu hình**, giá trị trên là mặc định.

## 13. Để lại cho dev

Chọn thuật toán cụ thể trong hướng A, bộ feature, cửa sổ và ngưỡng chi tiết của C4, schema bảng, hình dạng JSON của API, worker nào chạy, thiết kế ô UI theo `docs/design-system.md` (Hairline). Mỗi đợt đi qua quy trình sdlc của `wattprint-web` (lane L, artifact trong `docs/work/`) và quy ước của `wattprint-backend` (`AGENTS.md`, migration viết tay trong `versions/public`).

## Nguồn tham khảo

- REFIT Smart Home dataset (Loughborough): https://repository.lboro.ac.uk/articles/dataset/REFIT_Smart_Home_dataset/2070091
- REFIT electrical load dataset (Nature Sci Data): https://www.nature.com/articles/sdata2016122
- Open-Meteo Historical Weather API: https://open-meteo.com/en/docs/historical-weather-api
- Probabilistic LightGBM cho phụ tải (arXiv 2305.05575): https://pdf.arxiv.org/pdf/2305.05575
- Quantile boosting cho smart meter (IEEE TSG 2016): https://orbi.umons.ac.be/bitstream/20.500.12907/43362/1/2016_ieeetsg_quantile.pdf
- Rimor, bất thường mức thiết bị có ngữ cảnh: https://loneharoon.github.io/files/rimor.pdf
- Phát hiện bất thường từ smart meter bằng khoảng dự báo: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10818482/
- Thông báo của Sense: https://sense.com/consumer-blog/home-energy-notifications/
