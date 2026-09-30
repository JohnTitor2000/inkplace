import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { formatUsd } from "@/lib/money"
import { getStripe } from "@/lib/stripe"
import { cn } from "@/lib/utils"

export default async function DonateSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_intent?: string }>
}) {
  const { payment_intent: paymentIntentId } = await searchParams
  const stripe = getStripe()

  let title = "We couldn't confirm a payment"
  let body = paymentIntentId
    ? "Stripe keys are required to confirm a payment. Nothing here was marked as paid."
    : "No payment was attached to this page, so nothing was marked as paid."

  if (paymentIntentId && stripe) {
    try {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (intent.status === "succeeded" && intent.metadata?.kind === "donation") {
        const cents = intent.amount_received || intent.amount
        title = "Thank you — the donation went through"
        body = `Stripe confirmed ${formatUsd(cents)}.`
      } else {
        body = `Stripe reported “${intent.status}”. You have not been marked as paid.`
      }
    } catch {
      body = "Stripe did not recognize that payment. You have not been marked as paid."
    }
  }

  return <Result title={title} body={body} />
}

function Result({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-4 py-16">
      <h1 className="text-3xl">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <Link href="/donate" className={cn(buttonVariants(), "h-10 w-fit px-4")}>
        Back to support
      </Link>
    </div>
  )
}
