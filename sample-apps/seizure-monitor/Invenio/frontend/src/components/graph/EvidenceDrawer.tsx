import { IGraphEdge } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck } from 'lucide-react'

interface EvidenceDrawerProps {
  edge: IGraphEdge
  onClose: () => void
}

export function EvidenceDrawer({ edge, onClose }: EvidenceDrawerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute top-0 right-0 h-full w-80 bg-card border-l shadow-2xl p-6 z-50 overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-lg leading-tight">Connection Evidence</h3>
            <p className="text-sm text-muted-foreground mt-1 text-primary">
              Match Score: {(edge.weight * 100).toFixed(0)}%
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {edge.evidence.map((ev) => (
            <div key={ev.id} className="p-4 rounded-lg bg-muted/50 border relative overflow-hidden group">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  Confidence {(ev.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-sm leading-relaxed">{ev.description}</p>
            </div>
          ))}
          
          {edge.evidence.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No specific evidence available for this connection.
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
