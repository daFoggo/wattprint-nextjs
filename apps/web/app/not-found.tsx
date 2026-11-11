import Link from "next/link"

import { linkButton } from "@workspace/ui-patterns/link-button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="text-5xl leading-tight font-normal tracking-tighter">
        Page not found
      </h1>
      <p className="text-muted-foreground">
        The page you are looking for does not exist or has moved.
      </p>
      <Link href="/" className={linkButton()}>
        Back to home
      </Link>
    </main>
  )
}
