import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, FileText, Loader2 } from 'lucide-react'
import { useWorkspace, useGenerateWorkspace, useExportWorkspace } from '@/hooks/useWorkspace'
import { DocumentEditor } from '@/components/workspace/DocumentEditor'
import { ExportModal } from '@/components/workspace/ExportModal'
import { useState } from 'react'

import { useSessionStore } from '../store/useSessionStore'

export function Workspace() {
  const [searchParams] = useSearchParams()
  const runId = searchParams.get('run_id') || useSessionStore(state => state.activeSessionId)
  
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)

  const { mutateAsync: generate, isPending: isGenerating } = useGenerateWorkspace()
  const { data, isLoading, error } = useWorkspace(workspaceId)
  const { mutateAsync: exportReport } = useExportWorkspace()

  // Auto-generate workspace if we arrive with a run_id but no workspace
  useEffect(() => {
    if (runId && !workspaceId && !isGenerating) {
      generate(runId).then((res) => setWorkspaceId(res.workspace_id)).catch(console.error)
    }
  }, [runId, workspaceId, isGenerating, generate])

  const handleExport = async (format: 'markdown' | 'html' | 'bibtex') => {
    if (!workspaceId) return
    const res = await exportReport({ workspaceId, format })
    
    // Create downloadable blob
    const blob = new Blob([res.content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${workspaceId}.${format === 'markdown' ? 'md' : format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const workspace = data?.workspace

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-destructive p-8">
        Error loading workspace: {error.message}
      </div>
    )
  }

  if (isGenerating || isLoading || !workspace) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Synthesizing Research Workspace...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background relative overflow-hidden text-foreground">
      
      {/* Top Navigation */}
      <header className="absolute top-0 left-0 right-0 z-20 px-8 py-4 bg-background/80 backdrop-blur-md border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Research Studio</h1>
            <p className="text-xs text-muted-foreground font-mono">
              Workspace ID: {workspace.id.split('-')[0]}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowExport(true)}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </header>

      {/* Main Document Editor */}
      <main className="flex-1 overflow-y-auto pt-24 custom-scrollbar">
        <DocumentEditor sections={workspace.sections} />
      </main>

      {/* Export Modal Overlay */}
      {showExport && (
        <ExportModal onExport={handleExport} onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}
