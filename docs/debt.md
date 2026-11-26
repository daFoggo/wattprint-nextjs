# Debt

Shortcuts and deferred findings. Each entry: what, why it was left, when to pay it.

## Open

### Backlog xếp hạng (2026-11-25): góp ý của buổi review + việc dở của handoff + debt cũ

Ưu tiên: P1 làm trước (rủi ro hoặc lợi nhiều, công nhỏ), P2 sau, P3 khi còn thời gian. Độ khó: Dễ (dưới nửa ngày),
Vừa (1-2 ngày), Khó (nhiều ngày hoặc cần thứ ngoài code). Chi tiết kỹ thuật của từng việc nằm ở các mục dưới.
Quy tắc cho phần số liệu: chỉ ghi số đo thật; chỗ chưa đo thì ghi "chưa đo", không điền số.

| # | Việc | Ưu tiên | Khó | Hiện trạng (đã kiểm chứng trong code) |
|---|------|---------|-----|----------------------------------------|
| 1 | ~~Khởi động lại Keycloak để nạp trang đăng nhập mới~~ | Xong | Dễ | Đã khởi động lại 2026-11-25; theme mới nạp |
| 2 | ~~Mở rộng phép đo chatbot, đo trên người dùng thật, so trước/sau mỗi lần đổi prompt~~ | Bỏ | - | Bỏ (2026-11-25): cần đo bằng gọi mô hình thật. Ghi chú cũ (bộ đo đã mở rộng lên 17 câu trong `scripts/eval_wappi.py`: đặt cảnh báo 4 kiểu, thiếu ngưỡng, hỏi không đặt, 2 câu "vì sao", 2 câu mơ hồ; chưa chạy đủ 4 nhà nên chưa có số mới): Đã có mốc đầu tiên (wattprint-backend `docs/chatbot-eval.md`): 84/84 câu đúng trên 7 loại câu × 4 nhà, chữ đầu ≈ 2 s, cả câu ≈ 3,2 s. Giới hạn: bộ câu tự chọn (chủ yếu số có công cụ), mọi câu đi qua AstralX vì OpenRouter trả 400, chưa có số "trước" để so. Từ nay mỗi câu thật lưu `first_ms`/`ms`. Việc còn lại: thêm câu hỏi (đặt cảnh báo, giải thích vì sao, câu mơ hồ), đọc số thật từ `usage` sau vài tuần |
| 3 | ~~Phản hồi 👎 tới Telegram: bấm thử thật~~ | Xong | Dễ | Đã bấm 👎 thật trên bản chạy: API 204, không lỗi. Chưa có kênh GitHub Issue (cần token và repo), không làm |
| 4 | ~~Hiện căn cứ giá điện trên trang hóa đơn~~ | Xong | Vừa | Cột `doc_code` ở `tb_tariff_version` (QĐ 1279/QĐ-BCT, QĐ 2892/QĐ-BCT), API `/billing/current` trả `tariff_doc`, khung hóa đơn ghi "giá theo QĐ 2892/QĐ-BCT". VAT 8% đọc từ hai văn bản gốc (2026-11-26): Luật VAT bản Công báo (mặc định 10%, điện không thuộc 0%/5%) và Nghị quyết 204/2025/QH15 bản Công báo (Điều 1: giảm nhóm 10% xuống 8%, danh sách loại trừ không có điện; Điều 2: đến hết 31/12/2026). Không văn bản nào nêu tên "điện sinh hoạt"; chưa đọc các điều của Nghị định 174/2025. Phụ lục I của Nghị định 174/2025 (đã đọc bản quét) không có ngành điện nên điện sinh hoạt được 8% đến hết 31/12/2026; chưa có trang EVN nào ghi rõ "VAT 8%". **Còn mở trước 1/1/2027:** chưa có văn bản gia hạn (đến 17/11/2026), nếu không có thì VAT về 10% và cần thêm phiên bản biểu giá từ 2027-01-01 (xem `legal-basis.md`) |
| 5 | ~~Tối ưu token~~ | Bỏ | - | Bỏ (2026-11-25): cần đo bằng gọi mô hình thật. Ghi chú cũ: Đã có: giới hạn 120 từ, đầu prompt cố định để cache. Đo: system prompt 2.209 ký tự, mô tả 16 công cụ 6.230 ký tự trong đó `create_watch` 1.956 (31%). Với OpenRouter: 3.857 token vào, 377 ra, 32% cache (71 câu); với AstralX: ≈ 6.700 vào, ≈ 420 ra, không báo cache (84 câu), không so được với nhau. Ứng viên: chỉ đưa `create_watch` cho câu có ý đặt cảnh báo (tiết kiệm ≈ 500 token mỗi vòng) nhưng rủi ro Wappi không đặt được cảnh báo khi diễn đạt lạ; cần thêm câu đặt cảnh báo vào bộ đo trước khi đổi |
| 6 | ~~Agent thao tác trên web~~ | Bỏ | - | Bạn bỏ khỏi phạm vi (2026-11-26). Hiện có: `create_watch`, `propose_plan` kèm link |
| 8 | ~~Hiệu năng mobile landing và dashboard~~ | Đóng | Vừa | Đo lại 2026-11-26 khi máy rảnh (load 2,5), Lighthouse mobile, bản prod: mô phỏng mặc định cho landing vi 74/77/74, en 74/74/77, tức **vi và en như nhau; khoảng 85 so với 94 trước đó là nhiễu**. Mô phỏng ra LCP 5,5 s nhưng LCP quan sát thật chỉ 231 ms (LCP là chữ tiêu đề, `lp-word` CSS, không có JS); đo bằng throttle thật: landing vi 86, en 76 (CLS 0,069), đăng nhập dashboard 84, LCP 2,6–3,7 s, TBT 200–310 ms. Chưa có thay đổi nào chứng minh được là cải thiện; mỗi lần đo lệch vài điểm. Việc còn lại nếu muốn: đo en nhiều lần để xem CLS 0,069 có thật không (`CHROME_PATH` trỏ Chromium của Playwright, `npx lighthouse@12.6.1 <url> --only-categories=performance`) |
| 9 | ~~Sidebar và page header sang Hairline~~ | Không làm | - | Đã xem kỹ (2026-11-25), không hợp: `PageHeader` của Hairline nhận hành động là dữ liệu (`onAction`) nên không chứa được Weather, Stepper, nút Thêm cảnh báo, link Lịch sử mà 5 trang đang truyền vào; nó còn có breadcrumb riêng và thanh dính khi cuộn, trùng với thanh trên của app. `Sidebar` của Hairline dựng từ cấu hình, không chứa phần ghim (mức dùng, tài khoản, nhà demo) đang có. Đổi sẽ mất chức năng. Mở lại nếu muốn bỏ các phần đó |
| 10 | ~~Storytelling, nhân văn, xã hội~~ | Xong | Vừa | Từ slide pitch (slide 5): khối tác động xã hội ở landing, tiêu đề rút gọn từ nội dung slide 5 (`ImpactLedger`, bảng kê từng dòng, đặt sau Wappi, không trùng bố cục khối số liệu): 0,7–2 triệu kWh, 500–1.400 tấn CO₂, mục tiêu 8–10% đến 2030, kèm chú thích đây là dự tính, sẽ đo lại trong thí điểm; câu về sức khỏe và tiện nghi (không phải chịu nóng). Chỉ dùng số có trong slide |
| 12 | Video motion graphic giới thiệu | P3 | Vừa | Chưa có; việc ngoài code (kịch bản, dựng) |
| 13 | RAG trên tài liệu | P3 | Khó | Bảng `Document`/`Chunk` có, chưa nối vào Wappi. Wappi đang tra DB bằng công cụ và text2sql có token phạm vi |
| 14 | Nhận diện tên, địa chỉ trong PII (NER) | P3 | Khó | Hiện: regex và Luhn, báo trước khi gửi ở trình duyệt, thay bằng nhãn ở backend; không nhận ra tên, địa chỉ (`shortcut:` trong `privacy.py`) |
| 15 | ~~Guard prompt-injection: đo tỉ lệ chặn; vẫn chạy khi OpenRouter nghỉ~~ | Bỏ | - | Bỏ (2026-11-25): cần đo bằng gọi mô hình thật. Ghi chú cũ: Có regex, Llama Guard (OpenRouter), công cụ có phạm vi. Khi OpenRouter nghỉ thì guard bị bỏ qua; chưa có test đo |
| 16 | Mô hình dự báo thua ở House 2, khoảng P10-P90 phủ thiếu | P3 | Khó | Người khác đang làm module forecast; xem mục 2026-11-22 |
| 17 | NILM: chỉ 5/18 mô hình thiết bị thắng trung bình; run vỡ vụn; mặt nạ giờ đo | P3 | Khó | Xem các mục 2026-11-23, 2026-11-24 |
| 18 | ~~Tên thiết bị REFIT còn tiếng Anh~~ | Xong | Dễ | Bạn chốt giữ tên gốc tiếng Anh (2026-11-25) |
| 19 | Nghiên cứu: vì sao Plegma House 1 ra ít tiền, dự báo cuối tháng 11 chỉ ~300K | P3 | Vừa | Đã xem sơ (2026-11-25): bill khớp biểu giá, điện 4,6 kWh/ngày tháng 11 (6,4 / 6,3 / 5,2 các tháng 8-10), nhà ở Athens nên mùa mát ít điều hòa. Chưa làm: so dự báo với số thực khi tháng 11 đóng; lập bảng tháng 8-11 cho cả 4 nhà; kiểm tra mô hình dự báo Plegma với tháng lạnh (debt cũ: phản ứng thời tiết yếu) |

