import React from 'react'
import { useSessionStore } from '../store/useSessionStore'
import { Users } from 'lucide-react'

export function AuthorsView() {
  const { packages } = useSessionStore()
  
  if (!packages?.researchPackage) {
    return <div className="p-12 text-center text-muted-foreground">Waiting for Research Agent...</div>
  }

  const { papers = [] } = packages.researchPackage
  
  // Extract unique authors
  const authorSet = new Set<string>()
  papers.forEach((p: any) => p.authors?.forEach((a: any) => authorSet.add(a.name || a || 'Unknown')))
  const authors = Array.from(authorSet).sort()

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          Extracted Authors
        </h1>
        <p className="text-muted-foreground mt-2">Discovered {authors.length} unique authors across {papers.length} papers.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {authors.map((author, idx) => (
          <div key={idx} className="p-4 border rounded-lg bg-card hover:border-primary/50 cursor-pointer transition-colors">
            <h3 className="font-semibold text-sm">{author}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {papers.filter((p: any) => p.authors?.some((a: any) => (a.name || a) === author)).length} Paper(s)
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
