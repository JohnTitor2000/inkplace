"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"
import { Toaster } from "sonner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster theme="light" position="top-center" />
    </SessionProvider>
  )
}
