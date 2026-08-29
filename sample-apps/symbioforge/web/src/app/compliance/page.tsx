"use client"

import { useEffect, useState } from "react"
import { Factory } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Download, FileCheck2, Clock } from "lucide-react"

export default function CompliancePage() {
  const [factories, setFactories] = useState<Factory[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
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
  }, [])

  const handleDownload = async (factory: Factory) => {
    try {
      setDownloadingId(factory.id)
      const response = await fetch(`/api/compliance/${factory.id}/pdf`)
      if (!response.ok) {
        throw new Error(await response.text())
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const filename = response.headers
        .get("Content-Disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? `Form_V_${factory.id}.pdf`

      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast({
        title: "Download Successful",
        description: `Form V for ${factory.name} generated successfully.`,
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "There was an error generating the PDF.",
      })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Compliance Reporting</h1>
          <p className="text-zinc-400 mt-1">Manage SPCB Form V annual environmental statements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Filed</p>
            <p className="text-2xl font-bold text-zinc-200">
              {factories.filter(f => f.complianceStatus === 'filed').length}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Pending</p>
            <p className="text-2xl font-bold text-zinc-200">
              {factories.filter(f => f.complianceStatus === 'pending').length}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-zinc-800 overflow-hidden bg-zinc-950/50">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
              <TableHead className="text-zinc-400">Factory</TableHead>
              <TableHead className="text-zinc-400">Industry</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-right text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                  Loading compliance data...
                </TableCell>
              </TableRow>
            ) : factories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                  No factories found.
                </TableCell>
              </TableRow>
            ) : (
              factories.map((factory) => (
                <TableRow key={factory.id} className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableCell className="font-medium text-zinc-200">{factory.name}</TableCell>
                  <TableCell className="text-zinc-400">{factory.industryType}</TableCell>
                  <TableCell>
                    <Badge variant={factory.complianceStatus === 'filed' ? 'default' : 'secondary'} className={factory.complianceStatus === 'filed' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : ''}>
                      {factory.complianceStatus === 'filed' ? 'Filed' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-zinc-400 hover:text-white" 
                      disabled={factory.complianceStatus === 'pending' || downloadingId === factory.id}
                      onClick={() => handleDownload(factory)}
                    >
                      {downloadingId === factory.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Download Form V
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