Đã xong trong checklist (7/15 điểm; Privacy/Terms, Keycloak, 👎 Telegram, tên REFIT cũng đã chốt): tra DB bằng công cụ và text2sql có phạm vi, giọng nói vào-ra (AstralX), báo PII trước khi gửi,
chống prompt-injection, nhãn AI và độ chắc chắn Cao/Vừa/Thấp, xác thực và phân quyền (Keycloak, Google, chủ nhà/thành viên/người xem,
nhà demo chỉ đọc, xóa tài khoản), đo chatbot (mốc đầu tiên, có giới hạn). Làm một phần: 5 điểm (kênh phản hồi: đã nối Telegram, chờ bấm thử;
token; căn cứ pháp lý; storytelling; agent thao tác). Chưa làm: video. Bỏ khỏi phạm vi (2026-11-25): test sinh tự động, ảnh. Cập nhật 2026-11-25: trích dẫn gọn,
ảnh xem trước dashboard, đo chatbot và jar Keycloak đã build (chờ khởi động lại Keycloak).

### Chi tiết các mục cũ

- 2026-11-22 (docs/work/2026-11-21-ai-forecast-anomaly, R1 minors and accepted limits; T02 2026-11-23: skipped,
  the forecast module is being worked on by someone else):
  - The usage model still loses its backtest on House 2 (MAPE 14.8 % vs the weekday average's 9.3 %; House 5 now
    wins 5.3 % vs 7.0 %, docs/work/2026-11-24-expect-mean-centre); there the bill forecast falls back to the
    weekday method (`trusted()`). P10–P90 coverage 35–65 % against a 72–88 % target: misses lean upward, a drift
    the frozen 7-day level does not follow (a block bootstrap and the L2 centre did not close it). Pay: a level
    that follows drift, more NILM history.
  - Weak weather response: a −8 °C cold spell raises 3 days' expectation by ~4 % while the simulated heater adds
    ~13 kWh/day; the 7-day level absorbs the season. Pay: with the item above.
  - NILM backfill was cut (House 2 has 170 older days, House 5 none); `presence` is left out where unknown.
  - (Paid 2026-11-25) Feedback buttons are on the Overview, the alerts page and the device page; the alert mail now links to the alerts page.
  - `refresh_home` ~1.7 s per modelled home per hour, run serially in the insight worker: measure before more
    than a few hundred homes have a model.
