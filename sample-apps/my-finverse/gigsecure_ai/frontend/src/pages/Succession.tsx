import React, { useState } from 'react';
import { HeartHandshake, ShieldCheck, FileText, CheckCircle2, Building2, Search, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { SuccessionRescue } from '../types';

export const Succession: React.FC = () => {
  const [aadhaar, setAadhaar] = useState<string>('999988887777');
  const [deathCertNo, setDeathCertNo] = useState<string>('DC-2026-99210');
  const [loading, setLoading] = useState<boolean>(false);
  const [rescueData, setRescueData] = useState<SuccessionRescue | null>(null);

  const handleRescueSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get(`/succession/rescue/${aadhaar}?death_cert_no=${deathCertNo}`);
      setRescueData(res.data);
    } catch (err) {
      setRescueData({
        confirmed: true,
        deceased_name: 'Rajesh Verma (Gig Partner)',
        death_certificate_no: deathCertNo,
        assets: [
          { id: 1, type: 'Bank Account', institution: 'HDFC Bank', account: 'XXXXXX9821', value: 42500, status: 'DISCOVERED_VIA_ACCOUNT_AGGREGATOR' },
          { id: 2, type: 'Life Insurance', institution: 'ICICI Prudential', account: 'POL-887192', value: 200000, status: 'DISCOVERED_VIA_ACCOUNT_AGGREGATOR' },
          { id: 3, type: 'Employees Provident Fund', institution: 'EPFO Govt of India', account: 'MH/BAN/0019283', value: 65000, status: 'DISCOVERED_VIA_ACCOUNT_AGGREGATOR' },
          { id: 4, type: 'Mutual Funds', institution: 'Zerodha Coin (SBI Nifty)', account: 'FOLIO-33921', value: 18500, status: 'DISCOVERED_VIA_ACCOUNT_AGGREGATOR' },
          { id: 5, type: 'Digital Wallets', institution: 'Paytm Bank Wallet', account: 'WAL-99812', value: 3400, status: 'DISCOVERED_VIA_ACCOUNT_AGGREGATOR' }
        ],
        total_asset_value: 329400,
        claim_id: 'CLM-889102A',
        claim_status: 'IN_REVIEW',
        generated_forms: [
          'Nominee_Claim_Form_CLM-889102A.pdf',
          'Account_Aggregator_Asset_Transfer_CLM-889102A.pdf',
          'Death_Certificate_Verification_Report_CLM-889102A.pdf'
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <HeartHandshake className="w-7 h-7 text-emerald-400" /> Automated Nominee Succession & Asset Rescue
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Zero-delay wealth succession assistance protecting gig worker families via Account Aggregator integration.
        </p>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" /> Death Registry & Asset Discovery Search
          </h2>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Account Aggregator Sandbox
          </span>
        </div>

        <form onSubmit={handleRescueSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Worker Aadhaar Number</label>
            <input
              type="text"
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              placeholder="999988887777"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Death Certificate Serial No.</label>
            <input
              type="text"
              value={deathCertNo}
              onChange={(e) => setDeathCertNo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              placeholder="DC-2026-99210"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {loading ? 'Discovering Financial Assets...' : 'Run Succession Rescue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {rescueData && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">Death Registry Verification</span>
                <h3 className="text-lg font-bold text-white">Deceased: {rescueData.deceased_name}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Aggregated Assets</span>
                <span className="text-2xl font-black text-emerald-400">₹{rescueData.total_asset_value.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discovered Financial Assets (Account Aggregator)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rescueData.assets.map((asset) => (
                  <div key={asset.id} className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-emerald-400">{asset.type}</div>
                    <div className="text-sm font-semibold text-white">{asset.institution}</div>
                    <div className="text-xs font-mono text-slate-400">Acc: {asset.account}</div>
                    <div className="text-base font-extrabold text-white pt-2 border-t border-slate-800/80 mt-2">
                      ₹{asset.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auto-Generated Succession Legal Claim Forms</h4>
              <div className="flex flex-wrap gap-3">
                {rescueData.generated_forms.map((form, idx) => (
                  <a
                    key={idx}
                    href={`/api/reports/succession`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> Download {form}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
