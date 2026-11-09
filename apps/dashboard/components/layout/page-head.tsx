/** Page head of a dashboard page: a large title and a one-line description. */
export function PageHead({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-2xl leading-tight font-medium tracking-tight md:text-3xl">
        {title}
      </h1>
      {children ? (
        <p className="max-w-2xl text-base text-muted-foreground">{children}</p>
      ) : null}
    </header>
  )
}
