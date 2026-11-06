'use client';

import React, { useState, useEffect } from 'react';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

// Data types aligned with ReviewDossier schema
interface FileItem {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch_excerpt?: string | null;
  category: string;
  raw_url?: string | null;
}

interface SignalItem {
  severity: 'high' | 'medium' | 'low';
  code: string;
  title: string;
  file_path?: string;
  explanation: string;
  evidence_reference: string;
}

interface CheckItem {
  name: string;
  source: string;
  status: string;
  conclusion: string | null;
  details_url: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

interface RouteStep {
  step_number: number;
  title: string;
  target_paths: string[];
  what_to_look_for: string;
  evidence_source: string;
}

interface DossierData {
  pr: {
    owner: string;
    repo: string;
    number: number;
    title: string;
    description: string | null;
    author: string;
    author_avatar_url: string | null;
    state: 'open' | 'closed';
    is_draft: boolean;
    base_branch: string;
    head_branch: string;
    head_sha: string;
    created_at: string;
    updated_at: string;
    closed_at?: string | null;
    merged_at?: string | null;
    changed_files_count: number;
    additions: number;
    deletions: number;
    html_url: string;
  };
  change_intent: string;
  change_map_summary: {
    total_files: number;
    additions: number;
    deletions: number;
    category_counts: Record<string, number>;
  };
  review_signals: SignalItem[];
  verification: {
    head_sha: string;
    collected_at: string;
    summary: {
      total: number;
      passing: number;
      failing: number;
      pending: number;
      skipped: number;
      overall_status: 'passing' | 'failing' | 'pending' | 'mixed' | 'no_checks_found';
    };
    checks: CheckItem[];
    honest_assessment: string;
  };
  linked_context: {
    explicit_issue_references: Array<{
      reference: string;
      number: number;
      source: string;
      title?: string;
      state?: string;
      html_url?: string;
    }>;
    explicit_pr_references: Array<{
      reference: string;
      number: number;
      source: string;
      title?: string;
      state?: string;
      html_url?: string;
    }>;
    hypotheses: Array<{
      description: string;
      rationale: string;
    }>;
  };
  reviewer_route: RouteStep[];
  evidence_coverage: {
    pr_metadata_examined: boolean;
    files_examined: number;
    files_truncated: boolean;
    checks_retrieved: boolean;
    commits_examined: number;
    missing_or_unavailable: string[];
  };
  confidence_and_limits: {
    verified_facts: string[];
    heuristic_signals: string[];
    unverified_hypotheses: string[];
  };
}

// Fallback preview data for local testing or NitroStudio preview mode
const PREVIEW_FALLBACK_DATA: DossierData = {
  pr: {
    owner: 'ayushv7',
    repo: 'PRPilot',
    number: 1,
    title: 'feat: add evidence-driven pull request intelligence and review dossier',
    description: 'Implements the full MCP server, GitHub inspection tools, and Review Dossier visual widget.',
    author: 'ayushv7',
    author_avatar_url: 'https://avatars.githubusercontent.com/u/108343166?v=4',
    state: 'open',
    is_draft: false,
    base_branch: 'master',
    head_branch: 'feat/review-dossier',
    head_sha: '749ee62881a9ef3b8c19a9d7010f3bc30f9a2e1d',
    created_at: '2026-10-18T12:00:00.000Z',
    updated_at: '2026-10-18T12:05:00.000Z',
    changed_files_count: 8,
    additions: 450,
    deletions: 32,
    html_url: 'https://github.com/ayushv7/PRPilot/pull/1',
  },
  change_intent:
    'PR introduces changes across 4 logic file(s), 2 test file(s), and 2 config file(s) (+450/-32) targeting \'master\' from \'feat/review-dossier\'. Focuses on security boundary validation and CI status mapping.',
  change_map_summary: {
    total_files: 8,
    additions: 450,
    deletions: 32,
    category_counts: {
      application_logic: 4,
      tests: 2,
      config_dependencies: 2,
      documentation: 0,
      other: 0,
    },
  },
  review_signals: [
    {
      severity: 'high',
      code: 'SIG_AUTH_SECURITY',
      title: 'Authentication & Security Boundary Modified',
      file_path: 'src/modules/pull-request/github.service.ts',
      explanation: 'Changes touch credential handling and authorization headers. Review access control and token isolation.',
      evidence_reference: 'src/modules/pull-request/github.service.ts (+110/-12)',
    },
    {
      severity: 'medium',
      code: 'SIG_DEPENDENCY_CHANGE',
      title: 'Third-Party Dependency Manifest Changed',
      file_path: 'package.json',
      explanation: 'External package dependencies modified. Verify license compatibility and version pinning.',
      evidence_reference: 'package.json (+4/-1)',
    },
  ],
  verification: {
    head_sha: '749ee62881a9ef3b8c19a9d7010f3bc30f9a2e1d',
    collected_at: '2026-10-18T12:05:00.000Z',
    summary: {
      total: 3,
      passing: 3,
      failing: 0,
      pending: 0,
      skipped: 0,
      overall_status: 'passing',
    },
    checks: [
      {
        name: 'Unit Tests & Coverage',
        source: 'check_run',
        status: 'completed',
        conclusion: 'success',
        details_url: 'https://github.com/ayushv7/PRPilot/actions',
      },
      {
        name: 'TypeScript Compilation',
        source: 'check_run',
        status: 'completed',
        conclusion: 'success',
        details_url: 'https://github.com/ayushv7/PRPilot/actions',
      },
      {
        name: 'Widget Bundle Health',
        source: 'check_run',
        status: 'completed',
        conclusion: 'success',
        details_url: 'https://github.com/ayushv7/PRPilot/actions',
      },
    ],
    honest_assessment: 'All 3 retrieved CI check(s) passed on commit 749ee62.',
  },
  linked_context: {
    explicit_issue_references: [
      {
        reference: '#1',
        number: 1,
        source: 'description',
        title: 'Define MCP Pull Request Intelligence Architecture',
        state: 'open',
        html_url: 'https://github.com/ayushv7/PRPilot/issues/1',
      },
    ],
    explicit_pr_references: [],
    hypotheses: [
      {
        description: 'Pull request appears intended to satisfy initial MCP tool specification.',
        rationale: 'Derived from title and PR description correlation.',
      },
    ],
  },
  reviewer_route: [
    {
      step_number: 1,
      title: 'Inspect High-Risk Boundaries First',
      target_paths: ['src/modules/pull-request/github.service.ts'],
      what_to_look_for: 'Authentication & Security Boundary Modified: verify rate-limiting and authorization header handling.',
      evidence_source: 'src/modules/pull-request/github.service.ts (+110/-12)',
    },
    {
      step_number: 2,
      title: 'Review Core Application Logic',
      target_paths: ['src/modules/pull-request/pull-request.tools.ts', 'src/modules/pull-request/dossier.service.ts'],
      what_to_look_for: 'Check schema validation, input bounding, and deterministic dossier synthesis.',
      evidence_source: '4 application logic file(s) changed (+450/-32)',
    },
    {
      step_number: 3,
      title: 'Verify Test Coverage & Assertions',
      target_paths: ['tests/github.service.test.ts', 'tests/heuristics.test.ts'],
      what_to_look_for: 'Verify mocked tests cover 404, rate limits, truncated diffs, and missing checks.',
      evidence_source: '2 test file(s) modified or added',
    },
    {
      step_number: 4,
      title: 'Verify CI & Check Runs',
      target_paths: ['GitHub Actions / CI Logs'],
      what_to_look_for: 'Confirm all 3 checks passed on head commit 749ee62.',
      evidence_source: 'All 3 retrieved CI check(s) passed on commit 749ee62.',
    },
  ],
  evidence_coverage: {
    pr_metadata_examined: true,
    files_examined: 8,
    files_truncated: false,
    checks_retrieved: true,
    commits_examined: 3,
    missing_or_unavailable: [],
  },
  confidence_and_limits: {
    verified_facts: [
      'PR #1 by @ayushv7 is currently open.',
      'Head commit 749ee62 targets branch \'master\'.',
      'Examined 8 changed files (+450/-32).',
      'Retrieved 3 CI check(s) with status: passing.',
    ],
    heuristic_signals: [
      '[HIGH] Authentication & Security Boundary Modified: Changes touch credential handling.',
      '[MEDIUM] Third-Party Dependency Manifest Changed: External dependencies modified.',
    ],
    unverified_hypotheses: [
      'Pull request appears intended to satisfy initial MCP tool specification (Derived from correlation).',
    ],
  },
};

export default function ReviewDossierWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'route' | 'signals' | 'verification' | 'ledger'>('route');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    }
  }, []);

  // Pull actual data from tool execution or fall back to preview data
  const rawData = isReady ? getToolOutput<DossierData>() : null;
  const data = rawData && rawData.pr ? rawData : PREVIEW_FALLBACK_DATA;

  const isDark = theme !== 'light';

  // Palette: Restrained Charcoal / Graphite Editorial Design
  const colors = {
    bg: isDark ? '#0d1117' : '#f6f8fa',
    surface: isDark ? '#161b22' : '#ffffff',
    surfaceSubtle: isDark ? '#21262d' : '#f0f2f5',
    border: isDark ? '#30363d' : '#d0d7de',
    borderLight: isDark ? '#363d47' : '#e1e4e8',
    textPrimary: isDark ? '#f0f6fc' : '#1f2328',
    textSecondary: isDark ? '#8b949e' : '#656d76',
    textMuted: isDark ? '#6e7681' : '#8c959f',
    emerald: '#238636',
    emeraldBg: isDark ? 'rgba(35, 134, 54, 0.18)' : '#e6f7ec',
    emeraldText: isDark ? '#3fb950' : '#1a7f37',
    rose: '#da3633',
    roseBg: isDark ? 'rgba(218, 54, 51, 0.18)' : '#ffebe9',
    roseText: isDark ? '#f85149' : '#cf222e',
    amber: '#d29922',
    amberBg: isDark ? 'rgba(210, 153, 34, 0.18)' : '#fff8c5',
    amberText: isDark ? '#e3b341' : '#9a6700',
    blue: '#2f81f7',
    blueBg: isDark ? 'rgba(47, 129, 247, 0.15)' : '#ddf4ff',
    blueText: isDark ? '#58a6ff' : '#0969da',
    slate: isDark ? '#484f58' : '#8c959f',
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'passing':
      case 'success':
        return { text: colors.emeraldText, bg: colors.emeraldBg, border: colors.emerald };
      case 'failing':
      case 'failure':
        return { text: colors.roseText, bg: colors.roseBg, border: colors.rose };
      case 'pending':
        return { text: colors.amberText, bg: colors.amberBg, border: colors.amber };
      default:
        return { text: colors.textSecondary, bg: colors.surfaceSubtle, border: colors.border };
    }
  };

  return (
    <div
      suppressHydrationWarning
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        minHeight: '100vh',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px 28px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Banner: Dossier Stamp & Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: colors.surfaceSubtle,
                color: colors.textSecondary,
                border: `1px solid ${colors.border}`,
              }}
            >
              PRPilot Dossier
            </span>
            <span
              style={{
                fontSize: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                color: colors.textMuted,
              }}
            >
              {data.pr.owner}/{data.pr.repo}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
                backgroundColor: data.pr.state === 'open' ? colors.emeraldBg : colors.surfaceSubtle,
                color: data.pr.state === 'open' ? colors.emeraldText : colors.textSecondary,
                border: `1px solid ${data.pr.state === 'open' ? colors.emerald : colors.border}`,
              }}
            >
              {data.pr.state.toUpperCase()}{data.pr.is_draft ? ' · DRAFT' : ''}
            </span>
          </div>

          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: 1.3,
              margin: '0 0 6px 0',
              color: colors.textPrimary,
            }}
          >
            <span style={{ color: colors.textMuted, marginRight: '6px' }}>#{data.pr.number}</span>
            {data.pr.title}
          </h1>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '12px',
              color: colors.textSecondary,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            <span>
              Author: <strong style={{ color: colors.textPrimary }}>@{data.pr.author}</strong>
            </span>
            <span>
              Branch: <code style={{ color: colors.blueText }}>{data.pr.head_branch}</code> → <code style={{ color: colors.textPrimary }}>{data.pr.base_branch}</code>
            </span>
            <span>
              Commit: <code style={{ color: colors.textSecondary }}>{(data.pr?.head_sha || '').slice(0, 7) || 'unknown'}</code>
            </span>
          </div>
        </div>

        {/* Source Link */}
        <a
          href={data.pr.html_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: colors.blueText,
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            fontWeight: 600,
          }}
        >
          View on GitHub ↗
        </a>
      </div>

      {/* Change Intent & High-Level Scope Box */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: colors.textMuted,
            marginBottom: '6px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          Change Intent & Scope Summary
        </div>
        <p
          style={{
            fontSize: '13.5px',
            lineHeight: 1.55,
            color: colors.textPrimary,
            margin: '0 0 14px 0',
          }}
        >
          {data.change_intent}
        </p>

        {/* Stats Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>Changed Files</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary }}>
              {data.change_map_summary.total_files}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>Line Delta</div>
            <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              <span style={{ color: colors.emeraldText }}>+{data.change_map_summary.additions}</span>{' '}
              <span style={{ color: colors.roseText }}>-{data.change_map_summary.deletions}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>App Logic Files</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: colors.blueText }}>
              {data.change_map_summary.category_counts?.application_logic || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>Test Files</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: (data.change_map_summary.category_counts?.tests || 0) > 0 ? colors.emeraldText : colors.roseText }}>
              {data.change_map_summary.category_counts?.tests || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>Investigation Signals</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: data.review_signals.length > 0 ? colors.amberText : colors.emeraldText }}>
              {data.review_signals.length}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Evidence Bar */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${statusColor(data.verification.summary.overall_status).border}`,
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              backgroundColor: statusColor(data.verification.summary.overall_status).bg,
              color: statusColor(data.verification.summary.overall_status).text,
              border: `1px solid ${statusColor(data.verification.summary.overall_status).border}`,
            }}
          >
            CI: {data.verification.summary.overall_status.toUpperCase().replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: '13px', color: colors.textPrimary, fontWeight: 500 }}>
            {data.verification.honest_assessment}
          </span>
        </div>
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: colors.textMuted,
          }}
        >
          {data.verification.summary.passing} passing · {data.verification.summary.failing} failing · {data.verification.summary.pending} pending
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Review Dossier Sections"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: '10px',
          marginBottom: '20px',
        }}
      >
        {[
          { id: 'route', label: `Reviewer Route (${data.reviewer_route.length})` },
          { id: 'signals', label: `Investigation Signals (${data.review_signals.length})` },
          { id: 'verification', label: `CI & Checks (${data.verification.checks.length})` },
          { id: 'ledger', label: 'Evidence Ledger & Limits' },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              backgroundColor: activeTab === tab.id ? colors.surfaceSubtle : 'transparent',
              color: activeTab === tab.id ? colors.textPrimary : colors.textSecondary,
              border: activeTab === tab.id ? `1px solid ${colors.border}` : '1px solid transparent',
              borderBottom: activeTab === tab.id ? `2px solid ${colors.blueText}` : '1px solid transparent',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Reviewer Route */}
      {activeTab === 'route' && (
        <div
          id="panel-route"
          role="tabpanel"
          aria-labelledby="tab-route"
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {data.reviewer_route.map((step) => (
            <div
              key={step.step_number}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: colors.blueBg,
                    color: colors.blueText,
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                >
                  {step.step_number}
                </span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: colors.textPrimary }}>
                  {step.title}
                </h3>
              </div>

              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>
                {step.what_to_look_for}
              </p>

              {/* Target File Paths */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {step.target_paths.map((p, idx) => (
                  <code
                    key={idx}
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '11px',
                      backgroundColor: colors.surfaceSubtle,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                    }}
                  >
                    {p}
                  </code>
                ))}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  color: colors.textMuted,
                }}
              >
                Evidence source: {step.evidence_source}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Investigation Signals */}
      {activeTab === 'signals' && (
        <div
          id="panel-signals"
          role="tabpanel"
          aria-labelledby="tab-signals"
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {data.review_signals.length === 0 ? (
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                color: colors.textSecondary,
                fontSize: '13px',
              }}
            >
              No elevated investigation signals detected. Standard review guidelines apply.
            </div>
          ) : (
            data.review_signals.map((sig, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${sig.severity === 'high' ? colors.rose : colors.amber}`,
                  borderLeft: `4px solid ${sig.severity === 'high' ? colors.rose : colors.amber}`,
                  borderRadius: '8px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        backgroundColor: sig.severity === 'high' ? colors.roseBg : colors.amberBg,
                        color: sig.severity === 'high' ? colors.roseText : colors.amberText,
                      }}
                    >
                      {sig.severity.toUpperCase()} SIGNAL
                    </span>
                    <strong style={{ fontSize: '14px', color: colors.textPrimary }}>{sig.title}</strong>
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: colors.textMuted }}>
                    {sig.code}
                  </span>
                </div>

                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>
                  {sig.explanation}
                </p>

                {sig.file_path && (
                  <div style={{ marginBottom: '6px' }}>
                    <code
                      style={{
                        fontSize: '11px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        backgroundColor: colors.surfaceSubtle,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${colors.border}`,
                        color: colors.textPrimary,
                      }}
                    >
                      {sig.file_path}
                    </code>
                  </div>
                )}

                <div style={{ fontSize: '11px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: colors.textMuted }}>
                  Evidence: {sig.evidence_reference}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: CI & Checks */}
      {activeTab === 'verification' && (
        <div
          id="panel-verification"
          role="tabpanel"
          aria-labelledby="tab-verification"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {data.verification.checks.length === 0 ? (
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                color: colors.textSecondary,
                fontSize: '13px',
              }}
            >
              No CI checks reported by GitHub API for commit <code>{(data.verification?.head_sha || '').slice(0, 7) || 'unknown'}</code>.
            </div>
          ) : (
            data.verification.checks.map((chk, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor:
                        chk.conclusion === 'success'
                          ? colors.emerald
                          : chk.conclusion === 'failure'
                          ? colors.rose
                          : colors.amber,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>
                      {chk.name}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        color: colors.textMuted,
                      }}
                    >
                      Source: {chk.source} · Status: {chk.status} {chk.conclusion ? `(${chk.conclusion})` : ''}
                    </div>
                  </div>
                </div>

                {chk.details_url && (
                  <a
                    href={chk.details_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      color: colors.blueText,
                      textDecoration: 'none',
                    }}
                  >
                    Details ↗
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Evidence Ledger & Limits */}
      {activeTab === 'ledger' && (
        <div
          id="panel-ledger"
          role="tabpanel"
          aria-labelledby="tab-ledger"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}
        >
          {/* Verified Facts */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '16px 20px',
            }}
          >
            <h4
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: colors.emeraldText,
                margin: '0 0 10px 0',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              [VERIFIED] GitHub API Facts
            </h4>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', color: colors.textPrimary, lineHeight: 1.6 }}>
              {data.confidence_and_limits.verified_facts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>

          {/* Missing or Unavailable */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '16px 20px',
            }}
          >
            <h4
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: colors.amberText,
                margin: '0 0 10px 0',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              [BOUNDARIES] Missing Evidence & Limitations
            </h4>
            {data.evidence_coverage.missing_or_unavailable.length === 0 ? (
              <p style={{ margin: 0, fontSize: '12.5px', color: colors.textSecondary }}>
                Full evidence coverage retrieved without truncation.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', color: colors.textPrimary, lineHeight: 1.6 }}>
                {data.evidence_coverage.missing_or_unavailable.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Linked Issues */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '16px 20px',
            }}
          >
            <h4
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: colors.blueText,
                margin: '0 0 10px 0',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              [REFERENCES] Referenced Issues & PRs
            </h4>
            {data.linked_context.explicit_issue_references.length === 0 ? (
              <p style={{ margin: 0, fontSize: '12.5px', color: colors.textSecondary }}>
                No explicit issue references found in description or commit messages.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.linked_context.explicit_issue_references.map((iss, idx) => (
                  <div key={idx} style={{ fontSize: '12px' }}>
                    <a
                      href={iss.html_url || `https://github.com/${data.pr.owner}/${data.pr.repo}/issues/${iss.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: colors.blueText, textDecoration: 'none', fontWeight: 600 }}
                    >
                      {iss.reference}
                    </a>
                    {iss.title && <span style={{ color: colors.textSecondary, marginLeft: '6px' }}>— {iss.title}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Ledger Signature */}
      <div
        style={{
          marginTop: '28px',
          paddingTop: '16px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          color: colors.textMuted,
        }}
      >
        <span>PRPilot v1.0.0 · Powered by NitroStack MCP</span>
        <span suppressHydrationWarning>
          Assembled at {mounted && data.verification?.collected_at ? new Date(data.verification.collected_at).toLocaleTimeString() : '12:05:00 PM'}
        </span>
      </div>
    </div>
  );
}
