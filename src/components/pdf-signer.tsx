"use client"

import { useEffect, useRef, useState } from "react"
import { PDFDocument } from "pdf-lib"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  clampPlacement,
  findPlacement,
  type PageText,
  type Placement,
  type TextRun,
} from "@/lib/placement"
import type { SignatureRecord } from "@/lib/signature-record"

type Drag =
  | {
      kind: "move" | "resize"
      startX: number
      startY: number
      orig: Placement
    }
  | null

export function PdfSigner({
  signatures,
  onNeedSignature,
}: {
  signatures: SignatureRecord[]
  onNeedSignature?: () => void
}) {
  const [selectedId, setSelectedId] = useState(signatures[0]?.id ?? "")
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileToken, setFileToken] = useState(0)
  const [stageWidth, setStageWidth] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [pages, setPages] = useState<PageText[]>([])
  const [box, setBox] = useState<Placement | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const pdfBytesRef = useRef<Uint8Array | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragRef = useRef<Drag>(null)
  const adjustedRef = useRef(false)

  const selected =
    signatures.find((item) => item.id === selectedId) ?? signatures[0]

  useEffect(() => {
    if (!pages.length || !selected || adjustedRef.current) return
    let cancelled = false
    void measureAspect(selected.pngDataUrl).then((aspect) => {
      if (cancelled) return
      const placement = findPlacement(pages, aspect)
      setBox(placement)
      setPageIndex(placement.pageIndex)
      setStatus(placementMessage(placement))
    })
    return () => {
      cancelled = true
    }
  }, [pages, selected])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !fileName) return
    const observer = new ResizeObserver(() => {
      setStageWidth(Math.round(stage.clientWidth))
    })
    observer.observe(stage)
    const frame = requestAnimationFrame(() => {
      setStageWidth(Math.round(stage.clientWidth))
    })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [fileName, fileToken])

  useEffect(() => {
    const bytes = pdfBytesRef.current
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!bytes || !canvas || !stage || pageCount === 0 || stageWidth < 40) return
    let cancelled = false
    let task: { cancel: () => void } | null = null
    const width = stageWidth
    setLoading(true)
    void (async () => {
      try {
        const pdfjs = await loadPdfjs()
        const loadingTask = pdfjs.getDocument({ data: bytes.slice(0) })
        const doc = await loadingTask.promise
        const page = await doc.getPage(pageIndex + 1)
        const base = page.getViewport({ scale: 1 })
        const scale = (width / base.width) * Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale })
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const renderTask = page.render({ canvas, viewport })
        task = renderTask
        await renderTask.promise
        if (!cancelled) setLoading(false)
        await doc.cleanup()
        await loadingTask.destroy()
      } catch (err) {
        if (cancelled) return
        setLoading(false)
        if (err instanceof Error && err.name === "RenderingCancelledException") return
        setError("Couldn't render that page.")
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [pageIndex, pageCount, fileName, fileToken, stageWidth])

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setStatus(null)
    setBox(null)
    adjustedRef.current = false
    if (file.size > 25_000_000) {
      setError("Use a PDF under 25 MB.")
      return
    }
    setLoading(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const pdfjs = await loadPdfjs()
      const loadingTask = pdfjs.getDocument({ data: bytes.slice(0) })
      const doc = await loadingTask.promise
      const nextPages: PageText[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale: 1 })
        const content = await page.getTextContent()
        const items: TextRun[] = []
        for (const item of content.items) {
          if (!("str" in item) || !item.str) continue
          const transform = item.transform
          items.push({
            text: item.str,
            x: transform[4] ?? 0,
            y: transform[5] ?? 0,
            width: item.width ?? 0,
            height: item.height ?? 0,
          })
        }
        nextPages.push({
          width: viewport.width,
          height: viewport.height,
          items,
        })
      }
      await doc.cleanup()
      await loadingTask.destroy()
      pdfBytesRef.current = bytes
      setPages(nextPages)
      setPageCount(nextPages.length)
      setPageIndex(0)
      setFileName(file.name)
      setFileToken((token) => token + 1)
      setLoading(false)
    } catch {
      setLoading(false)
      setFileName(null)
      setPageCount(0)
      setPages([])
      pdfBytesRef.current = null
      setError("Couldn't read that PDF. It may be encrypted or damaged.")
    }
  }

  function currentPageSize() {
    return pages[pageIndex] ?? { width: 612, height: 792 }
  }

  function onPointerDown(event: React.PointerEvent, kind: "move" | "resize") {
    if (!box) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      kind,
      startX: event.clientX,
      startY: event.clientY,
      orig: box,
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    const stage = stageRef.current
    if (!drag || !stage) return
    const rect = stage.getBoundingClientRect()
    const page = currentPageSize()
    const dx = ((event.clientX - drag.startX) / rect.width) * page.width
    const dy = ((event.clientY - drag.startY) / rect.height) * page.height
    adjustedRef.current = true
    if (drag.kind === "move") {
      setBox({
        ...drag.orig,
        ...clampPlacement(page, {
          x: drag.orig.x + dx,
          y: drag.orig.y - dy,
          width: drag.orig.width,
          height: drag.orig.height,
        }),
      })
      return
    }
    const aspect = drag.orig.width / drag.orig.height
    const width = Math.max(48, drag.orig.width + dx)
    const height = width / aspect
    const top = drag.orig.y + drag.orig.height
    setBox({
      ...drag.orig,
      ...clampPlacement(page, {
        x: drag.orig.x,
        y: top - height,
        width,
        height,
      }),
    })
  }

  function onPointerUp() {
    dragRef.current = null
  }

  function changePage(next: number) {
    if (!pages.length) return
    const index = Math.min(pages.length - 1, Math.max(0, next))
    setPageIndex(index)
    setBox((current) => {
      if (!current) return current
      const page = pages[index]
      return {
        ...current,
        pageIndex: index,
        ...clampPlacement(page, current),
      }
    })
    adjustedRef.current = true
  }

  async function download() {
    const bytes = pdfBytesRef.current
    if (!bytes || !box || !selected) return
    setDownloading(true)
    setError(null)
    try {
      const doc = await PDFDocument.load(bytes)
      const png = await doc.embedPng(dataUrlToBytes(selected.pngDataUrl))
      const page = doc.getPage(box.pageIndex)
      const visual = pages[box.pageIndex]
      const sx = visual ? page.getWidth() / visual.width : 1
      const sy = visual ? page.getHeight() / visual.height : 1
      page.drawImage(png, {
        x: box.x * sx,
        y: box.y * sy,
        width: box.width * sx,
        height: box.height * sy,
      })
      const saved = await doc.save()
      const copy = new ArrayBuffer(saved.byteLength)
      new Uint8Array(copy).set(saved)
      const blob = new Blob([copy], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
        ? fileName.replace(/\.pdf$/i, "") + "-signed.pdf"
        : "signed-document.pdf"
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Couldn't stamp that PDF. It may be encrypted.")
    } finally {
      setDownloading(false)
    }
  }

  const page = pages[pageIndex]
  const showBox = box && box.pageIndex === pageIndex && page

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        {signatures.length === 0 ? (
          <Alert>
            <AlertDescription>
              Save a signature first, then come back to this PDF.
              {onNeedSignature ? (
                <Button type="button" variant="link" className="px-1" onClick={onNeedSignature}>
                  Add one
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Signature</p>
            <div className="grid gap-2">
              {signatures.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id)
                    adjustedRef.current = false
                  }}
                  className={`flex items-center gap-3 rounded-lg p-2 text-left ring-1 ${
                    item.id === selected?.id
                      ? "ring-primary"
                      : "ring-foreground/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.pngDataUrl}
                    alt=""
                    className="h-10 w-16 object-contain"
                  />
                  <span className="truncate text-sm">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="grid gap-2 text-sm">
          <span className="font-medium">PDF</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              void onFile(file)
            }}
          />
        </label>
        {fileName ? <p className="text-sm text-muted-foreground">{fileName}</p> : null}
        {status ? <p className="text-sm">{status}</p> : null}
        {pageCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageIndex === 0}
              onClick={() => changePage(pageIndex - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pageIndex + 1} of {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => changePage(pageIndex + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
        <Button
          type="button"
          className="h-10"
          disabled={!box || !selected || downloading}
          onClick={() => void download()}
        >
          {downloading ? "Preparing…" : "Download signed PDF"}
        </Button>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <div className="min-w-0">
        {!fileName ? (
          <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-foreground/20 bg-card/70 p-6 text-center text-sm text-muted-foreground">
            Upload a PDF to place the signature. If you already saved one, it
            lands on a signature line when the text layer has one.
          </div>
        ) : (
          <div className="relative overflow-auto rounded-xl bg-card p-2 shadow-sm ring-1 ring-foreground/10 sm:p-4">
            {loading ? (
              <p className="absolute top-3 left-3 z-10 rounded-md bg-card px-2 py-1 text-xs ring-1 ring-foreground/10">
                Rendering the PDF…
              </p>
            ) : null}
            <div ref={stageRef} className="relative mx-auto w-full max-w-3xl">
              <canvas ref={canvasRef} className="block h-auto w-full bg-white" />
              {showBox ? (
                <div
                  className="absolute touch-none"
                  style={{
                    left: `${(box.x / page.width) * 100}%`,
                    top: `${((page.height - box.y - box.height) / page.height) * 100}%`,
                    width: `${(box.width / page.width) * 100}%`,
                    height: `${(box.height / page.height) * 100}%`,
                  }}
                  onPointerDown={(event) => onPointerDown(event, "move")}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected?.pngDataUrl}
                    alt="Signature placement"
                    className="pointer-events-none h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    aria-label="Resize signature"
                    className="absolute -right-1.5 -bottom-1.5 size-4 rounded-sm border border-primary bg-card"
                    onPointerDown={(event) => onPointerDown(event, "resize")}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function placementMessage(placement: Placement) {
  const page = placement.pageIndex + 1
  if (placement.reason === "line") {
    return `Placed on the signature line on page ${page}. Drag or resize it if you want it somewhere else.`
  }
  if (placement.reason === "keyword") {
    return `Found a signature word on page ${page}, without a line beside it. Drag the mark if that spot is wrong.`
  }
  return "No signature line turned up. The mark is at the bottom right of the last page."
}

function measureAspect(dataUrl: string) {
  return new Promise<number>((resolve) => {
    const img = new Image()
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight
      resolve(Number.isFinite(aspect) && aspect > 0 ? aspect : 3)
    }
    img.onerror = () => resolve(3)
    img.src = dataUrl
  })
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  return pdfjs
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? ""
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
