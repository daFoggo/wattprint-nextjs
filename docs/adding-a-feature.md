# Adding a Feature: the Playbook

The one checklist to follow when you add a business domain (invoices, tickets, orders…) to `apps/dashboard`. Every step links
to the doc that owns the rule; this file only fixes the **order** and shows the **shape** of each file. The examples use an
`invoices` feature; the code is a pattern to copy, not a file in the repo.

Read first: [project-structure.md](project-structure.md) §3 (anatomy, component scopes), §4 (ESLint boundaries),
[data-fetching.md](data-fetching.md) (caching, mutations), [routing-and-layouts.md](routing-and-layouts.md).

## Order of work

| # | File | Rule |
| :-: | :--- | :--- |
| 1 | `features/invoices/schemas.ts` | Zod DTOs (what the UI reads) and form input. Usable on client and server. No `server-only`. |
| 2 | `features/invoices/server.ts` | `"server-only"`. The **only** backend calls (`apiFetch` for FastAPI). Parse every response with the DTO schema; a failed request throws, it never becomes `[]`. |
| 3 | `features/invoices/queries.ts` | `"server-only"`. Reads for Server Components. Authorizes next to the data with `requirePermission`; caches with `"use cache: private"` + `cacheTag`. |
| 4 | `features/invoices/actions.ts` | `"use server"`. Mutations: authorize, validate with Zod, write, `updateTag`, then `redirect`. |
| 5 | `features/invoices/components/*` | UI around the feature. No logic: forms receive the Server Action as an `action` prop. Never import `server.ts`, `queries.ts`, `lib/dal`, `lib/http`. |
| 6 | `config/routes.ts`, `config/navigation.ts` | Route constants, `PROTECTED_PREFIXES`, sidebar entry (and a scope if the area has its own menu). |
| 7 | `app/(dashboard)/…/page.tsx` | Compose: page calls `queries.ts`, wraps every read in `<Suspense>` with a sized skeleton. |
| 8 | `features/invoices/__tests__/` + `e2e/` | Vitest for schemas, server mapping and actions; one Playwright smoke for the route. |
| 9 | `pnpm check` and `pnpm build` | Done means both pass, and the page was opened in a running app. |

Create only the files the feature needs (`features/README.md`).

## 1–2. Schemas and the backend seam

```ts
// features/invoices/schemas.ts
import { z } from "zod"

export const InvoiceSchema = z.object({
  id: z.string(),
  customer: z.string(),
  total: z.number(),
  status: z.enum(["draft", "sent", "paid"]),
})
export type Invoice = z.infer<typeof InvoiceSchema>

export const CreateInvoiceSchema = z.object({
  customer: z.string().trim().min(3, "Customer must be at least 3 characters"),
})
```

```ts
// features/invoices/server.ts
import "server-only"
import { z } from "zod"

import { apiFetch } from "@/lib/http"

import { InvoiceSchema } from "./schemas"

export async function fetchInvoices(token: string) {
  return z.array(InvoiceSchema).parse(await apiFetch("/invoices", { token }))
}
```

The data path follows `AUTH_PROVIDER` ([providers.md](providers.md) §0). When more than one stack must work, split
`server.ts` into `server.<stack>.ts` files with identical signatures and select in `server.ts`; type the secondary files
as `typeof primary` so a missing or different function fails `tsc`. The backend contract comes from its OpenAPI
(`/openapi.json`), never from guessing endpoints.

## 3. Queries: cache, authorize, tag

```ts
// features/invoices/queries.ts
import "server-only"
import { cacheLife, cacheTag } from "next/cache"

import { requirePermission } from "@/lib/dal"

import { fetchInvoices } from "./server"

/** One tag per user: an action expires it with `updateTag`. */
export const invoicesTag = (userId: string) => `invoices:${userId}`

export async function getInvoices() {
  "use cache: private" // per-user and token-bound: browser only, never stored on the server
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 })
  const session = await requirePermission("account:view")
  cacheTag(invoicesTag(session.userId))
  return fetchInvoices(session.accessToken)
}
```

Layouts never authorize (they would block streaming). Authorization lives in the query, next to the data, so every route that
reads it passes through it. Smaller reads (`getInvoice(id)`) derive from the one cached read so a layout, a breadcrumb and a
page share a single fill. See [data-fetching.md](data-fetching.md).

## 4. Actions: authorize, validate, write, expire, redirect

