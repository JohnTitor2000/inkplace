"use client"

import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-4 py-16">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="text-muted-foreground">
        {error.message || "The page failed to load. Try it again."}
      </p>
      <Button type="button" className="h-10 w-fit" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