- 2026-11-23 (docs/work/2026-11-23-device-ai, change 1):
  - Only 5 of 18 device models beat the weekday-hour mean (D1 runs for those); human-driven devices (dishwasher,
    kettle) lose. Pay: with a better device model (run-count features) in change 2.
  - A run ending between the last analysed time before midnight and midnight is never judged (missed, never wrong);
    during NILM catch-up a whole day can be skipped. Pay: keep a "judged up to" mark per home.
- 2026-11-24 (docs/work/2026-11-24-savings-plan; change 2 moved plans to the backend, frozen hourly):
  - The expected-usage model still under-predicts by 0.8–1.9 kWh/day out of sample (was 2.9–3.7 before the L2
    centre, docs/work/2026-11-24-expect-mean-centre): the drift above. Plans add that mean back
    (`tb_savings_plan.bias`). Pay: with the coverage item above.
  - The advice range reuses the device forecast's error %; the always-on default cut is a quarter of the load
    (`shortcut:` in `features/plan/math.ts`). Pay: when real plans show what is usual.
- 2026-11-24 (docs/work/2026-11-23-device-ai, change 2, R1 Minors):
  - The weekday fallback's 4-week history keeps demo-event hours (`echo_run`), which training and the holdout drop.
  - `/billing/devices/forecast` is cached per home and hour in each API process (`_CACHE`, shortcut); move it to the
    insight worker's hourly job when there are more than a few dozen homes.
