import type { Metadata } from "next"
import { oauthButtons } from "@/auth"
import { LoginForm } from "@/components/auth-panel"

export const metadata: Metadata = { title: "Log in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams
  return <LoginForm callbackUrl={callbackUrl} providers={oauthButtons} />
}
