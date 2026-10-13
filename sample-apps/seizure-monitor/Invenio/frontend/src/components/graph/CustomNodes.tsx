import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'

// Common props
interface NodeProps {
  data: {
    label: string
    group: string
    properties?: any
  }
}

export function PaperNode({ data }: NodeProps) {
  const citationCount = data.properties?.citations || 0
  const isHighImpact = citationCount > 50

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`px-4 py-2 rounded-lg border-2 shadow-sm bg-card text-card-foreground flex items-center gap-3 min-w-[200px]
        ${isHighImpact ? 'border-primary/60 shadow-primary/20 shadow-lg' : 'border-border'}`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-primary" />
      
      <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
        <FileText className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate" title={data.label}>{data.label}</div>
        <div className="text-[10px] text-muted-foreground">{citationCount} citations</div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-primary" />
    </motion.div>
  )
}

export const customNodeTypes = {
  paper: PaperNode,
}
