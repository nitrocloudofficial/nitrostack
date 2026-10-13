"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Code, FileJson, Clock, Terminal } from "lucide-react"

const TOOLS = [
  { id: "get-cluster-state", name: "get-cluster-state", desc: "Retrieve live cluster state and swarm metrics.", method: "GET" },
  { id: "register-factory", name: "register-factory", desc: "Register a new factory and trigger agents.", method: "POST" },
  { id: "control-swarm", name: "control-swarm", desc: "Start, stop, or reset the swarm.", method: "POST" },
  { id: "get-opportunity-feed", name: "get-opportunity-feed", desc: "Ranked matches and product concepts.", method: "GET" },
]

export default function ToolsPage() {
  const [selectedTool, setSelectedTool] = useState(TOOLS[0])
  const [activeTab, setActiveTab] = useState("params")
  const [response, setResponse] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)

  const handleExecute = () => {
    setExecuting(true)
    setTimeout(() => {
      setResponse(JSON.stringify({ status: "success", data: { clusterScore: 85, agentsActive: 8 } }, null, 2))
      setExecuting(false)
      setActiveTab("response")
    }, 800)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Tool Explorer</h1>
        <p className="text-zinc-400 mt-1">Interact with the Model Context Protocol (MCP) tools exposed by SymBioForge.</p>
      </div>

      <div className="flex flex-1 overflow-hidden border border-zinc-800 rounded-xl bg-zinc-950/50">
        {/* Sidebar */}
        <div className="w-64 border-r border-zinc-800 bg-zinc-900/30 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <Input placeholder="Search tools..." className="bg-zinc-900 border-zinc-800 h-8" />
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {TOOLS.map(tool => (
                <button 
                  key={tool.id}
                  onClick={() => setSelectedTool(tool)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedTool.id === tool.id ? "bg-zinc-800 text-zinc-100 font-medium" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{tool.name}</span>
                    <span className={`text-[10px] px-1.5 rounded ${tool.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {tool.method}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className={`font-mono text-xs ${selectedTool.method === 'GET' ? 'border-blue-500/50 text-blue-400' : 'border-emerald-500/50 text-emerald-400'}`}>
                  {selectedTool.method}
                </Badge>
                <h2 className="text-xl font-semibold text-zinc-100 font-mono">{selectedTool.name}</h2>
              </div>
              <p className="text-zinc-400 text-sm">{selectedTool.desc}</p>
            </div>
            <Button onClick={handleExecute} disabled={executing} className="bg-emerald-600 hover:bg-emerald-500">
              <Play className="w-4 h-4 mr-2" />
              {executing ? "Executing..." : "Execute"}
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800 px-4">
            <button onClick={() => setActiveTab('params')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'params' ? 'border-emerald-500 text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}>Parameters</button>
            <button onClick={() => setActiveTab('schema')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schema' ? 'border-emerald-500 text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}>Schema</button>
            <button onClick={() => setActiveTab('response')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'response' ? 'border-emerald-500 text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}>Response</button>
            <button onClick={() => setActiveTab('logs')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-emerald-500 text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}>Execution Logs</button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-auto bg-zinc-950">
            {activeTab === 'params' && (
              <div className="space-y-4 max-w-2xl">
                {selectedTool.method === 'POST' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400">JSON Body Payload</p>
                    <textarea 
                      className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-md p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      defaultValue={`{\n  "action": "start"\n}`}
                    />
                  </div>
                ) : (
                  <div className="p-4 border border-zinc-800 border-dashed rounded-lg text-center text-zinc-500">
                    No parameters required for this tool.
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'schema' && (
              <div className="rounded-md border border-zinc-800 bg-zinc-900 overflow-hidden">
                <div className="flex items-center px-4 py-2 border-b border-zinc-800 bg-zinc-950">
                  <FileJson className="w-4 h-4 mr-2 text-zinc-500" />
                  <span className="text-xs text-zinc-400 font-mono">inputSchema.json</span>
                </div>
                <pre className="p-4 text-sm text-emerald-400 font-mono overflow-auto">
                  {`{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": ["start", "stop", "reset"]
    }
  },
  "required": ["action"]
}`}
                </pre>
              </div>
            )}

            {activeTab === 'response' && (
              <div className="h-full flex flex-col">
                {!response ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                    <Code className="w-8 h-8 mb-4 opacity-50" />
                    <p>Click Execute to view the response</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-zinc-800 bg-zinc-900 overflow-hidden flex-1 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950">
                      <div className="flex items-center">
                        <FileJson className="w-4 h-4 mr-2 text-zinc-500" />
                        <span className="text-xs text-zinc-400 font-mono">response.json</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">200 OK</Badge>
                        <span className="text-[10px] text-zinc-500 flex items-center"><Clock className="w-3 h-3 mr-1"/> 124ms</span>
                      </div>
                    </div>
                    <pre className="p-4 text-sm text-zinc-300 font-mono overflow-auto flex-1">
                      {response}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs overflow-auto h-full">
                <div className="flex items-center text-zinc-500 mb-4">
                  <Terminal className="w-4 h-4 mr-2" /> Execution Trace
                </div>
                {!response ? (
                  <p className="text-zinc-600">No execution logs available.</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-zinc-400"><span className="text-blue-400">[INFO]</span> Executing tool {selectedTool.name}...</p>
                    <p className="text-zinc-400"><span className="text-blue-400">[INFO]</span> Validating parameters against schema...</p>
                    <p className="text-zinc-400"><span className="text-emerald-400">[SUCCESS]</span> Validation passed.</p>
                    <p className="text-zinc-400"><span className="text-blue-400">[INFO]</span> Invoking core engine method...</p>
                    <p className="text-zinc-400"><span className="text-emerald-400">[SUCCESS]</span> Execution completed in 124ms.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
