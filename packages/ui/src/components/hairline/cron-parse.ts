export type CronFieldName = "minute" | "hour" | "day" | "month" | "weekday";

export const CRON_FIELDS: { name: CronFieldName; min: number; max: number }[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "weekday", min: 0, max: 7 },
];

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NTH = ["", "first", "second", "third", "fourth", "fifth"];
const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

export interface CronSchedule {
  /** The five fields, tidied: single spaces, macros expanded. */
  expression: string;
  minutes: number[];
  hours: number[];
  days: number[];
  months: number[];
  /** 0–6, Sunday first. */
  weekdays: number[];
  /** L in the day field. */
  lastDay: boolean;
  /** FRI#2 (nth 2) or 5L (nth -1). */
  nthWeekdays: { weekday: number; nth: number }[];
  /** The field started with * (or ?), so the other one decides. */
  dayStar: boolean;
  weekdayStar: boolean;
}

export type CronParse = { ok: true; schedule: CronSchedule } | { ok: false; message: string; field: number | null };

/** Where each field sits in the text, for pointing at it. */
export function cronTokens(text: string): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  return out;
}

const range = (a: number, b: number, step = 1) => {
  const out: number[] = [];
  for (let i = a; i <= b; i += step) out.push(i);
  return out;
};

type Field = { values: Set<number>; star: boolean; last?: boolean; nth?: { weekday: number; nth: number }[] };

function value(raw: string, f: number): number | string {
  const { min, max, name } = CRON_FIELDS[f];
  const up = raw.toUpperCase();
  if (f === 3 && MONTHS.includes(up)) return MONTHS.indexOf(up) + 1;
  if (f === 4 && DAYS.includes(up)) return DAYS.indexOf(up);
  if (!/^\d+$/.test(raw)) {
    if (f === 3) return `“${raw}” isn’t a month. Use 1–12 or JAN–DEC.`;
    if (f === 4) return `“${raw}” isn’t a weekday. Use 0–6 or SUN–SAT.`;
    return `“${raw}” isn’t a number. The ${name} goes from ${min} to ${max}.`;
  }
  const n = Number(raw);
  if (n < min || n > max) return `The ${name} goes from ${min} to ${max}${f === 4 ? " (0 and 7 are Sunday)" : ""}, not ${n}.`;
  return n;
}

