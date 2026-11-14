"use client";

import * as React from "react";
import { BANDS, createAudioMeter, elementSource, type AudioMeter } from "./voice-audio";

/* ─────────────────────────────────────────────────────────
 * useVoiceSession: a voice conversation, plugged into your backend
 *
 * Two ways in, pick the one your stack has:
 *
 *   onTurn    record-then-reply. It records until the person
 *             stops talking, hands you the audio, and plays what
 *             you return: your own speech-to-text, model and
 *             text-to-speech, or one endpoint that does all three
 *   connect   realtime. It opens the microphone and hands it to
 *             you; you return the voice coming back (a WebRTC
 *             track, an <audio> element). Listening and speaking
 *             are read from the audio on each side, and you can
 *             set the state yourself from your provider's events
 *
 * It owns everything around the call: microphone permission and
 * its errors, recording, end of speech, thinking, playing the
 * reply, interrupting it, cancelling a request mid-flight, and
 * letting go of the microphone when it's done.
 * ───────────────────────────────────────────────────────── */

export type VoicePhase = "idle" | "starting" | "listening" | "thinking" | "speaking" | "error";
/** What the orb shows for each phase. */
export type VoiceOrbPhase = "idle" | "listening" | "thinking" | "speaking";

/** A spoken reply in any shape a backend gives one: audio data, a fetch response, a URL, an element or a live stream. */
export type VoiceReply = Blob | ArrayBuffer | Response | string | HTMLMediaElement | MediaStream | null | undefined | void;

export interface VoiceTurnContext {
  /** Aborted if the person cancels or starts again: pass it to fetch. */
  signal: AbortSignal;
  mimeType: string;
  /** Length of the recording in ms. */
  duration: number;
}

export interface VoiceConnection {
  /** The voice coming back: a remote MediaStream, or an <audio> element you already play it in. */
  output: MediaStream | HTMLMediaElement;
  /** Called when the session ends. */
  close?: () => void;
}

export interface VoiceConnectContext {
  signal: AbortSignal;
  /** Set the state from your provider's events; null goes back to reading it from the audio. */
  setState: (state: VoiceOrbPhase | null) => void;
  /** End the session from your side (the call dropped, the agent hung up). */
  end: () => void;
}

export type VoiceErrorKind = "permission" | "no-microphone" | "unsupported" | "no-speech" | "turn" | "playback" | "connection";

export class VoiceError extends Error {
  kind: VoiceErrorKind;
  constructor(kind: VoiceErrorKind, message: string, cause?: unknown) {
    super(message, { cause });
    this.kind = kind;
    this.name = "VoiceError";
  }
}

export interface VoiceSessionOptions {
  /** Record-then-reply: gets each finished turn's audio, returns the spoken reply (or nothing). Throw to show an error. */
  onTurn?: (audio: Blob, context: VoiceTurnContext) => Promise<VoiceReply> | VoiceReply;
  /** Realtime: gets the open microphone, returns the voice coming back. */
  connect?: (microphone: MediaStream, context: VoiceConnectContext) => Promise<VoiceConnection> | VoiceConnection;
  /** Your own microphone stream (a device picker, an SDK that owns it). Default: getUserMedia with echo cancellation. */
  getMicrophone?: () => Promise<MediaStream>;
  /** After a reply, listen again, hands-free. */
  continuous?: boolean;
  /** Quiet after speech that ends a turn, in ms. */
  silence?: number;
  /** Longest turn, in ms; it is sent when reached. */
  maxTurn?: number;
  /** How long to wait for any speech before giving up, in ms. */
  waitForSpeech?: number;
  onPhaseChange?: (phase: VoicePhase) => void;
  onError?: (error: VoiceError) => void;
}

export interface VoiceSession {
  phase: VoicePhase;
  /** The phase as the orb shows it. */
  state: VoiceOrbPhase;
  error: VoiceError | null;
  /** Start listening (or connect, in realtime). Call it from a click or a key press: browsers only open the mic then. */
  start: () => void;
  /** End the turn now and send it. */
  send: () => void;
  /** Stop the reply and listen again. */
  interrupt: () => void;
  /** End everything: cancel the request, stop the reply, close the connection, let go of the microphone. */
  stop: () => void;
  /** The one-button behaviour: talk, send, cancel, interrupt or retry, by phase. */
  toggle: () => void;
  /** For the orb: the microphone while listening, the reply while speaking. */
  getLevel: () => number;
  getSpectrum: () => ArrayLike<number>;
}

let warmed = false;
const MIME = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const SILENT = new Float32Array(BANDS);
// One frame of silence, played inside the first click so Safari lets the reply play later without one.
const UNLOCK = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
const SPEECH = 0.14;
const QUIET = 0.08;

