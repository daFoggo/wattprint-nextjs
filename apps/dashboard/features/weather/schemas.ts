import { z } from "zod"

const Sky = z.object({ description: z.string(), icon: z.string() })

/** The parts of OpenWeather's /data/2.5/weather this app reads. */
export const CurrentSchema = z.object({
  dt: z.number(),
  weather: z.array(Sky).min(1),
  main: z.object({
    temp: z.number(),
    feels_like: z.number(),
    humidity: z.number(),
  }),
  wind: z.object({ speed: z.number() }),
})

/** The parts of OpenWeather's /data/2.5/forecast (3-hour steps) this app reads. */
export const ForecastSchema = z.object({
  list: z
    .array(
      z.object({
        dt: z.number(),
        main: z.object({ temp: z.number() }),
        weather: z.array(Sky).min(1),
        pop: z.number(),
      })
    )
    .min(1), // the card reads the first slot and the range
})

export type Weather = {
  now: z.infer<typeof CurrentSchema>
  next: z.infer<typeof ForecastSchema>["list"]
}
