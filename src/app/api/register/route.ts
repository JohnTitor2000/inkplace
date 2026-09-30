import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, jsonError } from "@/lib/http"
import { isEmail, normalizeEmail } from "@/lib/validators"

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Request was rejected.", 403)
  let body: { name?: unknown; email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError("Send a name, email, and password.", 400)
  }
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (name.length > 80) return jsonError("Name is too long.", 400)
  if (!isEmail(email)) return jsonError("Enter a valid email address.", 400)
  if (password.length < 8) {
    return jsonError("Password needs at least 8 characters.", 400)
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return jsonError("An account with that email already exists.", 409)
  }
  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: {
      name: name || null,
      email,
      passwordHash,
    },
  })
  return Response.json({ ok: true })
}
