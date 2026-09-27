"use client"

import { useEffect, useState } from "react"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { CarbonChart } from "@/components/dashboard/carbon-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClusterState } from "@/lib/types"

export default function DashboardPage() {
  const [data, setData] = useState<ClusterState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/cluster")
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="h-24 w-1/3 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] skeleton" />
          <div className="h-[400px] skeleton" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Overview</h1>
        <p className="text-zinc-400 mt-1">System health and cluster metrics for your industrial symbiosis network.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricBox title="Factories" value={data?.factories?.length || 0} />
        <MetricBox title="Symbiotic Matches" value={data?.matches?.length || 0} />
        <MetricBox title="Products Invented" value={data?.products?.length || 0} />
        <MetricBox 
          title="CO2 Avoided" 
          value={`${data?.totalCo2Avoided?.toLocaleString() || 0}t`} 
          highlight 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass">
          <CardHeader>
            <CardTitle>Carbon Avoided Trend</CardTitle>
            <CardDescription>Monthly progression of CO2 emissions saved by the swarm.</CardDescription>
          </CardHeader>
          <CardContent>
            <CarbonChart />
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardHeader>
            <CardTitle>Live Swarm Activity</CardTitle>
            <CardDescription>Real-time autonomous agent actions.</CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <ActivityFeed logs={data?.activityLogs || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricBox({ title, value, highlight = false }: { title: string, value: string | number, highlight?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-6 flex flex-col justify-center">
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      <h3 className={`text-3xl font-bold mt-2 ${highlight ? 'text-gradient' : 'text-zinc-100'}`}>{value}</h3>
    </div>
  )
}
