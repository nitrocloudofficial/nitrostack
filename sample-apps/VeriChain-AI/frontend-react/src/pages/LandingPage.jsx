import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Brain, Cpu, Database, ChevronRight, Play, CheckCircle, BarChart3, AlertTriangle, ArrowRight, HelpCircle } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  const [activeFaq, setActiveFaq] = useState(null);
  const [showDemo, setShowDemo] = useState(false);

  const features = [
    {
      icon: <Cpu className="text-blue-400" size={24} />,
      title: "Model Context Protocol (MCP)",
      desc: "Connects LLMs directly to verified context databases and APIs using structured JSON-RPC mcp standards."
    },
    {
      icon: <Brain className="text-emerald-400" size={24} />,
      title: "6-Agent Orchestration",
      desc: "Distributes planning, evidence retrieval, verification, conflict resolution, risk analysis, and final voting across specialized agents."
    },
    {
      icon: <Shield className="text-purple-400" size={24} />,
      title: "Contradiction Detection",
      desc: "Cross-checks facts across CSVs, PDFs, and legal contracts to pinpoint clause version mismatches and budget anomalies."
    },
    {
      icon: <BarChart3 className="text-amber-400" size={24} />,
      title: "Confidence & Risk Metrics",
      desc: "Computes credibility percentages and maps multi-dimensional exposure scores (Financial, Compliance, Legal)."
    }
  ];

  const faqData = [
    {
      q: "What is VeriChain AI?",
      a: "VeriChain AI is an Enterprise Decision Intelligence Platform. Instead of answering queries instantly, it leverages Model Context Protocol (MCP) to extract facts from corporate sources, cross-references claims, and yields a mathematically verified decision trail."
    },
    {
      q: "How does the AI Debate Panel work?",
      a: "For any compliance query, specialized agents (Finance, Compliance, Legal, Risk) analyze the evidence and cast independent votes. A Judge Agent synthesizes these arguments to form the final decision recommendation."
    },
    {
      q: "What file formats are supported?",
      a: "The platform ingests PDF compliance frameworks, CSV spreadsheets, DOCX contract drafts, and TXT operational checklists."
    }
  ];

  return (
    <div className="min-h-screen bg-darkBg text-gray-100 overflow-x-hidden font-sans relative">
      {/* Background soft glowing lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none" />

      {/* Header Navigation */}
      <nav className="border-b border-glassBorder backdrop-blur-md bg-darkBg/60 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">VeriChain</span>
            <span className="text-blue-500 font-bold ml-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">AI</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onGetStarted}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-600/30 hover:scale-[1.02]"
          >
            Access Console
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-24 text-center max-w-5xl mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 uppercase">
            Model Context Protocol • Hackathon Launch
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mt-6 leading-[1.1] text-white">
            Trust Every AI Decision <br className="hidden md:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
              Through Verified Evidence
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mt-6 max-w-2xl mx-auto leading-relaxed">
            Verify AI claims using multi-agent debate hierarchies, trace documents via MCP resources, and eliminate corporate hallucination risks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-base transition-all duration-200 shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 group hover:scale-[1.02]"
            >
              Start Verification 
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setShowDemo(!showDemo)}
              className="w-full sm:w-auto px-8 py-4 bg-gray-900/60 hover:bg-gray-900 border border-glassBorder text-white rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <Play size={16} className="text-blue-400 fill-current" />
              <span>Watch Live Demo</span>
            </button>
          </div>
        </motion.div>

        {/* Live Demo Simulation Panel */}
        <AnimatePresence>
          {showDemo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-12 text-left bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-2xl backdrop-blur-xl overflow-hidden max-w-3xl mx-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-glassBorder mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500 font-mono ml-2">agents_debate_terminal_logs.sh</span>
                </div>
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-semibold uppercase">Running Simulation</span>
              </div>
              
              <div className="font-mono text-sm space-y-3.5">
                <p className="text-gray-500">$ python run_agents.py --query "Should we onboard Vendor ABC?"</p>
                
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-blue-400">
                  ℹ️ Planner Agent: Scanning contract files... focus set to Budget & Signatures.
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-purple-400">
                  🔍 Evidence Extractor: Found signatory John Doe, allocated budget $500,000.
                </motion.p>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="bg-gray-900/40 p-4 rounded-xl border border-glassBorder space-y-2.5">
                  <p className="font-bold text-gray-300 border-b border-glassBorder/40 pb-1.5">⚖️ Agent Debate Panel Panelists:</p>
                  <p className="text-green-400">🟢 Finance Agent: <b>APPROVE</b> - Proposed budget is within 2026 limits.</p>
                  <p className="text-yellow-400">🟡 Compliance Agent: <b>REVIEW</b> - Signing authority validated, but security audit certificate is pending.</p>
                  <p className="text-red-400">🔴 Legal Agent: <b>REJECT</b> - Mismatch detected: Contract draft references 2025 clauses, but terms say 2026.</p>
                  <p className="text-orange-400">🟠 Risk Agent: <b>MEDIUM RISK</b> - Multi-document cross-checks yield 45% overall exposure.</p>
                </motion.div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="text-emerald-400 font-semibold">
                  ✓ Judge Agent Final Decision: REVIEW REQUIRED (Confidence: 82%)
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Dynamic Features Section */}
      <section className="px-6 py-20 bg-gray-950/40 border-y border-glassBorder">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Full-Spectrum Trust Engine</h2>
            <p className="text-gray-400 mt-4 text-lg">Every capability required for explainable enterprise AI audits.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="bg-glassBg border border-glassBorder p-6 rounded-2xl shadow-lg backdrop-blur-lg flex flex-col justify-between"
              >
                <div>
                  <div className="p-3 bg-gray-900/60 w-fit rounded-xl border border-glassBorder mb-5">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture / How It Works Section */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">How VeriChain AI Works</h2>
          <p className="text-gray-400 mt-4 text-lg">From unverified user query to official compliance PDF report.</p>
        </div>

        <div className="relative border-l border-glassBorder pl-8 ml-4 md:ml-10 space-y-12">
          {/* Step 1 */}
          <div className="relative">
            <div className="absolute left-[-41px] top-1.5 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-xl font-bold text-white">Query and Context Ingestion</h3>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-2xl">
              User submits a verification question. Documents are loaded directly from the staged file database registry or parsed via Python text extractors.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="absolute left-[-41px] top-1.5 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-xl font-bold text-white">MCP Tools & Fact Gathering</h3>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-2xl">
              The AI graph activates Model Context Protocol tools to query databases and inspect version values, populating verified evidence nodes.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="absolute left-[-41px] top-1.5 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-xl font-bold text-white">Panel Debate & Risk Audit</h3>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-2xl">
              Finance, Compliance, Legal, and Risk agents run parallel heuristics to draft individual viewpoints and compute multi-dimensional threat percentages.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <div className="absolute left-[-41px] top-1.5 bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-xl font-bold text-white">Judge Synthesis & Report Compile</h3>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-2xl">
              The final Decision Agent (Judge) votes, computes confidence margins, updates SQLite, and generates official downloadable compliance PDF and HTML reports.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Module Grid Mockup */}
      <section className="px-6 py-20 bg-gray-950/40 border-t border-glassBorder">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Flexible Pricing Plans</h2>
            <p className="text-gray-400 mt-4 text-lg">Scalable decision verification options for teams of all sizes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Standard */}
            <div className="bg-glassBg border border-glassBorder p-8 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Developer Sandbox</h3>
                <p className="text-sm text-gray-400 mt-1">For testing agent execution chains.</p>
                <div className="text-3xl font-extrabold text-white mt-5">$0 <span className="text-xs text-gray-500 font-normal">/ month</span></div>
                
                <ul className="mt-6 space-y-3.5 text-sm text-gray-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={15} className="text-emerald-400" />
                    <span>Up to 10 document uploads</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={15} className="text-emerald-400" />
                    <span>Standard Heuristics fallback run</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={15} className="text-emerald-400" />
                    <span>Official PDF export reports</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={onGetStarted}
                className="mt-8 w-full py-3 bg-gray-900 hover:bg-gray-850 border border-glassBorder text-white rounded-xl font-semibold text-sm transition-all duration-200"
              >
                Access Free Sandbox
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-glassBg border-2 border-blue-500 p-8 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 bg-blue-500 text-white font-bold text-[10px] px-3.5 py-1 uppercase rounded-bl tracking-wider">
                Popular
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Enterprise Authority</h3>
                <p className="text-sm text-gray-400 mt-1">For production compliance teams.</p>
                <div className="text-3xl font-extrabold text-white mt-5">$499 <span className="text-xs text-gray-500 font-normal">/ month</span></div>
                
                <ul className="mt-6 space-y-3.5 text-sm text-gray-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={15} className="text-emerald-400" />
                    <span>Unlimited documents & database records</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={15} className="text-emerald-400" />
                    <span>Full LLM multi-agent debate graph</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={15} className="text-emerald-400" />
                    <span>Real-time Vis.js network lineages</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={15} className="text-emerald-400" />
                    <span>Promotional role admin controls</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={onGetStarted}
                className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-500/20"
              >
                Get Started Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">Frequently Asked Questions</h2>
          <p className="text-gray-400 mt-3">Everything you need to know about the Trust Engine.</p>
        </div>

        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div 
              key={index}
              className="bg-glassBg border border-glassBorder rounded-2xl overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full text-left px-6 py-5 flex items-center justify-between font-bold text-white hover:bg-gray-900/30 transition-all duration-150 outline-none"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle size={18} className="text-blue-400" />
                  <span>{item.q}</span>
                </div>
                <span className={`text-xl text-gray-500 transform transition-transform duration-200 ${activeFaq === index ? 'rotate-45' : ''}`}>+</span>
              </button>
              
              <AnimatePresence>
                {activeFaq === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="px-6 pb-6 pt-1 text-sm text-gray-400 leading-relaxed border-t border-glassBorder/30">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-glassBorder py-12 px-6 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-500" size={18} />
            <span className="font-extrabold text-sm text-white tracking-wider">VERICHAIN AI</span>
          </div>
          <p className="text-xs text-gray-500">&copy; 2026 VeriChain AI. Built for the Model Context Protocol (MCP) Hackathon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
