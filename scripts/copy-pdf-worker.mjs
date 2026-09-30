import { copyFile, mkdir } from "node:fs/promises"
import path from "node:path"

const source = path.join(
  process.cwd(),
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
)
const target = path.join(process.cwd(), "public/pdf.worker.min.mjs")
await mkdir(path.dirname(target), { recursive: true })
await copyFile(source, target)
