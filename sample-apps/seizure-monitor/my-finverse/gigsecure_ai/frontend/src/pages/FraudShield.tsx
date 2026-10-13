import React, { useState, useEffect } from 'react';
import { ShieldAlert, Building2, Search, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { fraudService } from '../services/fraudService';
import { StatCard } from '../components/StatCard';
import { PieChartComponent } from '../components/PieChartComponent';
import { BarChartComponent } from '../components/BarChartComponent';
import { useNotification } from '../hooks/useNotification';

export const FraudShield: React.FC = () => {
  const { addToast } = useNotification();
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [checkGstin, setCheckGstin] = useState("27AAACG1234H1Z5");
  const [checkInvoiceNo, setCheckInvoiceNo] = useState("INV-2026-9901");
  const [checkAmount, setCheckAmount] = useState<number>(35000);
  const [checkBank, setCheckBank] = useState("ICICI Bank");
  const [checkResult, setCheckResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [st, hist] = await Promise.all([
        fraudService.getStatistics(),
        fraudService.getHistory(15)
      ]);
      setStats(st);
      setHistory(hist);
    } catch {
      addToast('info', 'Mock Ledger Active', 'Using simulated multi-bank fraud ledger records.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fraudService.checkFraud({
        gstin: checkGstin,
        platform_id: "ZOMATO-PAT-100",
        invoice_number: checkInvoiceNo,
        invoice_date: "2026-07-25",
        amount: checkAmount,
        bank_name: checkBank
      });
      setCheckResult(res);
      addToast('info', 'Central Ledger Check Complete', res.message);
    } catch {
      addToast('error', 'Fraud Check Error', 'Could not complete fraud check');
    }
  };

  const riskPieData = stats?.risk_distribution ? [
    { name: 'Low Risk', value: stats.risk_distribution.LOW || 84 },
    { name: 'Medium Risk', value: stats.risk_distribution.MEDIUM || 11 },
    { name: 'High Risk', value: stats.risk_distribution.HIGH || 4 },
    { name: 'Critical Risk', value: stats.risk_distribution.CRITICAL || 1 }
  ] : [
    { name: 'Low Risk', value: 84 },
    { name: 'Medium Risk', value: 11 },
    { name: 'High Risk', value: 4 },
    { name: 'Critical Risk', value: 1 }
  ];

  const bankBarData = stats?.bank_breakdown ? Object.entries(stats.bank_breakdown).map(([k, v]) => ({
    name: k,
    count: v
  })) : [
    { name: 'SBI', count: 320 },
    { name: 'HDFC', count: 290 },
    { name: 'ICICI', count: 210 },
    { name: 'Axis', count: 180 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-emerald-400" /> Multi-Bank SHA-256 Fraud Shield
        </h1>
        <p className="text-xs text-slate-400 mt-1">Cross-bank duplicate financing protection ledger connected across 9 major lenders</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Invoices Fingerprinted" value={stats?.total_invoices_scanned || 1240} subtitle="Across 9 Member Lenders" icon={FileText} trend="up" />
        <StatCard title="Fraud Attempts Blocked" value={stats?.total_fraud_attempts_blocked || 48} subtitle="100% Prevention Rate" icon={ShieldAlert} trend="up" />
        <StatCard title="Duplicate Financing" value={stats?.duplicate_financing_blocked || 32} subtitle="SHA-256 Hash Matches" icon={AlertTriangle} trend="neutral" />
        <StatCard title="GST/eWay Failures" value={(stats?.gst_failures || 11) + (stats?.eway_failures || 5)} subtitle="Portal Invalidations" icon={Building2} trend="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Quick Central Ledger Risk Query</h2>
          <form onSubmit={handleQuickCheck} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={checkBank}
                  onChange={(e) => setCheckBank(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={checkInvoiceNo}
                  onChange={(e) => setCheckInvoiceNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Supplier GSTIN</label>
                <input
                  type="text"
                  value={checkGstin}
                  onChange={(e) => setCheckGstin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Amount (INR)</label>
                <input
                  type="number"
                  value={checkAmount}
                  onChange={(e) => setCheckAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" /> Query Central Multi-Bank Ledger
            </button>
          </form>

          {checkResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${checkResult.is_duplicate ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div className="font-bold text-white flex justify-between">
                <span>{checkResult.is_duplicate ? 'DUPLICATE FINANCING DETECTED' : 'CLEAR INVOICE'}</span>
                <span className={checkResult.is_duplicate ? 'text-rose-400' : 'text-emerald-400'}>{checkResult.fraud_risk_level} RISK</span>
              </div>
              <div className="text-[10px] font-mono text-slate-300 break-all">
                Hash: {checkResult.sha256_hash}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 glass-card p-6 rounded-3xl border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Risk Distribution Tiering</h2>
          <PieChartComponent data={riskPieData} />
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Live Fingerprinted Invoices Ledger History</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Bank Name</th>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Merchant</th>
                <th className="p-3">SHA-256 Fingerprint</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {history.length > 0 ? (
                history.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-bold text-emerald-400">{item.bank_name || 'HDFC Bank'}</td>
                    <td className="p-3 text-white">{item.invoice_number}</td>
                    <td className="p-3 text-slate-300">{item.merchant_name}</td>
                    <td className="p-3 text-[10px] text-slate-400">{item.sha256_hash.substring(0, 16)}...</td>
                    <td className="p-3 text-right text-slate-400">{item.timestamp}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">No ledger entries registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
