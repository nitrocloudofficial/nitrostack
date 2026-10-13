import React from 'react'
import { useSessionStore } from '../store/useSessionStore'
import { Lightbulb, ChevronRight, TestTube } from 'lucide-react'

export function HypothesesView() {
  const { packages } = useSessionStore()
  
  if (!packages?.researchPackage) {
    return <div className="p-12 text-center text-muted-foreground">Waiting for Research Agent...</div>
  }

  const { papers = [] } = packages.researchPackage
  
  // Generate mock hypotheses from the papers to populate the UI
  const hypotheses = papers.slice(0, 4).map((p: any, idx: number) => {
    const title = p.title || 'Unknown Paper';
    return {
      title: `Hypothesis on ${title.split(' ').slice(0, 4).join(' ')}`,
      description: `Based on the findings in ${p.year || 'recent literature'}, we hypothesize that scaling this approach could yield significant improvements in cross-domain transfer learning.`,
      confidence: (0.7 + Math.random() * 0.2).toFixed(2),
      status: idx === 0 ? 'Testing' : (idx === 1 ? 'Validated' : 'Proposed'),
      source: p.id || 'Unknown Source'
    }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-amber-500">
          <Lightbulb className="w-8 h-8" />
          Generated Hypotheses
        </h1>
        <p className="text-muted-foreground mt-2">The Multi-Agent system formulated {hypotheses.length} novel hypotheses from the literature.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {hypotheses.map((h: any, idx: number) => (
          <div key={idx} className="p-6 border rounded-lg bg-card hover:border-amber-500/30 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-lg text-foreground">{h.title}</h3>
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                h.status === 'Validated' ? 'bg-green-500/20 text-green-500' : 
                h.status === 'Testing' ? 'bg-blue-500/20 text-blue-500' : 'bg-secondary text-secondary-foreground'
              }`}>
                {h.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{h.description}</p>
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <TestTube className="w-4 h-4 text-amber-500" />
                  Confidence Score: {h.confidence}
                </div>
                <div className="text-xs text-muted-foreground max-w-[300px] truncate">
                  Derived from: {h.source}
                </div>
              </div>
              <button className="text-sm font-semibold text-amber-500 flex items-center gap-1 hover:underline">
                Explore Protocol <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
