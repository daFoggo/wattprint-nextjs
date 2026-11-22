# Alerts v3 Implementation Plan

> **For agentic workers:** executed inline (superpowers:executing-plans rules, sdlc review loop at the end).
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Alerts page shows what fired, then what is watched, and adds an alert through one button and a
two-step sheet.

**Architecture:** Server page composes three parts: `AlertList` (full mode), `AutoAlerts` + `WatchList` (active only),
and the client `AddAlert` (button + detail sheet). Template defaults and previews are pure functions in
`features/insight/templates.ts`. No backend change.

**Tech Stack:** Next.js 16.4 (Cache Components), next-intl, Hairline UI (DetailSheet, PillSelect, StepperInput, Switch,
EmptyState, Alert), vitest.

**Spec:** [spec.md](spec.md)

## Global Constraints

- Hairline first; no hand-rolled select/stepper; sizes via props; stock tokens only (`.claude/rules/ui.md`).
- Every visible string in `messages/{vi,en}/insight.json` (Vietnamese first); numbers via `formatFigure` and the locale.
- Components hold no logic; logic in `templates.ts` with tests (`.claude/rules/dashboard-features.md`).
- Errors inside the open sheet use Hairline `Alert`, not a toast (docs/design-system.md, toasts sit behind sheets).

## Review Focus

1. A home with no named devices (no NILM devices yet): the Thiết bị group is hidden, the panel still works. Test in Task 1 (`templatesFor` with no devices).
2. No price known: the daily template is set in kWh, not ₫. Test in Task 1.
3. A source with fewer than 2 history points: default falls back to the figure now (or 0 → step), preview line hidden. Test in Task 1.
4. A refusal from the backend (`too_many`, `already_past`): message shows inside the sheet and the sheet stays open. Checked in the app (Task 4).
5. `PillSelect` menus open above the sheet at 375 and 1440 px. Checked in the app (Task 4).

---

### Task 1: Templates and previews (pure)

**Files:**
- Create: `apps/dashboard/features/insight/templates.ts`
- Test: `apps/dashboard/features/insight/__tests__/templates.test.ts`

**Interfaces:**
- Consumes: `AlertSource`, `lineScale` from `features/insight/sources.ts`.
- Produces:
  - `type TemplateKey = "daily" | "cycle" | "power" | "device_run_min" | "device_on" | "device_off"`
  - `type Template = { key: TemplateKey; group: "money" | "device" | "home"; metric: string; unit: "vnd" | "kwh" | "w" | "min" | null; history: number[]; start: number; step: number }`
  - `templatesFor(sources: AlertSource[], hasDevices: boolean): Template[]`: daily/cycle (money), power (home) from
    `sources` (values = `data.map(d => d.value)`, `start`/`step` from `lineScale`, or `now ?? 0` and step 1 under 2
    points); device templates (unit `min` for run length with start 30, step 15; `null` for on/off) only when
    `hasDevices`.
  - `previewCount(history: number[], threshold: number): number | null`: points strictly above the threshold; `null`
    under 2 points.
  - `RUN_MINUTES = [15, 30, 60, 120, 240]`.

- [ ] **Step 1: Write the failing tests** `templatesFor` (order money, device, home; no device group without devices;
  daily unit `kwh` when the source unit is `kwh`; fallback start/step under 2 points) and `previewCount` (`[10, 50, 80]`
  over 40 → 2; `[5]` → null).
- [ ] **Step 2: Run** `pnpm exec vitest run features/insight/__tests__/templates.test.ts` (in apps/dashboard): FAIL, module missing.
- [ ] **Step 3: Implement** `templates.ts` with the signatures above.
- [ ] **Step 4: Run** the same command: PASS.

Standards: `.claude/rules/dashboard-features.md`.

### Task 2: Add-alert sheet

**Files:**
- Create: `apps/dashboard/features/insight/components/add-alert.tsx`
- Modify: `apps/dashboard/messages/{vi,en}/insight.json` (new `add` block)

**Interfaces:**
- Consumes: `Template`, `templatesFor`, `previewCount`, `RUN_MINUTES` (Task 1); `saveWatchAction(input) => Promise<SaveResult>`,
  `setDeviceEventAction(deviceId, "device_on" | "device_off", on, label) => Promise<SaveResult>`; `DetailSheetContent`,
  `DetailSheetHeader`, `DetailSheetClose` from `components/shared/detail-sheet.tsx`; Hairline `Sheet`/`SheetTrigger` as
  the detail sheet doc shows.
