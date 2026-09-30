export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin")
  if (!origin) return true
  const host = req.headers.get("host")
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}
