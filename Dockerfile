# syntax=docker/dockerfile:1.7
# The production dashboard and landing page (compose.yaml). One image, two commands.
FROM node:22-bookworm-slim
ENV NEXT_TELEMETRY_DISABLED=1 HUSKY=0 PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=wattprint-pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# NEXT_PUBLIC_* and next.config read the apps' .env.local at build: mounted as secrets, so no layer keeps them.
RUN --mount=type=secret,id=dashboard_env,target=/app/apps/dashboard/.env.local \
    --mount=type=secret,id=web_env,target=/app/apps/web/.env.local \
    pnpm --filter dashboard --filter web build
