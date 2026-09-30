"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { safeCallbackPath } from "@/lib/validators"

type OAuthButtonConfig = {
  id: "google" | "apple" | "microsoft-entra-id" | "github"
  label: string
  enabled: boolean
  missing: string
}

export function LoginForm({
  callbackUrl,
  providers,
}: {
  callbackUrl?: string
  providers: OAuthButtonConfig[]
}) {
  const router = useRouter()
  const next = safeCallbackPath(callbackUrl)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: next,
    })
    setPending(false)
    if (!result || result.error) {
      setError("Email or password doesn't match.")
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <AuthShell
      title="Log in"
      lede="Use the email you registered with, or one of the providers below when its keys are set."
      providers={providers}
      callbackUrl={next}
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Email" id="email" type="email" value={email} onChange={setEmail} />
        <Field
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
        />
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" disabled={pending} className="h-10">
          {pending ? "Checking…" : "Log in"}
        </Button>
      </form>
    </AuthShell>
  )
}

export function RegisterForm({ providers }: { providers: OAuthButtonConfig[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
    const payload = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    if (!response.ok) {
      setPending(false)
      setError(payload?.error ?? "Could not create the account.")
      return
    }
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/app",
    })
    setPending(false)
    if (!result || result.error) {
      setError("Account created, but login failed. Try logging in.")
      return
    }
    router.push("/app")
    router.refresh()
  }

  return (
    <AuthShell
      title="Create an account"
      lede="Email and a password are enough. The providers below name any keys they still need."
      providers={providers}
      callbackUrl="/app"
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Name" id="name" value={name} onChange={setName} />
        <Field label="Email" id="email" type="email" value={email} onChange={setEmail} />
        <Field
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" disabled={pending} className="h-10">
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  )
}

function AuthShell({
  title,
  lede,
  providers,
  callbackUrl,
  footer,
  children,
}: {
  title: string
  lede: string
  providers: OAuthButtonConfig[]
  callbackUrl: string
  footer: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-4 py-10">
      <div className="grid gap-2">
        <h1 className="text-3xl">{title}</h1>
        <p className="text-muted-foreground">{lede}</p>
      </div>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">{children}</div>
      <div className="grid gap-3">
        {providers.map((provider) => (
          <OAuthButton
            key={provider.id}
            label={provider.label}
            provider={provider.id}
            enabled={provider.enabled}
            callbackUrl={callbackUrl}
            missing={provider.missing}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{footer}</p>
    </div>
  )
}

function OAuthButton({
  label,
  provider,
  enabled,
  callbackUrl,
  missing,
}: {
  label: string
  provider: OAuthButtonConfig["id"]
  enabled: boolean
  callbackUrl: string
  missing: string
}) {
  return (
    <div className="grid gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-10"
        disabled={!enabled}
        onClick={() => signIn(provider, { callbackUrl })}
      >
        {label}
      </Button>
      {enabled ? null : <p className="text-xs text-muted-foreground">{missing}</p>}
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={id !== "name"}
        autoComplete={
          id === "password" ? "current-password" : id === "email" ? "email" : "name"
        }
        className="h-10"
      />
    </div>
  )
}
