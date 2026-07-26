import React from 'react';
import { FileText, Download, BrainCircuit, ShieldAlert, Coins, HeartHandshake } from 'lucide-react';

export const Reports: React.FC = () => {
  const reportCards = [
    {
      title: 'AI Credit Rating Certificate',
      desc: 'Official Underwriting report generated via XGBoost machine learning using cash-flow stability metrics.',
      endpoint: '/api/reports/credit',
      filename: 'GigSecure_Credit_Report.pdf',
      icon: BrainCircuit
    },
    {
      title: 'SHA-256 Invoice Fraud Inspection',
      desc: 'Cryptographic multi-bank duplicate financing verification audit trail & GST validation report.',
      endpoint: '/api/reports/fraud',
      filename: 'GigSecure_Fraud_Shield_Report.pdf',
      icon: ShieldAlert
    },
    {
      title: 'Micro-Loan Ledger Statement',
      desc: 'Complete repayment statement, daily UPI AutoPay history, and outstanding balance summary.',
      endpoint: '/api/reports/loan',
      filename: 'GigSecure_Loan_Statement.pdf',
      icon: Coins
    },
    {
      title: 'Nominee Succession Certificate',
      desc: 'Account Aggregator asset map, death certificate verification report, and nominee transfer claim forms.',
      endpoint: '/api/reports/succession',
      filename: 'GigSecure_Succession_Certificate.pdf',
      icon: HeartHandshake
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <FileText className="w-7 h-7 text-emerald-400" /> PDF Document & Audit Report Center
        </h1>
        <p className="text-xs text-slate-400 mt-1">Download official, bank-ready PDF certificates generated live by our ReportLab engine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">{card.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{card.desc}</p>
              </div>

              <a
                href={card.endpoint}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" /> Download PDF ({card.filename})
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};
