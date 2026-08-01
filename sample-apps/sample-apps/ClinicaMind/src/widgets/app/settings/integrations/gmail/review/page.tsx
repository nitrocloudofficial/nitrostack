'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../../../../components/Sidebar';
import {
  FileText,
  Paperclip,
  CheckSquare,
  Square,
  Eye,
  Download,
  Trash2,
  ArrowLeft,
  Calendar,
  User,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface DocumentItem {
  id: string;
  fileName: string;
  fileType: 'PDF' | 'PNG' | 'JPG' | 'JPEG' | 'DOCX' | string;
  fileSize: string;
  sourceEmail: string;
  uploadTime: string;
  localPath?: string;
  messageId?: string;
  attachmentId?: string;
  mimeType?: string;
  isSelected: boolean;
  isPreviewOpen: boolean;
}

export default function DocumentReviewWorkspacePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [collectedMessage, setCollectedMessage] = useState<string | null>(null);

  const formatFileType = (fileName: string, mimeType?: string): string => {
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

  const loadDocumentsFromInbox = async () => {
    setLoading(true);
    setCollectedMessage(null);
    try {
      const res = await fetch('/api/integrations/gmail/inbox');
      if (res.ok) {
        const json = await res.json();
        const emails = json.emails || [];

        const docs: DocumentItem[] = [];
        emails.forEach((email: any) => {
          if (email.attachments && Array.isArray(email.attachments)) {
            email.attachments.forEach((att: any, idx: number) => {
              const fileType = formatFileType(att.fileName, att.mimeType);
              docs.push({
                id: `${email.id}_${att.attachmentId || idx}`,
                fileName: att.fileName,
                fileType,
                fileSize: att.fileSize || '1.5 MB',
                sourceEmail: email.sender || 'patient@example.com',
                uploadTime: email.receivedTime ? new Date(email.receivedTime).toLocaleString() : new Date().toLocaleString(),
                messageId: email.id,
                attachmentId: att.attachmentId,
                mimeType: att.mimeType,
                isSelected: false,
                isPreviewOpen: true
              });
            });
          }
        });

        // Fallback default attachment if inbox returned no attachments yet
        if (docs.length === 0) {
          docs.push({
            id: 'doc_rahul_sharma',
            fileName: 'Rahul_Sharma_Patient_Intake.pdf',
            fileType: 'PDF',
            fileSize: '1.8 MB',
            sourceEmail: 'rahul.sharma@example.com',
            uploadTime: new Date().toLocaleString(),
            isSelected: true,
            isPreviewOpen: true
          });
        }

        setDocuments(docs);
      }
    } catch (e) {
      console.error('Error loading documents for review:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentsFromInbox();
  }, []);

  const selectedCount = documents.filter((d) => d.isSelected).length;

  const handleToggleSelect = (id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, isSelected: !doc.isSelected } : doc))
    );
  };

  const handleTogglePreview = (id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, isPreviewOpen: !doc.isPreviewOpen } : doc))
    );
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleSelectAll = () => {
    setDocuments((prev) => prev.map((doc) => ({ ...doc, isSelected: true })));
  };

  const handleDeselectAll = () => {
    setDocuments((prev) => prev.map((doc) => ({ ...doc, isSelected: false })));
  };

  const handleToggleAllPreviews = () => {
    const anyClosed = documents.some((d) => !d.isPreviewOpen);
    setDocuments((prev) => prev.map((doc) => ({ ...doc, isPreviewOpen: anyClosed })));
  };

  const handleDownloadSelected = () => {
    const selected = documents.filter((d) => d.isSelected);
    selected.forEach((doc) => {
      const link = document.createElement('a');
      link.href = `/api/integrations/gmail/file?file=${encodeURIComponent(doc.fileName)}`;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleRemoveSelected = () => {
    setDocuments((prev) => prev.filter((doc) => !doc.isSelected));
  };

  const handleProcessSelected = async () => {
    const selected = documents.filter((d) => d.isSelected);
    if (selected.length === 0) return;

    setIsProcessing(true);
    try {
      await fetch('/api/integrations/gmail/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: selected,
          sourceEmail: selected[0]?.sourceEmail || 'doctor@gmail.com',
          receivedTime: selected[0]?.uploadTime || new Date().toLocaleString()
        })
      });
      router.push('/settings/integrations/gmail/processing');
    } catch (e) {
      console.error('Error creating processing session:', e);
      router.push('/settings/integrations/gmail/processing');
    } finally {
      setIsProcessing(false);
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
              <Link href="/settings/integrations/gmail/inbox" className="hover:underline flex items-center gap-1 text-slate-600">
                <ArrowLeft size={12} />
                <span>Patient Intake Inbox</span>
              </Link>
              <span>→</span>
              <span className="text-indigo-600 font-bold">Document Review Workspace</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Document Review Workspace
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                {documents.length} Queue Items
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDocumentsFromInbox}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-slate-200"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Queue</span>
            </button>

            {/* Single Process Button Requirement */}
            <button
              onClick={handleProcessSelected}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-emerald-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Process Selected Documents ({selectedCount})</span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="p-8 space-y-6 max-w-6xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                <FolderOpen size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Final Human Review Stage Before AI Processing</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify downloaded email attachments, preview document pages, and select items to include in intake processing.
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="text-slate-400 block text-[10px] uppercase">Selected Documents</span>
              <span className="text-lg font-bold text-emerald-400">{selectedCount} / {documents.length}</span>
            </div>
          </div>

          {/* Collection Status Banner */}
          {collectedMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-mono flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-semibold">{collectedMessage}</span>
              </div>
              <button
                onClick={() => setCollectedMessage(null)}
                className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-1 bg-emerald-100 rounded-lg"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Top Actions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition border border-slate-200 cursor-pointer"
              >
                <CheckSquare size={13} className="text-indigo-600" />
                <span>Select All</span>
              </button>

              <button
                onClick={handleDeselectAll}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition border border-slate-200 cursor-pointer"
              >
                <Square size={13} className="text-slate-400" />
                <span>Deselect All</span>
              </button>

              <span className="text-slate-300">|</span>

              <button
                onClick={handleToggleAllPreviews}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition border border-slate-200 cursor-pointer"
              >
                <Eye size={13} className="text-indigo-600" />
                <span>Toggle All Previews</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSelected}
                disabled={selectedCount === 0}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3.5 py-1.5 rounded-xl transition border border-indigo-200 disabled:opacity-40 cursor-pointer"
              >
                <Download size={13} />
                <span>Download Original</span>
              </button>

              <button
                onClick={handleRemoveSelected}
                disabled={selectedCount === 0}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs px-3.5 py-1.5 rounded-xl transition border border-red-200 disabled:opacity-40 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Remove From Intake</span>
              </button>
            </div>
          </div>

          {/* Document Review List / Grid */}
          {documents.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Paperclip size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">No documents in review workspace queue.</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Connect Gmail or refresh the intake inbox to populate attachments for doctor verification.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {documents.map((doc) => {
                const fileUrl = `/api/integrations/gmail/file?file=${encodeURIComponent(doc.fileName)}`;

                return (
                  <div
                    key={doc.id}
                    className={`bg-white border-2 rounded-3xl overflow-hidden transition-all shadow-xs ${
                      doc.isSelected ? 'border-indigo-500 ring-4 ring-indigo-50/60' : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Document Header Controls & Metadata */}
                    <div className="p-5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 select-none">
                      <div className="flex items-center gap-4">
                        {/* Checkbox: Include in Processing */}
                        <label className="flex items-center gap-2.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition">
                          <input
                            type="checkbox"
                            checked={doc.isSelected}
                            onChange={() => handleToggleSelect(doc.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-900">Include in Processing</span>
                        </label>

                        {/* File Name & Type */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900">{doc.fileName}</h3>
                            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                              {doc.fileType}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Metadata Details & Card Actions */}
                      <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                        <span className="flex items-center gap-1">
                          <User size={13} className="text-slate-400" />
                          <span className="text-slate-700 font-semibold">{doc.sourceEmail}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{doc.uploadTime}</span>
                        </span>
                        <span>•</span>
                        <span className="font-bold text-slate-700">{doc.fileSize}</span>

                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                          {/* Toggle Preview Button */}
                          <button
                            onClick={() => handleTogglePreview(doc.id)}
                            className="p-2 text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-xl border border-slate-200 transition cursor-pointer"
                            title="Toggle Document Preview"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Download Original Button */}
                          <a
                            href={fileUrl}
                            download={doc.fileName}
                            className="p-2 text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-xl border border-slate-200 transition cursor-pointer"
                            title="Download Original File"
                          >
                            <Download size={15} />
                          </a>

                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="p-2 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl border border-slate-200 transition cursor-pointer"
                            title="Remove From Intake"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Document Preview Panel */}
                    {doc.isPreviewOpen && (
                      <div className="p-6 bg-slate-50/30">
                        {doc.fileType === 'PDF' ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                              <span>PDF Inline Viewer Preview</span>
                              <a href={fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                                Open Full Screen ↗
                              </a>
                            </div>
                            <iframe
                              src={fileUrl}
                              className="w-full h-96 rounded-2xl border border-slate-200 shadow-2xs bg-white"
                              title={doc.fileName}
                            />
                          </div>
                        ) : ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(doc.fileType) ? (
                          <div className="space-y-2">
                            <div className="text-xs font-mono text-slate-500">Image Preview</div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
                              <img
                                src={fileUrl}
                                alt={doc.fileName}
                                className="max-h-96 object-contain rounded-xl mx-auto border border-slate-100"
                              />
                            </div>
                          </div>
                        ) : doc.fileType === 'DOCX' || doc.fileName.endsWith('.docx') || doc.fileName.endsWith('.doc') ? (
                          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200 font-bold text-sm font-mono">
                              DOCX
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">{doc.fileName}</h4>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">
                                Microsoft Word Document • Source: {doc.sourceEmail} • Size: {doc.fileSize}
                              </p>
                              <p className="text-[11px] text-slate-400 italic mt-1">(Inline DOCX preview support coming in next release)</p>
                            </div>
                            <a
                              href={fileUrl}
                              download={doc.fileName}
                              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-2xs"
                            >
                              <Download size={14} />
                              <span>Download DOCX Original</span>
                            </a>
                          </div>
                        ) : (
                          <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                            <p className="font-bold text-xs text-slate-900">{doc.fileName}</p>
                            <p className="text-xs text-slate-500 font-mono">Size: {doc.fileSize} • Source: {doc.sourceEmail}</p>
                            <a
                              href={fileUrl}
                              download={doc.fileName}
                              className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl"
                            >
                              Download File
                            </a>
                          </div>
                        )}
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
