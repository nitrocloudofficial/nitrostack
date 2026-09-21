"use client"

import { useEffect, useState } from "react"
import { Factory } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { RegisterFactoryDialog } from "@/components/factories/register-factory-dialog"

export default function FactoriesPage() {
  const [factories, setFactories] = useState<Factory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchFactories = () => {
    setLoading(true)
    fetch("/api/factories")
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then(data => {
        setFactories(data.factories ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchFactories()
  }, [])

  const filteredFactories = factories.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.industryType.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Factories</h1>
          <p className="text-zinc-400 mt-1">Manage and view registered industrial nodes in your network.</p>
        </div>
        <RegisterFactoryDialog onSuccess={fetchFactories} />
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search factories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800"
          />
        </div>
      </div>

      <div className="rounded-md border border-zinc-800 overflow-hidden bg-zinc-950/50">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
              <TableHead className="text-zinc-400">Name</TableHead>
              <TableHead className="text-zinc-400">Industry</TableHead>
              <TableHead className="text-zinc-400">Location</TableHead>
              <TableHead className="text-right text-zinc-400">Waste Streams</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                  Loading factories...
                </TableCell>
              </TableRow>
            ) : filteredFactories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                  No factories found.
                </TableCell>
              </TableRow>
            ) : (
              filteredFactories.map((factory) => (
                <TableRow key={factory.id} className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableCell className="font-medium text-zinc-200">{factory.name}</TableCell>
                  <TableCell className="text-zinc-400">{factory.industryType}</TableCell>
                  <TableCell className="text-zinc-400">{factory.location.address || 'Unknown'}</TableCell>
                  <TableCell className="text-right text-zinc-400">{factory.declaredWastes?.length || 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
