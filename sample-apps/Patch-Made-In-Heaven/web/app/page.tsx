'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Terminal,
  Code2,
  AlertTriangle,
  RefreshCw,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  ChevronDown,
  Cpu,
  Database,
  Hash,
  Activity,
  Box,
} from 'lucide-react';

export interface KnowledgeCardView {
  id: string;
  problem: string;
  errorType: string;
  stacktrace: string;
  environment: {
    language: string;
    version?: string;
    framework?: string;
    packageVersions?: Record<string, string>;
  };
  patch: string;
  verification: {
    status: string;
    score: number;
    lastVerified: string;
    sandbox: string;
    exitCode: number;
    durationMs: number;
    stdout: string;
    stderr: string;
  };
  metrics: {
    reuseCount: number;
  };
  provenance?: {
    source: string;
    category: string;
    addedAt: string;
  };
}

import dynamic from 'next/dynamic';
import { ToolItem } from './components/DiamondGallery';

const DiamondGallery = dynamic(() => import('./components/DiamondGallery'), {
  ssr: false,
});
const HeroShader = dynamic(() => import('./components/HeroShader'), {
  ssr: false,
});

const MCP_URL = 'https://patch-made-in-works-on-my-machine-amrita-university-coimbatore.app.nitrocloud.ai/mcp';

const TOOLS: ToolItem[] = [
  {
    num: '01',
    name: 'search_fix',
    tag: 'SEARCH',
    desc: 'Finds verified patches and fixes matching a given stack trace or error log.',
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        stacktrace: {
          type: 'string',
          description: 'The error stacktrace or error message to search for.',
        },
        language: {
          type: 'string',
          description: 'Programming language environment (e.g. python, javascript, docker).',
        },
        framework: {
          type: 'string',
          description: 'Framework name if applicable (e.g. fastapi, express, react).',
        },
        packageVersions: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
          description: 'Key-value record of active package versions.',
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Maximum number of results to return.',
        },
      },
      required: ['stacktrace', 'language'],
      additionalProperties: false,
    },
  },
  {
    num: '02',
    name: 'find_similar',
    tag: 'VECTOR',
    desc: 'Performs semantic vector search across the knowledge store to find related engineering fixes.',
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Problem description or natural language query.',
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Maximum number of results to return.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    num: '03',
    name: 'get_patch',
    tag: 'PATCH',
    desc: 'Returns the raw unified git diff patch for a verified solution.',
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        knowledgeCardId: {
          type: 'string',
          description: 'Unique identifier of the verified knowledge card.',
        },
      },
      required: ['knowledgeCardId'],
      additionalProperties: false,
    },
  },
  {
    num: '04',
    name: 'get_execution_log',
    tag: 'LOGS',
    desc: 'Retrieves full stdout/stderr verification execution logs for a specific knowledge entry.',
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        knowledgeCardId: {
          type: 'string',
          description: 'Unique identifier of the verified knowledge card.',
        },
      },
      required: ['knowledgeCardId'],
      additionalProperties: false,
    },
  },
  {
    num: '05',
    name: 'verify_fix',
    tag: 'SANDBOX',
    desc: 'Executes a candidate fix inside an isolated sandbox against a real test command and persists the outcome.',
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The candidate fix source code to execute.',
        },
        testCommand: {
          type: 'string',
          description: 'The command to run verification (e.g. python main.py or node index.js).',
        },
        environment: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              minLength: 1,
            },
            version: {
              type: 'string',
              minLength: 1,
            },
            framework: {
              type: 'string',
              minLength: 1,
            },
            packageVersions: {
              type: 'object',
              additionalProperties: {
                type: 'string',
                minLength: 1,
              },
            },
          },
          required: ['language'],
          additionalProperties: false,
        },
        baselineCode: {
          type: 'string',
          description: 'The original/broken code before the fix, used to compute a real diff. Omit to diff against an empty file.',
        },
        filePath: {
          type: 'string',
          description: 'Logical file path used to label the generated unified diff.',
        },
      },
      required: ['code', 'testCommand', 'environment'],
      additionalProperties: false,
    },
  },
  {
    num: '06',
    name: 'submit_fix',
    tag: 'VERIFIED',
    desc: 'Publishes an execution-verified patch to the knowledge base, backed by a real PASS-status Verification Run.',
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        problemDescription: {
          type: 'string',
          minLength: 1,
          description: 'Clear summary of the error or problem solved.',
        },
        errorLog: {
          type: 'string',
          minLength: 1,
          description: 'The error stacktrace or log text that the fix resolves.',
        },
        patch: {
          type: 'string',
          minLength: 1,
          description: 'Unified git diff patch - must byte-for-byte match the diff a prior verify_fix call produced.',
        },
        verificationLog: {
          type: 'string',
          minLength: 1,
          description: 'The verificationRunId returned by the verify_fix call that proved this exact patch.',
        },
        environment: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              minLength: 1,
            },
            version: {
              type: 'string',
              minLength: 1,
            },
            framework: {
              type: 'string',
              minLength: 1,
            },
            packageVersions: {
              type: 'object',
              additionalProperties: {
                type: 'string',
                minLength: 1,
              },
            },
          },
          required: ['language'],
          additionalProperties: false,
        },
      },
      required: ['problemDescription', 'errorLog', 'patch', 'verificationLog', 'environment'],
      additionalProperties: false,
    },
  },
];

