'use client';

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface AccountRecord {
  accountNumber: string;
  customerName: string;
  amount: number;
  avgSpend: number;
  merchant: string;
  customerLocation: string;
  transactionLocation: string;
  device: string;
  network: string;
  riskScore: number;
  verdict: string;
  reasoning: string;
  scammerIp: string;
}

interface BankAuditData {
  bankName: string;
  branchName: string;
  totalCustomers: number;
  totalRiskCount: number;
  accounts: AccountRecord[];
}

export default function Track1Widget() {
  const { getToolOutput, isReady } = useWidgetSDK();
  const output = getToolOutput<BankAuditData>();

  // State management for step-by-step navigation
  const [viewStep, setViewStep] = useState<'OVERVIEW' | 'RISK_LIST' | 'ACCOUNT_DETAILS'>('OVERVIEW');
  const [selectedAccNum, setSelectedAccNum] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'INTEL' | 'GRAPH' | 'ACTION'>('INTEL');
  const [emailSent, setEmailSent] = useState<boolean>(false);

  if (!isReady) return <div style={{ color: 'white', padding: 20 }}>Initializing Secure Core...</div>;
  if (!output) return <div style={{ color: 'white', padding: 20 }}>No audit data found. Please run the tool.</div>;

  const riskAccountsList = output.accounts.filter(a => a.verdict === 'CRITICAL RISK');
  const activeAccount = output.accounts.find(a => a.accountNumber === selectedAccNum) || riskAccountsList[0];

  // Filter list by user search query
  const filteredAccounts = riskAccountsList.filter(a => 
    a.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // =========================================================
  // STEP 1: OVERVIEW POP-UP CARD
  // =========================================================
  if (viewStep === 'OVERVIEW') {
    return (
      <div style={{ padding: 24, borderRadius: 12, background: '#0F172A', color: '#F8FAFC', fontFamily: 'sans-serif', maxWidth: '450px', border: '1px solid #334155', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ borderBottom: '1px solid #334155', paddingBottom : '12px', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 4px 0', color: '#38BDF8', fontSize: '20px' }}>🏦 {output.bankName}</h2>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '13px' }}>Branch: {output.branchName}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#1E293B', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#38BDF8' }}>{output.totalCustomers}</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Total Accounts</div>
          </div>
          <div style={{ flex: 1, background: '#450a0a', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #7F1D1D' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color :'#F87171' }}>{output.totalRiskCount}</div>
            <div style={{ fontSize: '12px', color: '#FCA5A5', marginTop: '4px' }}>Flagged Risks</div>
          </div>
        </div>

        <button 
          onClick={() => setViewStep('RISK_LIST')}
          style={{ width: '100%', padding: '14px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          Proceed to Risk Audit ({output.totalRiskCount} Accounts) →
        </button>
      </div>
    );
  }

  // =========================================================
  // STEP 2: RISK ACCOUNTS LIST & ACCOUNT NUMBER SEARCH
  // =========================================================
  if (viewStep === 'RISK_LIST') {
    return (
      <div style={{ padding: 20, borderRadius: 12, background: '#0F172A', color: '#F8FAFC', fontFamily: 'sans-serif', maxWidth: '450px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#F87171', fontSize: '16px' }}>🚨 Flagged Risk Accounts ({output.totalRiskCount})</h3>
          <button onClick={() => setViewStep('OVERVIEW')} style={{ background: 'transparent', color: '#94A3B8', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
            ← Overview
          </button>
        </div>

        {/* Account Number Search Box */}
        <input 
          type="text" 
          placeholder="Type Account No. (e.g., ACC-904101)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#1E293B', color: 'white', fontSize: '13px', marginBottom: '16px', boxSizing: 'border-box' }}
        />

        {/* List of Accounts */}
        <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredAccounts.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center' }}>No matching risk account found.</p>
          ) : (
            filteredAccounts.map(acc => (
              <div 
                key={acc.accountNumber}
                onClick={() => {
                  setSelectedAccNum(acc.accountNumber);
                  setEmailSent(false);
                  setViewStep('ACCOUNT_DETAILS');
                }}
                style={{ padding: '12px', background: '#1E293B', borderRadius: '8px', cursor: 'pointer', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: '#38BDF8', fontSize: '13px' }}>{acc.accountNumber}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>{acc.customerName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#F87171', fontWeight: 'bold', fontSize: '13px' }}>₹{acc.amount.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#FCA5A5' }}>Score: {acc.riskScore}/100</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // STEP 3: ACCOUNT INVESTIGATION VIEW (3 TABS)
  // =========================================================
  return (
    <div style={{ padding: 20, border: '2px solid #EF4444', borderRadius: 12, background: '#0F172A', color: '#F8FAFC', fontFamily: 'sans-serif', maxWidth: '450px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#FCA5A5', fontWeight: 'bold' }}>ACCOUNT AUDIT</span>
          <h2 style={{ margin: 0, color: '#38BDF8', fontSize: '18px' }}>{activeAccount.accountNumber}</h2>
        </div>
        <button onClick={() => setViewStep('RISK_LIST')} style={{ background: 'transparent', color: '#94A3B8', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
          ← Back to List
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '16px' }}>
        {[
          { id: 'INTEL', label: '🕵️ Intel' },
          { id: 'GRAPH', label: '📊 Spend Spike' },
          { id: 'ACTION', label: '✉️ Freeze & Verify' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            style={{ flex: 1, padding: '8px 4px', background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #38BDF8' : '2px solid transparent', color: activeTab === tab.id ? '#38BDF8' : '#94A3B8', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: INTEL & TRACE */}
      {activeTab === 'INTEL' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '14px' }}>
            <p style={{ margin: 0 }}><b style={{ color: '#94A3B8' }}>Customer:</b><br/>{activeAccount.customerName}</p>
            <p style={{ margin: 0 }}><b style={{ color: '#94A3B8' }}>Charge:</b><br/>₹{activeAccount.amount.toLocaleString()}</p>
            <p style={{ margin: 0 }}><b style={{ color: '#94A3B8' }}>Merchant:</b><br/>{activeAccount.merchant}</p>
            <p style={{ margin: 0 }}><b style={{ color: '#94A3B8' }}>Device:</b><br/>{activeAccount.device}</p>
          </div>
          
          <div style={{ padding: '12px', background: '#1E293B', borderRadius: '8px', fontSize: '12px', fontStyle: 'italic', color: '#CBD5E1', marginBottom: '14px', borderLeft: '3px solid #F87171' }}>
            " {activeAccount.reasoning} "
          </div>

          <div style={{ padding: '12px', border: '1px solid #7F1D1D', background: '#450a0a', borderRadius: '8px', fontSize: '12px' }}>
            <strong style={{ color: '#FCA5A5', display: 'block', marginBottom: '6px' }}>🚨 SCAMMER ORIGIN TRACE</strong>
            <span style={{ color: '#f87171' }}>Origin Location:</span> {activeAccount.transactionLocation} <br/>
            <span style={{ color: '#f87171' }}>Intercepted IP:</span> {activeAccount.scammerIp} <br/>
            <span style={{ color: '#f87171' }}>Network Route:</span> {activeAccount.network}
          </div>
        </div>
      )}

      {/* TAB 2: EXPENDITURE SPIKE GRAPH */}
      {activeTab === 'GRAPH' && (
        <div style={{ padding: '8px' }}>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px', textAlign: 'center' }}>
            30-Day Avg Spend vs. Suspicious Live Charge
          </p>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '50px', height: '150px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
            {/* 30-Day Avg Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 'bold', marginBottom: '4px' }}>
                ₹{activeAccount.avgSpend.toLocaleString()}
              </span>
              <div style={{ width: '45px', height: '35px', background: '#38BDF8', borderRadius: '4px 4px 0 0' }}></div>
              <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>30-Day Avg</span>
            </div>
            
            {/* Live Charge Bar (Spike) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 'bold', marginBottom: '4px' }}>
                ₹{activeAccount.amount.toLocaleString()}
              </span>
              <div style={{ width: '45px', height: '130px', background: '#EF4444', borderRadius: '4px 4px 0 0' }}></div>
              <span style={{ fontSize: '11px', color: '#FCA5A5', marginTop: '8px', fontWeight: 'bold' }}>Live Charge (Spike)</span>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#F87171', textAlign: 'center', marginTop: '12px', fontStyle: 'italic' }}>
            ⚠️ Transaction is {Math.round(activeAccount.amount / activeAccount.avgSpend)}x higher than standard monthly usage.
          </p>
        </div>
      )}

      {/* TAB 3: FREEZE & VERIFY NOTICE */}
      {activeTab === 'ACTION' && (
        <div>
          <div style={{ background: '#1E293B', padding: '14px', borderRadius: '8px', fontSize: '12px', color: '#CBD5E1', marginBottom: '16px', borderLeft: '3px solid #F59E0B' }}>
            <strong style={{ color: '#FBBF24', display: 'block', marginBottom: '8px' }}>📧 CUSTOMER VERIFICATION NOTICE DRAFT</strong>
            Dear <b>{activeAccount.customerName}</b>,<br/><br/>
            We detected a high-risk charge of <b>₹{activeAccount.amount.toLocaleString()}</b> originating from <b>{activeAccount.transactionLocation}</b> on Account <b>{activeAccount.accountNumber}</b>.<br/><br/>
            Your account has been temporarily frozen to prevent potential fraud. If this transaction was authorized by you, please verify your identity below to unfreeze your account and resume spending.<br/><br/>
            <span style={{ color: '#38BDF8', textDecoration: 'underline' }}>[Click Here to Verify & Unfreeze Account]</span>
          </div>

          {!emailSent ? (
            <button 
              onClick={() => setEmailSent(true)}
              style={{ width: '100%', padding: '12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
              ✉️ Send Freeze Notification & Verification Link
            </button>
          ) : (
            <div style={{ padding: '12px', background: '#064E3B', color: '#34D399', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', textAlign: 'center', border: '1px solid #059669' }}>
              ✅ Verification Notice Dispatched via Email & SMS (Ref: #FREEZE-88392)
            </div>
          )}
        </div>
      )}

    </div>
  );
}