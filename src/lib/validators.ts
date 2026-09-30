export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200
}

export function isPngDataUrl(value: string) {
  return (
    value.startsWith("data:image/png;base64,") &&
    value.length > 40 &&
    value.length < 2_500_000
  )
}

export function safeCallbackPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app"
  return value
}
