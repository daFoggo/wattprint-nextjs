"use client"

import { useEffect, useRef } from "react"

/**
 * A card background in Hairline's Liquid log style: liquid fills the card from the bottom with a
 * swaying surface, a pale meniscus and fine engraved lines. `level` is 0..1 of the height, `wind`
 * stirs the surface, and the colour is read from `colorClass` (a Tailwind palette class), so the
 * theme switch is followed without a reload. Static under reduced motion.
 */
export function LiquidSky({
  level,
  wind,
  colorClass,
}: {
  level: number
  wind: number
  colorClass: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const liquidRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    const amp = 1.2 + Math.min(wind, 12) * 0.35 // calm air barely moves it, a gale sloshes
    let raf = 0

    const frame = (now: number) => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(w * dpr))
        canvas.width = Math.round(w * dpr)
      if (canvas.height !== Math.round(h * dpr))
        canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Read every frame: a theme switch changes both colours.
      const liquid = liquidRef.current
        ? getComputedStyle(liquidRef.current).color
        : "gray"
      const card = cardRef.current
        ? getComputedStyle(cardRef.current).color
        : "white"
      const t = still ? 0 : now / 1000
      const base = h * (1 - level)
      const y = (x: number) =>
        base +
        amp *
          (Math.sin(x * 0.034 + t * 1.25) +
            0.65 * Math.sin(x * 0.069 - t * 0.85))
      const outline = () => {
        ctx.beginPath()
        ctx.moveTo(0, y(0))
        for (let x = 4; x <= w + 4; x += 4) ctx.lineTo(x, y(x))
      }

      // The body: the colour, light near the surface and deeper toward the bottom.
      ctx.save()
      outline()
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      ctx.clip()
      ctx.fillStyle = liquid
      ctx.fillRect(0, 0, w, h)
      const top = Math.max(0, base - 6)
      const shade = ctx.createLinearGradient(0, top, 0, h)
      shade.addColorStop(0, "rgba(255,255,255,0.26)")
      shade.addColorStop(
        Math.min(1, 50 / Math.max(1, h - top)),
        "rgba(255,255,255,0)"
      )
      shade.addColorStop(1, "rgba(0,0,0,0.18)")
      ctx.fillStyle = shade
      ctx.fillRect(0, top, w, h - top)
      // Liquid log's house mark: the liquid is drawn in fine engraved lines.
      ctx.fillStyle = card
      ctx.globalAlpha = 0.11
      for (let ly = Math.floor(top / 4) * 4 + 3; ly < h; ly += 4)
        ctx.fillRect(0, ly, w, 1)
      ctx.restore()

      // The meniscus.
      outline()
      ctx.strokeStyle = card
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.globalAlpha = 1

      if (!still) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [level, wind])

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 size-full"
      />
      <span ref={liquidRef} aria-hidden className={`hidden ${colorClass}`} />
      <span ref={cardRef} aria-hidden className="hidden text-background" />
    </>
  )
}
