import { useState, useEffect } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { startWorkflow } from '@/lib/api'
import { useWorkflow } from '@/hooks/useWorkflow'
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas'
import { CopilotPanel } from '@/components/workflow/CopilotPanel'
import { SummaryPanel } from '@/components/workflow/SummaryPanel'

export function Workflow() {
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const navigate = useNavigate()

  const [query, setQuery] = useState(isDemo ? 'Quantum Error Correction' : '')
  const [runId, setRunId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  
  const { data: statusData, error } = useWorkflow(runId)
  const run = statusData?.run

  // Auto-start demo mode
  useEffect(() => {
    if (isDemo && !runId && !isStarting && query) {
      const timer = setTimeout(() => {
        executeRun(query)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isDemo, runId, isStarting, query])

  // Trigger summary overlay when completed and handle demo auto-redirect
  useEffect(() => {
    if (run?.status === 'completed') {
      if (!showSummary) setShowSummary(true)
      
      if (isDemo) {
        // Wait 3 seconds then auto navigate
        const timer = setTimeout(() => {
          navigate(`/workspace?run_id=${runId}`)
        }, 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [run?.status, showSummary, isDemo, navigate, runId])

  const executeRun = async (q: string) => {
    if (!q.trim()) return
    
    setIsStarting(true)
    setRunId(null)
    setShowSummary(false)
    
    try {
      const res = await startWorkflow(q.trim())
      setRunId(res.run_id)
    } catch (err) {
      console.error(err)
    } finally {
      setIsStarting(false)
    }
  }

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault()
    executeRun(query)
  }

  const isWorkflowActive = runId !== null

  return (
    <div className="flex w-full h-full relative overflow-hidden">
      
      {/* Central Canvas */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header bar overlaid */}
        <header
          className="absolute top-0 left-0 right-0 z-20 px-8 py-5 flex items-center justify-between pointer-events-auto"
          style={{
            background: 'linear-gradient(to bottom, rgba(8,12,20,0.95) 0%, rgba(8,12,20,0.6) 60%, transparent 100%)',
            paddingTop: '20px',
            paddingBottom: '40px',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(217, 70, 239, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white mb-0.5 drop-shadow-sm">AI Research Copilot</h1>
              <p className="text-xs font-medium text-slate-400">
                Autonomous sequential research workflow
              </p>
            </div>
          </div>

          <form onSubmit={handleRun} className="flex gap-3">
            <input
              type="text"
              placeholder="Enter research topic..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isStarting || (run && run.status === 'running')}
              className="w-96 px-5 py-3 rounded-2xl text-sm font-medium transition-all disabled:opacity-50 text-white placeholder:text-slate-500 focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1), 0 0 24px rgba(139, 92, 246, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
              }}
            />
            <button
              type="submit"
              disabled={!query.trim() || isStarting || (run && run.status === 'running')}
              className="btn-gradient px-6 py-3 rounded-2xl font-bold flex items-center gap-2 text-white shadow-xl shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isStarting ? <Sparkles className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" fill="currentColor" />}
              Run Research
            </button>
          </form>
        </header>

        {/* Canvas or Empty State */}
        {isWorkflowActive ? (
          <WorkflowCanvas nodesState={run?.nodes || []} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div
              className="w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(217, 70, 239, 0.15))',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                boxShadow: '0 16px 48px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-radial from-violet-500/30 to-transparent blur-xl rounded-full animate-pulse" />
              <Sparkles className="w-12 h-12 text-violet-400 relative z-10" />
            </div>
            <h2 className="text-4xl font-extrabold mb-4 text-white tracking-tight">Ready to Orchestrate</h2>
            <p className="text-slate-400 max-w-lg text-base leading-relaxed font-medium">
              Enter a research topic above to launch the autonomous pipeline. The Copilot will execute search, correlation, gap detection, and hypothesis synthesis.
            </p>
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/50 text-red-200 px-5 py-3 rounded-xl shadow-2xl z-50 backdrop-blur-md font-medium text-sm flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Error polling workflow: {error.message}
          </div>
        )}

        {/* Summary Modal overlay */}
        {showSummary && run?.summary && runId && (
          <SummaryPanel runId={runId} summary={run.summary} onClose={() => setShowSummary(false)} />
        )}
      </div>

      {/* Right Sidebar: Copilot Logs */}
      {isWorkflowActive && (
        <CopilotPanel logs={run?.logs || []} />
      )}
    </div>
  )
}
