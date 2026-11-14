export const BANDS = 8;

export interface AudioMeter {
  getLevel: () => number;
  getSpectrum: () => Float32Array;
  disconnect: () => void;
}

export function createAudioMeter(context: BaseAudioContext, node: AudioNode): AudioMeter {
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.3;
  analyser.minDecibels = -85;
  analyser.maxDecibels = -25;
  node.connect(analyser);
  const wave = new Uint8Array(new ArrayBuffer(analyser.fftSize));
  const freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  const bands = new Float32Array(BANDS);
  const hz = context.sampleRate / analyser.fftSize;
  const edges = Array.from({ length: BANDS + 1 }, (_, b) => Math.max(1, Math.floor((90 * Math.pow(7000 / 90, b / BANDS)) / hz)));
  let level = 0;
  return {
    getLevel() {
      analyser.getByteTimeDomainData(wave);
      let sum = 0;
      for (let i = 0; i < wave.length; i++) {
        const v = (wave[i] - 128) / 128;
        sum += v * v;
      }
      // Loudness on a rough curve, so normal speech lands mid-range instead of hugging zero.
      const next = Math.min(1, Math.pow(Math.sqrt(sum / wave.length) * 4.2, 0.8));
      level += (next - level) * (next > level ? 0.6 : 0.18);
      return level;
    },
    getSpectrum() {
      analyser.getByteFrequencyData(freq);
      for (let b = 0; b < BANDS; b++) {
        const lo = edges[b];
        const hi = Math.max(lo + 1, edges[b + 1]);
        let sum = 0;
        for (let i = lo; i < hi && i < freq.length; i++) sum += freq[i];
        const v = Math.pow(sum / (hi - lo) / 255, 1.4);
        bands[b] += (v - bands[b]) * (v > bands[b] ? 0.6 : 0.2);
      }
      return bands;
    },
    disconnect() {
      try {
        node.disconnect(analyser);
      } catch {}
    },
  };
}

/** A media element can be routed into Web Audio only once in its life, so every caller shares one source per element. */
const elementSources = new WeakMap<HTMLMediaElement, { context: AudioContext; node: MediaElementAudioSourceNode }>();

export function elementSource(element: HTMLMediaElement, context?: AudioContext) {
  let entry = elementSources.get(element);
  if (!entry) {
    const ctx = context ?? new AudioContext();
    entry = { context: ctx, node: ctx.createMediaElementSource(element) };
    // Routed through Web Audio, it must still reach the speakers.
    entry.node.connect(ctx.destination);
    elementSources.set(element, entry);
  }
  return entry;
}
