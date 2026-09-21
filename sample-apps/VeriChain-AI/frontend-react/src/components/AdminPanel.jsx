import React, { useState, useEffect } from 'react';
import { Users, ScrollText, UserCheck, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdminPanel({ user, token }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'audit'
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [promoteUsername, setPromoteUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchUsers = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch('/api/audit/users', { headers });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
        
        const nonAdmins = data.filter(u => u.role !== 'admin');
        if (nonAdmins.length > 0) {
          setPromoteUsername(nonAdmins[0].username);
        } else {
          setPromoteUsername('');
        }
      }
    } catch (err) {
      console.error('Failed to load user accounts:', err.message);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch('/api/audit', { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err.message);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      if (user.role === 'admin') {
        await Promise.all([fetchUsers(), fetchAuditTrail()]);
      }
      setLoading(false);
    };
    initData();
  }, [token, user.role]);

  const handlePromote = async (e) => {
    e.preventDefault();
    if (!promoteUsername) return;

    setActionFeedback(null);
    try {
      const response = await fetch(`/api/audit/users/${promoteUsername}/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setActionFeedback({ type: 'success', message: data.detail });
        await Promise.all([fetchUsers(), fetchAuditTrail()]);
      } else {
        throw new Error(data.detail || 'Promotion failed');
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  if (user.role !== 'admin') {
    return (
      <div className="bg-glassBg border border-rose-500/20 rounded-2xl p-12 text-center max-w-md mx-auto flex flex-col items-center">
        <AlertTriangle size={36} className="text-rose-500 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Access Forbidden</h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          Administrator privileges are required to view the promotions and logs dashboard.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-xs text-gray-500 animate-pulse py-10">Loading System Database...</div>;
  }

  const nonAdmins = usersList.filter(u => u.role !== 'admin');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="text-blue-500" size={30} />
          Admin Panel
        </h1>
        <p className="text-sm text-gray-400 mt-1">Manage system user privileges, view database activities, and audit session logs.</p>
      </div>

      {actionFeedback && (
        <div className={`p-4 rounded-xl border text-xs ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Tabs Menu headers */}
      <div className="flex border-b border-glassBorder/40">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all outline-none ${
            activeTab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Users size={14} />
          <span>User Accounts</span>
        </button>

        <button 
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all outline-none ${
            activeTab === 'audit' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <ScrollText size={14} />
          <span>Full Audit Trail</span>
        </button>
      </div>

      {/* Users Tab View */}
      {activeTab === 'users' && (
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white">Registered System Users</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-glassBorder/40 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-2">ID</th>
                  <th className="pb-3 px-2">Username</th>
                  <th className="pb-3 px-2">Email Address</th>
                  <th className="pb-3 px-2">Access Role</th>
                  <th className="pb-3 pl-2">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glassBorder/20 text-gray-300">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-gray-900/30 transition-colors">
                    <td className="py-3 pr-2 font-mono text-gray-500 text-[10px]">{u.id}</td>
                    <td className="py-3 px-2 font-bold text-blue-400">{u.username}</td>
                    <td className="py-3 px-2 text-gray-400">{u.email}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                        u.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 pl-2 text-gray-500 font-mono text-[10px]">
                      {new Date(u.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-glassBorder/40 pt-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Promote User to Administrator</h4>
            
            {nonAdmins.length > 0 ? (
              <form onSubmit={handlePromote} className="flex gap-4 items-end">
                <div className="flex-grow">
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1.5">Select Candidate</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    value={promoteUsername}
                    onChange={e => setPromoteUsername(e.target.value)}
                  >
                    {nonAdmins.map(u => (
                      <option key={u.id} value={u.username}>{u.username}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all duration-200 hover:scale-[1.01] flex items-center gap-2">
                  <UserCheck size={14} />
                  <span>Promote to Admin</span>
                </button>
              </form>
            ) : (
              <div className="text-xs text-emerald-400 bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-500/15 w-fit">
                ✓ All registered platform users are currently Administrators.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Tab View */}
      {activeTab === 'audit' && (
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white">Global Activity Log Trails</h3>
          
          {auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-glassBorder/40 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-2">Timestamp</th>
                    <th className="pb-3 px-2">User ID</th>
                    <th className="pb-3 px-2">Username</th>
                    <th className="pb-3 pl-2">Action Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glassBorder/20 text-gray-300">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="py-3 pr-2 text-gray-500 font-mono text-[10px] w-40">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-gray-500 font-mono w-24">{log.user_id || 'System'}</td>
                      <td className="py-3 px-2 font-bold text-blue-400 w-36">{log.username}</td>
                      <td className="py-3 pl-2 text-gray-300 font-medium">{log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center py-6">
              Activity log is empty.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