function field(token: string, f: number): Field | string {
  const { min, max, name } = CRON_FIELDS[f];
  const out: Field = { values: new Set(), star: token[0] === "*" || token[0] === "?" };
  for (const part of token.split(",")) {
    if (!part) return `There’s an empty item in the ${name} list.`;
    if (f === 2 && /^L$/i.test(part)) {
      out.last = true;
      continue;
    }
    if (f === 4) {
      const nth = part.match(/^(\w+)(?:#(\d)|(L))$/i);
      if (nth) {
        const day = value(nth[1], 4);
        if (typeof day === "string") return day;
        const n = nth[3] ? -1 : Number(nth[2]);
        if (n === 0 || n > 5) return `#${nth[2]} can’t be: a weekday comes 1 to 5 times a month.`;
        (out.nth ??= []).push({ weekday: day % 7, nth: n });
        continue;
      }
    }
    if (/W/i.test(part) && f === 2) return "W (nearest weekday) isn’t supported. Use a day number or L.";
    const [base, stepText] = part.split("/");
    let step = 1;
    if (stepText !== undefined) {
      if (!/^\d+$/.test(stepText) || Number(stepText) < 1) return `A step needs a number after the slash, like ${base || "*"}/5.`;
      step = Number(stepText);
      if (step > max) return `A ${name} step of ${step} is bigger than the ${name} range.`;
    }
    let lo: number;
    let hi: number;
    if (base === "*" || base === "?") {
      lo = min;
      hi = f === 4 ? 6 : max;
    } else if (base.includes("-")) {
      const [a, b, extra] = base.split("-");
      if (extra !== undefined || !a || !b) return `“${base}” isn’t a range. Write it as low-high, like 1-5.`;
      const va = value(a, f);
      const vb = value(b, f);
      if (typeof va === "string") return va;
      if (typeof vb === "string") return vb;
      if (va > vb && !(f === 4 && vb === 0)) return `Ranges go from low to high: ${b}-${a}, not ${base}.`;
      lo = va;
      hi = f === 4 && vb === 0 ? 7 : vb;
    } else {
      const v = value(base, f);
      if (typeof v === "string") return v;
      lo = v;
      hi = stepText !== undefined ? (f === 4 ? 6 : max) : v;
    }
    for (const n of range(lo, hi, step)) out.values.add(f === 4 ? n % 7 : n);
  }
  return out;
}

export function parseCron(text: string): CronParse {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, message: "Type a cron expression, like 0 9 * * 1-5.", field: null };
  const macro = MACROS[trimmed.toLowerCase()];
  const tokens = (macro ?? trimmed).split(/\s+/);
  if (trimmed.startsWith("@") && !macro) return { ok: false, message: `${trimmed} isn’t a shortcut cron knows. Try @daily, @weekly or @hourly.`, field: 0 };
  if (tokens.length !== 5)
    return {
      ok: false,
      message: tokens.length < 5 ? `Cron has five parts: minute, hour, day, month, weekday. This has ${tokens.length}.` : `Cron has five parts; this has ${tokens.length}. Seconds and years aren’t supported.`,
      field: tokens.length > 5 ? 5 : null,
    };
  const fields: Field[] = [];
  for (let i = 0; i < 5; i++) {
    const r = field(tokens[i], i);
    if (typeof r === "string") return { ok: false, message: r, field: i };
    fields.push(r);
  }
  const sorted = (f: Field) => [...f.values].sort((a, b) => a - b);
  return {
    ok: true,
    schedule: {
      expression: tokens.join(" "),
      minutes: sorted(fields[0]),
      hours: sorted(fields[1]),
      days: sorted(fields[2]),
      months: sorted(fields[3]),
      weekdays: sorted(fields[4]),
      lastDay: Boolean(fields[2].last),
      nthWeekdays: fields[4].nth ?? [],
      dayStar: fields[2].star,
      weekdayStar: fields[4].star,
    },
  };
}

/* ── Plain words ──────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");
const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
};
const list = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
/** [a..b] if the values run without a gap. */
const run = (v: number[]) => (v.length > 1 && v.every((n, i) => i === 0 || n === v[i - 1] + 1) ? [v[0], v[v.length - 1]] : null);
/** k if the values are min, min+k, min+2k… to the end of the range. */
const stepOf = (v: number[], min: number, max: number) => {
  if (v.length < 2 || v[0] !== min) return null;
  const k = v[1] - v[0];
  if (k < 2 || !v.every((n, i) => n === min + i * k)) return null;
  return v[v.length - 1] + k > max ? k : null;
};

export function describeCron(s: CronSchedule, { hour12 = false }: { hour12?: boolean } = {}): string {
  const time = (h: number, m: number) => (hour12 ? `${h % 12 || 12}:${pad(m)}${h < 12 ? "am" : "pm"}` : `${pad(h)}:${pad(m)}`);
  const M = s.minutes;
  const H = s.hours;
  const allM = M.length === 60;
  const allH = H.length === 24;
  const mStep = stepOf(M, 0, 59);
  const hStep = stepOf(H, 0, 23);
  const hRun = run(H);

  let when: string;
  if (allM && allH) when = "Every minute";
  else if (allM && hRun) when = `Every minute from ${time(hRun[0], 0)} to ${time(hRun[1], 59)}`;
  else if (mStep && allH) when = `Every ${mStep} minutes`;
  else if (mStep && hRun) when = `Every ${mStep} minutes from ${time(hRun[0], 0)} to ${time(hRun[1], M[M.length - 1])}`;
  else if (M.length === 1 && allH) when = M[0] === 0 ? "Every hour" : `Every hour at :${pad(M[0])}`;
  else if (M.length === 1 && hStep) when = `Every ${hStep} hours${M[0] ? ` at :${pad(M[0])}` : ""}`;
  else if (M.length === 1 && hRun && H.length >= 4) when = `Every hour from ${time(hRun[0], M[0])} to ${time(hRun[1], M[0])}`;
  else if (M.length * H.length <= 6 && !allH && !allM) when = `At ${list(H.flatMap((h) => M.map((m) => time(h, m))))}`;
  else if (M.length <= 4 && allH) when = `At ${list(M.map((m) => `:${pad(m)}`))} past every hour`;
  else {
    const part = (v: number[], min: number, max: number) => {
      const k = stepOf(v, min, max);
      const r = run(v);
      return k ? `every ${k}` : r ? `${r[0]} to ${r[1]}` : list(v.map(String));
    };
    when = `At minute ${allM ? "every" : part(M, 0, 59)} past ${allH ? "every hour" : `hour ${part(H, 0, 23)}`}`;
  }

  // Which days.
  const wd = s.weekdays;
  const weekdayWords = () => {
    const nth = s.nthWeekdays.map((n) => `the ${n.nth === -1 ? "last" : NTH[n.nth]} ${DAY_NAMES[n.weekday]} of the month`);
    let plain = "";
    if (wd.length && wd.length < 7) {
      const r = run(wd);
      if (wd.length === 5 && wd[0] === 1 && wd[4] === 5) plain = "Monday to Friday";
      else if (wd.length === 2 && wd[0] === 0 && wd[1] === 6) plain = "on weekends";
      else if (r && r[1] - r[0] >= 2) plain = `${DAY_NAMES[r[0]]} to ${DAY_NAMES[r[1]]}`;
      else plain = wd.length === 1 ? `every ${DAY_NAMES[wd[0]]}` : `on ${list(wd.map((d) => `${DAY_NAMES[d]}s`))}`;
    }
    const nthText = nth.length ? `on ${list(nth)}` : "";
    return [plain, nthText].filter(Boolean).join(" and ");
  };
  const dayWords = () => {
    const days = s.days.length === 31 ? [] : s.days;
    const k = stepOf(s.days, 1, 31);
    const parts: string[] = [];
    if (k) parts.push(`every ${k} days of the month`);
    else if (days.length) {
      const r = run(days);
      parts.push(r && r[1] - r[0] >= 2 ? `on days ${r[0]} to ${r[1]} of the month` : `on the ${list(days.map(ordinal))} of the month`);
    }
    if (s.lastDay) parts.push("on the last day of the month");
    return parts.join(" and ");
  };
  const restrictedDay = s.lastDay || s.days.length < 31;
  const restrictedWeekday = s.nthWeekdays.length > 0 || wd.length < 7;
  let days = "";
  // Both set: Unix cron runs on either (unless one starts with *, when both must match).
  if (restrictedDay && restrictedWeekday) days = !s.dayStar && !s.weekdayStar ? `${dayWords()}, and ${weekdayWords()}` : `${dayWords()}, ${weekdayWords()}`;
  else if (restrictedWeekday) days = weekdayWords();
  else if (restrictedDay) days = dayWords();

  // Which months; one day in one month reads as a date.
  const mo = s.months;
  let months = "";
  if (mo.length < 12) {
    const r = run(mo);
    if (mo.length === 1 && s.days.length === 1 && !restrictedWeekday && !s.lastDay) {
      days = `on ${s.days[0]} ${MONTH_NAMES[mo[0] - 1]}`;
    } else months = r && r[1] - r[0] >= 2 ? `in ${MONTH_NAMES[r[0] - 1]} to ${MONTH_NAMES[r[1] - 1]}` : `in ${list(mo.map((m) => MONTH_NAMES[m - 1]))}`;
  }

  if (!days && !months) return when.startsWith("At ") && !when.includes("past") ? `Every day at ${when.slice(3)}` : when;
  const joiner = (phrase: string) => (phrase.startsWith("on ") || phrase.startsWith("in ") || phrase.startsWith("every ") ? " " : ", ");
  let out = when;
  if (days) out += joiner(days) + days;
  if (months) out += (days ? ", " : joiner(months)) + months;
  return out;
}

/* ── Next runs ────────────────────────────────────────── */

export interface CronRun {
  at: Date;
  /** The wall-clock time it was asked for, in the time zone. */
  wall: { year: number; month: number; day: number; hour: number; minute: number; weekday: number };
  /** Clocks go forward over this time: it doesn't exist that day. */
  skipped?: boolean;
  /** Clocks go back over this time: it happens twice (this is the first). */
  repeated?: boolean;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function wallAt(epoch: number, timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    formatters.set(timeZone, f);
  }
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(new Date(epoch))) if (part.type !== "literal") p[part.type] = Number(part.value);
  return { year: p.year, month: p.month, day: p.day, hour: p.hour % 24, minute: p.minute, second: p.second };
}
/** Minutes the zone is ahead of UTC at an instant. */
function offsetAt(epoch: number, timeZone: string) {
  const w = wallAt(epoch, timeZone);
  return Math.round((Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(epoch / 1000) * 1000) / 60000);
}

