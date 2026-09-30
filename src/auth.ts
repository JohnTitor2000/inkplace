import NextAuth from "next-auth"
import Apple from "next-auth/providers/apple"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import type { NextAuthConfig } from "next-auth"
import { authSecret } from "@/lib/auth-secret"
import { prisma } from "@/lib/prisma"
import { isEmail, normalizeEmail } from "@/lib/validators"

export type OAuthButtonConfig = {
  id: "google" | "apple" | "microsoft-entra-id" | "github"
  label: string
  enabled: boolean
  missing: string
}

function missingMessage(service: string, names: string[]) {
  if (names.length === 0) return ""
  if (names.length === 1) return `${service} sign-in needs ${names[0]}.`
  const listed = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
  return `${service} sign-in needs ${listed}.`
}

function unset(vars: Record<string, string | undefined>) {
  return Object.entries(vars)
    .filter(([, value]) => !value)
    .map(([name]) => name)
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email =
        typeof credentials?.email === "string"
          ? normalizeEmail(credentials.email)
          : ""
      const password =
        typeof credentials?.password === "string" ? credentials.password : ""
      if (!isEmail(email) || password.length < 8) return null
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user?.passwordHash) return null
      const matches = await bcrypt.compare(password, user.passwordHash)
      if (!matches) return null
      return { id: user.id, email: user.email, name: user.name }
    },
  }),
]

const googleId = process.env.AUTH_GOOGLE_ID
const googleSecret = process.env.AUTH_GOOGLE_SECRET
const appleId = process.env.AUTH_APPLE_ID
const appleSecret = process.env.AUTH_APPLE_SECRET
const microsoftId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID
const microsoftSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
const microsoftIssuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
const githubId = process.env.AUTH_GITHUB_ID
const githubSecret = process.env.AUTH_GITHUB_SECRET

if (googleId && googleSecret) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  )
}

if (appleId && appleSecret) {
  providers.push(
    Apple({
      clientId: appleId,
      clientSecret: appleSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  )
}

if (microsoftId && microsoftSecret) {
  providers.push(
    MicrosoftEntraID({
      clientId: microsoftId,
      clientSecret: microsoftSecret,
      allowDangerousEmailAccountLinking: true,
      ...(microsoftIssuer ? { issuer: microsoftIssuer } : {}),
    }),
  )
}

if (githubId && githubSecret) {
  providers.push(
    GitHub({
      clientId: githubId,
      clientSecret: githubSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  )
}

export const oauthButtons: OAuthButtonConfig[] = [
  {
    id: "google",
    label: "Continue with Google",
    enabled: Boolean(googleId && googleSecret),
    missing: missingMessage(
      "Google",
      unset({ AUTH_GOOGLE_ID: googleId, AUTH_GOOGLE_SECRET: googleSecret }),
    ),
  },
  {
    id: "apple",
    label: "Continue with Apple",
    enabled: Boolean(appleId && appleSecret),
    missing: missingMessage(
      "Apple",
      unset({ AUTH_APPLE_ID: appleId, AUTH_APPLE_SECRET: appleSecret }),
    ),
  },
  {
    id: "microsoft-entra-id",
    label: "Continue with Microsoft",
    enabled: Boolean(microsoftId && microsoftSecret),
    missing: missingMessage(
      "Microsoft",
      unset({
        AUTH_MICROSOFT_ENTRA_ID_ID: microsoftId,
        AUTH_MICROSOFT_ENTRA_ID_SECRET: microsoftSecret,
      }),
    ),
  },
  {
    id: "github",
    label: "Continue with GitHub",
    enabled: Boolean(githubId && githubSecret),
    missing: missingMessage(
      "GitHub",
      unset({ AUTH_GITHUB_ID: githubId, AUTH_GITHUB_SECRET: githubSecret }),
    ),
  },
]

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: authSecret,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub
      return session
    },
  },
})
