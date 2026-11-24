# Spec: savings plan (kế hoạch tiết kiệm)
Intent: [intent.md](intent.md). Status: approved (user, 2026-11-24). Record: none. Research: [research.md](research.md)

## Requirements

**Page and navigation**
1. Add a route `/dashboard/plan` (`PLAN_PATH`) and a sidebar entry "Kế hoạch tiết kiệm" (en "Savings plan"). Every
   piece of copy comes from `messages/{vi,en}/plan.json`.

**Opportunities.** Only real data is used. This is the empty state, and the first step when no plan is running.
2. Device actions come from the `advice` field of `GET /billing/devices/forecast`, as they are: `fewer_runs`,
   `kettle_fill`, `fridge_check`, `heater_setpoint` and `heater_earlier_off`. Each shows:
   - the device name and the action;
   - the kWh and đ saved by the end of the cycle;
   - "tránh bậc N" when `avoids_tier` is set;
   - a range of `saved × (1 ± error_pct/100)`, floored at 0. When `error_pct` is null, show "ước lượng thô" and no
     range;
   - a "mô phỏng" badge when the device is `simulated`.
3. An "always-on" action comes from the background load (`backgroundLoad` in `features/energy/days.ts`, the same
   number the Standby tile shows).
   - The user picks a target cut with a stepper in 5 W steps, from 5 W up to the background load rounded down to 5 W.
     The default is the background load ÷ 4 rounded to 5 W, at least 5 W.
   - Saving = W × 24 × days left in the cycle ÷ 1000 kWh, priced as in requirement 4.
   - It is labelled as a target the user chooses. NILM does not say which devices make up that load.
4. **Money at the marginal tier.** `billFor(kwh, tiers, vat)` prices a cycle from the tiers in `GET /billing/current`.
   An action's đ is `billFor(F) − billFor(F − Δ)`, where F is the forecast kWh for the cycle (`kwh_p50`). The plan's
   total prices the **sum** of its Δ in one go. It is not the sum of each action's đ, because tiers are not linear.
5. Show no time-shifting action, and no action for a device that NILM has not found.

**Making a plan**
6. The user selects 1 to 3 actions. Each selected action shows a fixed if-then commitment sentence for its key
   (one sentence per key, in `plan.json`).
7. The summary shows:
   - the forecast bill for the cycle without the plan and with it (`billFor(F)` and `billFor(F − ΣΔ)`);
   - the tier avoided, if any;
   - the total kWh as a range, next to its đ.
8. **Measurability warning.**
   - σ is the standard deviation of daily kWh over the last 28 whole days (`getDashboard().days`). The model's
     residuals are not used: the expected model is refit weekly on those very days, so its in-sample residuals would
     understate the noise. With fewer than 14 whole days, no warning is shown and the verdict stays "Chưa đủ dữ
     liệu".
   - When the plan's daily saving ΣΔ ÷ days left is below `2σ ÷ √(days left)`, show "Mức này khó đo được trong kỳ
     này". The plan can still be started.
9. The start date defaults to today. It can be set back within the current cycle ("ngày bạn bắt đầu làm"), but
   not before the active model's training day (requirement 11). It cannot be in the future.

**The plan, stored in the browser**
10. One active plan per user and home, kept in `localStorage` under `wattprint.plan.<userId>.<homeId>`. It holds:
    - the start date and the cycle end;
    - each action's key, device id, Δ kWh and đ at creation;
    - each planned device's usual kWh per day at creation (`explain.usual_kwh_day`), frozen as its baseline;
    - σ.
    
    A visible note says "Kế hoạch chỉ lưu trên trình duyệt này (bản thử)". Read-only demo viewers can make a plan,
    because nothing is written to the backend. "Dừng kế hoạch" deletes it. A plan whose cycle has ended shows its
    final result and offers a new plan.

**Following and verifying.** Real data only.
11. **Whole home.** For each day from the start until yesterday that has at least 20 measured hours: saving =
    expected P50 − actual, both summed over that day's measured hours only (`/expected`, fetched in 7-day windows
    because the backend serves at most 8 days a call). REFIT meters miss an hour or two most days, so requiring all
    24 hours left no day at all.
    - The expected value is **frozen per plan**. The backend refits the home model every 7 days and rewrites the past
      70 days with it, so a refit after the start would learn the lower use. The plan stores the home model's
      `model_version` at the start. It comes from `GET /expected`: the backend gained this one additive field in
      this change, because the bill forecast's `model_version` names the forecast method (`weekday-profile-v1`),
      not the expected-usage model. On each visit, while the forecast's `model_version` is still that one, the
      day's expected P50 is copied into the plan. After a refit, the stored values are used and the page says so.
    - The start date can go back no earlier than the day that model was trained (parsed from `ctx-v2-YYYYMMDD…`).
      This keeps every expected value out-of-sample.
    - The cumulative saving is shown with a band of ± 2σ√n, where n is the number of days.
    - Verdict: "Chưa đủ dữ liệu" while |saving| < 2σ√n. Otherwise "Đang tiết kiệm" (positive) or "Dùng nhiều hơn dự
      kiến" (negative).
    - kWh is always paired with đ, priced as in requirement 4.
