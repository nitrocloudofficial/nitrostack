"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Factory,
  Recycle,
  Lightbulb,
  Network,
  TrendingUp,
  FileCheck2,
  Bot,
  Wrench,
  Activity,
  ScrollText,
  BookOpen,
  Settings,
  Leaf
} from "lucide-react"

const routes = [
  { label: "Overview", icon: LayoutDashboard, href: "/", color: "text-zinc-300" },
  { label: "Carbon Metrics", icon: Leaf, href: "/carbon", color: "text-emerald-400" },
  { label: "Matches", icon: Network, href: "/matches", color: "text-zinc-300" },
  { label: "Factories", icon: Factory, href: "/factories", color: "text-zinc-300" },
  { label: "Waste Streams", icon: Recycle, href: "/waste-streams", color: "text-zinc-300" },
  { label: "Products", icon: Lightbulb, href: "/products", color: "text-zinc-300" },
  { label: "Ecosystem", icon: Network, href: "/ecosystem", color: "text-zinc-300" },
  { label: "Opportunities", icon: TrendingUp, href: "/opportunities", color: "text-emerald-400" },
  { label: "Compliance", icon: FileCheck2, href: "/compliance", color: "text-zinc-300" },
  { label: "Agents", icon: Bot, href: "/agents", color: "text-zinc-300" },
  { label: "Tools", icon: Wrench, href: "/tools", color: "text-zinc-300" },
  { label: "Monitoring", icon: Activity, href: "/monitoring", color: "text-zinc-300" },
  { label: "Activity", icon: ScrollText, href: "/activity", color: "text-zinc-300" },
  { label: "Documentation", icon: BookOpen, href: "/docs", color: "text-zinc-300" },
  { label: "Settings", icon: Settings, href: "/settings", color: "text-zinc-300" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-zinc-950 border-r border-zinc-800 text-zinc-100">
      <div className="px-3 py-2 flex-1">
        <Link href="/" className="flex items-center pl-3 mb-14">
          <h1 className="text-2xl font-bold tracking-tight">
            SymBio<span className="text-emerald-500">Forge</span>
          </h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition-colors",
                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
