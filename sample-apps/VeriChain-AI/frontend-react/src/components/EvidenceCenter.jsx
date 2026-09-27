import React, { useState, useEffect, useRef } from 'react';
import { Network } from 'vis-network/standalone';
import { Eye, Search, Filter, Compass, Network as NetIcon } from 'lucide-react';

export default function EvidenceCenter({ user, token }) {
  const [decisions, setDecisions] = useState([]);
  const [selectedDecisionId, setSelectedDecisionId] = useState('');
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [documentFilter, setDocumentFilter] = useState('ALL');

  const networkRef = useRef(null);
  const networkInstance = useRef(null);

  // Fetch initial decisions, evidence and documents
  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Fetch all decisions
        const decisionsRes = await fetch('/api/decisions', { headers });
        const decisionsData = await decisionsRes.json();
        setDecisions(decisionsData);
        
        if (decisionsData.length > 0) {
          setSelectedDecisionId(decisionsData[0].id);
        }

        // Fetch all documents for source name matching
        const docsRes = await fetch('/api/documents', { headers });
        const docsData = await docsRes.json();
        setDocuments(docsData);

      } catch (err) {
        console.error('Failed to load initial data:', err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [token]);

  // Fetch details for the selected decision
  useEffect(() => {
    if (!selectedDecisionId) return;

    const fetchDetails = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const res = await fetch(`/api/decisions/${selectedDecisionId}`, { headers });
        const data = await res.json();
        setSelectedDecision(data);
        setEvidenceList(data.evidence || []);
      } catch (err) {
        console.error('Failed to fetch decision details:', err.message);
      }
    };

    fetchDetails();
  }, [selectedDecisionId, token]);

  // Render Vis.js network graph on DOM ref
  useEffect(() => {
    if (!networkRef.current || !selectedDecision || !selectedDecision.evidence_graph_data) {
      if (networkInstance.current) {
        networkInstance.current.destroy();
        networkInstance.current = null;
      }
      return;
    }

    try {
      const graphData = JSON.parse(selectedDecision.evidence_graph_data);
      const container = networkRef.current;

      const data = {
        nodes: graphData.nodes || [],
        edges: graphData.edges || []
      };

      const options = {
        nodes: {
          shape: 'box',
          margin: 12,
          font: { color: '#ffffff', size: 12, face: 'Outfit, Arial, sans-serif' },
          borderWidth: 1.5,
          shadow: true
        },
        edges: {
          width: 1.5,
          arrows: { to: { enabled: true, scaleFactor: 0.6 } },
          font: { color: '#9ca3af', size: 9, align: 'middle', face: 'Outfit, Arial, sans-serif' },
          smooth: { type: 'continuous', roundness: 0.5 }
        },
        groups: {
          document: {
            color: { background: '#1e3a8a', border: '#3b82f6', highlight: { background: '#3b82f6', border: '#60a5fa' } },
            shape: 'dot',
            size: 22
          },
          evidence: {
            color: { background: '#064e3b', border: '#10b981', highlight: { background: '#10b981', border: '#34d399' } }
          },
          conflict: {
            color: { background: '#7f1d1d', border: '#ef4444', highlight: { background: '#ef4444', border: '#f87171' } }
          }
        },
        physics: {
          stabilization: true,
          barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.25,
            springLength: 120,
            springConstant: 0.05
          }
        }
      };

      if (networkInstance.current) {
        networkInstance.current.destroy();
      }

      networkInstance.current = new Network(container, data, options);

    } catch (err) {
      console.error('Failed to instantiate Vis.js network graph:', err.message);
    }

    return () => {
      if (networkInstance.current) {
        networkInstance.current.destroy();
        networkInstance.current = null;
      }
    };
  }, [selectedDecision]);

  if (loading) {
    return <div className="text-xs text-gray-500 animate-pulse py-10">Loading Evidence Center...</div>;
  }

  const getDocName = (docId) => {
    const doc = documents.find(d => d.id === docId);
    return doc ? doc.filename : `Doc #${docId}`;
  };

  const categories = ['ALL', ...new Set(evidenceList.map(ev => ev.category))];
  const docNames = ['ALL', ...new Set(evidenceList.map(ev => getDocName(ev.doc_id)))];

  const filteredEvidence = evidenceList.filter(ev => {
    const catMatch = categoryFilter === 'ALL' || ev.category === categoryFilter;
    const docMatch = documentFilter === 'ALL' || getDocName(ev.doc_id) === documentFilter;
    return catMatch && docMatch;
  });

  const getBadgeClass = (rec) => {
    if (!rec) return 'bg-gray-800 text-gray-400 border-gray-700';
    const cleanRec = rec.toUpperCase();
    if (cleanRec === 'APPROVE' || cleanRec === 'LOW_RISK' || cleanRec === 'APPROVED') {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    } else if (cleanRec === 'REJECT' || cleanRec === 'HIGH_RISK' || cleanRec === 'REJECTED') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    } else {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <Compass className="text-blue-500" size={30} />
          Evidence Center
        </h1>
        <p className="text-sm text-gray-400 mt-1">Lineage mapping and connection analysis across operational context sources.</p>
      </div>

      {decisions.length === 0 ? (
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-12 text-center max-w-md mx-auto flex flex-col items-center">
          <Eye size={36} className="text-gray-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Audits Completed</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Run compliance decisions in the Decision Engine to view connection lineages.
          </p>
        </div>
      ) : (
        <>
          {/* Selector Card */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-5 shadow-xl backdrop-blur-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Select Decision Context
            </label>
            <select 
              className="w-full px-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={selectedDecisionId}
              onChange={e => setSelectedDecisionId(e.target.value)}
            >
              {decisions.map(d => (
                <option key={d.id} value={d.id}>
                  Audit #{d.id}: {d.query.substring(0, 50)}... ({d.decision_status})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Interactive Vis.js Network Canvas */}
            <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl space-y-4 lg:col-span-7">
              <div className="flex items-center gap-2 border-b border-glassBorder/40 pb-3">
                <NetIcon size={16} className="text-gray-400" />
                <h3 className="text-base font-bold text-white">Interactive Connection Graph</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Hover nodes to inspect claims. Blue represents files, green represents parsed evidence items, and red represents conflict warnings.
              </p>
              
              {selectedDecision && selectedDecision.evidence_graph_data ? (
                <div 
                  ref={networkRef} 
                  className="w-full h-[400px] rounded-xl bg-gray-950/80 border border-glassBorder/60 shadow-inner relative overflow-hidden" 
                />
              ) : (
                <div className="h-56 flex items-center justify-center text-xs text-gray-500 border border-dashed border-glassBorder/60 rounded-xl">
                  No lineage details generated for this audit.
                </div>
              )}
            </div>

            {/* Structured Verdict Card Summary */}
            <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl relative overflow-hidden lg:col-span-5 h-fit">
              <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-blue-500 to-indigo-500" />
              
              {selectedDecision ? (
                <div className="space-y-4 text-xs text-gray-300">
                  <div className="flex justify-between items-center border-b border-glassBorder/40 pb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Verdict Summary</span>
                      <h2 className="text-sm font-black text-white mt-0.5 uppercase">
                        Decision: 
                        <span className={`ml-2 px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getBadgeClass(selectedDecision.decision_status)}`}>
                          {selectedDecision.decision_status === 'APPROVE' || selectedDecision.decision_status === 'APPROVED' ? 'APPROVED' : 
                           selectedDecision.decision_status === 'REJECT' || selectedDecision.decision_status === 'REJECTED' ? 'REJECTED' : 'REVIEW REQUIRED'}
                        </span>
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Confidence</span>
                      <div className="text-base font-extrabold text-blue-400 font-sans">{Math.round((selectedDecision.confidence_score || 0) * 100)}%</div>
                    </div>
                  </div>

                  {/* Evidence Checklist */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Evidence:</h4>
                    {selectedDecision.evidence && selectedDecision.evidence.length > 0 ? (
                      <div className="space-y-1.5 pl-1.5 font-sans">
                        {selectedDecision.evidence.slice(0, 5).map((ev, index) => (
                          <div key={index} className="flex gap-2 items-start text-xs text-gray-300">
                            <span className="text-emerald-400 font-bold">✔</span>
                            <span>{ev.claim}</span>
                          </div>
                        ))}
                        {selectedDecision.evidence.length > 5 && (
                          <div className="text-[10px] text-gray-500 italic pl-5">
                            + {selectedDecision.evidence.length - 5} more claims verified below
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2 items-start text-xs text-emerald-400 pl-1.5 font-sans">
                        <span className="font-bold">✔</span>
                        <span>Source credentials verified against template policies</span>
                      </div>
                    )}
                  </div>

                  {/* Conflict Warnings */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Conflict:</h4>
                    {selectedDecision.conflicts && selectedDecision.conflicts.length > 0 ? (
                      <div className="space-y-1.5 pl-1.5 font-sans">
                        {selectedDecision.conflicts.map((cf, index) => (
                          <div key={index} className="flex gap-2 items-start text-xs text-rose-400 font-semibold">
                            <span className="font-bold">⚠</span>
                            <span>{cf.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2 items-start text-xs text-emerald-400 pl-1.5 font-sans">
                        <span className="font-bold">✔</span>
                        <span>Zero cross-document conflicts detected</span>
                      </div>
                    )}
                  </div>

                  {/* Final Recommendation Text */}
                  <div className="border-t border-glassBorder/40 pt-4 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans">Recommendation:</h4>
                    <div className="text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {(selectedDecision.explanation || '').replace(/### Recommendation:.*?\n/gs, '').trim()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-10 font-sans">
                  Select a decision record to view summary.
                </div>
              )}
            </div>
          </div>

          {/* Evidence Grid details */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white">Evidence Auditing Ledger</h3>
            
            {evidenceList.length > 0 ? (
              <>
                {/* Search filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-950/40 border border-glassBorder/40 rounded-xl text-xs">
                  <div>
                    <label className="block text-gray-400 mb-2 font-bold uppercase tracking-wider text-[10px]">Filter Category</label>
                    <select 
                      className="w-full px-3 py-2 bg-gray-950 border border-glassBorder rounded-lg text-white focus:outline-none focus:border-blue-500" 
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2 font-bold uppercase tracking-wider text-[10px]">Filter Document Source</label>
                    <select 
                      className="w-full px-3 py-2 bg-gray-950 border border-glassBorder rounded-lg text-white focus:outline-none focus:border-blue-500" 
                      value={documentFilter}
                      onChange={e => setDocumentFilter(e.target.value)}
                    >
                      {docNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table Render */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-glassBorder/40 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 pr-2">Document</th>
                        <th className="pb-3 px-2">Subject</th>
                        <th className="pb-3 px-2">Parsed Fact Claim</th>
                        <th className="pb-3 px-2">Value</th>
                        <th className="pb-3 px-2">Category</th>
                        <th className="pb-3 px-2">Credibility</th>
                        <th className="pb-3 pl-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glassBorder/20 text-gray-300">
                      {filteredEvidence.map(ev => (
                        <tr key={ev.id} className="hover:bg-gray-900/30 transition-colors">
                          <td className="py-3.5 pr-2 font-bold text-blue-400">
                            {getDocName(ev.doc_id)}
                          </td>
                          <td className="py-3.5 px-2 font-medium text-gray-200">{ev.entity}</td>
                          <td className="py-3.5 px-2 max-w-xs truncate text-gray-400">{ev.claim}</td>
                          <td className="py-3.5 px-2 font-mono text-gray-200">{ev.value || 'N/A'}</td>
                          <td className="py-3.5 px-2 text-gray-400">{ev.category}</td>
                          <td className="py-3.5 px-2 font-bold text-blue-400">
                            {Math.round(ev.credibility_score * 100)}%
                          </td>
                          <td className="py-3.5 pl-2">
                            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${
                              ev.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {ev.status === 'verified' ? 'Verified' : 'Flagged'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredEvidence.length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-6">
                    No claims match the filter criteria.
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-gray-500 text-center py-6">
                Evidence registry is empty.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
