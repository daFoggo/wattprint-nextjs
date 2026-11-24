import { z } from "zod"

const Sky = z.object({ description: z.string(), icon: z.string() })

/** GET /energy/weather: now and the next 24 hours (3-hour steps) at the home's province (OpenWeather), or a demo home's recording site (ERA5). */
export const WeatherSchema = z.object({
  province: z.string(),
  /** OpenWeather live at the province; ERA5 reanalysis (stored hours) at a demo home's recording site. */
  source: z.enum(["openweather", "era5"]),
  now: z.object({
    dt: z.number(),
    temp: z.number(),
    feels_like: z.number(),
    humidity: z.number(),
    wind_speed: z.number(),
    sky: Sky,
  }),
  next: z
    .array(
      z.object({ dt: z.number(), temp: z.number(), pop: z.number(), sky: Sky })
    )
    .min(1), // the card reads the first slot and the range
})

export type Weather = z.infer<typeof WeatherSchema>
