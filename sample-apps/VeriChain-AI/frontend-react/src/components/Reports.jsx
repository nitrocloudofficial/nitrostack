import React, { useState, useEffect } from 'react';
import { FileText, Code, Globe, Download, AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function Reports({ user, token }) {
  const [decisions, setDecisions] = useState([]);
  const [selectedDecisionId, setSelectedDecisionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null); // 'pdf', 'json', 'html' or null

  useEffect(() => {
    const fetchDecisions = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const res = await fetch('/api/decisions', { headers });
        const data = await res.json();
        setDecisions(data);
        if (data.length > 0) {
          setSelectedDecisionId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load decisions:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDecisions();
  }, [token]);

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const response = await fetch(`/api/reports/${selectedDecisionId}/${format}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate ${format.toUpperCase()} report.`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verichain_report_${selectedDecisionId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return <div className="text-xs text-gray-500 animate-pulse py-10">Loading Reports Hub...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <FileSpreadsheet className="text-blue-500" size={30} />
          Reports & Export
        </h1>
        <p className="text-sm text-gray-400 mt-1">Download official PDF evidence audits or export raw JSON decision payloads.</p>
      </div>

      {decisions.length === 0 ? (
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-12 text-center max-w-md mx-auto flex flex-col items-center">
          <AlertCircle size={36} className="text-gray-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Reports Compiled</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Run compliance audits in the Decision Engine to compile official reports.
          </p>
        </div>
      ) : (
        <>
          {/* Decision Context Select */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-5 shadow-xl backdrop-blur-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Select Decision Context for Export
            </label>
            <select 
              className="w-full px-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={selectedDecisionId}
              onChange={e => setSelectedDecisionId(e.target.value)}
              disabled={downloading !== null}
            >
              {decisions.map(d => (
                <option key={d.id} value={d.id}>
                  Audit #{d.id}: {d.query.substring(0, 60)}...
                </option>
              ))}
            </select>
          </div>

          {/* Three-Column Export Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PDF Exporter */}
            <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl flex flex-col justify-between items-center text-center min-h-[250px] hover:border-glassBorder/70 transition-colors">
              <div className="space-y-4">
                <div className="bg-red-500/10 p-3.5 rounded-2xl text-red-400 border border-red-500/20 w-fit mx-auto">
                  <FileText size={24} />
                </div>
                <h3 className="text-base font-bold text-white">PDF Document</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Official evidence audit document containing executive summaries, credibility matrices, and legal signoffs.
                </p>
              </div>

              <button 
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2"
                onClick={() => handleDownload('pdf')}
                disabled={downloading !== null}
              >
                <Download size={14} />
                <span>{downloading === 'pdf' ? 'Generating PDF...' : 'Download PDF Report'}</span>
              </button>
            </div>

            {/* JSON Exporter */}
            <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl flex flex-col justify-between items-center text-center min-h-[250px] hover:border-glassBorder/70 transition-colors">
              <div className="space-y-4">
                <div className="bg-blue-500/10 p-3.5 rounded-2xl text-blue-400 border border-blue-500/20 w-fit mx-auto">
                  <Code size={24} />
                </div>
                <h3 className="text-base font-bold text-white">JSON Payload</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Structured JSON dump of all claims, risk percentages, conflict details, and decision variables.
                </p>
              </div>

              <button 
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2"
                onClick={() => handleDownload('json')}
                disabled={downloading !== null}
              >
                <Download size={14} />
                <span>{downloading === 'json' ? 'Compiling JSON...' : 'Export JSON File'}</span>
              </button>
            </div>

            {/* HTML Exporter */}
            <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl flex flex-col justify-between items-center text-center min-h-[250px] hover:border-glassBorder/70 transition-colors">
              <div className="space-y-4">
                <div className="bg-emerald-500/10 p-3.5 rounded-2xl text-emerald-400 border border-emerald-500/20 w-fit mx-auto">
                  <Globe size={24} />
                </div>
                <h3 className="text-base font-bold text-white">HTML Layout</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Clean, print-friendly browser webpage rendering of decisions, risk logs, and verified claim tables.
                </p>
              </div>

              <button 
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2"
                onClick={() => handleDownload('html')}
                disabled={downloading !== null}
              >
                <Download size={14} />
                <span>{downloading === 'html' ? 'Building HTML...' : 'Export HTML Webpage'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
