import { auth } from "@/auth"
import { isSameOrigin, jsonError } from "@/lib/http"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(req)) return jsonError("Request was rejected.", 403)
  const session = await auth()
  if (!session?.user?.id) return jsonError("Sign in to delete a signature.", 401)
  const { id } = await context.params
  const existing = await prisma.signature.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return jsonError("That signature is not in your library.", 404)
  await prisma.signature.delete({ where: { id } })
  return Response.json({ ok: true })
}
