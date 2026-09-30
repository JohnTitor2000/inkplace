import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SignDesk } from "@/components/sign-desk"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = { title: "Sign a PDF" }

export default async function SignPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login?callbackUrl=/app/sign")
  const rows = await prisma.signature.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <SignDesk
        initialSignatures={rows.map((row) => ({
          id: row.id,
          name: row.name,
          pngDataUrl: row.pngDataUrl,
          createdAt: row.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
