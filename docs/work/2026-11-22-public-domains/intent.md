# Intent: public domains for WattPrint
Author: cuongpd. Status: accepted (in chat, 2026-11-22). Brainstorming skipped: the user said "cứ xử lí theo hướng đề xuất".
Source: conversation 2026-11-22. Record: none

## Problem
WattPrint only runs on localhost ports of the shared ptitai.org host; nobody outside can open it without VS Code port forwarding.

## Proposed outcome
https://wattprint.ptitai.org serves the landing page and the dashboard (multi-zone), https://auth.wattprint.ptitai.org
serves the Keycloak sign-in, https://api.wattprint.ptitai.org serves the API to the mobile app. Google and email/password sign-in, sign-out, live tiles (SSE) and Wappi work there.

## Affected users and systems
Demo users; apps/web, apps/dashboard (env only), wattprint-backend compose + realm, host nginx, Google OAuth client.

## Constraints
- No new code; config only. No sudo for the agent: nginx/certbot steps are run by the user.
- Local development on the dev servers (11091/11092) keeps working.
- The Keycloak admin console and the master realm stay private.
- Out of scope: CI/CD, systemd.

## Open questions
- None. 2026-11-22 follow-up: the mobile app needs the API outside the LAN → api.wattprint.ptitai.org.
