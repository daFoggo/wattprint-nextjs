import type { CSSProperties } from "react"

/**
 * The headline in two set lines, each word coming out of a blur in turn. Plain server HTML with a CSS animation
 * (landing.css, `.lp-word`): no script, no hydration, and the words are the real <h1>. It replaced React Bits' Blur
 * Text, whose motion components per word cost the mobile page most of its blocking time.
 */
export function HeroTitle({ id, lines }: { id: string; lines: string[] }) {
  // Each word's place across both lines, for its stagger delay.
  const words = lines.map((line) => line.split(" "))
  const starts = words.map((_, l) =>
    words.slice(0, l).reduce((n, w) => n + w.length, 0)
  )
  return (
    <h1
      id={id}
      className="text-lp-display text-lp-ink flex flex-col items-center font-medium"
    >
      {words.map((line, l) => (
        <span key={lines[l]}>
          {line.map((word, i) => (
            <span key={`${word}-${i}`}>
              <span
                className="lp-word"
                style={{ "--i": (starts[l] ?? 0) + i } as CSSProperties}
              >
                {word}
              </span>
              {i < line.length - 1 ? " " : null}
            </span>
          ))}
          {/* A space between the lines, so the heading reads "tiền, chỉ" and not "tiền,chỉ" (the lines are flex items). */}
          {l < words.length - 1 ? " " : null}
        </span>
      ))}
    </h1>
  )
}
