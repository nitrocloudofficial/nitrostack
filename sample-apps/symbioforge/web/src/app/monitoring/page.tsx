"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Activity, AlertCircle, CheckCircle2, Network, Server } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ClusterState } from "@/lib/types"

const AGENTS = ["Clerk", "Scout", "Profiler", "Matchmaker", "Inventor", "Auditor", "Architect", "Sentinel"]

export default function MonitoringPage() {
  const [data, setData] = useState<ClusterState | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchState = async () => {
      try {
        const response = await fetch("/api/cluster")
        if (!response.ok) throw new Error("Unable to load cluster state")
        const json = await response.json()
        if (mounted) {
          setData(json)
          setLoadFailed(false)
          setLastCheckedAt(new Date())
        }
      } catch {
        if (mounted) {
          setLoadFailed(true)
          setLastCheckedAt(new Date())
        }
      }
    }

    fetchState()
    const interval = setInterval(fetchState, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const agentActivity = useMemo(() => {
    return AGENTS.map((agent) => ({
      agent,
      events: data?.activityLogs.filter((log) => log.agent === agent).length ?? 0,
    }))
  }, [data])

  const warningCount = data?.activityLogs.filter((log) => log.type === "warning" || log.type === "error").length ?? 0
  const totalWasteStreams = data?.factories.reduce((count, factory) => count + (factory.wasteStreams?.length ?? 0), 0) ?? 0
  const blueprintCoverage = data && data.products.length > 0
    ? Math.round((data.blueprints.length / data.products.length) * 100)
    : 0

  const services = [
    {
      name: "Next.js Dashboard",
      status: loadFailed ? "Degraded" : "Online",
      detail: lastCheckedAt ? `Checked ${lastCheckedAt.toLocaleTimeString()}` : "Checking",
      icon: Server,
      healthy: !loadFailed,
    },
    {
      name: "Cluster State Engine",
      status: data ? "Loaded" : "Pending",
      detail: data ? `${data.factories.length} factories, ${data.matches.length} matches` : "Awaiting state",
      icon: Network,
      healthy: Boolean(data),
    },
    {
      name: "Agent Event Log",
      status: warningCount > 0 ? "Review" : "Clear",
      detail: `${warningCount} warnings or errors`,
      icon: Activity,
      healthy: warningCount === 0,
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">System Monitoring</h1>
        <p className="text-zinc-400 mt-1">Operational state derived from the live SymBioForge application state.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center"><Server className="w-4 h-4 mr-2" /> Factories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{data?.factories.length ?? 0}</div>
            <p className="text-xs text-zinc-500 mt-1">{totalWasteStreams} waste streams indexed</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center"><Network className="w-4 h-4 mr-2" /> Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{data?.matches.length ?? 0}</div>
            <p className="text-xs text-zinc-500 mt-1">{data?.products.length ?? 0} product concepts</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center"><CheckCircle2 className="w-4 h-4 mr-2" /> Blueprint Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{blueprintCoverage}%</div>
            <Progress value={Math.min(100, blueprintCoverage)} className="h-2 mt-3 bg-zinc-800" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-950/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> Agent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={warningCount > 0 ? "text-2xl font-bold text-amber-400" : "text-2xl font-bold text-zinc-100"}>{warningCount}</div>
            <p className="text-xs text-zinc-500 mt-1">Warnings and errors in activity log</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-zinc-950/50 border-zinc-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-zinc-200">Agent Event Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentActivity}>
                <XAxis dataKey="agent" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px" }} />
                <Bar dataKey="events" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base text-zinc-200">Application Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <service.icon className="w-5 h-5 text-zinc-500" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{service.name}</p>
                      <p className="text-xs text-zinc-500">{service.detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${service.healthy ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className={service.healthy ? "text-sm text-emerald-400" : "text-sm text-amber-400"}>{service.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
