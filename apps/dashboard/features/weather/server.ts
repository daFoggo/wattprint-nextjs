import "server-only"

import { apiFetch } from "@/lib/http"

import { WeatherSchema } from "./schemas"

export async function fetchWeather(token: string, lang: string) {
  const query = new URLSearchParams({ lang })
  return WeatherSchema.parse(
    await apiFetch(`/energy/weather?${query}`, { token })
  )
}
