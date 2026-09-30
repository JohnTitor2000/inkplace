import type { Metadata } from "next"
import { DonateForm } from "@/components/donate-form"

export const metadata: Metadata = { title: "Support" }

export default function DonatePage() {
  return (
    <div className="mx-auto grid w-full max-w-xl gap-4 px-4 py-10">
      <h1 className="text-3xl">Support Inkplace</h1>
      <p className="text-muted-foreground">
        One-time donation in USD. Presets are $3, $5, and $10. A custom amount
        can be anything from $1 to $1,000.
      </p>
      <DonateForm
        publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null}
        secretConfigured={Boolean(process.env.STRIPE_SECRET_KEY)}
      />
    </div>
  )
}