- Produces: `AddAlert({ sources, devices, price, save, setEvent, variant? })` where
  `devices: { id: string; name: string; type: string; longest: number[] }[]` (each device's daily longest run, minutes)
  and `variant?: "button" | "empty"` (the empty-state action reuses the same sheet).

- [ ] **Step 1:** Step 1 view: three groups (Tiền điện / Thiết bị / Cả nhà) of rows (icon, title, hint) from `templatesFor`.
- [ ] **Step 2:** Step 2 view: the sentence with chips. Device `PillSelect` (first device by default), minutes `PillSelect`
  (`RUN_MINUTES`), money/watts `StepperInput` (`step`, start `start`); the preview line from `previewCount` (device run
  length uses the device's `longest`); repeat `Switch` for daily/cycle/power, on by default.
- [ ] **Step 3:** Save: on/off → `setEvent(id, metric, true, label)`; the rest → `save({ metric, op: "gt", threshold,
  label, device_id?, repeat })` (daily in ₫ converts with `toKwh`). Refusal → Hairline `Alert` in the sheet; success →
  close, `toast.success`, reset to step 1.
- [ ] **Step 4:** Copy vi/en: step titles, group names, template titles/hints/sentences, preview, repeat, buttons, saved.
- [ ] **Step 5:** `pnpm exec eslint --max-warnings 0 features/insight && pnpm exec tsc --noEmit -p .`: clean.

Standards: `.claude/rules/ui.md`, `.claude/rules/i18n.md`, `.claude/rules/vendored-ui.md`.

### Task 3: The page, the watched list, the automatic switches; remove the old parts

**Files:**
- Modify: `apps/dashboard/app/[locale]/(dashboard)/(pages)/dashboard/alerts/page.tsx`
- Modify: `apps/dashboard/features/insight/components/watch-list.tsx` (active watches only; empty state with `AddAlert variant="empty"` passed as a slot)
- Create: `apps/dashboard/features/insight/components/auto-alerts.tsx` (two `Switch` rows, tag "Tự động", calls the settings action with one key)
- Modify: `apps/dashboard/features/insight/components/device-alerts.tsx` (delete `DeviceAlertList`, `RunLimit`, `RUN_LIMITS`)
- Modify: `apps/dashboard/features/insight/actions.ts`, `__tests__/watches.test.ts` (drop the unused `device_run_min` branch of `setDeviceEventAction` and its two tests)
- Delete: `apps/dashboard/features/insight/components/alert-builder.tsx`; `features/home/components/alert-preferences.tsx` if nothing else imports it
- Modify: `messages/{vi,en}/insight.json`, `layout.json` (page description; drop keys only the removed parts used)

**Interfaces:**
- Consumes: `AddAlert` (Task 2); `getAlerts`, `getWatches`, `getDevices`, `getDevice`, `getDashboard`, `getPower`,
  `getCurrentBill`, `getBillHistory`, `getHomeSettings`; `saveHomeSettingsAction(patch)`; `acknowledgeAlertAction`,
  `sendAlertFeedbackAction`.
- Produces: the page described in spec §Requirements 1–5.

- [ ] **Step 1:** Page: `PageHead` with `action={<AddAlert … />}`; plate "Đã báo" = `AlertList` (full mode); plate "Đang
  theo dõi" = `AutoAlerts` then `WatchList`. Device details loaded in parallel with a `shortcut:` comment.
- [ ] **Step 2:** Remove the old parts and their now-unused keys; `grep` that nothing imports them.
- [ ] **Step 3:** `pnpm exec vitest run features/insight && pnpm exec eslint --max-warnings 0 features app && pnpm exec tsc --noEmit -p .`: pass.

Standards: `.claude/rules/dashboard-routes.md`, `.claude/rules/dashboard-features.md`, `.claude/rules/ui.md`, `.claude/rules/i18n.md`.

### Task 4: Verify in the app

- [ ] Signed in as `refit.house5@wattprint.local`: open Alerts at 375 and 1440, dark and light; add each template once
  (check `tb_watch`), remove them; flip both automatic switches and back; force a refusal (an amount already passed
  for a non-repeating rule is not reachable from the UI: use a device on-alert twice is deduped, so check the error
  path with the backend stopped for one save); `PillSelect` opens above the sheet.
- [ ] Admin with no home: NoHome. `pnpm check`, `pnpm build` (dev servers stopped first, `.next/dev` cleared after).
- [ ] Review loop R1–R3 (sdlc:reviewer) with the files of this change.
