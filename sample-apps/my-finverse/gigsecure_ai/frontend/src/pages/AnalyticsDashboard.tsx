import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ShieldAlert, Coins } from 'lucide-react';
import { BarChartComponent } from '../components/BarChartComponent';
import { AreaChartComponent } from '../components/AreaChartComponent';
import { PieChartComponent } from '../components/PieChartComponent';
import { api } from '../services/api';

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics/dashboard');
      setData(res.data);
    } catch {
      setData({
        income_heatmaps: [
          { day: 'Mon', avg_earnings: 1150 },
          { day: 'Tue', avg_earnings: 1080 },
          { day: 'Wed', avg_earnings: 1220 },
          { day: 'Thu', avg_earnings: 1190 },
          { day: 'Fri', avg_earnings: 1450 },
          { day: 'Sat', avg_earnings: 1850 },
          { day: 'Sun', avg_earnings: 1920 }
        ],
        loan_distribution: [
          { name: 'Emergency Loan', value: 210 },
          { name: 'Working Capital', value: 180 },
          { name: 'EV Expansion', value: 90 }
        ]
      });
    }
  };

  const heatmapData = data?.income_heatmaps || [
    { day: 'Mon', avg_earnings: 1150 },
    { day: 'Tue', avg_earnings: 1080 },
    { day: 'Wed', avg_earnings: 1220 },
    { day: 'Thu', avg_earnings: 1190 },
    { day: 'Fri', avg_earnings: 1450 },
    { day: 'Sat', avg_earnings: 1850 },
    { day: 'Sun', avg_earnings: 1920 }
  ];

  const pieData = data?.loan_distribution || [
    { name: 'Emergency Fuel Loan', value: 210 },
    { name: 'Working Capital', value: 180 },
    { name: 'EV Fleet Expansion', value: 90 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-emerald-400" /> Platform Financial Analytics & Heatmaps
        </h1>
        <p className="text-xs text-slate-400 mt-1">Gig worker weekly income patterns, loan product distribution, and AutoPay repayment metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-card p-6 rounded-3xl border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Weekly Income Distribution Heatmap (INR)
          </h2>
          <BarChartComponent data={heatmapData} xKey="day" dataKey="avg_earnings" name="Avg Daily Income" />
        </div>

        <div className="lg:col-span-5 glass-card p-6 rounded-3xl border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" /> Underwritten Micro-Loan Breakdown
          </h2>
          <PieChartComponent data={pieData} />
        </div>
      </div>
    </div>
  );
};
