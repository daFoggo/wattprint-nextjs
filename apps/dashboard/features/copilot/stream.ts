import { ChatEventSchema, type ChatEvent } from "./schemas"

/** Server-sent events of a fetch body, parsed: `event:` and `data:` lines, a blank line ends one. */
export async function* chatEvents(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<ChatEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })
    let end: number
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      const fields = Object.fromEntries(
        block
          .split("\n")
          .filter((line) => !line.startsWith(":"))
          .map((line) => {
            const i = line.indexOf(":")
            return [line.slice(0, i), line.slice(i + 1).trimStart()]
          })
      ) as { event?: string; data?: string }
      if (!fields.event || fields.data === undefined) continue
      yield ChatEventSchema.parse({
        event: fields.event,
        data: JSON.parse(fields.data),
      })
    }
  }
}
