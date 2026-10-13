import { IPaper } from '@/types'
import { SourceBadge } from './SourceBadge'
import { FileText, ExternalLink, Calendar, Quote } from 'lucide-react'
import { motion } from 'framer-motion'

interface PaperCardProps {
  paper: IPaper
}

export function PaperCard({ paper }: PaperCardProps) {
  const authorNames = paper.authors.map((a) => a.name).join(', ')

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative p-7 rounded-[24px] group overflow-hidden"
      style={{
        background: 'rgba(8, 12, 20, 0.4)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Dynamic Hover Glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute -inset-px rounded-[24px] bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-violet-500/20 z-0" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start gap-6 mb-5">
          <h3 className="text-[22px] font-bold leading-tight text-white/90 group-hover:text-white transition-colors duration-300">
            {paper.title}
          </h3>
          <div className="flex-shrink-0 mt-1">
            <SourceBadge source={paper.source} />
          </div>
        </div>

        <div className="text-sm font-medium text-slate-400/80 mb-5 tracking-wide">
          {authorNames || 'Unknown Authors'}
        </div>

        <div className="flex flex-wrap gap-3 text-[13px] font-medium text-slate-300 mb-6">
          {paper.year && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md shadow-sm">
              <Calendar className="w-4 h-4 text-cyan-400/80" />
              {paper.year}
            </div>
          )}
          {paper.journal && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400/80" />
              {paper.journal}
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md shadow-sm">
            <Quote className="w-4 h-4 text-blue-400/80" />
            {paper.citation_count} citations
          </div>
        </div>

        {paper.abstract && (
          <p className="text-sm text-slate-400/90 leading-[1.8] line-clamp-3 mb-7 font-normal">
            {paper.abstract}
          </p>
        )}

        {paper.keywords && paper.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-7">
            {paper.keywords.slice(0, 5).map((kw, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-widest transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#94a3b8'
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10 mt-auto">
          <div className="flex gap-3">
            {paper.url && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl shadow-lg transition-shadow duration-300 hover:shadow-blue-500/25"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <ExternalLink className="w-4 h-4 text-blue-200" />
                Source
              </motion.a>
            )}
            {paper.pdf_url && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={paper.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  color: '#fb7185',
                  backdropFilter: 'blur(10px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)'
                  e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.3)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(244, 63, 94, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.2)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <FileText className="w-4 h-4" />
                PDF
              </motion.a>
            )}
          </div>
          
          {paper.doi && (
            <span className="text-[12px] text-slate-500 font-mono flex items-center gap-2 group-hover:text-slate-300 transition-colors bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
              <span className="uppercase tracking-widest font-bold text-slate-400">DOI</span>
              {paper.doi}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

