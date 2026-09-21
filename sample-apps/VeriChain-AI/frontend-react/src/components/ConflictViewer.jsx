import React, { useState, useEffect } from 'react';
import { AlertTriangle, Filter, CheckCircle, ListFilter } from 'lucide-react';

export default function ConflictViewer({ user, token }) {
  const [conflicts, setConflicts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter hooks
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const [confRes, docsRes] = await Promise.all([
          fetch('/api/conflicts', { headers }),
          fetch('/api/documents', { headers })
        ]);

        const confData = await confRes.json();
        const docsData = await docsRes.json();

        setConflicts(confData);
        setDocuments(docsData);
      } catch (err) {
        console.error('Failed to load conflicts data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return <div className="text-xs text-gray-500 animate-pulse py-10">Loading Conflict Registry...</div>;
  }

  const getDocName = (docId) => {
    if (!docId) return 'System Policy';
    const doc = documents.find(d => d.id === docId);
    return doc ? doc.filename : `Doc #${docId}`;
  };

  const severityOptions = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
  const typeOptions = ['ALL', 'VERSION_MISMATCH', 'VALUE_DISCREPANCY', 'POLICY_VIOLATION', 'MISSING_APPROVAL'];

  const filteredConflicts = conflicts.filter(c => {
    const sevMatch = severityFilter === 'ALL' || c.severity.toUpperCase() === severityFilter;
    const typeMatch = typeFilter === 'ALL' || c.conflict_type.toUpperCase() === typeFilter;
    return sevMatch && typeMatch;
  });

  const getSeverityBadgeClass = (sev) => {
    const cleanSev = sev.toUpperCase();
    if (cleanSev === 'HIGH') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (cleanSev === 'MEDIUM') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <AlertTriangle className="text-blue-500" size={30} />
          Conflict Viewer
        </h1>
        <p className="text-sm text-gray-400 mt-1">Cross-check document contradictions and compliance alignment warnings.</p>
      </div>

      {conflicts.length === 0 ? (
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-12 text-center max-w-md mx-auto flex flex-col items-center">
          <CheckCircle size={36} className="text-emerald-400 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">All Systems Aligned</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Zero conflicts detected. All uploaded documents are currently aligned and compliant.
          </p>
        </div>
      ) : (
        <>
          {/* Filters Row */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-glassBorder/40 pb-3">
              <ListFilter size={16} className="text-gray-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Filters Constraints</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">Filter Severity</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value)}
                >
                  {severityOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">Filter Conflict Type</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                >
                  {typeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* List Card */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Detected Discrepancies</h3>
            
            {filteredConflicts.length > 0 ? (
              <div className="space-y-4">
                {filteredConflicts.map(c => {
                  const borderCol = c.severity.toUpperCase() === 'HIGH' ? 'border-l-rose-500' : (c.severity.toUpperCase() === 'MEDIUM' ? 'border-l-amber-500' : 'border-l-blue-500');
                  return (
                    <div 
                      key={c.id}
                      className={`border-l-4 ${borderCol} bg-gray-950/40 p-4 rounded-xl border border-glassBorder border-l-4 space-y-3 hover:border-glassBorder/70 transition-colors`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getSeverityBadgeClass(c.severity)}`}>
                          {c.conflict_type.toUpperCase().replace('_', ' ')} • {c.severity}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-200 leading-relaxed font-medium">
                        {c.description}
                      </p>

                      <div className="text-[11px] text-gray-400 pt-1 flex items-center gap-1">
                        <span className="font-bold">Lineage:</span>
                        <span className="text-blue-400 font-bold">{getDocName(c.doc_id_1)}</span>
                        <span className="text-gray-500 px-1">⇄</span>
                        <span className="text-blue-400 font-bold">{getDocName(c.doc_id_2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-10 border border-dashed border-glassBorder/60 rounded-xl">
                No conflicts match the filter criteria.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
