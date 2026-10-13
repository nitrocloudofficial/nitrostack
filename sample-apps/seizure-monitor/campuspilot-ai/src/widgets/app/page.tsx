'use client';

import { useState } from 'react';

const WIDGETS = [
  { id: 'study-coach',          label: '🧠 Smart Study Coach',   desc: 'Flagship feature — proactive daily plan' },
  { id: 'assignment-dashboard', label: '📋 Assignment Dashboard', desc: 'Pending tasks & deadlines' },
  { id: 'attendance-tracker',   label: '📊 Attendance Tracker',  desc: 'Per-subject attendance & bunk safety' },
  { id: 'timetable-view',       label: '📅 Timetable View',      desc: 'Today\'s class schedule' },
  { id: 'notes-viewer',         label: '📝 Smart Notes Viewer',  desc: 'Syllabus summaries & flashcards' },
  { id: 'quiz-view',            label: '❓ Quiz & Viva Generator', desc: 'Interactive questions & model answers' },
  { id: 'placement-view',       label: '💼 Placement Roadmap',   desc: 'Company-specific prep & DSA topics' },
];

export default function DemoPage() {
  const [active, setActive] = useState('study-coach');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#e8eaf6',
    }}>
      {/* Top bar */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{ fontSize: 28 }}>🎓</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CampusPilot AI
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
            Autonomous Academic Assistant · Widget Studio & Live Preview
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
          <span style={{ background: 'rgba(46,213,115,0.15)', color: '#2ed573', border: '1px solid rgba(46,213,115,0.3)', borderRadius: 20, padding: '4px 12px', fontWeight: 600 }}>
            ● MCP Server Ready
          </span>
          <span style={{ background: 'rgba(102,126,234,0.15)', color: '#667eea', border: '1px solid rgba(102,126,234,0.3)', borderRadius: 20, padding: '4px 12px', fontWeight: 600 }}>
            7 Interactive Widgets Active
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 69px)' }}>
        {/* Sidebar */}
        <div style={{
          width: 260,
          background: 'rgba(255,255,255,0.03)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.1em', padding: '0 8px', marginBottom: 4 }}>
            SELECT WIDGET TO TEST
          </div>
          {WIDGETS.map(w => (
            <button
              key={w.id}
              onClick={() => setActive(w.id)}
              style={{
                background: active === w.id
                  ? 'linear-gradient(135deg, rgba(102,126,234,0.25), rgba(118,75,162,0.25))'
                  : 'transparent',
                border: active === w.id
                  ? '1px solid rgba(102,126,234,0.5)'
                  : '1px solid transparent',
                borderRadius: 10,
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                color: active === w.id ? '#e8eaf6' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{w.label}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{w.desc}</div>
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <div style={{
            background: 'rgba(102,126,234,0.1)',
            border: '1px solid rgba(102,126,234,0.2)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.6,
          }}>
            <div style={{ color: '#667eea', fontWeight: 700, marginBottom: 4 }}>💡 Dual Data Modes</div>
            <div style={{ marginBottom: 4 }}>• <strong>Browser Preview:</strong> Interactive fallback data</div>
            <div>• <strong>NitroStudio:</strong> Dynamic real-time response from MCP tools</div>
          </div>
        </div>

        {/* Main widget display */}
        <div style={{ flex: 1, padding: '24px 32px', display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
          {/* Main Stage Frame */}
          <div style={{
            width: '100%',
            maxWidth: 960,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                  http://localhost:3001/{active}
                </div>
              </div>
              <a
                href={`/${active}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: '#667eea', textDecoration: 'none', fontWeight: 600 }}
              >
                Open Fullscreen ↗
              </a>
            </div>
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
              <iframe
                key={active}
                src={`/${active}`}
                style={{ width: '100%', height: 680, border: 'none', borderRadius: 16 }}
                title={active}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
