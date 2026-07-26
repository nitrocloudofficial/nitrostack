'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Bell, Lock, Cpu, ToggleLeft, ToggleRight, Check, Save } from 'lucide-react';
import { useAegis, AegisSettings } from '../../context/AegisContext';

import { Variants } from 'framer-motion';

const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} className="transition-all focus:outline-none" aria-label="Toggle Setting">
    {value
      ? <ToggleRight className="w-7 h-7 text-[#D4AF37]" />
      : <ToggleLeft className="w-7 h-7 text-gray-600" />
    }
  </button>
);

export const SettingsView: React.FC = () => {
  const { settings, saveSettings, user } = useAegis();
  const [localSettings, setLocalSettings] = useState<AegisSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const update = (key: keyof AegisSettings) => (v: boolean) =>
    setLocalSettings(prev => ({ ...prev, [key]: v }));

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveSettings(localSettings);
      setIsSaving(false);
    }, 400);
  };

  const SECTIONS = [
    {
      icon: Bell,
      title: 'Alerts & Notifications',
      color: 'text-[#D4AF37]',
      bg: 'bg-[#D4AF37]/8 border-[#D4AF37]/20',
      items: [
        { label: 'Critical Threat Alerts',       sub: 'Trigger cinematic modal for threat score ≥ 80', key: 'criticalAlerts' as keyof AegisSettings },
      ],
    },
    {
      icon: Lock,
      title: 'Enforcement Rules',
      color: 'text-red-400',
      bg: 'bg-red-500/8 border-red-500/20',
      items: [
        { label: 'Auto-Freeze on CRITICAL',       sub: 'Automatically freeze flagged transactions without HITL', key: 'autoFreeze' as keyof AegisSettings },
        { label: 'Require HITL Approval',         sub: 'Officer must approve all enforcement actions', key: 'hitlRequired' as keyof AegisSettings },
      ],
    },
    {
      icon: Cpu,
      title: 'Analysis Engine',
      color: 'text-[#5EA2FF]',
      bg: 'bg-[#5EA2FF]/8 border-[#5EA2FF]/20',
      items: [
        { label: 'Biometric Noise Reduction',     sub: 'Pre-process audio for VoiceGuard-v4.2 accuracy', key: 'biometricNoise' as keyof AegisSettings },
        { label: 'Zero-Knowledge Verification',   sub: 'Route all evidence through ZK proof verifier',   key: 'zkVerify' as keyof AegisSettings },
        { label: 'Debug Log Streaming',           sub: 'Write verbose engine logs to monitoring console', key: 'debugLogs' as keyof AegisSettings },
      ],
    },
  ];

  return (
    <div className="page-enter max-w-4xl mx-auto space-y-8 pb-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-cinzel font-bold text-white">System Settings</h1>
        <p className="text-sm text-gray-500">SOC configuration · Detection thresholds · Enforcement rules</p>
      </div>

      {/* Officer Info Card */}
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
        className="card p-7 border border-[#D4AF37]/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-xs font-mono-ui text-gray-500 uppercase tracking-wider mb-0.5">Authenticated Officer</div>
              <div className="text-base font-semibold text-gray-100">{user.name} · {user.role}</div>
              <div className="text-xs font-mono-ui text-[#D4AF37]/70 mt-0.5">{user.cert} · {user.clearance} · I4C Dispatch Authority</div>
            </div>
          </div>
          <span className="badge-gold text-[10px] px-3 py-1 rounded-full border">ACTIVE SESSION</span>
        </div>
      </motion.div>

      {/* Settings Sections */}
      {SECTIONS.map((section, si) => {
        const Icon = section.icon;
        return (
          <motion.div key={section.title} custom={si + 1} variants={cardVariants} initial="hidden" animate="visible"
            className="card overflow-hidden border border-[#D4AF37]/10"
          >
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${section.bg}`}>
                <Icon style={{ width: 14, height: 14 }} className={section.color} />
              </div>
              <span className="text-sm font-semibold text-gray-200">{section.title}</span>
            </div>

            {/* Setting Rows */}
            <div className="divide-y divide-white/4">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-6 py-5">
                  <div>
                    <div className="text-sm text-gray-200">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>
                  </div>
                  <Toggle
                    value={localSettings[item.key]}
                    onChange={update(item.key)}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Save Button */}
      <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#F2C14E] text-black text-sm font-bold font-mono-ui tracking-wide transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:scale-105 flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              SAVING CONFIGURATION...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Configuration
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};
