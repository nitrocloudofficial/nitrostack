import React, { useState } from 'react';
import { Lock, User as UserIcon, ArrowLeft, Shield } from 'lucide-react';

export default function AuthScreen({ setToken, setUser, onBackToLanding }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed. Please check credentials.');
      }

      setToken(data.access_token);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-darkBg text-gray-100 font-sans relative">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

      {/* Floating Back Navigation */}
      <button 
        onClick={onBackToLanding}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors bg-gray-900/40 hover:bg-gray-900/80 px-4 py-2 rounded-xl border border-glassBorder backdrop-blur"
      >
        <ArrowLeft size={14} />
        <span>Back to Home</span>
      </button>

      {/* Header Info */}
      <div className="text-center mb-8 max-w-sm">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-3 rounded-2xl shadow-xl shadow-blue-500/15 w-fit mx-auto mb-5">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Access VeriChain Console</h1>
        <p className="text-sm text-gray-400">
          Verify operational documents and trace agent decisions automatically.
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-glassBg border border-glassBorder rounded-2xl p-8 w-full max-w-[400px] shadow-2xl backdrop-blur-xl">
        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center mb-5 flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Username
            </label>
            <div className="relative">
              <UserIcon size={16} className="text-gray-500 absolute left-3.5 top-3.5" />
              <input 
                type="text" 
                className="w-full pl-11 pr-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter username" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="text-gray-500 absolute left-3.5 top-3.5" />
              <input 
                type="password" 
                className="w-full pl-11 pr-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all duration-250 shadow-lg shadow-blue-600/20 hover:scale-[1.01]"
            disabled={loading}
          >
            {loading ? 'Authenticating Console...' : 'Access Dashboard'}
          </button>
        </form>

        <div className="border-t border-glassBorder/30 my-6" />
        
        <div className="text-center text-[11px] text-gray-400 bg-gray-950/50 p-3 rounded-xl border border-glassBorder/20">
          🔑 <b>Default Sandbox Credentials:</b><br />
          Username: <span className="text-blue-400 font-bold">admin</span> | Password: <span className="text-blue-400 font-bold">admin123</span>
        </div>
      </div>
    </div>
  );
}
