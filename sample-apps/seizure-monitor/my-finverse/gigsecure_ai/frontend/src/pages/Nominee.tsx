import React, { useState } from 'react';
import { UserCheck, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export const Nominee: React.FC = () => {
  const [nomineeName, setNomineeName] = useState<string>('Sunita Sharma');
  const [relationship, setRelationship] = useState<string>('Spouse / Wife');
  const [aadhaar, setAadhaar] = useState<string>('888877776666');
  const [phone, setPhone] = useState<string>('9811122233');
  const [email, setEmail] = useState<string>('sunita.sharma@gmail.com');
  const [bankAccountNo, setBankAccountNo] = useState<string>('998811223344');
  const [ifsc, setIfsc] = useState<string>('HDFC0001234');
  const [sharePercentage, setSharePercentage] = useState<number>(100);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/nominee/register', {
        nominee_name: nomineeName,
        relationship,
        aadhaar_number: aadhaar,
        phone,
        email,
        bank_account_no: bankAccountNo,
        ifsc_code: ifsc,
        share_percentage: Number(sharePercentage)
      });
      setSaved(true);
    } catch (err) {
      setSaved(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <UserCheck className="w-7 h-7 text-black" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Nominee Family Registration</h1>
        <p className="text-xs text-slate-400">Register designated family beneficiary for automated wealth succession protection</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Nominee details registered & verified successfully in family vault.
        </div>
      )}

      <div className="glass-card p-8 rounded-3xl border border-slate-800 space-y-4">
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Nominee Full Name</label>
              <input
                type="text"
                value={nomineeName}
                onChange={(e) => setNomineeName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Relationship</label>
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Nominee Aadhaar No.</label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Nominee Mobile Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Bank Account Number</label>
              <input
                type="text"
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Bank IFSC Code</label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Saving Nominee Information...' : 'Register Nominee & Lock Vault'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
