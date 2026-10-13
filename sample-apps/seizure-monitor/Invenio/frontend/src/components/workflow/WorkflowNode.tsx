import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import { IWorkflowNodeState } from '@/types'

interface NodeProps {
  data: IWorkflowNodeState
}

export function WorkflowNode({ data }: NodeProps) {
  const isRunning = data.status === 'running'
  const isCompleted = data.status === 'completed'
  const isFailed = data.status === 'failed'
  
  // Outer glow and border colors based on status
  let borderColor = 'border-border'
  let glowClass = ''
  
  if (isRunning) {
    borderColor = 'border-primary'
    glowClass = 'shadow-[0_0_15px_rgba(var(--primary),0.5)]'
  } else if (isCompleted) {
    borderColor = 'border-green-500/50'
  } else if (isFailed) {
    borderColor = 'border-destructive'
  }

  return (
    <motion.div
      layout
      className={`relative px-4 py-3 rounded-xl border-2 bg-card text-card-foreground min-w-[220px] transition-colors duration-300 z-10 ${borderColor} ${glowClass}`}
    >
      {/* Pulse rings for active state */}
      {isRunning && (
        <>
          <div className="absolute inset-0 rounded-xl border border-primary animate-ping opacity-20 -z-10" />
          <div className="absolute -inset-1 rounded-xl bg-primary/10 animate-pulse -z-10" />
        </>
      )}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground opacity-50" />
      
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold truncate">{data.label}</h3>
        
        {/* Status Icon */}
        {isRunning && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        {isFailed && <XCircle className="w-4 h-4 text-destructive" />}
        {data.status === 'pending' && <Clock className="w-4 h-4 text-muted-foreground" />}
      </div>
      
      {/* Execution details */}
      <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2 border-t pt-2">
        <span>{data.execution_ms ? `${data.execution_ms}ms` : '--'}</span>
        {data.confidence && (
          <span className="text-primary font-medium">Conf: {(data.confidence * 100).toFixed(0)}%</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground opacity-50" />
    </motion.div>
  )
}
