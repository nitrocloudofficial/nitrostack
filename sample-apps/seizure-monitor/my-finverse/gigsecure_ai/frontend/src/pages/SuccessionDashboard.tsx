import React, { useState } from 'react';
import { HeartHandshake, ShieldCheck, Search, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { successionService } from '../services/successionService';
import { generateReportPDF } from '../services/reportService';
import { formatCurrency } from '../utils/formatters';
import { useNotification } from '../hooks/useNotification';

export const SuccessionDashboard: React.FC = () => {
  const { addToast } = useNotification();
  const [workerAadhaar, setWorkerAadhaar] = useState("999988889900");
  const [loading, setLoading] = useState(false);
  const [rescueData, setRescueData] = useState<any>(null);

  const handleExecuteRescue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await successionService.executeRescue(1, workerAadhaar);
      setRescueData(data);
      if (data.status === "SUCCESSION_RESCUE_ACTIVE") {
        addToast('success', 'Succession Rescue Activated', `Discovered ${data.claims_generated} asset policies & account balances.`);
      } else {
        addToast('info', 'Civil Registry Alert', data.message);
      }
    } catch {
      addToast('error', 'Rescue Protocol Error', 'Could not query civil death registry');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = () => {
    generateReportPDF('succession', {
      deceasedName: rescueData?.deceased_worker || 'Rajesh Verma',
      aadhaar: workerAadhaar,
      totalAssets: rescueData?.total_aggregated_assets || 1072500,
      claimsCount: rescueData?.claims_generated || 7
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <HeartHandshake className="w-7 h-7 text-emerald-400" /> Automated Succession & Asset Rescue Protocol
        </h1>
        <p className="text-xs text-slate-400 mt-1">RBI Account Aggregator asset discovery & instant multi-institution claim generator</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Civil Death Registry & Aadhaar Lookup</h2>

          <form onSubmit={handleExecuteRescue} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Deceased Worker Aadhaar Number</label>
              <input
                type="text"
                value={workerAadhaar}
                onChange={(e) => setWorkerAadhaar(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                placeholder="9999-8888-9900"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">Enter Aadhaar ending with 99 or 00 to simulate deceased status on State CRS Portal.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Discovering Aggregated Assets...' : 'Trigger Account Aggregator Rescue Protocol'}
            </button>
          </form>

          {rescueData && rescueData.status === "FAILED" && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Worker Registered Alive
              </div>
              <p className="text-slate-300 text-[11px]">{rescueData.message}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-4">
          {rescueData && rescueData.status === "SUCCESSION_RESCUE_ACTIVE" ? (
            <div className="space-y-4">
              <div className="glass-card p-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-white">{rescueData.deceased_worker}</h3>
                    <div className="text-xs text-slate-400 mt-0.5">Death Cert: <code className="text-emerald-400">{rescueData.certificate_number}</code></div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Asset Value</div>
                    <div className="text-lg font-black text-emerald-400">{formatCurrency(rescueData.total_aggregated_assets)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-white">Automated Claims Dispatched ({rescueData.claims_generated})</div>
                  {rescueData.claims.map((claim: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{claim.institution}</div>
                        <div className="text-[10px] text-slate-400">{claim.category} • Timeline: {claim.settlement_timeline}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-400">{formatCurrency(claim.amount)}</div>
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 inline-block mt-0.5">
                          {claim.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleDownloadCertificate}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Download className="w-4 h-4" /> Download Official Legal Succession Certificate
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 rounded-3xl border border-slate-800 text-center text-slate-400 space-y-3">
              <HeartHandshake className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-white">No Rescue Query Executed</div>
              <p className="text-xs text-slate-400">
                Execute a civil registry search to discover linked bank accounts, LIC policies, EPFO funds, and digital wallets.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
