'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

// ============================================================================
// Types
// ============================================================================

interface Paper {
  id: string;
  title: string;
  year: number | null;
  authors: string[];
  category: string;
  abstract_snippet: string;
  url: string;
  pdf_url: string;
  arxiv_id: string;
}

interface SearchResult {
  query: string;
  data_source: string;
  total_available: number;
  showing: number;
  papers: Paper[];
  domain_warning?: string;
}

// ============================================================================
// Widget Component
// ============================================================================

export default function PaperResultsWidget() {
  const { isReady, getToolOutput, theme } = useWidgetSDK();

  if (!isReady) {
    return (
      <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', fontSize: '13px' }}>
        ⏳ Connecting to ResearchRadar…
      </div>
    );
  }

  const data = getToolOutput<SearchResult>() ?? {
    query: '',
    data_source: 'arXiv',
    total_available: 0,
    showing: 0,
    papers: [],
  };

  const isDark = theme === 'dark';

  // Dynamic Theme Palette
  const colors = {
    bg: isDark ? 'transparent' : 'transparent',
    cardBg: isDark ? '#1e293b' : '#ffffff',
    cardBorder: isDark ? '#334155' : '#e2e8f0',
    titleText: isDark ? '#f8fafc' : '#0f172a',
    authorText: isDark ? '#94a3b8' : '#64748b',
    abstractText: isDark ? '#cbd5e1' : '#334155',
    headerTitle: isDark ? '#f8fafc' : '#0f172a',
    headerMeta: isDark ? '#94a3b8' : '#64748b',
    borderHeader: isDark ? '#334155' : '#e8edf5',
    badgeBg: isDark ? '#1e3a8a' : '#eff6ff',
    badgeText: isDark ? '#93c5fd' : '#1d4ed8',
    badgeBorder: isDark ? '#2563eb' : '#bfdbfe',
    categoryBg: isDark ? '#0f172a' : '#f1f5f9',
    categoryText: isDark ? '#38bdf8' : '#0284c7',
    categoryBorder: isDark ? '#0284c7' : '#bae6fd',
    btnAbstractBorder: isDark ? '#60a5fa' : '#2563eb',
    btnAbstractText: isDark ? '#60a5fa' : '#2563eb',
    btnPdfBg: isDark ? '#2563eb' : '#2563eb',
    btnPdfText: '#ffffff',
    footerText: isDark ? '#64748b' : '#94a3b8',
    footerBorder: isDark ? '#334155' : '#f1f5f9',
  };

  // ── Domain warning state ──────────────────────────────────────────────────
  if (data.domain_warning) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", padding: '14px' }}>
        <div
          style={{
            padding: '14px 16px',
            background: isDark
              ? 'linear-gradient(135deg, #451a03 0%, #78350f 100%)'
              : 'linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)',
            border: isDark ? '1px solid #b45309' : '1px solid #f0c040',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '8px',
          }}
        >
          <h3
            style={{
              color: isDark ? '#fef3c7' : '#92400e',
              margin: '0 0 6px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚠️ Domain Limitation / Warning
          </h3>
          <p
            style={{
              color: isDark ? '#fde68a' : '#78350f',
              margin: 0,
              fontSize: '12px',
              lineHeight: 1.6,
            }}
          >
            {data.domain_warning}
          </p>
        </div>
      </div>
    );
  }

  // ── No results ────────────────────────────────────────────────────────────
  if (!data.papers || data.papers.length === 0) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", padding: '14px' }}>
        <p style={{ color: colors.authorText, textAlign: 'center', padding: '24px 16px', fontSize: '13px' }}>
          No papers found. Try a different search query.
        </p>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", padding: '14px', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '14px',
          paddingBottom: '10px',
          borderBottom: `2px solid ${colors.borderHeader}`,
        }}
      >
        <div>
          <h2
            style={{
              margin: '0 0 3px',
              fontSize: '15px',
              fontWeight: 700,
              color: colors.headerTitle,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📚 ResearchRadar
          </h2>
          <p style={{ margin: 0, fontSize: '11px', color: colors.headerMeta }}>
            &ldquo;{data.query}&rdquo; — {data.total_available} paper
            {data.total_available !== 1 ? 's' : ''} found
          </p>
        </div>
        <span
          style={{
            fontSize: '10px',
            backgroundColor: colors.badgeBg,
            color: colors.badgeText,
            padding: '3px 10px',
            borderRadius: '20px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: `1px solid ${colors.badgeBorder}`,
          }}
        >
          {data.data_source}
        </span>
      </div>

      {/* Paper cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.papers.map((paper, idx) => (
          <div
            key={paper.id}
            style={{
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: '10px',
              padding: '14px 16px',
              backgroundColor: colors.cardBg,
              borderLeft: '4px solid #2563eb',
              boxShadow: isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            {/* Top row: index + category */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontSize: '11px', color: isDark ? '#60a5fa' : '#2563eb', fontWeight: 700 }}>
                #{idx + 1}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: colors.categoryBg,
                  color: colors.categoryText,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  border: `1px solid ${colors.categoryBorder}`,
                }}
              >
                {paper.category}
              </span>
            </div>

            {/* Title */}
            <h3
              style={{
                margin: '0 0 6px',
                fontSize: '14px',
                fontWeight: 600,
                color: colors.titleText,
                lineHeight: 1.45,
              }}
            >
              {paper.title}
            </h3>

            {/* Authors & year */}
            <p style={{ margin: '0 0 8px', fontSize: '11px', color: colors.authorText }}>
              {paper.authors.join(', ')}
              {paper.year ? ` (${paper.year})` : ''}
            </p>

            {/* Abstract snippet */}
            <p
              style={{
                margin: '0 0 12px',
                fontSize: '12px',
                color: colors.abstractText,
                lineHeight: 1.6,
              }}
            >
              {paper.abstract_snippet}
            </p>

            {/* Links */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '11px',
                  color: colors.btnAbstractText,
                  textDecoration: 'none',
                  padding: '4px 12px',
                  border: `1px solid ${colors.btnAbstractBorder}`,
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                }}
              >
                🔗 Abstract
              </a>
              <a
                href={paper.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '11px',
                  color: colors.btnPdfText,
                  textDecoration: 'none',
                  padding: '4px 12px',
                  backgroundColor: colors.btnPdfBg,
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                📄 PDF
              </a>
              <span style={{ fontSize: '11px', color: colors.authorText, fontFamily: 'monospace', marginLeft: 'auto' }}>
                arXiv:{paper.arxiv_id}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: '14px',
          fontSize: '11px',
          color: colors.footerText,
          textAlign: 'center',
          paddingTop: '10px',
          borderTop: `1px solid ${colors.footerBorder}`,
        }}
      >
        Showing {data.showing} of {data.total_available} results • Powered by arXiv API (free &amp; unlimited)
      </p>
    </div>
  );
}