export default function Dashboard() {
  const [cards, setCards] = useState<KnowledgeCardView[]>([]);
  const [selectedCard, setSelectedCard] = useState<KnowledgeCardView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveElastic, setIsLiveElastic] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedErrorType, setSelectedErrorType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'diff' | 'logs' | 'trace'>('diff');
  const [copied, setCopied] = useState<boolean>(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);
  const [errorDropdownOpen, setErrorDropdownOpen] = useState<boolean>(false);

  const langRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const fetchCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message || 'Failed to fetch cards');
      setCards(data.cards || []);
      setIsLiveElastic(data.isLiveElastic ?? false);
      if (data.cards?.length > 0) {
        setSelectedCard((prev) =>
          prev ? data.cards.find((c: KnowledgeCardView) => c.id === prev.id) || data.cards[0] : data.cards[0]
        );
      } else {
        setSelectedCard(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCards(); }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) setLangDropdownOpen(false);
      if (errorRef.current && !errorRef.current.contains(event.target as Node)) setErrorDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => { if (c.environment?.language) set.add(c.environment.language); });
    return Array.from(set).sort();
  }, [cards]);

  const errorTypes = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => { if (c.errorType) set.add(c.errorType); });
    return Array.from(set).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch =
        !searchQuery ||
        card.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.errorType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.stacktrace.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLang = selectedLanguage === 'all' || card.environment?.language?.toLowerCase() === selectedLanguage.toLowerCase();
      const matchesError = selectedErrorType === 'all' || card.errorType?.toLowerCase() === selectedErrorType.toLowerCase();
      return matchesSearch && matchesLang && matchesError;
    });
  }, [cards, searchQuery, selectedLanguage, selectedErrorType]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFormattedDiff = (patch: string) => {
    if (!patch) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-low)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
        No patch available.
      </div>
    );
    const lines = patch.split('\n');
    return (
      <div className="diff-container" style={{ padding: '0.5rem 0' }}>
        {lines.map((line, i) => {
          let bg = 'transparent';
          let color = '#d4d4d8';
          let borderLeft = '3px solid transparent';
          let fontWeight = 400;

          if (line.startsWith('+') && !line.startsWith('+++')) {
            bg = 'rgba(16, 185, 129, 0.18)';
            color = '#34d399';
            borderLeft = '3px solid #10b981';
            fontWeight = 500;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bg = 'rgba(239, 68, 68, 0.18)';
            color = '#f87171';
            borderLeft = '3px solid #ef4444';
            fontWeight = 500;
          } else if (line.startsWith('@@')) {
            bg = 'rgba(245, 158, 11, 0.18)';
            color = '#fbbf24';
            borderLeft = '3px solid #f59e0b';
            fontWeight = 600;
          } else if (line.startsWith('diff') || line.startsWith('---') || line.startsWith('+++')) {
            color = '#a1a1aa';
            fontWeight = 600;
          }

          return (
            <div
              key={i}
              className="diff-line"
              style={{
                backgroundColor: bg,
                color,
                borderLeft,
                fontWeight,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78125rem',
                lineHeight: 1.65,
                padding: '0.125rem 1rem',
              }}
            >
              {line || ' '}
            </div>
          );
        })}
      </div>
    );
  };

  /* ── Shared input/button styles ── */
  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    backgroundColor: 'var(--surface-subtle)',
    border: '1px solid var(--border-muted)',
    color: 'var(--text-high)',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color 160ms ease',
  };

  const dropdownItemStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.8125rem',
    fontFamily: 'var(--font-body)',
    color: active ? 'var(--text-high)' : 'var(--text-medium)',
    backgroundColor: active ? 'var(--surface-hover)' : 'transparent',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 120ms ease',
  });

  /* ────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-high)' }}>

      {/* ══════════════════════════════════════════
          HERO — full viewport, only thing visible on load
      ══════════════════════════════════════════ */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cinematic WebGL Raymarching Volumetric Background */}
        <HeroShader />



        {/* Main hero content — Ultra-Minimalist Monolith */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            maxWidth: '960px',
            margin: '0 auto',
            width: '100%',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Headline */}
          <h1
            className="stagger-1 display-font"
            style={{
              fontSize: 'clamp(3rem, 8.5vw, 6.5rem)',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1.05,
              color: '#ffffff',
              marginBottom: '1.25rem',
            }}
          >
            PATCH MADE<br />IN HEAVEN
          </h1>

          {/* Monospace Subtitle */}
          <p
            className="mono-font stagger-2"
            style={{
              fontSize: '0.8125rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--text-medium)',
              marginBottom: '3rem',
            }}
          >
            Powered by NitroStack - TypeScript MCP Framework
          </p>

          {/* Restrained Hairline Glass Endpoint Card */}
          <div
            className="stagger-3"
            style={{
              width: '100%',
              maxWidth: '660px',
              backgroundColor: 'rgba(18, 18, 18, 0.75)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--border-strong)',
              borderRadius: '100px',
              padding: '0.625rem 0.625rem 0.625rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              className="endpoint-text"
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.78rem',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.02em',
              }}
              title={MCP_URL}
            >
              {MCP_URL}
            </div>
            <button
              onClick={() => copyToClipboard(MCP_URL)}
              className="active-press"
              style={{
                flexShrink: 0,
                width: '155px',
                minWidth: '155px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: '100px',
                padding: '0.625rem 1rem',
                backgroundColor: copied ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                color: copied ? '#000000' : '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              {copied ? <Check style={{ width: '0.875rem', height: '0.875rem' }} /> : <Copy style={{ width: '0.875rem', height: '0.875rem' }} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>



        {/* Architectural Bottom-Right Anchor */}
        <a
          href="#tools"
          style={{
            position: 'absolute',
            right: '3rem',
            bottom: '2.5rem',
            zIndex: 2,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-medium)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            transition: 'color 200ms ease',
          }}
        >
          <span>Scroll to explore</span>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.25)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#ffffff', animation: 'scrollDot 2s ease-in-out infinite' }} />
          </div>
        </a>
      </section>

      {/* ══════════════════════════════════════════
          AVAILABLE TOOLS
      ══════════════════════════════════════════ */}
      <section
        id="tools"
        style={{
          borderTop: '1px solid var(--border-muted)',
          padding: '5rem 3rem',
          backgroundColor: 'var(--bg-app)',
        }}
      >
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          {/* Section heading */}
          <div style={{ marginBottom: '2rem' }}>
            <h2
              className="display-font"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: 'var(--text-high)',
              }}
            >
              Available Tools
            </h2>
          </div>

          {/* 3D Diamond Gallery WebGL Carousel */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-muted)' }}>
            <DiamondGallery tools={TOOLS} />
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          LIVE KNOWLEDGE BASE INSPECTOR
      ══════════════════════════════════════════ */}
      <section
        id="inspector"
        style={{
          borderTop: '1px solid var(--border-muted)',
          padding: '5rem 3rem 6rem',
          backgroundColor: 'var(--surface-subtle)',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

          {/* Section heading */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h2
                className="display-font"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-high)' }}
              >
                Knowledge Base
              </h2>
              <button
                onClick={fetchCards}
                disabled={loading}
                className="active-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 0.875rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface-panel)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-high)',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <RefreshCw style={{ width: '0.875rem', height: '0.875rem', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                Refresh
              </button>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div
              style={{
                marginBottom: '2rem',
                padding: '1rem 1.25rem',
                borderRadius: '8px',
                backgroundColor: 'var(--status-fail-subtle)',
                border: '1px solid var(--status-fail-border)',
                color: 'var(--status-fail)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.875rem',
              }}
            >
              <AlertTriangle style={{ width: '1.125rem', height: '1.125rem', flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  width: '1rem', height: '1rem', color: 'var(--text-low)',
                }}
              />
              <input
                type="text"
                placeholder="Search errors, stack traces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputBase, paddingLeft: '2.75rem' }}
              />
            </div>

            {/* Language dropdown */}
            <div ref={langRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setLangDropdownOpen(!langDropdownOpen); setErrorDropdownOpen(false); }}
                className="active-press"
                style={{
                  ...inputBase,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: langDropdownOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-muted)',
                }}
              >
                <span style={{ color: selectedLanguage === 'all' ? 'var(--text-low)' : 'var(--text-high)' }}>
                  {selectedLanguage === 'all' ? `All Runtimes (${cards.length})` : selectedLanguage.toUpperCase()}
                </span>
                <ChevronDown style={{ width: '0.875rem', height: '0.875rem', color: 'var(--text-low)', transform: langDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
              </button>
              {langDropdownOpen && (
                <div className="apple-menu-anim" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, backgroundColor: 'var(--surface-panel)', border: '1px solid var(--border-strong)', borderRadius: '8px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', padding: '0.25rem', maxHeight: '220px', overflowY: 'auto' }}>
                  <div onClick={() => { setSelectedLanguage('all'); setLangDropdownOpen(false); }} style={dropdownItemStyle(selectedLanguage === 'all')}>
                    <span>All Runtimes</span>
                    {selectedLanguage === 'all' && <Check style={{ width: '0.75rem', height: '0.75rem', color: 'var(--accent-primary)' }} />}
                  </div>
                  {languages.map((lang) => (
                    <div key={lang} onClick={() => { setSelectedLanguage(lang); setLangDropdownOpen(false); }} style={dropdownItemStyle(selectedLanguage === lang)}>
                      <span>{lang.toUpperCase()}</span>
                      {selectedLanguage === lang && <Check style={{ width: '0.75rem', height: '0.75rem', color: 'var(--accent-primary)' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error type dropdown */}
            <div ref={errorRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setErrorDropdownOpen(!errorDropdownOpen); setLangDropdownOpen(false); }}
                className="active-press"
                style={{
                  ...inputBase,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: errorDropdownOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-muted)',
                }}
              >
                <span style={{ color: selectedErrorType === 'all' ? 'var(--text-low)' : 'var(--text-high)' }}>
                  {selectedErrorType === 'all' ? 'All Error Classes' : selectedErrorType}
                </span>
                <ChevronDown style={{ width: '0.875rem', height: '0.875rem', color: 'var(--text-low)', transform: errorDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
              </button>
              {errorDropdownOpen && (
                <div className="apple-menu-anim" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, backgroundColor: 'var(--surface-panel)', border: '1px solid var(--border-strong)', borderRadius: '8px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', padding: '0.25rem', maxHeight: '220px', overflowY: 'auto' }}>
                  <div onClick={() => { setSelectedErrorType('all'); setErrorDropdownOpen(false); }} style={dropdownItemStyle(selectedErrorType === 'all')}>
                    <span>All Error Classes</span>
                    {selectedErrorType === 'all' && <Check style={{ width: '0.75rem', height: '0.75rem', color: 'var(--accent-primary)' }} />}
                  </div>
                  {errorTypes.map((err) => (
                    <div key={err} onClick={() => { setSelectedErrorType(err); setErrorDropdownOpen(false); }} style={dropdownItemStyle(selectedErrorType === err)}>
                      <span>{err}</span>
                      {selectedErrorType === err && <Check style={{ width: '0.75rem', height: '0.75rem', color: 'var(--accent-primary)' }} />}
                    </div>
                  ))}
                </div>
              )}
</div>
          </div>

{/* 3-Pane Inspector Grid */}
           <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 300px', gap: '1rem', alignItems: 'stretch', height: 'calc(100vh - 320px)', minHeight: 0 }}>

               {/* ── Pane 1: Card List ── */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.1em', color: 'var(--text-low)', textTransform: 'uppercase' }}>
                  Entries ({filteredCards.length})
                </span>
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSelectedLanguage('all'); setSelectedErrorType('all'); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-low)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Clear
                  </button>
                )}
              </div>

              {loading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-muted)', borderRadius: '8px', color: 'var(--text-low)', gap: '0.75rem' }}>
                  <RefreshCw style={{ width: '1.25rem', height: '1.25rem', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>Loading…</span>
                </div>
              ) : filteredCards.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-muted)', borderRadius: '8px', color: 'var(--text-low)', gap: '0.5rem', textAlign: 'center' }}>
                  <Search style={{ width: '1.25rem', height: '1.25rem', opacity: 0.4 }} />
                  <span style={{ fontSize: '0.8125rem' }}>No matches</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', paddingRight: '0.25rem', flex: 1 }}>
                  {filteredCards.map((card) => {
                    const isSelected = selectedCard?.id === card.id;
                    const isPass = card.verification?.status === 'PASS';
                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="active-press"
                        style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? 'var(--surface-panel)' : 'var(--bg-app)',
                          border: isSelected ? '1px solid var(--accent-primary-border)' : '1px solid var(--border-muted)',
                          cursor: 'pointer',
                          transition: 'border-color 160ms ease, background-color 160ms ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-low)', letterSpacing: '0.02em' }}>{card.errorType}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {isPass
                              ? <CheckCircle2 style={{ width: '0.75rem', height: '0.75rem', color: 'var(--status-pass)' }} />
                              : <XCircle style={{ width: '0.75rem', height: '0.75rem', color: 'var(--status-fail)' }} />}
                            <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: isPass ? 'var(--status-pass)' : 'var(--status-fail)' }}>
                              {card.verification?.status || 'PASS'}
                            </span>
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 400, color: isSelected ? 'var(--text-high)' : 'var(--text-medium)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {card.problem}
                        </p>
                        <div style={{ marginTop: '0.625rem', display: 'flex', gap: '0.75rem', fontSize: '0.6875rem', color: 'var(--text-low)', fontFamily: 'var(--font-mono)' }}>
                          <span>{card.environment?.language}</span>
                          <span>·</span>
                          <span>{card.verification?.sandbox || 'docker'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Pane 2: Diff / Logs / Trace ── */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {selectedCard ? (
                <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-muted)', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                  {/* Header */}
                  <div style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-primary)', letterSpacing: '-0.01em' }}>{selectedCard.id}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--status-pass)', backgroundColor: 'var(--status-pass-subtle)', padding: '0.25rem 0.625rem', borderRadius: '100px', border: '1px solid var(--status-pass-border)' }}>
                        <CheckCircle2 style={{ width: '0.75rem', height: '0.75rem' }} />
                        VERIFIED
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: 'var(--text-high)', lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>
                      {selectedCard.problem}
                    </h3>
                  </div>

                  {/* Tab bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.125rem', backgroundColor: 'var(--surface-subtle)', padding: '0.25rem', borderRadius: '6px' }}>
                      {(['diff', 'logs', 'trace'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className="active-press"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.375rem 0.75rem', borderRadius: '4px', border: 'none',
                            backgroundColor: activeTab === tab ? 'var(--surface-panel)' : 'transparent',
                            color: activeTab === tab ? 'var(--text-high)' : 'var(--text-low)',
                            fontSize: '0.8125rem', fontFamily: 'var(--font-body)', cursor: 'pointer',
                            transition: 'background-color 150ms ease, color 150ms ease',
                          }}
                        >
                          {tab === 'diff' && <Code2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                          {tab === 'logs' && <Terminal style={{ width: '0.875rem', height: '0.875rem' }} />}
                          {tab === 'trace' && <Layers style={{ width: '0.875rem', height: '0.875rem' }} />}
                          {tab === 'diff' ? 'Patch' : tab === 'logs' ? 'Logs' : 'Trace'}
                        </button>
                      ))}
                    </div>
                    {activeTab === 'diff' && (
                      <button onClick={() => copyToClipboard(selectedCard.patch)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.375rem 0.625rem', borderRadius: '4px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border-muted)', color: copied ? 'var(--status-pass)' : 'var(--text-low)', fontSize: '0.75rem', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                        {copied ? <Check style={{ width: '0.75rem', height: '0.75rem' }} /> : <Copy style={{ width: '0.75rem', height: '0.75rem' }} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>

                  {/* Tab content */}
                  <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {activeTab === 'diff' && (
                      <div style={{ backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border-muted)', borderRadius: '6px', overflow: 'hidden' }}>
                        {renderFormattedDiff(selectedCard.patch)}
                      </div>
                    )}
                    {activeTab === 'logs' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>STDOUT</div>
                          <pre style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '6px', padding: '1rem', fontSize: '0.78125rem', fontFamily: 'var(--font-mono)', color: '#a7f3d0', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {selectedCard.verification?.stdout || '(empty)'}
                          </pre>
                        </div>
                        {selectedCard.verification?.stderr && (
                          <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: '#f87171', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>STDERR</div>
                            <pre style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '6px', padding: '1rem', fontSize: '0.78125rem', fontFamily: 'var(--font-mono)', color: '#fca5a5', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                              {selectedCard.verification.stderr}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                    {activeTab === 'trace' && (
                      <pre style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '6px', padding: '1rem', fontSize: '0.78125rem', fontFamily: 'var(--font-mono)', color: '#fca5a5', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {selectedCard.stacktrace || 'No stacktrace provided.'}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-muted)', borderRadius: '8px', color: 'var(--text-low)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                  Select an entry to inspect
                </div>
              )}
            </div>

            {/* ── Pane 3: Metadata Drawer ── */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {selectedCard ? (
                <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-muted)', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, height: '100%' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-low)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Context</span>

                  {/* Runtime info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { label: 'Runtime', value: `${selectedCard.environment?.language}${selectedCard.environment?.version ? ` ${selectedCard.environment.version}` : ''}`, icon: <Cpu style={{ width: '0.875rem', height: '0.875rem' }} /> },
                      ...(selectedCard.environment?.framework ? [{ label: 'Framework', value: selectedCard.environment.framework, icon: <Box style={{ width: '0.875rem', height: '0.875rem' }} /> }] : []),
                      { label: 'Error Class', value: selectedCard.errorType, icon: <Hash style={{ width: '0.875rem', height: '0.875rem' }} /> },
                    ].map((row) => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                        <span style={{ color: 'var(--text-low)', marginTop: '0.125rem', flexShrink: 0 }}>{row.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-low)', marginBottom: '0.125rem' }}>{row.label}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-high)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'var(--border-muted)' }} />

                  {/* Sandbox evidence */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { label: 'Duration', value: `${selectedCard.verification?.durationMs ?? 0} ms`, icon: <Activity style={{ width: '0.875rem', height: '0.875rem' }} /> },
                      { label: 'Sandbox', value: selectedCard.verification?.sandbox || 'docker', icon: <Database style={{ width: '0.875rem', height: '0.875rem' }} /> },
                      { label: 'Verified', value: new Date(selectedCard.verification?.lastVerified || Date.now()).toLocaleDateString(), icon: <Clock style={{ width: '0.875rem', height: '0.875rem' }} /> },
                    ].map((row) => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                        <span style={{ color: 'var(--text-low)', marginTop: '0.125rem', flexShrink: 0 }}>{row.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-low)', marginBottom: '0.125rem' }}>{row.label}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-high)', fontFamily: 'var(--font-mono)' }}>{row.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'var(--border-muted)' }} />

                  {/* Metrics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      { k: 'Reuse Hits', v: String(selectedCard.metrics?.reuseCount || 0) },
                      { k: 'Source', v: selectedCard.provenance?.source || 'seed' },
                      { k: 'Confidence', v: `${((selectedCard.verification?.score || 0) * 100).toFixed(0)}%` },
                    ].map(({ k, v }) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--text-low)' }}>{k}</span>
                        <span style={{ color: 'var(--text-high)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-muted)', borderRadius: '8px', color: 'var(--text-low)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                  No selection
                </div>
)}
            </div>
            </div>
            </div>
          </section>
    </div>
  );
}
