/** Page head of a dashboard page: a large title, a one-line description and an optional aside on the right. */
export function PageHead({
  title,
  action,
  children,
}: {
  title: string
  /** Beside the title, e.g. a status pill; drops under it on narrow screens. */
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl leading-tight font-medium tracking-tight md:text-3xl">
          {title}
        </h1>
        {children ? (
          <p className="max-w-2xl text-base text-muted-foreground">
            {children}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  )
}