12. **Planned devices.** Each device's daily kWh since the start (`GET /energy/devices/{id}` `days`) is compared with
    its frozen baseline. The device result is shown separately from the whole home, so rebound shows (devices save,
    home does not). It is labelled "chưa hiệu chỉnh thời tiết".
13. **Weekly check-in.** Show one row per 7-day block from the start: that week's whole-home saving with its verdict,
    and each planned device against its baseline. The current week is marked. The first day shows "Kết quả đầu tiên
    có sau một ngày trọn".

**Links to other features**
14. The following lead to the plan page:
    - The device forecast tile's advice (device page) gets "Thêm vào kế hoạch", linking to
      `/dashboard/plan?add=<deviceId>.<adviceKey>`, which preselects that action.
    - The bill forecast, when `next` is set, gets "Lập kế hoạch tránh bậc N".
    - Wappi's `PlanWidget` gets "Mở trang kế hoạch".
    
    Wappi's own `propose_plan` is not changed.

## Design
- **Feature slice** `features/plan/` (docs/adding-a-feature.md, features/README.md):
  - `math.ts`: pure functions `billFor`, `range`, `sigma`, `mde`, `verdict` and `weeks`, with Vitest tests.
  - `store.ts`: a `useSyncExternalStore` hook over `localStorage`, wrapped in try/catch. There is no zustand in the
    repo and one key does not justify adding it.
  - `components/`.
  - `queries.ts` reuses `billing/queries` and `energy/queries`, the existing `cache()` + `requirePermission`
    fetchers. It adds no new `server.ts`.
- **Page** `app/[locale]/(dashboard)/(pages)/dashboard/plan/page.tsx`. It is a server component that loads, in
  parallel:
  - the current bill;
  - the forecast;
  - device forecasts;
  - the series baseline;
  - 28 days of expected usage, plus the days since the start;
  - the planned devices' details.

  It hands these to a client island that reads the stored plan. Runtime APIs sit behind `<Suspense>`
  (cacheComponents, docs/data-fetching.md).
- **UI:** Hairline components first (hairline-ui skill), Sense-like flows, every kWh with đ, design-system tokens
  only.
  - Opportunities as selectable rows with a checkbox.
  - A stepper for watts.
  - A summary card with the bill with and without the plan, reusing `tier-ladder` if it fits.
  - A progress area with a chart of cumulative saving and its band (Hairline chart).
  - Weekly rows.
- **Rules:** `.claude/rules/` cards for dashboard features, i18n and design-system apply. Docs: data-fetching,
  internationalization, design-system, routing-and-layouts.

## Approaches considered
- **A (chosen):** a page built on real read APIs, with the plan stored in the browser. Every number is real; only
  where the plan is saved is temporary. No backend work.
- **B:** add plan endpoints to the backend (`tb_suggestion` and `tb_savings_measure` already exist). This is the right
  end state, but the user scoped the backend out for now.
- **C:** fixture mocks. Fastest, but the user asked for real data wherever possible, and it would hide whether the
  mechanism works on NILM data.

## Areas of concern
1. **The counterfactual absorbs savings.** Checked: `expect/services/refresh.py` refits weekly (`RETRAIN = 7 days`)
   and rewrites the past 70 days. Requirement 11 freezes the values in the browser. The real fix is backend storage
   per plan (debt).
2. The device baseline (28-day usual) is not weather-adjusted. It is labelled, not corrected.
3. The advice range from `error_pct` is a heuristic: the error of the device's forecast stands in for the error of the
   saving.
4. The default always-on target (÷ 4) is a heuristic. It gets a `shortcut:` comment.
5. σ from raw daily kWh includes weather swings, so the band is wider than a residual band would be. This errs
   toward "Chưa đủ dữ liệu" on purpose. Summing σ assumes independent daily residuals. Autocorrelation makes the band too narrow. The 2σ rule is
   conservative enough for a prototype; note it.
6. A plan in `localStorage` is lost on another browser and for guest accounts deleted after 24 h. This is accepted
   for the prototype and goes into debt.
7. Demo homes have no AC, so AC actions cannot be shown even though AC dominates use in Vietnam. The prototype only
   shows what NILM finds.
8. If any of the bill, forecast or device forecast APIs fail, the page throws to the error boundary (repo rule: a
   failed request never becomes `[]`). A home with no tariff shows the actions in kWh only.

## Open questions carried forward
- Backend plan storage and freezing the model per plan: for the backend owner, after the prototype.
