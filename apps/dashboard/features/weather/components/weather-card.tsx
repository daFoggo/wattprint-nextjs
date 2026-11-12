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

const hour = (dt: number) =>
  new Date(dt * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  })

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

// The liquid's colour follows the sky. Literal classes, so Tailwind generates them.
const PALETTE = {
  clear: { liquid: "text-amber-400", ink: "text-neutral-950" },
  night: { liquid: "text-indigo-400", ink: "text-white" },
  clouds: { liquid: "text-slate-400", ink: "text-neutral-950" },
  rain: { liquid: "text-sky-500", ink: "text-white" },
  storm: { liquid: "text-violet-500", ink: "text-white" },
  snow: { liquid: "text-cyan-200", ink: "text-neutral-950" },
  mist: { liquid: "text-zinc-400", ink: "text-neutral-950" },
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

/** Warmer is fuller: 0°C fills a fifth of the card, 40°C four fifths. */
const levelFor = (celsius: number) =>
  0.2 + (Math.min(40, Math.max(0, celsius)) / 40) * 0.6

/** The card's face; drawn twice, the second in an ink that reads on the liquid, clipped to where the liquid covers it. */
function Face({ weather, ink }: { weather: Weather; ink?: boolean }) {
  const { now, next } = weather
  const sky = now.weather[0]!
  const wettest = next.reduce((a, b) => (b.pop > a.pop ? b : a), next[0]!)
  const muted = ink ? "" : "text-muted-foreground"
  return (
    <div className="flex h-full flex-col justify-between p-4">
      <div
        className={`flex items-center justify-between gap-3 text-sm ${muted}`}
      >
        <span className="flex items-center gap-1.5">
          <Sky code={sky.icon} aria-hidden className="size-4" />
          Weather
        </span>
        <span className="tabular-nums">{hour(now.dt)}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="flex items-baseline gap-1">
          <span className="text-4xl font-medium tracking-tight tabular-nums">
            {Math.round(now.main.temp)}
          </span>
          <span className={`text-sm ${muted}`}>°C</span>
        </p>
        <div className="flex flex-col items-end gap-1 text-right text-sm">
          <span className="font-medium">{sentence(sky.description)}</span>
          <span className={`tabular-nums ${muted}`}>
            Rain {Math.round(wettest.pop * 100)}% by {hour(wettest.dt)}
          </span>
        </div>
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
  const { now, next } = weather
  const sky = now.weather[0]!
  const temps = next.map((slot) => slot.main.temp)
  const wettest = next.reduce((a, b) => (b.pop > a.pop ? b : a), next[0]!)
  const palette = PALETTE[mood(sky.icon)]
  const level = levelFor(now.main.temp)
  return (
    <Popover
      label="Weather"
      side="bottom"
      align="end"
      width={300}
      trigger={
        <button
          type="button"
          aria-label={`Weather: ${Math.round(now.main.temp)}°C, ${sky.description}. Open the next 24 hours.`}
          className="relative isolate h-32 w-80 cursor-pointer overflow-clip rounded-3xl border bg-background text-left text-foreground motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:active:scale-95"
        >
          <LiquidSky
            level={level}
            wind={now.wind.speed}
            colorClass={palette.liquid}
          />
          <div className="relative h-full">
            <Face weather={weather} />
          </div>
          {/* Where the liquid covers the words they turn light, cut along the mean waterline. */}
          <div
            aria-hidden
            className={`absolute inset-0 ${palette.ink}`}
            style={{ clipPath: `inset(${(1 - level) * 100}% 0 0 0)` }}
          >
            <Face weather={weather} ink />
          </div>
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="flex items-baseline gap-1">
              <span className="text-3xl font-medium tracking-tight tabular-nums">
                {Math.round(now.main.temp)}
              </span>
              <span className="text-sm text-muted-foreground">°C</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Feels like {Math.round(now.main.feels_like)}°C
            </p>
          </div>
          <Sky
            code={sky.icon}
            aria-hidden
            className="size-10 text-muted-foreground"
          />
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-card p-3">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Next 24 hours</span>
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
            height={40}
            showScrubber
            format={{ maximumFractionDigits: 0 }}
            suffix="°C"
            label="Temperature over the next 24 hours"
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

        <dl className="grid grid-cols-3 gap-3">
          {[
            ["Humidity", `${now.main.humidity}`, "%"],
            ["Wind", now.wind.speed.toFixed(1), "m/s"],
            [
              `Rain ${hour(wettest.dt)}`,
              `${Math.round(wettest.pop * 100)}`,
              "%",
            ],
          ].map(([term, value, unit]) => (
            <div key={term} className="flex flex-col gap-1">
              <dt className="font-mono text-xs text-muted-foreground">
                {term}
              </dt>
              <dd className="flex items-baseline gap-1">
                <span className="text-lg font-medium tabular-nums">
                  {value}
                </span>
                <span className="text-xs text-muted-foreground">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Updated {hour(now.dt)} · OpenWeather
        </p>
      </div>
    </Popover>
  )
}
