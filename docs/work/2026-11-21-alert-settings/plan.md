# Alert settings Implementation Plan

> **For agentic workers:** sdlc `build` role is inline: work the tasks in order in this session. Steps use
> checkbox (`- [ ]`) syntax. No commits until the owner asks (sdlc); the review loop runs after Task 6.

**Goal:** Users set, see and cancel their alerts on a page and on a device's page, and reach an alert Wappi saved
from its card in the chat.

**Architecture:** One backend route (`POST /insights/watches`) over the existing `create_watch`; the copilot tool
adds a `watch` widget. The web `features/insight` slice gets watch schemas, server calls, a query, two actions and
two components (list, form) that the alerts page and the device tile compose.

**Tech Stack:** FastAPI + Pydantic v2, pytest (`api` container); Next.js 16 (Server Actions, `refresh()`), zod 4,
vitest, Hairline UI.

**Spec:** docs/work/2026-11-21-alert-settings/spec.md

## Global Constraints

- Metrics in the form: `bill_vnd, bill_kwh, forecast_vnd, today_kwh, power_w, device_kwh_today` (never `sql`).
- At most 10 active alerts per user per home; refusals come from the backend's `WatchError` codes.
- `already_crossed`, `too_many` → 409; any other WatchError → 422; `code` = the WatchError code.
- Reads fresh per request (React `cache`); create and cancel call `refresh()` from `next/cache`.
- Row anchor `id="watch-<id>"`; card link `/dashboard/alerts#watch-<id>`.
- Copy vi first, en complete; Hairline first; no arbitrary Tailwind values; both themes; 375 and 1440 px.
- Backend: no module docstrings, relative imports in the module (wattprint-backend AGENTS.md).

## Review Focus

1. A housemate (same home) posting a `device_id` from another home, or cancelling someone else's alert → refused
   → Task 1 test `post_refuses_other_homes_device`.
2. Threshold typed as `1.000.000` or `1,5` in the vi form → read as a number, or a clear field error, never a 500
   → Task 4 test `parses_vi_numbers`.
3. The backend answers 409 `already_crossed` → the form says it is already past with the value now, the values stay
   → Task 4 test `already_crossed_keeps_values`.
4. An alert whose `last_value` is null (no reading yet) → row shows "chưa có số" and no meter → Task 5 state check.
5. Wappi's card link opens the page with the new row present (fresh read) → Task 6 browser check.

---

### Task 1: `POST /insights/watches` and `device_id` in `WatchRead`

**Files:**
- Modify: `wattprint-backend/app/modules/insight/schemas/schema_watch.py` (`WatchCreate`, `WatchCreated`,
  `WatchRead.device_id`), `schemas/__init__.py`
- Modify: `wattprint-backend/app/modules/insight/routes/watches.py` (POST)
- Test: `wattprint-backend/tests/test_watches.py`

**Interfaces:**
- Produces: `WatchCreate {metric: Literal[6 metrics], op: Literal["gt","lt"], threshold: float (finite),
  label: str 1..200 stripped, device_id: uuid | None = None, ends_on: date | None = None}`;
  `WatchCreated(WatchRead) {value_now: Decimal | None}`; JSON of `WatchRead` gains `device_id`.

- [ ] **Step 1: tests** (`client`, `make_member` fixtures as in `test_watch_api_lists_and_cancels_only_the_users_own`)
  - `post_creates_and_reads_back`: POST `{metric: "power_w", op: "gt", threshold: 50000, label: "Công suất"}` →
    201, body `label`, `status == "active"`, `value_now` key present; GET lists it with `device_id: null`.
  - `post_maps_refusals`: monkeypatch the watches service's `measure` to return `Decimal(10)`; POST
    `op: "gt", threshold: 5` → 409, `code == "already_crossed"`, `value_now == 10`. 11th active → 409
    `too_many`. `metric: "sql"` → 422 (schema).
  - `post_refuses_other_homes_device`: `device_kwh_today` with a device id of another home → 422 `no_device`.
- [ ] **Step 2:** `docker compose exec api pytest tests/test_watches.py -q -k post` → FAIL (405).
- [ ] **Step 3:** route `create(body, member, db) -> WatchCreated` (201): `create_watch(..., now=utcnow())`, commit;
  `WatchError` → `ConflictError(str(e), code=e.code, extra={"value_now": ...})` or `UnprocessableError`.
- [ ] **Step 4:** → PASS; ruff clean.

### Task 2: copilot `watch` widget

