import { FlaskConical, SearchX, AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  type: 'empty' | 'error' | 'initial'
  message?: string
}

export function EmptyState({ type, message }: EmptyStateProps) {
  const config = {
    initial: {
      icon: <FlaskConical className="w-10 h-10 text-cyan-400" />,
      title: 'Discover Research',
      description: 'Search across OpenAlex, arXiv, and Crossref simultaneously.',
      glow: 'rgba(6, 182, 212, 0.2)',
      bg: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1))',
      border: 'rgba(6,182,212,0.2)',
    },
    empty: {
      icon: <SearchX className="w-10 h-10 text-slate-400" />,
      title: 'No results found',
      description: 'Try adjusting your search terms or filters to find what you need.',
      glow: 'rgba(148, 163, 184, 0.1)',
      bg: 'rgba(255,255,255,0.02)',
      border: 'rgba(255,255,255,0.05)',
    },
    error: {
      icon: <AlertCircle className="w-10 h-10 text-rose-400" />,
      title: 'Something went wrong',
      description: message || 'Failed to fetch research results. Please try again.',
      glow: 'rgba(244, 63, 94, 0.2)',
      bg: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(225,29,72,0.05))',
      border: 'rgba(244,63,94,0.2)',
    },
  }

  const { icon, title, description, glow, bg, border } = config[type]

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6 glass-card rounded-3xl relative overflow-hidden">
      {/* Ambient background glow for the empty state */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
        style={{ background: glow }}
      />
      
      <div 
        className="p-5 rounded-2xl mb-6 relative z-10 shadow-xl"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        {icon}
      </div>
      
      <h3 className="text-2xl font-bold mb-3 text-white relative z-10 tracking-tight">{title}</h3>
      <p className="text-slate-400 text-base max-w-sm relative z-10 font-medium leading-relaxed">
        {description}
      </p>
    </div>
  )
}
