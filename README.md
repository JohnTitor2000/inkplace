# Inkplace

Inkplace places a picture of your signature on a PDF. Draw it, upload an image, or lift the ink out of a photo or scan, then download the stamped file.

It is built for people in the United States. The interface is English. This is not a certificate-based digital signature and it does not verify identity.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Auth.js (next-auth): email and password with no external secrets, plus Google and GitHub when their env vars are set
- Prisma and SQLite in the repo (`prisma/dev.db`)
- pdf.js to render PDFs and read the text layer, pdf-lib to stamp the signature
- signature_pad for drawing (mouse, trackpad, graphics tablet)
- Stripe Payment Element for one-time donations, with automatic payment methods (Apple Pay, Google Pay, and card)

## Donations

Donations happen on the site. Preset amounts are $3, $5, and $10, plus a custom amount from $1 to $1,000. Stripe Checkout is not used; the Payment Element confirms a one-time PaymentIntent with `automatic_payment_methods`.

Apple Pay and Google Pay are rendered by Stripe. They show up only on HTTPS, and Apple Pay also needs the domain registered in the Stripe Dashboard. The association file is served at:

`/.well-known/apple-developer-merchantid-domain-association`

Inkplace does not draw its own wallet buttons. If `STRIPE_SECRET_KEY` or `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is missing, the form stays on the page with a note that keys are required. A missing key never produces a success page.

Success (`/donate/success`) asks Stripe whether the PaymentIntent succeeded before saying thank you. Cancel (`/donate/cancel`) states that no charge was made.

## Run locally

```bash
npm install
npx prisma db push
npm run dev
```

The dev server binds to `0.0.0.0:43127`. Open [http://127.0.0.1:43127](http://127.0.0.1:43127). `next.config.ts` lists `127.0.0.1` and `localhost` in `allowedDevOrigins` so the dev socket is allowed when the process listens on all interfaces.

Email registration and the full sign flow work with no API keys. Copy `.env.example` to `.env.local` when you want OAuth or donations.

### Stripe test keys

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Restart `npm run dev` after changing `NEXT_PUBLIC_` values. Use Stripe’s test card `4242 4242 4242 4242` with any future expiry and any CVC. On plain HTTP (including this local URL) Stripe shows the card field and hides Apple Pay / Google Pay. Wallet buttons appear only after the site is served over HTTPS and the domain is verified.

Optional webhook:

```bash
stripe listen --forward-to localhost:43127/api/stripe/webhook
```

Put the signing secret in `STRIPE_WEBHOOK_SECRET`. Without it, the webhook route refuses the event instead of pretending it was processed.

### OAuth

Set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` and `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`. Buttons stay visible and explain which variables are missing when they are unset.
