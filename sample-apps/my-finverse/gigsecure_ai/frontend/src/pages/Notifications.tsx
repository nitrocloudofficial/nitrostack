import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, ShieldAlert, Send } from 'lucide-react';
import { api } from '../services/api';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: 1,
      title: 'UPI AutoPay Repayment Executed',
      message: '₹152.78 debited via HDFC UPI AutoPay for Loan #LN-101.',
      channel: 'SMS',
      status: 'DELIVERED',
      created_at: '2026-07-25 12:30:00'
    },
    {
      id: 2,
      title: 'SHA-256 Fraud Shield Clean',
      message: 'Invoice INV-2026-991 fingerprint verified cleanly against central multi-bank ledger.',
      channel: 'Push',
      status: 'DELIVERED',
      created_at: '2026-07-24 14:10:00'
    },
    {
      id: 3,
      title: 'Credit Rating Score Updated',
      message: 'Your XGBoost Cash-Flow Underwriting score increased by 15 points to 785.',
      channel: 'Email',
      status: 'DELIVERED',
      created_at: '2026-07-20 09:00:00'
    }
  ]);

  useEffect(() => {
    api.get('/notifications/my')
      .then(res => {
        if (res.data && res.data.length > 0) setNotifications(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <BellRing className="w-7 h-7 text-emerald-400" /> Notifications & Dispatch Log
        </h1>
        <p className="text-xs text-slate-400 mt-1">Multi-channel SMS, Email, and Push notification history</p>
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => (
          <div key={notif.id} className="glass-card p-5 rounded-2xl border border-slate-800 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 font-bold shrink-0 mt-0.5">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{notif.title}</div>
                <div className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</div>
                <div className="text-[10px] text-slate-500 mt-2 font-mono">
                  Channel: <span className="text-emerald-400 font-semibold">{notif.channel}</span> • Dispatched: {notif.created_at}
                </div>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
              {notif.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
