import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function DonateCancelPage() {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-4 py-16">
      <h1 className="text-3xl">Donation canceled</h1>
      <p className="text-muted-foreground">
        No charge was made. You can try again whenever you like.
      </p>
      <Link href="/donate" className={cn(buttonVariants(), "h-10 w-fit px-4")}>
        Return to the donation form
      </Link>
    </div>
  )
}
