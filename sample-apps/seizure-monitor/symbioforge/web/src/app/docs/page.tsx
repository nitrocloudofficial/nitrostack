export default function DocsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto py-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100">SymBioForge Documentation</h1>
        <p className="text-xl text-zinc-400 mt-2">The AI-Powered Industrial Symbiosis Engine</p>
      </div>
      
      <div className="prose prose-invert prose-zinc max-w-none mt-8">
        <h2 className="text-2xl font-semibold text-zinc-200 border-b border-zinc-800 pb-2 mb-4">Overview</h2>
        <p className="text-zinc-400 leading-relaxed">
          SymBioForge leverages a swarm of specialized Model Context Protocol (MCP) agents to automatically analyze industrial waste streams, discover symbiotic matches, and invent novel product concepts. 
        </p>

        <h3 className="text-xl font-semibold text-zinc-200 mt-8 mb-4">Core Agents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
          {[
            { name: "Scout", desc: "Monitors ERP databases to ingest raw factory operational metrics." },
            { name: "Profiler", desc: "Analyzes and classifies raw waste streams using LLM capabilities." },
            { name: "Matchmaker", desc: "Finds symbiotic matches across factories." },
            { name: "Inventor", desc: "Proposes new market products from unmatched waste." },
            { name: "Architect", desc: "Generates manufacturing blueprints and capex estimates." },
            { name: "Auditor", desc: "Calculates environmental and financial ROI." },
            { name: "Clerk", desc: "Automates regulatory compliance paperwork (SPCB Form V)." },
            { name: "Sentinel", desc: "Monitors swarm health and auto-corrects execution failures." }
          ].map(agent => (
            <div key={agent.name} className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <h4 className="font-semibold text-zinc-200 mb-1">{agent.name}</h4>
              <p className="text-sm text-zinc-400">{agent.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-semibold text-zinc-200 border-b border-zinc-800 pb-2 mb-4 mt-12">Getting Started</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          To deploy your own cluster, you need to connect your ERP systems via the MCP endpoints. The Swarm will automatically start pulling data when enabled in the Agents page.
        </p>
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-sm text-zinc-300">
          POST /api/factories/register
        </div>
      </div>
    </div>
  )
}
