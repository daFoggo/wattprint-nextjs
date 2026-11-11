export type ColorFormat = "hex" | "rgb" | "hsl";

export interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number;
}

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const hue = (n: number) => ((n % 360) + 360) % 360;
const byte = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");

export function hslaToRgba({ h, s, l, a }: Hsla) {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const part = chroma * (1 - Math.abs(((hue(h) / 60) % 2) - 1));
  const match = light - chroma / 2;
  const sector = Math.floor(hue(h) / 60) % 6;
  const rgb = [
    [chroma, part, 0],
    [part, chroma, 0],
    [0, chroma, part],
    [0, part, chroma],
    [part, 0, chroma],
    [chroma, 0, part],
  ][sector];
  return { r: Math.round((rgb[0] + match) * 255), g: Math.round((rgb[1] + match) * 255), b: Math.round((rgb[2] + match) * 255), a: clamp(a) };
}

export function rgbaToHsla(r: number, g: number, b: number, a = 1): Hsla {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }
  const l = (max + min) / 2;
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  return { h: hue(h), s: s * 100, l: l * 100, a: clamp(a) };
}

function alpha(input: string | undefined) {
  if (input === undefined) return 1;
  return input.endsWith("%") ? clamp(Number.parseFloat(input) / 100) : clamp(Number.parseFloat(input));
}

function channel(input: string) {
  const n = input.endsWith("%") ? (Number.parseFloat(input) / 100) * 255 : Number.parseFloat(input);
  return Number.isFinite(n) ? clamp(n, 0, 255) : null;
}

/** Reads hex, rgb/rgba and hsl/hsla, including modern space-separated syntax. */
export function parseColor(input: string): Hsla | null {
  const text = input.trim().toLowerCase();
  const hex = text.match(/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let value = hex[1];
    if (value.length < 6) value = [...value].map((c) => c + c).join("");
    const a = value.length === 8 ? Number.parseInt(value.slice(6), 16) / 255 : 1;
    return rgbaToHsla(Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16), a);
  }

  const functional = text.match(/^(rgba?|hsla?)\(\s*([^)]+)\s*\)$/);
  if (!functional) return null;
  const body = functional[2].replace(/\s*[,/]\s*/g, " ").trim();
  const parts = body.split(/\s+/);
  if (parts.length < 3 || parts.length > 4 || parts.some((p) => p === "")) return null;
  const a = alpha(parts[3]);
  if (!Number.isFinite(a)) return null;

  if (functional[1].startsWith("rgb")) {
    const channels = parts.slice(0, 3).map(channel);
    if (channels.some((n) => n === null)) return null;
    return rgbaToHsla(channels[0]!, channels[1]!, channels[2]!, a);
  }

  const h = Number.parseFloat(parts[0]);
  const s = Number.parseFloat(parts[1]);
  const l = Number.parseFloat(parts[2]);
  if (!Number.isFinite(h) || !parts[1].endsWith("%") || !parts[2].endsWith("%") || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return { h: hue(h), s: clamp(s, 0, 100), l: clamp(l, 0, 100), a };
}

export function formatColor(color: Hsla, format: ColorFormat): string {
  const { r, g, b, a } = hslaToRgba(color);
  if (format === "rgb") return `rgb(${r} ${g} ${b}${a < 0.999 ? ` / ${Math.round(a * 100)}%` : ""})`;
  if (format === "hsl") {
    const h = Math.round(color.h);
    const s = Math.round(color.s);
    const l = Math.round(color.l);
    return `hsl(${h} ${s}% ${l}%${a < 0.999 ? ` / ${Math.round(a * 100)}%` : ""})`;
  }
  return `#${byte(r)}${byte(g)}${byte(b)}${a < 0.999 ? byte(a * 255) : ""}`.toUpperCase();
}

export function colorCss(color: Hsla) {
  return `hsl(${color.h.toFixed(2)} ${color.s.toFixed(2)}% ${color.l.toFixed(2)}% / ${color.a.toFixed(3)})`;
}

export function sameColor(a: Hsla, b: Hsla) {
  const left = hslaToRgba(a);
  const right = hslaToRgba(b);
  return left.r === right.r && left.g === right.g && left.b === right.b && Math.abs(left.a - right.a) < 0.004;
}
