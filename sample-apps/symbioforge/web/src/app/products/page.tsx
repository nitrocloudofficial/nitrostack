"use client"

import { useEffect, useState } from "react"
import { ProductConcept } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Leaf, PackageOpen, Target, IndianRupee } from "lucide-react"

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductConcept[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/products")
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then(data => {
        setProducts(data.products ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Products</h1>
        <p className="text-zinc-400 mt-1">AI-invented product concepts generated from available cluster waste streams.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 bg-zinc-900/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center border border-zinc-800 rounded-xl bg-zinc-950/50">
          <PackageOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No Products Invented</h3>
          <p className="text-zinc-500 mt-2">The swarm has not discovered any feasible product concepts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <Card key={product.id} className="bg-zinc-950/50 border-zinc-800 flex flex-col hover:border-zinc-700 transition-colors">
              <CardHeader className="pb-3 border-b border-zinc-800/50">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={product.status === "Active" ? "default" : "secondary"}>
                    {product.status}
                  </Badge>
                  <div className="flex items-center space-x-1 text-emerald-400 font-mono text-sm">
                    <span>{product.feasibilityScore}%</span>
                    <span className="text-zinc-500 text-xs">Feasibility</span>
                  </div>
                </div>
                <CardTitle className="text-xl text-zinc-100">{product.name}</CardTitle>
                <CardDescription className="text-zinc-400">{product.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-zinc-300">Waste Streams Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.wasteStreamsUsed.map((w, idx) => (
                      <Badge key={idx} variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                        {w.wasteStreamName} ({Math.round(w.proportion * 100)}%)
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-zinc-800/50">
                  <div className="space-y-1">
                    <div className="flex items-center text-zinc-500 text-xs">
                      <IndianRupee className="w-3 h-3 mr-1" /> Revenue
                    </div>
                    <p className="text-sm font-medium text-zinc-200">₹{product.revenuePotentialInrPerYear.toLocaleString()}/yr</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center text-zinc-500 text-xs">
                      <Leaf className="w-3 h-3 mr-1" /> CO2 Saved
                    </div>
                    <p className="text-sm font-medium text-emerald-400">{product.co2SavedTonsPerYear}t/yr</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center text-zinc-500 text-xs">
                      <Target className="w-3 h-3 mr-1" /> Target Market
                    </div>
                    <p className="text-sm text-zinc-300">{product.targetMarket}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
