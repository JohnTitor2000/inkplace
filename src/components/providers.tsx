"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
        {children}
        <Toaster position="top-center" />
      </ThemeProvider>
    </SessionProvider>
  )
}
