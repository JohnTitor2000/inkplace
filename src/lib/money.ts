export const PRESET_CENTS = [300, 500, 1000] as const
export const MIN_CENTS = 100
export const MAX_CENTS = 100_000

export function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim().replace(/^\$/, "")
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const [dollars, fraction = ""] = trimmed.split(".")
  const cents = Number(dollars) * 100 + Number((fraction + "00").slice(0, 2))
  if (!Number.isSafeInteger(cents)) return null
  return cents
}

export function isAllowedDonationCents(cents: number) {
  return (
    Number.isInteger(cents) && cents >= MIN_CENTS && cents <= MAX_CENTS
  )
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}
