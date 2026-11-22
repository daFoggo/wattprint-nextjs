# Wappi answer widgets Implementation Plan

> **For agentic workers:** sdlc `build` role is inline: work the tasks in order in this session. Steps use
> checkbox (`- [ ]`) syntax. No commits until the owner asks (sdlc); the review loop runs after Task 5.

**Goal:** One widget contract per side that a new kind extends in one place, that drops a bad widget instead of
the answer, and that shows text2sql's chart.

**Architecture:** Backend Pydantic models per kind (discriminated union) built by the tools and dumped into the
reply. Web parses widgets one at a time, renders them through a typed registry, each inside an error boundary.
A new `chart` kind carries a normalized series/rows shape built from text2sql's data step.

**Tech Stack:** FastAPI + Pydantic v2, pytest (in the `api` container); Next.js 16, zod 4, vitest, Hairline UI.

**Spec:** docs/work/2026-11-20-copilot-widgets/spec.md

## Global Constraints

- Existing 8 kinds keep their exact JSON shape (stored `tb_message.reply` keeps rendering).
- Widgets are built by the backend from tool results, never by the model.
- Hairline components are used by props only (`packages/ui/src/components/hairline/**` is protected).
- `chart`: at most 200 points/rows; non-finite → `null`; types `line | area | bar | donut | kpi | table`.
- UI copy in vi and en (`.claude/rules/i18n.md`); no arbitrary Tailwind values (`.claude/rules/ui.md`).
- Backend: no module docstrings, relative imports inside the module, Python 3.14 (wattprint-backend/AGENTS.md).

## Review Focus

1. A stored answer from before this change (8 old kinds, `links` with keys) still renders → Task 3 test
   `keeps old stored widgets`.
2. A reply with one unknown kind (`{kind: "alert_card"}`) among valid ones → others show → Task 3 test.
3. text2sql step with rows but `chart: null`, or `display: "none"` → `table`, not nothing → Task 2 tests.
4. Rows with a `NaN`/string where a number is expected → `null`, chart still drawn → Task 2 test.
5. A widget component that throws (e.g. `watts: []` makes `.at(-1)` undefined) → the answer text still shows →
   Task 4 test `a throwing widget leaves the rest`.

---

### Task 1: Backend widget models, tools build them

**Files:**
- Create: `wattprint-backend/app/modules/copilot/schemas/schema_widget.py`
- Modify: `wattprint-backend/app/modules/copilot/schemas/__init__.py` (export `Widget`, each model)
- Modify: `wattprint-backend/app/modules/copilot/services/tools.py` (`Outcome.widgets: list[Widget]`; each
  `widgets=[{...}]` becomes a model instance; links stay `Outcome.links`)
- Modify: `wattprint-backend/app/modules/copilot/services/chat.py` (`Turn.reply`: `widgets[w.kind] = w`,
  output `[w.model_dump(mode="json") for w in widgets.values()]`, `links` built as `LinksWidget`)
- Test: `wattprint-backend/tests/test_copilot_widgets.py`

**Interfaces:**
- Produces: models `DevicesWidget, CompareWidget, ForecastWidget, WeatherWidget, PlanWidget, PeersWidget,
  StandbyWidget, LinksWidget, ChartWidget` (each `kind: Literal[...]`), `Widget = Annotated[Union[...],
  Field(discriminator="kind")]`, and `WIDGET = TypeAdapter(Widget)`.
- `ChartWidget`: `type: Literal["line","area","bar","donut","kpi","table"]`, `title: str | None`,
  `labels: list[str]`, `series: list[ChartSeries]` (`label: str`, `unit: str | None`,
  `values: list[float | None]`), `columns: list[str]`, `rows: list[list[str | float | None]]`.

