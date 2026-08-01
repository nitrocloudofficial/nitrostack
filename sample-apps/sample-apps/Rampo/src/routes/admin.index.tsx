import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import {
  mockSessions, analyticsData, mockNudges, getRiskLevel, getRiskColor,
} from "@/lib/mock-data";
import {
  Users, ShieldAlert, ShieldCheck, Zap, TrendingDown,
  ArrowUpRight, ArrowDownRight, Radio, Eye, AlertTriangle,
  Clock, Smartphone, Monitor, Tablet,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

export const Route = createFileRoute("/admin/")(  {
  head: () => ({
    meta: [
      { title: "Live Monitoring — NitroStack CX Intelligence" },
      { name: "description", content: "Real-time session monitoring and escalation risk detection." },
    ],
  }),
  component: AdminDashboard,
});

const kpis = [
  { label: "Active Sessions", value: analyticsData.activeNow, icon: Users, trend: "+12%", up: true, color: "#3b82f6" },
  { label: "High Risk Now", value: mockSessions.filter(s => s.riskScore >= 70 && s.status === "active").length, icon: ShieldAlert, trend: "+2", up: true, color: "#ef4444" },
  { label: "Escalations Prevented", value: analyticsData.escalationsPrevented, icon: ShieldCheck, trend: "+8 today", up: false, color: "#22c55e" },
  { label: "Avg Risk Score", value: analyticsData.avgRiskScore, icon: TrendingDown, trend: "-5 pts", up: false, color: "#eab308" },
];

const riskDistribution = [
  { name: "Low", value: 52, color: "#22c55e" },
  { name: "Medium", value: 25, color: "#eab308" },
  { name: "High", value: 15, color: "#f97316" },
  { name: "Critical", value: 8, color: "#ef4444" },
];

function getDeviceIcon(device: string) {
  if (device.includes("iPhone") || device.includes("Android")) return Smartphone;
  if (device.includes("iPad")) return Tablet;
  return Monitor;
}

function AdminDashboard() {
  const highRiskSessions = mockSessions
    .filter(s => s.riskScore >= 60)
    .sort((a, b) => b.riskScore - a.riskScore);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Live Monitoring</h1>
            <p className="text-sm text-gray-500 mt-0.5">Real-time session tracking & escalation risk detection</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <Radio size={10} className="animate-pulse" /> Live
            </span>
            <span className="text-gray-500">Updated 3s ago</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-[#111827] rounded-xl border border-white/5 p-5 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background: `${kpi.color}15` }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.up ? (kpi.color === "#ef4444" ? "text-red-400" : "text-emerald-400") : "text-emerald-400"}`}>
                  {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.trend}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Trend Chart */}
          <div className="col-span-2 bg-[#111827] rounded-xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Escalation vs Prevention — Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analyticsData.dailyTrend}>
                <defs>
                  <linearGradient id="gradEsc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Area type="monotone" dataKey="escalations" stroke="#ef4444" fill="url(#gradEsc)" strokeWidth={2} name="Escalations" />
                <Area type="monotone" dataKey="prevented" stroke="#22c55e" fill="url(#gradPrev)" strokeWidth={2} name="Prevented" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Distribution */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {riskDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
              {riskDistribution.map((r) => (
                <span key={r.name} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                  {r.name} ({r.value}%)
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* High Risk Sessions Table */}
        <div className="bg-[#111827] rounded-xl border border-white/5">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="text-sm font-semibold text-gray-300">High Risk Sessions — Requires Attention</h3>
            </div>
            <span className="text-xs text-gray-500">{highRiskSessions.length} sessions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Device</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Current Page</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Signals</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Risk</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {highRiskSessions.map((s) => {
                  const DeviceIcon = getDeviceIcon(s.device);
                  const level = getRiskLevel(s.riskScore);
                  return (
                    <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {level === "critical" && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-200">{s.customerName}</div>
                            <div className="text-[11px] text-gray-500">CIF: {s.cif}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                          <DeviceIcon size={13} />
                          <span className="truncate max-w-[120px]">{s.device.split(" / ")[0]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 max-w-[180px] truncate">{s.currentPage}</td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={11} /> {s.duration}m
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2 text-[11px]">
                          {s.rageClicks > 0 && (
                            <span className="text-red-400">🖱 {s.rageClicks}</span>
                          )}
                          {s.failedSubmissions > 0 && (
                            <span className="text-orange-400">✕ {s.failedSubmissions}</span>
                          )}
                          {s.navigationLoops > 0 && (
                            <span className="text-amber-400">↻ {s.navigationLoops}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${s.riskScore}%`, background: getRiskColor(s.riskScore) }}
                            />
                          </div>
                          <span className="text-xs font-bold" style={{ color: getRiskColor(s.riskScore) }}>
                            {s.riskScore}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to="/admin/session/$id"
                          params={{ id: s.id }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Eye size={13} /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Nudges */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Zap size={14} className="text-violet-400" /> Recent AI Interventions
          </h3>
          <div className="space-y-3">
            {mockNudges.slice(0, 4).map((n) => {
              const session = mockSessions.find(s => s.id === n.sessionId);
              return (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.escalationPrevented ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {n.escalationPrevented ? (
                      <ShieldCheck size={16} className="text-emerald-400" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-gray-300">{session?.customerName ?? "Unknown"}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${n.escalationPrevented ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {n.escalationPrevented ? "Prevented" : "Escalated"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">"{n.message}"</p>
                    <p className="text-[10px] text-gray-600 mt-1">Trigger: {n.trigger}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
