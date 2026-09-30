import Link from "next/link"
import { auth, signOut } from "@/auth"
import { Button } from "@/components/ui/button"

export async function SiteHeader() {
  const session = await auth()
  const label = session?.user?.name || session?.user?.email

  return (
    <header className="border-b border-border/80 bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="mr-auto flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            In
          </span>
          <span className="font-heading text-lg leading-none">Inkplace</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href="/app/sign" className="hover:underline">
            Sign
          </Link>
          <Link href="/#support" className="hover:underline">
            Support
          </Link>
          {session ? (
            <Link href="/app" className="hover:underline">
              Library
            </Link>
          ) : (
            <Link href="/login" className="hover:underline">
              Log in
            </Link>
          )}
        </nav>
        {session ? (
          <div className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">
              {label}
            </span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Log out
              </Button>
            </form>
          </div>
        ) : (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/register" />}
          >
            Create account
          </Button>
        )}
      </div>
    </header>
  )
}
