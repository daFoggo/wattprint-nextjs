import { Skeleton } from "@workspace/ui/components/hairline/skeleton"

const ROWS = 10 // DeviceList's page size

/** DeviceList's fallback: its search bar, then a table of a full page of rows at their height. */
export function DeviceListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton shape="block" height={44} />
      <div className="flex flex-col rounded-3xl border bg-background px-3">
        <div className="flex h-10 items-center">
          <Skeleton width="30%" height={10} />
        </div>
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={i} className="flex h-13 items-center gap-3 border-t">
            <Skeleton shape="circle" width={32} />
            <span className="flex-1">
              <Skeleton width="40%" />
            </span>
            <span className="hidden flex-1 md:block">
              <Skeleton shape="block" width={160} height={24} />
            </span>
            <span className="flex w-1/5 justify-end">
              <Skeleton width="60%" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
