/**
 * AgentSidebar — Premium Multi-Agent Pipeline Panel
 *
 * Premium glassmorphism right sidebar showing agent execution status
 * with glowing indicators, animated states, and premium typography.
 */

import React from 'react'
import { useSessionStore } from '../../store/useSessionStore'
import { Loader2, CheckCircle2, Clock, AlertCircle, Cpu, Zap, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function AgentSidebar() {
  const { query, plannerStatus } = useSessionStore()

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'COMPLETED': return (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" style={{ filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.6))' }} />
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Done</span>
        </div>
      )
      case 'RUNNING': return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Running</span>
        </div>
      )
      case 'FAILED': return (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Failed</span>
        </div>
      )
      default: return (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Idle</span>
        </div>
      )
    }
  }

  const getAgentBgStyle = (status: string) => {
    switch(status) {
      case 'COMPLETED': return {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(52, 211, 153, 0.2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
      }
      case 'RUNNING': return {
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
        border: '1px solid rgba(99, 179, 237, 0.3)',
        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
      }
      case 'FAILED': return {
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(252, 165, 165, 0.25)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
      }
      default: return {
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    }
  }

  return (
    <aside
      className="w-[320px] h-full flex flex-col flex-shrink-0 z-40 relative"
      style={{
        background: 'rgba(8, 12, 20, 0.65)',
        backdropFilter: 'blur(40px) saturate(150%)',
        WebkitBackdropFilter: 'blur(40px) saturate(150%)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.3), inset 1px 0 0 rgba(255, 255, 255, 0.02)',
      }}
    >
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-0 right-0 w-full h-64 bg-gradient-to-bl from-blue-500/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div
        className="flex flex-col gap-3 p-6 flex-shrink-0 relative z-10"
        style={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                border: '1px solid rgba(99, 179, 237, 0.3)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 15px rgba(59,130,246,0.2)'
              }}
            >
              <Cpu className="w-4 h-4 text-blue-300" />
            </div>
            <h3
              className="font-bold text-xs uppercase tracking-[0.2em]"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Nitro Pipeline
            </h3>
          </div>
        </div>
        {query ? (
          <div className="bg-black/30 rounded-xl p-3 border border-white/5 shadow-inner mt-1">
            <p className="text-[13px] text-slate-300 font-medium leading-relaxed line-clamp-2" title={query}>
              "{query}"
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-slate-500 font-medium mt-1">Ready for next command</p>
        )}
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
        <AnimatePresence mode="wait">
          {query ? (
            <motion.div
              key="agents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-3"
            >
              {Object.entries(plannerStatus).map(([agent, status], idx) => (
                <motion.div
                  key={agent}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
                  className="p-4 rounded-[18px] transition-all duration-300 hover:scale-[1.02] group cursor-default relative overflow-hidden"
                  style={getAgentBgStyle(status)}
                >
                  {/* Subtle glass reflection */}
                  <div className="absolute inset-0 rounded-[18px] pointer-events-none border border-white/5" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)' }} />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-slate-200 group-hover:text-white transition-colors tracking-wide">
                        {agent.replace('Agent', '')}
                      </span>
                    </div>
                    {getStatusIcon(status)}
                  </div>
                  
                  {/* Progress shimmer for running state */}
                  {status === 'RUNNING' && (
                    <div className="mt-4 h-1.5 rounded-full overflow-hidden shadow-inner" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        className="h-full rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.8), rgba(139,92,246,0.8), transparent)',
                          width: '50%',
                          boxShadow: '0 0 10px rgba(99,179,237,0.5)'
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-5 py-20 px-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                <div
                  className="w-16 h-16 rounded-[20px] flex items-center justify-center relative z-10"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                  }}
                >
                  <Zap className="w-7 h-7 text-slate-500" />
                </div>
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-300 mb-2 tracking-wide">System Idle</p>
                <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                  Initiate a research query to monitor the autonomous multi-agent pipeline.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}

