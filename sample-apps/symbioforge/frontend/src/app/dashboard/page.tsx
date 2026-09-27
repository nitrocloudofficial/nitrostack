"use client";
import Navbar from "@/components/Navbar";
import {
  clusterMetrics, agents, factories, opportunities,
  products, wasteCategories, simulationData,
  recentActivity, topChains,
} from "@/lib/data";
import {
  Factory, Recycle, Leaf, Droplets, Zap, IndianRupee,
  TrendingUp, AlertTriangle, CheckCircle,
  Activity, ShieldCheck, Gauge, Clock, Target,
  Package, ArrowUpRight, ArrowRight, BarChart3,
  CircleDot, FlaskConical, Layers, Link2, Calendar,
} from "lucide-react";

const fmt = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

const statusColor: Record<string, { bg: string; text: string; dot: string }> = {
  Active: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  "Blueprint Ready": { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
  Evaluated: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  New: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
};

const complianceColor: Record<string, { bg: string; text: string; label: string }> = {
  filed: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Filed" },
  pending: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Pending" },
  overdue: { bg: "bg-red-500/10", text: "text-red-400", label: "Overdue" },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusColor[status] || statusColor.New;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string; trend?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800/60 p-5 hover:border-slate-700/60 transition-all">
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.04]" style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ background: `${color}12` }}>
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-400">
            <ArrowUpRight className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function ComplianceRing({ filed, pending, overdue, size = 140 }: {
  filed: number; pending: number; overdue: number; size?: number;
}) {
  const total = filed + pending + overdue;
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const segments = [
    { value: filed, color: "#10b981" },
    { value: pending, color: "#f59e0b" },
    { value: overdue, color: "#ef4444" },
  ];

  let offset = 0;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circ;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              style={{ transition: "all 0.8s ease-out" }} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-white">{Math.round((filed / total) * 100)}%</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">compliant</div>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-800">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

function SimulationChart() {
  const maxCo2 = Math.max(...simulationData.map(d => d.co2));
  return (
    <div className="flex items-end gap-1.5 h-32">
      {simulationData.map((d, i) => {
        const h = (d.co2 / maxCo2) * 100;
        const isNow = i === 0;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] text-slate-500 font-medium">{d.co2}t</span>
            <div className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${h}%`,
                background: isNow ? "#10b981" : `rgba(16,185,129,${0.15 + (i / simulationData.length) * 0.45})`,
                minHeight: "4px",
              }} />
            <span className={`text-[9px] ${isNow ? "text-emerald-400 font-bold" : "text-slate-600"}`}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const m = clusterMetrics;
  const sortedFactories = [...factories].sort((a, b) => b.savings - a.savings);
  const maxSavings = sortedFactories[0]?.savings || 1;

  return (
    <div className="min-h-screen bg-[#060a13]">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ecosystem Command Center</h1>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> July 26, 2026 · Coimbatore Industrial Corridor
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-semibold">8 Agents Active</span>
            </div>
          </div>
        </div>

        {/* ─── Financial KPIs ─── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <KpiCard label="Annual Savings" value="₹22L" sub="across 18 factories" icon={IndianRupee} color="#10b981" trend="+18%" />
          <KpiCard label="Product Revenue" value="₹8.4L" sub="3 products invented" icon={Package} color="#8b5cf6" trend="+32%" />
          <KpiCard label="Average ROI" value="340%" sub="on symbiotic pathways" icon={TrendingUp} color="#3b82f6" />
          <KpiCard label="Avg Payback" value="6.2 mo" sub="capital recovery" icon={Clock} color="#f59e0b" />
          <KpiCard label="CO₂ Avoided" value="184t" sub="= 40 cars off road" icon={Leaf} color="#22c55e" trend="+12%" />
        </div>

        {/* ─── Opportunity Pipeline + Compliance ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Opportunity Pipeline - 2/3 */}
          <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-[15px]">Opportunity Pipeline</h2>
                <span className="text-xs text-slate-500 ml-1">Ranked by annual value</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> {m.activeSymbioses} Active</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> {m.blueprintReady} Blueprint</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> {m.evaluated} Evaluated</span>
              </div>
            </div>

            <div className="space-y-2">
              {opportunities.map((opp, i) => (
                <div key={opp.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-all group">
                  <span className="w-6 text-center text-xs text-slate-600 font-bold">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">{opp.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${opp.type === "product" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                        {opp.type === "product" ? "Product" : "Match"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{opp.source} → {opp.target}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-emerald-400">{fmt(opp.annualValue)}<span className="text-[10px] text-slate-500 font-normal">/yr</span></div>
                    <div className="text-[10px] text-slate-500">{opp.co2Saved}t CO₂</div>
                  </div>
                  <div className="shrink-0 w-6 text-center">
                    <div className="text-sm font-bold text-blue-400">{opp.score}</div>
                    <div className="text-[9px] text-slate-600">score</div>
                  </div>
                  <div className="shrink-0 w-28">
                    <StatusBadge status={opp.status} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/40">
              <span className="text-xs text-slate-500">Total pipeline value: <span className="text-emerald-400 font-semibold">{fmt(opportunities.reduce((s, o) => s + o.annualValue, 0))}/yr</span></span>
              <span className="text-xs text-slate-500">{opportunities.length} of {m.symbioses} opportunities shown</span>
            </div>
          </div>

          {/* Compliance + Resource Savings - 1/3 */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-[15px]">SPCB Compliance</h2>
              </div>
              <div className="flex justify-center mb-4">
                <ComplianceRing filed={m.complianceFiled} pending={m.compliancePending} overdue={m.complianceOverdue} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Filed
                  </span>
                  <span className="text-sm font-bold text-emerald-400">{m.complianceFiled}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Pending
                  </span>
                  <span className="text-sm font-bold text-amber-400">{m.compliancePending}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Overdue
                  </span>
                  <span className="text-sm font-bold text-red-400">{m.complianceOverdue}</span>
                </div>
              </div>
              {m.complianceOverdue > 0 && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-red-400/80">
                      {factories.filter(f => f.compliance === "overdue").map(f => f.name).join(", ")} — overdue for SPCB Form V filing
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-5 h-5 text-cyan-400" />
                <h2 className="font-semibold text-[15px]">Resource Savings</h2>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Water Saved", value: "14.6L liters/yr", icon: Droplets, color: "#06b6d4" },
                  { label: "Energy Saved", value: "291 MWh/yr", icon: Zap, color: "#f59e0b" },
                  { label: "Landfill Diverted", value: "145.5 tons/yr", icon: Recycle, color: "#10b981" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/30">
                    <item.icon className="w-4 h-4 shrink-0" style={{ color: item.color }} />
                    <div className="flex-1">
                      <div className="text-[11px] text-slate-500">{item.label}</div>
                      <div className="text-sm font-semibold" style={{ color: item.color }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Product Innovation ─── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-[15px]">AI-Invented Products</h2>
            <span className="text-xs text-slate-500 ml-1">Revenue opportunities from waste-to-product innovation</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5 hover:border-slate-700/60 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{p.name}</h3>
                    <div className="mt-1"><StatusBadge status={p.status} /></div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-400">{fmt(p.revenuePerYear)}</div>
                    <div className="text-[10px] text-slate-500">revenue/yr</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{p.description}</p>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Feasibility</span>
                    <span className="font-semibold text-emerald-400">{p.feasibility}%</span>
                  </div>
                  <MiniBar value={p.feasibility} max={100} color="#10b981" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/40">
                  <div className="text-center">
                    <div className="text-xs font-bold text-blue-400">{fmt(p.capex)}</div>
                    <div className="text-[9px] text-slate-600">CAPEX</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-amber-400">{p.paybackMonths}mo</div>
                    <div className="text-[9px] text-slate-600">Payback</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-emerald-400">{p.margin}%</div>
                    <div className="text-[9px] text-slate-600">Margin</div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/30">
                  <div className="text-[10px] text-slate-500 mb-1">Waste Inputs:</div>
                  <div className="flex flex-wrap gap-1">
                    {p.wasteInputs.map(w => (
                      <span key={w} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400">{w}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Factory Leaderboard + 12-Month Projection ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
          {/* Factory Leaderboard - 3/5 */}
          <div className="lg:col-span-3 rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-[15px]">Factory Leaderboard</h2>
                <span className="text-xs text-slate-500 ml-1">by annual contribution</span>
              </div>
              <span className="text-xs text-slate-500">{factories.length} of {m.factories} factories</span>
            </div>
            <div className="space-y-2">
              {sortedFactories.map((f, i) => {
                const comp = complianceColor[f.compliance];
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/25 hover:bg-slate-800/40 transition-all">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${i < 3 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200 truncate">{f.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${comp.bg} ${comp.text}`}>{comp.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{f.industry}</div>
                      <div className="mt-1.5">
                        <MiniBar value={f.savings} max={maxSavings} color={i < 3 ? "#10b981" : "#3b82f6"} />
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <div className="text-sm font-bold text-emerald-400">{fmt(f.savings)}</div>
                      <div className="text-[10px] text-slate-500">{f.co2}t CO₂ · {f.matches} links</div>
                    </div>
                    <div className="shrink-0 w-10 text-center">
                      <div className="text-xs font-bold" style={{ color: f.utilization > 75 ? "#10b981" : f.utilization > 60 ? "#f59e0b" : "#ef4444" }}>
                        {f.utilization}%
                      </div>
                      <div className="text-[9px] text-slate-600">util.</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Projection + Chains */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-[15px]">12-Month Projection</h2>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">SymbioSim Time Machine — projected CO₂ avoidance</p>
              <SimulationChart />
              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-800/40">
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-400">428t</div>
                  <div className="text-[10px] text-slate-500">CO₂ by Jul &apos;27</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">30</div>
                  <div className="text-[10px] text-slate-500">Factories</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-400">₹57.6L</div>
                  <div className="text-[10px] text-slate-500">Savings</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="w-5 h-5 text-cyan-400" />
                <h2 className="font-semibold text-[15px]">Top Supply Chains</h2>
              </div>
              <div className="space-y-3">
                {topChains.map(chain => (
                  <div key={chain.id} className="p-3 rounded-xl bg-slate-800/25">
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      {chain.route.map((stop, i) => (
                        <span key={stop} className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-300 font-medium">{stop}</span>
                          {i < chain.route.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-500 mb-2">{chain.waste}</div>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="text-emerald-400 font-semibold">{fmt(chain.savings)}/yr</span>
                      <span className="text-blue-400">{chain.co2Saved}t CO₂</span>
                      <span className="text-slate-500">{chain.hops} hops</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Waste Intelligence + System Health ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold text-[15px]">Waste Stream Intelligence</h2>
              <span className="text-xs text-slate-500 ml-1">{m.wasteProcessedTons}t total processed</span>
            </div>
            <div className="space-y-3">
              {wasteCategories.map(cat => (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-slate-400 font-medium shrink-0">{cat.category}</span>
                  <div className="flex-1">
                    <MiniBar value={cat.utilized} max={100} color={cat.color} />
                  </div>
                  <span className="text-xs font-semibold w-10 text-right" style={{ color: cat.color }}>{cat.utilized}%</span>
                  <span className="text-[10px] text-slate-500 w-16 text-right">{cat.tons}t · {cat.factories}f</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/40">
              <span className="text-xs text-slate-500">Overall utilization rate</span>
              <span className="text-sm font-bold text-emerald-400">{m.wasteUtilizationRate}%</span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-[15px]">System Intelligence</h2>
            </div>

            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-slate-800/30">
              {agents.map(a => (
                <div key={a.name} className="flex-1 text-center">
                  <div className="w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-[10px] font-bold border"
                    style={{
                      background: `${a.color}10`,
                      borderColor: `${a.color}30`,
                      color: a.color,
                    }}>
                    {a.name.slice(0, 2)}
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full mx-auto block ${a.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "Ecosystem", status: true, detail: "100% healthy" },
                { label: "Self-Healing", status: true, detail: "Ready" },
                { label: "Volume Baselines", status: true, detail: "No deviations" },
                { label: "Compliance Watch", status: false, detail: "2 overdue" },
              ].map(h => (
                <div key={h.label} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/20">
                  {h.status
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  <div>
                    <div className="text-[11px] text-slate-300 font-medium">{h.label}</div>
                    <div className="text-[10px] text-slate-500">{h.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800/40 pt-3">
              <h3 className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-medium">Live Activity</h3>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {recentActivity.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] py-1">
                    <span className="text-slate-600 font-mono w-14 shrink-0">{log.time}</span>
                    {log.type === "success" ? <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                      : log.type === "warning" ? <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                      : <CircleDot className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />}
                    <span className="text-slate-500 font-medium w-20 shrink-0">{log.agent}</span>
                    <span className="text-slate-400">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Circular Economy Score Strip ─── */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900/60 to-emerald-900/10 border border-slate-800/60 p-5 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Gauge className="w-6 h-6 text-emerald-400" />
              <div>
                <h2 className="font-semibold text-[15px]">Circular Economy Score</h2>
                <p className="text-xs text-slate-500">Percentage of waste successfully converted to value within the cluster</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">{m.circularScore}%</div>
                <div className="text-[10px] text-slate-500">Current</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400/50">34%</div>
                <div className="text-[10px] text-slate-500">12-mo target</div>
              </div>
              <div className="h-10 w-px bg-slate-800" />
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">{m.wasteProcessedTons}t</div>
                <div className="text-[10px] text-slate-500">Waste processed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{m.landfillDiverted}t</div>
                <div className="text-[10px] text-slate-500">Diverted</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-800/30">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>SymBioForge Ecosystem Command Center — Coimbatore Industrial Corridor</span>
          <span>Powered by 8 autonomous AI agents via NitroStack MCP</span>
        </div>
      </footer>
    </div>
  );
}
