import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { ISearchFilters } from '@/types'

interface SearchBarProps {
  onSearch: (filters: Partial<ISearchFilters>) => void
  initialQuery?: string
}

export function SearchBar({ onSearch, initialQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== initialQuery) {
        onSearch({ query })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [query, onSearch, initialQuery])

  return (
    <div className="relative w-full max-w-2xl group">
      <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10">
        <Search className="w-5 h-5" />
      </div>
      <input
        type="search"
        className="block w-full py-4 pl-14 pr-5 text-base rounded-2xl transition-all duration-300 text-white placeholder:text-slate-500 focus:outline-none"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 2px 4px rgba(0,0,0,0.1)',
        }}
        placeholder="Search for papers, e.g., 'protein folding' or 'transformer models'..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)';
          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(6, 182, 212, 0.1), 0 16px 48px rgba(6, 182, 212, 0.15), inset 0 2px 4px rgba(0,0,0,0.1)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2), inset 0 2px 4px rgba(0,0,0,0.1)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
        }}
      />
    </div>
  )
}
