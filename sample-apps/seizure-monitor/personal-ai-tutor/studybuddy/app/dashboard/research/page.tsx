"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Loader2, Sparkles, BookOpen, Quote, List, HelpCircle, Download, Copy, ChevronDown, ChevronUp } from "lucide-react";

type ResearchTab = "summarizer" | "citation" | "review" | "questions";

const DEMO_SUMMARY = {
  title: "The Role of Catalysts in Chemical Equilibrium and Industrial Processes",
  abstract: "This paper examines the dual role of catalysts in chemical equilibrium: their ability to accelerate the attainment of equilibrium without altering the position of equilibrium, and their industrial applications in processes such as the Haber process and Contact process.",
  keyFindings: [
    "Catalysts reduce activation energy but do not change ΔG or equilibrium constants",
    "Heterogeneous catalysts show 40-60% efficiency improvement in Haber process ammonia synthesis",
    "Fe₃O₄ with K₂O and Al₂O₃ promoters remains the most effective catalyst for N₂ + 3H₂ ⇌ 2NH₃",
    "Temperature optimization (400-500°C) balances rate vs. yield in industrial equilibrium reactions",
  ],
  methodology: "Literature review of 45 peer-reviewed studies (2010-2024) combined with computational analysis of catalyst surface interactions using DFT (Density Functional Theory) calculations.",
  results: "Analysis confirms that while catalysts uniformly reach equilibrium faster (by 2-10×), the equilibrium constant K remains unchanged. Industrial data from BASF's Haber process shows 500 metric tons NH₃/day production efficiency.",
  limitations: [
    "Study limited to heterogeneous catalysis",
    "Computational models assume ideal conditions",
    "Industrial data sourced from publicly available reports only",
  ],
};

const RESEARCH_QUESTIONS = [
  "How does catalyst poisoning affect long-term industrial equilibrium yield in the Haber process?",
  "Can machine learning models predict optimal catalyst compositions for novel equilibrium reactions?",
  "What is the environmental impact of non-renewable catalysts used in large-scale chemical equilibrium processes?",
  "How do nano-catalysts compare to bulk catalysts in terms of equilibrium attainment speed?",
];

const CITATIONS = {
  apa: 'Smith, J. A., & Kumar, R. (2023). Catalytic mechanisms in industrial equilibrium processes. *Journal of Physical Chemistry*, 127(4), 1823-1841. https://doi.org/10.1021/jpc.2023.0041',
  mla: 'Smith, James A., and Raj Kumar. "Catalytic Mechanisms in Industrial Equilibrium Processes." Journal of Physical Chemistry, vol. 127, no. 4, 2023, pp. 1823-1841.',
  ieee: 'J. A. Smith and R. Kumar, "Catalytic mechanisms in industrial equilibrium processes," J. Phys. Chem., vol. 127, no. 4, pp. 1823-1841, 2023.',
  chicago: 'Smith, James A., and Raj Kumar. "Catalytic Mechanisms in Industrial Equilibrium Processes." Journal of Physical Chemistry 127, no. 4 (2023): 1823-1841.',
};

