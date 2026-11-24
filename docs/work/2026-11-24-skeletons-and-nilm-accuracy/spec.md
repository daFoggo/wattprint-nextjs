# Skeletons at real size; NILM accuracy per device; device figures from NILM only (lane M)

Record: user 2026-11-24 ("height tự dưng dài ra khi mới load ... skeleton ... đồng bộ theo kích cỡ thật";
"card Điện năng theo thiết bị cũng nên show độ tin cậy ... như lúc training nilm"; "mọi api ... dựa trên số suy
luận từ nilm, cấm lấy từ raw data gốc").

## Requirements
1. Skeletons: each tile's fallback body is its loaded size measured at lg (the row's height) and below lg (its own),
   minus the 90 px of shell and header (`TileSkeleton` `mobile`, two wrapped blocks so no arbitrary values). The
   statistics page's outer fallback is the page's grid of skeletons, not one block. Overview, statistics, bill,
   alerts, plan, device pages updated.
2. NILM accuracy: each per-house bundle's JSON sidecar carries `meta.test_by_device` (held-out test split, REFIT plugs
   as truth, soft gate as the worker runs it; `dataset/training/score_bundle.py` for a bundle that lacks it, House 2).
   `nilm.services.scores` reads the sidecar of the model the worker runs for the home (runner's query), cached by
   mtime; level from energy F1 (config `nilm_high_f1` 0.7, `nilm_medium_f1` 0.5). `/energy/devices` and the device
   detail carry `estimate {level}` or null (Other, unscored). The api container
   gets `NILM_MODEL_DIR` (the dataset is already mounted read-only).
3. Web (revised on user feedback: "đừng show thông tin chi tiết quá ... đứng dưới vai trò dữ liệu kết quả thực tế";
   "icon ngắn gọn ở các hàng thiết bị kèm tooltip theo từng row ... vẫn giữ dạng dọc"): certainty is a level only,
   never the scores behind it nor "against the plug" (a real home has no plugs). `/energy/devices` returns
   `estimate {level}`; the scores stay in the sidecar. The overview device mix keeps its vertical design: each legend
   row gets signal bars after its name with the level in a tooltip, through a Hairline patch (`DonutSlice.mark` and
   `markLabel`, the latter in the row's accessible name). The same rule removes "off by x %" from the device forecast
   tooltip and the bill forecast popover ("checked on n past cycles" instead).
4. Raw data guard: a test pins that the demo replay reads only the Aggregate column (never an appliance channel);
   audit result: only `main` and NILM-written `device` series exist; every app reader uses `kind='device'`; raw CSVs
   are read only by `scripts/eval_nilm.py` and offline `dataset/` scoring.

## Areas of concern
1. The scores are per device type and per model, from the house the model was trained on; a real home with the
   shared model gets that model's scores (it has none today: no shared bundle is scored).
2. `energy.services.devices` imports the nilm api inside a function: the NILM runner imports energy at load.
3. Recreating the api container restarted db and Keycloak (compose dependency); prod web stayed up.
