import { buttonVariants } from "@workspace/ui/components/button-variants"

import { DASHBOARD_HREF, docsHref } from "@/config/site"

export function HeroSection() {
  return (
    <section className="flex flex-col items-center border-b px-5 py-32 text-center max-sm:py-20">
      <h1 className="max-w-4xl text-5xl font-medium tracking-tight text-balance sm:text-7xl">
        A Next.js monorepo to start from
      </h1>
      <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground max-sm:text-base">
        Dashboard, landing page and shared packages with sign-in wired and the
        conventions written down.
      </p>
      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <a href={DASHBOARD_HREF} className={buttonVariants({ size: "lg" })}>
          Open dashboard
        </a>
        <a
          href={docsHref("project-structure.md")}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Read the docs
        </a>
      </div>
    </section>
  )
}
