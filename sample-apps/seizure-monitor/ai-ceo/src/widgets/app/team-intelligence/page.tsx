'use client';

import React, { useMemo, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { useTheme } from '@nitrostack/widgets';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface GitScores {
  work_importance: number;
  pr_involvement: number;
  comment_quality: number;
  activity: number;
  collaboration_health: number;
  git_score: number;
}

interface GitMember {
  name: string;
  git_scores: GitScores;
  git_behavior: string;
}

interface GitIntelligence {
  members: GitMember[];
}

interface MemberAnalysis {
  name: string;
  [key: string]: unknown;
}

interface MeetingIntelligence {
  overall_meeting_summary: string;
  meeting_topics: string[];
  dominant_speakers: string[];
  silent_speakers: string[];
  member_analysis: MemberAnalysis[];
}

interface FusionMember {
  name: string;
  merged_score: number;
  git_score: number;
  meeting_score: number;
  final_behavior: string;
}

interface FusionIntelligence {
  members: FusionMember[];
}

interface ToolOutput {
  source: string;
  git_intelligence: GitIntelligence;
  meeting_intelligence: MeetingIntelligence;
  fusion_intelligence: FusionIntelligence;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(n: number, min = 0, max = 100) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

function initials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function avgOf(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/* ------------------------------------------------------------------ */
/* Reusable UI primitives (inline styles only)                         */
/* ------------------------------------------------------------------ */

function ProgressBar({
  value,
  color,
  trackColor,
  height = 8,
}: {
  value: number;
  color: string;
  trackColor: string;
  height?: number;
}) {
  const v = clamp(value);
  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: height,
        background: trackColor,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${v}%`,
          height: '100%',
          borderRadius: height,
          background: color,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

function Avatar({
  name,
  size = 36,
  bg,
  fg,
}: {
  name: string;
  size?: number;
  bg: string;
  fg: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function Badge({
  text,
  bg,
  fg,
}: {
  text: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: fg,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page Component                                                 */
/* ------------------------------------------------------------------ */

export default function Page() {
  const sdk = useWidgetSDK();
  const theme = useTheme();

  const isDark = sdk?.isDarkMode ? sdk.isDarkMode() : theme === 'dark';

  const [data, setData] = useState<ToolOutput | null>(
    (sdk?.toolOutput as unknown as ToolOutput) ?? null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!sdk?.isReady);

  React.useEffect(() => {
    if (sdk?.toolOutput) {
      setData(sdk.toolOutput as unknown as ToolOutput);
    }
    setIsLoading(!sdk?.isReady);
  }, [sdk?.toolOutput, sdk?.isReady]);

  /* -------------------------------------------------------------- */
  /* Theme tokens                                                    */
  /* -------------------------------------------------------------- */

  const colors = useMemo(() => {
    return isDark
      ? {
          bg: '#0b0f17',
          surface: '#131926',
          surfaceAlt: '#1a2233',
          border: '#232c3d',
          textPrimary: '#f2f5fa',
          textSecondary: '#9aa7bd',
          textMuted: '#6b7688',
          accent: '#6c8bff',
          accent2: '#7ee0c3',
          accent3: '#ffb86b',
          danger: '#ff6b81',
          success: '#4ade80',
          warning: '#fbbf24',
          track: '#232c3d',
          shadow: '0 8px 24px rgba(0,0,0,0.35)',
          avatarBg: '#243050',
          avatarFg: '#a9bcff',
        }
      : {
          bg: '#f4f6fb',
          surface: '#ffffff',
          surfaceAlt: '#f8f9fd',
          border: '#e7eaf3',
          textPrimary: '#161b26',
          textSecondary: '#5b6478',
          textMuted: '#9aa3b8',
          accent: '#4f6bff',
          accent2: '#14b899',
          accent3: '#f5943a',
          danger: '#e0435f',
          success: '#22b06b',
          warning: '#d99a13',
          track: '#eceff5',
          shadow: '0 4px 18px rgba(20,30,60,0.06)',
          avatarBg: '#e8ecff',
          avatarFg: '#3b53d6',
        };
  }, [isDark]);

  const styles: { [k: string]: React.CSSProperties } = {
    page: {
      minHeight: '100vh',
      width: '100%',
      background: colors.bg,
      color: colors.textPrimary,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      padding: '20px',
      boxSizing: 'border-box',
    },
    container: {
      maxWidth: 1280,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    },
    headerRow: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    headerTitleWrap: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 800,
      margin: 0,
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      margin: 0,
    },
    sourceBadgeWrap: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    card: {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 18,
      boxShadow: colors.shadow,
      boxSizing: 'border-box',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: 700,
      margin: '0 0 12px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    grid4: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 16,
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: 16,
      alignItems: 'start',
    },
    kpiValue: {
      fontSize: 28,
      fontWeight: 800,
      margin: '4px 0 2px 0',
    },
    kpiLabel: {
      fontSize: 12,
      fontWeight: 600,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    tableRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: `1px solid ${colors.border}`,
    },
    tableRowLast: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
    },
    pillRow: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
    },
    smallMuted: {
      fontSize: 12,
      color: colors.textMuted,
    },
  };

  /* -------------------------------------------------------------- */
  /* Loading state                                                    */
  /* -------------------------------------------------------------- */

  if (isLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div
            style={{
              ...styles.card,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: 60,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: `4px solid ${colors.track}`,
                borderTopColor: colors.accent,
                animation: 'nitro-spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes nitro-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.textSecondary }}>
              Crunching git and meeting intelligence…
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Empty state                                                      */
  /* -------------------------------------------------------------- */

  const hasGit = !!data?.git_intelligence?.members?.length;
  const hasFusion = !!data?.fusion_intelligence?.members?.length;
  const hasMeeting = !!data?.meeting_intelligence;

  if (!data || (!hasGit && !hasFusion && !hasMeeting)) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div
            style={{
              ...styles.card,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: 60,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 34 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>No intelligence data yet</div>
            <div style={{ ...styles.smallMuted, maxWidth: 360 }}>
              Once git activity and meeting data are analyzed, your team dashboard
              will appear here.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const gitMembers = data.git_intelligence?.members ?? [];
  const meeting = data.meeting_intelligence;
  const fusionMembers = data.fusion_intelligence?.members ?? [];

  /* -------------------------------------------------------------- */
  /* Derived KPIs                                                     */
  /* -------------------------------------------------------------- */

  const avgGitScore = avgOf(gitMembers.map((m) => m.git_scores?.git_score ?? 0));
  const avgFusionScore = avgOf(fusionMembers.map((m) => m.merged_score ?? 0));
  const totalMembers = new Set([
    ...gitMembers.map((m) => m.name),
    ...fusionMembers.map((m) => m.name),
  ]).size;
  const topicsCount = meeting?.meeting_topics?.length ?? 0;

  const sortedGit = [...gitMembers].sort(
    (a, b) => (b.git_scores?.git_score ?? 0) - (a.git_scores?.git_score ?? 0)
  );
  const sortedFusion = [...fusionMembers].sort(
    (a, b) => (b.merged_score ?? 0) - (a.merged_score ?? 0)
  );
  const top10 = sortedFusion.slice(0, 10);

  const insights = buildInsights(data, colors);

  const scoreColor = (v: number) =>
    v >= 75 ? colors.success : v >= 45 ? colors.warning : colors.danger;

  /* -------------------------------------------------------------- */
  /* Render                                                           */
  /* -------------------------------------------------------------- */

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* 1. Header */}
        <div style={styles.headerRow}>
          <div style={styles.headerTitleWrap}>
            <h1 style={styles.headerTitle}>Team Intelligence Dashboard</h1>
            <p style={styles.headerSubtitle}>
              Merged git activity and meeting insight for your team
            </p>
          </div>
          <div style={styles.sourceBadgeWrap}>
            <Badge
              text={`Source: ${data.source || 'unknown'}`}
              bg={colors.surfaceAlt}
              fg={colors.textSecondary}
            />
            <Badge
              text={isDark ? 'Dark mode' : 'Light mode'}
              bg={colors.accent}
              fg="#ffffff"
            />
          </div>
        </div>

        {/* 2. KPI cards */}
        <div style={styles.grid4}>
          <div style={styles.card}>
            <div style={styles.kpiLabel}>Team Members</div>
            <div style={styles.kpiValue}>{totalMembers}</div>
            <ProgressBar value={Math.min(100, totalMembers * 10)} color={colors.accent} trackColor={colors.track} />
          </div>
          <div style={styles.card}>
            <div style={styles.kpiLabel}>Avg Git Score</div>
            <div style={{ ...styles.kpiValue, color: scoreColor(avgGitScore) }}>
              {avgGitScore.toFixed(1)}
            </div>
            <ProgressBar value={avgGitScore} color={scoreColor(avgGitScore)} trackColor={colors.track} />
          </div>
          <div style={styles.card}>
            <div style={styles.kpiLabel}>Avg Fusion Score</div>
            <div style={{ ...styles.kpiValue, color: scoreColor(avgFusionScore) }}>
              {avgFusionScore.toFixed(1)}
            </div>
            <ProgressBar value={avgFusionScore} color={scoreColor(avgFusionScore)} trackColor={colors.track} />
          </div>
          <div style={styles.card}>
            <div style={styles.kpiLabel}>Meeting Topics</div>
            <div style={styles.kpiValue}>{topicsCount}</div>
            <ProgressBar value={Math.min(100, topicsCount * 12)} color={colors.accent3} trackColor={colors.track} />
          </div>
        </div>

        <div style={styles.grid2}>
          {/* 3. Git Leaderboard */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>🧑‍💻 Git Leaderboard</h2>
            {sortedGit.length === 0 ? (
              <div style={styles.smallMuted}>No git activity recorded.</div>
            ) : (
              sortedGit.map((m, i) => {
                const s = m.git_scores?.git_score ?? 0;
                return (
                  <div
                    key={m.name + i}
                    style={i === sortedGit.length - 1 ? styles.tableRowLast : styles.tableRow}
                  >
                    <div style={{ width: 20, fontWeight: 700, color: colors.textMuted, fontSize: 13 }}>
                      {i + 1}
                    </div>
                    <Avatar name={m.name} bg={colors.avatarBg} fg={colors.avatarFg} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                        {m.name}
                      </div>
                      <ProgressBar value={s} color={scoreColor(s)} trackColor={colors.track} height={6} />
                    </div>
                    <div style={{ width: 44, textAlign: 'right', fontWeight: 700, color: scoreColor(s) }}>
                      {Math.round(s)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 7. Fusion Leaderboard */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>⚡ Fusion Leaderboard</h2>
            {sortedFusion.length === 0 ? (
              <div style={styles.smallMuted}>No fusion data available.</div>
            ) : (
              sortedFusion.map((m, i) => {
                const s = m.merged_score ?? 0;
                return (
                  <div
                    key={m.name + i}
                    style={i === sortedFusion.length - 1 ? styles.tableRowLast : styles.tableRow}
                  >
                    <div style={{ width: 20, fontWeight: 700, color: colors.textMuted, fontSize: 13 }}>
                      {i + 1}
                    </div>
                    <Avatar name={m.name} bg={colors.avatarBg} fg={colors.avatarFg} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>
                        {m.name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: colors.textMuted }}>
                          git {Math.round(m.git_score ?? 0)}
                        </span>
                        <span style={{ fontSize: 11, color: colors.textMuted }}>
                          meeting {Math.round(m.meeting_score ?? 0)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      text={m.final_behavior || '—'}
                      bg={colors.surfaceAlt}
                      fg={colors.textSecondary}
                    />
                    <div style={{ width: 44, textAlign: 'right', fontWeight: 700, color: scoreColor(s) }}>
                      {Math.round(s)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={styles.grid2}>
          {/* 4. Meeting Summary */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>🗒️ Meeting Summary</h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: colors.textSecondary, margin: 0 }}>
              {meeting?.overall_meeting_summary || 'No summary available.'}
            </p>
          </div>

          {/* 5. Meeting Topics */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>💬 Meeting Topics</h2>
            {meeting?.meeting_topics?.length ? (
              <div style={styles.pillRow}>
                {meeting.meeting_topics.map((t, i) => (
                  <Badge key={t + i} text={t} bg={colors.surfaceAlt} fg={colors.textPrimary} />
                ))}
              </div>
            ) : (
              <div style={styles.smallMuted}>No topics recorded.</div>
            )}
          </div>
        </div>

        {/* 6. Dominant / Silent Speakers */}
        <div style={styles.grid2}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>🔊 Dominant Speakers</h2>
            {meeting?.dominant_speakers?.length ? (
              <div style={styles.pillRow}>
                {meeting.dominant_speakers.map((s, i) => (
                  <div
                    key={s + i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px 6px 6px',
                      borderRadius: 999,
                      background: colors.surfaceAlt,
                    }}
                  >
                    <Avatar name={s} size={26} bg={colors.avatarBg} fg={colors.avatarFg} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.smallMuted}>No dominant speakers identified.</div>
            )}
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>🤫 Silent Speakers</h2>
            {meeting?.silent_speakers?.length ? (
              <div style={styles.pillRow}>
                {meeting.silent_speakers.map((s, i) => (
                  <div
                    key={s + i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px 6px 6px',
                      borderRadius: 999,
                      background: colors.surfaceAlt,
                    }}
                  >
                    <Avatar name={s} size={26} bg={colors.track} fg={colors.textMuted} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>
                      {s}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.smallMuted}>Everyone participated.</div>
            )}
          </div>
        </div>

        {/* 8. Top 10 Contributors */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>🏆 Top 10 Contributors</h2>
          {top10.length === 0 ? (
            <div style={styles.smallMuted}>Not enough data to rank contributors.</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {top10.map((m, i) => {
                const s = m.merged_score ?? 0;
                return (
                  <div
                    key={m.name + i}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      padding: 12,
                      background: colors.surfaceAlt,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={m.name} size={32} bg={colors.avatarBg} fg={colors.avatarFg} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          #{i + 1} {m.name}
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>
                          {m.final_behavior || '—'}
                        </div>
                      </div>
                    </div>
                    <ProgressBar value={s} color={scoreColor(s)} trackColor={colors.track} height={6} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor(s) }}>
                      {Math.round(s)} pts
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 9. AI Insight Cards */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>✨ AI Insights</h2>
          {insights.length === 0 ? (
            <div style={styles.smallMuted}>No insights generated yet.</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 12,
              }}
            >
              {insights.map((ins, i) => (
                <div
                  key={i}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderLeft: `4px solid ${ins.color}`,
                    borderRadius: 10,
                    padding: 12,
                    background: colors.surfaceAlt,
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                    {ins.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.5 }}>
                    {ins.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Git behavior breakdown w/ progress bars per member */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📈 Git Score Breakdown</h2>
          {sortedGit.length === 0 ? (
            <div style={styles.smallMuted}>No breakdown available.</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {sortedGit.map((m, i) => (
                <div
                  key={m.name + i}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: 14,
                    background: colors.surfaceAlt,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Avatar name={m.name} size={30} bg={colors.avatarBg} fg={colors.avatarFg} />
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.name}</div>
                  </div>
                  {(
                    [
                      ['Work importance', m.git_scores?.work_importance],
                      ['PR involvement', m.git_scores?.pr_involvement],
                      ['Comment quality', m.git_scores?.comment_quality],
                      ['Activity', m.git_scores?.activity],
                      ['Collaboration health', m.git_scores?.collaboration_health],
                    ] as [string, number][]
                  ).map(([label, val], idx) => (
                    <div key={idx} style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11.5,
                          color: colors.textSecondary,
                          marginBottom: 3,
                        }}
                      >
                        <span>{label}</span>
                        <span style={{ fontWeight: 700 }}>{Math.round(val ?? 0)}</span>
                      </div>
                      <ProgressBar
                        value={val ?? 0}
                        color={scoreColor(val ?? 0)}
                        trackColor={colors.track}
                        height={6}
                      />
                    </div>
                  ))}
                  {m.git_behavior && (
                    <div style={{ marginTop: 6 }}>
                      <Badge text={m.git_behavior} bg={colors.track} fg={colors.textSecondary} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insight generation (pure, derived from tool output)                 */
/* ------------------------------------------------------------------ */

function buildInsights(
  data: ToolOutput,
  colors: { success: string; warning: string; danger: string; accent: string }
): { title: string; body: string; color: string }[] {
  const out: { title: string; body: string; color: string }[] = [];
  const gitMembers = data.git_intelligence?.members ?? [];
  const fusionMembers = data.fusion_intelligence?.members ?? [];
  const meeting = data.meeting_intelligence;

  if (gitMembers.length) {
    const top = [...gitMembers].sort(
      (a, b) => (b.git_scores?.git_score ?? 0) - (a.git_scores?.git_score ?? 0)
    )[0];
    if (top) {
      out.push({
        title: 'Top git contributor',
        body: `${top.name} leads the team with a git score of ${Math.round(
          top.git_scores?.git_score ?? 0
        )}.`,
        color: colors.success,
      });
    }
    const low = [...gitMembers].sort(
      (a, b) => (a.git_scores?.git_score ?? 0) - (b.git_scores?.git_score ?? 0)
    )[0];
    if (low && (low.git_scores?.git_score ?? 0) < 40) {
      out.push({
        title: 'Needs attention',
        body: `${low.name} shows lower git activity (${Math.round(
          low.git_scores?.git_score ?? 0
        )}). Consider checking in.`,
        color: colors.danger,
      });
    }
  }

  if (meeting?.dominant_speakers?.length) {
    out.push({
      title: 'Meeting balance',
      body: `${meeting.dominant_speakers.join(', ')} dominated recent discussions${
        meeting.silent_speakers?.length
          ? `, while ${meeting.silent_speakers.join(', ')} stayed quiet.`
          : '.'
      }`,
      color: colors.warning,
    });
  }

  if (fusionMembers.length) {
    const bestFusion = [...fusionMembers].sort(
      (a, b) => (b.merged_score ?? 0) - (a.merged_score ?? 0)
    )[0];
    if (bestFusion) {
      out.push({
        title: 'Overall MVP',
        body: `${bestFusion.name} has the strongest combined git and meeting profile (${Math.round(
          bestFusion.merged_score ?? 0
        )}), showing "${bestFusion.final_behavior || 'consistent'}" behavior.`,
        color: colors.accent,
      });
    }
  }

  return out;
}
