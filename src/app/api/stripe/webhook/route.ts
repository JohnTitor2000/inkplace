import { jsonError } from "@/lib/http"
import { getStripe } from "@/lib/stripe"

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return jsonError(
      "STRIPE_WEBHOOK_SECRET is required to verify Stripe events.",
      503,
    )
  }
  const stripe = getStripe()
  if (!stripe) {
    return jsonError("STRIPE_SECRET_KEY is required to verify Stripe events.", 503)
  }
  const signature = req.headers.get("stripe-signature")
  if (!signature) return jsonError("Missing Stripe signature.", 400)
  const payload = await req.text()
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret)
    if (event.type === "payment_intent.succeeded") {
      return Response.json({ received: true, type: event.type })
    }
    return Response.json({ received: true, type: event.type })
  } catch {
    return jsonError("Webhook signature could not be verified.", 400)
  }
}
