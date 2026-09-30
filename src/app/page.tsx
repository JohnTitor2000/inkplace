import Link from "next/link"
import { auth } from "@/auth"
import { DonateForm } from "@/components/donate-form"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function HomePage() {
  const session = await auth()
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null
  const secretConfigured = Boolean(process.env.STRIPE_SECRET_KEY)

  return (
    <div>
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="grid gap-5">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            For documents in the United States
          </p>
          <h1 className="max-w-xl text-4xl leading-tight sm:text-5xl">
            Put your signature on the PDF.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Upload a document, drop in a signature you drew or lifted from a
            photo, and download the file. Inkplace places an image on the page.
            It is not a certificate-based digital signature.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={session ? "/app/sign" : "/register"}
              className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}
            >
              {session ? "Sign a document" : "Create an account"}
            </Link>
            <Link
              href="/#support"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-10 px-4",
              )}
            >
              Support the project
            </Link>
          </div>
        </div>
        <ol className="grid gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <li>
            <h2 className="text-lg">1. Save a signature once</h2>
            <p className="text-sm text-muted-foreground">
              Draw with a mouse, trackpad, or tablet. Upload a picture. Or
              extract the ink from a photo or PDF and confirm the crop.
            </p>
          </li>
          <li>
            <h2 className="text-lg">2. Upload the PDF</h2>
            <p className="text-sm text-muted-foreground">
              If the text layer says signature, signed, or sign — or shows a
              line of underscores — the mark is placed there.
            </p>
          </li>
          <li>
            <h2 className="text-lg">3. Adjust, then download</h2>
            <p className="text-sm text-muted-foreground">
              Drag, resize, or move it to another page. Nothing is uploaded to
              a signing service; the stamped PDF downloads in your browser.
            </p>
          </li>
        </ol>
      </section>
      <section id="support" className="border-t border-border/80 bg-card/60">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-12">
          <h2 className="text-3xl">Support Inkplace</h2>
          <p className="max-w-2xl text-muted-foreground">
            The signer is free. A one-time donation in USD helps cover hosting.
            Choose $3, $5, $10, or another amount. Stripe offers Apple Pay,
            Google Pay, and cards when the browser and domain allow it.
          </p>
          <DonateForm
            publishableKey={publishableKey}
            secretConfigured={secretConfigured}
          />
        </div>
      </section>
    </div>
  )
}
