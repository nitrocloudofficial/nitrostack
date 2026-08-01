'use client';

import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';

interface PlacementData {
  company: string;
  role: string;
  rounds: Array<{ round: string; focus: string; duration: string }>;
  dsaTopics: string[];
  systemDesignTopics: string[];
  hrTips: string[];
  recommendedResources: Array<{ name: string; type: string }>;
}

const DEMO_DATA: PlacementData = {
  company: 'Amazon',
  role: 'Software Development Engineer (SDE-1)',
  rounds: [
    { round: 'Online Assessment (OA)', focus: '2 Coding Questions (DSA) + Work Style Simulation (Leadership Principles)', duration: '90 min' },
    { round: 'Technical Round 1', focus: 'Data Structures & Algorithms (Trees, Graphs, Dynamic Programming) + 1 LP Question', duration: '60 min' },
    { round: 'Technical Round 2', focus: 'System Design / Object-Oriented Design (Low Level Design) + 2 LP Questions', duration: '60 min' },
    { round: 'Bar Raiser Round', focus: 'High level system architecture + Behavioral deep dive on Amazon Leadership Principles', duration: '60 min' },
  ],
  dsaTopics: ['Arrays & HashMaps', 'Trees & Binary Search Trees', 'Graphs (BFS/DFS, Dijkstra)', 'Dynamic Programming', 'Heap & Priority Queue'],
  systemDesignTopics: ['LRU Cache Design', 'Parking Lot OOD', 'Amazon Shopping Cart Design', 'Rate Limiter'],
  hrTips: [
    'Use the STAR method (Situation, Task, Action, Result) for all Leadership Principle answers.',
    'Focus heavily on "Customer Obsession" and "Bias for Action" principles.'
  ],
  recommendedResources: [
    { name: 'LeetCode Amazon Tagged 75', type: 'practice' },
    { name: 'NeetCode 150', type: 'roadmap' },
    { name: 'Striver\'s A2Z DSA Sheet', type: 'roadmap' }
  ]
};

export default function PlacementView() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const [activeTab, setActiveTab] = useWidgetState<'rounds' | 'topics' | 'tips'>('rounds');

  const data = getToolOutput<PlacementData>() ?? DEMO_DATA;

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f0f1a' : '#f8f9ff';
  const card = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)';
  const text = isDark ? '#e8eaf6' : '#1a1a2e';
  const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.5)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)';

  return (
    <div style={{ background: bg, borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", color: text }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #ff9900 0%, #ff5500 100%)', padding: '20px 24px 16px' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>💼 PLACEMENT PREPARATION ROADMAP</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{data.company}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>{data.role}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        {[
          { key: 'rounds', label: '🎯 Interview Rounds' },
          { key: 'topics', label: '🧠 Syllabus & Topics' },
          { key: 'tips', label: '💡 HR & Tips' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            style={{
              flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: 'none', color: activeTab === t.key ? '#ff9900' : muted,
              borderBottom: activeTab === t.key ? '2px solid #ff9900' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxHeight: 380, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Tab 1: Rounds */}
        {activeTab === 'rounds' && (
          <div>
            {(data.rounds || []).map((r, i) => (
              <div key={i} style={{ background: card, border: `1px solid ${border}`, borderLeft: '4px solid #ff9900', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#ff9900' }}>{r.round}</span>
                  <span style={{ fontSize: 10, background: 'rgba(255,153,0,0.15)', color: '#ff9900', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                    ⏱️ {r.duration}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{r.focus}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Topics */}
        {activeTab === 'topics' && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>HIGH YIELD DSA TOPICS</div>
            {(data.dsaTopics || []).map((topic, i) => (
              <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#ff9900', fontWeight: 800 }}>✓</span>
                <span>{topic}</span>
              </div>
            ))}

            {(data.systemDesignTopics || []).length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>SYSTEM DESIGN / OOD PROBLEMS</div>
                {data.systemDesignTopics.map((sd, i) => (
                  <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#ff5500', fontWeight: 800 }}>⚙️</span>
                    <span>{sd}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tips */}
        {activeTab === 'tips' && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>INTERVIEW TIPS & STRATEGY</div>
            {(data.hrTips || []).map((tip, i) => (
              <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 12, marginBottom: 8, fontSize: 12, color: text, lineHeight: 1.5 }}>
                💡 {tip}
              </div>
            ))}

            {(data.recommendedResources || []).length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>RECOMMENDED PRACTICE SHEETS</div>
                {data.recommendedResources.map((res, i) => (
                  <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📚 {res.name}</span>
                    <span style={{ fontSize: 10, color: '#ff9900', fontWeight: 700 }}>{res.type.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
        <span>🎓 CampusPilot Placement Portal</span>
        <button
          onClick={() => {
            if (typeof sendFollowUpMessage === 'function') {
              try { sendFollowUpMessage(`Give me top 10 DSA practice questions for ${data.company}`); } catch (err) { console.log(err); }
            }
          }}
          style={{ background: 'none', border: 'none', color: '#ff9900', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
        >
          Get 10 Practice Questions →
        </button>
      </div>
    </div>
  );
}
