import { IExecutionLog } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface CopilotPanelProps {
  logs: IExecutionLog[]
}

export function CopilotPanel({ logs }: CopilotPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom as logs come in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="w-80 h-full glass-panel border-t-0 border-b-0 border-r-0 flex flex-col pointer-events-auto">
      <div className="p-4 border-b border-white/5 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-gradient">Research Copilot</h3>
        <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: 20, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`p-3 rounded-xl border text-[11px] ${
                log.level === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                log.level === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                'glass border-white/8 text-foreground/80'
              }`}
            >
              <div className="opacity-50 text-[10px] mb-1">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
              <div>{log.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {logs.length === 0 && (
          <div className="text-muted-foreground italic opacity-50 text-center mt-10">
            Awaiting workflow execution...
          </div>
        )}
      </div>
    </div>
  )
}
