import React from 'react'
import { CorrelationGraph } from '../components/graph/CorrelationGraph'
import { useSessionStore } from '../store/useSessionStore'
import { Network } from 'lucide-react'

export function KnowledgeGraph() {
  const { packages, setInspectorNode } = useSessionStore()
  
  if (!packages?.correlationPackage) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center text-slate-500 font-medium">
        <div className="glass p-6 rounded-2xl border border-white/5 shadow-xl">
          Waiting for Correlation Agent...
        </div>
      </div>
    )
  }

  const { nodes, edges } = packages.correlationPackage.knowledge_graph

  return (
    <div className="w-full h-[calc(100vh-6rem)] rounded-3xl overflow-hidden glass-card relative animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-2xl">
      <div className="absolute top-6 left-6 z-10 glass p-5 rounded-2xl shadow-2xl pointer-events-none border border-white/10"
        style={{
          background: 'rgba(8, 12, 20, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
            <Network className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className="font-extrabold text-lg tracking-tight text-white">Semantic Knowledge Graph</h2>
        </div>
        <p className="text-sm font-medium text-slate-400 pl-11">
          Rendered <span className="text-cyan-400 font-bold">{nodes.length}</span> entities and <span className="text-blue-400 font-bold">{edges.length}</span> relationships.
        </p>
      </div>
      <CorrelationGraph 
        nodes={nodes} 
        edges={edges} 
        onNodeSelect={(node) => setInspectorNode(node)} 
      />
    </div>
  )
}
