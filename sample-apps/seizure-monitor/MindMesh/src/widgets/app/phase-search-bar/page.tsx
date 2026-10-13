'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTheme, useWidgetSDK, useWidgetState, useMaxHeight } from '@nitrostack/widgets';
import { DESIGN, PHASE_GROUPS, ALL_PHASES, getPhaseColor, getPhaseInfo, TOOL_TO_PHASE } from '../components/design-tokens';
import { PhaseBadge, ToolChip, StatusDot, Card, Input, Button, Badge, Separator } from '../components/ui';

interface Tool {
  name: string;
  phase: number;
  description: string;
  category: string;
}

interface Suggestion {
  text: string;
  tool?: string;
  phase: number;
  type: 'tool' | 'query' | 'history';
}

interface WidgetData {
  currentPhase: number;
  phaseName: string;
  suggestions: string[];
  recentSearches: string[];
  availableTools: Tool[];
  [key: string]: unknown;
}

interface WidgetState {
  query: string;
  showSuggestions: boolean;
  showTools: boolean;
  selectedIndex: number;
  recentSearches: string[];
  history: SearchHistoryItem[];
}

interface SearchHistoryItem {
  query: string;
  phase: number;
  timestamp: string;
  resultCount?: number;
}

const ALL_TOOLS: Tool[] = [
  // Phase 0
  { name: 'search_prior_work', phase: 0, description: 'Search prior work including AI sessions', category: 'Search' },
  { name: 'search_prior_ai_sessions', phase: 0, description: 'Search previous AI research sessions', category: 'Search' },
  // Phase 1
  { name: 'search_papers', phase: 1, description: 'Search papers on Semantic Scholar', category: 'Search' },
  { name: 'score_paper_relevance', phase: 1, description: 'Score paper relevance to research question', category: 'Analysis' },
  { name: 'get_paper_metadata', phase: 1, description: 'Fetch paper metadata (abstract, authors, venue)', category: 'Search' },
  // Phase 2
  { name: 'extract_paper_claims', phase: 2, description: 'Extract claims, methods, datasets from papers', category: 'Extraction' },
  { name: 'extract_paper_metadata', phase: 2, description: 'Extract structured metadata from papers', category: 'Extraction' },
  { name: 'fetch_full_text', phase: 2, description: 'Fetch full text PDF from arXiv/open access', category: 'Extraction' },
  // Phase 3
  { name: 'cluster_papers', phase: 3, description: 'Cluster papers by embedding similarity', category: 'Synthesis' },
  { name: 'find_contradictory_claims', phase: 3, description: 'Find contradictory claims across papers', category: 'Synthesis' },
  { name: 'synthesize_clusters', phase: 3, description: 'Generate narrative synthesis per cluster', category: 'Synthesis' },
  // Phase 4
  { name: 'assess_novelty', phase: 4, description: 'Assess novelty of proposed claim', category: 'Gap Finding' },
  { name: 'propose_gap', phase: 4, description: 'Propose specific research gap with evidence', category: 'Gap Finding' },
  { name: 'rank_gaps', phase: 4, description: 'Rank gaps by novelty × feasibility × impact', category: 'Gap Finding' },
  // Phase 5
  { name: 'simulate_adversarial_review', phase: 5, description: 'Simulate adversarial reviewer search', category: 'Review' },
  { name: 'run_gap_review_cycle', phase: 5, description: 'Run gap proposal → review loop (max 3)', category: 'Review' },
  // Phase 6
  { name: 'compute_resilience_score', phase: 6, description: 'Compute resilience score for gap', category: 'Verdict' },
  { name: 'render_verdict', phase: 6, description: 'Render PASS/CONDITIONAL/REJECT verdict', category: 'Verdict' },
  // Phase 7
  { name: 'find_cross_domain_analogs', phase: 7, description: 'Find cross-domain technique analogues', category: 'Analogy' },
  { name: 'verify_technique_match', phase: 7, description: 'Verify technique transferability', category: 'Analogy' },
  // Phase 8
  { name: 'extract_technical_parameters', phase: 8, description: 'Extract hardware/technical parameters', category: 'Tech Params' },
  { name: 'compare_technical_parameters', phase: 8, description: 'Compare technical parameters across papers', category: 'Tech Params' },
  { name: 'fetch_and_extract_tech_params', phase: 8, description: 'Fetch and extract tech params in one call', category: 'Tech Params' },
  // Phase 9
  { name: 'generate_citation', phase: 9, description: 'Generate IEEE/APA/MLA citation', category: 'Citations' },
  { name: 'export_bibtex', phase: 9, description: 'Export bibliography as BibTeX', category: 'Citations' },
  { name: 'manage_bibliography', phase: 9, description: 'Add/remove from session bibliography', category: 'Citations' },
  // Phase 10
  { name: 'tone_match', phase: 10, description: 'Check academic tone of text', category: 'Writing' },
  { name: 'check_ai_generic_phrasing', phase: 10, description: 'Flag generic AI writing patterns', category: 'Writing' },
  { name: 'verify_meaning_preserved', phase: 10, description: 'Verify meaning preserved after rewrite', category: 'Writing' },
  // Phase 11
  { name: 'verify_claim', phase: 11, description: 'Cross-check claim against evidence', category: 'Verification' },
  { name: 'verify_citation', phase: 11, description: 'Verify citation accuracy', category: 'Verification' },
  { name: 'compile_verification_summary', phase: 11, description: 'Compile all verification checks', category: 'Verification' },
  // Phase 12
  { name: 'save_session', phase: 12, description: 'Save session to memory store', category: 'Memory' },
  { name: 'load_session', phase: 12, description: 'Load session from memory store', category: 'Memory' },
  { name: 'search_knowledge_graph', phase: 12, description: 'Query accumulated knowledge graph', category: 'Memory' },
  // Phase 13
  { name: 'create_overleaf_project', phase: 13, description: 'Create Overleaf project from IEEE template', category: 'Overleaf' },
  { name: 'push_to_overleaf', phase: 13, description: 'Push section content to Overleaf', category: 'Overleaf' },
  { name: 'pull_limitations_from_reviewer', phase: 13, description: 'Auto-generate limitations from reviewer', category: 'Overleaf' },
  { name: 'export_overleaf_zip', phase: 13, description: 'Export Overleaf project as zip', category: 'Overleaf' },
];

