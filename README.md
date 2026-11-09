# next-mono-base

Next.js 16.4 + Turborepo + pnpm monorepo base with shadcn/ui (`base-nova` + Animate UI) and Keycloak authentication (Google sign-in) in front of a FastAPI backend.

The conventions live in [docs/](docs/): read the one for the area you change before changing it (index in [AGENTS.md](AGENTS.md)).

## Structure

```
apps/
  web/                    Next.js landing page (runnable, public)
  dashboard/              Next.js dashboard: sign-in and the app shell (runnable)
packages/
  ui/                     @workspace/ui — shared shadcn/ui components, styles
  auth/                   @workspace/auth — Keycloak provider (AUTH_PROVIDER=keycloak)
  ui-patterns/            @workspace/ui-patterns — pieces both apps share: ThemeProvider, ThemeToggle, AppLogo, StackGrid
  eslint-config/          @workspace/eslint-config
  typescript-config/      @workspace/typescript-config
```

`apps/` holds things that run; `packages/` holds everything shared. Packages are
scoped `@workspace/*`, declared with `workspace:*`, and never nested or imported via `../`.

## Commands

```bash
pnpm install
pnpm dev                          # all apps: web (landing) on :3000, dashboard on :3001
pnpm turbo run dev --filter=dashboard   # one app
pnpm build
pnpm check                        # lint + typecheck + test
```

Configure Keycloak in `apps/dashboard/.env.local` (template: `apps/dashboard/.env.example`,
details: [docs/providers.md](docs/providers.md)); `KEYCLOAK_CLIENT_SECRET` is required.

## Adding shadcn components

```bash
pnpm dlx shadcn@latest add button -c apps/dashboard
```

Components land in `packages/ui/src/components`; import with
`import { Button } from "@workspace/ui/components/button"`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions.
