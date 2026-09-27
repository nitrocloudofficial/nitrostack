'use client';

import { useEffect, useState } from 'react';
import { useTheme, useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Application {
  applicationId: string;
  applicantName: string;
  loanAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'exception';
  createdAt: string;
  eligibleLoanAmount: number;
  qualifies: boolean;
  varianceCount: number;
}

interface DashboardData {
  applications?: Application[];
}

/**
 * Sample data for styling this widget standalone at
 * http://localhost:3001/authority-dashboard?preview=1
 *
 * Only ever used when ?preview=1 is in the URL, so a real host that fails to send
 * data still shows the loading state rather than silently displaying fake numbers.
 */
const PREVIEW_DATA: DashboardData = {
  applications: [
    {
      applicationId: 'app_001',
      applicantName: 'Rajesh Kumar',
      loanAmount: 500000,
      status: 'pending',
      createdAt: new Date().toISOString(),
      eligibleLoanAmount: 600000,
      qualifies: true,
      varianceCount: 0,
    },
    {
      applicationId: 'app_002',
      applicantName: 'Priya Singh',
      loanAmount: 300000,
      status: 'exception',
      createdAt: new Date().toISOString(),
      eligibleLoanAmount: 250000,
      qualifies: false,
      varianceCount: 1,
    },
    {
      applicationId: 'app_003',
      applicantName: 'Amit Patel',
      loanAmount: 1000000,
      status: 'approved',
      createdAt: new Date().toISOString(),
      eligibleLoanAmount: 1200000,
      qualifies: true,
      varianceCount: 0,
    },
  ],
};

export default function AuthorityDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ selectedAppId: string | null }>(() => ({
    selectedAppId: null,
  }));

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
        {isReady ? 'Loading applications…' : 'Connecting to host…'}
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const cardBg = isDark ? '#2d2d2d' : '#f9fafb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const borderColor = isDark ? '#444' : '#e5e7eb';

  const applications = data.applications ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'exception':
        return '#f59e0b';
      case 'pending':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'exception':
        return '⚠️';
      case 'pending':
        return '⏳';
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        🏛️ Authority Dashboard
      </h1>

      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '8px' }}>
            Total Applications
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {applications.length}
          </div>
        </div>

        <div
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '8px' }}>
            Pending Review
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
            {applications.filter((a) => a.status === 'pending').length}
          </div>
        </div>

        <div
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '8px' }}>
            Exceptions
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
            {applications.filter((a) => a.status === 'exception').length}
          </div>
        </div>

        <div
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '8px' }}>
            Approved
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
            {applications.filter((a) => a.status === 'approved').length}
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr
                style={{
                  background: isDark ? '#1a1a1a' : '#f3f4f6',
                  borderBottom: `1px solid ${borderColor}`,
                }}
              >
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: mutedColor,
                  }}
                >
                  Applicant
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: mutedColor,
                  }}
                >
                  Loan Amount
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: mutedColor,
                  }}
                >
                  Eligible
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: mutedColor,
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: mutedColor,
                  }}
                >
                  Flags
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: mutedColor,
                  }}
                >
                  Applied
                </th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: mutedColor,
                    }}
                  >
                    No applications found.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr
                    key={app.applicationId}
                    style={{
                      borderBottom: `1px solid ${borderColor}`,
                      cursor: 'pointer',
                      background:
                        state?.selectedAppId === app.applicationId
                          ? isDark
                            ? '#3d3d3d'
                            : '#f0f0f0'
                          : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    onClick={() =>
                      setState({
                        selectedAppId:
                          state?.selectedAppId === app.applicationId
                            ? null
                            : app.applicationId,
                      })
                    }
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                      {app.applicantName}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {formatCurrency(app.loanAmount)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {formatCurrency(app.eligibleLoanAmount)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: getStatusColor(app.status),
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {getStatusIcon(app.status)}
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {app.varianceCount > 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: '#fef3c7',
                            color: '#92400e',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          ⚠️ {app.varianceCount}
                        </span>
                      ) : (
                        <span style={{ color: mutedColor }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: mutedColor }}>
                      {formatDate(app.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Application Detail */}
      {state?.selectedAppId && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: cardBg,
            border: `2px solid #667eea`,
            borderRadius: '12px',
          }}
        >
          <div style={{ fontSize: '14px', color: mutedColor, marginBottom: '8px' }}>
            Selected Application
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>
            {applications.find((a) => a.applicationId === state.selectedAppId)
              ?.applicantName || 'Unknown'}
          </div>
          <div style={{ fontSize: '12px', color: mutedColor, marginTop: '4px' }}>
            ID: {state.selectedAppId}
          </div>
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              background: isDark ? '#1a1a1a' : '#f3f4f6',
              borderRadius: '8px',
              fontSize: '12px',
              color: mutedColor,
            }}
          >
            Click "View Details" in the chat to see full application information, variance
            flags, and serviceability results.
          </div>
        </div>
      )}
    </div>
  );
}
