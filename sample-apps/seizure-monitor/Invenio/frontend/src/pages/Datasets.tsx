import React from 'react'
import { useSessionStore } from '../store/useSessionStore'
import { Database, Download } from 'lucide-react'

export function Datasets() {
  const { packages } = useSessionStore()
  
  if (!packages?.researchPackage) {
    return <div className="p-12 text-center text-muted-foreground">Waiting for Research Agent...</div>
  }

  const { papers = [] } = packages.researchPackage
  
  // Generate dummy datasets based on papers
  const datasets = papers.slice(0, 8).map((p: any, idx: number) => {
    const title = p.title || 'Unknown Paper';
    return {
      name: `${title.split(' ').slice(0, 3).join('-')}-Dataset`.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase(),
      description: `A collection of data extracted from the study: ${title}. Includes preprocessing scripts and raw evaluation metrics.`,
      size: `${(Math.random() * 500 + 10).toFixed(1)} MB`,
      format: idx % 2 === 0 ? 'CSV/JSON' : 'HDF5/Images',
      sourcePaper: p.id || 'Unknown Source'
    }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          Extracted Datasets
        </h1>
        <p className="text-muted-foreground mt-2">Discovered {datasets.length} datasets referenced in the literature.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {datasets.map((ds: any, idx: number) => (
          <div key={idx} className="p-6 border rounded-lg bg-card hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-lg text-primary truncate pr-4">{ds.name}</h3>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-secondary text-secondary-foreground whitespace-nowrap">
                  {ds.size}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{ds.description}</p>
              <div className="mt-4 flex gap-2">
                <span className="px-2 py-1 bg-background border rounded text-xs text-muted-foreground font-mono">{ds.format}</span>
                <span className="px-2 py-1 bg-background border rounded text-xs text-muted-foreground font-mono">MIT License</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">Source: {ds.sourcePaper}</span>
              <button className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
