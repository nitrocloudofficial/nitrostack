'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { RightInfoPanel } from '../../components/RightInfoPanel';
import { FileText, Download, CheckCircle2, Printer, Share2, Award } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await fetch('/api/reports');
        const json = await res.json();
        if (json.success && json.data) {
          setReports(json.data);
          if (json.data.length > 0) {
            setSelectedReport(json.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load reports from backend API:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Clinical Reports & Document Center
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                Backend Data Active
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">View and export evidence-backed clinical reports</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert(selectedReport ? `Exporting PDF: ${selectedReport.title}` : 'No report selected')}
              disabled={!selectedReport}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-indigo-200 transition"
            >
              <Download size={16} />
              <span>Export Signed PDF</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
          {reports.length > 0 ? (
            <>
              {/* Document Selector */}
              <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 text-xs font-bold shadow-xs overflow-x-auto">
                {reports.map((rep) => (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`px-4 py-2 rounded-xl transition shrink-0 ${selectedReport?.id === rep.id ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    {rep.title} ({rep.reportType})
                  </button>
                ))}
              </div>

              {/* Document Preview Sheet */}
              {selectedReport && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-8 space-y-6 shadow-sm text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider font-mono">
                        {selectedReport.title}
                      </h2>
                      <p className="text-slate-500 text-xs">Report Type: {selectedReport.reportType} • Generated: {selectedReport.generatedAt}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-indigo-600 block">Status: {selectedReport.status}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Patient ID: {selectedReport.patientId}</span>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-200/80 font-mono whitespace-pre-wrap">
                    {selectedReport.content}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-16 border border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-white">
              <FileText size={36} className="mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-800">No reports generated</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Clinical reports, SOAP notes, and discharge summaries generated by the Supervisor Agent will be stored here.
              </p>
            </div>
          )}
        </div>
      </main>

      <RightInfoPanel activePatient={null} />
    </div>
  );
}
