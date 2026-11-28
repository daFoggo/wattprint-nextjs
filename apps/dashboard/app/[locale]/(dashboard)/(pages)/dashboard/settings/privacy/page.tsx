import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { acceptInviteAction } from "@/features/home/actions"
import { JoinHome } from "@/features/home/components/join-home"
import { getHome } from "@/features/home/queries"
import { HowAi } from "@/features/privacy/components/how-ai"
import { Kept } from "@/features/privacy/components/kept"
import { Members } from "@/features/privacy/components/members"
import { getPrivacyPage } from "@/features/privacy/queries"

import { NoHome } from "../../../../_components/no-home"
import { DeleteData } from "./_components/delete-data"
import { SentOutside } from "./_components/sent-outside"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy")
  return { title: t("title") }
}

async function Privacy() {
  if (!(await getHome())) return <NoHome />
  const { privacy, home, consents, outbound, members } = await getPrivacyPage()
  return (
    <div className="flex flex-col gap-4">
      <Kept privacy={privacy} />
      <Members members={members} role={home.role}>
        {home.role === "viewer" ? (
          <JoinHome action={acceptInviteAction} />
        ) : null}
      </Members>
      <SentOutside
        consents={consents}
        detail={home.ai_detail_effective}
        owner={home.role === "owner"}
        outbound={outbound}
      />
      <DeleteData canErase={privacy.can_erase} />
      <HowAi />
    </div>
  )
}

export default function PrivacyPage() {
  const t = useTranslations("privacy")
  return (
    <>
      <PageHead title={t("title")}>{t("description")}</PageHead>
      <Suspense fallback={<TileSkeleton height={600} />}>
        <Privacy />
      </Suspense>
    </>
  )
}
