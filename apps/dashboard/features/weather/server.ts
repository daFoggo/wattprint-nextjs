import "server-only"

import type { z } from "zod"

import { env } from "@/lib/env"

import { CurrentSchema, ForecastSchema } from "./schemas"

const BASE = "https://api.openweathermap.org/data/2.5"

async function get<T extends z.ZodType>(
  path: string,
  schema: T,
  key: string,
  lang: string
) {
  // lang: OpenWeather writes the sky's description ("mây rải rác") in it.
  const query = new URLSearchParams({
    lat: String(env.WEATHER_LAT),
    lon: String(env.WEATHER_LON),
    units: "metric",
    lang,
    appid: key,
  })
  // A hung OpenWeather must not hold the page head open; the boundary hides the card instead.
  const res = await fetch(`${BASE}/${path}?${query}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`OpenWeather ${path}: ${res.status}`)
  return schema.parse(await res.json()) as z.infer<T>
}

export const fetchCurrent = (key: string, lang: string) =>
  get("weather", CurrentSchema, key, lang)
export const fetchForecast = (key: string, lang: string) =>
  get("forecast", ForecastSchema, key, lang)
