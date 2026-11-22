# Handoff: WattPrint, 2026-11-22

Where the work stands and how to pick it up on another machine. Written for the next developer (or agent) who
continues from here.

## Repos and branches

| Repo | Remote | Branch | State |
|---|---|---|---|
| `wattprint-web` (Next.js monorepo, dashboard + landing + Keycloak theme) | github.com/daFoggo/wattprint-nextjs | `main` | pushed 2026-11-22 |
| `wattprint-backend` (FastAPI, TimescaleDB, NILM, insight, copilot) | github.com/daFoggo/wattprint-backend | `main` | pushed 2026-11-22 |
| `wattprint-text2sql-mcp` (text2sql agent used by Wappi's `query_data`) | github.com/nguyenddat/ai-agent-superset-standalone | `feat/copilot-scope-token-v2` | pushed 2026-11-22, one commit ahead of `origin/main` (scope token and service key for server callers); not merged, open a PR to `main` |

Everything up to 2026-11-22 went in one commit per repo (the changes overlap in files, so they were not split).
The per-change specs, plans and review ledgers say which part is which (below).

## New machine: bring-up

1. Clone the three repos side by side in one folder.
2. Copy the git-ignored env files from the old machine (never commit them):
   - `wattprint-backend/.env` (OpenRouter key, AstralX voice key, Google OAuth client, Keycloak secrets,
     `WATTPRINT_ADMIN_PASSWORD`, `TEXT2SQL_URL`, `TEXT2SQL_CONNECTION_ID`, `TEXT2SQL_SERVICE_KEY`).
   - `wattprint-web/apps/dashboard/.env.local` (`KEYCLOAK_CLIENT_SECRET` must equal the backend's
     `WATTPRINT_WEB_CLIENT_SECRET`).
   - `wattprint-text2sql-mcp/.env` (own_knowledge agent/admin keys, review password).
   - Templates: each repo's `.env.example`.
3. Backend: `cd wattprint-backend && docker compose up -d --build` (API 11093, Keycloak 11095, DB 11096,
   Mailpit 11099, insight and nilm workers). If Docker has no free address pool, set `COMPOSE_SUBNET`
   (default `10.254.93.0/24`). Keycloak reads secrets from `.env` only on its first realm import.
   Migrations run on API start (`alembic upgrade head`).
4. Demo data (the DB is not in git): `docker compose exec api python -m scripts.seed_demo_homes`, then
   `python -m scripts.import_refit_weather` per house and `python -m scripts.backfill_nilm --house 2|5` (in the
   nilm container: it has torch). README "what to do after a reboot" lists the replay job.
5. text2sql: `cd wattprint-text2sql-mcp && docker compose up --build -d` (web 11100, API 11101, Postgres 11102,
   Qdrant 11103; subnet `10.254.94.0/24`).
6. Web: Node 22 and pnpm 11.25. `cd wattprint-web && pnpm install`, then dev servers: dashboard on 11092
   (`apps/dashboard`: `pnpm exec next dev --port 11092`), landing on 11091. Run them detached; after a build or
   an install, stop them and `rm -rf apps/*/.next/dev` before relaunching (Turbopack keeps stale state).
7. Sign in at http://localhost:11092/sign-in, "Đăng nhập bằng email": `admin@wattprint.local` with
   `WATTPRINT_ADMIN_PASSWORD` (it has no home: add it to `tb_home_member` of "REFIT House 2" for home pages and
   remove it after), or `refit.house5@wattprint.local`.

## Process

- `wattprint-web` follows the sdlc plugin (`.claude/sdlc.json`): lane S/M/L, lane L artifacts in
  `docs/work/<date>-<slug>/`, review by the `sdlc:reviewer` agent (three rounds at most), debt in
  `docs/debt.md`. The team plugins (sdlc, ponytail, superpowers, hallmark) are enabled in `.claude/settings.json`;
  install them on the new machine (`/plugin`), the sdlc plugin comes from github.com/daFoggo/ai-native-sdlc.
- Verify: web `pnpm check` and `pnpm build`; backend `docker compose exec api pytest -q` and
  `ruff check app tests alembic`. Never run `ruff format` on `alembic/versions/` (it rewrites applied
  migrations; it happened twice and was reverted).
- Hairline UI first; vendored files change only through `packages/ui/hairline/patch.mjs`.

## Done (in the pushed commits)

| Change | Artifacts | Review |
|---|---|---|
| Watch: alerts set by voice/chat through Wappi | backend `docs/superpowers/specs/2026-11-20-voice-watch-design.md` | verified in the app; no sdlc loop (before the pilot) |
| Wappi widgets: one contract, tolerant parsing, text2sql charts | `docs/work/2026-11-20-copilot-widgets/` | R1–R3, ship |
| Alert settings v1: page, device tile, chat card | `docs/work/2026-11-21-alert-settings/` | R1–R2, ship |
| Alerts v2: one page, ThresholdLine in ₫, repeating and per-run device alerts, settings moved | `docs/work/2026-11-21-alerts-v2/` | R1–R3, ship |
| Debt D: every `docs/debt.md` item paid, signed-in audit fixes | `docs/debt.md` "Paid" | R1–R2, ship |

Last full runs before the push: backend 441 passed (1 torch-only test skipped in the api image), web
`pnpm check` and `pnpm build` passed.

## In progress: AI forecast and in-context anomalies

`docs/work/2026-11-21-ai-forecast-anomaly/` (lane L, approved). Ledger:
`.superpowers/sdd/plan-2026-11-21-ai-forecast-anomaly/progress.md` (git-ignored, copy it if you want the
rulings; they are summarised in the plan's notes as tasks close).

- Tasks 1–11 done in code and tests: recording-site weather, demo scenarios (heater, forgotten load, cold
  spell), per-home LightGBM expected-usage model with conformal bands (`app/modules/expect`), bill forecast with
  range, tier probability, reasons and accuracy, in-context `usage_anomaly` with user feedback, Wappi
  `explain_usage`, web range/reasons/usual line/feedback.
- Next: **Task 12** in the plan (seed 365 days without deleting anything, import weather, backfill NILM,
  train, backtest and record `mape_v1`/`mape_ctx`/coverage, full test runs, live D1 scenarios, signed-in checks),
  then the review loop R1–R3 with the package from the commit before this work.
- The api and insight images need rebuilding for lightgbm (`docker compose build api insight`).

## Open points

- Signed-in audit (2026-11-21) found, not fixed, owner to decide: the 24-hour power chart is flat (replay data),
  "Tiền điện tháng này theo phòng" lists devices not rooms, "Tiền điện từng tháng" smooths a curve through 3
  points, some empty space in Overview and Statistics tiles.
- Not checked: light theme on the alerts pages; a live device on/off alert end to end (needs a NILM run after
  the watch is set).
- `shortcut:` comments in the backend are deliberate scale limits with their triggers (see `docs/debt.md`).
