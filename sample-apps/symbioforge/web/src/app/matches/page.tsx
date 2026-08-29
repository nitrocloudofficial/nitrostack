"use client"

import { useEffect, useState } from "react"
import { SymbioticMatch } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight, Network, FileDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function MatchesPage() {
  const [matches, setMatches] = useState<SymbioticMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/matches")
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then(data => {
        setMatches(data.matches || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-400">
        <Network className="h-12 w-12 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-zinc-300">No Matches Found</h2>
        <p className="mt-2 text-sm text-center max-w-md">The Matchmaker agent has not identified any symbiotic links between factories yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Symbiotic Matches</h1>
          <p className="text-zinc-400 mt-1">Directory of established waste-to-resource links across the industrial cluster.</p>
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300">
          <FileDown className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-950/50 backdrop-blur overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Resource Exchange</TableHead>
              <TableHead className="text-zinc-400 text-center">Score</TableHead>
              <TableHead className="text-zinc-400 text-right">Volume (Tons/Yr)</TableHead>
              <TableHead className="text-zinc-400 text-right">Value (INR/Yr)</TableHead>
              <TableHead className="text-zinc-400 text-center">Status</TableHead>
              <TableHead className="text-zinc-400 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map((match) => (
              <TableRow key={match.id} className="border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                <TableCell>
                  <div className="font-medium text-zinc-200">{match.wasteStreamName}</div>
                  <div className="flex items-center text-xs text-zinc-500 mt-1">
                    <span className="truncate max-w-[120px]">{match.sourceFactoryName}</span>
                    <ArrowRight className="h-3 w-3 mx-2 shrink-0 text-emerald-500" />
                    <span className="truncate max-w-[120px]">{match.targetFactoryName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold text-xs">
                      {match.compatibilityScore}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-zinc-300">
                  {match.volumeTonsPerYear.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-zinc-300">
                  ₹{match.savingsInrPerYear.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={
                    match.status === 'Active' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' :
                    match.status === 'Blueprint Ready' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' :
                    'border-zinc-600 text-zinc-400'
                  }>
                    {match.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {(match.status === 'Blueprint Ready' || match.status === 'Active') ? (
                    <Link href={`/blueprints/${match.id}`}>
                      <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10">
                        View Blueprint
                      </Button>
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-600">No blueprint</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
