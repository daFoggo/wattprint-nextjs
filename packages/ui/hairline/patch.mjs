// Local fixes to vendored Hairline UI files, re-applied by `pnpm --filter @workspace/ui hairline` after every upstream install.
// Each patch is an exact string swap. Already applied: skipped. Neither string found: upstream changed the code, so the script
// fails; re-check the bug on the new code (upstream may have fixed it) and update or delete the patch.
import { readFileSync, writeFileSync } from "node:fs"
import process from "node:process"

const DIR = new URL("../src/components/hairline/", import.meta.url)

// Built-in English goes through useHairlineText(); the strings and their Vietnamese live in src/lib/hairline-messages.ts.
const TEXT = "Built-in English shown to users: translated via useHairlineText (the app is Vietnamese first)."
const text = (file, from, to) => ({ file, why: TEXT, from, to })
const imports = (file) =>
  text(file, 'import * as React from "react";\n', 'import * as React from "react";\nimport { useHairlineText } from "../hairline-text"; // patched (hairline/patch.mjs)\n')
/** Declares `t` right after `line`, the first lines of a component's body. */
const hook = (file, line) => text(file, line, `${line}  const t = useHairlineText(); // patched (hairline/patch.mjs)\n`)

export const PATCHES = [
  {
    file: "toast-stack.tsx",
    why: "getServerSnapshot returned a new [] on every call: React warns on every page (Toaster sits in the root layout).",
    from: "const getNone = () => [] as ToastData[];",
    to: "const NONE: ToastData[] = [];\nconst getNone = () => NONE;",
  },
  {
    file: "dropdown-menu.tsx",
    why: "The menu portals to <body>, which a modal <dialog> (Sheet, Dialog) makes inert and covers: the account menu in the mobile sidebar Sheet could not be clicked (no sign out on phones).",
    from: "          document.body,\n        )}",
    to: "          // patched (hairline/patch.mjs): inside a modal <dialog> the rest of the page is inert, so open in it.\n          anchor.current?.closest(\"dialog\") ?? document.body,\n        )}",
  },
  {
    file: "popover.tsx",
    why: "Same as dropdown-menu: portalled to <body>, the panel opened behind a modal <dialog> (the account popover in the mobile sidebar Sheet).",
    from: "          document.body,\n        )}",
    to: "          // patched (hairline/patch.mjs): inside a modal <dialog> the rest of the page is inert, so open in it.\n          anchor.current?.closest(\"dialog\") ?? document.body,\n        )}",
  },
  {
    file: "floating.ts",
    why: "Escape closed the menu and also the Sheet/Dialog around it (the native <dialog> closes on an Escape keydown that is not cancelled).",
    from: "      if (e.key !== \"Escape\") return;\n      e.stopPropagation();",
    to: "      if (e.key !== \"Escape\") return;\n      e.preventDefault(); // patched (hairline/patch.mjs): keep the surrounding <dialog> open\n      e.stopPropagation();",
  },
  {
    file: "trend-chart.tsx",
    why: "The screen-reader table is sr-only, but a <table> ignores `height: 1px`: one row per bucket stretched the page by a screen of empty scroll (dashboard Overview). A div wrapper keeps it 1px.",
    from: '        <table className="sr-only">\n          <caption>{label}</caption>',
    to: '        // patched (hairline/patch.mjs): a <table> ignores the 1px height of sr-only, so a div carries it.\n        <div className="sr-only"><table>\n          <caption>{label}</caption>',
  },
  {
    file: "trend-chart.tsx",
    why: "Closes the wrapper of the trend-chart patch above.",
    from: "        </table>\n      )}",
    to: "        </table></div> // patched (hairline/patch.mjs): closes the wrapper above\n      )}",
  },
  {
    file: "combo-chart.tsx",
    why: "Same as trend-chart: its sr-only <table> (one row per day) ignores the 1px height and stretched the page (dashboard Overview).",
    from: '        <table className="sr-only">\n          <caption>\n            {title}: {fmt(total)} over {n} days',
    to: '        {/* patched (hairline/patch.mjs): a <table> ignores the 1px height of sr-only, so a div carries it. */}\n        <div className="sr-only"><table>\n          <caption>\n            {t("{title}: {total} over {n} days", { title, total: fmt(total), n })}',
  },
  {
    file: "combo-chart.tsx",
    why: "Closes the wrapper of the combo-chart patch above.",
    from: "          </tbody>\n        </table>\n      </div>",
    to: "          </tbody>\n        </table></div>{/* patched (hairline/patch.mjs): closes the wrapper above */}\n      </div>",
  },
  {
    file: "compare-bars.tsx",
    why: "No header slot or unit: the Overview needs a Week/Month switch beside the title (as DonutChart's `action`) and kWh after each figure (Intl has no energy units).",
    from: "  onComparedChange?: (compared: boolean) => void;\n  format?: Intl.NumberFormatOptions;",
    to: "  onComparedChange?: (compared: boolean) => void;\n  /** Beside the title, e.g. a period switch (patched (hairline/patch.mjs)). */\n  action?: React.ReactNode;\n  /** After every figure, e.g. \"kWh\" (patched in by hairline/patch.mjs: Intl has no energy units). */\n  unit?: string;\n  format?: Intl.NumberFormatOptions;",
  },
  {
    file: "compare-bars.tsx",
    why: "Takes the `action` prop of the patch above.",
    from: "  onComparedChange,\n  format,\n  locales,\n  className = \"\",",
    to: "  onComparedChange,\n  action, // patched (hairline/patch.mjs)\n  unit, // patched (hairline/patch.mjs)\n  format,\n  locales,\n  className = \"\",",
  },
  {
    file: "compare-bars.tsx",
    why: "Renders the `action` prop of the patch above next to the title.",
    from: '          <p className="text-[12px] text-muted-foreground @md:text-[13px]">{title}</p>\n          <button',
    to: '          <div className="flex min-w-0 items-center gap-3">\n            {/* patched (hairline/patch.mjs): the title shares its row with the action */}\n            <p className="text-[12px] text-muted-foreground @md:text-[13px]">{title}</p>\n            {action}\n          </div>\n          <button',
  },
  {
    file: "compare-bars.tsx",
    why: "Readouts and the hidden table carry the unit.",
    from: "  const fmt = (v: number) => new Intl.NumberFormat(locale, format).format(v);",
    to: "  const fmt = (v: number) => new Intl.NumberFormat(locale, format).format(v) + (unit ? ` ${unit}` : \"\"); // patched (hairline/patch.mjs): the unit",
  },
  {
    file: "compare-bars.tsx",
    why: "The total carries the unit.",
    from: "<NumberRoll value={visible ? total : 0} format={format} locales={locale} duration={1000} />\n",
    to: "<NumberRoll value={visible ? total : 0} format={format} locales={locale} duration={1000} />\n            {/* patched (hairline/patch.mjs): the unit after the figure */}\n            {unit && <span className=\"ml-1 text-[13px] font-normal tracking-normal text-muted-foreground\">{unit}</span>}\n",
  },
  {
    file: "compare-bars.tsx",
    why: "Switching periods (Week/Month on the Overview) jumped every bar: slots and fills now ease to their new place and height.",
    from: "style={{ left: `${i * slotPct}%`, width: `${slotPct}%`, opacity: dim ? 0.55 : 1, transition: reduced ? \"none\" : `opacity 200ms ${EASE}` }}",
    to: "style={{ left: `${i * slotPct}%`, width: `${slotPct}%`, opacity: dim ? 0.55 : 1, transition: /* patched (hairline/patch.mjs) */ reduced ? \"none\" : `opacity 200ms ${EASE}, left 560ms ${EASE}, width 560ms ${EASE}` }}",
  },
  {
    file: "compare-bars.tsx",
    why: "Switching periods (Week/Month on the Overview) jumped every bar: slots and fills now ease to their new place and height.",
    from: "style={{ height: Math.max(2, hp) }} />",
    to: "style={{ height: Math.max(2, hp), transition: /* patched (hairline/patch.mjs) */ reduced ? \"none\" : `height 560ms ${EASE}` }} />",
  },
  {
    file: "compare-bars.tsx",
    why: "Switching periods (Week/Month on the Overview) jumped every bar: slots and fills now ease to their new place and height.",
    from: "style={{ height: Math.max(2, hc), background: \"var(--chart-1, var(--primary))\" }}",
    to: "style={{ height: Math.max(2, hc), background: \"var(--chart-1, var(--primary))\", transition: /* patched (hairline/patch.mjs) */ reduced ? \"none\" : `height 560ms ${EASE}` }}",
  },
  {
    file: "combo-chart.tsx",
    why: "Intl has no kWh or W unit: the Overview puts the unit right after each figure, not in the title.",
    from: "  series?: [string, string];\n",
    to: "  series?: [string, string];\n  /** After every figure, e.g. \"kWh\" (patched (hairline/patch.mjs): Intl has no energy units). */\n  unit?: string;\n",
  },
  {
    file: "combo-chart.tsx",
    why: "Takes the `unit` prop above.",
    from: "  series = [\"Orders\", \"7-day average\"],\n  format,",
    to: "  series = [\"Orders\", \"7-day average\"],\n  unit, // patched (hairline/patch.mjs)\n  format,",
  },
  {
    file: "combo-chart.tsx",
    why: "Readouts and the hidden table carry the unit.",
    from: "  const fmt = (v: number) => new Intl.NumberFormat(locales, { maximumFractionDigits: 0, ...format }).format(v);",
    to: "  const fmt = (v: number) => new Intl.NumberFormat(locales, { maximumFractionDigits: 0, ...format }).format(v) + (unit ? ` ${unit}` : \"\"); // patched (hairline/patch.mjs): the unit",
  },
  {
    file: "combo-chart.tsx",
    why: "The total carries the unit.",
    from: "                  duration={active !== null ? 600 : 1000}\n                />\n",
    to: "                  duration={active !== null ? 600 : 1000}\n                />\n                {/* patched (hairline/patch.mjs): the unit after the figure */}\n                {unit && <span className=\"ml-1 text-[13px] font-normal tracking-normal text-muted-foreground\">{unit}</span>}\n",
  },
  {
    file: "combo-chart.tsx",
    why: "The average line carries the unit.",
    from: "<NumberRoll value={visible ? (active !== null ? average[active] : daily) : 0} format={whole} locales={locales} duration={700} />",
    to: "<NumberRoll value={visible ? (active !== null ? average[active] : daily) : 0} format={whole} locales={locales} duration={700} suffix={/* patched (hairline/patch.mjs) */ unit ? ` ${unit}` : \"\"} />",
  },
  {
    file: "combo-chart.tsx",
    why: "The tiles carry the unit.",
    from: "<NumberRoll value={visible ? t.value : 0} format={whole} locales={locales} duration={800} />",
    to: "<NumberRoll value={visible ? t.value : 0} format={whole} locales={locales} duration={800} suffix={/* patched (hairline/patch.mjs) */ unit ? ` ${unit}` : \"\"} />",
  },
  {
    file: "donut-chart.tsx",
    why: "Intl has no kWh or W unit: the Overview puts the unit right after each figure, not in the title.",
    from: "  centerLabel?: string;\n",
    to: "  centerLabel?: string;\n  /** After every figure, e.g. \"kWh\" (patched (hairline/patch.mjs): Intl has no energy units). */\n  unit?: string;\n",
  },
  {
    file: "donut-chart.tsx",
    why: "Takes the `unit` prop above.",
    from: "  centerLabel = \"Total\",\n  format,",
    to: "  centerLabel = \"Total\",\n  unit, // patched (hairline/patch.mjs)\n  format,",
  },
  {
    file: "donut-chart.tsx",
    why: "Legend labels carry the unit.",
    from: "format).format(n);",
    to: "format).format(n) + (unit ? ` ${unit}` : \"\"); // patched (hairline/patch.mjs): the unit",
  },
  {
    file: "donut-chart.tsx",
    why: "The centre figure carries the unit.",
    from: "<NumberRoll value={visible ? (current ? current.amount : total) : 0} format={format} locales={locales} duration={900} />",
    to: "<NumberRoll value={visible ? (current ? current.amount : total) : 0} format={format} locales={locales} duration={900} />\n                {/* patched (hairline/patch.mjs): the unit after the figure */}\n                {unit && <span className=\"ml-1 text-[13px] font-normal tracking-normal text-muted-foreground\">{unit}</span>}",
  },
  {
    file: "donut-chart.tsx",
    why: "Legend rows carry the unit.",
    from: "<NumberRoll value={visible ? a.amount : 0} format={format} locales={locales} duration={900} />",
    to: "<NumberRoll value={visible ? a.amount : 0} format={format} locales={locales} duration={900} suffix={/* patched (hairline/patch.mjs) */ unit ? ` ${unit}` : \"\"} />",
  },
  {
    file: "compare-bars.tsx",
    why: "With the action beside the title the header overflowed at narrow widths (Overview at 1100px): the compare chip wraps to its own line instead.",
    from: "<div className=\"flex items-center justify-between gap-3\">\n          <div className=\"flex min-w-0 items-center gap-3\">",
    to: "<div className={/* patched (hairline/patch.mjs): wraps when narrow */ \"flex flex-wrap items-center justify-between gap-x-3 gap-y-2\"}>\n          <div className=\"flex min-w-0 items-center gap-3\">",
  },
  {
    file: "token-bucket.tsx",
    why: "A rate limit packs what is left on the right; a tariff tier reads the other way: the kWh used fill the tube from the left and the figure is what is left (the Overview's bill). A `fillUsed` prop does both.",
    from: "  color?: string;\n  locales?: string | string[];\n}",
    to: "  color?: string;\n  locales?: string | string[];\n  /** Tokens are what is used (pass it as `remaining`), packed from the left; the figure counts what is left (patched (hairline/patch.mjs)). */\n  fillUsed?: boolean;\n}",
  },
  {
    file: "token-bucket.tsx",
    why: "Takes the `fillUsed` prop of the patch above.",
    from: "  locales,\n  className = \"\",",
    to: "  locales,\n  fillUsed, // patched (hairline/patch.mjs)\n  className = \"\",",
  },
  {
    file: "token-bucket.tsx",
    why: "With `fillUsed`, what is left is the limit less the tokens; it drives the figure, the meter text and the amber state. Kept to one decimal: kWh are fractional, and flooring showed \"0 left\" with 0.2 kWh to go.",
    from: "  const low = shown <= limit * 0.1;",
    to: "  const left = fillUsed ? Math.round(Math.max(0, limit - remaining) * 10) / 10 : shown; // patched (hairline/patch.mjs)\n  const low = left <= limit * 0.1;",
  },
  {
    file: "token-bucket.tsx",
    why: "The figure is what is left (see above).",
    from: "<NumberRoll value={shown} locales={locale} duration={600} />",
    to: "<NumberRoll value={left /* patched (hairline/patch.mjs) */} locales={locale} duration={600} />",
  },
  {
    file: "token-bucket.tsx",
    why: "The meter text is what is left (see above), translated via useHairlineText.",
    from: "aria-valuetext={`${fmt(shown)} of ${fmt(limit)} ${unit} left${rate ? `, refills ${rate}` : \"\"}${waits ? `, ${fmt(waiting)} waiting` : \"\"}`}",
    to: "aria-valuetext={/* patched (hairline/patch.mjs) */ t(\"{left} of {limit} {unit} left\", { left: fmt(left), limit: fmt(limit), unit }) + (rate ? t(\", refills {rate}\", { rate }) : \"\") + (waits ? t(\", {n} waiting\", { n: fmt(waiting) }) : \"\")}",
  },
  {
    file: "token-bucket.tsx",
    why: "The engine carries `fillUsed` (see above) for the slot order below.",
    from: "  limit: number;\n  stack: HTMLSpanElement[];",
    to: "  limit: number;\n  fillUsed?: boolean; // patched (hairline/patch.mjs)\n  stack: HTMLSpanElement[];",
  },
  {
    file: "token-bucket.tsx",
    why: "With `fillUsed` the first token takes the leftmost slot, so the row fills from the left and new tokens slide in left to right, the way the tube is read (mirroring the tube made them slide right to left).",
    from: "  const x = (i: number) => left + (e.slots - 1 - i) * pitch + (pitch - tw) / 2;",
    to: "  const x = (i: number) => left + (e.fillUsed /* patched (hairline/patch.mjs) */ ? i : e.slots - 1 - i) * pitch + (pitch - tw) / 2;",
  },
  {
    file: "token-bucket.tsx",
    why: "Hands `fillUsed` to the engine when it is made, before its first layout.",
    from: "      engine.current = {\n        track: null,",
    to: "      engine.current = {\n        fillUsed, // patched (hairline/patch.mjs)\n        track: null,",
  },
  {
    file: "token-bucket.tsx",
    why: "The title row only takes small strings: the Overview's tier card needs the current and next price side by side, large, with an arrow between. A `header` node replaces the row; `title` still names the meter.",
    from: "  rateLabel?: string;",
    to: "  rateLabel?: string;\n  /** Replaces the title row (title, caption, rate) with your own node; `title` still names the meter (patched (hairline/patch.mjs)). */\n  header?: React.ReactNode;",
  },
  {
    file: "token-bucket.tsx",
    why: "Takes the `header` prop of the patch above.",
    from: "  rateLabel,\n  color = ",
    to: "  rateLabel,\n  header, // patched (hairline/patch.mjs)\n  color = ",
  },
  {
    file: "token-bucket.tsx",
    why: "Opens the swap of the title row for `header` (closed by the patch below).",
    from: "          <div className=\"flex items-start justify-between gap-3\">\n            <div className=\"min-w-0\">",
    to: "          {header ?? ( /* patched (hairline/patch.mjs): your own title row */\n          <div className=\"flex items-start justify-between gap-3\">\n            <div className=\"min-w-0\">",
  },
  {
    file: "token-bucket.tsx",
    why: "Closes the swap opened above.",
    from: "              </span>\n            </p>\n          </div>\n\n          <div\n            role=\"meter\"",
    to: "              </span>\n            </p>\n          </div>\n          )}{/* patched (hairline/patch.mjs) */}\n\n          <div\n            role=\"meter\"",
  },
  {
    file: "log-stream.tsx",
    why: "The clock read the local time on the server and in the browser: the server's timezone is UTC, so hydration mismatched the Activity tile. Both renders show UTC, then the visitor's timezone; the milliseconds come apart so narrow rows can drop them.",
    from: "const pad = (n: number, w = 2) => String(n).padStart(w, \"0\");\nconst clock = (d: DateLike) => {\n  const t = new Date(toTime(d));\n  return `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}.${pad(t.getMilliseconds(), 3)}`;\n};",
    to: "const pad = (n: number, w = 2) => String(n).padStart(w, \"0\");\nconst clock = (d: DateLike, local: boolean) => { // patched (hairline/patch.mjs): UTC until hydrated, then local\n  const t = new Date(toTime(d));\n  const [h, m, s] = local ? [t.getHours(), t.getMinutes(), t.getSeconds()] : [t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds()];\n  return [`${pad(h)}:${pad(m)}:${pad(s)}`, `.${pad(t.getMilliseconds(), 3)}`] as const;\n};\n// The server and the hydrating render both show UTC, then the visitor's timezone takes over.\nconst subscribeNothing = () => () => {};\nconst useHydrated = () => React.useSyncExternalStore(subscribeNothing, () => true, () => false);",
  },
  {
    file: "log-stream.tsx",
    why: "Each row picks its clock after hydration (see above).",
    from: "  const [copied, setCopied] = React.useState(false);\n  const has = Boolean(line.data && Object.keys(line.data).length);",
    to: "  const [copied, setCopied] = React.useState(false);\n  const hydrated = useHydrated();\n  const [time, ms] = clock(line.at, hydrated); // patched (hairline/patch.mjs)\n  const has = Boolean(line.data && Object.keys(line.data).length);",
  },
  {
    file: "token-bucket.tsx",
    why: "Nothing can sit under the tube: the Overview's tier card labels the tube's ends with the tier's bounds and the next price. A `footer` node renders below the tube.",
    from: "  header?: React.ReactNode;\n",
    to: "  header?: React.ReactNode;\n  /** Renders under the tube, e.g. labels for its ends (patched (hairline/patch.mjs)). */\n  footer?: React.ReactNode;\n",
  },
  {
    file: "token-bucket.tsx",
    why: "Takes the `footer` prop of the patch above.",
    from: "  refillPerSecond = 0,\n",
    to: "  refillPerSecond = 0,\n  footer, // patched (hairline/patch.mjs)\n",
  },
  {
    file: "token-bucket.tsx",
    why: "Renders `footer` under the tube (see above).",
    from: "            <div ref={layerRef} className=\"absolute inset-0\" />\n          </div>\n",
    to: "            <div ref={layerRef} className=\"absolute inset-0\" />\n          </div>\n          {footer}{/* patched (hairline/patch.mjs) */}\n",
  },
  {
    file: "token-bucket.tsx",
    why: "The queue past the gate only opens for waiting requests, and they are announced as waiting: the Overview's tier card uses that compartment for the next tier. `ahead` opens it with hollow slots that are not requests.",
    from: "  waiting?: number;\n",
    to: "  waiting?: number;\n  /** Hollow slots past the gate that are not waiting requests, e.g. what comes next (patched (hairline/patch.mjs)). */\n  ahead?: number;\n",
  },
  {
    file: "token-bucket.tsx",
    why: "Takes the `ahead` prop of the patch above.",
    from: "  waiting = 0,\n",
    to: "  waiting = 0,\n  ahead = 0, // patched (hairline/patch.mjs)\n",
  },
  {
    file: "token-bucket.tsx",
    why: "The queue holds the waiting requests and the `ahead` slots (see above); only `waiting` reaches the text.",
    from: "    e.serve += Math.max(0, ringsBefore - waiting);\n    e.ringsWanted = Math.max(0, waiting);",
    to: "    e.serve += Math.max(0, ringsBefore - waiting - ahead); // patched (hairline/patch.mjs)\n    e.ringsWanted = Math.max(0, waiting + ahead);",
  },
  {
    file: "token-bucket.tsx",
    why: "Re-lays the queue when `ahead` changes (see above).",
    from: "  }, [remaining, limit, refillPerSecond, waiting, reduced, run]);",
    to: "  }, [remaining, limit, refillPerSecond, waiting, ahead, reduced, run]); // patched (hairline/patch.mjs)",
  },
  {
    file: "log-stream.tsx",
    why: "Narrow rows hid the time altogether; they now show it without the milliseconds.",
    from: "      <span aria-hidden=\"true\" className={`absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full ${TICK[line.level]}`} />\n      <time dateTime={new Date(toTime(line.at)).toISOString()} className=\"hidden w-[6.6rem] shrink-0 text-muted-foreground tabular-nums @md:block\">\n        {clock(line.at)}\n      </time>",
    to: "      <span aria-hidden=\"true\" className={`absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full ${TICK[line.level]}`} />\n      {/* patched (hairline/patch.mjs): narrow rows show the time, without the milliseconds */}\n      <time dateTime={new Date(toTime(line.at)).toISOString()} className=\"w-[4.1rem] shrink-0 text-muted-foreground tabular-nums @md:w-[6.6rem]\">\n        {time}\n        <span className=\"hidden @md:inline\">{ms}</span>\n      </time>",
  },
  {
    file: "number-roll.tsx",
    why: "Each digit column is a 0-9 stack clipped only by clip-path, which hides it but still counts as scrollable overflow: a NumberRoll near the end of a page added a screen of empty scroll.",
    from: '<span className="relative inline-block [clip-path:inset(0)]">',
    to: '<span className={/* patched (hairline/patch.mjs): clip-path alone still counts as scroll overflow */ "relative inline-block overflow-clip [clip-path:inset(0)]"}>',
  },

  // Built-in English, translated (see TEXT above).
  imports("button.tsx"),
  hook("button.tsx", "  const innerRef = React.useRef<HTMLButtonElement | null>(null);\n  const reduced = useReducedMotion();\n"),
  text(
    "button.tsx",
    '  const idleLabel = typeof children === "string" ? children : DEFAULT_LABELS.idle;\n  const labels: Record<ActionStatus, string> = {\n    idle: statusLabels?.idle ?? idleLabel,\n    pending: statusLabels?.pending ?? DEFAULT_LABELS.pending,\n    success: statusLabels?.success ?? DEFAULT_LABELS.success,\n    error: statusLabels?.error ?? DEFAULT_LABELS.error,',
    '  const idleLabel = typeof children === "string" ? children : t(DEFAULT_LABELS.idle);\n  const labels: Record<ActionStatus, string> = {\n    idle: statusLabels?.idle ?? idleLabel,\n    pending: statusLabels?.pending ?? t(DEFAULT_LABELS.pending),\n    success: statusLabels?.success ?? t(DEFAULT_LABELS.success),\n    error: statusLabels?.error ?? t(DEFAULT_LABELS.error),'
  ),

  imports("skeleton.tsx"),
  // `t` is taken there (transition strings).
  text(
    "skeleton.tsx",
    'export function SkeletonSwap({ loading, fallback, children, label = "Loading", className = "" }: SkeletonSwapProps) {\n',
    'export function SkeletonSwap({ loading, fallback, children, label = "Loading", className = "" }: SkeletonSwapProps) {\n  const say = useHairlineText(); // patched (hairline/patch.mjs)\n'
  ),
  text("skeleton.tsx", '<span className="sr-only" role="status">\n          {label}', '<span className="sr-only" role="status">\n          {say(label)}'),

  imports("toast-stack.tsx"),
  hook("toast-stack.tsx", "}) {\n  const ref = React.useRef<HTMLLIElement>(null);\n"),
  text("toast-stack.tsx", 'aria-label="Dismiss"', 'aria-label={t("Dismiss")}'),
  hook("toast-stack.tsx", 'export function Toaster({ position = "bottom-right", visible = 3, hotkey = "t", gap = GAP, className = "", ...props }: ToasterProps) {\n'),
  text("toast-stack.tsx", 'aria-label="Notifications (Alt+T)"', 'aria-label={t("Notifications (Alt+T)")}'),

  imports("sheet.tsx"),
  hook("sheet.tsx", "}: SheetProps) {\n"),
  text("sheet.tsx", 'aria-label="Close"', 'aria-label={t("Close")}'),

  imports("dialog.tsx"),
  hook("dialog.tsx", "}: DialogProps) {\n"),
  text("dialog.tsx", 'aria-label="Close"', 'aria-label={t("Close")}'),

  imports("alert.tsx"),
  hook("alert.tsx", "}: AlertProps) {\n"),
  text("alert.tsx", 'aria-label="Dismiss"', 'aria-label={t("Dismiss")}'),

  imports("log-stream.tsx"),
  hook("log-stream.tsx", "const Row = React.memo(function Row({ line, open, query, enter, reduced, toggle }: RowProps) {\n"),
  text("log-stream.tsx", '<TextMorph>{copied ? "Copied" : "Copy"}</TextMorph>', '<TextMorph>{copied ? t("Copied") : t("Copy")}</TextMorph>'),
  hook("log-stream.tsx", 'title = "Logs", className = "", ...props }: LogStreamProps) {\n'),
  text(
    "log-stream.tsx",
    '      setAnnounce(waiting.length ? `Live. ${waiting.length} lines played in.` : "Live.");\n    } else setAnnounce("Paused. New lines are held.");',
    '      setAnnounce(waiting.length ? t("Live. {n} lines played in.", { n: waiting.length }) : t("Live."));\n    } else setAnnounce(t("Paused. New lines are held."));'
  ),
  text("log-stream.tsx", '<TextMorph>{paused ? "Paused" : "Live"}</TextMorph>', '<TextMorph>{paused ? t("Paused") : t("Live")}</TextMorph>'),
  text("log-stream.tsx", "<NumberRoll value={held || 1} />\n                &nbsp;waiting", '<NumberRoll value={held || 1} />\n                &nbsp;{t("waiting")}'),
  text("log-stream.tsx", '<span className="sr-only">Search {title}</span>', '<span className="sr-only">{t("Search {title}", { title })}</span>'),
  text("log-stream.tsx", 'placeholder="Search"', 'placeholder={t("Search")}'),
  text("log-stream.tsx", 'aria-label="Levels"', 'aria-label={t("Levels")}'),
  text("log-stream.tsx", "                {NAMES[lv]}\n", "                {t(NAMES[lv])}\n"),
  text("log-stream.tsx", "aria-label={`${title}, newest at the bottom`}", 'aria-label={t("{title}, newest at the bottom", { title })}'),
  text(
    "log-stream.tsx",
    '{noMore ? "Start of the log" : loading ? "Loading earlier lines" : "Scroll up for earlier lines"}',
    '{noMore ? t("Start of the log") : loading ? t("Loading earlier lines") : t("Scroll up for earlier lines")}'
  ),
  text(
    "log-stream.tsx",
    '{lines.length ? "No lines match." : paused ? "Paused." : "Waiting for the first line…"}',
    '{lines.length ? t("No lines match.") : paused ? t("Paused.") : t("Waiting for the first line…")}'
  ),
  text("log-stream.tsx", "<NumberRoll value={below || 1} />\n              &nbsp;new", '<NumberRoll value={below || 1} />\n              &nbsp;{t("new")}'),

  imports("donut-chart.tsx"),
  hook("donut-chart.tsx", "}: DonutChartProps) {\n"),
  text("donut-chart.tsx", '{total === 0 ? "No data" :', '{total === 0 ? t("No data") :'),
  text("donut-chart.tsx", 'aria-label="Slices"', 'aria-label={t("Slices")}'),
  text("donut-chart.tsx", ': ", hidden"}`}', ': t(", hidden")}`}'),

  imports("usage-meter.tsx"),
  hook("usage-meter.tsx", "}: UsageMeterProps) {\n"),
  text(
    "usage-meter.tsx",
    "  const summary = out ? `No ${unit} left` : `${number.format(left)} of ${number.format(limit)} ${unit} left`;",
    '  const summary = out ? t("No {unit} left", { unit }) : t("{left} of {limit} {unit} left", { left: number.format(left), limit: number.format(limit), unit });'
  ),
  text("usage-meter.tsx", 'title={`${summary}${resets ? ` · resets ${resets}` : ""}`}', 'title={resets ? t("{summary} · resets {date}", { summary, date: resets }) : summary}'),
  text("usage-meter.tsx", "&nbsp;of&nbsp;", '&nbsp;{t("of")}&nbsp;'),
  text("usage-meter.tsx", "<TextMorph>{out ? `No ${unit} left` : `${unit} left`}</TextMorph>", '<TextMorph>{out ? t("No {unit} left", { unit }) : t("{unit} left", { unit })}</TextMorph>'),
  text(
    "usage-meter.tsx",
    '<TextMorph>{out ? `You’re out until ${resets ?? "the next reset"}.` : resets ? `Resets ${resets}` : ""}</TextMorph>',
    '<TextMorph>{out ? t("You’re out until {date}.", { date: resets ?? t("the next reset") }) : resets ? t("Resets {date}", { date: resets }) : ""}</TextMorph>'
  ),

  imports("token-bucket.tsx"),
  hook("token-bucket.tsx", "}: TokenBucketProps) {\n"),
  text("token-bucket.tsx", "  const rate = rateLabel ?? rateText(refillPerSecond, fmt);", "  const rate = rateLabel ?? rateText(refillPerSecond, fmt, t);"),
  text(
    "token-bucket.tsx",
    "<NumberRoll value={Math.max(0, waiting)} locales={locale} duration={700} /> waiting",
    '<NumberRoll value={Math.max(0, waiting)} locales={locale} duration={700} /> {t("waiting")}'
  ),
  text("token-bucket.tsx", "<TextMorph>{`${unit} left`}</TextMorph>", '<TextMorph>{t("{unit} left", { unit })}</TextMorph>'),
  text(
    "token-bucket.tsx",
    "function rateText(perSecond: number, fmt: (v: number) => string) {\n  if (!(perSecond > 0)) return \"\";\n  const near = (v: number) => Math.abs(v - Math.round(v)) < 0.01;\n  if (perSecond >= 1 && near(perSecond)) return `+${fmt(Math.round(perSecond))} a second`;\n  if (near(perSecond * 60)) return `+${fmt(Math.round(perSecond * 60))} a minute`;\n  if (perSecond < 1 && near(1 / perSecond)) return `+1 every ${fmt(Math.round(1 / perSecond))}s`;\n  return `+${fmt(Math.round(perSecond * 3600))} an hour`;",
    "function rateText(perSecond: number, fmt: (v: number) => string, t: ReturnType<typeof useHairlineText>) {\n  if (!(perSecond > 0)) return \"\";\n  const near = (v: number) => Math.abs(v - Math.round(v)) < 0.01;\n  if (perSecond >= 1 && near(perSecond)) return t(\"+{n} a second\", { n: fmt(Math.round(perSecond)) });\n  if (near(perSecond * 60)) return t(\"+{n} a minute\", { n: fmt(Math.round(perSecond * 60)) });\n  if (perSecond < 1 && near(1 / perSecond)) return t(\"+1 every {n}s\", { n: fmt(Math.round(1 / perSecond)) });\n  return t(\"+{n} an hour\", { n: fmt(Math.round(perSecond * 3600)) });"
  ),

  imports("theme-toggle.tsx"),
  hook("theme-toggle.tsx", "}: ThemeToggleProps) {\n"),
  text("theme-toggle.tsx", '  const label = dark ? "Dark" : "Light";', '  const label = dark ? t("Dark") : t("Light");'),
  text("theme-toggle.tsx", 'aria-label="Theme"', 'aria-label={t("Theme")}'),
  text("theme-toggle.tsx", "aria-label={o.label}", "aria-label={t(o.label)}"),
  text(
    "theme-toggle.tsx",
    'aria-label={variant === "pill" ? `${label} theme, switch to ${dark ? "light" : "dark"}` : `Switch to ${dark ? "light" : "dark"} theme`}',
    'aria-label={variant === "pill" ? (dark ? t("Dark theme, switch to light") : t("Light theme, switch to dark")) : dark ? t("Switch to light theme") : t("Switch to dark theme")}'
  ),

  imports("sparkline.tsx"),
  hook("sparkline.tsx", "}: SparklineProps) {\n"),
  text(
    "sparkline.tsx",
    '        {label}: start {values[0] ?? 0}, end {values[values.length - 1] ?? 0}, {isPositive ? "upward trend" : "downward trend"}.',
    '        {t(isPositive ? "{label}: start {start}, end {end}, upward trend." : "{label}: start {start}, end {end}, downward trend.", { label, start: values[0] ?? 0, end: values[values.length - 1] ?? 0 })}'
  ),

  imports("password-input.tsx"),
  hook("password-input.tsx", "}: PasswordInputProps) {\n"),
  text("password-input.tsx", 'hint={caps ? "Caps Lock is on" : hint}', 'hint={caps ? t("Caps Lock is on") : hint}'),
  text("password-input.tsx", 'aria-label={shown ? "Hide password" : "Show password"}', 'aria-label={shown ? t("Hide password") : t("Show password")}'),
  text("password-input.tsx", '{score ? strengthLabels[score - 1] : " "}', '{score ? t(strengthLabels[score - 1]) : " "}'),

  imports("input.tsx"),
  hook("input.tsx", "}: InputProps) {\n"),
  text("input.tsx", 'aria-label="Clear"', 'aria-label={t("Clear")}'),

  imports("share-bar.tsx"),
  hook("share-bar.tsx", "}: ShareBarProps) {\n"),
  text("share-bar.tsx", '<TextMorph>{open ? "Collapse" : "Breakdown"}</TextMorph>', '<TextMorph>{open ? t("Collapse") : t("Breakdown")}</TextMorph>'),
  text("share-bar.tsx", '(caption ?? "Total")', '(caption ?? t("Total"))'),
  text("share-bar.tsx", "aria-label={`${title} by share`}", 'aria-label={t("{title} by share", { title })}'),

  imports("avatar.tsx"),
  hook("avatar.tsx", "}: AvatarProps) {\n"),
  text("avatar.tsx", "aria-label={status ? `${name}, ${status}` : name}", "aria-label={status ? `${name}, ${t(status)}` : name}"),
  hook("avatar.tsx", 'export function AvatarGroup({ people, max = 4, size = "sm", className = "" }: AvatarGroupProps) {\n'),
  text("avatar.tsx", "aria-label={`${people.length} people`}", 'aria-label={t("{n} people", { n: people.length })}'),
  text("avatar.tsx", "aria-label={`and ${rest} more`}", 'aria-label={t("and {n} more", { n: rest })}'),

  imports("compare-bars.tsx"),
  hook("compare-bars.tsx", "}: CompareBarsProps) {\n"),
  text(
    "compare-bars.tsx",
    "<TextMorph>{on ? `${currentLabel} against ${previousLabel.toLowerCase()}` : currentLabel}</TextMorph>",
    '<TextMorph>{on ? t("{current} against {previous}", { current: currentLabel, previous: previousLabel.toLowerCase() }) : currentLabel}</TextMorph>'
  ),
  text(
    "compare-bars.tsx",
    'aria-label={`${title}, ${currentLabel}${on ? ` against ${previousLabel}` : ""}. Use the arrow keys to read each bar.`}',
    'aria-label={t(on ? "{title}, {current} against {previous}. Use the arrow keys to read each bar." : "{title}, {current}. Use the arrow keys to read each bar.", { title, current: currentLabel, previous: previousLabel })}'
  ),
  text("compare-bars.tsx", '<th scope="col">Day</th>', '<th scope="col">{t("Day")}</th>'),

  imports("combo-chart.tsx"),
  hook("combo-chart.tsx", "}: ComboChartProps) {\n"),
  text("combo-chart.tsx", "<TextMorph>{active !== null ? `${title} on ${name(active)}` : title}</TextMorph>", '<TextMorph>{active !== null ? t("{title} on {day}", { title, day: name(active) }) : title}</TextMorph>'),
  text(
    "combo-chart.tsx",
    '<TextMorph>{active !== null ? `on the ${series[1].toLowerCase()}` : "a day on average"}</TextMorph>',
    '<TextMorph>{active !== null ? t("on the {line}", { line: series[1].toLowerCase() }) : t("a day on average")}</TextMorph>'
  ),
  text(
    "combo-chart.tsx",
    "aria-label={`${title}: ${series[0]} with the ${series[1].toLowerCase()}. Use the arrow keys to read each day.`}",
    'aria-label={t("{title}: {bars} with the {line}. Use the arrow keys to read each day.", { title, bars: series[0], line: series[1].toLowerCase() })}'
  ),
  text(
    "combo-chart.tsx",
    '            { label: "Best day", value: values[best] ?? 0, note: days[best]?.label },\n            { label: "Daily average", value: daily, note: `over ${n} days` },\n            { label: "Quietest day", value: values[quiet] ?? 0, note: days[quiet]?.label },',
    '            { label: t("Best day"), value: values[best] ?? 0, note: days[best]?.label },\n            { label: t("Daily average"), value: daily, note: t("over {n} days", { n }) },\n            { label: t("Quietest day"), value: values[quiet] ?? 0, note: days[quiet]?.label },'
  ),
  text("combo-chart.tsx", '<th scope="col">Day</th>', '<th scope="col">{t("Day")}</th>'),

  imports("data-table.tsx"),
  hook("data-table.tsx", "function TableRowView<T>(p: RowProps<T>) {\n"),
  text("data-table.tsx", "aria-label={`${col.header} for ${p.name}`}", 'aria-label={t("{column} for {row}", { column: col.header, row: p.name })}'),
  text("data-table.tsx", "aria-label={`Select ${p.name}`}\n", 'aria-label={t("Select {row}", { row: p.name })}\n'),
  text("data-table.tsx", "tabIndex={-1} aria-label={`Select ${p.name}`} aria-pressed", 'tabIndex={-1} aria-label={t("Select {row}", { row: p.name })} aria-pressed'),
  text("data-table.tsx", 'aria-label={`${p.isOpen ? "Close" : "Open"} ${p.name}`}', 'aria-label={p.isOpen ? t("Close {row}", { row: p.name }) : t("Open {row}", { row: p.name })}'),
  hook("data-table.tsx", "}: DataTableProps<T>) {\n"),
  text(
    "data-table.tsx",
    'say(`Sorted by ${col.header}, ${next.dir === "asc" ? "ascending" : "descending"}.`);',
    'say(t(next.dir === "asc" ? "Sorted by {column}, ascending." : "Sorted by {column}, descending.", { column: col.header }));'
  ),
  text("data-table.tsx", "      say(`${next.size} selected.`);", '      say(t("{n} selected.", { n: next.size }));'),
  text("data-table.tsx", 'say(`${next.size ? `${next.size} selected` : "Selection cleared"}.`);', 'say(next.size ? t("{n} selected.", { n: next.size }) : t("Selection cleared."));'),
  text("data-table.tsx", 'say(allState === "on" ? "Selection cleared." : `${allIds.length} selected.`);', 'say(allState === "on" ? t("Selection cleared.") : t("{n} selected.", { n: allIds.length }));'),
  text(
    "data-table.tsx",
    'say(`${ids.length} ${count(ids.length)} ${action.progress?.[1]?.toLowerCase() ?? "removed"}. Undo is available.`);',
    'say(t("{n} {noun} {done}. Undo is available.", { n: ids.length, noun: count(ids.length), done: action.progress?.[1]?.toLowerCase() ?? t("removed") }));'
  ),
  text("data-table.tsx", 'say(`${action.progress?.[1] ?? "Done"}: ', 'say(`${action.progress?.[1] ?? t("Done")}: '),
  text("data-table.tsx", "say(`${action.label} failed.`);", 'say(t("{action} failed.", { action: action.label }));'),
  text(
    "data-table.tsx",
    "flash(`Couldn't ${u.action.label.toLowerCase()} ${u.ids.length} ${count(u.ids.length)}. They're back.`);\n      say(`${u.action.label} failed. The rows are back.`);",
    "flash(t(\"Couldn't {action} {n} {noun}. They're back.\", { action: u.action.label.toLowerCase(), n: u.ids.length, noun: count(u.ids.length) }));\n      say(t(\"{action} failed. The rows are back.\", { action: u.action.label }));"
  ),
  text("data-table.tsx", "say(`Undone. ${undo.ids.length} ${count(undo.ids.length)} back.`);", 'say(t("Undone. {n} {noun} back.", { n: undo.ids.length, noun: count(undo.ids.length) }));'),
  text("data-table.tsx", "say(`Saved ${col.header.toLowerCase()}.`);", 'say(t("Saved {column}.", { column: col.header.toLowerCase() }));'),
  text(
    "data-table.tsx",
    "flash(`Couldn't save ${col.header.toLowerCase()} for ${name(row)}.`);\n      say(`Couldn't save. ${col.header} is back to what it was.`);",
    "flash(t(\"Couldn't save {column} for {row}.\", { column: col.header.toLowerCase(), row: name(row) }));\n      say(t(\"Couldn't save. {column} is back to what it was.\", { column: col.header }));"
  ),
  text("data-table.tsx", "say(`Page ${next + 1} of ${pages}.`);", 'say(t("Page {page} of {pages}.", { page: next + 1, pages }));'),
  text("data-table.tsx", 'say(`${open.has(id) ? "Closed" : "Opened"} ${name(row)}.`);', 'say(t(open.has(id) ? "Closed {row}." : "Opened {row}.", { row: name(row) }));'),
  text(
    "data-table.tsx",
    '    { value: "", label: "Unsorted" },\n    ...sortable.flatMap((c) => [\n      { value: `${c.key}:asc`, label: `${c.header}, ascending` },\n      { value: `${c.key}:desc`, label: `${c.header}, descending` },',
    '    { value: "", label: t("Unsorted") },\n    ...sortable.flatMap((c) => [\n      { value: `${c.key}:asc`, label: t("{column}, ascending", { column: c.header }) },\n      { value: `${c.key}:desc`, label: t("{column}, descending", { column: c.header }) },'
  ),
  text("data-table.tsx", 'aria-label="Clear search"', 'aria-label={t("Clear search")}'),
  text("data-table.tsx", 'label="Sort by"', 'label={t("Sort by")}'),
  text("data-table.tsx", '{sortCol ? sortCol.header : "Sort"}', '{sortCol ? sortCol.header : t("Sort")}'),
  text("data-table.tsx", 'aria-label="Clear selection" onClick', 'aria-label={t("Clear selection")} onClick'),
  text("data-table.tsx", "<NumberRoll value={Math.max(1, selected.size)} /> selected", '<NumberRoll value={Math.max(1, selected.size)} /> {t("selected")}'),
  text("data-table.tsx", 'success: a.progress?.[1] ?? "Done", error: "Try again" }}', 'success: a.progress?.[1] ?? t("Done"), error: t("Try again") }}'),
  text("data-table.tsx", '{undo.action.progress?.[1]?.toLowerCase() ?? "removed"}', '{undo.action.progress?.[1]?.toLowerCase() ?? t("removed")}'),
  text("data-table.tsx", "font-medium hover:bg-accent ${FOCUS}`}>\n            Undo\n", 'font-medium hover:bg-accent ${FOCUS}`}>\n            {t("Undo")}\n'),
  text("data-table.tsx", 'aria-label={allState === "on" ? "Clear selection" : "Select all"}', 'aria-label={allState === "on" ? t("Clear selection") : t("Select all")}'),
  text("data-table.tsx", 'aria-label="Details"', 'aria-label={t("Details")}'),
  text(
    "data-table.tsx",
    "{q ? `No ${noun[1]} match “${query.trim()}”` : `No ${noun[1]} yet`}",
    '{q ? t("No {nouns} match “{query}”", { nouns: noun[1], query: query.trim() }) : t("No {nouns} yet", { nouns: noun[1] })}'
  ),
  text("data-table.tsx", "&nbsp;of&nbsp;", '&nbsp;{t("of")}&nbsp;'),
  text("data-table.tsx", 'aria-label="Previous page"', 'aria-label={t("Previous page")}'),
  text("data-table.tsx", 'aria-label="Next page"', 'aria-label={t("Next page")}'),
  {
    file: "usage-meter.tsx",
    why: "UsageMeter formats its numbers and reset date in en-US only: the Vietnamese bill read \"Đặt lại Nov 14\". A `locales` prop (default en-US) does it in the page's language.",
    from: "  upgradeLabel?: string;\n}",
    to: "  upgradeLabel?: string;\n  /** Locale for the numbers and the reset date (patched (hairline/patch.mjs)). */\n  locales?: string | string[];\n}",
  },
  {
    file: "usage-meter.tsx",
    why: "Takes the `locales` prop of the patch above.",
    from: "  upgradeLabel = \"Upgrade\",\n",
    to: "  upgradeLabel = \"Upgrade\",\n  locales = \"en-US\", // patched (hairline/patch.mjs)\n",
  },
  {
    file: "usage-meter.tsx",
    why: "Formats the figures and the reset date in `locales` (see above); the module-level en-US formatter is shadowed.",
    from: "  const resets =\n    resetAt !== undefined ? new Date(resetAt).toLocaleDateString(\"en-US\", {",
    to: "  const number = new Intl.NumberFormat(locales); // patched (hairline/patch.mjs)\n  const resets =\n    resetAt !== undefined ? new Date(resetAt).toLocaleDateString(locales, {",
  },
  {
    file: "usage-meter.tsx",
    why: "The rolling figures use `locales` too (see above).",
    from: "              <NumberRoll value={left} format={GROUPED} locales=\"en-US\" duration={700} />\n              &nbsp;{t(\"of\")}&nbsp;\n              <NumberRoll value={limit} format={GROUPED} locales=\"en-US\" duration={700} />",
    to: "              <NumberRoll value={left} format={GROUPED} locales={locales /* patched (hairline/patch.mjs) */} duration={700} />\n              &nbsp;{t(\"of\")}&nbsp;\n              <NumberRoll value={limit} format={GROUPED} locales={locales} duration={700} />",
  },
]

export function apply(read, write, patches = PATCHES) {
  const failed = []
  for (const patch of patches) {
    const source = read(patch.file)
    if (source.includes(patch.to)) continue
    if (!source.includes(patch.from)) {
      failed.push(`${patch.file}: ${patch.why}`)
      continue
    }
    write(patch.file, source.replace(patch.from, patch.to))
    console.log(`patched ${patch.file}`)
  }
  return failed
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failed = apply(
    (file) => readFileSync(new URL(file, DIR), "utf8"),
    (file, text) => writeFileSync(new URL(file, DIR), text)
  )
  if (failed.length) {
    console.error(`Hairline patches no longer match upstream:\n- ${failed.join("\n- ")}`)
    process.exit(1)
  }
}
