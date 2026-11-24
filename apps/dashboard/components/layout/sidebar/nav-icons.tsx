import {
  IconBell,
  IconChartBar,
  IconDevices,
  IconLayoutDashboard,
  IconPigMoney,
  IconReceipt,
  IconSettings,
  type Icon,
} from "@tabler/icons-react"

import type { NavIconName } from "@/config/navigation"

/** `Record` makes TypeScript fail here when a name is added to `NavIconName` without an icon. */
const NAV_ICONS: Record<NavIconName, Icon> = {
  overview: IconLayoutDashboard,
  statistics: IconChartBar,
  devices: IconDevices,
  alerts: IconBell,
  plan: IconPigMoney,
  bill: IconReceipt,
  settings: IconSettings,
}

export function NavIcon({ name }: { name: NavIconName }) {
  const Component = NAV_ICONS[name]
  return <Component aria-hidden className="size-4 shrink-0" />
}