- 2026-11-24 (change 3, explanation, R1 Minors):
  - The usual sums a day's known hours (days with 22+) and keeps demo-event hours; the model's past covers all 24 hours
    of all 28 days, so NILM gaps and scenario windows land in "other". Pay: mask both alike (`excluded_hours`).
  - "Days off" before can be fractional (one holiday in 28 days: 2,25 a week).
  - The sun line's direction comes from radiation alone, while its share also holds cloud cover and day length.
  - The model's past factor shares and level average all 28 days while `model_past` and the usual count measured
    days only: a NILM gap in a cold week moves the temperature share's past and the trend absorbs it. Last week's
    temperature averages all 7 days though the level averages its full-coverage days. Pay: one mask of measured days.
  - The trend line's weather gate (`TEMP_RESPONSE_R`) checks the shape of a device's temperature shares, not their size:
    a device with a tiny but temperature-shaped share can still read "last week was also warmer" (a fact, no cause
    claimed). Pay: also require the implied kWh to reach 5 % of the usual. (R2 Minor)
  - NILM's runs are fragmented and noisy (REFIT dishwashers: ~260 "runs" in 4 weeks, 0.1 kWh each). Advice joins
    pieces within 60 min and ignores joined runs under 300 Wh (`PROGRAM_MIN_WH`, shortcut); change 1's D2 long run
    and D3 odd hour still judge the raw pieces. Pay: join runs into programs once, in `refresh_cycles`.

Deliberate scale limits stay as `shortcut:` comments in the code, each with its trigger
(wattprint-backend: SSE polling, per-process copilot rate counts, per-process demo guest rate windows
(`auth/services/demo.py` `_quota`), pattern-only privacy, hourly
bill recompute, CPU
torch index, on/off thresholds from the NILM bundle; wattprint-web: the Hairline `action-receipt` type exclusion).

### NILM datasets and demo homes (2026-11-24)
- `shortcut:` ENERTALK `EXCESS_W = 100` is one fixed margin for the Issues flag (`scripts/enertalk_to_refit.py`); upgrade when a per-device meter error is known.
- `shortcut:` `FP_GAIN`, `W_MAX`, `EXCL_GAIN` in `dataset/research_v4/onoff_v4.py` are untuned; the variants gave no gain, so tune only if that line of work resumes.
- `shortcut:` Plegma's summer-time repeated hour keeps two rows per local time, once a year (`scripts/plegma_to_refit.py`).
- The expected-usage model has little history for the two new homes (120 and 30 days: only a short recording exists
  at the right season): its forecasts there stay weak until the recording has looped. Pay: a longer house, or accept.

## Paid

