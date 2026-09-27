"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClusterState } from "@/lib/types"
import { Play, RotateCcw, Square } from "lucide-react"

const AGENTS_META = [
  { id: "Clerk", desc: "Data intake + compliance generation" },
  { id: "Scout", desc: "Factory discovery & ingestion" },
  { id: "Profiler", desc: "Waste stream classification" },
  { id: "Matchmaker", desc: "Symbiosis matching algorithm" },
  { id: "Inventor", desc: "Product concept generation" },
  { id: "Auditor", desc: "Impact quantification & ranking" },
  { id: "Architect", desc: "Manufacturing pathway design" },
  { id: "Sentinel", desc: "Monitoring & self-healing" },
] as const

function formatRelativeTimestamp(timestamp?: string) {
  if (!timestamp) return "No runs yet"

  const elapsedMs = Date.now() - new Date(timestamp).getTime()
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return "Just now"

  const minutes = Math.floor(elapsedMs / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AgentsPage() {
  const [data, setData] = useState<ClusterState | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchState = () => {
    fetch("/api/cluster")
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((json) => {
        setData(json)
      })
      .catch(() => {
        setData(null)
      })
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSwarmAction = async (action: string) => {
    setActionLoading(action)
    try {
      await fetch("/api/swarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      fetchState()
    } finally {
      setActionLoading(null)
    }
  }

  const getAgentLogs = (agentId: string) => {
    return data?.activityLogs.filter((log) => log.agent === agentId) || []
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">AI Agents</h1>
          <p className="text-zinc-400 mt-1">Monitor and control the autonomous swarm agents.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handleSwarmAction(data?.swarmActive ? "stop" : "start")}
            disabled={actionLoading !== null}
            className={data?.swarmActive ? "border-amber-500/50 text-amber-500 hover:bg-amber-500/10" : "border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"}
          >
            {data?.swarmActive ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {data?.swarmActive ? "Stop Swarm" : "Start Swarm"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSwarmAction("reset")}
            disabled={actionLoading !== null}
            className="border-zinc-700 text-zinc-300"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS_META.map((meta) => {
          const logs = getAgentLogs(meta.id)
          const lastLog = logs[logs.length - 1]
          const isActive = Boolean(data?.swarmActive)
          const hasRecentWork = Boolean(lastLog)
          const statusColor = isActive ? "bg-emerald-500" : hasRecentWork ? "bg-blue-500" : "bg-zinc-600"
          const statusLabel = isActive ? "Active" : hasRecentWork ? "Idle" : "Waiting"

          return (
            <Card key={meta.id} className="bg-zinc-950/50 border-zinc-800 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <CardTitle className="text-lg text-zinc-200">{meta.id}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor}`} />
                    <span className="text-xs text-zinc-400">{statusLabel}</span>
                  </div>
                </div>
                <CardDescription className="text-xs text-zinc-500 min-h-8">{meta.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col">
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Last run:</span>
                    <span className="text-zinc-200 font-mono">{formatRelativeTimestamp(lastLog?.timestamp)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Executions:</span>
                    <span className="text-zinc-200 font-mono">{logs.length}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Warnings:</span>
                    <span className="text-zinc-200 font-mono">{logs.filter((log) => log.type === "warning" || log.type === "error").length}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <p className="text-xs font-medium text-zinc-500 mb-2">Last Action</p>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded p-2 min-h-[60px] text-xs text-zinc-400 font-mono">
                    {lastLog ? lastLog.message : "Waiting for triggers..."}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
