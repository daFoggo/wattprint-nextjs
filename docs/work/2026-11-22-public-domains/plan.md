# Plan: public domains for WattPrint
Spec: ./spec.md. Standards: no rule card binds env/compose/nginx; wattprint-backend AGENTS.md for compose.

## Done now (no DNS needed)
1. compose: db → 127.0.0.1 + 172.17.0.1, api → `${API_BIND:-127.0.0.1}`, Keycloak `KC_PROXY_HEADERS`; text2sql
   connection host → 172.17.0.1. Proof: public 171.226.10.152:11096 refuses, text2sql `select 1` ok.
2. Realm file + live client `wattprint-web`: https callback and post-logout URIs. Proof: kcadm read-back.
3. `wattprint-backend/deploy/nginx/` sites + `apply.sh`; `/api/copilot/` goes straight to the dashboard (11082), the
   rest to web (11081). `KC_HOSTNAME_ADMIN` keeps the admin console on localhost (checked on a throwaway Keycloak). Proof: `nginx -t` and a throwaway run (`/admin` 404,
   realm 200, http→https 301).
3b. `deploy/nginx/api.wattprint.ptitai.org` (follow-up change). Proof: throwaway nginx: health 200, provinces 200,
   users/me 401, energy/stream 401, docs/openapi.json/redoc/`/` 404, http→https 301.
4. Prod worktree `../wattprint-web-prod` with public env, `pnpm build` both apps. Proof: build log.

## Cutover (after `dig +short wattprint.ptitai.org auth.wattprint.ptitai.org api.wattprint.ptitai.org` all print 171.226.10.152)
0. Mail: the realm allows email sign-up (verify email) and password reset, but mail goes to the local mailpit. Set real
   `SMTP_*` in wattprint-backend/.env, or turn registration off for the demo (`kcadm.sh update realms/wattprint -s
   registrationAllowed=false`). Google sign-in and the demo accounts work either way.
1. `sudo wattprint-backend/deploy/nginx/apply.sh`
2. Google Cloud Console → OAuth client → redirect URI
   `https://auth.wattprint.ptitai.org/realms/wattprint/broker/google/endpoint` (keep the localhost one).
3. wattprint-backend/.env: `KEYCLOAK_PUBLIC_URL=https://auth.wattprint.ptitai.org`,
   `KEYCLOAK_ISSUER=https://auth.wattprint.ptitai.org/realms/wattprint`, `DASHBOARD_URL=https://wattprint.ptitai.org`,
   `WATTPRINT_LANDING_URL=https://wattprint.ptitai.org`; then
   `docker compose up -d --no-deps keycloak api insight` and restart the replayer
   (`docker exec -d wattprint-api sh -c 'cd /code && python -m scripts.replay_refit > /tmp/replay.log 2>&1'`).
4. Dev `apps/dashboard/.env.local`: both `KEYCLOAK_ISSUER` lines → the https issuer; restart the dev servers.
   Mobile app config: API base `https://api.wattprint.ptitai.org/api/v1`, issuer
   `https://auth.wattprint.ptitai.org/realms/wattprint`, client `wattprint-mobile`, redirect `wattprint://auth` (unchanged).
5. Start prod (from `../wattprint-web-prod`, Node 22 on PATH). `-H localhost`, not 127.0.0.1: Next treats a proxy
   rewrite (next-intl `/` → `/vi`) as internal only when its origin equals the start host; 127.0.0.1 made `/` loop (307)
   and, with `X-Forwarded-Proto: https`, 500:
   `setsid nohup pnpm -C apps/dashboard exec next start -H localhost -p 11082 > .prod-logs/dashboard.log 2>&1 &`
   `setsid nohup pnpm -C apps/web exec next start -H localhost -p 11081 > .prod-logs/web.log 2>&1 &`
6. Verify in a browser on https://wattprint.ptitai.org: Google sign-in, demo password sign-in, sign-out, the live
   "Using now" tile, Wappi chat; https://auth.wattprint.ptitai.org/admin → 404. On the phone (mobile data, not Wi-Fi), with only
   the preview build installed (every variant registers `wattprint://`, so another one can swallow the redirect): sign
   in, the profile card loads from `/users/me`.

## Redeploy
`git -C ../wattprint-web-prod checkout --detach <commit> && pnpm install --frozen-lockfile`, stop the two prod process
groups, rebuild both apps, start again (step 5).

## Risks
- shortcut: prod runs as detached shells, a reboot stops it; move to systemd units or a container when the demo
  must survive restarts.
