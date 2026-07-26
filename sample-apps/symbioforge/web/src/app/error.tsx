"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertOctagon } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] animate-in zoom-in duration-500">
      <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 mb-6">
        <AlertOctagon className="h-12 w-12 text-red-500" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-100 mb-2">Something went wrong!</h1>
      <p className="text-zinc-400 mb-8 max-w-md text-center">
        An unexpected error occurred while loading this page. Our Sentinel agent has been notified.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} className="bg-emerald-600 hover:bg-emerald-500 text-white">
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/'} className="border-zinc-700 text-zinc-300">
          Go Home
        </Button>
      </div>
    </div>
  )
}
