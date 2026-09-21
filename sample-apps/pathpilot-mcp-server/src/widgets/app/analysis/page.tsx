'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@nitrostack/widgets';

type Status = 'Verified' | 'Partial' | 'Self-reported' | 'Missing';
type SkillName =
  | 'HTML'
  | 'CSS'
  | 'JavaScript'
  | 'TypeScript'
  | 'React'
  | 'Node.js'
  | 'Express'
  | 'REST API Integration'
  | 'Database'
  | 'Git'
  | 'Deployment';

interface EvidenceSource { provider: 'github' | 'linkedin'; field?: string; }
interface EvidenceItem {
  ruleId: string; provider: 'github' | 'linkedin'; pathOrField: string;
  excerpt?: string; confidence: number;
  kind: 'file-count' | 'manifest-dependency' | 'content-pattern' | 'commit' | 'declared-skill';
}
interface SkillRow {
  name: SkillName | string;
  status: Status;
  confidence: number;
  sources: EvidenceSource[];
  summary: string;
  evidence?: EvidenceItem[];
  inspected?: string[];
  nextEvidence?: string;
}
interface SummaryBlock {
  headline: string;
  topStrengths: string[];
  priorityGaps: string[];
  counts: { verified: number; partial: number; selfReported: number; missing: number };
  nSkills: number;
  profileLabel: string;
  repoLabel: string;
  repoEvidenceCount: number;
  liSkillCount: number;
}
interface RoadmapGroup {
  title: string;
  items: Array<{ title: string; skill: SkillName | string; rationale: string; priority: 'high' | 'normal' | 'medium' | 'low' }>;
}
interface RoadmapSignal {
  verified: string[]; selfReported: string[]; partial: string[]; missing: string[];
  priorityGap: SkillName | string | '';
  suggestedTask?: string;
  rationale?: string;
}
interface AnalyzeResponse {
  analysisId: string;
  dashboardId: string;
  requestId?: string;
  createdAt?: string;
  profile?: { connected: boolean; source: string; profileRef: string };
  repository?: { fullName: string; branch: string; commits?: number; readme?: string; fileCount?: number };
  skills: SkillRow[];
  skillOrder: SkillName[] | string[];
  evidenceCards: Array<{ skill: string; status: Status; headline: string; body: string; sources: EvidenceSource[]; recommendedAction?: string }>;
  summary: SummaryBlock;
  roadmap: { groups: RoadmapGroup[]; signal: RoadmapSignal };
  warnings: string[];
}

const DEFAULT_REST_ENDPOINT =
  (typeof window !== 'undefined' && (window as any).__PATHPILOT_REST__) ||
  process.env.NEXT_PUBLIC_PATHPILOT_REST ||
  '';

const STATUS_META: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  Verified: { label: 'Verified', color: '#065f46', bg: '#d1fae5', dot: '#10b981' },
  Partial: { label: 'Partial', color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  'Self-reported': { label: 'Self-reported', color: '#075985', bg: '#e0f2fe', dot: '#0ea5e9' },
  Missing: { label: 'Missing', color: '#7f1d1d', bg: '#fee2e2', dot: '#ef4444' },
};

function getErrorShape(message: string): AnalyzeResponse & { error?: { code: string; message: string; retryable: boolean } } {
  const now = Date.now().toString();
  return {
    analysisId: 'error_' + now,
    dashboardId: 'error_' + now,
    requestId: 'req_' + now,
    createdAt: new Date().toISOString(),
    skills: [],
    skillOrder: [],
    evidenceCards: [],
    summary: {
      headline: 'Analysis error',
      topStrengths: [],
      priorityGaps: [],
      counts: { verified: 0, partial: 0, selfReported: 0, missing: 0 },
      nSkills: 0,
      profileLabel: '',
      repoLabel: '',
      repoEvidenceCount: 0,
      liSkillCount: 0,
    },
    roadmap: {
      groups: [],
      signal: { verified: [], selfReported: [], partial: [], missing: [], priorityGap: '' },
    },
    warnings: [message],
    error: { code: 'PROVIDER_UNAVAILABLE', message, retryable: true },
  };
}