**Files:**
- Modify: `wattprint-backend/app/modules/copilot/schemas/schema_widget.py` (`WatchWidget` in the union),
  `schemas/__init__.py`, `services/tools.py` (`create_watch_tool`'s success `Outcome.widgets`)
- Test: `wattprint-backend/tests/test_copilot_widgets.py` (sample round-trip), `tests/test_watches.py`

**Interfaces:**
- Produces: `WatchWidget {kind: "watch", id: str, label: str, op: Literal["gt","lt"], threshold: float,
  unit: str, value: float | None, ends_at: datetime}` (JSON `ends_at` ISO with offset).

- [ ] **Step 1: tests:** add a `watch` sample to `SAMPLES`; in `test_wappi_saves_a_custom_watch_from_text2sqls_query`
  assert `out.widgets[0].kind == "watch"` and `out.widgets[0].id == out.data["watch_id"]`; a refused create has no
  widget (`test_refuses_what_is_already_past...` path through the tool, or a new small test).
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** → PASS.

### Task 3: web data layer

**Files:**
- Modify: `apps/dashboard/features/insight/schemas.ts` (`WatchSchema`, `WatchCreateSchema`, `WATCH_METRICS`),
  `server.ts` (`fetchWatches`, `createWatch`, `cancelWatch`), `queries.ts` (`getWatches`),
  `actions.ts` (`createWatchAction`, `cancelWatchAction`)
- Modify: `apps/dashboard/features/copilot/schemas.ts` (`watch` widget member)
- Test: `features/insight/__tests__/watches.test.ts`, `features/copilot/__tests__/schemas.test.ts`

**Interfaces:**
- `WatchSchema`: `{id, label, metric, op: "gt"|"lt", threshold: number, unit, status: enum 5, last_value:
  number|null, last_checked_at: ts|null, fired_at: ts|null, ends_at: ts, created_at: ts, device_id: string|null}`
  (decimals arrive as strings: `z.coerce.number()`).
- `getWatches(): Promise<Watch[] | null>` (null without a home, like `getAlerts`).
- `createWatchAction(prev: WatchFormState, form: FormData): Promise<WatchFormState>` with
  `WatchFormState = { error?: string; values?: Record<string, string>; ok?: number }` (`ok` = a counter so the
  form resets); `cancelWatchAction(id: string): Promise<void>`; both `refresh()`.
- Threshold parsing `parseThreshold(text: string, locale: string): number | null` in `schemas.ts`: drop the
  locale's group separator, read its decimal separator.

- [ ] **Step 1: tests:** `parses_vi_numbers` (`"1.000.000"` vi → 1000000, `"1,5"` vi → 1.5, `"1,000.5"` en →
  1000.5, `"abc"` → null); `WatchSchema` reads a backend row with string decimals; action validation paths
  (mock `server-only` and `./server`): bad threshold → `{error, values}`; 409 `already_crossed` with
  `value_now` → `already_crossed_keeps_values` (error names the value, values kept); 409 `too_many`; success →
  `ok` increments and `createWatch` got `{metric, op, threshold, label, device_id?, ends_on?}`. Copilot:
  a `watch` widget sample parses.
- [ ] **Step 2:** `pnpm --filter dashboard exec vitest run features/insight features/copilot` → FAIL.
- [ ] **Step 3:** implement. **Step 4:** → PASS.

### Task 4: components: list, form, watch card

**Files:**
- Create: `features/insight/components/watch-list.tsx`, `features/insight/components/watch-form.tsx`
- Modify: `features/copilot/components/widgets.tsx` (registry `watch`), `features/insight/components/alert-list.tsx`
  (watch_hit / watch_broken link to the row), messages `vi|en/insight.json` (`watches.*`), `copilot.json`
  (`widgets.watch.*`)

**Interfaces:**
- `WatchList({ watches, devices, cancel })`: `devices: {id, name}[]`, `cancel: (id) => Promise<void>`; rows per
  spec 6; empty state with a link to Wappi (`COPILOT_PATH`); cancel through Hairline `ConfirmAction` (or the
  house confirm pattern); `UsageMeter` for active `gt` rows with a value.
- `WatchForm({ action, devices, device? })`: `useActionState(action)`; Hairline inputs; device fixed when `device`
  is given (metric fixed to `device_kwh_today`); shows the default end per spec 11; label built from copy.
- Card: label, condition, value now, end date, `Link` "Xem cảnh báo" to `${ALERTS_PATH}#watch-${id}`.

- [ ] **Step 1:** build; `tsc --noEmit` and eslint clean; vi/en keys present in both files.

### Task 5: route, nav, device tile

**Files:**
- Modify: `config/routes.ts` (`ALERTS_PATH = "/dashboard/alerts"`), `config/navigation.ts` (entry after Devices,
  icon `alerts`), `components/layout/sidebar/nav-icons.tsx` (`alerts: IconBell`), messages `layout.json`
  (`nav.alerts`, `alerts.title`, `alerts.description`)
- Create: `app/[locale]/(dashboard)/(pages)/dashboard/alerts/page.tsx` (+ `loading` per sibling pages if they
  have one)
- Modify: `app/[locale]/(dashboard)/(pages)/dashboard/devices/[id]/page.tsx` (tile "Cảnh báo cho thiết bị này",
  full row `lg:col-span-12` at the end)

- [ ] **Step 1:** page composes `getWatches`, `getDevices`, `WatchForm`, `WatchList` in `Suspense` with skeletons;
  without a home → `NoHome`. Error state is the route's error boundary (as sibling pages).
- [ ] **Step 2:** `pnpm check` passes.

### Task 6: verify

- [ ] backend: `docker compose exec api pytest -q`, `ruff check app tests alembic` → clean.
- [ ] web: `pnpm check`, `pnpm build` (dev servers stopped first, relaunched after).
- [ ] signed in (test account, temporary membership): set an alert from the page; refusal path (already past);
  cancel with confirm; set one from a device page; ask Wappi to set one, follow the card link → the row is there;
  Overview watch item links to its row. 1440 and 375 px, dark and light.
- [ ] hallmark sweep: `sloplint --scope app --url http://localhost:11092/vi/dashboard/alerts`.
- [ ] review loop R1 (sdlc:reviewer), Watch and widgets changes out of scope.
