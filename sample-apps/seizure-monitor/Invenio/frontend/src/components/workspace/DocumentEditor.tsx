import { useState } from 'react'
import { IReportSection, IInsight } from '@/types'
import { AlertTriangle, Lightbulb, Network } from 'lucide-react'

interface DocumentEditorProps {
  sections: IReportSection[]
}

export function DocumentEditor({ sections }: DocumentEditorProps) {
  // We use local state to simulate an editable document
  const [editableSections, setEditableSections] = useState(sections)

  const handleContentChange = (index: number, newContent: string) => {
    const updated = [...editableSections]
    updated[index] = { ...updated[index], content: newContent }
    setEditableSections(updated)
  }

  const renderInsight = (insight: IInsight) => {
    const Icon = insight.type === 'gap' ? AlertTriangle : 
                 insight.type === 'opportunity' ? Lightbulb : Network
    
    const colorClass = insight.type === 'gap' ? 'text-purple-500 bg-purple-500/10' :
                       insight.type === 'opportunity' ? 'text-amber-500 bg-amber-500/10' : 'text-blue-500 bg-blue-500/10'

    return (
      <div key={insight.id} className="my-5 p-5 rounded-2xl glass-card border border-white/5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10 transition-all duration-300 group">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-1.5 rounded-lg ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h4 className="font-bold group-hover:text-primary transition-colors">{insight.title}</h4>
          <span className="ml-auto text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            {(insight.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{insight.description}</p>
        <div className="text-xs glass p-3 rounded-xl font-mono text-muted-foreground border border-white/5">
          <strong className="text-foreground/70">AI Reasoning:</strong> {insight.reasoning}
        </div>
      </div>
    )
  }

  return (
    <div className="flex max-w-6xl mx-auto py-12 px-8 pb-32 gap-12">
      {/* Sticky Table of Contents */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="sticky top-24 space-y-1 glass-card rounded-2xl p-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2">Contents</h3>
          <nav className="flex flex-col space-y-0.5">
            {editableSections.map((section) => (
              <a 
                key={`toc-${section.id}`}
                href={`#section-${section.id}`}
                className="text-sm text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 truncate"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Document Content */}
      <div className="flex-1 max-w-3xl">
        {editableSections.map((section, idx) => (
          <section key={section.id} id={`section-${section.id}`} className="mb-16 group scroll-mt-24">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 group-hover:text-gradient-premium transition-colors duration-300">
              {section.title}
            </h2>
            
            <textarea
              value={section.content}
              onChange={(e) => handleContentChange(idx, e.target.value)}
              className="w-full min-h-[100px] bg-transparent resize-none outline-none text-muted-foreground leading-relaxed transition-all focus:text-foreground focus:bg-muted/20 p-3 -mx-3 rounded-lg text-lg"
            />

          {section.insights && section.insights.length > 0 && (
            <div className="mt-4 space-y-4 pl-4 border-l-2 border-primary/20">
              {section.insights.map(renderInsight)}
            </div>
          )}
        </section>
      ))}
      </div>
    </div>
  )
}