```ts
// features/invoices/actions.ts
"use server"
import { updateTag } from "next/cache"
import { redirect } from "next/navigation"

import { isExpectedDataError } from "@/lib/errors"
import { requirePermission } from "@/lib/dal"

import { invoicesTag } from "./queries"
import { CreateInvoiceSchema } from "./schemas"
import { insertInvoice } from "./server"

/** `values` echoes the fields back: React resets the form after an action finishes. */
export type CreateState = { error?: string; values?: { customer: string } }

export async function createInvoiceAction(
  _previous: CreateState,
  formData: FormData
): Promise<CreateState> {
  const session = await requirePermission("account:view")
  const values = { customer: String(formData.get("customer") ?? "") }
  const parsed = CreateInvoiceSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values }

  let id: string
  try {
    id = (await insertInvoice(session.accessToken, parsed.data)).id
  } catch (error) {
    // Expected 4xx: show it in the form. Anything else is a real failure: let it throw.
    if (isExpectedDataError(error)) return { error: error.message, values }
    throw error
  }
  updateTag(invoicesTag(session.userId))
  redirect(`/dashboard/invoices/${id}`) // outside try/catch: redirect throws
}
```

The form component uses `useActionState(action, {})` and receives `action` as a prop, so it stays logic-free and testable.

## 7. The page: compose and stream

```tsx
// app/(dashboard)/dashboard/invoices/page.tsx
import type { Metadata } from "next"
import { Suspense } from "react"

import { PageHead } from "@/components/layout/page-head"
import { InvoiceTable } from "@/features/invoices/components/invoice-table"
import { InvoiceTableSkeleton } from "@/features/invoices/components/skeletons"
import { getInvoices } from "@/features/invoices/queries"

export const metadata: Metadata = { title: "Invoices" }

async function Invoices() {
  return <InvoiceTable invoices={await getInvoices()} />
}

export default function InvoicesPage() {
  return (
    <>
      <PageHead title="Invoices">Everything you have billed.</PageHead>
      <Suspense fallback={<InvoiceTableSkeleton />}>
        <Invoices />
      </Suspense>
    </>
  )
}
```

Rules that keep it fast under Cache Components: runtime reads sit inside `<Suspense>`; the fallback is a **sized** skeleton
(never `null` for content); `params` / `searchParams` are awaited inside the Suspense child, not in the page body
([routing-and-layouts.md](routing-and-layouts.md) §5.2). Pages never import `server.ts`.

## 6. Routes, navigation, protection

1. Add the path constant to `config/routes.ts`; add its prefix to `PROTECTED_PREFIXES` if it is not under `/dashboard`
   (`proxy.ts` does the optimistic redirect; the DAL is the real check).
2. Add a `NavLink` to a section in `config/navigation.ts` (`title`, `href`, `icon`, `permission`). `permission` only hides the
   link; the page still authorizes through its query. New icon names go in `NavIconName` and `sidebar/nav-icons.tsx`.
3. An area with its own menu and breadcrumb (`/<prefix>/<id>/…`) is a **scope**: see
   [routing-and-layouts.md](routing-and-layouts.md) §6.4.
4. The breadcrumb needs no code for a plain page: global pages read like their path (`dashboard / invoices`).

## 5. Component placement

Page-specific UI goes in `app/<route>/_components/`; UI shared by several pages of one feature goes in
`features/<name>/components/`; business-free primitives belong in `packages/ui`, and composed UI both apps share in
`packages/ui-patterns` (extract only with a second consumer). Split a component when a part needs its own state, its own
Suspense boundary, or the server/client line moves. Full decision table: [project-structure.md](project-structure.md) §3.1 and §7.
Look and spacing: [design-system.md](design-system.md); use Hairline UI components first.

## 8. Tests

- Vitest next to the code in `features/<name>/__tests__/`: schemas, `server.ts` mapping (mock `server-only` with
  `vi.mock("server-only", () => ({}))`), action validation paths.
- `config/__tests__/navigation.test.ts` covers scope resolution and the breadcrumb; add a case for a new scope.
- One Playwright smoke in `e2e/` per new route (signed-out redirect to `/sign-in` is already covered).

## Checklist before you say "done"

- [ ] Files follow the order above; no feature imports `app/` or another feature (ESLint enforces it).
- [ ] No arbitrary Tailwind values; sizes come from component props ([design-system.md](design-system.md)).
- [ ] Every runtime read is inside `<Suspense>` with a sized skeleton.
- [ ] Mutations: authorize → Zod → write → `updateTag` → `redirect`.
- [ ] `pnpm check` and `pnpm build` pass; the page was opened in a running app (sign in through the local Keycloak).
