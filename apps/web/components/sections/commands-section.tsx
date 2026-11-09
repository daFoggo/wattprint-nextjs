import { CopyCommand } from "@/components/copy-command"
import { GUTTER } from "@/config/layout"
import { docsHref } from "@/config/site"

const STEPS = [
  {
    label: "Create",
    command: "git clone https://github.com/daFoggo/next-mono-base my-app",
  },
  { label: "Install", command: "cd my-app && pnpm install" },
  { label: "Run", command: "pnpm dev" },
] as const

/** The four commands from a clone to a running app. */
export function CommandsSection() {
  return (
    <section id="start" className="border-b">
      <div className="border-b py-16">
        <h2 className={`${GUTTER} px-9 text-4xl font-medium tracking-tight sm:text-5xl`}>
          Start
        </h2>
      </div>
      <div className={`${GUTTER} flex flex-col gap-6 px-9 py-12`}>
        {STEPS.map((step) => (
          <div
            key={step.label}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6"
          >
            <span className="w-28 shrink-0 text-base text-muted-foreground">
              {step.label}
            </span>
            <CopyCommand command={step.command} />
          </div>
        ))}
        <p className="max-w-2xl text-base text-muted-foreground">
          Landing on :11091, dashboard on :11092. Configure Keycloak in{" "}
          <code className="font-mono text-sm">apps/dashboard/.env.local</code>{" "}
          (<code className="font-mono text-sm">KEYCLOAK_CLIENT_SECRET</code> is
          required); see{" "}
          <a
            href={docsHref("providers.md")}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            providers.md
          </a>
          .
        </p>
      </div>
    </section>
  )
}
