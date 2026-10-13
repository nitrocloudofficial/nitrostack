"use client"

import { useEffect, useState } from "react"

interface EcosystemData {
  nodes: { id: string; label: string; type: string; lat: number; lng: number }[];
  edges: { id: string; source: string; target: string; label: string; weight: number }[];
}

export default function EcosystemPage() {
  const [data, setData] = useState<EcosystemData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/ecosystem")
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="h-20 bg-zinc-900/50 rounded-lg animate-pulse" />
        <div className="h-[600px] bg-zinc-900/50 rounded-xl animate-pulse" />
      </div>
    )
  }

  // Calculate bounding box to normalize coordinates
  const lats = data?.nodes.map(n => n.lat) || [0, 1]
  const lngs = data?.nodes.map(n => n.lng) || [0, 1]
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // Map lat/lng to an 800x600 viewBox with some padding
  const padding = 100
  const width = 1000
  const height = 600
  
  const getX = (lng: number) => padding + ((lng - minLng) / (maxLng - minLng || 1)) * (width - padding * 2)
  const getY = (lat: number) => padding + ((lat - minLat) / (maxLat - minLat || 1)) * (height - padding * 2)

  // Helper to find node by id
  const getNode = (id: string) => data?.nodes.find(n => n.id === id)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Ecosystem Map</h1>
        <p className="text-zinc-400 mt-1">Geographic representation of the industrial symbiosis network.</p>
      </div>

      <div className="relative flex-1 min-h-[600px] border border-zinc-800 rounded-xl bg-zinc-950/80 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-zinc-800" preserveAspectRatio="xMidYMid meet">
          {/* Edges */}
          {data?.edges.map(edge => {
            const source = getNode(edge.source)
            const target = getNode(edge.target)
            if (!source || !target) return null
            
            const x1 = getX(source.lng)
            const y1 = getY(source.lat)
            const x2 = getX(target.lng)
            const y2 = getY(target.lat)

            return (
              <g key={edge.id} className="group">
                <line 
                  x1={x1} y1={y1} x2={x2} y2={y2} 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  className="transition-colors group-hover:text-emerald-500"
                />
                <circle cx={(x1+x2)/2} cy={(y1+y2)/2} r="16" fill="#09090b" stroke="currentColor" className="group-hover:text-emerald-500" />
                <text x={(x1+x2)/2} y={(y1+y2)/2 + 4} fontSize="10" textAnchor="middle" fill="#a1a1aa" className="group-hover:fill-emerald-400">
                  {Math.round(edge.weight)}
                </text>
              </g>
            )
          })}

          {/* Nodes */}
          {data?.nodes.map(node => {
            const x = getX(node.lng)
            const y = getY(node.lat)
            return (
              <g key={node.id} className="group cursor-pointer">
                <circle 
                  cx={x} cy={y} r="12" 
                  fill="#09090b"
                  stroke="#3f3f46"
                  strokeWidth="3"
                  className="group-hover:stroke-zinc-100 transition-colors shadow-xl"
                />
                <text x={x} y={y + 24} fontSize="12" textAnchor="middle" fill="#fafafa" className="font-medium">
                  {node.label}
                </text>
                <text x={x} y={y + 38} fontSize="10" textAnchor="middle" fill="#71717a">
                  {node.type}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-4 bg-zinc-900/80 backdrop-blur-md rounded-lg border border-zinc-800">
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Legend</h4>
          <div className="flex items-center gap-2 mb-1 text-xs text-zinc-500">
            <div className="w-3 h-3 rounded-full border-2 border-zinc-500"></div> Factory Node
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-4 h-[2px] bg-zinc-500"></div> Waste Stream Edge
          </div>
        </div>
      </div>
    </div>
  )
}
