"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GitMerge, Lightbulb, IndianRupee, Leaf, Flame } from "lucide-react"
import Link from "next/link"

interface Opportunity {
  id: string;
  type: 'match' | 'product';
  title: string;
  score: number;
  co2Impact: number;
  financialImpact: number;
  status: string;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/opportunities")
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then(data => {
        setOpportunities(data.opportunities ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Opportunities</h1>
        <p className="text-zinc-400 mt-1">Ranked feed of symbiotic matches and product concepts discovered by the swarm.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 bg-zinc-900/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-12 text-center border border-zinc-800 rounded-xl bg-zinc-950/50">
          <Flame className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No Opportunities Yet</h3>
          <p className="text-zinc-500 mt-2">The swarm is still analyzing the cluster.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp, index) => (
            <Card key={opp.id} className="bg-zinc-950/50 border-zinc-800 hover:bg-zinc-900/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${opp.type === 'match' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {opp.type === 'match' ? <GitMerge className="w-6 h-6" /> : <Lightbulb className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300 uppercase text-[10px]">
                          Rank #{index + 1}
                        </Badge>
                        <Badge variant={opp.status === "Active" ? "default" : "secondary"}>
                          {opp.status}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-100">{opp.title}</h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 md:gap-8 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-1">Score</p>
                      <p className="text-xl font-mono text-zinc-200">{opp.score}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-1 flex items-center justify-center gap-1"><IndianRupee className="w-3 h-3"/> Value</p>
                      <p className="text-xl font-medium text-zinc-200">₹{opp.financialImpact.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-1 flex items-center justify-center gap-1"><Leaf className="w-3 h-3"/> CO2</p>
                      <p className="text-xl font-medium text-emerald-400">{opp.co2Impact}t</p>
                    </div>
                  </div>
                </div>
                
                {(opp.status === 'Blueprint Ready' || opp.status === 'Active') && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-end">
                    <Link href={`/blueprints/${opp.id}`}>
                      <Button variant="outline" size="sm" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                        View Blueprint
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
