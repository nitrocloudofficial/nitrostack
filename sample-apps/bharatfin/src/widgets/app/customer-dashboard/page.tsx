'use client';

import { useEffect, useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Account {
  accountId: string;
  bankName: string;
  accountNumber: string;
  accountType: 'savings' | 'current' | 'credit';
  balance: number;
  currency: string;
  lastUpdated: string;
}

interface CreditHealth {
  userId: string;
  creditScore: number;
  healthLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  liabilitiesCount: number;
  totalOutstanding: number;
  defaultHistory: boolean;
  lastUpdated: string;
}

interface WithheldAccount {
  bankName: string;
  bankId: string;
  status: string;
  reason: string;
}

interface ConsentSummary {
  accountsReleased: number;
  accountsWithheld: number;
  withheld: WithheldAccount[];
  creditHealthBlocked: string | null;
}

interface DashboardData {
  accounts?: Account[];
  creditHealth?: CreditHealth;
  consent?: ConsentSummary;
}

/**
 * Sample data for styling this widget standalone at
 * http://localhost:3001/customer-dashboard?preview=1
 *
 * Only ever used when ?preview=1 is in the URL, so a real host that fails to send
 * data still shows the loading state rather than silently displaying fake numbers.
 */
const PREVIEW_DATA: DashboardData = {
  accounts: [
    {
      accountId: 'acc_001',
      bankName: 'State Bank of India',
      accountNumber: '1234567890',
      accountType: 'savings',
      balance: 250000,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    },
    {
      accountId: 'acc_002',
      bankName: 'HDFC Bank',
      accountNumber: '0987654321',
      accountType: 'current',
      balance: 500000,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    },
  ],
  creditHealth: {
    userId: 'user_001',
    creditScore: 745,
    healthLabel: 'Good',
    liabilitiesCount: 2,
    totalOutstanding: 2150000,
    defaultHistory: false,
    lastUpdated: new Date().toISOString(),
  },
};

export default function CustomerDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  // Read the flag after mount so server and client agree on the first render.
  const [isPreview, setIsPreview] = useState(false);
  useEffect(() => {
    setIsPreview(new URLSearchParams(window.location.search).has('preview'));
  }, []);

  const data = getToolOutput<DashboardData>() ?? (isPreview ? PREVIEW_DATA : undefined);

  // Render as soon as data arrives — don't block on the `isReady` handshake, which
  // may never flip in some hosts and would leave the widget stuck on a splash.
  if (!data) {
    // These states must stay legible on BOTH light and dark host backgrounds, so
    // they paint their own background instead of inheriting a transparent one.
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          background: '#1f2937',
          color: '#ffffff',
          borderRadius: '12px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {isReady ? 'Loading dashboard…' : 'Connecting to host…'}
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const cardBg = isDark ? '#2d2d2d' : '#f9fafb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const borderColor = isDark ? '#444' : '#e5e7eb';

  const accounts = data.accounts ?? [];
  const creditHealth = data.creditHealth;

  const getHealthColor = (label: string) => {
    switch (label) {
      case 'Excellent':
        return '#10b981';
      case 'Good':
        return '#3b82f6';
      case 'Fair':
        return '#f59e0b';
      case 'Poor':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getHealthIcon = (label: string) => {
    switch (label) {
      case 'Excellent':
        return '⭐';
      case 'Good':
        return '👍';
      case 'Fair':
        return '⚠️';
      case 'Poor':
        return '❌';
      default:
        return '❓';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      style={{
        padding: '24px',
        background: bgColor,
        color: textColor,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: 'bold' }}>
        💰 Customer Dashboard
      </h1>

      {/* Consent gate. Withheld institutions are shown explicitly rather than
          silently omitted — the customer and the underwriter both need to see
          that data is missing because consent is missing, not because it doesn't exist. */}
      {data.consent && data.consent.accountsWithheld > 0 && (
        <div
          style={{
            background: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              fontWeight: 700,
              color: '#f59e0b',
            }}
          >
            <span style={{ fontSize: '18px' }}>🔒</span>
            {data.consent.accountsWithheld} account
            {data.consent.accountsWithheld > 1 ? 's' : ''} withheld — consent required
          </div>
          {data.consent.withheld.map((w) => (
            <div
              key={w.bankId}
              style={{ fontSize: '13px', color: mutedColor, marginTop: '6px' }}
            >
              <strong style={{ color: textColor }}>{w.bankName}</strong> — {w.reason}
            </div>
          ))}
          <div style={{ fontSize: '12px', color: mutedColor, marginTop: '10px' }}>
            Released {data.consent.accountsReleased} of{' '}
            {data.consent.accountsReleased + data.consent.accountsWithheld} linked
            accounts under active Account Aggregator consent.
          </div>
        </div>
      )}

      {/* Credit Health Card */}
      {creditHealth && (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              Credit Health
            </h2>
            <span
              style={{
                fontSize: '24px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: getHealthColor(creditHealth.healthLabel),
                color: 'white',
              }}
            >
              {getHealthIcon(creditHealth.healthLabel)}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
                Credit Score
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {creditHealth.creditScore}
              </div>
              <div style={{ fontSize: '12px', color: mutedColor }}>
                {creditHealth.healthLabel}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
                Active Liabilities
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {creditHealth.liabilitiesCount}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
                Outstanding
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {formatCurrency(creditHealth.totalOutstanding)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
                Default History
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {creditHealth.defaultHistory ? '⚠️ Yes' : '✅ No'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Section */}
      <div>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Linked Accounts ({accounts.length})
        </h2>

        {accounts.length === 0 ? (
          <div
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: mutedColor,
            }}
          >
            No accounts linked yet. Link your first bank account to get started.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {accounts.map((account) => (
              <div
                key={account.accountId}
                style={{
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', color: mutedColor }}>
                      {account.bankName}
                    </div>
                    <div style={{ fontSize: '12px', color: mutedColor, marginTop: '4px' }}>
                      {account.accountType.charAt(0).toUpperCase() +
                        account.accountType.slice(1)}{' '}
                      Account
                    </div>
                  </div>
                  <span style={{ fontSize: '20px' }}>🏦</span>
                </div>

                <div
                  style={{
                    background: isDark ? '#1a1a1a' : '#f3f4f6',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
                    Account Number
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      fontFamily: 'monospace',
                    }}
                  >
                    ••••{account.accountNumber.slice(-4)}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'end',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: mutedColor }}>Balance</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                      {formatCurrency(account.balance)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: mutedColor, textAlign: 'right' }}>
                    Updated
                    <br />
                    {new Date(account.lastUpdated).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
          Check Your Loan Eligibility
        </h3>
        <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>
          Based on your linked accounts and credit health, see how much you can borrow.
        </p>
      </div>
    </div>
  );
}
