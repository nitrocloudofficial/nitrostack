'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, KeyRound, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAegis } from '../../context/AegisContext';

export const LoginView: React.FC = () => {
  const { login } = useAegis();
  const [pin, setPin] = useState('AZ-99-88');
  const [officerId, setOfficerId] = useState('Officer-AZ-99');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    setTimeout(() => {
      const success = login(pin);
      setLoading(false);
      if (!success) {
        setError('Invalid Security Credentials or PIN Code. Use AZ-99-88');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#070707] text-gray-100 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Ambient Red/Gold Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(212,175,55,0.08) 0%, rgba(255,77,79,0.05) 50%, transparent 80%)',
        }}
      />

      {/* Grid line pattern background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#D4AF37 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-md w-full p-8 rounded-3xl bg-[#0F0F0F] border border-[#D4AF37]/25 shadow-2xl z-10"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 40px rgba(212,175,55,0.1)' }}
      >
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#D4AF37]/35 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <Shield className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h1 className="text-2xl font-cinzel font-bold text-white tracking-widest">
            AEGIS <span className="text-[#D4AF37]">PROTOCOL</span>
          </h1>
          <p className="text-xs font-mono-ui text-gray-500 uppercase tracking-widest mt-1">
            Zero-Knowledge Fraud Intelligence SOC
          </p>
        </div>

        {/* Security Badge Banner */}
        <div className="mb-6 p-3.5 rounded-2xl bg-[#141414] border border-[#D4AF37]/15 flex items-center gap-3 text-xs font-mono-ui text-gray-300">
          <ShieldCheck className="w-4 h-4 text-[#00C853] shrink-0" />
          <div>
            <div className="font-bold text-gray-200">RBI Certified Officer Portal</div>
            <div className="text-[10px] text-gray-500">MHA I4C Clearance Level 5 Required</div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-mono-ui flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            {error}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono-ui font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Officer Designation ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 text-xs font-mono-ui bg-[#141414] border border-[#D4AF37]/20 rounded-xl text-gray-200 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono-ui font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Security Authorization Key / PIN
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN (e.g. AZ-99-88)"
                required
                className="w-full pl-10 pr-4 py-2.5 text-xs font-mono-ui bg-[#141414] border border-[#D4AF37]/20 rounded-xl text-gray-200 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <KeyRound className="w-3.5 h-3.5 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#F2C14E] text-black font-mono-ui font-bold text-xs tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                AUTHENTICATING OFFICER...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                AUTHENTICATE & ACCESS SOC <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-white/5 text-center text-[10px] font-mono-ui text-gray-600">
          Aegis Protocol v1.0.4 · Multi-Vector Zero-Knowledge Engine
        </div>
      </motion.div>
    </div>
  );
};
