'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../../../components/Sidebar';
import { Mail, CheckCircle2, Shield, AlertCircle, RefreshCw, Unplug, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function GmailIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [statusState, setStatusState] = useState<{
    connected: boolean;
    email?: string;
    connectedAt?: string;
    lastSyncTime?: string;
    status?: string;
  }>({ connected: false });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/gmail/status');
      if (res.ok) {
        const json = await res.json();
        setStatusState({
          connected: json.connected || false,
          email: json.email,
          connectedAt: json.connectedAt,
          lastSyncTime: json.lastSyncTime,
          status: json.status
        });
      }
    } catch (e) {
      console.error('Error fetching Gmail integration status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check query params for error or success state
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setErrorMessage(`OAuth Authorization Error: ${err}`);
    }
  }, []);

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/integrations/gmail/auth');
      const json = await res.json();

      if (res.ok && json.url) {
        window.location.href = json.url;
      } else {
        setErrorMessage(json.message || 'Failed to initiate Google OAuth Client.');
        setIsConnecting(false);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error connecting to Google OAuth service.');
      setIsConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail integration?')) return;
    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/gmail/status', { method: 'POST' });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error disconnecting Gmail:', e);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-0.5">
              <span>Settings</span>
              <span>→</span>
              <span>Integrations</span>
              <span>→</span>
              <span className="text-indigo-600 font-bold">Gmail</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Gmail Hospital Integration
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStatus}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
              title="Refresh Connection Status"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 space-y-6 max-w-4xl w-full mx-auto">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="font-bold underline">Dismiss</button>
            </div>
          )}

          {/* Main Integration Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shadow-xs">
                  <Mail size={28} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Google Gmail Service Integration</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect your doctor Gmail inbox to allow ClinicaMind to monitor inbound patient intake packages.
                  </p>
                </div>
              </div>

              <div>
                {loading ? (
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Checking...</span>
                ) : statusState.connected ? (
                  <span className="text-xs font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>✓ Gmail Connected</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold font-mono bg-slate-100 text-slate-600 border border-slate-300 px-3 py-1 rounded-full">
                    Not Connected
                  </span>
                )}
              </div>
            </div>

            {/* Status & Details Section */}
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
                Verifying Gmail integration status on server...
              </div>
            ) : statusState.connected ? (
              /* CONNECTED STATE */
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-6 text-xs">
                    <div>
                      <span className="text-slate-400 font-mono block text-[10px] uppercase mb-1">Connected Gmail Address</span>
                      <span className="font-bold text-slate-900 text-sm font-mono flex items-center gap-2">
                        <Mail size={16} className="text-indigo-600" />
                        {statusState.email}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-mono block text-[10px] uppercase mb-1">Connection Date</span>
                      <span className="font-bold text-slate-700 text-xs font-mono">
                        {formatDate(statusState.connectedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Shield size={14} className="text-emerald-600" />
                    <span>Using server-stored refresh token. Scope: <code>gmail.readonly</code></span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href="/settings/integrations/gmail/inbox"
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition"
                    >
                      <Mail size={16} />
                      <span>View Patient Intake Inbox →</span>
                    </Link>

                    <button
                      onClick={handleDisconnectGmail}
                      disabled={isDisconnecting}
                      className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs px-4 py-2.5 rounded-xl transition"
                    >
                      <Unplug size={16} />
                      <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* NOT CONNECTED STATE */
              <div className="space-y-6">
                <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl space-y-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <Shield size={18} className="text-indigo-600" />
                    <span>Minimal OAuth Permission Scopes</span>
                  </div>
                  <p>
                    ClinicaMind requests <strong>ONLY</strong> read-only access (<code>https://www.googleapis.com/auth/gmail.readonly</code>) required for reading patient intake emails and downloading medical attachments.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 font-mono text-[11px] pt-1">
                    <li>Does NOT replace ClinicaMind application authentication</li>
                    <li>Does NOT grant send or delete privileges</li>
                    <li>Refresh tokens are stored securely on the server and never exposed to the frontend</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    onClick={handleConnectGmail}
                    disabled={isConnecting}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-indigo-200 transition"
                  >
                    <ExternalLink size={16} />
                    <span>{isConnecting ? 'Opening Google Consent Screen...' : 'Connect Gmail'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
