import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] animate-in zoom-in duration-500">
      <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800 mb-6">
        <AlertCircle className="h-12 w-12 text-zinc-500" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight text-zinc-100 mb-2">404 - Not Found</h1>
      <p className="text-zinc-400 mb-8 max-w-md text-center">
        The page you are looking for does not exist or has been moved. Check the URL or return home.
      </p>
      <Link href="/">
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  )
}
