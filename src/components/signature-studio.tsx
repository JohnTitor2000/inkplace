"use client"

import { useEffect, useRef, useState } from "react"
import SignaturePad from "signature_pad"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  canvasToTrimmedPng,
  extractSignatureFromFile,
} from "@/lib/extract-signature"
import type { SignatureRecord } from "@/lib/signature-record"

const ACCEPT_IMAGE = "image/png,image/jpeg,image/webp,image/gif,image/bmp,.bmp"

export function SignatureStudio({
  onSaved,
}: {
  onSaved: (signature: SignatureRecord) => void
}) {
  const [name, setName] = useState("My signature")
  const [tab, setTab] = useState("draw")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState<{
    dataUrl: string
    note: string
  } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const strokesRef = useRef<ReturnType<SignaturePad["toData"]> | null>(null)

  useEffect(() => {
    if (tab !== "draw") return
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, rect.width) * ratio
    canvas.height = Math.max(1, rect.height) * ratio
    const ctx = canvas.getContext("2d")
    ctx?.scale(ratio, ratio)
    const pad = new SignaturePad(canvas, {
      minWidth: 0.6,
      maxWidth: 2.4,
      penColor: "#1a2332",
      backgroundColor: "rgba(0,0,0,0)",
    })
    if (strokesRef.current?.length) pad.fromData(strokesRef.current)
    padRef.current = pad
    return () => {
      strokesRef.current = pad.toData()
      pad.off()
      padRef.current = null
    }
  }, [tab])

  async function saveDataUrl(dataUrl: string) {
    setPending(true)
    setError(null)
    const response = await fetch("/api/signatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pngDataUrl: dataUrl }),
    })
    const payload = (await response.json().catch(() => null)) as {
      signature?: SignatureRecord
      error?: string
    } | null
    setPending(false)
    if (!response.ok || !payload?.signature) {
      setError(payload?.error ?? "Could not save the signature.")
      return
    }
    setPreview(null)
    onSaved(payload.signature)
  }

  async function saveDrawing() {
    const pad = padRef.current
    const canvas = canvasRef.current
    if (!pad || !canvas || pad.isEmpty()) {
      setError("Draw a signature before saving.")
      return
    }
    const dataUrl = canvasToTrimmedPng(canvas)
    if (!dataUrl) {
      setError("Draw a signature before saving.")
      return
    }
    await saveDataUrl(dataUrl)
  }

  async function onUpload(file: File | undefined) {
    if (!file) return
    setError(null)
    setPending(true)
    try {
      const dataUrl = await fileToPng(file)
      await saveDataUrl(dataUrl)
    } catch (err) {
      setPending(false)
      setError(err instanceof Error ? err.message : "Could not use that image.")
    }
  }

  async function onExtract(file: File | undefined) {
    if (!file) return
    setError(null)
    setPreview(null)
    setPending(true)
    try {
      const result = await extractSignatureFromFile(file)
      setPreview({
        dataUrl: result.dataUrl,
        note: result.page
          ? `Cropped from page ${result.page}. Save it only if this is the signature.`
          : "Cropped from the photo. Save it only if this is the signature.",
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't find a signature-like mark in that file.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="signature-name">Name</Label>
        <Input
          id="signature-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-10 max-w-sm"
        />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="draw">Draw</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="extract">From a document</TabsTrigger>
        </TabsList>
        <TabsContent value="draw" className="grid gap-3 pt-3">
          <p className="text-sm text-muted-foreground">
            Use a mouse, trackpad, or graphics tablet. The background stays
            transparent.
          </p>
          <canvas
            ref={canvasRef}
            className="h-48 w-full touch-none rounded-lg bg-white ring-1 ring-foreground/15"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={saveDrawing} disabled={pending} className="h-10">
              {pending ? "Saving…" : "Save drawing"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => {
                padRef.current?.clear()
                strokesRef.current = []
                setError(null)
              }}
            >
              Clear
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="upload" className="grid gap-3 pt-3">
          <p className="text-sm text-muted-foreground">
            PNG, JPEG, WebP, GIF, or BMP. A white background stays white. Use
            “From a document” if you want the paper removed.
          </p>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Image file</span>
            <input
              type="file"
              accept={ACCEPT_IMAGE}
              className="text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                void onUpload(file)
              }}
            />
          </label>
        </TabsContent>
        <TabsContent value="extract" className="grid gap-3 pt-3">
          <p className="text-sm text-muted-foreground">
            A photo or a PDF of a signed page. Inkplace thresholds the ink,
            drops long rules and tiny text specks, and keeps the mark that
            looks most like a signature.
          </p>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Photo or PDF</span>
            <input
              type="file"
              accept={`${ACCEPT_IMAGE},application/pdf,.pdf`}
              className="text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                void onExtract(file)
              }}
            />
          </label>
          {pending ? <p className="text-sm">Reading the file…</p> : null}
          {preview ? (
            <div className="grid gap-3 rounded-lg bg-muted/60 p-3">
              <p className="text-sm">{preview.note}</p>
              <div className="grid min-h-28 place-items-center rounded-md bg-[linear-gradient(45deg,#ece7dc_25%,transparent_25%,transparent_75%,#ece7dc_75%),linear-gradient(45deg,#ece7dc_25%,transparent_25%,transparent_75%,#ece7dc_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-3">
                {/* Data URLs are produced in the browser and are not next/image sources. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.dataUrl}
                  alt="Cropped signature preview"
                  className="max-h-40 max-w-full"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="h-10"
                  disabled={pending}
                  onClick={() => saveDataUrl(preview.dataUrl)}
                >
                  Save this crop
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => setPreview(null)}
                >
                  Discard
                </Button>
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

async function fileToPng(file: File) {
  if (file.size > 8_000_000) {
    throw new Error("Use an image under 8 MB.")
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () =>
        reject(new Error("That image couldn't be opened. BMP works for 24-bit and 32-bit files."))
      el.src = url
    })
    const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Could not read that image.")
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/png")
  } finally {
    URL.revokeObjectURL(url)
  }
}
