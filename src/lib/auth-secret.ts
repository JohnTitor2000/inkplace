/** Local fallback so email login works with no env file. Set AUTH_SECRET in production. */
export const authSecret =
  process.env.AUTH_SECRET || "dev-only-inkplace-secret-change-me"
