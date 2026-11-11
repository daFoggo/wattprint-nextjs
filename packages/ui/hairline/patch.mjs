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
