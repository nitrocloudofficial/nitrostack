import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Layers, Calendar, UserCheck, Play, Sparkles, CheckCircle, Clock } from 'lucide-react';

export default function TeamDashboard({ selectedStudentIds }) {
  const [compatibility, setCompatibility] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [roles, setRoles] = useState(null);
  const [taskPlan, setTaskPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runFullAnalysis();
  }, [selectedStudentIds]);

  const runFullAnalysis = async () => {
    setLoading(true);
    try {
      const ids = selectedStudentIds.length > 0 ? selectedStudentIds : [1, 2, 3, 4];

      // 1. Compatibility
      const compRes = await fetch('/api/teams/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: ids })
      });
      const compData = await compRes.json();
      setCompatibility(compData);

      // 2. Missing Skills Analysis
      const anaRes = await fetch('/api/teams/analyze', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: ids })
      });
      const anaData = await anaRes.json();
      setAnalysis(anaData);

      // 3. Assign Roles
      const roleRes = await fetch('/api/teams/assign-roles', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: ids })
      });
      const roleData = await roleRes.json();
      setRoles(roleData.assignments || {});

      // 4. Task Plan
      const planRes = await fetch('/api/teams/task-plan', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: ids })
      });
      const planData = await planRes.json();
      setTaskPlan(planData);

    } catch (err) {
      console.error('Error running team analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="gradient-text" style={{ fontSize: '1.6rem', fontWeight: 800 }}>Team Titan Workbench</h2>
            <span className="badge badge-emerald"><ShieldCheck size={14} /> Active Hackathon Team</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Evaluating {selectedStudentIds.length > 0 ? selectedStudentIds.length : 4} team members against project requirements
          </p>
        </div>

        <button className="btn btn-primary" onClick={runFullAnalysis} disabled={loading}>
          <Play size={16} />
          {loading ? 'Analyzing...' : 'Re-Run Compatibility Engine'}
        </button>
      </div>

      {/* Grid Row 1: Score Gauges & Skill Coverage */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Score Breakdown Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            Team Synergy Metrics
          </h3>

          {compatibility ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>Overall Compatibility</span>
                  <strong style={{ color: '#818cf8' }}>{compatibility.overall}%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${compatibility.overall}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>Skill Match (50% weight)</span>
                  <strong style={{ color: '#38bdf8' }}>{compatibility.skill_match}%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${compatibility.skill_match}%`, height: '100%', background: '#06b6d4' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>Availability Match (25% weight)</span>
                  <strong style={{ color: '#34d399' }}>{compatibility.availability_match}%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${compatibility.availability_match}%`, height: '100%', background: '#10b981' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>Interest Overlap (25% weight)</span>
                  <strong style={{ color: '#c084fc' }}>{compatibility.interest_match}%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${compatibility.interest_match}%`, height: '100%', background: '#a855f7' }} />
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Loading metrics...</p>
          )}
        </div>

        {/* Missing Skills Alert Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-cyan)" />
            Skill Gap & Role Analysis
          </h3>

          {analysis ? (
            <div>
              {analysis.missing_skills.length === 0 ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <CheckCircle size={18} /> Balanced Hackathon Team!
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Your team covers all required domains: Frontend, Backend, AI Logic, and DevOps.</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <AlertTriangle size={18} /> Missing Skill Areas
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Consider inviting candidates with: {analysis.missing_skills.join(', ')}</p>
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>ROLE ASSIGNMENTS (`assign_roles`)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {roles && Object.entries(roles).map(([roleName, studentName], idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600 }}>{roleName}</span>
                      <span className="badge badge-indigo" style={{ fontSize: '0.78rem' }}>{studentName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Analyzing team roles...</p>
          )}
        </div>

      </div>

      {/* 3-Day Hackathon Task Plan Roadmap */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="var(--accent-purple)" />
              48-Hour Hackathon Sprint Plan (`generate_task_plan`)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>Automated task breakdown across Day 1, Day 2, and Day 3</p>
          </div>
          <span className="badge badge-purple" style={{ padding: '6px 14px' }}>AI Generated Schedule</span>
        </div>

        {taskPlan ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Day 1 */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>Day 1: Setup & Contracts</h4>
                <span className="badge badge-cyan">Hours 0-16</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {taskPlan.day1.map(task => (
                  <div key={task.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: '3px solid #38bdf8' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{task.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Owner: {task.owner}</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{task.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Day 2 */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#c084fc' }}>Day 2: Integration & MCP</h4>
                <span className="badge badge-purple">Hours 16-34</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {taskPlan.day2.map(task => (
                  <div key={task.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: '3px solid #c084fc' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{task.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Owner: {task.owner}</span>
                      <span style={{ color: '#fcd34d', fontWeight: 600 }}>{task.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Day 3 */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399' }}>Day 3: Polish & Demo Prep</h4>
                <span className="badge badge-emerald">Hours 34-48</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {taskPlan.day3.map(task => (
                  <div key={task.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: '3px solid #34d399' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{task.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Owner: {task.owner}</span>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{task.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Generating task plan...</p>
        )}

      </div>

    </div>
  );
}
