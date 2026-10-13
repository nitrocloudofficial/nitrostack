import React from 'react';
import { Compass, ShieldCheck, Database, Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 py-12 text-slate-600 dark:text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900 dark:text-white">RemitWise AI</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              Multi-agent AI remittance advisory engine comparing real-time exchange rates, provider fees, and regulatory compliance.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
              Data Provenance
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                <span>Frankfurter Live FX API</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                <span>Local Provider Dataset (`providers.json`)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                <span>Compliance Ruleset (`compliance_rules.json`)</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
              Supported Corridors
            </h4>
            <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
              <div>🇺🇸 USA → 🇮🇳 India</div>
              <div>🇦🇪 UAE → 🇮🇳 India</div>
              <div>🇬🇧 UK → 🇮🇳 India</div>
              <div>🇨🇦 CAN → 🇮🇳 India</div>
              <div>🇦🇺 AUS → 🇮🇳 India</div>
              <div>🇸🇬 SGP → 🇮🇳 India</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
              Hackathon Disclaimer
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              RemitWise AI is a demonstration platform built for national fintech hackathons. All exchange rates are updated live via public mid-market APIs.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 RemitWise AI Advisory Platform. Designed for National Fintech Hackathon.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="hover:text-blue-500 cursor-pointer">FastAPI Backend: localhost:8000</span>
            <span>•</span>
            <span className="hover:text-blue-500 cursor-pointer">React 19 + Framer Motion</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
