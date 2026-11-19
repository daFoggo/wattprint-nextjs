import { TranscriptSchema } from "./schemas"

// Voice goes through the backend (AstralX: Whisper and Wappi's voice), never the browser's speech services.

const MIME = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
]

export class VoiceError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

/** Text of a recording, in the page's language. */
export async function transcribeAudio(
  audio: Blob,
  lang: string,
  signal?: AbortSignal
) {
  const res = await fetch(
    `/api/copilot/voice/transcribe?lang=${lang === "en" ? "en" : "vi"}`,
    {
      method: "POST",
      headers: { "Content-Type": audio.type || "audio/webm" },
      body: audio,
      signal,
    }
  )
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      code?: string
    } | null
    throw new VoiceError(body?.code ?? "error")
  }
  return TranscriptSchema.parse(await res.json()).text
}

/** Where Wappi's voice reads a stored answer: an MP3 stream an <audio> plays as it arrives, sentence by sentence. */
export const speechUrl = (messageId: string, lang: string) =>
  `/api/copilot/voice/speech?${new URLSearchParams({ message: messageId, lang: lang === "en" ? "en" : "vi" })}`

/** A microphone recorder: start, then stop for the recording; cancel drops it. */
export async function record() {
  const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = MIME.find((m) => MediaRecorder.isTypeSupported(m))
  const recorder = new MediaRecorder(mic, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  recorder.start()
  const release = () => mic.getTracks().forEach((t) => t.stop())
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          release()
          resolve(new Blob(chunks, { type: recorder.mimeType }))
        }
        recorder.stop()
      }),
    cancel: () => {
      recorder.onstop = release
      recorder.stop()
    },
  }
}
