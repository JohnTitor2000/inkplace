import { readFile } from "node:fs/promises"
import path from "node:path"

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "public/.well-known/apple-developer-merchantid-domain-association",
  )
  try {
    const body = await readFile(filePath)
    return new Response(body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return new Response("Apple Pay domain association file is missing.", {
      status: 404,
    })
  }
}
