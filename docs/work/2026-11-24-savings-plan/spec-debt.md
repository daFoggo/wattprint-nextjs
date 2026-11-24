# Spec, debt pass (lane L): pay the savings-plan, change-3 and audit debt
User (2026-11-24): "xử lý triệt để debt đi" — every Minor and deferred audit item is fixed, none parked.
Bases: web snapshot 8ed7b5a, backend snapshot 60da865. The items, as listed under "Paid" in docs/debt.md:

Backend
1. `create_plan`: the insert runs in a savepoint; the unique index's IntegrityError answers 409 `plan_exists`.
   The freeze after it runs in its own savepoint; a failure is logged, the plan is still stored (201).
2. `day_bias(plan, bundle)`: the plan's stored bias while its own model predicts; after a refit, the new model's
   out-of-sample mean (0 under 14 residuals). `freeze_plans` uses it per newly set day.
3. `scripts/seed_demo_plans.py`: `replace_plans` swaps the owner's `holdout-%` plans only when at least one was
   rebuilt. `measure_days` is imported from `services.plans`, not exported by the package.
4. Wappi's weather tool: "ERA5 qua Open-Meteo" / "ERA5 via Open-Meteo" for a demo home's stored weather.

Web
5. `measuredBy(plan, basis, forecast)`: the live basis and forecast, else the running plan's own record; the plan
   page shows a running plan with the basis or forecast gone, and says "needs a tariff" when the bill is gone.
6. Past plan page: past-tense hero and "not saved" copy; dates carry the end's year (page, list, breadcrumb).
7. Device list: the narrow card shows the plain name through a DataTable `cardCell` feature patch (patch.mjs,
   listed in docs/design-system.md); the row keeps the name link.
8. The plan page's history pill and the record page's older/newer chips sit in `HideOnError`.
9. The record page takes device types from `getDevices()`.
10. Overview: with an open alert, the alerts tile is first in the DOM; every tile carries `lg:order-*` so lg keeps
    the bento.
11. Copy: vi/en in step; device "Mẹo tiết kiệm" tile leads with its tip.
12. Audit leftovers: statistics in three headed groups (Tiền điện, Điện năng, So với hộ tương tự; the last only with
    a cohort; one NoHome without a home); the bill tile's hero is the forecast with the cycle's progress and an
    Alert explaining partial data / a tariff change; settings: location after "Ngôi nhà" (the form split in two),
    "Đã lưu vị trí" after a pick, the cycle day a choice of 1–28; standby cut quick picks 25/50/75%
    (`alwaysOnPresets`).

## Areas of concern
1. Two `SettingsForm`s with `autosave` and `warnOnLeave` on one page (owner view): each keeps its own dirty state.
2. `lg:order-*` on the Overview: lg's visual order differs from the DOM when an alert is open (focus follows DOM).
3. The statistics rows are paired by measured heights at 1440 px (392 / 697 / 377 / 476); other widths unmeasured.
