import Image from "next/image"

/** Screens of the real dashboard on a demo home, captured in both themes at 2x: `public/landing/<name>-{light,dark}.webp`. */
export type ShotName =
  | "dashboard"
  | "devices"
  | "bill"
  | "alerts"
  | "statistics"
  | "plan"
  | "copilot"

/**
 * One screenshot that follows the theme: the light capture, or the dark one under `.dark`. Both carry the alt (the
 * hidden one is `display: none`, so out of the accessibility tree). `eager` loads only the dark capture eagerly: dark
 * is the default theme, so a first visit does not fetch the hero twice.
 */
export function ProductShot({
  name,
  alt,
  sizes,
  eager = false,
  className,
}: {
  name: ShotName
  alt: string
  sizes: string
  eager?: boolean
  className?: string
}) {
  const common = { width: 2880, height: 1800, sizes, alt }
  return (
    <>
      <Image
        {...common}
        src={`/landing/${name}-light.webp`}
        loading="lazy"
        className={`size-full object-cover object-left-top dark:hidden ${className ?? ""}`}
      />
      <Image
        {...common}
        src={`/landing/${name}-dark.webp`}
        loading={eager ? "eager" : "lazy"}
        className={`hidden size-full object-cover object-left-top dark:block ${className ?? ""}`}
      />
    </>
  )
}
