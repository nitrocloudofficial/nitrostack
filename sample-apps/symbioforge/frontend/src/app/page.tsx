"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { agents, clusterMetrics, eventChain, tools, impactEquivalencies } from "@/lib/data";
import { Recycle, Factory, Zap, Droplets, Leaf, IndianRupee, ArrowRight, ChevronRight, Car, TreePine, Banknote, Users, Landmark, ExternalLink } from "lucide-react";

function StatCard({ value, label, icon: Icon, color }: { value: string; label: string; icon: React.ElementType; color: string }) {
  return (
    <div className="text-center p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
      <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color }}>{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

export default function Home() {
  const impactIcons: Record<string, React.ElementType> = { Car, TreePine, Banknote, Users, Landmark };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.06),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
              <Recycle className="w-4 h-4" /> NitroStack MCP Server — Hackathon 2026
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Turning Industrial<br />
              <span className="gradient-text">Waste into Shared</span><br />
              Prosperity
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed mb-8 max-w-2xl">
              8 autonomous AI agents discover waste-to-resource symbioses across an industrial cluster
              in Coimbatore, India. Zero human-in-the-loop: factories register, agents chain, matches form,
              products get invented, and blueprints get planned — all driven by events.
            </p>
            <div className="flex gap-4">
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors">
                View Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="https://github.com/kuchipudiyokshith9999-eng/SymBioForge" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition-colors">
                GitHub <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Numbers */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard value="18" label="Factories" icon={Factory} color="#3b82f6" />
          <StatCard value="57" label="Symbioses" icon={Recycle} color="#10b981" />
          <StatCard value="184t" label="CO₂ Avoided" icon={Leaf} color="#22c55e" />
          <StatCard value="1.46M L" label="Water Saved" icon={Droplets} color="#06b6d4" />
          <StatCard value="291 MWh" label="Energy Saved" icon={Zap} color="#f59e0b" />
          <StatCard value="₹22L" label="Value Created" icon={IndianRupee} color="#8b5cf6" />
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-3">How It Works</h2>
        <p className="text-slate-400 mb-10 max-w-2xl">
          One factory&apos;s waste becomes another factory&apos;s raw material. 8 AI agents orchestrate
          everything through an event-driven chain — no human intervention needed.
        </p>

        <div className="relative">
          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500 via-blue-500 to-purple-500 opacity-30" />
          <div className="space-y-6">
            {eventChain.map((e, i) => (
              <div key={e.event} className="flex items-start gap-5 pl-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0 z-10">
                  {i + 1}
                </div>
                <div className="flex-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">{e.event}</code>
                    <span className="text-xs text-slate-500">→ {e.agent}</span>
                  </div>
                  <div className="text-sm text-slate-300">{e.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The 8 Agents */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-3">The 8 Autonomous Agents</h2>
        <p className="text-slate-400 mb-10 max-w-2xl">
          Each agent has a single responsibility and communicates through events.
          Together they form a self-organizing, self-healing swarm.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((a) => (
            <div key={a.name} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all group">
              <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center text-lg font-bold"
                style={{ background: `${a.color}15`, color: a.color }}>
                {a.name.slice(0, 2)}
              </div>
              <h3 className="font-semibold text-white mb-1.5">{a.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{a.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Impact Story */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-3">Real-World Impact</h2>
        <p className="text-slate-400 mb-10 max-w-2xl">
          Raw numbers translated into human impact. This is what industrial symbiosis means for people.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {impactEquivalencies.map((eq) => {
            const Icon = impactIcons[eq.icon] || Leaf;
            return (
              <div key={eq.metric} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${eq.color}15` }}>
                  <Icon className="w-6 h-6" style={{ color: eq.color }} />
                </div>
                <div className="text-2xl font-bold mb-1" style={{ color: eq.color }}>
                  {typeof eq.value === "number" && eq.value > 9999 ? `₹${(eq.value / 100000).toFixed(1)}L` : eq.value}
                </div>
                <div className="text-xs text-slate-500 mb-2">{eq.unit}</div>
                <div className="text-sm text-slate-300 font-medium">{eq.metric}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MCP Tools */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-3">15 MCP Tools</h2>
        <p className="text-slate-400 mb-10 max-w-2xl">
          Users interact through natural language in NitroStudio&apos;s AI Chat.
          Each tool has a visual widget dashboard.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((t) => (
            <div key={t.name} className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="shrink-0">
                <ChevronRight className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <code className="text-sm text-emerald-400 font-mono">{t.name}</code>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{t.desc}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 shrink-0 hidden sm:inline">{t.widget}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-10">Tech Stack</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: "NitroStack MCP", desc: "Server Framework", color: "#10b981" },
            { name: "TypeScript", desc: "Language (strict)", color: "#3b82f6" },
            { name: "Next.js 14", desc: "Widget UIs", color: "#ffffff" },
            { name: "Zod", desc: "Input Validation", color: "#8b5cf6" },
            { name: "pdfkit", desc: "Compliance PDFs", color: "#ef4444" },
          ].map((t) => (
            <div key={t.name} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <div className="text-lg font-bold mb-1" style={{ color: t.color }}>{t.name}</div>
              <div className="text-xs text-slate-500">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center p-12 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-slate-800">
          <h2 className="text-3xl font-bold mb-4">Ready to explore the ecosystem?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            See live metrics, factory details, agent status, and the full autonomous pipeline in action.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 text-white font-semibold text-lg hover:bg-emerald-600 transition-colors">
            Open Dashboard <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Recycle className="w-4 h-4 text-emerald-500" />
            <span>SymBioForge — NitroStack Hackathon 2026</span>
          </div>
          <div>Built by 4 students from Amrita University</div>
        </div>
      </footer>
    </div>
  );
}
