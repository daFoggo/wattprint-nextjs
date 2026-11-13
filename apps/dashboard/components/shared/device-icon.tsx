import {
  IconBread,
  IconDeviceSpeaker,
  IconDeviceTv,
  IconDots,
  IconFridge,
  IconMicrowave,
  IconPlugConnected,
  IconTeapot,
  IconWash,
  IconWashMachine,
  type Icon,
} from "@tabler/icons-react"

import { cn } from "@workspace/ui/lib/utils"

// By cat_device_type.code; a type without its own icon gets the generic one.
const ICONS: Record<string, Icon> = {
  always_on: IconPlugConnected,
  fridge: IconFridge,
  fridge_freezer: IconFridge,
  freezer: IconFridge,
  kettle: IconTeapot,
  washing_machine: IconWashMachine,
  washer_dryer: IconWashMachine,
  dishwasher: IconWash,
  television: IconDeviceTv,
  hifi: IconDeviceSpeaker,
  microwave: IconMicrowave,
  toaster: IconBread,
}

/** A device's kind as an icon in a round well, as Sense lists them. */
export function DeviceIcon({
  type,
  size = "md",
}: {
  type: string
  /** xs and sm fit inside a chip or a button. */
  size?: "xs" | "sm" | "md" | "lg"
}) {
  const Component = ICONS[type] ?? IconDots
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted text-foreground",
        { xs: "size-5", sm: "size-6", md: "size-8", lg: "size-12" }[size]
      )}
    >
      <Component
        className={
          { xs: "size-3", sm: "size-3.5", md: "size-4", lg: "size-6" }[size]
        }
      />
    </span>
  )
}
