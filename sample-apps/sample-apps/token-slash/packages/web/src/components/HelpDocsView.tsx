import React, { useState } from 'react';
import { 
  HelpCircle, 
  BookOpen, 
  Terminal, 
  Code, 
  Copy, 
  Check, 
  ChevronDown, 
  Sparkles, 
  ExternalLink,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const HelpDocsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'api' | 'faq'>('quickstart');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const codeSnippets = {
    curl: `curl -X POST http://localhost:3001/api/optimize \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Refactor this React component step by step using Next.js Server Actions and Zod validation.",
    "userId": "enterprise-dev"
  }'`,
    python: `from packages.server.src.ml_pipeline.predictor.inference_engine import TokenSlashInferenceEngine

engine = TokenSlashInferenceEngine()
result = engine.predict_recommendation(
    prompt_text="Summarize key requirements step by step.",
    current_model="gpt-4o"
)
print(f"Recommended Model: {result['recommendedModel']}")
print(f"Token Reduction: {result['tokenslashScore']}/100")`,
    typescript: `import { PipelineService } from './orchestration/pipeline.service';

const result = await pipeline.analyzePrompt({
  prompt: 'Extract JSON schema from customer support ticket',
  userId: 'demo-user'
});
console.log(result.finalReport.tokenSavingsPercent);`
  };

  const faqs = [
    {
      q: 'How does TokenSlash achieve 60%+ token reduction without losing semantic intent?',
      a: 'TokenSlash runs syntactic AST parsing on incoming prompts. It strips conversational filler words ("Please could you kindly refactor..."), converts unstructured prose into XML delimiters (<task>, <constraints>), and compresses schema descriptions into tight JSON type signatures.'
    },
    {
      q: 'What happens if the local backend server is offline during a demo?',
      a: 'TokenSlash features Resilient Graceful Degradation. If http://localhost:3001 suffers a network timeout or connection error, the frontend UI automatically falls back to formatted mock reports (mockFinalReport.json) with zero console errors.'
    },
    {
      q: 'Can I integrate TokenSlash into my CI/CD pipeline or custom agent framework?',
      a: 'Yes! You can consume the REST API bridge at POST /api/optimize or run the standalone Python inference runner run_tokenslash.py.'
    }
  ];

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Help & Documentation Hub</h1>
              <p className="text-xs text-slate-400">Developer guide, MCP API integration reference, and architectural FAQs.</p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-[#141A24] p-1 rounded-xl border border-white/[0.08]">
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeTab === 'quickstart' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Quickstart
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeTab === 'api' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            API Reference
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeTab === 'faq' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            FAQ
          </button>
        </div>
      </div>

      {/* Content Panels */}
      {activeTab === 'quickstart' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <span>3-Step Local Quickstart Guide</span>
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#0E131A] border border-white/[0.06] space-y-2">
                <div className="text-cyan-400 font-bold">Step 1: Install Monorepo Dependencies</div>
                <div className="text-slate-300">npm install &amp;&amp; cd packages/web &amp;&amp; npm install</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0E131A] border border-white/[0.06] space-y-2">
                <div className="text-cyan-400 font-bold">Step 2: Run Backend REST API Bridge</div>
                <div className="text-slate-300">cmd.exe /c npx tsx packages/server/src/api_server.ts</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0E131A] border border-white/[0.06] space-y-2">
                <div className="text-cyan-400 font-bold">Step 3: Launch Web Dashboard</div>
                <div className="text-slate-300">cmd.exe /c npm --prefix packages/web run dev</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* cURL Snippet */}
          <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">cURL REST Endpoint</span>
              <button
                onClick={() => handleCopy(codeSnippets.curl, 'curl')}
                className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSnippet === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet === 'curl' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#0E131A] border border-white/[0.06] text-xs font-mono text-cyan-300 overflow-x-auto">
              {codeSnippets.curl}
            </pre>
          </div>

          {/* Python Runner Snippet */}
          <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">Python Inference Engine (run_tokenslash.py)</span>
              <button
                onClick={() => handleCopy(codeSnippets.python, 'python')}
                className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSnippet === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet === 'python' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#0E131A] border border-white/[0.06] text-xs font-mono text-cyan-300 overflow-x-auto">
              {codeSnippets.python}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'faq' && (
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="p-5 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-3">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex items-center justify-between text-left"
              >
                <h4 className="text-sm font-bold text-white">{faq.q}</h4>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === index ? 'rotate-180 text-cyan-400' : ''}`} />
              </button>

              {openFaq === index && (
                <p className="text-xs text-slate-300 leading-relaxed border-t border-white/[0.04] pt-3 font-mono">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