const orbPhase = (phase: VoicePhase): VoiceOrbPhase => (phase === "listening" || phase === "thinking" || phase === "speaking" ? phase : "idle");

function micError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return new VoiceError("permission", "Microphone access was blocked.", error);
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError")
    return new VoiceError("no-microphone", "No microphone was found.", error);
  return new VoiceError("unsupported", "This browser can't record audio here.", error);
}

interface Runtime {
  generation: number;
  context: AudioContext | null;
  mic: MediaStream | null;
  micMeter: AudioMeter | null;
  outMeter: AudioMeter | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  controller: AbortController | null;
  player: HTMLAudioElement | null;
  streamPlayer: HTMLAudioElement | null;
  playing: HTMLMediaElement | null;
  url: string | null;
  connection: VoiceConnection | null;
  manual: VoiceOrbPhase | null;
  timer: number;
  phase: VoicePhase;
  turnStart: number;
}

/** The session itself, outside React: created once per hook, it holds its options and reports phase and error back. */
function createSession(setPhaseState: (phase: VoicePhase) => void, setError: (error: VoiceError | null) => void) {
  const opts: { current: VoiceSessionOptions } = { current: {} };
  const r: Runtime = {
    generation: 0,
    context: null,
    mic: null,
    micMeter: null,
    outMeter: null,
    recorder: null,
    chunks: [],
    controller: null,
    player: null,
    streamPlayer: null,
    playing: null,
    url: null,
    connection: null,
    manual: null,
    timer: 0,
    phase: "idle",
    turnStart: 0,
  };

  const setPhase = (next: VoicePhase) => {
    if (r.phase === next) return;
    r.phase = next;
    setPhaseState(next);
    opts.current.onPhaseChange?.(next);
  };
  const fail = (err: VoiceError) => {
    release();
    setError(err);
    setPhase("error");
    opts.current.onError?.(err);
  };

  const clearTimer = () => {
    if (r.timer) window.clearInterval(r.timer);
    r.timer = 0;
  };
  const stopOutput = () => {
    r.outMeter?.disconnect();
    r.outMeter = null;
    if (r.playing) {
      r.playing.onended = null;
      r.playing.onerror = null;
      r.playing.pause();
    }
    r.playing = null;
    if (r.streamPlayer) r.streamPlayer.srcObject = null;
    if (r.url) URL.revokeObjectURL(r.url);
    r.url = null;
  };
  const releaseMic = () => {
    r.micMeter?.disconnect();
    r.micMeter = null;
    // A microphone you handed in stays yours; one we opened, we close, so the browser's recording light goes off.
    if (r.mic && !opts.current.getMicrophone) r.mic.getTracks().forEach((t) => t.stop());
    r.mic = null;
  };
  /** Everything off, back to rest. Bumping the generation makes any late reply land nowhere. */
  function release() {
    r.generation++;
    clearTimer();
    r.controller?.abort();
    r.controller = null;
    if (r.recorder && r.recorder.state !== "inactive") {
      r.recorder.ondataavailable = null;
      r.recorder.onstop = null;
      r.recorder.stop();
    }
    r.recorder = null;
    r.chunks = [];
    stopOutput();
    r.connection?.close?.();
    r.connection = null;
    r.manual = null;
    releaseMic();
  }

  const audio = () => {
    r.context ??= new AudioContext();
    void r.context.resume().catch(() => {});
    return r.context;
  };
  const microphone = async () => {
    if (r.mic?.getAudioTracks().some((t) => t.readyState === "live")) return r.mic;
    const own = opts.current.getMicrophone;
    if (own) return (r.mic = await own());
    if (!navigator.mediaDevices?.getUserMedia) throw new VoiceError("unsupported", "Recording needs a secure (https) page.");
    try {
      r.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err) {
      throw micError(err);
    }
    return r.mic;
  };

  /** Record a turn, listening for the end of speech. */
  const listen = async () => {
    const gen = r.generation;
    setError(null);
    setPhase("starting");
    let mic: MediaStream;
    try {
      mic = await microphone();
    } catch (err) {
      if (gen === r.generation) fail(err instanceof VoiceError ? err : micError(err));
      return;
    }
    if (gen !== r.generation) return;
    const ctx = audio();
    r.micMeter ??= createAudioMeter(ctx, ctx.createMediaStreamSource(mic));
    if (typeof MediaRecorder === "undefined") return fail(new VoiceError("unsupported", "This browser can't record audio."));
    const mimeType = MIME.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const recorder = new MediaRecorder(mic, mimeType ? { mimeType } : undefined);
    r.recorder = recorder;
    r.chunks = [];
    recorder.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
    recorder.start(250);
    r.turnStart = performance.now();
    setPhase("listening");

    const startedAt = performance.now();
    let loud = 0;
    let spoke = false;
    let quietSince = 0;
    const { silence = 900, maxTurn = 30000, waitForSpeech = 8000 } = opts.current;
    clearTimer();
    r.timer = window.setInterval(() => {
      const now = performance.now();
      const level = r.micMeter?.getLevel() ?? 0;
      if (level > SPEECH) {
        // Speech is three loud ticks in a row, so a click or a cough doesn't start the countdown.
        if (++loud >= 3) spoke = true;
        quietSince = 0;
      } else {
        loud = 0;
        if (spoke && level < QUIET) quietSince ||= now;
      }
      if (spoke && quietSince && now - quietSince > silence) void send();
      else if (now - startedAt > maxTurn) void send();
      else if (!spoke && now - startedAt > waitForSpeech) {
        fail(new VoiceError("no-speech", "Didn't hear anything."));
      }
    }, 50);
  };

  /** Play a reply, metering it for the orb. */
  const play = async (reply: VoiceReply, gen: number) => {
    if (reply == null) return done(gen);
    const ctx = audio();
    let element: HTMLMediaElement;
    if (reply instanceof MediaStream) {
      element = r.streamPlayer ??= new Audio();
      element.srcObject = reply;
      r.outMeter = createAudioMeter(ctx, ctx.createMediaStreamSource(reply));
    } else if (reply instanceof HTMLMediaElement) {
      element = reply;
      const source = elementSource(element, ctx);
      r.outMeter = createAudioMeter(source.context, source.node);
    } else {
      element = r.player ??= new Audio();
      let src: string;
      if (typeof reply === "string") {
        // A URL plays as it streams in. Web Audio can only meter it if it's same-origin or sent with CORS.
        element.crossOrigin = "anonymous";
        src = reply;
      } else {
        const blob = reply instanceof Response ? await reply.blob() : reply instanceof Blob ? reply : new Blob([reply as ArrayBuffer]);
        if (gen !== r.generation) return;
        src = r.url = URL.createObjectURL(blob);
      }
      element.src = src;
      const source = elementSource(element, ctx);
      r.outMeter = createAudioMeter(source.context, source.node);
    }
    r.playing = element;
    element.onended = () => done(gen);
    element.onerror = () => gen === r.generation && fail(new VoiceError("playback", "Couldn't play the reply."));
    setPhase("speaking");
    try {
      await element.play();
    } catch (err) {
      if (gen === r.generation) fail(new VoiceError("playback", "Couldn't play the reply.", err));
    }
  };

  const done = (gen: number) => {
    if (gen !== r.generation) return;
    stopOutput();
    if (opts.current.continuous) void listen();
    else {
      release();
      setPhase("idle");
    }
  };

  /** End the turn and hand it to onTurn. */
  async function send() {
    const recorder = r.recorder;
    if (r.phase !== "listening" || !recorder) return;
    clearTimer();
    const gen = r.generation;
    const mimeType = recorder.mimeType;
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    recorder.stop();
    r.recorder = null;
    setPhase("thinking");
    await stopped;
    if (gen !== r.generation) return;
    const blob = new Blob(r.chunks, { type: mimeType });
    r.chunks = [];
    if (!opts.current.continuous) releaseMic();
    const controller = new AbortController();
    r.controller = controller;
    let reply: VoiceReply;
    try {
      reply = await opts.current.onTurn?.(blob, { signal: controller.signal, mimeType, duration: Math.round(performance.now() - r.turnStart) });
    } catch (err) {
      if (gen === r.generation && !controller.signal.aborted)
        fail(new VoiceError("turn", err instanceof Error && err.message ? err.message : "The assistant didn't answer.", err));
      return;
    }
    if (gen !== r.generation) return;
    r.controller = null;
    await play(reply, gen);
  }

  /** Realtime: open the mic, hand it over, read the states from both sides of the audio. */
  const connect = async () => {
    const gen = r.generation;
    setError(null);
    setPhase("starting");
    let mic: MediaStream;
    try {
      mic = await microphone();
    } catch (err) {
      if (gen === r.generation) fail(err instanceof VoiceError ? err : micError(err));
      return;
    }
    const ctx = audio();
    const controller = new AbortController();
    r.controller = controller;
    let connection: VoiceConnection;
    try {
      connection = await opts.current.connect!(mic, {
        signal: controller.signal,
        setState: (s) => (r.manual = s),
        end: () => {
          if (gen !== r.generation) return;
          release();
          setPhase("idle");
        },
      });
    } catch (err) {
      if (gen === r.generation && !controller.signal.aborted)
        fail(new VoiceError("connection", err instanceof Error && err.message ? err.message : "Couldn't connect.", err));
      return;
    }
    if (gen !== r.generation) {
      connection.close?.();
      return;
    }
    r.connection = connection;
    r.micMeter ??= createAudioMeter(ctx, ctx.createMediaStreamSource(mic));
    const out = connection.output;
    if (out instanceof MediaStream) {
      // A remote WebRTC stream only plays from an element; it's metered separately, not routed twice.
      const element = (r.streamPlayer ??= new Audio());
      element.srcObject = out;
      void element.play().catch(() => {});
      r.outMeter = createAudioMeter(ctx, ctx.createMediaStreamSource(out));
    } else {
      const source = elementSource(out, ctx);
      r.outMeter = createAudioMeter(source.context, source.node);
    }
    setPhase("listening");
    let voiceUntil = 0;
    let heardAt = 0;
    let loud = 0;
    clearTimer();
    r.timer = window.setInterval(() => {
      const now = performance.now();
      if (r.manual) return setPhase(r.manual);
      const outLevel = r.outMeter?.getLevel() ?? 0;
      const inLevel = r.micMeter?.getLevel() ?? 0;
      if (outLevel > 0.08) voiceUntil = now + 350;
      if (now < voiceUntil) {
        heardAt = 0;
        return setPhase("speaking");
      }
      if (inLevel > SPEECH) {
        if (++loud >= 3) heardAt = now;
      } else loud = 0;
      // After the person stops, and before the voice comes back: the model is working.
      const waiting = heardAt && now - heardAt > 600 && now - heardAt < 8000 && inLevel < QUIET;
      setPhase(waiting ? "thinking" : "listening");
    }, 60);
  };

  const start = () => {
    if (r.phase !== "idle" && r.phase !== "error") return;
    // Inside the click: the audio context and the player are unlocked now, while the browser still counts it as a gesture.
    audio();
    if (!r.player) {
      r.player = new Audio();
      r.player.src = UNLOCK;
      void r.player.play().catch(() => {});
    }
    if (opts.current.connect) void connect();
    else void listen();
  };
  const stop = () => {
    release();
    setError(null);
    setPhase("idle");
  };
  const interrupt = () => {
    if (r.phase !== "speaking") return;
    if (opts.current.connect) return;
    r.generation++;
    stopOutput();
    void listen();
  };
  const toggle = () => {
    const p = r.phase;
    if (p === "idle" || p === "error") start();
    else if (p === "listening") {
      if (opts.current.connect) stop();
      else void send();
    } else if (p === "speaking") {
      if (opts.current.connect) stop();
      else interrupt();
    } else stop();
  };

  return {
    configure: (next: VoiceSessionOptions) => {
      opts.current = next;
    },
    start,
    send: () => void send(),
    interrupt,
    stop,
    toggle,
    getLevel: () => (r.phase === "listening" ? (r.micMeter?.getLevel() ?? 0) : r.phase === "speaking" ? (r.outMeter?.getLevel() ?? 0) : 0),
    getSpectrum: () =>
      r.phase === "listening" ? (r.micMeter?.getSpectrum() ?? SILENT) : r.phase === "speaking" ? (r.outMeter?.getSpectrum() ?? SILENT) : SILENT,
    dispose() {
      release();
      void r.context?.close().catch(() => {});
      r.context = null;
    },
  };
}

