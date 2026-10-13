'use client';

import React, { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface LegalNoticeData {
  status: string;
  data?: {
    noticeText: string;
    noticeTitle: string;
    vendorName: string;
    productName: string;
    desiredResolution: string;
  };
  error?: { message: string };
}

export default function GenerateLegalNoticeWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ success: boolean; message: string } | null>(null);
  const toolData = getToolOutput<LegalNoticeData>();

  if (!isReady) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#fff' : '#000' }}>Preparing Legal Document...</div>;
  }

  if (!toolData) {
    return <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#999' : '#666' }}>No notice data available.</div>;
  }

  if (toolData.status === 'error') {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        <p>Error generating notice: {toolData.error?.message}</p>
      </div>
    );
  }

  const { noticeText, noticeTitle, vendorName, productName } = toolData.data || {};
  
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#f3f4f6';
  const paperBg = isDark ? '#262626' : '#ffffff';
  const textColor = isDark ? '#d4d4d8' : '#374151';
  const headingColor = isDark ? '#ffffff' : '#111827';
  const borderColor = isDark ? '#404040' : '#e5e7eb';
  const buttonBg = isDark ? '#3b82f6' : '#2563eb';
  const buttonHoverBg = isDark ? '#2563eb' : '#1d4ed8';

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      setSendStatus({ success: false, message: 'Please enter a recipient email' });
      return;
    }

    setIsSending(true);
    setSendStatus(null);
    try {
      const result: any = await callTool('sendLegalNotice', {
        noticeText,
        recipientEmail,
        vendorName: vendorName || 'Seller',
        productName: productName || 'Product'
      });

      const rawData = result?.type === 'widget' ? result.data : result;
      if (rawData?.data?.sent || rawData?.sent) {
        setSendStatus({ success: true, message: 'Notice sent successfully!' });
      } else {
        setSendStatus({ success: false, message: rawData?.error?.message || 'Failed to send' });
      }
    } catch (error) {
      setSendStatus({ success: false, message: error instanceof Error ? error.message : 'Error sending email' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      borderRadius: '12px',
      color: textColor,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      border: `1px solid ${borderColor}`,
    }}>
      {/* Header Area */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '28px' }}>⚖️</div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: headingColor }}>
              Drafted Legal Notice
            </h2>
            <p style={{ margin: '0', fontSize: '14px', color: isDark ? '#a3a3a3' : '#6b7280' }}>
              Review the notice for {productName} before sending
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="email"
              placeholder="Seller Email..."
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                background: paperBg,
                color: textColor,
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSendEmail}
              disabled={isSending}
              onMouseOver={(e) => { if (!isSending) e.currentTarget.style.backgroundColor = buttonHoverBg; }}
              onMouseOut={(e) => { if (!isSending) e.currentTarget.style.backgroundColor = buttonBg; }}
              style={{
                backgroundColor: isSending ? '#9ca3af' : buttonBg,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSending ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{isSending ? '⏳' : '✉️'}</span> {isSending ? 'Sending...' : 'Send via Email'}
            </button>
          </div>
          {sendStatus && (
            <div style={{ 
              fontSize: '13px', 
              color: sendStatus.success ? '#10b981' : '#ef4444',
              fontWeight: '500'
            }}>
              {sendStatus.message}
            </div>
          )}
        </div>
      </div>

      {/* Document Paper Area */}
      <div style={{
        background: paperBg,
        padding: '32px',
        borderRadius: '8px',
        border: `1px solid ${borderColor}`,
        boxShadow: isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.5)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontFamily: '"Times New Roman", Times, serif', // Legal document feel
        fontSize: '16px',
        lineHeight: '1.6',
        color: isDark ? '#e5e5e5' : '#1a1a1a',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          fontSize: '20px', 
          fontWeight: 'bold', 
          marginBottom: '24px',
          textTransform: 'uppercase'
        }}>
          {noticeTitle}
        </h1>
        
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
          {noticeText}
        </div>
      </div>
    </div>
  );
}
