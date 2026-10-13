'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

interface ResolutionPlanData {
  recommendation: 'repair' | 'replacement' | 'refund' | 'return' | 'escalation';
  reasoning: string;
  evidenceUsed: string[];
  missingInformation?: string[];
  nextActions: string[];
  vendorName?: string;
  productName?: string;
  purchaseDate?: string;
}

export default function ResolutionPlanWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const [sellerEmail, setSellerEmail] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [showNoticePreview, setShowNoticePreview] = useState(false);
  const [sendingNotice, setSendingNotice] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ success: boolean; message: string } | null>(null);

  const data = getToolOutput<ResolutionPlanData>();

  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Initializing...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#999' : '#666',
      }}>
        No resolution plan available. Please analyze a receipt and damage first.
      </div>
    );
  }

  const isDark = theme === 'dark';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const accentColor = isDark ? '#3b82f6' : '#2563eb';
  const successColor = '#10b981';
  const warningColor = '#f59e0b';

  const getRecommendationColor = (rec: string) => {
    const colors: Record<string, string> = {
      refund: '#10b981',
      replacement: '#3b82f6',
      repair: '#f59e0b',
      return: '#8b5cf6',
      escalation: '#ef4444'
    };
    return colors[rec] || '#6b7280';
  };

  const getRecommendationIcon = (rec: string) => {
    const icons: Record<string, string> = {
      refund: '💰',
      replacement: '📦',
      repair: '🔧',
      return: '↩️',
      escalation: '⚠️'
    };
    return icons[rec] || '📋';
  };

  const handleGenerateLegalNotice = async () => {
    if (!data.vendorName || !data.productName || !data.purchaseDate) {
      setSendStatus({ success: false, message: 'Missing required information for legal notice' });
      return;
    }

    try {
      const result: any = await callTool('generateLegalNotice', {
        vendorName: data.vendorName,
        purchaseDate: data.purchaseDate,
        productName: data.productName,
        issueDescription: data.reasoning,
        desiredResolution: data.recommendation === 'refund' ? 'refund' : data.recommendation === 'replacement' ? 'replacement' : 'repair'
      });

      const rawData = result?.type === 'widget' ? result.data : result;
      const actualNoticeText = rawData?.data?.noticeText || rawData?.noticeText;

      if (actualNoticeText) {
        setNoticeText(actualNoticeText);
        setShowNoticePreview(true);
        setSendStatus(null);
      } else {
        console.error('Failed to generate legal notice. Result:', result);
        setSendStatus({ success: false, message: 'Failed to generate legal notice' });
      }
    } catch (error) {
      setSendStatus({ success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleSendLegalNotice = async () => {
    if (!sellerEmail) {
      setSendStatus({ success: false, message: 'Please enter seller email address' });
      return;
    }

    if (!noticeText) {
      setSendStatus({ success: false, message: 'Please generate a legal notice first' });
      return;
    }

    setSendingNotice(true);
    try {
      const result: any = await callTool('sendLegalNotice', {
        noticeText,
        recipientEmail: sellerEmail,
        vendorName: data.vendorName || 'Seller',
        productName: data.productName || 'Product'
      });

      if (result?.data?.sent || result?.sent) {
        setSendStatus({ success: true, message: `✓ Legal notice sent to ${sellerEmail}` });
        setNoticeText('');
        setSellerEmail('');
        setShowNoticePreview(false);
      } else {
        setSendStatus({ success: false, message: result?.error?.message || result?.message || 'Failed to send legal notice' });
      }
    } catch (error) {
      setSendStatus({ success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setSendingNotice(false);
    }
  };

  return (
    <div style={{
      padding: '24px',
      background: isDark ? '#0f0f0f' : '#f9fafb',
      borderRadius: '12px',
      color: isDark ? '#ffffff' : '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <span style={{ fontSize: '32px' }}>
          {getRecommendationIcon(data.recommendation)}
        </span>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Resolution Plan
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
            {data.productName || 'Product'} • {data.vendorName || 'Vendor'}
          </p>
        </div>
      </div>

      {/* Recommendation Badge */}
      <div style={{
        display: 'inline-block',
        padding: '8px 16px',
        borderRadius: '8px',
        background: getRecommendationColor(data.recommendation),
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {data.recommendation}
      </div>

      {/* Reasoning Section */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        background: isDark ? '#1a1a1a' : '#f3f4f6',
        borderRadius: '8px',
        borderLeft: `4px solid ${accentColor}`,
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', opacity: 0.8 }}>
          Why This Recommendation
        </h3>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
          {data.reasoning}
        </p>
      </div>

      {/* Evidence Used */}
      {data.evidenceUsed && data.evidenceUsed.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', opacity: 0.8 }}>
            Evidence Used
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '14px',
            lineHeight: '1.8',
          }}>
            {data.evidenceUsed.map((evidence, idx) => (
              <li key={idx} style={{ marginBottom: '4px', opacity: 0.9 }}>
                {evidence}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Information */}
      {data.missingInformation && data.missingInformation.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          background: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
          borderRadius: '8px',
          borderLeft: `4px solid ${warningColor}`,
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: warningColor }}>
            ⚠️ Missing Information
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '13px',
            lineHeight: '1.6',
          }}>
            {data.missingInformation.map((info, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {info}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Actions */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', opacity: 0.8 }}>
          Next Actions
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {data.nextActions && data.nextActions.length > 0 ? (
            data.nextActions.map((action, idx) => (
              <div key={idx} style={{
                padding: '12px',
                background: isDark ? '#1a1a1a' : '#f3f4f6',
                borderRadius: '6px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '16px' }}>→</span>
                {action}
              </div>
            ))
          ) : (
            <p style={{ fontSize: '14px', opacity: 0.6, margin: 0 }}>No additional actions required</p>
          )}
        </div>
      </div>

      {/* Email Action Section */}
      <div style={{
        padding: '16px',
        background: isDark ? '#1a1a1a' : '#f3f4f6',
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
          📧 Send Legal Notice
        </h3>

        {/* Seller Email Input */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '6px',
            opacity: 0.8,
          }}>
            Seller Email Address
          </label>
          <input
            type="email"
            value={sellerEmail}
            onChange={(e) => setSellerEmail(e.target.value)}
            placeholder="seller@company.com"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: `1px solid ${borderColor}`,
              background: isDark ? '#0f0f0f' : '#ffffff',
              color: isDark ? '#ffffff' : '#000000',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <p style={{
            margin: '6px 0 0 0',
            fontSize: '12px',
            opacity: 0.6,
          }}>
            Enter the seller's email address where you want to send the legal notice
          </p>
        </div>

        {/* Generate Notice Button */}
        <button
          onClick={handleGenerateLegalNotice}
          disabled={!data.vendorName || !data.productName}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: '6px',
            border: 'none',
            background: accentColor,
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: !data.vendorName || !data.productName ? 'not-allowed' : 'pointer',
            marginBottom: '12px',
            opacity: !data.vendorName || !data.productName ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          📝 Generate Legal Notice
        </button>

        {/* Notice Preview */}
        {showNoticePreview && noticeText && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            background: isDark ? '#0f0f0f' : '#ffffff',
            borderRadius: '6px',
            border: `1px solid ${borderColor}`,
            maxHeight: '200px',
            overflowY: 'auto',
            fontSize: '12px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {noticeText}
          </div>
        )}

        {/* Send Notice Button */}
        {noticeText && (
          <button
            onClick={handleSendLegalNotice}
            disabled={!sellerEmail || sendingNotice}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: successColor,
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: !sellerEmail || sendingNotice ? 'not-allowed' : 'pointer',
              opacity: !sellerEmail || sendingNotice ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {sendingNotice ? '⏳ Sending...' : '✉️ Send Legal Notice'}
          </button>
        )}
      </div>

      {/* Status Messages */}
      {sendStatus && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          background: sendStatus.success
            ? isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)'
            : isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
          border: `1px solid ${sendStatus.success ? successColor : '#ef4444'}`,
          color: sendStatus.success ? successColor : '#ef4444',
          fontSize: '13px',
          fontWeight: '500',
        }}>
          {sendStatus.message}
        </div>
      )}
    </div>
  );
}
