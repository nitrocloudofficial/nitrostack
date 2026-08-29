"use client"

import { ActivityLog } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"
import { motion } from "framer-motion"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
}

export function ActivityFeed({ logs }: { logs: ActivityLog[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 rounded-lg border border-zinc-800">
        <Activity className="h-8 w-8 text-zinc-500 mb-3" />
        <p className="text-zinc-400">No recent activity detected.</p>
      </div>
    )
  }

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-4"
    >
      {logs.slice(0, 10).map((log) => (
        <motion.div 
          key={log.id}
          variants={item}
          className="flex items-start justify-between p-4 bg-zinc-900/30 rounded-lg border border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-start gap-4">
            <Badge variant={log.type === "success" ? "default" : log.type === "warning" ? "secondary" : "destructive"}>
              {log.agent}
            </Badge>
            <div>
              <p className="text-sm text-zinc-300">{log.message}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
