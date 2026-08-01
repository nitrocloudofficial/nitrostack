import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FileText, Award, AlertTriangle, Crosshair, BarChart3, Clock, ShieldCheck } from 'lucide-react';

export default function Dashboard({ user, token, onUnauthorized }) {
  const [documents, setDocuments] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };

        const [docsRes, decRes, confRes] = await Promise.all([
          fetch('/api/documents', { headers }),
          fetch('/api/decisions', { headers }),
          fetch('/api/conflicts', { headers })
        ]);

        if (docsRes.status === 401 || decRes.status === 401 || confRes.status === 401) {
          if (onUnauthorized) onUnauthorized();
          return;
        }

        const docsData = docsRes.ok ? await docsRes.json() : [];
        const decData = decRes.ok ? await decRes.json() : [];
        const confData = confRes.ok ? await confRes.json() : [];

        setDocuments(Array.isArray(docsData) ? docsData : []);
        setDecisions(Array.isArray(decData) ? decData : []);
        setConflicts(Array.isArray(confData) ? confData : []);

        if (user.role === 'admin') {
          const auditRes = await fetch('/api/audit', { headers });
          if (auditRes.status === 401) {
            if (onUnauthorized) onUnauthorized();
            return;
          }
          const auditData = auditRes.ok ? await auditRes.json() : [];
          setAuditLogs(Array.isArray(auditData) ? auditData.slice(0, 6) : []);
        } else {
          setAuditLogs([]);
        }

      } catch (err) {
        console.error('Failed to load dashboard data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, user.role, onUnauthorized]);

  if (loading) {
    return <div className="text-xs text-gray-500 animate-pulse py-10">Loading Dashboard Metrics...</div>;
  }

  const activeConflicts = conflicts.filter(c => c.status === 'detected').length;
  const avgConfidence = decisions.length > 0 
    ? decisions.reduce((acc, curr) => acc + curr.confidence_score, 0) / decisions.length
    : 0;

  // Group document categories for Recharts Pie Chart
  const docTypes = documents.map(d => d.file_type.toUpperCase().split('/')[1] || d.file_type.toUpperCase());
  const typeCounts = docTypes.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(typeCounts).map(type => ({
    name: type,
    value: typeCounts[type]
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const getBadgeClass = (status) => {
    if (status === 'APPROVE') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (status === 'REJECT') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <BarChart3 className="text-blue-500" size={30} />
          Evidence Dashboard
        </h1>
        <p className="text-sm text-gray-400 mt-1">Enterprise metrics overview for verified multi-agent intelligence.</p>
      </div>

      {/* Grid Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1 */}
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-5 shadow-lg backdrop-blur-xl flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>Staged Documents</span>
            <FileText size={16} className="text-blue-400" />
          </div>
          <h2 className="text-3xl font-black text-white mt-3">{documents.length}</h2>
          <span className="text-[10px] text-emerald-400 font-bold mt-1">✓ Live file context pool</span>
        </div>

        {/* Card 2 */}
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-5 shadow-lg backdrop-blur-xl flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>Audits Concluded</span>
            <Award size={16} className="text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black text-white mt-3">{decisions.length}</h2>
          <span className="text-[10px] text-blue-400 font-bold mt-1">🔄 LangGraph workflow cycles</span>
        </div>

        {/* Card 3 */}
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-5 shadow-lg backdrop-blur-xl flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>Flagged Conflicts</span>
            <AlertTriangle size={16} className={activeConflicts > 0 ? 'text-rose-400' : 'text-emerald-400'} />
          </div>
          <h2 className="text-3xl font-black text-white mt-3">{activeConflicts}</h2>
          <span className={`text-[10px] font-bold mt-1 ${activeConflicts > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {activeConflicts > 0 ? '⚠️ Contradictions detected' : '✓ Standard alignments'}
          </span>
        </div>

        {/* Card 4 */}
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-5 shadow-lg backdrop-blur-xl flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>Judge Confidence</span>
            <Crosshair size={16} className="text-indigo-400" />
          </div>
          <h2 className="text-3xl font-black text-white mt-3">{Math.round(avgConfidence * 100)}%</h2>
          <span className="text-[10px] text-indigo-400 font-bold mt-1">⚖️ Average vote confidence</span>
        </div>
      </div>

      {/* Grid Charts & Recent Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Category Breakdown (2/5 Cols) */}
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-white">Category Breakdown</h3>
          {chartData.length > 0 ? (
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#090D16', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', color: '#ffffff' }} />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-gray-500">
              No files currently indexed in context.
            </div>
          )}
        </div>

        {/* Recent Decisions (3/5 Cols) */}
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl lg:col-span-3 space-y-4">
          <h3 className="text-base font-bold text-white">Recent Decisions</h3>
          {decisions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-glassBorder/40 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-2">Date</th>
                    <th className="pb-3 px-2">Inquiry Query</th>
                    <th className="pb-3 px-2">Verdict</th>
                    <th className="pb-3 pl-2">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glassBorder/20 text-gray-300">
                  {decisions.slice(0, 4).map(dec => (
                    <tr key={dec.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="py-3 pr-2 font-mono text-[10px] text-gray-500">
                        {new Date(dec.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-2 max-w-[180px] truncate font-medium text-gray-200">
                        {dec.query}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getBadgeClass(dec.decision_status)}`}>
                          {dec.decision_status}
                        </span>
                      </td>
                      <td className="py-3 pl-2 font-extrabold text-blue-400">
                        {Math.round(dec.confidence_score * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-gray-500">
              No decisions triggered yet. Use the Decision Engine tab.
            </div>
          )}
        </div>
      </div>

      {/* Admin Audit Trail */}
      {user.role === 'admin' && (
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-glassBorder/40 pb-3">
            <Clock size={16} className="text-gray-400" />
            <h3 className="text-base font-bold text-white">System Audit Trail</h3>
          </div>
          {auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-glassBorder/40 text-gray-400 font-bold uppercase">
                    <th className="pb-3 pr-2">Timestamp</th>
                    <th className="pb-3 px-2">Administrator</th>
                    <th className="pb-3 pl-2">Logged Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glassBorder/20 text-gray-300">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="py-3 pr-2 text-gray-500 font-mono text-[10px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 font-bold text-blue-400">{log.username}</td>
                      <td className="py-3 pl-2 text-gray-300">{log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-gray-500 py-6 text-center">
              System log is currently empty.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