/** The instant a wall-clock time happens in a zone, and whether a clock change skips or repeats it. */
export function zonedTime(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const before = offsetAt(guess - 6 * 3600_000, timeZone);
  const after = offsetAt(guess + 6 * 3600_000, timeZone);
  const fits = (t: number) => {
    const w = wallAt(t, timeZone);
    return w.year === year && w.month === month && w.day === day && w.hour === hour && w.minute === minute;
  };
  if (before === after) return { at: guess - before * 60000, skipped: false, repeated: false };
  const a = guess - before * 60000;
  const b = guess - after * 60000;
  const fa = fits(a);
  const fb = fits(b);
  if (fa && fb && a !== b) return { at: Math.min(a, b), skipped: false, repeated: true };
  if (fa || fb) return { at: fa ? a : b, skipped: false, repeated: false };
  // In the gap: it would land an hour (the jump) later on the clock.
  return { at: a, skipped: true, repeated: false };
}

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The next `count` times the schedule fires after `from`, in `timeZone` (UTC by default). Looks up to six years ahead. */
export function nextRuns(s: CronSchedule, { from = new Date(), count = 5, timeZone = "UTC" }: { from?: Date; count?: number; timeZone?: string } = {}): CronRun[] {
  const out: CronRun[] = [];
  const start = wallAt(from.getTime() + 60_000, timeZone);
  const months = new Set(s.months);
  const days = new Set(s.days);
  const weekdays = new Set(s.weekdays);
  const first = Date.UTC(start.year, start.month - 1, start.day);
  for (let i = 0; i < 366 * 6 && out.length < count; i++) {
    const date = new Date(first + i * 86_400_000);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const wd = date.getUTCDay();
    if (!months.has(m)) continue;
    const dim = daysIn(y, m);
    const dayHit = days.has(d) || (s.lastDay && d === dim);
    const weekdayHit = weekdays.has(wd) || s.nthWeekdays.some((n) => n.weekday === wd && (n.nth === -1 ? d + 7 > dim : Math.ceil(d / 7) === n.nth));
    // Unix cron: if either field starts with *, both must match; if both are set, either one is enough.
    if (s.dayStar || s.weekdayStar ? !(dayHit && weekdayHit) : !(dayHit || weekdayHit)) continue;
    for (const h of s.hours) {
      if (i === 0 && h < start.hour) continue;
      for (const min of s.minutes) {
        if (i === 0 && h === start.hour && min < start.minute) continue;
        const z = zonedTime(y, m, d, h, min, timeZone);
        if (z.at <= from.getTime()) continue;
        out.push({ at: new Date(z.at), wall: { year: y, month: m, day: d, hour: h, minute: min, weekday: wd }, skipped: z.skipped || undefined, repeated: z.repeated || undefined });
        if (out.length === count) return out;
      }
    }
  }
  return out;
}

