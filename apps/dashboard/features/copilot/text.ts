import type { AnswerSegment } from "@workspace/ui/components/hairline/streaming-answer"

/** Wappi's answer is plain text; drop the markdown marks a model still writes (and stored chats keep). */
export const plainText = (text: string): string =>
  text
    // headings and list marks; a number mark is 1-2 digits so a year starting a line stays
    .replace(/^[ \t]*(?:#+|[-*•]|\d{1,2}[.)])[ \t]+/gm, "")
    .replace(/(\*\*|__|`)/g, "")

type Source = { title: string; url: string }

/**
 * The answer with each `[n]` as a bare number chip, and the sources it used for a legend under it. A source is
 * marked once, at its first figure: the model cites after every number, and the same name over and over buries the
 * answer. Marks with no source behind them (still streaming, or a wrong number) go, with the space before them.
 */
export function citedSegments(text: string, sources: Source[] = []) {
  const cited: (Source & { n: number })[] = []
  const kept = plainText(text).replace(/\s*\[(\d+)\]/g, (_, digits: string) => {
    const n = Number(digits)
    const source = sources[n - 1]
    if (!source || cited.some((c) => c.n === n)) return ""
    cited.push({ n, ...source })
    return `[${n}]`
  })
  const segments = kept.split(/\[(\d+)\]/).flatMap((part, i): AnswerSegment[] => {
    if (i % 2 === 0) return part ? [part] : []
    return [{ type: "citation", label: part }]
  })
  return { segments, cited }
}
