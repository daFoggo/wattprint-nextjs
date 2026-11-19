import { z } from "zod"

const Sky = z.object({ description: z.string(), icon: z.string() })

/** GET /energy/weather: now and the next 24 hours (3-hour steps) at the home's province, from OpenWeather. */
export const WeatherSchema = z.object({
  province: z.string(),
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
