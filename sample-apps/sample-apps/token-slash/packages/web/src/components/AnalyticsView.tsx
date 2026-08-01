import React from 'react';
import { 
  BarChart3, 
  TrendingDown, 
  DollarSign, 
  Zap, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  Download,
  Calendar,
  Layers
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const monthlyTrendsData = [
  { month: 'Mar', originalCost: 4800, optimizedCost: 1900, savings: 2900, tokensSaved: 1.4 },
  { month: 'Apr', originalCost: 5200, optimizedCost: 2000, savings: 3200, tokensSaved: 1.6 },
  { month: 'May', originalCost: 6100, optimizedCost: 2300, savings: 3800, tokensSaved: 1.9 },
  { month: 'Jun', originalCost: 7400, optimizedCost: 2700, savings: 4700, tokensSaved: 2.3 },
  { month: 'Jul', originalCost: 8900, optimizedCost: 3100, savings: 5800, tokensSaved: 2.9 },
  { month: 'Aug (Est)', originalCost: 10500, optimizedCost: 3600, savings: 6900, tokensSaved: 3.5 },
];

const modelShareData = [
  { name: 'Gemini 3.5 Flash', value: 45, color: '#00F2FE' },
  { name: 'Claude 3.5 Haiku', value: 30, color: '#3B82F6' },
  { name: 'GPT-4o Mini', value: 15, color: '#8B5CF6' },
  { name: 'Llama 3.1 70B', value: 10, color: '#10B981' },
];

const latencyDistribution = [
  { range: '< 200ms', count: 420 },
  { range: '200-400ms', count: 890 },
  { range: '400-600ms', count: 310 },
  { range: '600-800ms', count: 120 },
  { range: '> 800ms', count: 45 },
];

export const AnalyticsView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Telemetry & Analytics</h1>
              <p className="text-xs text-slate-400">Real-time compute routing metrics, token reduction growth, and cost savings.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3.5 py-2 rounded-xl bg-[#141A24] border border-white/[0.08] text-xs font-mono text-slate-300 hover:text-white flex items-center gap-2 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Last 6 Months</span>
          </button>
          <button className="px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400 font-semibold hover:bg-cyan-500/20 flex items-center gap-2 transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#141A24]/80 border border-white/[0.06] space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">Total Monthly Savings</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">$6,900.00</div>
          <div className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            <span>+23.4% projected ROI next month</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#141A24]/80 border border-white/[0.06] space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">Tokens Reduced</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">3.5M Tokens</div>
          <div className="text-[10px] font-mono text-slate-400">Average reduction: <span className="text-cyan-300 font-semibold">64.2%</span></div>
        </div>

        <div className="p-5 rounded-2xl bg-[#141A24]/80 border border-white/[0.06] space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">Avg Latency</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400">340 ms</div>
          <div className="text-[10px] font-mono text-slate-400">Sub-second execution guaranteed</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#141A24]/80 border border-white/[0.06] space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">Classifier Accuracy</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">98.6%</div>
          <div className="text-[10px] font-mono text-slate-400">NitroStack ML Model</div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Cost Savings Trend */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Monthly Enterprise Spend vs. Optimized Spend</h3>
              <p className="text-xs text-slate-400">Projected savings comparison over a 6-month growth period.</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-600" />
                <span className="text-slate-400">Unoptimized ($)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-400" />
                <span className="text-cyan-400 font-semibold">TokenSlash ($)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F2FE" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00F2FE" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOriginal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#64748B" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0E131A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="originalCost" stroke="#64748B" fillOpacity={1} fill="url(#colorOriginal)" />
                <Area type="monotone" dataKey="optimizedCost" stroke="#00F2FE" strokeWidth={2} fillOpacity={1} fill="url(#colorOptimized)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Route Share Pie Chart */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">LLM Routing Distribution</h3>
            <p className="text-xs text-slate-400">Compute dispatch allocation by recommended target tier.</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modelShareData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {modelShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0E131A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-white">4 Tiers</span>
              <span className="text-[10px] font-mono text-slate-500">Auto-Routed</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/[0.04]">
            {modelShareData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="text-white font-bold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latency Distribution & AST Density */}
      <div className="p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Response Latency Profile (ms)</h3>
          <p className="text-xs text-slate-400">Distribution of end-to-end AST analysis and model recommendation times.</p>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" stroke="#64748B" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0E131A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
