import type { CSSProperties } from "react"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { GeistSerif } from "geist/font/serif"
import { GeistPixelGrid, GeistPixelSquare } from "geist/font/pixel"

/** The full Geist family, shared by every app so type never drifts between them. */
export const fontClassName = [
  GeistSans.variable,
  GeistMono.variable,
  GeistSerif.variable,
  GeistPixelSquare.variable,
  GeistPixelGrid.variable,
].join(" ")

/** Sans and mono only, for the landing page: Next preloads each file of every font it loads, and the landing uses these two. */
export const landingFontClassName = [GeistSans.variable, GeistMono.variable].join(" ")

/** Maps Geist's own variables onto the theme tokens the UI kit reads (`font-sans`, `font-mono`, ...). */
export const fontStyle = {
  "--font-sans": "var(--font-geist-sans)",
  "--font-mono": "var(--font-geist-mono)",
  "--font-serif": "var(--font-geist-serif)",
  "--font-pixel-square": "var(--font-geist-pixel-square)",
  "--font-pixel-grid": "var(--font-geist-pixel-grid)",
} as CSSProperties
