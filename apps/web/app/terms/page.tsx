import type { Metadata } from "next"
import { IconScale, IconAlertTriangle } from "@tabler/icons-react"


import { CONTAINER } from "@/config/layout"
import { Header } from "@/components/sections/header"
import { Footer } from "@/components/sections/footer"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service and developer agreement for Next Mono Base.",
}

export default function TermsOfServicePage() {
  return (
    <>
      <Header />

      <main className={`${CONTAINER} py-12 sm:py-16`}>
        <article className="mx-auto flex max-w-3xl flex-col gap-10">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-border pb-8">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-0.5 font-mono text-xs text-foreground">
                <IconScale className="size-3.5 text-primary" />
                Legal Agreement
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Last updated: January 1, 2026
              </span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Terms of Service
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Next Mono Base,
              including the web landing site, dashboard, and associated software packages. By creating
              an account or continuing to use our services, you agree to be bound by these Terms.
            </p>
          </div>

          {/* Section 1: Open Source & License */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">1. Open Source License and Codebase</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The underlying Next Mono Base repository and architecture starter code are licensed under the MIT License.
              You are free to use, modify, and distribute the template code for personal or commercial projects, subject
              to the inclusion of the original copyright notice and permission notice.
            </p>
          </section>

          {/* Section 2: User Accounts */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">2. User Accounts and Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When creating an account through our dashboard, you agree to:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground leading-relaxed">
              <li>Provide accurate, current, and complete registration information.</li>
              <li>Maintain the confidentiality and security of your authentication credentials.</li>
              <li>Promptly notify us of any suspected breach of security or unauthorized access.</li>
              <li>Accept responsibility for all activities occurring under your account or credentials.</li>
            </ul>
          </section>

          {/* Section 3: Acceptable Use */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">3. Acceptable Use Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You agree not to misuse the platform or assist others in doing so. Specifically, you agree not to:
            </p>
            <div className="flex flex-col gap-2 border border-border bg-card p-4 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <IconAlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                <span>Violate applicable local, national, or international regulations, including the Law on Cybersecurity and Personal Data Protection Law.</span>
              </div>
              <div className="flex items-start gap-2">
                <IconAlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                <span>Attempt to bypass authentication, reverse engineer rate limits, or probe security boundaries without explicit authorization.</span>
              </div>
              <div className="flex items-start gap-2">
                <IconAlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                <span>Engage in denial-of-service, automated credential scraping, or unauthorized cross-tenant data access.</span>
              </div>
            </div>
          </section>

          {/* Section 4: Multi-Tenant Workspace Rules */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">4. Multi-Tenant Workspace &amp; Resources</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Organizations and projects created within the Dashboard are isolated per user token and organization tenant.
              You maintain ownership of all project configurations and data created within your workspace. We reserve the right to
              suspend or prune demo resources that remain inactive for extended durations.
            </p>
          </section>

          {/* Section 5: Limitation of Liability */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">5. Limitation of Liability and Disclaimers</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The software and services are provided &ldquo;AS IS&rdquo;, without warranty of any kind, express or implied.
              In no event shall Next Mono Base or its authors be liable for any direct, indirect, incidental, or consequential
              damages arising from the use or inability to use the software.
            </p>
          </section>

          {/* Section 6: Termination & Erasure */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">6. Termination and Account Erasure</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may terminate these Terms at any time by requesting deletion of your account (see our Privacy Policy). We reserve the right
              to suspend or terminate accounts that breach these Terms. Upon termination, data erasure will be carried out in
              accordance with our Privacy Policy.
            </p>
          </section>

          {/* Section 7: Governing Law */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">7. Governing Law</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, without giving effect to any
              principles of conflicts of law.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </>
  )
}
