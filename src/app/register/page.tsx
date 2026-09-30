import type { Metadata } from "next"
import { oauthButtons } from "@/auth"
import { RegisterForm } from "@/components/auth-panel"

export const metadata: Metadata = { title: "Create an account" }

export default function RegisterPage() {
  return <RegisterForm providers={oauthButtons} />
}
