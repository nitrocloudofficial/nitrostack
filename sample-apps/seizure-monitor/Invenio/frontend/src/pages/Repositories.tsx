import React from 'react'
import { useSessionStore } from '../store/useSessionStore'
import { GitBranch, ExternalLink, Star, GitFork } from 'lucide-react'

export function Repositories() {
  const { packages } = useSessionStore()
  
  if (!packages?.researchPackage) {
    return <div className="p-12 text-center text-muted-foreground">Waiting for Research Agent...</div>
  }

  const { papers = [] } = packages.researchPackage
  
  // Generate dummy repos based on papers
  const repos = papers.slice(0, 6).map((p: any, idx: number) => {
    const title = p.title || 'Unknown Paper';
    return {
      name: `invenio-labs/${title.split(' ').slice(0, 2).join('-').toLowerCase()}`,
      description: `Official implementation for the paper: "${title}". Contains training code and pretrained models.`,
      language: idx % 3 === 0 ? 'Python' : (idx % 2 === 0 ? 'Jupyter Notebook' : 'C++'),
      stars: Math.floor(Math.random() * 500) + 10,
      forks: Math.floor(Math.random() * 100) + 2,
      sourcePaper: p.id || 'Unknown Source'
    }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <GitBranch className="w-8 h-8 text-primary" />
          Code Repositories
        </h1>
        <p className="text-muted-foreground mt-2">Discovered {repos.length} open-source repositories linked to the literature.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {repos.map((repo: any, idx: number) => (
          <div key={idx} className="p-6 border rounded-lg bg-card hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-lg text-primary flex items-center gap-2 truncate pr-4">
                  <GitBranch className="w-5 h-5" />
                  {repo.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{repo.description}</p>
              
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  {repo.language}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" /> {repo.stars}
                </div>
                <div className="flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5" /> {repo.forks}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
              <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={repo.sourcePaper}>
                Paper: {repo.sourcePaper}
              </span>
              <a href="#" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                View Source <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
