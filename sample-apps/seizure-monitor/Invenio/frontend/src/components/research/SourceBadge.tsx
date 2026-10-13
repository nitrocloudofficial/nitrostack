interface SourceBadgeProps {
  source: 'openalex' | 'arxiv' | 'crossref' | string
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const config: Record<string, { label: string; style: React.CSSProperties }> = {
    openalex: { 
      label: 'OpenAlex', 
      style: {
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.1))',
        border: '1px solid rgba(96, 165, 250, 0.4)',
        color: '#93c5fd',
        boxShadow: '0 2px 12px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
      }
    },
    arxiv: { 
      label: 'arXiv', 
      style: {
        background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(225, 29, 72, 0.1))',
        border: '1px solid rgba(251, 113, 133, 0.4)',
        color: '#fda4af',
        boxShadow: '0 2px 12px rgba(244,63,94,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
      }
    },
    crossref: { 
      label: 'Crossref', 
      style: {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.1))',
        border: '1px solid rgba(52, 211, 153, 0.4)',
        color: '#6ee7b7',
        boxShadow: '0 2px 12px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
      }
    },
  }

  const badgeConfig = config[source?.toLowerCase()] || { 
    label: source, 
    style: {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#e2e8f0',
      boxShadow: '0 2px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
    }
  }

  return (
    <span 
      className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest backdrop-blur-md"
      style={badgeConfig.style}
    >
      {badgeConfig.label}
    </span>
  )
}