- 2026-11-25 (docs/work/2026-11-25-delete-account, lane L, R1 + R2 ship; plus lane S/M items):
  - `DELETE /users/me` erases an account: profile and what hangs on it, the home with its readings and the six
    aggregates' stored rows when the owner is alone (409 `home_has_members` otherwise), the meter unlinked, a used invite
    cleared, the Keycloak account last. Menu row "Xóa tài khoản" in the dashboard. Found by tests: Timescale's 100000-row
    decompression limit on DELETE, and a 500 for a member who used an invite.
  - Privacy and Terms rewritten from what the code does (no SLA days, DPO, SCC, GDPR or CCPA promises; the sharing with
    OpenRouter, AstralX and OpenWeather named; retention 400 days). Still to be read by a lawyer (backlog).
  - Wappi: no raw markdown (`plainText`, prompt), the copy button copies clean text, a source is marked once as a bare
    number with one legend line under the answer (`citedSegments`, tested), the prompt asks to cite each source once.
  - The landing preloads two Geist files instead of five; the production Docker build stops when
    `apps/web/.env.local` lacks `NEXT_PUBLIC_APP_URL`; dashboard pages carry the Open Graph image (a link to
    `/sign-in` previews; takes effect on the next deploy); the alert mail links to the alerts page.
  - Measured, not guessed: `scripts/eval_wappi.py` and `docs/chatbot-eval.md` in the backend (84/84 right on 7 kinds of
    question over 4 homes, first word about 2 s; its limits are written there); every stored answer now carries `first_ms`
    and `ms`. A thumbs-down on Wappi reaches the maintainers' Telegram chat (`app/common/notify.py`, off until
    `FEEDBACK_TELEGRAM_TOKEN` and `_CHAT` are set; a repeat adds nothing).

- 2026-11-25 (docs/work/2026-11-25-demo-homes-debt): the replay plays the whole recording again past its end
  (whole weeks rounded down, weekday kept) instead of repeating its last week, and the home weather loops with it; Plegma's
  clock is UTC (checked against ERA5, r 0.95) and now becomes Athens wall clock before training; "Other" is named
  "Khác" in every demo home; screen readers hear each forecast day's ₫ and range; the holdout's `tail_as_of`
  wiring has a test. The heater scenario code stays: it is a supported, tested feature, not dead code.

- 2026-11-24 (docs/work/2026-11-24-demo-readiness, lane L, R1 ship after one fix pass): the REFIT replay is its own
  `replay` container (restarts with Docker); staged demo runs (`train = false` scenarios) are left out of D2/D3
  history; a weaker same-day finding never rewrites a stored alert payload; Wappi's `explain_usage` and
  `compare_periods` use billing's `cycle_start` and say "no whole hour yet" before 01:00; the device forecast cache
  is dropped when the billing cycle day changes; the device forecast and heater advice count the running hour by its
  rest and heater advice stops at the scenario's `ends_at`; the heater's name no longer sits beside a "Mô phỏng"
  badge; the bill page's forecast note gives the kWh range; the top-tier card says what the price means.
  ("Vì sao" with nothing under it was already handled by `noFactor`: that entry was stale.)

- 2026-11-24 (savings plan, `freeze_plans` cost): measured on REFIT House 5 with 6 guest plans, every day unfrozen:
  1.4 s for the home, run once per plan per new day (a frozen day is never measured again); guests are capped by the
  demo quota and purged after 24 h. Nothing to change.

- 2026-11-24 (docs/work/2026-11-24-plan-device-weather, R1-R2 ship): a planned device with a trusted model is
  measured against its own model per day (weather observed, its level and the home's presence as at the start),
  frozen with the home's day once NILM has finished it (at most 2 days' wait); the page and week chips say which
  basis each device uses.

- 2026-11-24 (docs/work/2026-11-24-wappi-plan-handoff, R1-R2 ship): Wappi's `propose_plan` takes 1-3
  `device_forecast` advice ids, prices them from the service and links to `/dashboard/plan?add=…`, where the builder
  picks them; the 14-day trial (accept route, `measure_plans`, the approval card) is gone. `tb_suggestion`,
  `tb_suggestion_feedback`, `tb_savings_measure` are no longer written; their rows stay as history.