- [ ] **Step 1:** test `test_every_kind_round_trips`: for one sample dict per old kind (copy each shape from the
  web's `WidgetSchema`, e.g. `{"kind": "forecast", "used": 120.0, "limit": 150.0, "kwh": 210.0, "vnd": 630000.0}`),
  `WIDGET.validate_python(d).model_dump(mode="json") == d`. And `test_rejects_bad_widget`:
  `{"kind": "forecast", "used": "x"}` raises `ValidationError`.
- [ ] **Step 2:** run `docker compose exec api pytest tests/test_copilot_widgets.py -q` → FAIL (import error).
- [ ] **Step 3:** write the models; switch tools and `Turn.reply` to them.
- [ ] **Step 4:** run the new test plus `tests/test_copilot_api.py` → PASS (existing reply assertions unchanged
  prove the JSON shape held).

### Task 2: `chart_widget` from text2sql steps

**Files:**
- Modify: `wattprint-backend/app/modules/copilot/services/tools.py` (new `chart_widget`, called in `query_data`)
- Test: `wattprint-backend/tests/test_copilot_widgets.py`

**Interfaces:**
- Consumes: `ChartWidget`, `ChartSeries` (Task 1).
- Produces: `chart_widget(steps: list[dict[str, Any]]) -> ChartWidget | None` (pure). `query_data` passes it its
  collected `steps`; the result goes into `Outcome.widgets` when not None.

Fixture `STEP` = the captured `query_metric` step: `chart = {"version": 1, "type": "line", "encoding": {"x":
{"field": "bucket", "label": "Thời điểm bắt đầu bucket", "time_unit": "day"}, "y": [{"field": "total_kwh",
"label": "Tổng điện năng cả nhà", "aggregate": "none"}]}}`, `columns = ["bucket", "total_kwh"]`, rows
`[["2026-11-13T00:00:00+07:00", 9.74], ["2026-11-14T00:00:00+07:00", 15.51]]`, `sql = "select ..."`,
`display = "chart_if_last"`.

- [ ] **Step 1: tests**
  - `test_line_from_real_step`: type `line`, `labels == ["2026-11-13T00:00:00+07:00", ...]`,
    `series[0].label == "Tổng điện năng cả nhà"`, `values == [9.74, 15.51]`, `columns`/`rows` copied.
  - `test_agent_chart_wins`: steps `[STEP | result_id "r1", {"tool": "make_chart", "result_id": "r1", "chart":
    {... "type": "bar" ...}, "columns": [], "rows": []}]` → type `bar`.
  - `test_table_when`: each of `chart=None`, `display="none"`, `chart.type="sankey"`, `encoding.series` set,
    `transform={"top_n": {"n": 5}}`, `aggregate="sum"`, repeated x → type `table` with rows.
  - `test_non_finite_becomes_null`: a row value `"abc"` / `float("nan")` → `None` in `values`.
  - `test_caps_200`: 250 rows → 200 labels and rows.
  - `test_none_without_data`: `[]`, a step with `error`, a step with `rows: []` → `None`.
  - pie/donut → `donut`, `area_stacked` → `area`, `bar_horizontal` → `bar`, `kpi` → `kpi`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement. Data step = last with `sql` and no `error` (same rule as `query_data`'s `last`;
  reuse it, do not compute twice). Values: `float(v)` if a finite number else `None`; labels `str(v)`.
- [ ] **Step 4:** run → PASS; `docker compose exec api ruff check app tests` clean.

### Task 3: Web schema, tolerant widget parsing, `chart` kind

**Files:**
- Modify: `wattprint-web/apps/dashboard/features/copilot/schemas.ts`
- Test: `wattprint-web/apps/dashboard/features/copilot/__tests__/schemas.test.ts`

**Interfaces:**
- Produces: `WidgetSchema` gains the `chart` member (shape from spec req. 6); `type Widget` unchanged in name.
  `ReplySchema.widgets` = `z.array(z.unknown()).transform(keepValid)` where `keepValid` drops each item whose
  `WidgetSchema.safeParse` fails and calls `console.warn("copilot widget dropped", kind, issues)`.

- [ ] **Step 1: tests** (on `ChatEventSchema` `done`, like the existing test)
  - `keeps old stored widgets`: one sample of each old kind → all 8 kept.
  - `drops only the bad widget`: `[{kind: "alert_card"}, forecastSample, {kind: "forecast", used: "x"}]` →
    parse succeeds, widgets `== [forecastSample]`, `console.warn` called twice (vi.spyOn).
  - `reads a chart widget`: the Task 2 line shape → kept.
  - `ConversationSchema` with the bad list in a stored message also parses.
- [ ] **Step 2:** `pnpm --filter dashboard test -- schemas` → FAIL.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** → PASS.

### Task 4: Registry, error boundary, chart component

**Files:**
- Modify: `wattprint-web/apps/dashboard/features/copilot/components/widgets.tsx`
- Modify: `wattprint-web/apps/dashboard/messages/{vi,en}/copilot.json` (`widgets.chart.untitled`)
- Test: `wattprint-web/apps/dashboard/features/copilot/__tests__/widgets.test.tsx` (only if the vitest config
  already renders React; otherwise the boundary is checked in the browser in Task 5 and noted)

**Interfaces:**
- Consumes: `Widget` (Task 3).
- Produces: `CopilotWidget({ widget })` keeps its name and props (callers unchanged); internally
  `const WIDGETS: { [K in Widget["kind"]]: (p: { widget: Extract<Widget, { kind: K }> }) => ReactNode }` and a
  class `WidgetBoundary` (renders `null` on error, `console.warn` in `componentDidCatch`).

- [ ] **Step 1:** move each `case` body into a `WIDGETS` entry unchanged; add `chart`:
  `line`/`area` → `AreaChart` (`labels`, `series` → `{id, label, values}`), `bar` → `ComboChart` if it renders
  without the average line, else `AreaChart`; `donut` → `DonutChart` (`labels[i]` × `series[0].values[i]`);
  `kpi` → `Stats` (each series' last value + unit); `table` → `DataTable` (`columns`, `rows`). Title
  `widget.title ?? t("chart.untitled")`. `null` values: skip in donut, 0-gap per component behaviour elsewhere.
- [ ] **Step 2:** `pnpm --filter dashboard exec tsc --noEmit` passes; removing a `WIDGETS` key fails it (try once,
  revert).
- [ ] **Step 3:** test `a throwing widget leaves the rest` if React rendering is set up (see Files).

### Task 5: Verify end to end

- [ ] backend: `docker compose exec api pytest -q` and `ruff check app tests alembic` → 0 failures.
- [ ] web: `pnpm check` (the sdlc verify) and `pnpm build` (dev server stopped first, per local notes).
- [ ] signed in, ask Wappi "Điện năng mỗi ngày trong 7 ngày qua" → the answer shows a line chart; ask about the
  bill → old widgets still show; open an old conversation → renders.
- [ ] review loop R1 (sdlc:reviewer, base backend `290d5b4`, web `0f49b11`; Watch hunks out of scope).
