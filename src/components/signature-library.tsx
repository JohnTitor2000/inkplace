"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { SignatureStudio } from "@/components/signature-studio"
import type { SignatureRecord } from "@/lib/signature-record"
import { cn } from "@/lib/utils"

export function SignatureLibrary({
  initialSignatures,
}: {
  initialSignatures: SignatureRecord[]
}) {
  const router = useRouter()
  const [signatures, setSignatures] = useState(initialSignatures)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function remove(id: string) {
    setPendingId(id)
    setError(null)
    const response = await fetch(`/api/signatures/${id}`, { method: "DELETE" })
    const payload = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    setPendingId(null)
    if (!response.ok) {
      setError(payload?.error ?? "Could not delete that signature.")
      return
    }
    setSignatures((current) => current.filter((item) => item.id !== id))
    router.refresh()
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Signature library</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Save a mark once, then reuse it on any PDF. Draw it, upload a
            picture, or pull it out of a scan.
          </p>
        </div>
        <Link
          href="/app/sign"
          className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}
        >
          Sign a PDF
        </Link>
      </div>
      {signatures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/20 p-6">
          <h2 className="text-xl">No signatures saved yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A mouse, trackpad, or tablet all work for drawing. Uploads can be
            PNG, JPEG, WebP, GIF, or BMP.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {signatures.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.pngDataUrl}
                alt={item.name}
                className="h-16 w-28 object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingId === item.id}
                onClick={() => void remove(item.id)}
              >
                {pendingId === item.id ? "Deleting…" : "Delete"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-xl">Add a signature</h2>
        <div className="mt-4">
          <SignatureStudio
            onSaved={(signature) => {
              setSignatures((current) => [signature, ...current])
              router.refresh()
            }}
          />
        </div>
      </section>
    </div>
  )
}
