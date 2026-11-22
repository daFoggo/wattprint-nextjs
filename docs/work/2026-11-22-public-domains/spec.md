# Spec: public domains for WattPrint
Intent: ./intent.md. Status: accepted with the intent.

## Design
- **3 domains, 1 IP.** A records `wattprint.ptitai.org`, `auth.wattprint.ptitai.org` and `api.wattprint.ptitai.org` → 171.226.10.152. Host nginx
  ends TLS (Let's Encrypt, webroot `/var/www/letsencrypt`, same as the other ptitai.org sites).
- **wattprint.ptitai.org → 127.0.0.1:11081**, apps/web `next start` from a separate git worktree
  (`../wattprint-web-prod`). apps/web rewrites the dashboard paths to apps/dashboard `next start` on 127.0.0.1:11082
  (`DASHBOARD_ORIGIN`). A worktree keeps prod off the dev servers' `.next` (a shared build corrupts dev) and serves
  only committed code. `proxy_buffering off` for SSE.
- **auth.wattprint.ptitai.org → 127.0.0.1:11095** (Keycloak). `KC_PROXY_HEADERS=xforwarded`; `KC_HOSTNAME` =
  `https://auth.wattprint.ptitai.org` makes it the token `iss` for every client (dev included). nginx returns 404
  for `/admin` and `/realms/master`.
- **api.wattprint.ptitai.org → 127.0.0.1:11093** (FastAPI) for the mobile app only; the web dashboard keeps calling
  it server-side on localhost. Only `/api/` is proxied; `/docs`, `/redoc`, `/openapi.json` return 404. Every route but
  `/health` and `/homes/provinces` needs a bearer token whose `iss` is the auth domain. No CORS (native client).
  `wattprint-mobile` redirects to `wattprint://auth`, so the realm needs no change.
- **Sign-in callback** = `NEXT_PUBLIC_APP_URL` + `/auth/callback` (features/auth/actions.ts), so the prod dashboard's
  `NEXT_PUBLIC_APP_URL` is the landing domain. Client `wattprint-web` gets that callback and the `/sign-in`,
  `/en/sign-in` post-logout URIs beside the localhost ones. CSP `form-action` reads `KEYCLOAK_ISSUER` at build.
- **Cookies** are `secure` under `NODE_ENV=production`: fine behind https.
- **Closed ports.** db binds 127.0.0.1 + 172.17.0.1 (docker0, for text2sql's source connection, moved from
  10.254.94.1 to 172.17.0.1); api binds `${API_BIND:-127.0.0.1}`.

## Areas of concern
- Changing `KC_HOSTNAME` changes `iss` for everyone at once: dev `.env.local`, backend `.env` and the phone's issuer
  must switch together, after DNS resolves (cutover in plan.md).
- Prod `next start` adds `upgrade-insecure-requests`; open prod by its domain, not through http://localhost.
- Prod processes are detached shells, not services: a reboot stops them (shortcut, see plan).
- Keycloak still runs `start-dev` (relaxed checks) on a public domain.
