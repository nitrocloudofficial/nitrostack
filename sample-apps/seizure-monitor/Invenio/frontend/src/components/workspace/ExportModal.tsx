import { motion } from 'framer-motion'
import { Download, FileDown, Code, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface ExportModalProps {
  onExport: (format: 'markdown' | 'html' | 'bibtex') => Promise<void>
  onClose: () => void
}

export function ExportModal({ onExport, onClose }: ExportModalProps) {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleExport = async (format: 'markdown' | 'html' | 'bibtex') => {
    setLoadingFormat(format)
    try {
      await onExport(format)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingFormat(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border shadow-2xl rounded-2xl p-6 w-[400px] flex flex-col relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          &times;
        </button>
        
        <h2 className="text-xl font-bold mb-2">Export Research Report</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Download the synthesized intelligence in your preferred format.
        </p>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
            <p className="font-semibold text-green-500">Export Successful</p>
          </div>
        ) : (
          <div className="grid gap-3">
            <ExportButton
              icon={<FileDown className="w-5 h-5" />}
              label="Markdown (.md)"
              description="Rich text format for Notion or GitHub"
              isLoading={loadingFormat === 'markdown'}
              onClick={() => handleExport('markdown')}
            />
            <ExportButton
              icon={<Code className="w-5 h-5" />}
              label="HTML (.html)"
              description="Styled web page for publishing"
              isLoading={loadingFormat === 'html'}
              onClick={() => handleExport('html')}
            />
            <ExportButton
              icon={<Download className="w-5 h-5" />}
              label="BibTeX (.bib)"
              description="Citation export for LaTeX managers"
              isLoading={loadingFormat === 'bibtex'}
              onClick={() => handleExport('bibtex')}
            />
          </div>
        )}
      </motion.div>
    </div>
  )
}

function ExportButton({ icon, label, description, isLoading, onClick }: any) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="flex items-center text-left p-3 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group disabled:opacity-50"
    >
      <div className="p-2 bg-muted rounded-lg group-hover:text-primary transition-colors mr-3">
        {isLoading ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : icon}
      </div>
      <div>
        <h4 className="font-semibold text-sm">{label}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}
