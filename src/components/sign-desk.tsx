"use client"

import Link from "next/link"
import { useState } from "react"
import { PdfSigner } from "@/components/pdf-signer"
import { SignatureStudio } from "@/components/signature-studio"
import type { SignatureRecord } from "@/lib/signature-record"

export function SignDesk({
  initialSignatures,
}: {
  initialSignatures: SignatureRecord[]
}) {
  const [signatures, setSignatures] = useState(initialSignatures)

  return (
    <div className="grid gap-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl">Sign a PDF</h1>
        <p className="mt-2 text-muted-foreground">
          Upload the file, check where the signature landed, drag it if you
          need to, then download. One placement is stamped onto the page.
        </p>
      </div>
      {signatures.length === 0 ? (
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="text-xl">Save a signature to continue</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing is stored until you save. After that, the same mark can be
            reused.
          </p>
          <div className="mt-4">
            <SignatureStudio
              onSaved={(signature) =>
                setSignatures((current) => [signature, ...current])
              }
            />
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Using a saved signature.{" "}
          <Link href="/app" className="underline">
            Open the library
          </Link>{" "}
          to add or delete marks.
        </p>
      )}
      <PdfSigner signatures={signatures} />
    </div>
  )
}
