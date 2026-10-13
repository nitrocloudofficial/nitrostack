import { motion, Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PlaceholderModule {
  label: string
  description: string
  phase: string
}

interface PagePlaceholderProps {
  /** Page title */
  title: string
  /** One-line description of the page purpose */
  description: string
  /** Lucide icon component */
  icon: React.ReactNode
  /** Future modules/panels to preview */
  modules?: PlaceholderModule[]
  /** Optional badge text (e.g. "Phase 2") */
  phaseBadge?: string
  /** Optional class name */
  className?: string
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export function PagePlaceholder({
  title,
  description,
  icon,
  modules = [],
  phaseBadge = 'Phase 2',
  className,
}: PagePlaceholderProps) {
  return (
    <div className={cn('h-full min-h-screen p-6 md:p-10 relative overflow-hidden', className)}>
      {/* ── Ambient Background Lighting ──────────────── */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-violet-500/10 to-transparent blur-[120px] rounded-full pointer-events-none -z-10" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto space-y-12 relative z-10"
      >
        {/* ── Page Header ──────────────────────────── */}
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center gap-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 179, 237, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <div className="text-violet-400 [&>svg]:w-7 [&>svg]:h-7">
                {icon}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">{title}</h2>
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8'
                  }}
                >
                  {phaseBadge}
                </span>
              </div>
              <p className="text-base text-slate-400 font-medium">{description}</p>
            </div>
          </div>
        </motion.div>

        {/* ── Status Banner ────────────────────────── */}
        <motion.div
          variants={item}
          className="flex items-center gap-4 px-6 py-5 rounded-2xl glass"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-slate-500 flex-shrink-0 animate-pulse" />
          <p className="text-sm text-slate-400 font-medium">
            This module is part of the Invenio architecture foundation. Implementation begins in{' '}
            <span className="text-white font-bold">{phaseBadge}</span>. The layout and
            structure are ready for development.
          </p>
        </motion.div>

        {/* ── Module Panels ─────────────────────────── */}
        {modules.length > 0 && (
          <motion.div variants={item} className="space-y-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              Planned Panels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {modules.map((mod) => (
                <motion.div
                  key={mod.label}
                  variants={item}
                  className="group p-6 rounded-3xl glass-card card-hover flex flex-col h-full"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-base font-bold text-slate-200 group-hover:text-white transition-colors">{mod.label}</span>
                    <span
                      className="flex-shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#64748b'
                      }}
                    >
                      {mod.phase}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium mb-5 flex-1">
                    {mod.description}
                  </p>
                  {/* Skeleton lines */}
                  <div className="space-y-2 mt-auto">
                    <div className="h-2 bg-slate-800 rounded-full w-3/4 group-hover:bg-slate-700 transition-colors" />
                    <div className="h-2 bg-slate-800 rounded-full w-1/2 group-hover:bg-slate-700 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Architecture Note ─────────────────────── */}
        <motion.div
          variants={item}
          className="p-5 rounded-2xl border border-dashed border-white/10 mt-8"
          style={{ background: 'rgba(255,255,255,0.01)' }}
        >
          <p className="text-xs text-slate-500 font-mono">
            {'// '}
            <span className="text-slate-300 font-bold">{title}</span>
            {' — see docs/ARCHITECTURE.md for design decisions and docs/PHASES.md for the implementation roadmap.'}
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
