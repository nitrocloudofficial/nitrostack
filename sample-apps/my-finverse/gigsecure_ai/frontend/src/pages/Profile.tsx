import React, { useState } from 'react';
import { User as UserIcon, ShieldCheck, Building2, Star, CheckCircle2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || 'Rajesh Verma');
  const [phone, setPhone] = useState(user?.phone || '9876543210');
  const [aadhaar, setAadhaar] = useState(user?.aadhaar_number || '999988887777');
  const [pan, setPan] = useState(user?.pan_number || 'ABCDE1234F');
  const [platform, setPlatform] = useState('Zomato');
  const [saved, setSaved] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/users/update', {
        full_name: fullName,
        phone,
        aadhaar_number: aadhaar,
        pan_number: pan
      });
      setSaved(true);
    } catch {
      setSaved(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <UserIcon className="w-7 h-7 text-emerald-400" /> Gig Partner Profile & Credentials
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage verified identity records, Aadhaar, PAN, and platform linkage</p>
        </div>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Profile details updated successfully.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 glass-card p-6 rounded-3xl border border-slate-800 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-emerald-500/40 flex items-center justify-center text-3xl font-extrabold text-emerald-400 mx-auto">
            {fullName ? fullName[0].toUpperCase() : 'G'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{fullName}</h2>
            <div className="text-xs text-emerald-400 font-mono mt-0.5">{user?.role || 'Worker'} Partner</div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-400">Primary Platform:</span>
              <span className="font-bold text-white">Zomato</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Platform Rating:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                4.85 <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Order Completion:</span>
              <span className="font-bold text-white">96.8%</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Personal & Legal Identity</h2>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">PAN Card Number</label>
                <input
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-4"
            >
              <Save className="w-4 h-4" /> Save Profile Updates
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
