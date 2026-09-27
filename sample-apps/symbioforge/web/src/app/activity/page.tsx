"use client"

import { useEffect, useState } from "react"
import { ClusterState, ActivityLog } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Search, Filter, Terminal } from "lucide-react"
import { motion } from "framer-motion"

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterSeverity, setFilterSeverity] = useState<string>("all")

  const fetchState = () => {
    fetch("/api/cluster")
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((json: ClusterState) => {
        setLogs(json.activityLogs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs
    .filter(l => filterSeverity === "all" || l.type === filterSeverity)
    .filter(l => l.message.toLowerCase().includes(search.toLowerCase()) || l.agent.toLowerCase().includes(search.toLowerCase()))
    .reverse()

  const exportCSV = () => {
    const csvRows = [
      ["Timestamp", "Agent", "Type", "Message"],
      ...filteredLogs.map(l => [new Date(l.timestamp).toISOString(), l.agent, l.type, `"${l.message.replace(/"/g, '""')}"`])
    ]
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "symbioforge_activity_logs.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Activity Centre</h1>
          <p className="text-zinc-400 mt-1">Advanced system logs and swarm timeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportCSV} variant="outline" className="border-zinc-700 text-zinc-300">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search logs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-950/50 border-zinc-800"
          />
        </div>
        <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 rounded-md px-3 py-1.5">
          <Filter className="w-4 h-4 text-zinc-500" />
          <select 
            value={filterSeverity} 
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-transparent text-sm text-zinc-300 outline-none border-none focus:ring-0 cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
        </div>
      </div>

      <div className="flex-1 rounded-md glass overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <Terminal className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300 font-mono">Live Timeline</span>
          <span className="ml-auto text-xs text-zinc-500">{filteredLogs.length} events</span>
        </div>
        
        <ScrollArea className="flex-1 p-4 font-mono">
          {loading ? (
            <div className="text-zinc-500 text-sm p-4">Loading timeline...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-zinc-500 text-sm p-4">No events found matching criteria.</div>
          ) : (
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              initial="hidden"
              animate="show"
              className="relative border-l border-zinc-800 ml-4 space-y-6 pb-6"
            >
              {filteredLogs.map((log) => {
                const colorMap: Record<string, string> = {
                  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                  success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                  danger: "text-red-400 bg-red-500/10 border-red-500/20",
                  error: "text-red-400 bg-red-500/10 border-red-500/20"
                }
                const dotColorMap: Record<string, string> = {
                  info: "bg-blue-500",
                  success: "bg-emerald-500",
                  warning: "bg-amber-500",
                  danger: "bg-red-500",
                  error: "bg-red-500"
                }
                
                const cMap = colorMap[log.type] || colorMap.info
                const dMap = dotColorMap[log.type] || dotColorMap.info

                return (
                  <motion.div 
                    key={log.id} 
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      show: { opacity: 1, x: 0 }
                    }}
                    className="relative pl-6"
                  >
                    <span className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-[3px] border-zinc-950 ${dMap}`} />
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
                      <span className="text-xs text-zinc-500 w-20">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 rounded ${cMap}`}>{log.agent}</Badge>
                    </div>
                    <p className="text-sm text-zinc-300 break-words max-w-4xl">{log.message}</p>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
