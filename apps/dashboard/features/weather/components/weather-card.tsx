"use client"

import {
  IconCloud,
  IconCloudRain,
  IconCloudStorm,
  IconMist,
  IconMoon,
  IconSnowflake,
  IconSun,
  type Icon,
} from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Popover } from "@workspace/ui/components/hairline/popover"
import { Sparkline } from "@workspace/ui/components/hairline/sparkline"

import type { Weather } from "../schemas"
import { LiquidSky } from "./liquid-sky"

// OpenWeather icon codes: "01d" is clear by day, "10n" rain at night (openweathermap.org/weather-conditions).
const SKY: Record<string, Icon> = {
  "02": IconCloud,
  "03": IconCloud,
  "04": IconCloud,
  "09": IconCloudRain,
  "10": IconCloudRain,
  "11": IconCloudStorm,
  "13": IconSnowflake,
  "50": IconMist,
}

function Sky({
  code,
  ...props
}: { code: string } & React.ComponentProps<Icon>) {
  const Glyph =
    SKY[code.slice(0, 2)] ?? (code.endsWith("n") ? IconMoon : IconSun)
  return <Glyph stroke={1.5} {...props} />
}

// 24-hour clock in both languages; the place is in Vietnam, so its own time.
const clock = (locale: string) => (dt: number) =>
  new Date(dt * 1000).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Ho_Chi_Minh",
  })

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

// The liquid's colour follows the sky. Literal classes, so Tailwind generates them.
const PALETTE = {
  clear: "text-amber-400",
  night: "text-indigo-400",
  clouds: "text-slate-400",
  rain: "text-sky-500",
  storm: "text-violet-500",
  snow: "text-cyan-200",
  mist: "text-zinc-400",
}

function mood(code: string): keyof typeof PALETTE {
  const group = code.slice(0, 2)
  if (group === "01") return code.endsWith("n") ? "night" : "clear"
  if (group === "09" || group === "10") return "rain"
  if (group === "11") return "storm"
  if (group === "13") return "snow"
  if (group === "50") return "mist"
  return "clouds"
}

/**
 * Warmer is fuller, but the liquid stays a band under the words: 0°C fills 6% of the card, 40°C
 * 24%, which with the highest wave (about 9px in a gale) still ends below the text on a 72px card.
 */
const levelFor = (celsius: number) =>
  0.06 + (Math.min(40, Math.max(0, celsius)) / 40) * 0.18

/** The card's face: the words sit at the top, clear of the liquid below. */
function Face({ weather }: { weather: Weather }) {
  const { now, next } = weather
  const sky = now.weather[0]!
  const wettest = next.reduce((a, b) => (b.pop > a.pop ? b : a), next[0]!)
  const t = useTranslations("weather")
  const hour = clock(useLocale())
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-2">
      <p className="flex items-center gap-2">
        <Sky
          code={sky.icon}
          aria-hidden
          className="size-5 text-muted-foreground"
        />
        <span className="text-2xl font-medium tracking-tight tabular-nums">
          {Math.round(now.main.temp)}
        </span>
        <span className="text-xs text-muted-foreground">°C</span>
      </p>
      <div className="flex min-w-0 flex-col items-end text-right text-xs">
        <span className="truncate text-sm font-medium">
          {sentence(sky.description)}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {t("rainBy", {
            pct: Math.round(wettest.pop * 100),
            time: hour(wettest.dt),
          })}
        </span>
      </div>
    </div>
  )
}

/**
 * The weather as a small card in the page head, its background a liquid whose colour follows the
 * sky, level the temperature and surface the wind. It opens into the next 24 hours. Heat and rain
 * drive fans, air conditioning and drying, so it sits beside the energy figures.
 */
export function WeatherCard({ weather }: { weather: Weather }) {
  const t = useTranslations("weather")
  const locale = useLocale()
  const hour = clock(locale)
  const { now, next } = weather
  const sky = now.weather[0]!
  const temps = next.map((slot) => slot.main.temp)
  const wettest = next.reduce((a, b) => (b.pop > a.pop ? b : a), next[0]!)
  const liquid = PALETTE[mood(sky.icon)]
  const level = levelFor(now.main.temp)
  return (
    <Popover
      label={t("title")}
      side="bottom"
      align="end"
      width={256}
      trigger={
        <button
          type="button"
          aria-label={t("open", {
            temp: Math.round(now.main.temp),
            sky: sky.description,
          })}
          className="relative isolate h-18 w-64 cursor-pointer overflow-clip rounded-2xl border bg-background text-left text-foreground motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:active:scale-95"
        >
          <LiquidSky level={level} wind={now.wind.speed} colorClass={liquid} />
          <div className="relative">
            <Face weather={weather} />
          </div>
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <p className="flex items-baseline gap-1">
              <span className="text-2xl font-medium tracking-tight tabular-nums">
                {Math.round(now.main.temp)}
              </span>
              <span className="text-sm text-muted-foreground">°C</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t("feelsLike", { temp: Math.round(now.main.feels_like) })}
            </p>
          </div>
          <Sky
            code={sky.icon}
            aria-hidden
            className="size-8 text-muted-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5 rounded-xl bg-card p-2.5">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{t("next24")}</span>
            <span className="font-medium tabular-nums">
              {Math.round(Math.min(...temps))}–{Math.round(Math.max(...temps))}
              °C
            </span>
          </div>
          <Sparkline
            data={next.map((slot) => ({
              value: slot.main.temp,
              label: hour(slot.dt),
            }))}
            variant="area"
            color="primary"
            width="100%"
            height={32}
            showScrubber
            format={{ maximumFractionDigits: 0 }}
            suffix="°C"
            label={t("tempChart")}
          />
          {/* Only the ends: the points are spread evenly, so inner labels would sit off their point. */}
          <div
            aria-hidden
            className="flex justify-between text-xs text-muted-foreground tabular-nums"
          >
            <span>{hour(next[0]!.dt)}</span>
            <span>{hour(next.at(-1)!.dt)}</span>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2">
          {[
            [t("humidity"), `${now.main.humidity}`, "%"],
            [
              t("wind"),
              now.wind.speed.toLocaleString(locale, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
              "m/s",
            ],
            [
              t("rainAt", { time: hour(wettest.dt) }),
              `${Math.round(wettest.pop * 100)}`,
              "%",
            ],
          ].map(([term, value, unit]) => (
            <div key={term} className="flex flex-col gap-0.5">
              <dt className="font-mono text-xs text-muted-foreground">
                {term}
              </dt>
              <dd className="flex items-baseline gap-1">
                <span className="text-base font-medium tabular-nums">
                  {value}
                </span>
                <span className="text-xs text-muted-foreground">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          {t("updated", { time: hour(now.dt) })}
        </p>
      </div>
    </Popover>
  )
}
