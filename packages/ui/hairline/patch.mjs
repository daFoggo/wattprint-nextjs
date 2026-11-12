// Local fixes to vendored Hairline UI files, re-applied by `pnpm --filter @workspace/ui hairline` after every upstream install.
// Each patch is an exact string swap. Already applied: skipped. Neither string found: upstream changed the code, so the script
// fails; re-check the bug on the new code (upstream may have fixed it) and update or delete the patch.
import { readFileSync, writeFileSync } from "node:fs"
import process from "node:process"

const DIR = new URL("../src/components/hairline/", import.meta.url)

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
    to: '        {/* patched (hairline/patch.mjs): a <table> ignores the 1px height of sr-only, so a div carries it. */}\n        <div className="sr-only"><table>\n          <caption>\n            {title}: {fmt(total)} over {n} days',
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
    why: "With `fillUsed`, what is left is the limit less the tokens; it drives the figure, the meter text and the amber state.",
    from: "  const low = shown <= limit * 0.1;",
    to: "  const left = fillUsed ? Math.floor(Math.max(0, limit - remaining)) : shown; // patched (hairline/patch.mjs)\n  const low = left <= limit * 0.1;",
  },
  {
    file: "token-bucket.tsx",
    why: "The figure is what is left (see above).",
    from: "<NumberRoll value={shown} locales={locale} duration={600} />",
    to: "<NumberRoll value={left /* patched (hairline/patch.mjs) */} locales={locale} duration={600} />",
  },
  {
    file: "token-bucket.tsx",
    why: "The meter text is what is left (see above).",
    from: "aria-valuetext={`${fmt(shown)} of ${fmt(limit)} ${unit} left",
    to: "aria-valuetext={`${fmt(left /* patched (hairline/patch.mjs) */)} of ${fmt(limit)} ${unit} left",
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
