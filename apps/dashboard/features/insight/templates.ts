import { lineScale, toKwh, type AlertSource } from "./sources"

export type TemplateKey =
  "daily" | "cycle" | "power" | "device_run_min" | "device_on" | "device_off"

/** One choice in the add panel: what it watches, the unit it is set in, and its default from the home's history. */
export type Template = {
  key: TemplateKey
  group: "money" | "device" | "home"
  metric: string
  unit: "vnd" | "kwh" | "w" | "min" | null
  history: number[]
  start: number
  step: number
}

export const RUN_MINUTES = [15, 30, 60, 120, 240]

function fromSource(s: AlertSource, group: Template["group"]): Template {
  const history = s.data.map((d) => d.value)
  // Too little history for a quartile: start from the figure now, money in 1,000 ₫ steps, the rest in single ones.
  const step = s.unit === "vnd" ? 1000 : 1
  const scale =
    history.length >= 2
      ? lineScale(history)
      : { start: Math.round((s.now ?? 0) / step) * step, step }
  return {
    key: s.key,
    group,
    metric: s.metric,
    unit: s.unit,
    history,
    ...scale,
  }
}

/** The panel's templates, money first, then devices (only with named devices), then the whole home. */
export function templatesFor(
  sources: AlertSource[],
  hasDevices: boolean
): Template[] {
  const by = (k: AlertSource["key"]) => sources.find((s) => s.key === k)
  const money = (["daily", "cycle"] as const).flatMap((k) => {
    const s = by(k)
    return s ? [fromSource(s, "money")] : []
  })
  const devices: Template[] = hasDevices
    ? [
        {
          key: "device_run_min",
          group: "device",
          metric: "device_run_min",
          unit: "min",
          history: [],
          start: 30,
          step: 15,
        },
        {
          key: "device_on",
          group: "device",
          metric: "device_on",
          unit: null,
          history: [],
          start: 0,
          step: 1,
        },
        {
          key: "device_off",
          group: "device",
          metric: "device_off",
          unit: null,
          history: [],
          start: 0,
          step: 1,
        },
      ]
    : []
  const power = by("power")
  return [...money, ...devices, ...(power ? [fromSource(power, "home")] : [])]
}

/** How many past points pass the threshold ("would have alerted N times"); null with too little history to say. */
export function previewCount(
  history: number[],
  threshold: number
): number | null {
  return history.length < 2 ? null : history.filter((v) => v > threshold).length
}

/** What a level or run-limit template saves (POST /insights/watches); a daily amount set in ₫ is saved as the kWh it buys. */
export function watchInput({
  template,
  value,
  price,
  repeat,
  deviceId,
  label,
}: {
  template: Template
  value: number
  price: number | null
  repeat: boolean
  deviceId: string
  label: string
}) {
  const isDevice = template.group === "device"
  return {
    metric: template.metric,
    op: "gt" as const,
    threshold:
      template.key === "daily" && template.unit === "vnd" && price
        ? toKwh(value, price)
        : value,
    label,
    ...(isDevice ? { device_id: deviceId } : {}),
    // A device rule fires on each run; once would end it at the first long run.
    repeat: isDevice ? true : repeat,
  }
}
