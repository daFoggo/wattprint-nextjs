import {
  BILL_PATH,
  DEVICES_PATH,
  SETTINGS_PATH,
  STATISTICS_PATH,
} from "@/config/routes"

import type { DataTier, Intent, Reply, Source, Widget } from "./schemas"

// shortcut: scripted answers until the copilot backend (LLM + Text2SQL + RAG, wattprint-text2sql-mcp) streams real ones.
// Figures are illustrative and the UI says so; words live in messages/*/copilot.json (copilot.demo.*), numbers here.

/** Translates a `copilot.demo` key; `list` reads a string array. */
export type Copy = {
  (key: string, values?: Record<string, string | number>): string
  list: (key: string) => string[]
}

const SOURCES = {
  tariff: {
    title: "QĐ 1279/QĐ-BCT (2025)",
    url: "https://luatvietnam.vn/dien-luc/quyet-dinh-1279-qd-bct-cua-bo-cong-thuong-quy-dinh-ve-gia-ban-dien-399752-d1.html",
  },
  weather: { title: "Open-Meteo", url: "https://open-meteo.com" },
  nilm: {
    title: "NILMFormer (KDD 2025)",
    url: "https://arxiv.org/abs/2506.05880",
  },
  feedback: {
    title: "Nguyen et al., Energy Policy (2024)",
    url: "https://ideas.repec.org/a/eee/enepol/v195y2024ics0301421524003987.html",
  },
} satisfies Record<string, Source>

/** Checked in order: the narrow topics first, so "dự báo tiền điện" is a forecast and not a bill question. */
const KEYWORDS: [Intent, string[]][] = [
  [
    "standby",
    [
      "dien nen",
      "chay ngam",
      "che do cho",
      "standby",
      "always on",
      "background",
    ],
  ],
  [
    "forecast",
    [
      "du bao",
      "cuoi thang",
      "cuoi ky",
      "bac gia",
      "bac tiep",
      "forecast",
      "end of",
      "tier",
    ],
  ],
  [
    "peers",
    [
      "so sanh",
      "ho khac",
      "hang xom",
      "ho tuong tu",
      "compare",
      "neighbo",
      "similar",
    ],
  ],
  ["plan", ["ke hoach", "tiet kiem", "plan", "save", "saving"]],
  ["weather", ["thoi tiet", "nong", "dieu hoa", "weather", "hot", "air con"]],
  ["devices", ["thiet bi", "ton dien nhat", "device", "appliance"]],
  [
    "bill",
    ["tien dien", "hoa don", "vi sao", "tai sao", "bill", "why", "cost"],
  ],
]

/** The topic of a free-text question, in Vietnamese (with or without accents) or English. */
export function detectIntent(text: string): Intent {
  const plain = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
  return (
    KEYWORDS.find(([, words]) => words.some((w) => plain.includes(w)))?.[0] ??
    "clarify"
  )
}

type Spec = {
  tier: DataTier
  steps: (keyof typeof STEP_DETAIL)[]
  sql?: string
  sources: Source[]
  widgets: (copy: Copy) => Widget[]
}

const STEP_DETAIL = {
  sql: "tb_series",
  nilm: "NILMFormer",
  tariff: "QĐ 1279",
  weather: "Open-Meteo",
  forecast: "LightGBM",
  cohort: "cohort_stat",
  rag: "pgvector",
}

const link = (copy: Copy, key: string, href: string) => ({
  label: copy(`links.${key}`),
  href,
})

