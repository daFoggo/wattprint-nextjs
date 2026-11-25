"use client"

import { IconArrowUpRight } from "@tabler/icons-react"
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { Link } from "@/i18n/navigation"

export type CardNavLink = { label: string; href: string; external?: boolean }
export type CardNavItem = {
  label: string
  description: string
  tinted?: boolean
  links: CardNavLink[]
}

type Props = {
  logo: ReactNode
  logoLabel: string
  items: CardNavItem[]
  cta: ReactNode
  /** Locale and theme controls: in the bar on wide screens, under the cards on narrow ones. */
  tools: ReactNode
  label: string
  words: { open: string; close: string }
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))
const easeOut = (t: number) => 1 - (1 - t) ** 3

/**
 * Adapted from React Bits CardNav (reactbits.dev/components/card-nav, MIT + Commons Clause): the bar with Menu, the
 * logo and one action, opening into cards on a spring. Kept: the spring and the staggered rise. Changed: tabler icons,
 * every string from next-intl, the landing tokens, solid surface, no shadows; styles live in landing.css (`.cn-*`).
 */
export function CardNav({
  logo,
  logoLabel,
  items,
  cta,
  tools,
  label,
  words,
}: Props) {
  const contentId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLButtonElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const engineRef = useRef<{ wake: () => void; refresh: () => void } | null>(
    null
  )
  const openRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const toggle = (next: boolean) => {
    if (next) setShown(true)
    setOpen(next)
  }

  useEffect(() => {
    const panel = panelRef.current
    const content = contentRef.current
    if (!panel || !content) return undefined
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const state = {
      p: openRef.current ? 1 : 0,
      v: 0,
      height: content.offsetHeight,
    }
    let raf = 0
    let last = 0

    const render = () => {
      const bar =
        parseFloat(getComputedStyle(panel).getPropertyValue("--cn-bar")) || 64
      panel.style.height = `${bar + Math.max(0, state.p) * state.height}px`
      const cards = cardRefs.current.filter(
        // The narrow-screen controls are display:none on wide screens; they stay out of the stagger there.
        (c): c is HTMLDivElement => c !== null && c.offsetParent !== null
      )
      const lag =
        cards.length > 1 ? Math.min(0.12, 0.7 / (cards.length - 1)) : 0
      const span = 1 - lag * (cards.length - 1)
      cards.forEach((card, i) => {
        const local = clamp((state.p - i * lag) / Math.max(span, 0.05), 0, 1)
        const e = easeOut(local)
        card.style.transform = `translateY(${(1 - e) * 22}px)`
        card.style.opacity = `${e}`
      })
    }

    const tick = (now: number) => {
      raf = 0
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      const target = openRef.current ? 1 : 0
      if (reduce) {
        state.p = target
        state.v = 0
      } else {
        const k = 160
        const zeta = target ? 0.86 : 1
        const steps = Math.ceil(dt / (1 / 240))
        const h = dt / steps
        for (let i = 0; i < steps; i++) {
          state.v +=
            (-k * (state.p - target) - 2 * zeta * Math.sqrt(k) * state.v) * h
          state.p += state.v * h
        }
      }
      const done =
        Math.abs(state.p - target) < 0.0005 && Math.abs(state.v) < 0.002
      if (done) {
        state.p = target
        state.v = 0
      }
      render()
      if (done && target === 0) setShown(false)
      if (!done) raf = requestAnimationFrame(tick)
    }

    engineRef.current = {
      wake: () => {
        if (raf) return
        last = 0
        raf = requestAnimationFrame(tick)
      },
      refresh: () => {
        state.height = content.offsetHeight
        render()
      },
    }
    render()
    const observer = new ResizeObserver(() => engineRef.current?.refresh())
    observer.observe(content)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      engineRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    openRef.current = open
    engineRef.current?.refresh()
    engineRef.current?.wake()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target)
      )
        return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setOpen(false)
      menuRef.current?.focus()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const tab = open ? undefined : -1

  return (
    <div
      ref={rootRef}
      className="cn-root"
      data-open={open ? "" : undefined}
      data-shown={shown || open ? "" : undefined}
    >
      <nav ref={panelRef} className="cn-panel" aria-label={label}>
        <div className="cn-bar">
          <button
            ref={menuRef}
            type="button"
            className="cn-menu"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => toggle(!open)}
          >
            <span className="cn-burger" aria-hidden="true">
              <span className="cn-line cn-line-top" />
              <span className="cn-line cn-line-bottom" />
            </span>
            <span className="cn-words">
              <span className="cn-word-open" aria-hidden={open}>
                {words.open}
              </span>
              <span className="cn-word-close" aria-hidden={!open}>
                {words.close}
              </span>
            </span>
          </button>
          <Link href="/" className="cn-logo" aria-label={logoLabel}>
            {logo}
          </Link>
          {/* Both places render; CSS shows one per width (landing.css), so the server HTML is already right. */}
          <div className="cn-end">
            {tools}
            {cta}
          </div>
        </div>

        <div
          ref={contentRef}
          id={contentId}
          className="cn-content"
          aria-hidden={!open}
        >
          <div className="cn-cards">
            {items.map((item, i) => (
              <div
                key={item.label}
                ref={(el) => {
                  cardRefs.current[i] = el
                }}
                className="cn-card"
                data-tinted={item.tinted ? "" : undefined}
              >
                <div className="cn-card-head">
                  <span className="cn-card-label">{item.label}</span>
                  <p className="cn-card-text">{item.description}</p>
                </div>
                <ul className="cn-links">
                  {item.links.map((link) => {
                    const body = (
                      <>
                        <IconArrowUpRight
                          aria-hidden="true"
                          size={14}
                          stroke={2}
                        />
                        {link.label}
                      </>
                    )
                    return (
                      <li key={link.label}>
                        {link.external ? (
                          <a
                            href={link.href}
                            className="cn-link"
                            tabIndex={tab}
                          >
                            {body}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="cn-link"
                            tabIndex={tab}
                            onClick={() => setOpen(false)}
                          >
                            {body}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div
            ref={(el) => {
              cardRefs.current[items.length] = el
            }}
            className="cn-narrow-end"
          >
            {tools}
            {cta}
          </div>
        </div>
      </nav>
    </div>
  )
}