function SectionCard({ title, icon: Icon, children, color = "blue" }: any) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center`}>
            <Icon className={`w-4 h-4 text-${color}-600`} />
          </div>
          <span className="font-bold text-slate-900">{title}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<ResearchTab>("summarizer");
  const [uploading, setUploading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [citationStyle, setCitationStyle] = useState<keyof typeof CITATIONS>("apa");

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => { setUploading(false); setAnalyzed(true); }, 2500);
  };

  const tabs: { key: ResearchTab; label: string; icon: any }[] = [
    { key: "summarizer", label: "Paper Summarizer", icon: BookOpen },
    { key: "citation", label: "Citation Generator", icon: Quote },
    { key: "review", label: "Literature Review", icon: List },
    { key: "questions", label: "Research Questions", icon: HelpCircle },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Research Assistant</h2>
        <p className="text-slate-500">Upload research papers for AI-powered analysis, citations, and literature reviews</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.key ? "gradient-primary text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Summarizer */}
      {activeTab === "summarizer" && (
        <div className="space-y-4">
          {!analyzed ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Upload a Research Paper</h3>
              <p className="text-slate-500 mb-6">Supported formats: PDF, DOCX · Max size: 25 MB</p>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 mb-6 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer" onClick={handleUpload}>
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">Drop your paper here or click to browse</p>
              </div>
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Analyzing paper with AI...</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div className="h-full gradient-primary rounded-full" initial={{ width: "0%" }} animate={{ width: "90%" }} transition={{ duration: 2.3 }} />
                  </div>
                </div>
              )}
              <div className="mt-4 text-slate-400 text-xs">Or try our demo paper →
                <button onClick={handleUpload} className="text-blue-600 font-medium ml-1 hover:underline">
                  "Catalysts in Chemical Equilibrium"
                </button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-2xl px-5 py-3">
                <div className="flex items-center gap-2 text-green-700 font-semibold"><Sparkles className="w-5 h-5" /> Paper analyzed successfully!</div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 text-xs border border-slate-200 bg-white text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"><Copy className="w-3 h-3" /> Copy</button>
                  <button className="flex items-center gap-1.5 text-xs gradient-primary text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-all"><Download className="w-3 h-3" /> Export</button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <h3 className="font-bold text-slate-900 text-lg">{DEMO_SUMMARY.title}</h3>
              </div>

              <SectionCard title="Abstract" icon={BookOpen} color="blue">
                <p className="text-slate-700 leading-relaxed">{DEMO_SUMMARY.abstract}</p>
              </SectionCard>
              <SectionCard title="Key Findings" icon={Sparkles} color="purple">
                <ul className="space-y-2">
                  {DEMO_SUMMARY.keyFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-3"><span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i+1}</span><span className="text-slate-700 text-sm">{f}</span></li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard title="Methodology" icon={FileText} color="green">
                <p className="text-slate-700 leading-relaxed text-sm">{DEMO_SUMMARY.methodology}</p>
              </SectionCard>
              <SectionCard title="Results & Conclusions" icon={List} color="cyan">
                <p className="text-slate-700 leading-relaxed text-sm">{DEMO_SUMMARY.results}</p>
              </SectionCard>
              <SectionCard title="Limitations" icon={HelpCircle} color="orange">
                <ul className="space-y-1">
                  {DEMO_SUMMARY.limitations.map((l, i) => <li key={i} className="flex items-center gap-2 text-slate-600 text-sm"><span className="text-orange-500">•</span>{l}</li>)}
                </ul>
              </SectionCard>
            </motion.div>
          )}
        </div>
      )}

      {/* Citation Generator */}
      {activeTab === "citation" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 mb-2">Citation Format</h3>
            <div className="flex gap-3">
              {(["apa", "mla", "ieee", "chicago"] as const).map(style => (
                <button key={style} onClick={() => setCitationStyle(style)}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-bold uppercase transition-all ${citationStyle === style ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}>
                  {style}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="text-xs text-slate-400 mb-2 font-semibold uppercase">{citationStyle.toUpperCase()} Format</div>
            <p className="text-slate-800 font-mono text-sm leading-relaxed">{CITATIONS[citationStyle]}</p>
          </div>
          <button className="flex items-center gap-2 gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all">
            <Copy className="w-4 h-4" /> Copy Citation
          </button>
        </div>
      )}

      {/* Literature Review */}
      {activeTab === "review" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Literature Review Builder</h3>
          <p className="text-slate-500 mb-6">Upload 2-10 research papers and AI will synthesize them into a structured literature review</p>
          <button className="gradient-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all">Upload Multiple Papers</button>
        </div>
      )}

      {/* Research Questions */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h3 className="font-bold text-slate-900">AI-Generated Research Questions</h3>
            </div>
            <p className="text-slate-500 text-sm mb-5">Based on "Catalysts in Chemical Equilibrium" — gaps and extensions identified by AI</p>
            <div className="space-y-3">
              {RESEARCH_QUESTIONS.map((q, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 hover:border-purple-300 transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 text-white font-bold text-sm group-hover:scale-110 transition-transform">Q{i+1}</div>
                  <p className="text-slate-800 font-medium text-sm leading-relaxed">{q}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
