import { ISearchFilters } from '@/types'
import { motion } from 'framer-motion'

interface FilterPanelProps {
  filters: Partial<ISearchFilters>
  onFilterChange: (filters: Partial<ISearchFilters>) => void
}

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const sources = [
    { id: 'all', label: 'All Sources' },
    { id: 'openalex', label: 'OpenAlex' },
    { id: 'arxiv', label: 'arXiv' },
    { id: 'crossref', label: 'Crossref' },
  ]

  return (
    <div className="w-full space-y-8">
      <div>
        <h4 className="font-extrabold mb-6 text-[11px] tracking-[0.25em] uppercase text-slate-400">Data Sources</h4>
        <div className="space-y-2">
          {sources.map((source) => {
            const isActive = (filters.source || 'all') === source.id
            return (
              <motion.label
                key={source.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-4 text-[14px] cursor-pointer group p-3 rounded-2xl transition-all relative overflow-hidden"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.01)',
                  border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none'
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.01)' }}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-50 pointer-events-none" />
                )}
                
                <div
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-300 relative z-10"
                  style={{
                    border: isActive ? '2px solid #22d3ee' : '2px solid rgba(255,255,255,0.15)',
                    background: isActive ? 'rgba(34,211,238,0.1)' : 'rgba(0,0,0,0.2)',
                    boxShadow: isActive ? '0 0 12px rgba(34,211,238,0.4), inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  <motion.div
                    initial={false}
                    animate={{ scale: isActive ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="w-2.5 h-2.5 rounded-full bg-cyan-400"
                    style={{
                      boxShadow: '0 0 10px rgba(34,211,238,0.8)'
                    }}
                  />
                </div>
                <input
                  type="radio"
                  name="source"
                  value={source.id}
                  checked={isActive}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? undefined : (e.target.value as any)
                    onFilterChange({ source: val })
                  }}
                  className="sr-only"
                />
                <span className={`transition-all duration-300 font-semibold relative z-10 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}>{source.label}</span>
              </motion.label>
            )
          })}
        </div>
      </div>

      <div className="pt-6 border-t border-white/10">
        <div className="p-5 rounded-2xl border border-dashed border-white/10 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <p className="text-[12px] text-slate-500/80 leading-relaxed font-mono font-medium">
            <span className="text-blue-400/70 mr-2">{"//"}</span> 
            Time range & citation filters arriving in Phase 3 with advanced Knowledge Graph integration.
          </p>
        </div>
      </div>
    </div>
  )
}

