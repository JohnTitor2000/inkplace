import { decodeBmp } from "@/lib/bmp"
import { extractInk } from "@/lib/extract-ink"

const MAX_EDGE = 1400

export type ExtractedSignature = {
  dataUrl: string
  page?: number
  score: number
}

function paintCrop(
  source: ImageData,
  crop: NonNullable<ReturnType<typeof extractInk>>,
) {
  const canvas = document.createElement("canvas")
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not prepare the crop.")
  const out = ctx.createImageData(crop.width, crop.height)
  for (let i = 0; i < crop.mask.length; i++) {
    if (!crop.mask[i]) continue
    const x = crop.x + (i % crop.width)
    const y = crop.y + Math.floor(i / crop.width)
    const src = (y * source.width + x) * 4
    const dst = i * 4
    out.data[dst] = source.data[src]
    out.data[dst + 1] = source.data[src + 1]
    out.data[dst + 2] = source.data[src + 2]
    out.data[dst + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
  return canvas.toDataURL("image/png")
}

function scaleToCanvas(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Could not read that image.")
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  ctx.scale(scale, scale)
  draw(ctx, width, height)
  ctx.restore()
  return ctx.getImageData(0, 0, w, h)
}

async function imageFileToImageData(file: File) {
  const name = file.name.toLowerCase()
  const isBmp = file.type === "image/bmp" || name.endsWith(".bmp")
  if (isBmp) {
    const decoded = decodeBmp(await file.arrayBuffer())
    if (!decoded) throw new Error("That BMP couldn't be read. Use 24-bit or 32-bit.")
    return scaleToCanvas(decoded.width, decoded.height, (ctx) => {
      const pixels = new Uint8ClampedArray(decoded.rgba.length)
      pixels.set(decoded.rgba)
      const image = new ImageData(pixels, decoded.width, decoded.height)
      const scratch = document.createElement("canvas")
      scratch.width = decoded.width
      scratch.height = decoded.height
      const sctx = scratch.getContext("2d")
      if (!sctx) throw new Error("Could not read that BMP.")
      sctx.putImageData(image, 0, 0)
      ctx.drawImage(scratch, 0, 0)
    })
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    return scaleToCanvas(img.naturalWidth, img.naturalHeight, (ctx) => {
      ctx.drawImage(img, 0, 0)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("That image couldn't be opened."))
    img.src = src
  })
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  return pdfjs
}

async function pdfToBestCrop(file: File): Promise<ExtractedSignature> {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  let best: ExtractedSignature | null = null
  const pageCount = Math.min(doc.numPages, 8)
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await doc.getPage(pageNumber)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(2, MAX_EDGE / Math.max(base.width, base.height))
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement("canvas")
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) continue
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, viewport }).promise
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const crop = extractInk(image.width, image.height, image.data)
    if (!crop) continue
    const candidate = {
      dataUrl: paintCrop(image, crop),
      page: pageNumber,
      score: crop.score,
    }
    if (!best || candidate.score > best.score) best = candidate
  }
  if (!best) {
    throw new Error(
      "Couldn't find a signature-like mark in that PDF. Try a closer photo, or draw it instead.",
    )
  }
  return best
}

export async function extractSignatureFromFile(
  file: File,
): Promise<ExtractedSignature> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  if (isPdf) return pdfToBestCrop(file)
  const image = await imageFileToImageData(file)
  const crop = extractInk(image.width, image.height, image.data)
  if (!crop) {
    throw new Error(
      "Couldn't find a signature-like mark. Try a closer crop, or draw it instead.",
    )
  }
  return { dataUrl: paintCrop(image, crop), score: crop.score }
}

export function canvasToTrimmedPng(source: HTMLCanvasElement) {
  const ctx = source.getContext("2d")
  if (!ctx) throw new Error("Could not read the drawing.")
  const { width, height } = source
  const pixels = ctx.getImageData(0, 0, width, height)
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let found = false
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = pixels.data[(y * width + x) * 4 + 3]
      if (alpha < 12) continue
      found = true
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (!found) return null
  const pad = 12
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  const out = document.createElement("canvas")
  out.width = cropW
  out.height = cropH
  const octx = out.getContext("2d")
  if (!octx) throw new Error("Could not prepare the signature.")
  octx.drawImage(source, minX, minY, cropW, cropH, 0, 0, cropW, cropH)
  return out.toDataURL("image/png")
}
