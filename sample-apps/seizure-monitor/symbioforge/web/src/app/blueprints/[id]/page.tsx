"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Blueprint } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Wrench, Factory, DollarSign, Clock, FileText, CheckCircle2 } from "lucide-react"

export default function BlueprintPage() {
  const { id } = useParams()
  const router = useRouter()
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/blueprints/${id}`)
      .then(async res => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then(data => {
        setBlueprint(data.blueprint)
        setLoading(false)
      })
      .catch(e => {
        try {
          const errData = JSON.parse(e.message)
          setError(errData.error || "Blueprint not found")
        } catch {
          setError(e.message || "An unexpected error occurred")
        }
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error || !blueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-400">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-zinc-300">Blueprint Not Found</h2>
        <p className="mt-2 text-sm text-center max-w-md">{error}</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-6 border-zinc-700 text-zinc-300">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 text-sm text-zinc-400 mb-6">
        <button onClick={() => router.back()} className="hover:text-zinc-100 flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <span>/</span>
        <span>Blueprints</span>
        <span>/</span>
        <span className="text-zinc-200 truncate">{blueprint.title}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <Badge variant="outline" className="mb-3 border-emerald-500/50 text-emerald-400 bg-emerald-500/10 capitalize">
            {blueprint.opportunityType} Blueprint
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">{blueprint.title}</h1>
          <p className="text-zinc-400 mt-2 max-w-3xl leading-relaxed">
            Architect-generated implementation plan detailing equipment, capex requirements, and regulatory steps for establishing this symbiotic link.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button variant="outline" className="border-zinc-700 text-zinc-300">Download PDF</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">Approve Execution</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card className="bg-zinc-950/50 border-zinc-800 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Est. CAPEX</p>
                <div className="text-2xl font-bold text-zinc-100 mt-1">₹{(blueprint.capexInr / 100000).toFixed(1)}L</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/50 border-zinc-800 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Payback Period</p>
                <div className="text-2xl font-bold text-zinc-100 mt-1">{blueprint.paybackMonths} Mo</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-800 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Timeline</p>
                <div className="text-2xl font-bold text-zinc-100 mt-1">{blueprint.timelineWeeks} Weeks</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/50 border-zinc-800 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Facility Space</p>
                <div className="text-2xl font-bold text-zinc-100 mt-1">{blueprint.facilityRequirements.spaceSqFt} sqft</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center">
                <Factory className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-zinc-950/50 border-zinc-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100">Implementation Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
                {blueprint.steps.map((step, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-950 bg-emerald-500/20 text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-sm transition-all hover:bg-zinc-900 hover:shadow-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-emerald-400 text-sm">Step {idx + 1}</span>
                      </div>
                      <p className="text-zinc-300 text-sm leading-relaxed">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-950/50 border-zinc-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100 flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-zinc-400" /> Equipment Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {blueprint.equipment.map((eq, i) => (
                  <li key={i} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                    <div className="font-medium text-zinc-200">{eq.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{eq.spec}</div>
                    <div className="text-sm font-mono text-emerald-400 mt-2">₹{(eq.costInr / 100000).toFixed(1)}L</div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-950/50 border-zinc-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100">Regulatory Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc list-inside text-sm text-zinc-300">
                {blueprint.regulatoryNotes.map((note, i) => (
                  <li key={i} className="leading-relaxed">{note}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
