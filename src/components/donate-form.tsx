"use client"

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  formatUsd,
  isAllowedDonationCents,
  parseDollarsToCents,
  PRESET_CENTS,
} from "@/lib/money"

const PRESET_DOLLARS = PRESET_CENTS.map((cents) => cents / 100)

export function DonateForm({
  publishableKey,
  secretConfigured,
}: {
  publishableKey: string | null
  secretConfigured: boolean
}) {
  const configured = Boolean(publishableKey && secretConfigured)
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  )
  const [choice, setChoice] = useState<number | "custom">(5)
  const [custom, setCustom] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const amountCents =
    choice === "custom" ? parseDollarsToCents(custom) : choice * 100

  async function onContinue(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!configured) {
      setError(
        "Stripe keys are required before a card or wallet can be charged.",
      )
      return
    }
    if (amountCents == null || !isAllowedDonationCents(amountCents)) {
      setError("Enter an amount from $1 to $1,000.")
      return
    }
    setPending(true)
    const response = await fetch("/api/donate/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents }),
    })
    const payload = (await response.json().catch(() => null)) as {
      clientSecret?: string
      error?: string
    } | null
    setPending(false)
    if (!response.ok || !payload?.clientSecret) {
      setError(
        payload?.error ??
          "Stripe keys are required before a card or wallet can be charged.",
      )
      return
    }
    setClientSecret(payload.clientSecret)
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Apple Pay and Google Pay appear inside Stripe&apos;s payment form only
        on HTTPS, and Apple Pay also needs this domain registered in Stripe.
        The association file is at{" "}
        <span className="font-mono text-xs">
          /.well-known/apple-developer-merchantid-domain-association
        </span>
        . Inkplace does not draw its own wallet buttons. Card is the fallback.
      </p>
      {configured ? null : (
        <Alert>
          <AlertTitle>Keys required to charge</AlertTitle>
          <AlertDescription>
            Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. The
            form stays here, and no payment is marked successful without
            Stripe.
          </AlertDescription>
        </Alert>
      )}
      {clientSecret && stripePromise ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#243044",
                colorBackground: "#fffdf8",
                borderRadius: "10px",
              },
            },
          }}
        >
          <PayStep
            onBack={() => {
              setClientSecret(null)
              setError(null)
            }}
          />
        </Elements>
      ) : (
        <form onSubmit={onContinue} className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESET_DOLLARS.map((dollars) => (
              <Button
                key={dollars}
                type="button"
                variant={choice === dollars ? "default" : "outline"}
                className="h-10 min-w-16"
                onClick={() => setChoice(dollars)}
              >
                ${dollars}
              </Button>
            ))}
            <Button
              type="button"
              variant={choice === "custom" ? "default" : "outline"}
              className="h-10"
              onClick={() => setChoice("custom")}
            >
              Custom
            </Button>
          </div>
          {choice === "custom" ? (
            <div className="grid gap-2">
              <Label htmlFor="custom-amount">Amount in USD</Label>
              <Input
                id="custom-amount"
                inputMode="decimal"
                placeholder="25"
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                className="h-10 max-w-40"
              />
            </div>
          ) : (
            <p className="text-sm">
              Selected {formatUsd((choice as number) * 100)}
            </p>
          )}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={pending} className="h-10 w-fit">
            {pending ? "Contacting Stripe…" : "Continue to payment"}
          </Button>
        </form>
      )}
    </div>
  )
}

function PayStep({ onBack }: { onBack: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!stripe || !elements) return
    setPending(true)
    setError(null)
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/donate/success`,
      },
    })
    if (stripeError) {
      setError(stripeError.message ?? "The payment was not completed.")
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <PaymentElement />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!stripe || pending} className="h-10">
          {pending ? "Confirming…" : "Pay now"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => router.push("/donate/cancel")}
        >
          Cancel
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          Change amount
        </Button>
      </div>
    </form>
  )
}
