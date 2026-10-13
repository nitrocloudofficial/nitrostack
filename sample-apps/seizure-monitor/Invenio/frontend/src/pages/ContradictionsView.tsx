import React from 'react'
import { useSessionStore } from '../store/useSessionStore'
import { AlertTriangle, Scale } from 'lucide-react'

export function ContradictionsView() {
  const { packages, setInspectorNode } = useSessionStore()
  
  if (!packages?.evidencePackage) {
    return <div className="p-12 text-center text-muted-foreground">Waiting for Evidence Agent...</div>
  }

  const { contradictions = [] } = packages.evidencePackage

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-8 h-8" />
          Contradictions Detected
        </h1>
        <p className="text-muted-foreground mt-2">Found {contradictions.length} conflicting claims across the literature.</p>
      </header>

      {contradictions.length === 0 ? (
        <div className="p-12 border rounded-lg bg-card text-center text-muted-foreground">
          No contradictions detected in this dataset.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {contradictions.map((c: any, idx: number) => (
            <div 
              key={idx} 
              className="p-6 rounded-lg border border-red-500/30 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors"
              onClick={() => setInspectorNode({ ...c, type: 'Contradiction' })}
            >
              <h4 className="font-semibold text-lg text-foreground mb-4">{c.description}</h4>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 p-4 bg-background rounded-md border shadow-sm">
                  <span className="text-xs font-bold text-red-500 uppercase flex items-center gap-2 mb-2">Claim A</span>
                  <p className="text-sm">{c.evidence.claim_1.text}</p>
                  <p className="text-xs text-muted-foreground mt-4 truncate">Source: {c.evidence.claim_1.source_id}</p>
                </div>
                <div className="flex items-center justify-center">
                  <Scale className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div className="flex-1 p-4 bg-background rounded-md border shadow-sm">
                  <span className="text-xs font-bold text-red-500 uppercase flex items-center gap-2 mb-2">Claim B</span>
                  <p className="text-sm">{c.evidence.claim_2.text}</p>
                  <p className="text-xs text-muted-foreground mt-4 truncate">Source: {c.evidence.claim_2.source_id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
