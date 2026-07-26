"use client"

import { useEffect, useState } from "react"
import { WasteStream } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface FactoryProfile {
  factoryId: string;
  factoryName: string;
  industryType: string;
  wasteStreams: WasteStream[];
}

export default function WasteStreamsPage() {
  const [profiles, setProfiles] = useState<FactoryProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/waste-profiles")
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then(data => {
        setProfiles(data.profiles ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredProfiles = profiles.filter(p => 
    p.factoryName.toLowerCase().includes(search.toLowerCase()) ||
    p.wasteStreams.some(w => w.name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Waste Streams</h1>
        <p className="text-zinc-400 mt-1">Detailed breakdown of classified waste across the network.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input 
          placeholder="Search materials or factories..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-zinc-900/50 border-zinc-800"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 bg-zinc-900/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="p-8 text-center border border-zinc-800 rounded-lg bg-zinc-950/50">
          <p className="text-zinc-500">No waste streams found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredProfiles.map(profile => (
            <div key={profile.factoryId} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800/50 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-200">{profile.factoryName}</h3>
                  <p className="text-sm text-zinc-500">{profile.industryType}</p>
                </div>
                <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                  {profile.wasteStreams.length} Streams
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.wasteStreams.map(stream => (
                  <div key={stream.id} className="p-4 rounded-md bg-zinc-900/50 border border-zinc-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-zinc-300">{stream.name}</span>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">{stream.category}</Badge>
                    </div>
                    <div className="text-sm text-zinc-500 space-y-1">
                      <p>Volume: <span className="text-zinc-300">{stream.volume}t / yr</span></p>
                      <p>Contamination: <span className="text-zinc-300 capitalize">{stream.contamination}</span></p>
                    </div>
                  </div>
                ))}
                {profile.wasteStreams.length === 0 && (
                  <p className="text-sm text-zinc-600 italic">No classified waste streams yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
