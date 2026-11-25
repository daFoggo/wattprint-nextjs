/**
 * The head every landing section opens with: a two-line title on the left (the second line muted), one short
 * paragraph on the right. Below `lg` the paragraph follows the title.
 */
export function SectionHead({
  id,
  title,
  muted,
  body,
}: {
  id: string
  title: string
  muted: string
  body?: string
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
      <h2
        id={id}
        className="text-lp-head text-lp-ink font-medium text-balance lg:col-span-8"
      >
        {title} <span className="text-lp-muted">{muted}</span>
      </h2>
      {body ? (
        <p className="text-lp-body text-lp-muted max-w-md lg:col-span-4 lg:justify-self-end">
          {body}
        </p>
      ) : null}
    </div>
  )
}
