# Spec: Wappi's answer widgets, one contract that does not break
Intent: docs/work/2026-11-20-copilot-widgets/intent.md. Status: approved (owner asked to proceed on the proposal,
2026-11-20). Record: none

## Requirements
1. Backend: every widget kind is a Pydantic model in `app/modules/copilot/schemas/schema_widget.py`, joined in a
   discriminated union `Widget` on `kind`. Tools return model instances (`Outcome.widgets: list[Widget]`); the reply
   dumps them with `model_dump(mode="json")`. A tool can no longer emit a widget whose shape the model rejects
   (a test builds every kind).
2. The existing 8 kinds keep their exact JSON shape (`devices`, `compare`, `forecast`, `weather`, `plan`, `peers`,
   `standby`, `links`), so stored answers and the web keep working.
3. Web: the reply's `widgets` is parsed one widget at a time. A widget that fails its schema is dropped and
   reported with `console.warn("copilot widget dropped", kind, issues)`; the reply and the other widgets still
   parse. This holds for the `done` and `error` events and for stored conversations.
4. Web: each widget renders inside its own error boundary; a widget that throws while rendering shows nothing
   and the rest of the answer stays.
5. Web: a registry `{ [K in Widget["kind"]]: Component<Extract<Widget, {kind: K}>> }` replaces the `switch`; a
   kind in the schema with no component, or the reverse, is a type error.
6. New kind `chart`, built by `query_data` from the same step its `data` already uses (the last step with `sql`
   and no `error`), so the chart always matches the text answer. That step's own `chart` (text2sql's automatic one)
   is used, unless a later `make_chart` step carries the same `result_id`: then that agent chart wins (a
   `make_chart` step has no rows of its own). *Builder's call, from a captured stream: `query_metric` arrives with
   `chart`, `columns`, `rows`, `fields` and `display: "chart_if_last"`.* Shape:
   `{kind: "chart", type: "line" | "area" | "bar" | "donut" | "kpi" | "table", title: string | null,
   labels: string[], series: [{label: string, unit: string | null, values: (number | null)[]}],
   columns: string[], rows: (string | number | null)[][]}`.
   - The backend maps text2sql's spec to this shape: `encoding.x` gives `labels`, each `encoding.y[]` a series;
     `pie`/`donut` → `donut`; `line` → `line`; `area*` → `area`; `bar`, `bar_grouped`, `bar_horizontal`,
     `lollipop` → `bar`; `kpi` → `kpi`; any other type, or fields the rows do not have → `table` (`columns` and
     `rows` are always filled, at most 200 rows, so a table fallback is always possible).
   - The rows are drawn as they are; nothing of text2sql's `prepare` is rebuilt. So any of these → `table`:
     a non-default `transform`, an `encoding.series`, a measure `aggregate` other than `auto`/`none`, or repeated
     `x` values. `time_unit` on `x` only formats labels (allowed). *Builder's call: a wrong chart is worse than a
     table.*
   - `display: "none"` → `table`; `chart` and `chart_if_last` → the mapped type. *Builder's call.*
   - At most 200 points; a value that is not a finite number becomes `null`.
   - No clean data step, or an empty result → no widget. A step with rows but no `chart` → `table`.
7. Web renders `chart`: `line`/`area` → Hairline `AreaChart`; `bar` with one series → `ComboChart` without the
   average line where possible, else `AreaChart`; `donut` → `DonutChart`; `kpi` → the `Stats` figures already in
   `widgets.tsx`; `table` → `DataTable`. Units show as the series' `unit`.
8. Copy for the chart widget's fallbacks (empty title) in vi and en under `copilot.widgets.chart`.

## Design
- Backend follows `wattprint-backend/AGENTS.md` and its module layout: schemas in `schemas/schema_widget.py`,
  exported from `schemas/__init__.py`. `tools.py` imports the models; `chat.py`'s `Turn.reply` keeps its
  last-per-kind rule and dumps models. The chart mapping is one pure function `chart_widget(step) -> Chart | None`
  in `tools.py` next to `query_data`, tested on a real text2sql step shape (captured from the running service).
- Web follows `.claude/rules/dashboard-features.md`, `ui.md`, `vendored-ui.md`, `i18n.md`: schema in
  `features/copilot/schemas.ts` (one schema per kind, `WidgetSchema` union stays the type source), tolerant array
  via `z.array(z.unknown()).transform(...)`; registry and boundary in `features/copilot/components/widgets.tsx`;
  Hairline components used by props only (vendored, no edits).

## Approaches considered
1. **Keep the contract hand-written on both sides, make parsing tolerant, add a registry and a normalized chart
   widget (chosen).** Small, no build tooling, the fallback makes drift harmless.
2. Generate the TS schema from the backend's OpenAPI/JSON Schema. Removes drift, but adds a codegen step across
   two repos for 9 kinds; not worth it at this size. Revisit when there are many more kinds.
3. Pass text2sql's full chart spec to the web and port its renderer. 32 types and transforms: large, and a second
   chart system next to Hairline. The normalized shape covers what an energy answer needs.

## Areas of concern
- The backend Watch work (insight + copilot) is uncommitted on `main`; `tools.py` and `chat.py` carry its hunks.
  The review package from base `290d5b4` will include them; the reviewer is told they are out of scope.
- `ComboChart` always draws a trend line; if it cannot be turned off by props, a one-series bar uses `AreaChart`
  (no vendored edits).

## Open questions carried forward
None.
