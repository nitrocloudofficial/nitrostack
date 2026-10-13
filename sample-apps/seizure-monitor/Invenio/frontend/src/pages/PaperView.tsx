import React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useSessionStore } from '../store/useSessionStore'
import { FileText, ExternalLink, Calendar, Users, Eye } from 'lucide-react'

export function PaperView() {
  const { packages, setInspectorNode } = useSessionStore()
  
  if (!packages?.researchPackage) {
    return <div className="p-12 text-center text-muted-foreground">Waiting for Research Agent...</div>
  }

  const papers = packages.researchPackage.papers || []

  return (
    <div className="max-w-5xl mx-auto space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <header className="shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl font-bold text-gradient-premium">Research Papers</h1>
        <p className="text-muted-foreground">Found {papers.length} peer-reviewed publications.</p>
      </header>
      
      <div className="flex-1 rounded-2xl shadow-sm glass-card overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
        <Virtuoso
          style={{ height: '100%' }}
          data={papers}
          itemContent={(index, paper: any) => (
            <div 
              className="p-6 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
              onClick={() => setInspectorNode({ ...paper, type: 'Paper' })}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-primary">{paper.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {paper.publication_year || 'Unknown'}</span>
                    <span className="flex items-center gap-1">Citations: {paper.citation_count}</span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2 mt-2">{paper.abstract}</p>
                </div>
                <div className="shrink-0 flex space-x-2">
                  {paper.pdf_url && (
                    <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80" onClick={e => e.stopPropagation()}>
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                  {paper.url && (
                    <a href={paper.url} target="_blank" rel="noreferrer" className="p-2 border rounded-md hover:bg-muted" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}