/* ── Plain English in ─────────────────────────────────── */

const DAY_WORDS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};
const MONTH_WORDS: Record<string, number> = Object.fromEntries(
  MONTH_NAMES.flatMap((name, i) => [
    [name.toLowerCase(), i + 1],
    [name.slice(0, 3).toLowerCase(), i + 1],
  ]).concat([["sept", 9]]),
);
const NTH_WORDS: Record<string, number> = { first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, last: -1 };
const DAY_RE = `(?:${Object.keys(DAY_WORDS).sort((a, b) => b.length - a.length).join("|")})`;
const MONTH_RE = `(?:${Object.keys(MONTH_WORDS).sort((a, b) => b.length - a.length).join("|")})`;
const TIME_ANY = String.raw`(?:noon|midday|midnight|\d{1,2}(?:[:.h]\d{2})?\s?(?:am|pm)?)`;
const TIME_STRICT = String.raw`(?:noon|midday|midnight|\d{1,2}[:.h]\d{2}\s?(?:am|pm)?|\d{1,2}\s?(?:am|pm))`;
const FILLER = new Set(["at", "on", "the", "of", "and", "every", "each", "in", "run", "runs", "it", "please", "a", "month", "day", "days"]);

function readTime(raw: string): { h: number; m: number } | null {
  const t = raw.trim();
  if (t === "noon" || t === "midday") return { h: 12, m: 0 };
  if (t === "midnight") return { h: 0, m: 0 };
  const m = t.match(/^(\d{1,2})(?:[:.h](\d{2}))?\s?(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (m[3] === "pm" ? 12 : 0);
  }
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

/** Turns a schedule written in English into cron, or null if it can't be read. */
export function parseSchedule(text: string): string | null {
  let s = ` ${text.toLowerCase().replace(/[,;]/g, " ").replace(/\b(through|thru|until|till)\b/g, "to").replace(/\s+/g, " ").trim()} `;
  const take = (re: RegExp) => {
    const m = s.match(re);
    if (m) s = s.replace(m[0], " ");
    return m;
  };
  let minute: string | null = null;
  let hour: string | null = null;
  let dom = "*";
  let mon = "*";
  let dow = "*";
  let m: RegExpMatchArray | null;

  if ((m = take(/ every (\d+ )?(?:minutes?|mins?) /))) {
    const n = m[1] ? Number(m[1]) : 1;
    if (n < 1 || n > 59) return null;
    minute = n === 1 ? "*" : `*/${n}`;
    hour = "*";
  } else if ((m = take(/ every (\d+ )?(?:hours?|hrs?) /)) || (m = take(/ hourly /))) {
    const n = m[1] ? Number(m[1]) : 1;
    if (n < 1 || n > 23) return null;
    minute = "0";
    hour = n === 1 ? "*" : `*/${n}`;
    const past = take(/ at :?(\d{1,2})(?: minutes)?(?: past)? /);
    if (past) {
      if (Number(past[1]) > 59) return null;
      minute = String(Number(past[1]));
    }
  }

  // A window for steps: "from 9am to 5pm", "between 9 and 17".
  if ((m = take(new RegExp(` (?:from|between) (${TIME_ANY}) (?:to|and|-) (${TIME_ANY}) `)))) {
    const a = readTime(m[1]);
    const b = readTime(m[2]);
    if (!a || !b || minute === null || hour !== "*") return null;
    // "to 5pm" means stop before 5pm.
    const last = b.m === 0 ? b.h - 1 : b.h;
    if (last < a.h) return null;
    hour = last === a.h ? String(a.h) : `${a.h}-${last}`;
  }

  // Days of the week.
  if ((m = take(new RegExp(` (?:on )?(?:the )?(first|1st|second|2nd|third|3rd|fourth|4th|last) (${DAY_RE}) (?:of )?(?:the |every |each )?(?:month )?`)))) {
    const n = NTH_WORDS[m[1]];
    const d = DAY_WORDS[m[2]];
    dow = n === -1 ? `${d}L` : `${d}#${n}`;
  } else if ((m = take(/ (?:every |on )?(?:weekdays?|workdays?|business days?) /))) dow = "1-5";
  else if ((m = take(/ (?:every |on )?(?:the )?weekends? /))) dow = "0,6";
  else if ((m = take(new RegExp(` (?:every |on )?(${DAY_RE})s? (?:to|-) (${DAY_RE})s? `)))) {
    const a = DAY_WORDS[m[1]];
    const b = DAY_WORDS[m[2]];
    dow = a < b ? `${a}-${b}` : `${a}-${b === 0 ? 7 : b}`;
  } else if ((m = take(new RegExp(` (?:every |on |each )?((?:${DAY_RE})s?(?:(?: and | & | |/)(?:${DAY_RE})s?)*) `)))) {
    const found = m[1].split(/ and | & | |\//).map((w) => DAY_WORDS[w.replace(/s$/, "")] ?? DAY_WORDS[w]);
    if (found.some((d) => d === undefined)) return null;
    dow = [...new Set(found)].sort((a, b) => a - b).join(",");
  }

  // Days of the month.
  if ((m = take(/ (?:on )?(?:the )?last day (?:of )?(?:the |every |each )?(?:month )?/))) dom = "L";
  else if ((m = take(new RegExp(` (?:on )?(?:the )?(${MONTH_RE}) (\\d{1,2})(?:st|nd|rd|th)? `))) || (m = take(new RegExp(` (?:on )?(?:the )?(\\d{1,2})(?:st|nd|rd|th)? (?:of )?(${MONTH_RE}) `)))) {
    const monthFirst = isNaN(Number(m[1]));
    const mo = MONTH_WORDS[monthFirst ? m[1] : m[2]];
    const day = Number(monthFirst ? m[2] : m[1]);
    if (day < 1 || day > daysIn(2024, mo)) return null;
    mon = String(mo);
    dom = String(day);
  } else if ((m = take(/ (?:on )?(?:the )?((?:\d{1,2}(?:st|nd|rd|th))(?:(?: and | & | )(?:the )?\d{1,2}(?:st|nd|rd|th))*) (?:of )?(?:the |every |each )?(?:month )?/))) {
    const nums = m[1].match(/\d{1,2}/g)!.map(Number);
    if (nums.some((n) => n < 1 || n > 31)) return null;
    dom = [...new Set(nums)].sort((a, b) => a - b).join(",");
  } else if (take(/ (?:monthly|every month|each month|once a month) /)) dom = "1";

  // Months.
  if ((m = take(new RegExp(` (?:in |every |each |during )?((?:${MONTH_RE})(?:(?: and | & | |-| to )(?:${MONTH_RE}))*) `)))) {
    const range = m[1].match(new RegExp(`^(${MONTH_RE})(?:-| to )(${MONTH_RE})$`));
    if (range) mon = `${MONTH_WORDS[range[1]]}-${MONTH_WORDS[range[2]]}`;
    else mon = [...new Set(m[1].split(/ and | & | /).map((w) => MONTH_WORDS[w]))].sort((a, b) => a - b).join(",");
    if (mon.includes("undefined")) return null;
  }
  if (take(/ (?:yearly|annually|every year|each year|once a year) /)) {
    if (dom === "*") dom = "1";
    if (mon === "*") mon = "1";
  }
  if (take(/ (?:weekly|every week|each week|once a week) /) && dow === "*") dow = "1";
  take(/ (?:daily|every ?day|each day|nightly|every night|every morning) /);

  // Times of day.
  if (minute === null) {
    const times = take(new RegExp(` at (${TIME_ANY}(?:(?: and | & | )${TIME_ANY})*) `)) ?? take(new RegExp(` (${TIME_STRICT}(?:(?: and | & | )${TIME_STRICT})*) `));
    if (times) {
      const parsed = times[1].split(/ and | & | (?=\d|noon|mid)/).map(readTime);
      if (parsed.some((t) => !t)) return null;
      const ts = parsed as { h: number; m: number }[];
      const mins = [...new Set(ts.map((t) => t.m))];
      const hours = [...new Set(ts.map((t) => t.h))].sort((a, b) => a - b);
      // Cron can't say "9:30 and 17:00": every time must share its minute.
      if (mins.length > 1) return null;
      minute = String(mins[0]);
      hour = hours.join(",");
    } else {
      minute = "0";
      hour = "0";
    }
  }

  const left = s.trim().split(" ").filter((w) => w && !FILLER.has(w));
  if (left.length) return null;
  return `${minute} ${hour} ${dom} ${mon} ${dow}`;
}
