import { IResearchGap, IOpportunity } from '@/types'
import { motion } from 'framer-motion'
import { AlertCircle, Lightbulb } from 'lucide-react'

export function GapCards({ gaps }: { gaps: IResearchGap[] }) {
  if (!gaps.length) return null

  return (
    <div className="absolute top-4 left-4 z-10 w-72 space-y-3 pointer-events-none">
      {gaps.map((gap, i) => (
        <motion.div
          key={gap.id}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card/80 backdrop-blur-md border border-destructive/50 p-4 rounded-xl shadow-lg pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <h4 className="font-semibold text-sm">Research Gap</h4>
          </div>
          <p className="text-xs font-medium mb-1">{gap.title}</p>
          <p className="text-xs text-muted-foreground">{gap.reason}</p>
        </motion.div>
      ))}
    </div>
  )
}

export function OpportunityCards({ opportunities }: { opportunities: IOpportunity[] }) {
  if (!opportunities.length) return null

  return (
    <div className="absolute bottom-4 left-4 z-10 w-80 space-y-3 pointer-events-none">
      {opportunities.map((opp, i) => (
        <motion.div
          key={opp.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card/80 backdrop-blur-md border border-amber-500/50 p-4 rounded-xl shadow-lg pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h4 className="font-semibold text-sm text-amber-500">Opportunity</h4>
          </div>
          <p className="text-xs font-bold mb-1">{opp.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{opp.summary}</p>
        </motion.div>
      ))}
    </div>
  )
}
