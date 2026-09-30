import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SignatureLibrary } from "@/components/signature-library"
import { prisma } from "@/lib/prisma"

export default async function LibraryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login?callbackUrl=/app")
  const rows = await prisma.signature.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <SignatureLibrary
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
