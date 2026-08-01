'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../../../../components/Sidebar';
import { Mail, RefreshCw, Paperclip, ChevronDown, ChevronUp, Inbox, Calendar, User, ShieldCheck, ArrowLeft, Bug, FolderOpen } from 'lucide-react';
import Link from 'next/link';

export default function GmailIntakeInboxPage() {
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<any[]>([]);
  const [connected, setConnected] = useState<boolean>(true);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    connectedEmail?: string;
    searchQuery?: string;
    messagesReturned?: number;
    firstMessageId?: string;
    apiError?: string;
  }>({});

  const [downloadingMap, setDownloadingMap] = useState<Record<string, boolean>>({});
  const [downloadedMap, setDownloadedMap] = useState<Record<string, { filename: string; mimeType: string; size: string; localPath: string }>>({});
  const [selectedAttachments, setSelectedAttachments] = useState<Record<string, boolean>>({});
  const [collectedStatus, setCollectedStatus] = useState<string | null>(null);

  const fetchInbox = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/integrations/gmail/inbox');
      if (res.ok) {
        const json = await res.json();
        setConnected(json.connected !== false);
        setEmails(json.emails || []);
        if (json.message) {
          setStatusMessage(json.message);
        }

        setDiagnostics({
          connectedEmail: json.accountEmail || 'doctor@gmail.com',
          searchQuery: json.query || 'subject:"NEW PATIENT"',
          messagesReturned: json.count !== undefined ? json.count : (json.emails?.length || 0),
          firstMessageId: json.firstMessageId || (json.emails?.[0]?.id || 'None'),
          apiError: json.apiError || 'None'
        });
      }
    } catch (e: any) {
      console.error('Error fetching Gmail intake inbox:', e);
      setStatusMessage('Failed to connect to server API endpoint.');
      setDiagnostics({
        connectedEmail: 'Unknown',
        searchQuery: 'subject:"NEW PATIENT"',
        messagesReturned: 0,
        firstMessageId: 'None',
        apiError: e?.message || 'Failed to connect to API'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAttachment = async (emailId: string, att: any) => {
    const key = `${emailId}_${att.attachmentId || att.fileName}`;
    setDownloadingMap((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await fetch('/api/integrations/gmail/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: emailId,
          attachmentId: att.attachmentId,
          fileName: att.fileName,
          mimeType: att.mimeType
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.attachment) {
          setDownloadedMap((prev) => ({
            ...prev,
            [key]: json.attachment
          }));
        }
      }
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setDownloadingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleSelectAttachment = (key: string) => {
    setSelectedAttachments((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleProcessSelected = (email: any) => {
    const selectedList = (email.attachments || []).filter((att: any) => {
      const key = `${email.id}_${att.attachmentId || att.fileName}`;
      return Boolean(selectedAttachments[key]);
    });

    const names = selectedList.map((a: any) => a.fileName).join(', ');
    setCollectedStatus(
      `Collected ${selectedList.length} selected document(s) for processing: [${names}]. No OCR, AI, or database modification performed.`
    );
  };

  const getFileType = (fileName: string, mimeType?: string): string => {
    const ext = fileName.split('.').pop()?.toUpperCase() || '';
    if (['PDF', 'PNG', 'JPG', 'JPEG', 'DOCX'].includes(ext)) {
      return ext;
    }
    if (mimeType?.includes('pdf')) return 'PDF';
    if (mimeType?.includes('png')) return 'PNG';
    if (mimeType?.includes('jpeg') || mimeType?.includes('jpg')) return 'JPG';
    if (mimeType?.includes('word') || mimeType?.includes('officedocument')) return 'DOCX';
    return ext || 'FILE';
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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
              <Link href="/settings/integrations/gmail" className="hover:underline flex items-center gap-1 text-slate-600">
                <ArrowLeft size={12} />
                <span>Gmail Integration</span>
              </Link>
              <span>→</span>
              <span className="text-indigo-600 font-bold">Patient Intake Inbox</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Patient Intake Inbox
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                {emails.length} Matching Messages
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings/integrations/gmail/review"
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 font-bold text-xs px-4 py-2 rounded-xl border border-slate-700 transition"
            >
              <FolderOpen size={14} className="text-indigo-400" />
              <span>Document Review Workspace →</span>
            </Link>

            <button
              onClick={fetchInbox}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Scanning Inbox...' : 'Refresh Inbox'}</span>
            </button>
          </div>
        </header>

        {/* Main Inbox Body */}
        <div className="p-8 space-y-6 max-w-5xl w-full mx-auto">
          {!connected && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <h3 className="font-bold text-sm">Gmail Service Disconnected</h3>
                <p className="mt-0.5">Connect your doctor Gmail account to query patient intake messages.</p>
              </div>
              <Link
                href="/settings/integrations/gmail"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs"
              >
                Connect Gmail →
              </Link>
            </div>
          )}

          {/* Requirement 6: Temporary Diagnostics Panel */}
          <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl p-5 text-xs font-mono space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Bug size={14} />
                Gmail Search Diagnostics
              </span>
              <span className="text-[10px] text-slate-500">Live API Telemetry</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Connected Gmail:</span>
                <span className="font-bold text-white truncate block">{diagnostics.connectedEmail || 'Checking...'}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Search Query:</span>
                <span className="font-bold text-indigo-300 truncate block">{diagnostics.searchQuery || 'subject:"NEW PATIENT"'}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Messages Returned:</span>
                <span className={`font-bold block ${diagnostics.messagesReturned && diagnostics.messagesReturned > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {diagnostics.messagesReturned !== undefined ? diagnostics.messagesReturned : 0}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase">First Message ID:</span>
                <span className="font-bold text-slate-300 truncate block">{diagnostics.firstMessageId || 'None'}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Any Gmail API Error:</span>
                <span className={`font-bold block ${diagnostics.apiError && diagnostics.apiError !== 'None' ? 'text-red-400' : 'text-slate-400'}`}>
                  {diagnostics.apiError || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Inbox Messages List */}
          {loading ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 text-xs font-mono animate-pulse">
              Scanning Gmail API for matching patient intake emails...
            </div>
          ) : emails.length === 0 ? (
            /* Mandatory Zero Matching Emails Empty State */
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto shadow-xs">
                <Inbox size={28} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No patient intake emails found.</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Send an email with Subject starting with <code className="bg-slate-100 px-1 rounded font-bold text-indigo-700">NEW PATIENT</code> to your connected Gmail address and click Refresh Inbox.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {emails.map((email) => {
                const isExpanded = expandedEmailId === email.id;
                return (
                  <div
                    key={email.id}
                    className={`bg-white border transition-all rounded-2xl overflow-hidden shadow-xs ${
                      isExpanded ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200/80 hover:border-indigo-300'
                    }`}
                  >
                    {/* Email Summary Header (Click to Expand) */}
                    <div
                      onClick={() => setExpandedEmailId(isExpanded ? null : email.id)}
                      className="p-5 cursor-pointer flex items-start justify-between gap-4 select-none hover:bg-slate-50/50 transition"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition">
                            {email.subject}
                          </h3>
                          {email.attachmentCount > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Paperclip size={11} />
                              <span>{email.attachmentCount} Attachments</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <User size={13} className="text-slate-400" />
                            {email.sender}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Calendar size={13} className="text-slate-400" />
                            {formatDate(email.receivedTime)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-1 italic font-sans">
                          "{email.snippet}"
                        </p>
                      </div>

                      <div className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl transition">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {/* Expanded Content View (Body & Attachment Metadata) */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6 animate-fadeIn">
                        {/* Body Text */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                            Email Message Body
                          </span>
                          <div className="bg-white border border-slate-200/80 p-4 rounded-xl text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed shadow-2xs">
                            {email.body}
                          </div>
                        </div>

                        {/* Document Review Workspace */}
                        <div className="border-t border-slate-200/80 pt-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                                <span>📄 Document Review Workspace</span>
                                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                                  {email.attachments?.length || 0} Attachments
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                                Preview documents, select items with "Include in Intake", and click Process Selected Documents.
                              </p>
                            </div>

                            {/* Process Selected Documents Button */}
                            {email.attachments && email.attachments.length > 0 && (() => {
                              const selectedCount = email.attachments.filter((att: any) => {
                                const key = `${email.id}_${att.attachmentId || att.fileName}`;
                                return Boolean(selectedAttachments[key]);
                              }).length;

                              return (
                                <div className="flex items-center gap-3">
                                  {selectedCount > 0 && (
                                    <span className="text-xs font-mono font-bold text-indigo-600">
                                      {selectedCount} Selected
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleProcessSelected(email)}
                                    disabled={selectedCount === 0}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                                  >
                                    <span>Process Selected Documents</span>
                                  </button>
                                </div>
                              );
                            })()}
                          </div>

                          {collectedStatus && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-mono font-semibold flex items-center justify-between shadow-2xs">
                              <span>✓ {collectedStatus}</span>
                              <button onClick={() => setCollectedStatus(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold">✕</button>
                            </div>
                          )}

                          {email.attachments && email.attachments.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                              {email.attachments.map((att: any, idx: number) => {
                                const key = `${email.id}_${att.attachmentId || att.fileName}`;
                                const isDownloading = Boolean(downloadingMap[key]);
                                const downloadedData = downloadedMap[key];
                                const isDownloaded = Boolean(downloadedData);
                                const isSelected = Boolean(selectedAttachments[key]);
                                const fileType = getFileType(att.fileName, att.mimeType);

                                const fileUrl = downloadedData?.localPath
                                  ? `/api/integrations/gmail/file?path=${encodeURIComponent(downloadedData.localPath)}`
                                  : `/api/integrations/gmail/file?file=${encodeURIComponent(att.fileName)}`;

                                return (
                                  <div
                                    key={idx}
                                    className={`bg-white border-2 rounded-2xl p-5 space-y-4 transition shadow-xs ${
                                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-50/50' : 'border-slate-200/80 hover:border-slate-300'
                                    }`}
                                  >
                                    {/* Header Controls & Metadata */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleSelectAttachment(key)}
                                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition">
                                          Include in Intake
                                        </span>
                                      </label>

                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-900 font-sans">{att.fileName}</span>
                                        <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                                          {fileType}
                                        </span>
                                        <span className="text-xs text-slate-500 font-mono">
                                          {downloadedData?.size || att.fileSize}
                                        </span>

                                        {!isDownloaded && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadAttachment(email.id, att);
                                            }}
                                            disabled={isDownloading}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-3 py-1 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-2xs"
                                          >
                                            {isDownloading ? 'Downloading...' : 'Download Attachment'}
                                          </button>
                                        )}
                                        {isDownloaded && (
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                            Downloaded ✓
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Document Preview Rendering Area */}
                                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 min-h-[160px] flex flex-col justify-center items-center">
                                      {fileType === 'PDF' ? (
                                        <div className="w-full space-y-2">
                                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                                            <span>PDF Preview</span>
                                            {isDownloaded && (
                                              <a href={fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                                                Open Full Window ↗
                                              </a>
                                            )}
                                          </div>
                                          {isDownloaded ? (
                                            <iframe
                                              src={fileUrl}
                                              className="w-full h-80 rounded-xl border border-slate-200 shadow-2xs bg-white"
                                              title={att.fileName}
                                            />
                                          ) : (
                                            <div className="text-center p-6 space-y-2">
                                              <p className="text-xs text-slate-600 font-medium">PDF Document: {att.fileName}</p>
                                              <button
                                                onClick={() => handleDownloadAttachment(email.id, att)}
                                                disabled={isDownloading}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-2xs cursor-pointer"
                                              >
                                                {isDownloading ? 'Downloading PDF...' : 'Download & Render PDF Preview'}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ) : ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(fileType) ? (
                                        <div className="w-full space-y-2">
                                          <div className="text-[11px] font-mono text-slate-500">Image Preview</div>
                                          {isDownloaded ? (
                                            <img
                                              src={fileUrl}
                                              alt={att.fileName}
                                              className="max-h-80 object-contain rounded-xl mx-auto border border-slate-200 shadow-2xs bg-white p-2"
                                            />
                                          ) : (
                                            <div className="text-center p-6 space-y-2">
                                              <p className="text-xs text-slate-600 font-medium">Image File: {att.fileName}</p>
                                              <button
                                                onClick={() => handleDownloadAttachment(email.id, att)}
                                                disabled={isDownloading}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-2xs cursor-pointer"
                                              >
                                                {isDownloading ? 'Downloading Image...' : 'Download & Render Image Preview'}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ) : fileType === 'DOCX' || att.fileName.endsWith('.docx') || att.fileName.endsWith('.doc') ? (
                                        <div className="w-full p-6 text-center space-y-3 bg-white rounded-xl border border-slate-200">
                                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto border border-blue-200 font-bold text-xs font-mono">
                                            DOCX
                                          </div>
                                          <div>
                                            <h5 className="font-bold text-sm text-slate-900">{att.fileName}</h5>
                                            <p className="text-xs text-slate-500 font-mono mt-0.5">Microsoft Word Document ({att.fileSize})</p>
                                          </div>
                                          {isDownloaded ? (
                                            <a
                                              href={fileUrl}
                                              download={att.fileName}
                                              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-2xs"
                                            >
                                              Download DOCX File 📥
                                            </a>
                                          ) : (
                                            <button
                                              onClick={() => handleDownloadAttachment(email.id, att)}
                                              disabled={isDownloading}
                                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-2xs cursor-pointer"
                                            >
                                              {isDownloading ? 'Downloading DOCX...' : 'Download DOCX File'}
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        /* Fallback */
                                        <div className="w-full p-6 text-center space-y-2 bg-white rounded-xl border border-slate-200">
                                          <p className="font-bold text-xs text-slate-800">{att.fileName}</p>
                                          <p className="text-xs text-slate-500 font-mono">{att.mimeType || 'Document'} • {att.fileSize}</p>
                                          {isDownloaded ? (
                                            <a
                                              href={fileUrl}
                                              download={att.fileName}
                                              className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-2xs"
                                            >
                                              Download File 📥
                                            </a>
                                          ) : (
                                            <button
                                              onClick={() => handleDownloadAttachment(email.id, att)}
                                              disabled={isDownloading}
                                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-2xs cursor-pointer"
                                            >
                                              Download Attachment
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 bg-white border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 text-center font-mono">
                              No attachments.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
