# Review: three debt items (lane M)

| Repo | Base | R1 snapshot |
|---|---|---|
| wattprint-nextjs | 2269a131a89d88d88b3a8b58a7069c72a7465265 | a49c9b1 |

## R1 (sonnet, full)

Verdict: ship. No Must fix or Should fix.
- Minor: a failed `/insights/watches` read makes a chat with a watch widget fail to open. Sent to debt (the
  dashboard-data rule says a failed read throws; softening it is a product call).
- Minor: the stale "fluid orb" comment in voice-mode.tsx was fixed (lane S). The orb is now upstream's fixed "ice"
  tone in both themes, which went to debt (not checked by eye).

Loop ends after R1.
