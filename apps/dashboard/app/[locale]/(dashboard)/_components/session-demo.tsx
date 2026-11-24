import { viewDemoHomeAction } from "@/features/auth/actions"
import { DemoHomeMenu } from "@/features/auth/components/demo-home-menu"
import { getDemoHomes } from "@/features/auth/queries"
import { getHome } from "@/features/home/queries"

/** A demo viewer's row in the sidebar (which home, read-only, switch); nothing for everyone else. */
export async function SessionDemo() {
  const home = await getHome()
  if (home?.role !== "viewer") return null
  return (
    <DemoHomeMenu
      name={home.name}
      homes={await getDemoHomes()}
      action={viewDemoHomeAction}
    />
  )
}