- 2026-11-24 (savings plan debt, lane L; docs/work/2026-11-24-savings-plan/review.md "Debt pass"):
  - Change 2 Minors: a running plan stays readable from its own record when the basis or forecast is gone
    (`measuredBy`, tested), and with the tariff gone the page says why; two creates at once answer 409
    (`plan_exists`); a failed freeze in `create_plan` is logged and the plan is stored (both tested). After a refit
    each new day takes the predicting model's own mean error (`day_bias`, tested).
  - Change 3 Minors: past plans read in the past tense; the device list's phone card shows the plain name
    (DataTable `cardCell` feature patch), no link inside its button; the history pill and the older/newer chips
    hide on a history error (`HideOnError`); the record page reads device types from `getDevices`; vi/en copy in
    step; the device "Mẹo tiết kiệm" tile leads with its tip; unused keys/props gone; an open alert is first in the
    DOM on the Overview (focus order), lg keeps the bento with `order`; a past plan's end date carries its year.
    Backend: the seed keeps the stored demo plans when it can rebuild none (`replace_plans`, tested);
    `measure_days` no longer exported for the seed.
  - Weather: Wappi's weather tool names ERA5 via Open-Meteo for a demo home, as the card does (tested).
  - laws-of-ux audit leftovers: the statistics page in three headed groups (money first, then energy, then similar
    homes, which shows only with enough homes; one NoHome without a home); the bill's forecast is the hero with the
    cycle's progress, its missing-data / tariff-change chips are an Alert that says why; settings puts the location
    right after "Ngôi nhà" and says "Đã lưu vị trí"; the cycle day is a pick of 1–28; the standby cut has 25/50/75%
    quick picks (`alwaysOnPresets`, tested).

- 2026-11-24 (demo R1 Minors): `create_guest` answers 503 on a refused token or key fetch (`jwt.PyJWTError`), with a
  test; a refused Keycloak delete is logged; the sidebar demo row reads the demo homes only for a viewer, and is a
  bordered notice instead of a second account-style row.

