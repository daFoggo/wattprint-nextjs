import { IconBulb } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Tile } from "@/components/shared/tile"

import type { DeviceDetail } from "../schemas"

/** Sense's "About": how this device compares with a typical one of its kind, and how to spend less on it. */
export function DeviceAbout({
  device,
  className,
}: {
  device: DeviceDetail
  className?: string
}) {
  const t = useTranslations("energy.about")
  const watts = new Intl.NumberFormat(useLocale())
  return (
    <Tile title={t("title")} className={className}>
      {device.typical_w ? (
        <p className="text-sm text-muted-foreground">
          {t.rich("typical", {
            typical: watts.format(device.typical_w),
            yours: watts.format(device.avg_on_w),
            b: (chunks) => (
              <span className="font-medium text-foreground">{chunks}</span>
            ),
          })}
        </p>
      ) : null}
      {device.tip ? (
        <div className="flex gap-3 rounded-xl bg-muted p-4">
          <IconBulb aria-hidden className="size-4 shrink-0 text-primary" />
          <p className="text-sm">{device.tip}</p>
        </div>
      ) : null}
    </Tile>
  )
}
