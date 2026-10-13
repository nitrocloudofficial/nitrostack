import { useState } from 'react'
import { ISearchFilters } from '@/types'
import { useResearch } from '@/hooks/useResearch'
import { SearchBar } from '@/components/research/SearchBar'
import { FilterPanel } from '@/components/research/FilterPanel'
import { PaperCard } from '@/components/research/PaperCard'
import { PaperCardSkeleton } from '@/components/research/PaperCardSkeleton'
import { EmptyState } from '@/components/research/EmptyState'
import { FlaskConical } from 'lucide-react'

export function Research() {
  const [filters, setFilters] = useState<ISearchFilters>({ query: '' })

  const { data, isLoading, error } = useResearch(filters)

  const handleSearch = (newFilters: Partial<ISearchFilters>) => {
    setFilters((prev: ISearchFilters) => ({ ...prev, ...newFilters }))
  }

  // Determine which state to show
  const showInitial = !filters.query && !isLoading && !data
  const showLoading = isLoading
  const showError = !!error
  const showEmpty = data && data.papers.length === 0
  const showResults = data && data.papers.length > 0

  return (
    <div className="flex flex-col h-full relative">
      {/* ── Ambient Background Lighting ──────────────── */}
      <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-gradient-radial from-cyan-500/10 to-transparent blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <header className="px-8 py-8 flex-shrink-0 z-20">
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              boxShadow: '0 8px 24px rgba(6, 182, 212, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <FlaskConical className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 drop-shadow-sm">Research Discovery</h1>
            <p className="text-sm font-medium text-slate-400">
              Search across OpenAlex, arXiv, and Crossref simultaneously.
            </p>
          </div>
        </div>

        <SearchBar onSearch={handleSearch} initialQuery={filters.query} />
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden z-10">
        {/* Left Sidebar - Filters */}
        <aside className="hidden md:block w-72 p-8 overflow-y-auto">
          <FilterPanel filters={filters} onFilterChange={handleSearch} />
        </aside>

        {/* Results Area */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {showInitial && <EmptyState type="initial" />}
            
            {showError && <EmptyState type="error" message={error?.message} />}
            
            {showLoading && (
              <div className="space-y-6">
                <PaperCardSkeleton />
                <PaperCardSkeleton />
                <PaperCardSkeleton />
                <PaperCardSkeleton />
              </div>
            )}
            
            {showEmpty && <EmptyState type="empty" />}
            
            {showResults && (
              <>
                <div className="text-sm font-medium text-slate-400 mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  Found {data.total} results
                  {filters.source && <span className="text-slate-300">for source <span className="text-cyan-400 font-bold capitalize">{filters.source}</span></span>}
                </div>
                
                <div className="space-y-6">
                  {data.papers.map((paper: any) => (
                    <PaperCard key={paper.id} paper={paper} />
                  ))}
                </div>
              </>
            )}
            
          </div>
        </main>
      </div>
    </div>
  )
}