- 2026-11-24 (demo homes viewed read-only, lane L; wattprint-backend docs/work/2026-11-23-demo-view, R1-R3 ship):
  - Demo sign-in no longer password-grants the real owner: a visitor signs in (or signs up) with their own account
    and picks a demo home on the dashboard's empty state (since 2026-11-24 the sign-in page instead makes a guest
    account per click: wattprint-backend docs/work/2026-11-24-demo-guest); the backend makes them a read-only `viewer` (403 `home_read_only` on
    every shared write, Wappi's `create_watch`/`propose_plan` refuse, no alert or weekly mail). Direct Access
    Grants off on every client (`wattprint-web`, `admin-cli`), service account `wattprint-demo-admin` deleted, the
    demo owners' sessions ended, `signInWithTokens` removed from `@workspace/auth`. Pays the shared-owner entry, the
    per-process session caps and `_unlock`'s unchecked body (all removed with the password grant).
- 2026-11-24 (prod services, lane S: config only): the dashboard and landing run as containers (`compose.yaml`,
  `Dockerfile`, host network, `restart: unless-stopped`; redeploy `docker compose up -d --build`); Keycloak runs
  `start` (production mode behind nginx); db, keycloak-db, keycloak, mailpit and api restart with Docker.
- 2026-11-24 (wattprint-expo docs/work/2026-11-23-scheme-per-env, lane M, R2 ship): a URL scheme per build
  (`wattprint-dev`, `wattprint-preview`, `wattprint`, registered on `wattprint-mobile`), and the public API/realm by
  default (no localhost issuer).
- 2026-11-24 (docs/work/2026-11-23-voice-wappi-chat-fixes, lane L, R2 ship):
  - Voice orb gone: Wappi stands on Hairline's DitherHorizon in voice mode (VoiceTalk `visual` patch).
  - A stored chat whose watch statuses cannot be read still opens (rule card exception).
  - Wappi draft per conversation, gestures only on a change of state (R1 Minors, fixed).

- 2026-11-23 (debt-watch-status, lane M, R1 ship; docs/work/2026-11-23-debt-watch-status):
  - Alerts v3: a Wappi watch widget in a stored chat shows "Ended" and drops its `#watch-<id>` link once the alerts
    list has that watch as fired, expired or cancelled (read on chat load, only when the chat holds a watch widget).
  - T02 R1 Minors: tests pin the LogStream `timeZone` patch (hairline/log-stream.test.mjs), `getDevice` reusing the
    request's `getDevices` read (energy queries.test.ts) and a 0-spend roommate making a room lone (rooms.test.ts).
  - `pnpm --filter @workspace/ui hairline` passes again: the voice-talk hook anchor re-cut for upstream's `tone` prop.

- 2026-11-23 (T03 debt fixes): the shared demo owner locked by wrong passwords now unlocks itself (the API clears the
  lockout with service account `wattprint-demo-admin` and retries); `/demo/session` answers only the dashboard (its
  client secret) and caps each visitor (5 a minute, by the address nginx saw) under the global 20, so one script no
  longer keeps everyone on 429.
- 2026-11-23 (T02, uncommitted; lane M, R1 ship, lane S for nginx/docs/copy):
  - Alerts v3: `getDevice` reuses the request's `getDevices` and a cached `tips`, so the add button reads
    `/energy/devices` once (7 devices: 8 backend calls, was 15). The per-device read stays as a `shortcut:`.
  - Alerts v3: a broken watch can be cancelled: backend `cancel_watch` ends active or broken rows
    (tests/test_watches.py), the alerts page shows the cancel button on every listed watch.
  - Alerts v3: with under two points of history a money template steps by 1,000 ₫ from the figure now rounded to it
    (templates.test.ts).
  - Public domains: `apply.sh` stops on a failed `nginx -t`; all three sites send `X-Forwarded-For $remote_addr`
    (both domains answer `server: nginx` with no CDN/proxy headers, so nginx is the edge); README/.env.example LAN
    recipe names `API_BIND=0.0.0.0`. Takes effect only after `sudo ./apply.sh` on the nginx host (not this server);
    then check Keycloak logs the real client IP, and a private IP there means a proxy in front: revert to
    `$proxy_add_x_forwarded_for` with `real_ip`.
  - Room spending: when the tile is by device, a lone device in a room is named by the device (rooms.test.ts).
  - Device log: LogStream takes a `timeZone` (patch.mjs feature patch, docs/design-system.md); the device timeline
    passes the home's `Asia/Ho_Chi_Minh`, so server, browser and the rest of the app agree.
  - Device page: with no runs the log subtitle is just "Chạy 0 lần".
- 2026-11-21 (change D, after docs/work/2026-11-21-alerts-v2):
  - Home settings location card: title left, field right from `md` (`md:grid-cols-3`), like the SettingsForm rows.
  - Hallmark beside the design system: the first real new page (Alerts) was built with Hallmark's app-screen
    rules inside `docs/design-system.md`; the ESLint design rules pass, nothing of Hallmark's theme was imported.
    Keep `ui-new` = hallmark with the repo's design system winning.
  - Wappi chart widget: a null x reads as an empty label; booleans read `true`/`false`; the data step is found
    once; infinities in a table are null (tested); hours over two days carry their day; `AreaChart` takes a `unit`
    (Hairline feature patch, `area-chart.tsx`, listed in docs/design-system.md).
  - Alert settings: the Overview links a watch alert only for its owner (the viewer's own watches); the unit words
    live in one `unitLabel` (minutes from Intl, no hard-coded words).
  - Alerts v2: repeating custom alerts read "daily"; the "tell you again" copy fits days, cycles and hours (web and
    mail); device details carry at least the last 30 days, so levels can be set on the 1st (the month chart filters
    to its month); in-app device on/off alerts show the run's time; `bad_device` has its own words.
  - wattprint-backend `DilatedResidualBlock`: a dilation list other than the trained (1, 2, 4, 8) is refused, not
    silently ignored (tests/test_nilm_block.py; torch runs in the nilm image).
- 2026-11-22 `packages/ui-patterns/src/ajv-browser.ts`: browser stub for `ajv/dist/2020.js` accepts any data (shortcut:
  only avatar-core validates our bundled Wappi character in the client). The alias key matches avatar-core 1.2.1's exact
  specifier; on an avatar-core upgrade, re-grep the client chunks for Ajv codegen, since a changed specifier brings the
  CSP crash back while the config test still passes. (R1 Minor)