export function useVoiceSession(options: VoiceSessionOptions = {}): VoiceSession {
  const [phase, setPhase] = React.useState<VoicePhase>("idle");
  const [error, setError] = React.useState<VoiceError | null>(null);
  const [api] = React.useState(() => createSession(setPhase, setError));
  React.useLayoutEffect(() => {
    api.configure(options);
  });
  React.useEffect(() => () => api.dispose(), [api]);
  // The first recorder a page makes is slow to build (the browser looks up its encoders, and on some systems that
  // stalls drawing for a few frames), so build a throwaway one while the page is idle instead of inside the press.
  React.useEffect(() => {
    if (warmed || typeof MediaRecorder === "undefined" || options.connect) return;
    const warm = () => {
      warmed = true;
      try {
        const mimeType = MIME.find((m) => MediaRecorder.isTypeSupported(m));
        new MediaRecorder(new MediaStream(), mimeType ? { mimeType } : undefined);
      } catch {}
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 1200);
    return () => clearTimeout(id);
    // Once per mount is enough; the connect option doesn't change between renders in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.useMemo(
    () => ({
      phase,
      state: orbPhase(phase),
      error,
      start: api.start,
      send: api.send,
      interrupt: api.interrupt,
      stop: api.stop,
      toggle: api.toggle,
      getLevel: api.getLevel,
      getSpectrum: api.getSpectrum,
    }),
    [phase, error, api],
  );
}
