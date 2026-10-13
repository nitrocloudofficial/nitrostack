import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { analyticsData, mockNudges } from "@/lib/mock-data";
import {
  ShieldCheck, ShieldAlert, Zap, Target, TrendingUp,
  ArrowUpRight, ArrowDownRight, CheckCircle, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Intervention Analytics — NitroStack CX Intelligence" },
    ],
  }),
  component: Analytics,
});

const nudgeOutcomes = [
  { name: "Prevented", value: 31, color: "#22c55e" },
  { name: "Engaged, Still Escalated", value: 5, color: "#eab308" },
  { name: "Dismissed", value: 7, color: "#ef4444" },
];

function Analytics() {
  const totalNudges = analyticsData.nudgesTriggered;
  const prevented = analyticsData.escalationsPrevented;
  const rate = analyticsData.preventionRate;

  const kpis = [
    { label: "Escalations Prevented", value: prevented, icon: ShieldCheck, color: "#22c55e", trend: "+18% vs last week", up: false },
    { label: "Total Nudges Triggered", value: totalNudges, icon: Zap, color: "#8b5cf6", trend: "+23% vs last week", up: true },
    { label: "Nudge Engagement Rate", value: `${analyticsData.nudgeEngagementRate}%`, icon: Target, color: "#3b82f6", trend: "+5% vs last week", up: false },
    { label: "Prevention Rate", value: `${rate}%`, icon: TrendingUp, color: "#22c55e", trend: "+8% vs last week", up: false },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Intervention Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Measuring the impact of AI-powered proactive interventions</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-[#111827] rounded-xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background: `${kpi.color}15` }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.up ? "text-blue-400" : "text-emerald-400"}`}>
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
          {/* Weekly Trend */}
          <div className="col-span-2 bg-[#111827] rounded-xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Weekly: Escalations vs Prevented vs Nudges</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analyticsData.dailyTrend} barGap={4}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Bar dataKey="prevented" fill="#22c55e" radius={[4, 4, 0, 0]} name="Prevented" />
                <Bar dataKey="escalations" fill="#ef4444" radius={[4, 4, 0, 0]} name="Escalations" />
                <Bar dataKey="nudges" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Nudges Sent" opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Nudge Outcomes */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Nudge Outcomes</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={nudgeOutcomes} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {nudgeOutcomes.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-3">
              {nudgeOutcomes.map((r) => (
                <div key={r.name} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    {r.name}
                  </span>
                  <span className="text-gray-300 font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cost Impact */}
        <div className="bg-gradient-to-r from-emerald-500/5 to-blue-500/5 rounded-xl border border-emerald-500/10 p-6">
          <h3 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <ShieldCheck size={16} /> Estimated Business Impact
          </h3>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-white">₹4.2L</div>
              <div className="text-xs text-gray-400 mt-1">Support Cost Saved (est.)</div>
              <div className="text-[10px] text-gray-600">Based on ₹1,350/escalation avg</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">31</div>
              <div className="text-xs text-gray-400 mt-1">Escalations Prevented Today</div>
              <div className="text-[10px] text-gray-600">72% prevention rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">4.2 min</div>
              <div className="text-xs text-gray-400 mt-1">Avg Resolution via Nudge</div>
              <div className="text-[10px] text-gray-600">vs 18 min via call center</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">92%</div>
              <div className="text-xs text-gray-400 mt-1">Customer Satisfaction</div>
              <div className="text-[10px] text-gray-600">Post-nudge survey results</div>
            </div>
          </div>
        </div>

        {/* Top Frustration Points */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <ShieldAlert size={14} className="text-orange-400" /> Top Frustration Hotspots
          </h3>
          <div className="space-y-3">
            {analyticsData.topFrustrationPoints.map((fp, i) => (
              <div key={fp.page} className="flex items-center gap-4">
                <span className="text-xs text-gray-600 w-5 text-right font-mono">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm text-gray-300">
                      <span className="font-medium">{fp.page}</span>
                      <span className="text-gray-500 mx-2">→</span>
                      <span className="text-gray-400">{fp.issue}</span>
                    </div>
                    <span className="text-xs text-gray-500">{fp.count} incidents ({fp.percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${fp.percentage}%`,
                        background: i === 0 ? "#ef4444" : i === 1 ? "#f97316" : i === 2 ? "#eab308" : "#6b7280",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Nudge Log */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Nudge Log</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">Time</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">Message</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">Trigger</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {mockNudges.map((n) => (
                <tr key={n.id} className="border-b border-white/[0.03]">
                  <td className="px-3 py-2.5 text-xs text-gray-500">
                    {new Date(n.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-medium">
                      {n.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 max-w-xs truncate">"{n.message}"</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{n.trigger}</td>
                  <td className="px-3 py-2.5">
                    <span className={`flex items-center gap-1 text-xs ${n.escalationPrevented ? "text-emerald-400" : "text-red-400"}`}>
                      {n.escalationPrevented ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {n.escalationPrevented ? "Prevented" : "Escalated"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
