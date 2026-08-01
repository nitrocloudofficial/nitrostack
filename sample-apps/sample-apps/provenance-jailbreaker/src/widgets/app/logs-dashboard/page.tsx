'use client';
import React, { useState, useEffect } from 'react';

export default function LogsDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [view, setView] = useState<'login' | 'register' | 'logs'>('login');
  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      setView('logs');
      fetchLogs(savedToken);
      fetchSettings();
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok && data.retentionDays) setRetentionDays(data.retentionDays);
    } catch (e) {}
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays })
      });
      if (res.ok) {
        alert('Settings saved successfully!');
        setIsSettingsOpen(false);
      } else {
        alert('Failed to save settings');
      }
    } catch (e) {
      alert('Error saving settings');
    }
  };

  const handleAuth = async (isLogin: boolean) => {
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (isLogin) {
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        setView('logs');
        fetchLogs(data.token);
      } else {
        alert('Registration successful! Please login.');
        setView('login');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchLogs = async (authToken: string) => {
    let res;
    try {
      res = await fetch(`/api/logs?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message);
      if (res?.status === 401) handleLogout();
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('auth_token');
    setView('login');
    setLogs([]);
  };

  if (view === 'login' || view === 'register') {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto', fontFamily: 'sans-serif', backgroundColor: '#0f172a', padding: '2rem', borderRadius: '12px', color: 'white' }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#38bdf8' }}>{view === 'login' ? 'Secure Log Access' : 'Create Account'}</h2>
        
        {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white' }}
          />
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white' }}
          />
        </div>
        
        <button 
          onClick={() => handleAuth(view === 'login')}
          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, marginBottom: '1rem' }}
        >
          {view === 'login' ? 'Login' : 'Sign Up'}
        </button>
        
        <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
          <button 
            onClick={() => { setError(''); setView(view === 'login' ? 'register' : 'login'); }}
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {view === 'login' ? 'Need an account? Sign up' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', fontFamily: 'sans-serif', backgroundColor: '#0f172a', padding: '2rem', borderRadius: '12px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: '#38bdf8' }}>Secure Audit Logs</h2>
        <div>
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', marginRight: '0.5rem' }}
          >
            Settings
          </button>
          <button 
            onClick={handleLogout}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Logout
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #334155' }}>
          <h3 style={{ marginTop: 0, color: 'white' }}>Settings</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>Auto-Delete Logs After (Days)</label>
            <input 
              type="number" 
              min="1"
              value={retentionDays} 
              onChange={(e) => setRetentionDays(parseInt(e.target.value) || 1)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
            />
          </div>
          <button 
            onClick={handleSaveSettings}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Save Settings
          </button>
        </div>
      )}

      {logs.length === 0 ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No logs found or unable to read log file.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '1rem' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                <span><strong>Sequence:</strong> {log.sequence}</span>
                <span>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
              {log.entry_type === 'SESSION_ANCHOR' ? (
                <div style={{ color: '#34d399' }}>🟢 New Session Started ({log.session_id})</div>
              ) : (
                <>
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong style={{ color: '#94a3b8' }}>Target Model:</strong> <code style={{ color: '#38bdf8', backgroundColor: '#0f172a', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{log.targetModel}</code>
                    </div>
                    <div style={{ backgroundColor: '#0f172a', padding: '0.75rem', borderRadius: '6px', marginTop: '0.5rem', border: '1px solid #334155' }}>
                      <strong style={{ color: '#94a3b8', display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Output / Evidence:</strong>
                      <span style={{ color: '#f8fafc', whiteSpace: 'pre-wrap' }}>{log.targetOutput}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {log.llmJudge && (
                      <div style={{ display: 'inline-block', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: log.llmJudge.verdict === 'benign' ? '#064e3b' : '#451a03', color: log.llmJudge.verdict === 'benign' ? '#34d399' : '#f97316' }}>
                        Judge: {log.llmJudge.verdict.toUpperCase()} ({(log.llmJudge.confidence * 100).toFixed(0)}%)
                      </div>
                    )}
                    {log.flaggedForHumanReview && (
                      <div style={{ display: 'inline-block', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444' }}>
                        ⚠️ FLAGGED FOR REVIEW
                      </div>
                    )}
                    <div style={{ display: 'inline-block', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: '#334155', color: '#94a3b8' }}>
                      Hash: {log.hashPreview} {log.hashChainValid && '✓'}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