const PHASE_SUGGESTIONS: Record<number, string[]> = {
  0: [
    'search prior work on federated learning privacy',
    'search prior AI sessions on differential privacy',
    'find previous research on Byzantine FL',
  ],
  1: [
    'search papers on linear attention mechanisms',
    'score relevance for long sequence modeling',
    'get metadata for FlashAttention paper',
    'find papers from NeurIPS 2023+ on transformers',
  ],
  2: [
    'extract claims from top 10 papers',
    'fetch full text for arXiv:2305.12345',
    'extract methodology from clustered papers',
  ],
  3: [
    'cluster papers by embedding similarity k=5',
    'find contradictory claims across clusters',
    'synthesize cluster narratives',
    'group by methodology type',
  ],
  4: [
    'assess novelty of adaptive DP approach',
    'propose gap: unified Byzantine+DP framework',
    'rank gaps by novelty feasibility impact',
  ],
  5: [
    'simulate adversarial review for gap-001',
    'run gap review cycle max 3 iterations',
    'search Limitations of adaptive differential privacy',
  ],
  6: [
    'compute resilience score for proposed gap',
    'render verdict PASS CONDITIONAL REJECT',
    'show review history for gap-001',
  ],
  7: [
    'find cross domain analogs for FL privacy',
    'verify technique match gossip protocols',
    'search epidemiology models for FL',
  ],
  8: [
    'extract technical parameters from GPU papers',
    'compare NVLink vs InfiniBand throughput',
    'fetch and extract tech params for 12 papers',
  ],
  9: [
    'generate IEEE citation for paper-123',
    'export bibliography as BibTeX',
    'add paper to session bibliography',
  ],
  10: [
    'check tone match for methodology section',
    'flag AI generic phrasing in intro',
    'verify meaning preserved after rewrite',
  ],
  11: [
    'verify claim: adaptive DP improves utility',
    'verify citation accuracy for references',
    'compile verification summary for paper',
  ],
  12: [
    'save session research-fl-privacy',
    'load session research-fl-privacy',
    'search knowledge graph for DP mechanisms',
  ],
  13: [
    'create Overleaf project from IEEE template',
    'push methodology section to Overleaf',
    'pull limitations from reviewer comments',
    'export Overleaf project as zip',
  ],
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PhaseSearchBar() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const isDark = theme === 'dark';
  const sdk = useWidgetSDK();
  const widgetData = sdk.getToolOutput<WidgetData>();

  // Persistent widget state
  const [state, setState] = useWidgetState<WidgetState>(() => ({
    query: '',
    showSuggestions: false,
    showTools: false,
    selectedIndex: -1,
    recentSearches: [
      'cluster_papers kmeans 5',
      'find_contradictory_claims',
      'synthesize_clusters',
      'propose_gap adaptive DP',
      'run_gap_review_cycle',
      'compute_resilience_score',
    ],
    history: [
      { query: 'cluster_papers kmeans 5', phase: 3, timestamp: '2026-07-25T18:15:00Z', resultCount: 18 },
      { query: 'find_contradictory_claims', phase: 3, timestamp: '2026-07-25T18:16:00Z', resultCount: 5 },
      { query: 'propose_gap adaptive DP', phase: 4, timestamp: '2026-07-25T22:15:00Z', resultCount: 5 },
      { query: 'run_gap_review_cycle', phase: 5, timestamp: '2026-07-25T22:20:00Z', resultCount: 3 },
      { query: 'compute_resilience_score', phase: 6, timestamp: '2026-07-25T22:28:00Z', resultCount: 1 },
    ],
  }));

  const inputRef = useRef<HTMLInputElement>(null);

  // Current phase from widget data or default
  const currentPhase = widgetData?.currentPhase ?? 3;
  const phaseName = widgetData?.phaseName ?? 'Synthesis & Clustering';

  const currentPhaseTools = ALL_TOOLS.filter(t => t.phase === currentPhase);
  const phaseInfo = getPhaseInfo(currentPhase);
  const phaseColor = getPhaseColor(currentPhase);

  // Memoized suggestions
  const suggestions = useMemo(() => {
    const allSuggestions: Suggestion[] = [];

    // Phase-specific tool suggestions
    currentPhaseTools.forEach(tool => {
      allSuggestions.push({
        text: tool.name,
        tool: tool.name,
        phase: tool.phase,
        type: 'tool',
      });
    });

    // Phase-specific query suggestions
    const phaseQueries = PHASE_SUGGESTIONS[currentPhase] || [];
    phaseQueries.forEach(q => {
      allSuggestions.push({
        text: q,
        phase: currentPhase,
        type: 'query',
      });
    });

    // Recent searches matching current phase
    state.recentSearches
      .filter(rs => {
        const toolName = rs.split(' ')[0];
        return TOOL_TO_PHASE[toolName] === currentPhase;
      })
      .slice(0, 3)
      .forEach(rs => {
        allSuggestions.push({
          text: rs,
          phase: currentPhase,
          type: 'history',
        });
      });

    // Filter by query
    if (state.query.trim()) {
      const q = state.query.toLowerCase();
      return allSuggestions.filter(s =>
        s.text.toLowerCase().includes(q) ||
        (s.tool && s.tool.toLowerCase().includes(q))
      );
    }

    return allSuggestions.slice(0, 10);
  }, [state.query, state.recentSearches, currentPhase]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!state.showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setState(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, suggestions.length - 1) }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setState(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) }));
        break;
      case 'Enter':
        e.preventDefault();
        if (state.selectedIndex >= 0 && state.selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[state.selectedIndex]);
        } else {
          executeSearch();
        }
        break;
      case 'Escape':
        setState(prev => ({ ...prev, showSuggestions: false, showTools: false, selectedIndex: -1 }));
        inputRef.current?.blur();
        break;
      case 'Tab':
        if (state.showTools) {
          e.preventDefault();
          setState(prev => ({ ...prev, showTools: false, showSuggestions: true, selectedIndex: -1 }));
        }
        break;
    }
  }, [state.showSuggestions, state.selectedIndex, state.showTools, suggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setState(prev => ({
      ...prev,
      query: value,
      showSuggestions: value.length > 0 || state.showTools,
      selectedIndex: -1,
    }));
  };

  const handleFocus = () => {
    setState(prev => ({ ...prev, showSuggestions: true, showTools: false }));
  };

  const handleBlur = () => {
    setTimeout(() => {
      setState(prev => ({ ...prev, showSuggestions: false, showTools: false, selectedIndex: -1 }));
    }, 150);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    if (suggestion.type === 'tool' && suggestion.tool) {
      executeTool(suggestion.tool);
      addToHistory(suggestion.tool, currentPhase);
    } else {
      setState(prev => ({ ...prev, query: suggestion.text, showSuggestions: false }));
      executeSearch();
    }
  };

  const executeSearch = () => {
    if (!state.query.trim()) return;
    addToHistory(state.query, currentPhase);
    // Use sendFollowUpMessage for natural language queries, or callTool for specific tools
    sdk.sendFollowUpMessage(state.query);
    console.log('Search:', state.query, 'Phase:', currentPhase);
  };

  const executeTool = (toolName: string) => {
    // Use callTool to invoke a specific MCP tool
    sdk.callTool(toolName, { phase: currentPhase });
    console.log('Execute tool:', toolName, 'Phase:', currentPhase);
  };

  const addToHistory = (query: string, phase: number) => {
    const newItem: SearchHistoryItem = {
      query,
      phase,
      timestamp: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      recentSearches: [query, ...prev.recentSearches.filter(r => r !== query)].slice(0, 10),
      history: [newItem, ...prev.history].slice(0, 20),
      query: '',
      showSuggestions: false,
    }));
  };

  const handlePhaseToolClick = (tool: Tool) => {
    executeTool(tool.name);
  };

  const clearHistory = () => {
    setState(prev => ({ ...prev, recentSearches: [], history: [] }));
  };

  const handleConversationClick = () => {
    // Navigation to phase would go here
    console.log('Navigate to phase');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: maxHeight ?? undefined,
        width: '100%',
        backgroundColor: DESIGN.colors.bg,
        borderRight: `1px solid ${DESIGN.colors.border}`,
        fontFamily: DESIGN.fonts.sans,
        color: DESIGN.colors.fg,
        overflow: 'hidden',
      }}
    >
      {/* Phase Header */}
      <div style={{
        padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
        borderBottom: `1px solid ${DESIGN.colors.border}`,
        backgroundColor: DESIGN.colors.bgElevated,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN.spacing.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm }}>
            <PhaseBadge phase={currentPhase} size="md" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.xs }}>
            <Badge variant="info" size="sm">
              {currentPhaseTools.length} tools
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, showTools: !prev.showTools }))}
              style={{ padding: '4px 8px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </Button>
          </div>
        </div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: DESIGN.colors.fg, margin: 0, marginBottom: DESIGN.spacing.xs }}>
          {phaseName}
        </h2>
        <p style={{ fontSize: 11, color: DESIGN.colors.fgMuted, margin: 0, fontFamily: DESIGN.fonts.mono }}>
          Phase {currentPhase} • {ALL_PHASES.find(p => p.id === currentPhase)?.tools.length || 0} tools available
        </p>
      </div>

      {/* Search Input */}
      <div style={{
        padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
        borderBottom: `1px solid ${DESIGN.colors.border}`,
        backgroundColor: DESIGN.colors.bgElevated,
      }}>
        <div style={{ position: 'relative' }}>
          <Input
            ref={inputRef}
            placeholder={`Search Phase ${currentPhase}... (type tool name or query)`}
            value={state.query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
            style={{ width: '100%' }}
          />
          {state.query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={executeSearch}
              style={{
                position: 'absolute',
                right: DESIGN.spacing.sm,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '4px 8px',
                fontSize: 10,
              }}
            >
              Run
            </Button>
          )}
        </div>
        {state.query && (
          <div style={{ marginTop: DESIGN.spacing.xs, display: 'flex', gap: DESIGN.spacing.xs, flexWrap: 'wrap' }}>
            <Badge variant="info" size="sm">P{currentPhase}</Badge>
            <span style={{ fontSize: 10, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>
              Press Enter to search · ↓↑ to navigate · Esc to close
            </span>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {(state.showSuggestions || state.showTools) && (
        <div
          style={{
            position: 'relative',
            zIndex: DESIGN.zIndex.dropdown,
            borderTop: `1px solid ${DESIGN.colors.border}`,
            backgroundColor: DESIGN.colors.bgElevated,
            maxHeight: state.showTools ? 400 : 300,
            overflowY: 'auto',
          }}
        >
          {/* Tools Panel */}
          {state.showTools && currentPhaseTools.length > 0 && (
            <div style={{ padding: DESIGN.spacing.md }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN.spacing.sm }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: DESIGN.colors.fgMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: DESIGN.fonts.mono }}>
                  Phase {currentPhase} Tools
                </span>
                <Button variant="ghost" size="sm" onClick={() => setState(prev => ({ ...prev, showTools: false, showSuggestions: true }))}>
                  Back
                </Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.xs }}>
                {currentPhaseTools.map(tool => (
                  <div
                    key={tool.name}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: DESIGN.spacing.sm,
                      padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
                      backgroundColor: DESIGN.colors.bg,
                      border: `1px solid ${DESIGN.colors.border}`,
                      borderRadius: DESIGN.radius.md,
                      cursor: 'pointer',
                      transition: DESIGN.transitions.fast,
                    }}
                    onClick={() => handlePhaseToolClick(tool)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = phaseColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = DESIGN.colors.border; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.xs, marginBottom: 2 }}>
                        <code style={{ fontSize: 11, color: phaseColor, fontFamily: DESIGN.fonts.mono, fontWeight: 500 }}>
                          {tool.name}
                        </code>
                        <Badge variant="default" size="sm" style={{ backgroundColor: `${phaseColor}20`, borderColor: `${phaseColor}60`, color: phaseColor }}>
                          {tool.category}
                        </Badge>
                      </div>
                      <p style={{ fontSize: 10, color: DESIGN.colors.fgMuted, margin: 0, lineHeight: 1.3, fontFamily: DESIGN.fonts.sans }}>
                        {tool.description}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: DESIGN.colors.fgDim }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions List */}
          {!state.showTools && suggestions.length > 0 && (
            <div style={{ padding: DESIGN.spacing.xs }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.text}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN.spacing.sm,
                    padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
                    backgroundColor: state.selectedIndex === index ? `${phaseColor}20` : 'transparent',
                    borderRadius: DESIGN.radius.md,
                    cursor: 'pointer',
                    transition: DESIGN.transitions.fast,
                  }}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setState(prev => ({ ...prev, selectedIndex: index }))}
                >
                  <div
                    style={{
                      width: 20, height: 20, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      backgroundColor: suggestion.type === 'tool' ? `${DESIGN.colors.blue}20` :
                                        suggestion.type === 'history' ? `${DESIGN.colors.green}20` :
                                        `${phaseColor}20`,
                      color: suggestion.type === 'tool' ? DESIGN.colors.blue :
                             suggestion.type === 'history' ? DESIGN.colors.green : phaseColor,
                    }}
                  >
                    {suggestion.type === 'tool' && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                    )}
                    {suggestion.type === 'query' && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    )}
                    {suggestion.type === 'history' && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <code style={{ fontSize: 12, color: DESIGN.colors.fg, fontFamily: DESIGN.fonts.mono }}>
                      {suggestion.text}
                    </code>
                    {suggestion.tool && (
                      <span style={{ fontSize: 9, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono, marginLeft: DESIGN.spacing.xs }}>
                        Tool: {suggestion.tool}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={suggestion.type === 'tool' ? 'info' : suggestion.type === 'history' ? 'success' : 'default'}
                    size="sm"
                  >
                    {suggestion.type === 'tool' ? 'Tool' : suggestion.type === 'history' ? 'Recent' : 'Query'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!state.showTools && suggestions.length === 0 && state.query && (
            <div style={{ padding: DESIGN.spacing.lg, textAlign: 'center', color: DESIGN.colors.fgDim }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: DESIGN.spacing.sm, opacity: 0.3 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p style={{ margin: 0, fontSize: 12 }}>No suggestions for "{state.query}"</p>
              <p style={{ margin: `${DESIGN.spacing.xs}px 0 0`, fontSize: 10, fontFamily: DESIGN.fonts.mono }}>Try a tool name or broader query</p>
            </div>
          )}

          {/* History Section */}
          {!state.showTools && state.history.length > 0 && !state.query && (
            <div style={{ borderTop: `1px solid ${DESIGN.colors.border}`, padding: DESIGN.spacing.md }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN.spacing.sm }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: DESIGN.colors.fgMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: DESIGN.fonts.mono }}>
                  Recent Searches
                </span>
                {state.history.length > 5 && (
                  <Button variant="ghost" size="sm" onClick={clearHistory} style={{ fontSize: 10 }}>
                    Clear
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.xs }}>
                {state.history.slice(0, 8).map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: DESIGN.spacing.sm, padding: `${DESIGN.spacing.xs}px ${DESIGN.spacing.sm}px`,
                      backgroundColor: DESIGN.colors.bg, border: `1px solid ${DESIGN.colors.border}`,
                      borderRadius: DESIGN.radius.sm, cursor: 'pointer',
                      transition: DESIGN.transitions.fast,
                    }}
                    onClick={() => {
                      setState(prev => ({ ...prev, query: item.query }));
                      selectSuggestion({ text: item.query, phase: item.phase, type: 'history' });
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = DESIGN.colors.borderBright; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = DESIGN.colors.border; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm, flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          width: 6, height: 6, borderRadius: '50%',
                          backgroundColor: getPhaseColor(item.phase), flexShrink: 0,
                        }}
                      />
                      <code style={{ fontSize: 11, color: DESIGN.colors.fg, fontFamily: DESIGN.fonts.mono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.query}
                      </code>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm, fontSize: 10, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>
                      <Badge variant="default" size="sm" style={{ fontSize: 9 }}>P{item.phase}</Badge>
                      {item.resultCount !== undefined && (
                        <span>{item.resultCount} results</span>
                      )}
                      <span>{formatTime(item.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions Bar */}
      <div style={{
        padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.lg}px ${DESIGN.spacing.md}px`,
        borderBottom: `1px solid ${DESIGN.colors.border}`,
        backgroundColor: DESIGN.colors.bgElevated,
      }}>
        <div style={{ display: 'flex', gap: DESIGN.spacing.xs, flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState(prev => ({ ...prev, showTools: true, showSuggestions: false }))}
            style={{ padding: '6px 10px', fontSize: 10 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Tools
          </Button>
          {PHASE_GROUPS.flatMap(g => g.phases).map(p => (
            <Button
              key={p.id}
              variant={currentPhase === p.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleConversationClick()}
              style={{
                padding: '6px 10px', fontSize: 10,
                borderColor: getPhaseColor(p.id),
                color: currentPhase === p.id ? DESIGN.colors.bg : getPhaseColor(p.id),
                backgroundColor: currentPhase === p.id ? getPhaseColor(p.id) : 'transparent',
              }}
            >
              P{p.id}
            </Button>
          ))}
        </div>
      </div>

      {/* Help / Shortcuts */}
      <div style={{
        padding: DESIGN.spacing.md,
        backgroundColor: DESIGN.colors.bg,
        borderTop: `1px solid ${DESIGN.colors.border}`,
      }}>
        <details style={{ color: DESIGN.colors.fgDim }}>
          <summary style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: DESIGN.fonts.mono, cursor: 'pointer', marginBottom: DESIGN.spacing.xs }}>
            Shortcuts
          </summary>
          <div style={{ fontSize: 10, lineHeight: 2, fontFamily: DESIGN.fonts.mono }}>
            <div><kbd style={{ backgroundColor: DESIGN.colors.bgElevated, padding: '1px 4px', borderRadius: DESIGN.radius.sm, border: `1px solid ${DESIGN.colors.border}` }}>Enter</kbd> Execute search / tool</div>
            <div><kbd style={{ backgroundColor: DESIGN.colors.bgElevated, padding: '1px 4px', borderRadius: DESIGN.radius.sm, border: `1px solid ${DESIGN.colors.border}` }}>↓ ↑</kbd> Navigate suggestions</div>
            <div><kbd style={{ backgroundColor: DESIGN.colors.bgElevated, padding: '1px 4px', borderRadius: DESIGN.radius.sm, border: `1px solid ${DESIGN.colors.border}` }}>Esc</kbd> Close dropdown</div>
            <div><kbd style={{ backgroundColor: DESIGN.colors.bgElevated, padding: '1px 4px', borderRadius: DESIGN.radius.sm, border: `1px solid ${DESIGN.colors.border}` }}>Tab</kbd> Toggle tools panel</div>
            <div><kbd style={{ backgroundColor: DESIGN.colors.bgElevated, padding: '1px 4px', borderRadius: DESIGN.radius.sm, border: `1px solid ${DESIGN.colors.border}` }}/> Type tool name to run directly</div>
          </div>
        </details>
      </div>
    </div>
  );
}

export default PhaseSearchBar;