import { auth } from "@/auth"
import { isSameOrigin, jsonError } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { isPngDataUrl } from "@/lib/validators"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return jsonError("Sign in to see signatures.", 401)
  const signatures = await prisma.signature.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return Response.json({
    signatures: signatures.map((item) => ({
      id: item.id,
      name: item.name,
      pngDataUrl: item.pngDataUrl,
      createdAt: item.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Request was rejected.", 403)
  const session = await auth()
  if (!session?.user?.id) return jsonError("Sign in to save a signature.", 401)
  let body: { name?: unknown; pngDataUrl?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError("Send a signature image.", 400)
  }
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 80)
      : "My signature"
  const pngDataUrl = typeof body.pngDataUrl === "string" ? body.pngDataUrl : ""
  if (!isPngDataUrl(pngDataUrl)) {
    return jsonError("Signature must be a PNG image.", 400)
  }
  const count = await prisma.signature.count({
    where: { userId: session.user.id },
  })
  if (count >= 30) {
    return jsonError("You can save up to 30 signatures. Delete one first.", 400)
  }
  const created = await prisma.signature.create({
    data: { userId: session.user.id, name, pngDataUrl },
  })
  return Response.json({
    signature: {
      id: created.id,
      name: created.name,
      pngDataUrl: created.pngDataUrl,
      createdAt: created.createdAt.toISOString(),
    },
  })
}
