import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The process binds to 0.0.0.0, but the browser opens 127.0.0.1.
  // Without this, Next blocks the HMR socket and the RSC debug channel
  // never finishes, so the page stays as static HTML.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
}

export default nextConfig
