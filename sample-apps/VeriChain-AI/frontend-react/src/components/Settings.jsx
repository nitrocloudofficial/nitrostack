import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export default function SettingsPage({ user, token }) {
  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState('');
  const [model, setModel] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [riskMultiplier, setRiskMultiplier] = useState(1.0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        setApiKey(data.openai_api_key || '');
        setApiBase(data.openai_api_base || 'https://api.openai.com/v1');
        setModel(data.openai_model || 'gpt-4o-mini');
        setConfidence(Math.round(parseFloat(data.confidence_threshold || '0.75') * 100));
        setRiskMultiplier(parseFloat(data.risk_multiplier || '1.0'));
      } catch (err) {
        console.error('Failed to load settings:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          openai_api_key: apiKey,
          openai_api_base: apiBase,
          openai_model: model,
          confidence_threshold: String(confidence / 100),
          risk_multiplier: String(riskMultiplier)
        })
      });

      if (response.ok) {
        setFeedback('System configurations successfully saved.');
      } else {
        const data = await response.json();
        throw new Error(data.detail || 'Save failed');
      }
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-gray-500 animate-pulse py-10">Loading System Settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <Settings className="text-blue-500" size={30} />
          System Settings
        </h1>
        <p className="text-sm text-gray-400 mt-1">Manage API integrations, LangGraph LLM thresholds, and audit parameters.</p>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LLM Card */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">LLM Configuration</h3>
              <p className="text-xs text-gray-500 mt-1">
                Route calls to OpenAI-compatible API providers. Leave key empty to use fallback heuristics.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  OpenAI API Key (Bearer Token)
                </label>
                <input 
                  type="password"
                  className="w-full px-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="sk-or-your-custom-token"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  API Base URL Endpoint
                </label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  value={apiBase}
                  onChange={e => setApiBase(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Target Model Name
                </label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-950/80 border border-glassBorder rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Logic Weights */}
          <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-5 h-fit">
            <div>
              <h3 className="text-base font-bold text-white">Risk & Logic Weights</h3>
              <p className="text-xs text-gray-500 mt-1">
                Fine-tune decision confidence thresholds and risk weights.
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="text-gray-400">Confidence Threshold</span>
                  <span className="text-blue-400">{confidence}%</span>
                </div>
                <input 
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={confidence}
                  onChange={e => setConfidence(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-950 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                  disabled={saving}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="text-gray-400">Financial Risk Sensitivity</span>
                  <span className="text-blue-400">{riskMultiplier.toFixed(1)}x</span>
                </div>
                <input 
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={riskMultiplier}
                  onChange={e => setRiskMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-950 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-lg shadow-blue-500/20 hover:scale-[1.01] flex items-center gap-2"
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'Saving changes...' : 'Save Settings Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
