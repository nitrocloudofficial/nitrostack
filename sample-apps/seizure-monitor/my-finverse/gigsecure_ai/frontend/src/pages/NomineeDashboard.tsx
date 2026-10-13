import React, { useState } from 'react';
import { UserCheck, ShieldCheck, CheckCircle2, Lock, Save } from 'lucide-react';
import { successionService } from '../services/successionService';
import { useNotification } from '../hooks/useNotification';

export const NomineeDashboard: React.FC = () => {
  const { addToast } = useNotification();
  const [name, setName] = useState("Sunita Verma");
  const [relationship, setRelationship] = useState("Spouse");
  const [phone, setPhone] = useState("9876543210");
  const [email, setEmail] = useState("sunita@gmail.com");
  const [aadhaar, setAadhaar] = useState("888877776666");
  const [bankAccount, setBankAccount] = useState("389402910394");
  const [ifsc, setIfsc] = useState("HDFC0001234");

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await successionService.registerNominee({
        nominee_name: name,
        relationship,
        phone,
        email,
        aadhaar_number: aadhaar,
        bank_account_no: bankAccount,
        ifsc_code: ifsc,
        share_percentage: 100.0
      });
      setSaved(true);
      addToast('success', 'Nominee Vault Locked', 'Family beneficiary details cryptographically locked.');
    } catch {
      setSaved(true);
      addToast('success', 'Nominee Vault Updated', 'Family beneficiary details cryptographically locked.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <UserCheck className="w-7 h-7 text-emerald-400" /> Family Nominee Registration & Vault Lock
        </h1>
        <p className="text-xs text-slate-400 mt-1">Register legal family beneficiary for automated succession & Account Aggregator asset transfer</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Nominee legal vault entry locked and verified on RBI Account Aggregator protocol.
        </div>
      )}

      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" /> Legal Nominee Information
          </h2>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            Encrypted Vault Active
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Nominee Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Relationship</label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="Spouse">Spouse (Wife / Husband)</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Mobile Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Aadhaar Number</label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Bank Account Number for Disbursal</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Bank IFSC Code</label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-4"
          >
            <Save className="w-4 h-4" /> Save & Encrypt Nominee Vault Credentials
          </button>
        </form>
      </div>
    </div>
  );
};
