import { spawn } from "node:child_process"
import { lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const onRailway = Boolean(process.env.RAILWAY_ENVIRONMENT)
const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH

if (onRailway && !volume) {
  console.error(
    "RAILWAY_VOLUME_MOUNT_PATH is not set. Refusing to start with an ephemeral SQLite file.",
  )
  process.exit(1)
}

if (volume) {
  mkdirSync(volume, { recursive: true })
  const target = join(volume, "inkplace.db")
  const link = join(root, "prisma", "dev.db")
  let replace = false
  try {
    const current = lstatSync(link)
    if (!current.isSymbolicLink() || readlinkSync(link) !== target) replace = true
  } catch {
    replace = true
  }
  if (replace) {
    try {
      lstatSync(link)
      rmSync(link)
    } catch {
      // The link path was missing.
    }
    symlinkSync(target, link)
  }
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    })
    const stop = (signal) => child.kill(signal)
    process.on("SIGTERM", stop)
    process.on("SIGINT", stop)
    child.on("error", reject)
    child.on("exit", (code, signal) => {
      process.off("SIGTERM", stop)
      process.off("SIGINT", stop)
      if (code === 0) resolve()
      else reject(new Error(`${args.join(" ")} exited ${code ?? signal}`))
    })
  })
}

await run([
  join(root, "node_modules/prisma/build/index.js"),
  "db",
  "push",
  "--skip-generate",
])

const port = process.env.PORT || "43127"
await run([
  join(root, "node_modules/next/dist/bin/next"),
  "start",
  "--hostname",
  "0.0.0.0",
  "--port",
  String(port),
])
