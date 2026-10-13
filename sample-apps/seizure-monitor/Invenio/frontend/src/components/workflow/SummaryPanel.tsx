import { motion } from 'framer-motion'
import { FileText, CheckCircle2, FlaskConical, Network, Lightbulb } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SummaryPanelProps {
  runId: string
  summary: Record<string, any>
  onClose: () => void
}

export function SummaryPanel({ runId, summary, onClose }: SummaryPanelProps) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-card border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 rounded-2xl p-6 w-[520px] z-50"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-xl bg-emerald-500/20">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-gradient-premium">Research Workflow Complete</h2>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg glass border border-white/10 transition-all">Dismiss</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 glass-card rounded-2xl border border-blue-500/20 flex flex-col items-center justify-center text-center">
          <FlaskConical className="w-5 h-5 text-blue-400 mb-2" />
          <span className="text-2xl font-bold text-gradient-premium">{summary.total_papers || 0}</span>
          <span className="text-xs text-muted-foreground mt-1">Papers</span>
        </div>
        <div className="p-4 glass-card rounded-2xl border border-violet-500/20 flex flex-col items-center justify-center text-center">
          <Network className="w-5 h-5 text-violet-400 mb-2" />
          <span className="text-2xl font-bold text-gradient-premium">{summary.gaps_found || 0}</span>
          <span className="text-xs text-muted-foreground mt-1">Gaps Found</span>
        </div>
        <div className="p-4 glass-card rounded-2xl border border-amber-500/20 flex flex-col items-center justify-center text-center">
          <Lightbulb className="w-5 h-5 text-amber-400 mb-2" />
          <span className="text-2xl font-bold text-gradient-premium">{summary.opportunities_found || 0}</span>
          <span className="text-xs text-muted-foreground mt-1">Opportunities</span>
        </div>
      </div>

      {summary.ready_for_report && (
        <button 
          onClick={() => navigate(`/workspace?run_id=${runId}`)}
          className="w-full py-3.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-violet-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <FileText className="w-4 h-4" />
          Open Research Workspace
        </button>
      )}
    </motion.div>
  )
}
