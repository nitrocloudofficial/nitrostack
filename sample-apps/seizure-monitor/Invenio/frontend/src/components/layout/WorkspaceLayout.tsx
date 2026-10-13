import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { useSessionStore } from '../../store/useSessionStore'
import { X, ExternalLink, Lightbulb, Activity, Database, CheckCircle2 } from 'lucide-react'
import { AgentSidebar } from './AgentSidebar'
import { motion, AnimatePresence } from 'framer-motion'

export function WorkspaceLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  
  const { activeInspectorNode, setInspectorNode, loadSession, query, packages } = useSessionStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Open inspector automatically if a node is selected
    if (activeInspectorNode) {
      setInspectorOpen(true)
    }
  }, [activeInspectorNode])

  // Fake initial session load
  useEffect(() => {
    loadSession()
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background relative">
      {/* ── Ambient Background Lighting ──────────────── */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-ambient rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-blue-violet rounded-full blur-[100px] opacity-15 pointer-events-none" />

      {/* ── Left Sidebar ──────────────────────────────── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* ── Center Workspace ──────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <TopNav />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8" id="main-content">
          <Outlet />
        </main>
      </div>

      {/* ── Right Inspector Sidebar ───────────────────── */}
      <AnimatePresence>
        {inspectorOpen && (
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="w-80 h-full flex flex-col flex-shrink-0 z-30"
            style={{
              background: 'rgba(8, 12, 20, 0.88)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <h3 className="font-semibold text-sm text-slate-200">Context Inspector</h3>
              <button 
                onClick={() => {
                  setInspectorOpen(false)
                  setInspectorNode(null)
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {!activeInspectorNode ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                  <Activity className="w-10 h-10 text-slate-500" />
                  <p className="text-sm text-slate-400 max-w-48 leading-relaxed">Select any node, paper, or claim to inspect properties here.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2 leading-tight">
                      {activeInspectorNode.id || activeInspectorNode.title || 'Selected Entity'}
                    </h4>
                    <div className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.2) 100%)',
                        border: '1px solid rgba(99,179,237,0.3)',
                        color: '#93c5fd'
                      }}
                    >
                      {activeInspectorNode.type || 'Entity'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-xs font-semibold flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                      <Database className="w-3.5 h-3.5" /> Properties
                    </h5>
                    <div className="rounded-xl p-4 text-sm font-mono break-all space-y-3"
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                      }}
                    >
                      {Object.entries(activeInspectorNode).map(([key, value]) => {
                        if (key === 'id' || key === 'type') return null;
                        if (typeof value === 'object') return null;
                        return (
                          <div key={key} className="flex flex-col">
                            <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">{key}</span>
                            <span className="text-slate-200">{String(value)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  <button className="w-full btn-gradient inline-flex items-center justify-center rounded-xl text-sm font-semibold h-10 px-4 mt-4 text-white">
                    <Lightbulb className="w-4 h-4 mr-2" /> Find Related
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Persistent Agent Pipeline Sidebar ─────────── */}
      <AgentSidebar />
    </div>
  )
}