const SPECS: Record<Exclude<Intent, "clarify">, Spec> = {
  devices: {
    tier: "estimated",
    steps: ["sql", "nilm", "tariff"],
    sql: "SELECT device, sum(kwh) AS kwh\nFROM device_energy\nWHERE home_id = :home AND ts >= now() - interval '30 days'\nGROUP BY device ORDER BY kwh DESC;",
    sources: [SOURCES.nilm, SOURCES.tariff],
    widgets: (copy) => [
      {
        kind: "devices",
        slices: (
          [
            ["fridge", 38.2],
            ["alwaysOn", 31.5],
            ["dishwasher", 24.8],
            ["washer", 18.6],
            ["kettle", 12.4],
            ["tv", 9.7],
            ["other", 21.3],
          ] as const
        ).map(([id, value]) => ({ id, label: copy(`names.${id}`), value })),
      },
      { kind: "links", links: [link(copy, "devices", DEVICES_PATH)] },
    ],
  },
  bill: {
    tier: "measured",
    steps: ["sql", "weather", "tariff"],
    sql: "SELECT date_trunc('week', ts) AS week, sum(kwh) AS kwh\nFROM meter_energy\nWHERE home_id = :home AND ts >= :previous_cycle_start\nGROUP BY week ORDER BY week;",
    sources: [SOURCES.tariff, SOURCES.weather],
    widgets: (copy) => [
      {
        kind: "compare",
        currentLabel: copy("labels.thisCycle"),
        previousLabel: copy("labels.lastCycle"),
        data: [52.4, 61.8, 74.1, 79.6].map((current, i) => ({
          key: `w${i + 1}`,
          label: copy("labels.week", { n: i + 1 }),
          current,
          previous: [49.2, 51.0, 55.7, 58.3][i]!,
        })),
      },
      {
        kind: "links",
        links: [
          link(copy, "bill", BILL_PATH),
          link(copy, "statistics", STATISTICS_PATH),
        ],
      },
    ],
  },
  forecast: {
    tier: "estimated",
    steps: ["sql", "forecast", "tariff"],
    sources: [SOURCES.tariff],
    widgets: (copy) => [
      { kind: "forecast", used: 168, limit: 200, kwh: 236, vnd: 712_000 },
      { kind: "links", links: [link(copy, "bill", BILL_PATH)] },
    ],
  },
  weather: {
    tier: "inferred",
    steps: ["weather", "rag"],
    sources: [SOURCES.weather],
    widgets: (copy) => [
      {
        kind: "weather",
        temp: 34,
        feels: 39,
        humidity: 68,
        tips: copy.list("weather.tips"),
      },
    ],
  },
  plan: {
    tier: "estimated",
    steps: ["sql", "nilm", "tariff"],
    sources: [SOURCES.feedback, SOURCES.tariff],
    widgets: (copy) => [
      {
        kind: "plan",
        tasks: (["standby", "dishwasher", "washer", "kettle"] as const).map(
          (id) => ({
            label: copy(`plan.tasks.${id}.label`),
            detail: copy(`plan.tasks.${id}.detail`),
          })
        ),
        kwh: 22.3,
        vnd: 64_700,
      },
    ],
  },
  peers: {
    tier: "measured",
    steps: ["sql", "cohort"],
    sources: [SOURCES.feedback],
    widgets: (copy) => [
      { kind: "peers", you: 312, median: 268, days: 30, homes: 1240 },
      {
        kind: "links",
        links: [
          link(copy, "statistics", STATISTICS_PATH),
          link(copy, "settings", SETTINGS_PATH),
        ],
      },
    ],
  },
  standby: {
    tier: "estimated",
    steps: ["sql", "nilm"],
    sql: "SELECT date(ts) AS day, percentile_cont(0.05) WITHIN GROUP (ORDER BY watts) AS baseline_w\nFROM meter_power\nWHERE home_id = :home AND ts >= now() - interval '14 days'\nGROUP BY day ORDER BY day;",
    sources: [SOURCES.nilm],
    widgets: (copy) => [
      {
        kind: "standby",
        watts: [
          96, 98, 97, 99, 101, 100, 98, 103, 105, 104, 108, 107, 110, 112,
        ],
        kwh: 75.6,
        vnd: 219_000,
      },
      { kind: "links", links: [link(copy, "devices", DEVICES_PATH)] },
    ],
  },
}

/** Wappi's answer to an intent, in the reader's language. */
export function demoReply(intent: Intent, copy: Copy): Reply {
  if (intent === "clarify") {
    return {
      intent,
      tier: "inferred",
      steps: [],
      text: copy("clarify.text"),
      sources: [],
      widgets: [],
      followUps: [],
      question: {
        text: copy("clarify.question"),
        options: (["bill", "devices", "plan", "weather"] as const).map(
          (id) => ({ id, label: copy(`clarify.options.${id}`) })
        ),
      },
    }
  }
  const spec = SPECS[intent]
  return {
    intent,
    tier: spec.tier,
    steps: spec.steps.map((step) => ({
      label: copy(`steps.${step}`),
      detail: STEP_DETAIL[step],
    })),
    sql: spec.sql,
    text: copy(`${intent}.text`),
    sources: spec.sources,
    widgets: spec.widgets(copy),
    followUps: copy.list(`${intent}.followUps`),
  }
}

/** The question a suggestion chip or a picked option sends, by intent. */
export const askFor = (intent: Intent, copy: Copy) => copy(`ask.${intent}`)
