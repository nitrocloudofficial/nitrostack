import React from 'react'
import { useSessionStore } from '../store/useSessionStore'
import { AlertTriangle, ThumbsUp, Scale, AlertCircle } from 'lucide-react'

export function EvidenceView() {
  const { packages, setInspectorNode } = useSessionStore()
  
  if (!packages?.evidencePackage) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center text-slate-500 font-medium">
        <div className="glass p-6 rounded-2xl border border-white/5 shadow-xl">
          Waiting for Evidence Agent...
        </div>
      </div>
    )
  }

  const { claims = [], contradictions = [], consensus_findings = [] } = packages.evidencePackage

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24 p-8 relative">
      <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-gradient-radial from-violet-500/10 to-transparent blur-[100px] rounded-full pointer-events-none -z-10" />

      <header className="animate-in fade-in slide-in-from-bottom-4 duration-500 border-b border-white/5 pb-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow-sm">Evidence Intelligence</h1>
        <p className="text-lg text-slate-400 font-medium">Extracted <span className="text-cyan-400 font-bold">{claims.length} claims</span> and detected <span className="text-rose-400 font-bold">{contradictions.length} contradictions</span>.</p>
      </header>

      {/* Contradictions Block */}
      {contradictions.length > 0 && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-rose-400 tracking-tight">
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            Contradictions Detected
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {contradictions.map((c: any, idx: number) => (
              <div 
                key={idx} 
                className="p-8 rounded-3xl border border-rose-500/20 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-500/10 group relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.05), rgba(225, 29, 72, 0.02))'
                }}
                onClick={() => setInspectorNode({ ...c, type: 'Contradiction' })}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-400/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <h4 className="text-xl font-bold text-rose-100 mb-6 group-hover:text-white transition-colors relative z-10">{c.description}</h4>
                <div className="flex flex-col md:flex-row gap-6 relative z-10">
                  <div className="flex-1 p-6 rounded-2xl border border-rose-500/10 bg-black/20 backdrop-blur-md shadow-inner">
                    <span className="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest mb-2 block">Claim 1</span>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed">{c.evidence.claim_1.text}</p>
                  </div>
                  <div className="flex items-center justify-center px-2">
                    <div className="w-10 h-10 rounded-full border border-rose-500/20 bg-rose-500/10 flex items-center justify-center">
                      <Scale className="w-4 h-4 text-rose-400" />
                    </div>
                  </div>
                  <div className="flex-1 p-6 rounded-2xl border border-rose-500/10 bg-black/20 backdrop-blur-md shadow-inner">
                    <span className="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest mb-2 block">Claim 2</span>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed">{c.evidence.claim_2.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Claims Grid */}
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-white tracking-tight">
          <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <ThumbsUp className="w-5 h-5 text-cyan-400" />
          </div>
          Extracted Claims
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {claims.map((claim: any, idx: number) => (
            <div 
              key={idx} 
              className="p-6 rounded-3xl glass-card card-hover cursor-pointer flex flex-col relative overflow-hidden"
              onClick={() => setInspectorNode({ ...claim, type: 'Claim' })}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-transparent opacity-0 hover:opacity-[0.05] transition-opacity duration-300" />
              <div className="inline-flex self-start rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest mb-4"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8'
                }}
              >
                {claim.type}
              </div>
              <p className="text-sm font-medium text-slate-300 leading-relaxed line-clamp-5 flex-1 relative z-10">{claim.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
