import type { Metadata } from "next"
import { Fraunces, Source_Sans_3 } from "next/font/google"
import { Providers } from "@/components/providers"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Inkplace",
    template: "%s · Inkplace",
  },
  description:
    "Place a signature image on a PDF. Draw it, upload it, or lift it from a scan, then download the file.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border/80 px-4 py-6 text-center text-sm text-muted-foreground">
            Inkplace stamps a picture of a signature onto a PDF. It does not
            issue a digital certificate or verify identity.
          </footer>
        </Providers>
      </body>
    </html>
  )
}