export default function AnalysisDashboard() {
  const theme = useTheme();
  const isDark = theme === 'dark';
  const [repo, setRepo] = useState<string>('');
  const [includeLinkedIn, setIncludeLinkedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [endpoint, setEndpoint] = useState<string>(DEFAULT_REST_ENDPOINT);
  const [endpointVisible, setEndpointVisible] = useState(false);
  const [flashDemo, setFlashDemo] = useState(true);

  const isErrorResult = !!result && result && (result as any).error && (!result.skills || result.skills.length === 0);

  const counts = useMemo(() => {
    const base: Record<string, number> = { Verified: 0, Partial: 0, 'Self-reported': 0, Missing: 0 };
    if (!result || !result.skills || result.skills.length === 0) {
      return {
        Verified: 0, Partial: 0, 'Self-reported': 0, Missing: 0,
        lowercase: { verified: 0, partial: 0, selfReported: 0, missing: 0 },
      };
    }
    for (const s of result.skills) {
      base[s.status] = (base[s.status] || 0) + 1;
    }
    const c = result.summary?.counts || { verified: 0, partial: 0, selfReported: 0, missing: 0 };
    return {
      Verified: base.Verified || c.verified || 0,
      Partial: base.Partial || c.partial || 0,
      'Self-reported': base['Self-reported'] || c.selfReported || 0,
      Missing: base.Missing || c.missing || 0,
      lowercase: c,
    };
  }, [result]);

  // ===== SAFE RESULT NORMALIZER =====
  // Guarantees every nested field (summary / roadmap / skills / evidenceCards /
  // skillOrder / warnings / repository / profile) is populated even if the
  // upstream API / inline pipeline / REST envelope returned a partial shape.
  // Prevents red "Unhandled Runtime Error" crashes like reading 'headline'
  // from undefined when result.summary was omitted.
  const safeResult = useMemo<{
    raw: AnalyzeResponse | null;
    skills: SkillRow[];
    skillOrder: string[];
    evidenceCards: AnalyzeResponse['evidenceCards'];
    warnings: string[];
    repository: AnalyzeResponse['repository'];
    profile: AnalyzeResponse['profile'];
    summary: SummaryBlock;
    roadmap: { groups: RoadmapGroup[]; signal: RoadmapSignal };
    counts: typeof counts;
    isError: boolean;
  }>(() => {
    const raw = result;
    const skills: SkillRow[] = Array.isArray(raw?.skills) ? (raw!.skills as SkillRow[]) : [];
    const verified = skills.filter(s => s.status === 'Verified').map(s => s.name);
    const partial = skills.filter(s => s.status === 'Partial').map(s => s.name);
    const selfReported = skills.filter(s => s.status === 'Self-reported').map(s => s.name);
    const missing = skills.filter(s => s.status === 'Missing').map(s => s.name);
    const topStrengths = (() => {
      const fromPayload = raw?.summary?.topStrengths;
      if (Array.isArray(fromPayload) && fromPayload.length > 0) return fromPayload.slice(0, 3) as string[];
      const pool = [...verified, ...selfReported].filter(Boolean);
      const dedup = Array.from(new Set(pool));
      return dedup.sort((a, b) => {
        const aC = skills.find(s => s.name === a)?.confidence || 0;
        const bC = skills.find(s => s.name === b)?.confidence || 0;
        return bC - aC;
      }).slice(0, 3);
    })();
    const priorityGaps = (() => {
      const fromPayload = raw?.summary?.priorityGaps;
      if (Array.isArray(fromPayload) && fromPayload.length > 0) return fromPayload.slice(0, 3) as string[];
      const pool = [...missing, ...partial].filter(Boolean);
      const ORDER = ['Node.js', 'Express', 'Database', 'REST API Integration', 'Deployment', 'TypeScript', 'React', 'Git', 'JavaScript', 'CSS', 'HTML'];
      return Array.from(new Set(pool)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).slice(0, 3);
    })();
    const headline = (() => {
      if (raw?.summary?.headline && typeof raw.summary.headline === 'string' && raw.summary.headline.trim().length > 0) return raw.summary.headline;
      const total = skills.length || 11;
      const signal = verified.length + selfReported.length;
      const pct = Math.max(0, Math.min(100, Math.round((signal / total) * 100)));
      const lead = topStrengths[0] || 'No signals yet';
      const next = priorityGaps[0];
      return `${pct}% pathway signal coverage — ${lead} leading,${next ? ` close ${next} next.` : ' no active gaps.'}`;
    })();
    const signal: RoadmapSignal = (() => {
      const base = (raw as any)?.roadmap?.signal || (raw as any)?.roadmapSignal || {};
      return {
        verified: Array.isArray(base.verified) ? (base.verified as string[]) : verified,
        selfReported: Array.isArray(base.selfReported) ? (base.selfReported as string[]) : selfReported,
        partial: Array.isArray(base.partial) ? (base.partial as string[]) : partial,
        missing: Array.isArray(base.missing) ? (base.missing as string[]) : missing,
        priorityGap: (base.priorityGap ?? priorityGaps[0] ?? '') as string,
        suggestedTask: base.suggestedTask,
        rationale: base.rationale,
      };
    })();
    const groups: RoadmapGroup[] = (() => {
      const fromRoadmap = (raw as any)?.roadmap?.groups;
      if (Array.isArray(fromRoadmap) && fromRoadmap.length > 0) return fromRoadmap.filter(Boolean) as RoadmapGroup[];
      const mk = (title: string, arr: string[], priorityBase: RoadmapGroup['items'][number]['priority'], rationale: string): RoadmapGroup | null => {
        if (!arr.length) return null;
        return {
          title,
          items: arr.map(skill => ({ title: skill, skill, rationale, priority: signal.priorityGap === skill ? 'high' : priorityBase })),
        };
      };
      return [
        mk('✅ Verified strengths', signal.verified, 'low', 'Verified skill — keep building depth.'),
        mk('📝 Self-reported (needs repo evidence)', signal.selfReported, 'medium', 'Declared on LinkedIn only — add repo evidence to verify.'),
        mk('🔶 Partial signals', signal.partial, 'medium', 'Evidence exists but below Verified threshold.'),
        mk('🚩 Priority gaps to close', signal.missing, 'normal', 'No qualifying evidence — build from scratch.'),
      ].filter(Boolean) as RoadmapGroup[];
    })();

    return {
      raw,
      skills,
      skillOrder: Array.isArray(raw?.skillOrder) ? (raw!.skillOrder as string[]) : [],
      evidenceCards: Array.isArray(raw?.evidenceCards) ? raw!.evidenceCards : [],
      warnings: Array.isArray(raw?.warnings) ? raw!.warnings : [],
      repository: raw?.repository,
      profile: raw?.profile,
      summary: {
        headline,
        topStrengths,
        priorityGaps,
        counts: {
          verified: counts.lowercase?.verified ?? (verified.length || 0),
          partial: counts.lowercase?.partial ?? (partial.length || 0),
          selfReported: counts.lowercase?.selfReported ?? (selfReported.length || 0),
          missing: counts.lowercase?.missing ?? (missing.length || 0),
        },
        nSkills: (raw?.summary?.nSkills as number | undefined) ?? skills.length,
        profileLabel: (raw?.summary?.profileLabel as string | undefined) ?? (raw?.profile?.profileRef) ?? '',
        repoLabel: (raw?.summary?.repoLabel as string | undefined) ?? (raw?.repository ? `github:${raw.repository.fullName} (${raw.repository.branch || 'default'})` : ''),
        repoEvidenceCount: Number(raw?.summary?.repoEvidenceCount || 0),
        liSkillCount: Number(raw?.summary?.liSkillCount || 0),
      },
      roadmap: { groups, signal },
      counts,
      isError: !!(raw && (raw as any).error),
    };
  }, [result, counts]);

  async function runAnalyze(forceDemo = false) {
    setLoading(true);
    setResult(null);
    try {
      const body: any = {
        includeLinkedIn,
        options: { includeReadme: true, maxFiles: 80, maxContentReads: 25, useDemoLinkedIn: true },
      };
      if (!forceDemo && repo.trim()) body.repo = repo.trim();
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/evidence/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const json: any = await res.json();
      if (json && typeof json === 'object' && !('skills' in json) && ('data' in json || 'status' in json)) {
        const env = json;
        if (env.status === 'error' || !env.data) {
          setResult(getErrorShape(env.error?.message || 'Upstream error'));
        } else {
          const d = env.data as any;
          setResult({
            analysisId: d.analysisId || `analysis_${Date.now()}`,
            dashboardId: d.dashboardId || d.analysisId || `dashboard_${Date.now()}`,
            requestId: env.requestId,
            createdAt: d.createdAt || new Date().toISOString(),
            profile: d.profile,
            repository: d.repository,
            skills: d.skills || [],
            skillOrder: d.skillOrder || d.analysisSkillOrder || [],
            evidenceCards: d.evidenceCards || [],
            summary: d.summary || {
              headline: d.roadmapSignal?.rationale || 'Analysis complete.',
              topStrengths: [],
              priorityGaps: d.roadmapSignal?.priorityGap ? [d.roadmapSignal.priorityGap] : [],
              counts: { verified: 0, partial: 0, selfReported: 0, missing: 0 },
              nSkills: (d.skills || []).length,
              profileLabel: d.profile?.profileRef || '',
              repoLabel: d.repository?.fullName || '',
              repoEvidenceCount: 0,
              liSkillCount: 0,
            },
            roadmap: {
              groups: d.roadmapGroups || [
                d.roadmapSignal?.verified?.length ? { title: '✅ Verified strengths', items: d.roadmapSignal.verified.map((v: string) => ({ title: `Strengthen ${v} further`, skill: v, rationale: 'Verified skill.', priority: 'low' as const })) } : null,
                d.roadmapSignal?.selfReported?.length ? { title: '📝 Self-reported (needs repo evidence)', items: d.roadmapSignal.selfReported.map((v: string) => ({ title: `Verify ${v} in repository`, skill: v, rationale: 'LinkedIn declared only.', priority: 'medium' as const })) } : null,
                d.roadmapSignal?.partial?.length ? { title: '🔶 Partial signals', items: d.roadmapSignal.partial.map((v: string) => ({ title: `Push ${v} to verified`, skill: v, rationale: 'Partial evidence.', priority: 'medium' as const })) } : null,
                d.roadmapSignal?.missing?.length ? { title: '🚩 Priority gaps to close', items: d.roadmapSignal.missing.map((v: string) => ({ title: `Build ${v} from scratch`, skill: v, rationale: d.roadmapSignal?.priorityGap === v ? 'Pathway order: recommended next skill.' : 'No qualifying evidence.', priority: (d.roadmapSignal?.priorityGap === v ? 'high' as const : 'normal' as const) })) } : null,
              ].filter(Boolean),
              signal: d.roadmapSignal || { verified: [], selfReported: [], partial: [], missing: [], priorityGap: '' },
            },
            warnings: Array.isArray(env.warnings) ? env.warnings : [],
          } as any);
        }
      } else {
        setResult(json as AnalyzeResponse);
      }
    } catch (err: any) {
      const message = `Could not reach analysis endpoint. Widget inline fallback is active — check console for details. (${err?.message || String(err)})`;
      setResult(getErrorShape(message));
    } finally {
      setLoading(false);
    }
  }

  const hasRunOnceRef = useRef(false);
  useEffect(() => {
    if (flashDemo && !hasRunOnceRef.current) {
      hasRunOnceRef.current = true;
      runAnalyze(true);
    } else if (flashDemo && hasRunOnceRef.current) {
      runAnalyze(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashDemo]);

  const bg = isDark ? '#0b1020' : '#f5f7fb';
  const cardBg = isDark ? '#121a33' : '#ffffff';
  const text = isDark ? '#e6edf7' : '#0f172a';
  const mute = isDark ? 'rgba(230,237,247,0.65)' : 'rgba(15,23,42,0.62)';
  const border = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.08)';
  const analysisId = safeResult.raw?.analysisId || '';

  const hasRealResult = !!(safeResult.raw && !safeResult.isError && safeResult.skills && safeResult.skills.length > 0);
  const hasWarnings = safeResult.warnings.length > 0;

  return (
    <>
      <style>{`
        html, body, body > div, body > div > div, [class*="WidgetLayout"], [class*="widget-layout"] {
          height: auto !important;
          min-height: 100vh !important;
          max-height: none !important;
          overflow: visible !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        * { box-sizing: border-box; }
      `}</style>
      <main
        style={{
          minHeight: '100vh',
          height: 'auto',
          background: bg,
          color: text,
          padding: '24px 20px 80px 20px',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          overflow: 'visible',
        }}
      >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700 }}>P</div>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, letterSpacing: -0.3 }}>PathPilot Evidence Dashboard</h1>
                <p style={{ margin: '4px 0 0 0', color: mute, fontSize: 13 }}>
                  GitHub + LinkedIn skill evidence fusion · full-stack-developer pathway
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setEndpointVisible((v) => !v)} style={pillBtn(isDark, false)}>
              🔌 REST Endpoint
            </button>
            <button
              onClick={() => {
                setFlashDemo(false);
                setTimeout(() => setFlashDemo(true), 10);
              }}
              style={pillBtn(isDark, true)}
            >
              ⚡ Demo (LinkedIn-only)
            </button>
          </div>
        </header>

        {endpointVisible && (
          <div style={{ padding: 12, borderRadius: 12, background: cardBg, border: `1px solid ${border}`, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: mute, fontSize: 13, flex: '0 0 auto' }}>REST API base URL:</span>
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              style={{
                flex: 1, minWidth: 200,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${border}`,
                background: isDark ? '#0b1228' : '#f8fafc',
                color: text,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 12, color: mute }}>
              Default: same-origin /api/* (leave blank for built-in widget proxy)
            </span>
          </div>
        )}

        <section
          style={{
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 18,
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.25)' : '0 6px 18px rgba(15,23,42,0.06)',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto auto', gap: 10, alignItems: 'end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, color: mute }}>GitHub repo (optional)</span>
              <input
                placeholder="owner/repo — e.g. vercel/next.js or https://github.com/facebook/react"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: isDark ? '#0b1228' : '#f8fafc',
                  color: text,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: `1px solid ${border}`, background: isDark ? '#0b1228' : '#f8fafc' }}>
              <input
                type="checkbox"
                checked={includeLinkedIn}
                onChange={(e) => setIncludeLinkedIn(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13 }}>Include LinkedIn (demo)</span>
            </label>
            <button
              disabled={loading}
              onClick={() => runAnalyze(false)}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Analyzing…' : '▶ Run Analysis'}
            </button>
            <button
              onClick={() => { setResult(null); }}
              style={pillBtn(isDark, false)}
            >
              Clear
            </button>
          </div>

          {hasRealResult && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: mute }}>
              {safeResult.repository && <Pill isDark={isDark}>Repo: <b style={{ color: text }}>{safeResult.repository.fullName}</b></Pill>}
              {safeResult.repository?.branch && <Pill isDark={isDark}>Branch: <b style={{ color: text }}>{safeResult.repository.branch}</b></Pill>}
              {safeResult.profile && <Pill isDark={isDark}>Profile: <b style={{ color: text }}>{safeResult.profile.profileRef}</b></Pill>}
              <Pill isDark={isDark}>analysisId: <code style={{ color: text }}>{analysisId}</code></Pill>
              {safeResult.summary.nSkills > 0 && <Pill isDark={isDark}>Skills: <b style={{ color: text }}>{safeResult.summary.nSkills}</b></Pill>}
            </div>
          )}
          {hasWarnings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {(() => {
                const infoMsgs: string[] = [];
                const warnMsgs: string[] = [];
                for (const w of safeResult.warnings) {
                  const wStr = String(w);
                  if (
                    /^\[info\]/i.test(wStr) ||
                    /demo/i.test(wStr) && /fallback|inline|linkedin-only/i.test(wStr) ||
                    /info|served from widget inline cache/i.test(wStr) ||
                    /rebuilt from analysis inline cache/i.test(wStr)
                  ) infoMsgs.push(wStr.replace(/^\[info\]\s*/i, ''));
                  else warnMsgs.push(wStr);
                }
                const boxes: Array<{ kind: 'info' | 'warn'; items: string[] }> = [];
                if (infoMsgs.length) boxes.push({ kind: 'info', items: infoMsgs });
                if (warnMsgs.length) boxes.push({ kind: 'warn', items: warnMsgs });
                return boxes.slice(0, 2).map((box, bi) => {
                  const isInfo = box.kind === 'info';
                  const accent = {
                    border: isInfo
                      ? (isDark ? 'rgba(14,165,233,0.45)' : 'rgba(14,165,233,0.4)')
                      : (isDark ? 'rgba(251,191,36,0.4)' : 'rgba(202,138,4,0.4)'),
                    bg: isInfo
                      ? (isDark ? 'rgba(14,165,233,0.10)' : 'rgba(14,165,233,0.08)')
                      : (isDark ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.1)'),
                    color: isInfo
                      ? (isDark ? '#bae6fd' : '#075985')
                      : (isDark ? '#fde68a' : '#92400e'),
                    label: isInfo ? 'ℹ Info' : '⚠ Warnings',
                  };
                  return (
                    <div key={bi} style={{ padding: 10, borderRadius: 10, border: `1px dashed ${accent.border}`, background: accent.bg }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: accent.color, marginBottom: 4 }}>{accent.label}</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: accent.color }}>
                        {box.items.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </section>

        {isErrorResult && (
          <section style={{ background: cardBg, border: `1px solid ${isDark ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 16, padding: 18, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_META.Missing.dot }} />
              <b style={{ color: STATUS_META.Missing.color }}>Error ({((result as any).error?.code) || 'UNAVAILABLE'})</b>
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>{((result as any).error?.message) || result.warnings?.[0] || 'Unknown error'}</p>
          </section>
        )}

        {hasRealResult && (
          <>
            <section
              style={{
                background: `linear-gradient(135deg, ${isDark ? '#1e1b4b' : '#eef2ff'} 0%, ${isDark ? '#083344' : '#ecfeff'} 100%)`,
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: 20,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
                <div style={{ flex: '0 0 auto', width: 44, height: 44, borderRadius: 12, background: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)', display: 'grid', placeItems: 'center', fontSize: 22 }}>📊</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: mute, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Executive Summary</div>
                  <div style={{ fontSize: 20, fontWeight: 700, margin: '2px 0 6px 0', color: text }}>
                    {safeResult.summary.headline}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 13 }}>
                    {safeResult.summary.topStrengths.length > 0 && (
                      <div>
                        <span style={{ color: mute }}>Top strengths: </span>
                        {(() => {
                          const statusBySkill: Record<string, Status> = {};
                          for (const s of safeResult.skills) statusBySkill[s.name] = s.status as Status;
                          return safeResult.summary.topStrengths.map((n, i) => {
                            const st = statusBySkill[n] || 'Self-reported';
                            return (
                              <span key={n} style={{ color: STATUS_META[st].color, fontWeight: 700 }}>
                                {i > 0 ? ', ' : ''}{n}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    )}
                    {safeResult.summary.priorityGaps.length > 0 && (
                      <div>
                        <span style={{ color: mute }}>Priority gaps: </span>
                        <b style={{ color: STATUS_META.Missing.color }}>{safeResult.summary.priorityGaps.join(', ')}</b>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 18 }}>
                <CountCard isDark={isDark} label="Verified" count={counts.Verified} accent={STATUS_META.Verified} />
                <CountCard isDark={isDark} label="Partial" count={counts.Partial} accent={STATUS_META.Partial} />
                <CountCard isDark={isDark} label="Self-reported" count={counts['Self-reported']} accent={STATUS_META['Self-reported']} />
                <CountCard isDark={isDark} label="Missing" count={counts.Missing} accent={STATUS_META.Missing} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: '0 0 auto', width: 44, height: 44, borderRadius: 12, background: STATUS_META.Missing.bg, display: 'grid', placeItems: 'center', fontSize: 22 }}>🎯</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: mute, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Priority Gap</div>
                  <div style={{ fontSize: 20, fontWeight: 700, margin: '2px 0 6px 0', color: text }}>
                    {safeResult.roadmap.signal.priorityGap || 'No active gaps'}
                  </div>
                  {safeResult.roadmap.signal.rationale && (
                    <p style={{ margin: 0, fontSize: 13, color: mute, lineHeight: 1.5 }}>{safeResult.roadmap.signal.rationale}</p>
                  )}
                  {safeResult.roadmap.signal.suggestedTask && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, border: `1px solid ${border}`, background: isDark ? '#0b1228' : '#ffffffcc', fontSize: 13 }}>
                      <b>🛠 Suggested next build:</b> {safeResult.roadmap.signal.suggestedTask}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18 }}>
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
                <h2 style={{ margin: '0 0 14px 0', fontSize: 16 }}>Skill Evidence Matrix</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {safeResult.skills.map((s, idx) => (
                    <SkillRowCard key={idx} row={s} isDark={isDark} index={idx + 1} />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
                  <h2 style={{ margin: '0 0 14px 0', fontSize: 16 }}>Roadmap Signal</h2>
                  {safeResult.roadmap.groups && safeResult.roadmap.groups.length > 0 ? (
                    <>
                      {safeResult.roadmap.groups.map((g, gi) => (
                        <RoadmapGroupBlock key={gi} group={g} isDark={isDark} />
                      ))}
                    </>
                  ) : (
                    <>
                      <SignalList title="✅ Verified" items={safeResult.roadmap.signal.verified || []} accent={STATUS_META.Verified} isDark={isDark} />
                      <SignalList title="📝 Self-reported" items={safeResult.roadmap.signal.selfReported || []} accent={STATUS_META['Self-reported']} isDark={isDark} />
                      <SignalList title="🔶 Partial" items={safeResult.roadmap.signal.partial || []} accent={STATUS_META.Partial} isDark={isDark} />
                      <SignalList title="🚩 Missing" items={safeResult.roadmap.signal.missing || []} accent={STATUS_META.Missing} isDark={isDark} />
                    </>
                  )}
                </div>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 18, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <b>Debug / API</b>
                    <code style={{ fontSize: 11, color: mute }}>analysisId: {analysisId}</code>
                  </div>
                  <div style={{ lineHeight: 1.8, color: mute }}>
                    <div>• Skills emitted: <code style={{ color: text }}>{safeResult.skills.length}</code></div>
                    <div>• POST <code style={{ color: text }}>{endpoint}/api/evidence/analyze</code></div>
                    <div>• GET <code style={{ color: text }}>{endpoint}/api/analyses/{analysisId}</code></div>
                    <div>• GET <code style={{ color: text }}>{endpoint}/api/dashboard/{safeResult.raw?.dashboardId || analysisId}</code></div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {!result && !loading && (
          <section style={{ background: cardBg, border: `1px dashed ${border}`, borderRadius: 16, padding: 24, textAlign: 'center', color: mute, fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🧪</div>
            Run the analysis above, or click <b style={{ color: text }}>⚡ Demo (LinkedIn-only)</b> to instantly load demo evidence.
          </section>
        )}
      </div>
    </main>
    </>
  );
}

function RoadmapGroupBlock({ group, isDark }: { group: RoadmapGroup; isDark: boolean }) {
  if (!group || !group.items || group.items.length === 0) return null;
  const border = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.08)';
  const mute = isDark ? 'rgba(230,237,247,0.65)' : 'rgba(15,23,42,0.62)';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{group.title}</span>
        <span style={{ fontSize: 11, marginLeft: 'auto', color: mute }}>{group.items.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {group.items.map((it, i) => {
          const isHigh = it.priority === 'high';
          return (
            <div key={i} style={{
              padding: '8px 10px',
              borderRadius: 10,
              border: `1px solid ${border}`,
              background: isHigh ? (isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)') : (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(15,23,42,0.01)'),
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                {isHigh && <span title="High priority" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: STATUS_META.Missing.bg, color: STATUS_META.Missing.color, fontWeight: 700 }}>HIGH</span>}
                <b style={{ fontSize: 13 }}>{it.title}</b>
              </div>
              <div style={{ fontSize: 12, color: mute }}>{it.rationale}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillRowCard({ row, isDark, index }: { row: SkillRow; isDark: boolean; index: number }) {
  const meta = STATUS_META[row.status];
  const border = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.08)';
  const text = isDark ? '#e6edf7' : '#0f172a';
  const mute = isDark ? 'rgba(230,237,247,0.65)' : 'rgba(15,23,42,0.62)';
  const evCount = (row.evidence && row.evidence.length) || 0;
  const confPct = Math.max(0, Math.min(100, (typeof row.confidence === 'number' ? row.confidence : 0)));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 160px 128px 1fr 110px',
        gap: 12,
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: 12,
        border: `1px solid ${border}`,
        background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(15,23,42,0.015)',
      }}
    >
      <div style={{ fontSize: 12, color: mute, textAlign: 'center' }}>{index.toString().padStart(2, '0')}</div>
      <div>
        <div style={{ fontWeight: 600, color: text, fontSize: 14 }}>{row.name}</div>
        <div style={{ fontSize: 10, color: mute, marginTop: 2 }}>
          {evCount > 0 && `${evCount} evidence item${evCount === 1 ? '' : 's'}`}
          {confPct > 0 && ` · conf ${confPct}%`}
        </div>
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          background: meta.bg,
          color: meta.color,
          fontSize: 12,
          fontWeight: 600,
          width: 'fit-content',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: meta.dot }} />
        {meta.label}
      </div>
      <div style={{ fontSize: 12, color: mute, lineHeight: 1.5 }}>
        {row.summary || '—'}
        {row.nextEvidence && row.status !== 'Verified' && (
          <div style={{ marginTop: 3, color: isDark ? '#a5b4fc' : '#4f46e5', fontWeight: 500 }}>
            → {row.nextEvidence}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {row.sources?.find((s) => s.provider === 'github') && (
          <span title="GitHub evidence" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)', color: STATUS_META.Verified.color }}>GH</span>
        )}
        {row.sources?.find((s) => s.provider === 'linkedin') && (
          <span title="LinkedIn declared" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: isDark ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.12)', color: STATUS_META['Self-reported'].color }}>LI</span>
        )}
      </div>
    </div>
  );
}

function SignalList({ title, items, accent, isDark }: { title: string; items: string[]; accent: any; isDark: boolean }) {
  const border = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.06)';
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: accent.dot }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 11, marginLeft: 'auto', color: isDark ? 'rgba(230,237,247,0.6)' : 'rgba(15,23,42,0.6)' }}>{items.length}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((n) => (
          <span key={n} style={{
            padding: '4px 10px',
            borderRadius: 8,
            border: `1px solid ${border}`,
            fontSize: 12,
            background: accent.bg,
            color: accent.color,
            fontWeight: 500,
          }}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function CountCard({ isDark, label, count, accent }: { isDark: boolean; label: string; count: number; accent: any }) {
  const border = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.06)';
  return (
    <div style={{
      borderRadius: 14,
      padding: 14,
      border: `1px solid ${border}`,
      background: isDark ? '#0b1228' : '#ffffff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: accent.dot }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? 'rgba(230,237,247,0.85)' : 'rgba(15,23,42,0.7)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: accent.color }}>{count}</div>
    </div>
  );
}

function Pill({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  const border = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.08)';
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: 999,
      border: `1px solid ${border}`,
      background: isDark ? '#0b1228' : '#f8fafc',
    }}>
      {children}
    </span>
  );
}

function pillBtn(isDark: boolean, primary: boolean) {
  const border = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.08)';
  return {
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: primary ? 700 : 500,
    border: `1px solid ${border}`,
    background: primary
      ? (isDark ? 'linear-gradient(135deg,#4f46e5,#0ea5e9)' : 'linear-gradient(135deg,#6366f1,#06b6d4)')
      : (isDark ? '#121a33' : '#ffffff'),
    color: primary ? 'white' : (isDark ? '#e6edf7' : '#0f172a'),
  } as const;
}
