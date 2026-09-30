import { isSameOrigin, jsonError } from "@/lib/http"
import { isAllowedDonationCents } from "@/lib/money"
import { getStripe, stripeKeysConfigured } from "@/lib/stripe"

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Request was rejected.", 403)
  if (!stripeKeysConfigured()) {
    return jsonError(
      "Stripe keys are required before a card or wallet can be charged.",
      503,
    )
  }
  let body: { amountCents?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError("Choose a donation amount.", 400)
  }
  const amountCents =
    typeof body.amountCents === "number" ? body.amountCents : Number.NaN
  if (!isAllowedDonationCents(amountCents)) {
    return jsonError("Enter an amount from $1 to $1,000.", 400)
  }
  const stripe = getStripe()
  if (!stripe) {
    return jsonError(
      "Stripe keys are required before a card or wallet can be charged.",
      503,
    )
  }
  const origin = new URL(req.url).origin
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    description: "Inkplace donation",
    metadata: { kind: "donation" },
  })
  if (!intent.client_secret) {
    return jsonError("Stripe did not return a payment session.", 502)
  }
  return Response.json({
    clientSecret: intent.client_secret,
    returnUrl: `${origin}/donate/success`,
  })
}
