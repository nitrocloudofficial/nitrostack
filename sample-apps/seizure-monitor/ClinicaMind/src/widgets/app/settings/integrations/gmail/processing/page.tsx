'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../../../../components/Sidebar';
import {
  FileText,
  Paperclip,
  ArrowLeft,
  Calendar,
  User,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  FolderOpen,
  HardDrive,
  Cpu,
  AlertCircle,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface IntakeSessionData {
  sessionId: string;
  createdAt: string;
  status: string;
  documentCount: number;
  documents: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: string;
    sourceEmail: string;
    uploadTime: string;
    localPath?: string;
    mimeType?: string;
  }>;
  sourceEmail: string;
  receivedTime: string;
  temporaryStoragePath: string;
}

export default function DocumentProcessingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<IntakeSessionData | null>(null);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    processingStatus: string;
    pagesProcessed: number;
    characterCount: number;
    confidence: string;
    rawText: string;
  } | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [copyBadge, setCopyBadge] = useState(false);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/gmail/session');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.session) {
          setSession(json.session);
        } else {
          // Fallback default mock session if accessed directly
          setSession({
            sessionId: 'SESSION-INTAKE-SAMPLE',
            createdAt: new Date().toISOString(),
            status: 'Ready for OCR',
            documentCount: 1,
            documents: [
              {
                id: 'doc_rahul_sharma',
                fileName: 'Rahul_Sharma_Patient_Intake.pdf',
                fileType: 'PDF',
                fileSize: '1.8 MB',
                sourceEmail: 'rahul.sharma@example.com',
                uploadTime: new Date().toLocaleString()
              }
            ],
            sourceEmail: 'rahul.sharma@example.com',
            receivedTime: new Date().toLocaleString(),
            temporaryStoragePath: 'data/temp_attachments'
          });
        }
      }
    } catch (e) {
      console.error('Error fetching intake processing session:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  const handleStartOCR = async () => {
    if (!session || !session.documents || session.documents.length === 0) return;
    setIsOcrRunning(true);
    setOcrError(null);
    setOcrNotice(null);

    try {
      const res = await fetch('/api/integrations/gmail/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          documents: session.documents
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.ocrResult) {
          setOcrResult(json.ocrResult);
        } else {
          setOcrError(json.message || 'OCR extraction failed.');
        }
      } else {
        const errorJson = await res.json();
        setOcrError(errorJson.message || `HTTP ${res.status} OCR Error`);
      }
    } catch (e: any) {
      console.error('Error running OCR engine:', e);
      setOcrError(e?.message || 'Network exception during OCR processing.');
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleCopyText = () => {
    if (!ocrResult?.rawText) return;
    navigator.clipboard.writeText(ocrResult.rawText);
    setCopyBadge(true);
    setTimeout(() => setCopyBadge(false), 2000);
  };

  const handleDownloadOcrText = () => {
    if (!ocrResult?.rawText) return;
    const blob = new Blob([ocrResult.rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session?.sessionId || 'Intake'}_OCR_Extracted_Text.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleContinueToAiExtraction = () => {
    if (!ocrResult) return;
    router.push('/settings/integrations/gmail/extraction');
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-0.5">
              <Link href="/settings/integrations/gmail/review" className="hover:underline flex items-center gap-1 text-slate-600">
                <ArrowLeft size={12} />
                <span>Document Review Workspace</span>
              </Link>
              <span>→</span>
              <span className="text-indigo-600 font-bold">Document Processing</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Document Processing Session
              <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded font-bold flex items-center gap-1">
                <CheckCircle2 size={12} />
                {session?.status || 'Ready for OCR'}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* ONE Button: Start OCR Requirement */}
            <button
              onClick={handleStartOCR}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition cursor-pointer"
            >
              <Cpu size={15} />
              <span>Start OCR</span>
            </button>
          </div>
        </header>

        {/* Processing Content Body */}
        <div className="p-8 space-y-6 max-w-6xl w-full mx-auto">
          {/* OCR Notice Banner */}
          {ocrNotice && (
            <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-mono font-bold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>{ocrNotice}</span>
              </div>
              <button onClick={() => setOcrNotice(null)} className="text-amber-700 hover:text-amber-950 text-xs px-2 py-1 bg-amber-100 rounded-lg">
                Dismiss
              </button>
            </div>
          )}

          {/* Session Overview Telemetry Card */}
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Intake Processing Session: {session?.sessionId || 'SESSION-ACTIVE'}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">Created {session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Just now'}</span>
                </div>
              </div>
              <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                {session?.status || 'Ready for OCR'}
              </span>
            </div>

            {/* Session Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase mb-1">Document Count:</span>
                <span className="font-bold text-white text-sm">{session?.documentCount || session?.documents?.length || 0} File(s)</span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase mb-1">Source Email:</span>
                <span className="font-bold text-indigo-300 truncate block">{session?.sourceEmail || 'doctor@gmail.com'}</span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase mb-1">Received Time:</span>
                <span className="font-bold text-slate-200 truncate block">{session?.receivedTime || 'N/A'}</span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase mb-1">Temporary Storage Path:</span>
                <span className="font-bold text-amber-300 truncate block">{session?.temporaryStoragePath || 'data/temp_attachments'}</span>
              </div>
            </div>
          </div>

          {/* Selected Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-2">
                <span>Selected Documents for Processing Queue</span>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded font-bold">
                  {session?.documents?.length || 0}
                </span>
              </h3>
            </div>

            {loading ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-xs font-mono text-slate-400 animate-pulse">
                Loading session documents...
              </div>
            ) : !session?.documents || session.documents.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-xs font-mono text-slate-500">
                No documents associated with this processing session.
              </div>
            ) : (
              <div className="space-y-6">
                {session.documents.map((doc: any, idx: number) => {
                  const fileUrl = `/api/integrations/gmail/file?file=${encodeURIComponent(doc.fileName)}`;

                  return (
                    <div key={doc.id || idx} className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                      {/* Document Card Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Paperclip size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900">{doc.fileName}</h4>
                              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                                {doc.fileType || 'PDF'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              Size: {doc.fileSize || '1.5 MB'} • Source: {doc.sourceEmail || session.sourceEmail}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            Ready for OCR ✓
                          </span>
                        </div>
                      </div>

                      {/* PDF / Image Preview Area (Reusing Existing Server Temp File) */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                        {doc.fileType === 'PDF' || doc.fileName?.toLowerCase().endsWith('.pdf') ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                              <span>PDF Document Preview (Exact Intake Temp File)</span>
                              <a href={fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                                Open Full Window ↗
                              </a>
                            </div>
                            <iframe
                              src={fileUrl}
                              className="w-full h-80 rounded-xl border border-slate-200 shadow-2xs bg-white"
                              title={doc.fileName}
                            />
                          </div>
                        ) : ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(doc.fileType?.toUpperCase()) ? (
                          <div className="space-y-2">
                            <div className="text-xs font-mono text-slate-500">Image Document Preview</div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-center">
                              <img src={fileUrl} alt={doc.fileName} className="max-h-80 object-contain mx-auto rounded-lg" />
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center space-y-2 bg-white rounded-xl border border-slate-200">
                            <p className="font-bold text-xs text-slate-800">{doc.fileName}</p>
                            <a href={fileUrl} download={doc.fileName} className="inline-block bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl">
                              Download Document
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* OCR Results Section (Rendered below document preview) */}
          <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xs">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    OCR Results
                    {ocrResult && (
                      <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                        {ocrResult.processingStatus}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Unedited raw text extracted from documents preserving page order. No AI cleaning applied.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Retry OCR, Copy Text, Download OCR Text (.txt), Continue to AI Extraction */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleStartOCR}
                  disabled={isOcrRunning}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-slate-200 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isOcrRunning ? 'animate-spin' : ''} />
                  <span>Retry OCR</span>
                </button>

                <button
                  onClick={handleCopyText}
                  disabled={!ocrResult}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-slate-200 cursor-pointer disabled:opacity-50"
                >
                  <Copy size={13} />
                  <span>{copyBadge ? 'Copied! ✓' : 'Copy Text'}</span>
                </button>

                <button
                  onClick={handleDownloadOcrText}
                  disabled={!ocrResult}
                  className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-indigo-200 cursor-pointer disabled:opacity-50"
                >
                  <Download size={13} />
                  <span>Download OCR Text (.txt)</span>
                </button>

                {/* Continue to AI Extraction - Remains disabled until OCR completes successfully */}
                <button
                  onClick={handleContinueToAiExtraction}
                  disabled={!ocrResult || isOcrRunning}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-emerald-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Continue to AI Extraction →</span>
                </button>
              </div>
            </div>

            {/* Error Display */}
            {ocrError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-mono font-semibold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600 shrink-0" />
                  <span>OCR Failed: {ocrError}</span>
                </div>
                <button onClick={handleStartOCR} className="text-red-700 hover:text-red-950 font-bold px-3 py-1 bg-red-100 rounded-lg text-xs">
                  Retry OCR
                </button>
              </div>
            )}

            {/* OCR Telemetry Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Processing Status:</span>
                <span className={`font-bold block ${ocrResult ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {isOcrRunning ? 'Processing OCR...' : ocrResult?.processingStatus || 'Awaiting OCR Run'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Pages Processed:</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {ocrResult ? `${ocrResult.pagesProcessed} Page(s)` : '-'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Character Count:</span>
                <span className="font-bold text-indigo-700 text-sm block">
                  {ocrResult ? `${ocrResult.characterCount.toLocaleString()} chars` : '-'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">OCR Confidence:</span>
                <span className="font-bold text-emerald-700 text-sm block">
                  {ocrResult ? ocrResult.confidence : '-'}
                </span>
              </div>
            </div>

            {/* Large Scrollable Text Area Displaying Exact Raw Extracted Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">Extracted Raw Text Output</span>
                <span>No AI Summarization • Raw OCR Streams</span>
              </div>

              <textarea
                readOnly
                value={
                  isOcrRunning
                    ? 'OCR Engine is processing documents...\nExtracting raw page characters preserving layout...'
                    : ocrResult?.rawText || 'Click "Start OCR" above to run raw text extraction across selected documents.'
                }
                rows={14}
                className="w-full bg-slate-900 text-emerald-400 font-mono text-xs p-5 rounded-2xl border border-slate-800 focus:outline-none leading-relaxed shadow-inner resize-y"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
