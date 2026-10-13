'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTheme, useWidgetSDK, useWidgetState, useMaxHeight } from '@nitrostack/widgets';
import { DESIGN, PHASE_GROUPS, getPhaseColor, getPhaseInfo, ALL_PHASES } from '../components/design-tokens';
import { PhaseBadge, ToolChip, StatusDot, StatusIndicator, Card, Input, Button, Badge, Separator } from '../components/ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  phase: number;
  tool?: string;
}

interface Conversation {
  id: string;
  title: string;
  topic: string;
  phase: number;
  status: 'idle' | 'in-progress' | 'completed' | 'review' | 'error';
  messages: Message[];
  papers: number;
  gapsFound: number;
  currentGap?: string;
}

interface WidgetData {
  activeConversation: Conversation | null;
  sidebarState: { collapsed: boolean; searchQuery: string; phaseFilter: number | null };
  searchBarState: { query: string; phase: number; showTools: boolean };
  overleafState: { projectId: string | null; status: string };
  theme: 'dark';
  [key: string]: unknown;
}

interface WidgetState {
  activeConversation: Conversation | null;
  sidebarCollapsed: boolean;
  searchQuery: string;
  phaseFilter: number | null;
  searchBarQuery: string;
  searchBarPhase: number;
  searchBarShowTools: boolean;
  overleafProjectId: string | null;
  overleafStatus: string;
  layout: 'full' | 'sidebar-only' | 'chat-only';
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-001',
    title: 'Federated Learning Privacy Research',
    topic: 'federated learning privacy',
    phase: 6,
    status: 'completed',
    messages: [
      { id: 'msg-1', role: 'user', content: 'Search for federated learning privacy papers from 2020+', timestamp: '2026-07-25T22:00:00Z', phase: 0 },
      { id: 'msg-2', role: 'assistant', content: 'Found 14 papers (2020-2024). Top venues: IEEE S&P, ACM CCS, NeurIPS, ICML, USENIX Security.', timestamp: '2026-07-25T22:00:15Z', phase: 0, tool: 'search_prior_work' },
      { id: 'msg-3', role: 'user', content: 'Extract claims and methodologies from all papers', timestamp: '2026-07-25T22:05:00Z', phase: 2 },
      { id: 'msg-4', role: 'assistant', content: 'Extracted 47 claims across 14 papers. Types: 18 methods, 12 findings, 9 limitations, 8 assumptions.', timestamp: '2026-07-25T22:06:30Z', phase: 2, tool: 'extract_paper_claims' },
      { id: 'msg-5', role: 'user', content: 'Cluster papers and find contradictions', timestamp: '2026-07-25T22:10:00Z', phase: 3 },
      { id: 'msg-6', role: 'assistant', content: '4 clusters identified. 5 contradictions found (2 high severity). Key conflict: Central DP vs Local DP utility tradeoff.', timestamp: '2026-07-25T22:11:45Z', phase: 3, tool: 'cluster_papers' },
      { id: 'msg-7', role: 'user', content: 'Propose research gaps', timestamp: '2026-07-25T22:15:00Z', phase: 4 },
      { id: 'msg-8', role: 'assistant', content: 'Proposed 5 gaps. Top: Adaptive DP with dynamic per-client budget allocation (novelty 85, feasibility 78, impact 88).', timestamp: '2026-07-25T22:16:20Z', phase: 4, tool: 'propose_gap' },
      { id: 'msg-9', role: 'user', content: 'Run adversarial review cycle', timestamp: '2026-07-25T22:20:00Z', phase: 5 },
      { id: 'msg-10', role: 'assistant', content: 'Review cycle complete. Iteration 1: OBJECTION (dynamic sensitivity estimation leaks). Iteration 2: PASS. Iteration 3: PASS. Final: PASS.', timestamp: '2026-07-25T22:25:00Z', phase: 5, tool: 'run_gap_review_cycle' },
      { id: 'msg-11', role: 'assistant', content: 'Final verdict: PASS. Resilience score: 87/100. Ready for paper drafting.', timestamp: '2026-07-25T22:28:00Z', phase: 6, tool: 'render_verdict' },
    ],
    papers: 14,
    gapsFound: 5,
    currentGap: 'Adaptive differential privacy that allocates privacy budget dynamically per client per round based on data heterogeneity and contribution',
  },
  {
    id: 'conv-002',
    title: 'Efficient Attention for Long Sequences',
    topic: 'linear attention mechanisms',
    phase: 3,
    status: 'in-progress',
    messages: [
      { id: 'msg-1', role: 'user', content: 'Find papers on linear attention and efficient transformers', timestamp: '2026-07-25T18:00:00Z', phase: 1 },
      { id: 'msg-2', role: 'assistant', content: 'Found 18 papers covering FlashAttention, Linear Attention, Performer, Reformer, and more.', timestamp: '2026-07-25T18:00:30Z', phase: 1, tool: 'search_papers' },
    ],
    papers: 18,
    gapsFound: 3,
  },
];

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

function formatFullTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Tool data
const TOOLS = [
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

// Sidebar component
const ChatHistorySidebarWidget = ({ conversations, activeConversation, onConversationSelect, onNewConversation, searchQuery, setSearchQuery, phaseFilter, setPhaseFilter }: {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onConversationSelect: (conv: Conversation) => void;
  onNewConversation: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  phaseFilter: number | null;
  setPhaseFilter: (p: number | null) => void;
}) => {
  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.topic.toLowerCase().includes(query)
      );
    }
    if (phaseFilter !== null) {
      result = result.filter(c => c.phase === phaseFilter);
    }
    return result.sort((a, b) => new Date(b.messages[b.messages.length - 1]?.timestamp || '').getTime() - new Date(a.messages[a.messages.length - 1]?.timestamp || '').getTime());
  }, [conversations, searchQuery, phaseFilter]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: DESIGN.colors.bg,
      borderRight: `1px solid ${DESIGN.colors.border}`,
      fontFamily: DESIGN.fonts.sans,
      color: DESIGN.colors.fg,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: DESIGN.spacing.md,
        borderBottom: `1px solid ${DESIGN.colors.border}`,
        backgroundColor: DESIGN.colors.bgElevated,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN.spacing.sm }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: DESIGN.colors.fg, margin: 0, letterSpacing: -0.02 }}>
            Chat History
          </h2>
          <Badge variant="outline" style={{ fontSize: 10 }}>
            {filteredConversations.length} / {conversations.length}
          </Badge>
        </div>
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
          style={{ width: '100%' }}
        />
      </div>

      {/* Phase Filter */}
      <div style={{
        padding: DESIGN.spacing.sm,
        paddingTop: 0,
        borderBottom: `1px solid ${DESIGN.colors.border}`,
        backgroundColor: DESIGN.colors.bgElevated,
      }}>
        <div style={{ display: 'flex', gap: DESIGN.spacing.xs, overflowX: 'auto', paddingBottom: DESIGN.spacing.xs }}>
          <Button
            variant={phaseFilter === null ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPhaseFilter(null)}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            All Phases
          </Button>
          {Object.entries(PHASE_GROUPS).map(([phaseKey, groupName]) => {
            const phaseNum = parseInt(phaseKey);
            if (!ALL_PHASES.find(p => p.phase === phaseNum)) return null;
            return (
              <Button
                key={phaseKey}
                variant={phaseFilter === phaseNum ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPhaseFilter(phaseFilter === phaseNum ? null : phaseNum)}
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  backgroundColor: phaseFilter === phaseNum ? getPhaseColor(phaseNum) : undefined,
                  borderColor: phaseFilter === phaseNum ? getPhaseColor(phaseNum) : undefined,
                  color: phaseFilter === phaseNum ? '#0a0d12' : undefined,
                }}
              >
                P{phaseNum} - {groupName}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Conversation List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: DESIGN.spacing.sm }}>
        {filteredConversations.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 200,
            color: DESIGN.colors.fgDim,
            textAlign: 'center',
            padding: DESIGN.spacing.lg,
          }}>
            <div style={{ fontSize: 32, marginBottom: DESIGN.spacing.sm, opacity: 0.5 }}>💬</div>
            <p style={{ margin: 0, fontSize: 13 }}>No conversations found</p>
            <p style={{ margin: `${DESIGN.spacing.xs}px 0 0`, fontSize: 11, color: DESIGN.colors.fgMuted }}>
              {searchQuery || phaseFilter !== null ? 'Try adjusting your filters' : 'Start a new research session'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.sm }}>
            {filteredConversations.map(conversation => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversation?.id === conversation.id}
                onClick={() => onConversationSelect(conversation)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: DESIGN.spacing.md,
        borderTop: `1px solid ${DESIGN.colors.border}`,
        backgroundColor: DESIGN.colors.bgElevated,
      }}>
        <Button
          variant="default"
          size="sm"
          onClick={onNewConversation}
          style={{ width: '100%' }}
        >
          + New Research Session
        </Button>
        <p style={{ fontSize: 10, color: DESIGN.colors.fgDim, textAlign: 'center', marginTop: DESIGN.spacing.sm, fontFamily: DESIGN.fonts.mono }}>
          Phase 0 → 13 | Memory persisted across sessions
        </p>
      </div>
    </div>
  );
};

const ConversationCard = ({ conversation, isActive, onClick }: { conversation: Conversation; isActive: boolean; onClick: () => void }) => {
  const phaseInfo = getPhaseInfo(conversation.phase);
  const phaseColor = getPhaseColor(conversation.phase);
  const statusColor = conversation.status === 'completed' ? DESIGN.colors.green :
    conversation.status === 'in-progress' ? DESIGN.colors.blue :
    conversation.status === 'review' ? DESIGN.colors.phaseStretch :
    conversation.status === 'error' ? DESIGN.colors.red : DESIGN.colors.fgDim;

  return (
    <Card
      elevated={isActive}
      padding="sm"
      onClick={onClick}
      style={{
        borderColor: isActive ? phaseColor : DESIGN.colors.border,
        boxShadow: isActive ? `0 0 0 1px ${phaseColor}40, ${DESIGN.shadows.md}` : DESIGN.shadows.sm,
      }}
    >
      <div style={{ display: 'flex', gap: DESIGN.spacing.sm }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: statusColor,
          marginTop: 3, flexShrink: 0,
          boxShadow: `0 0 8px ${statusColor}`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: DESIGN.spacing.sm, marginBottom: DESIGN.spacing.xs }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: DESIGN.colors.fg, margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conversation.title}
            </h4>
            <span style={{ fontSize: 10, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono, flexShrink: 0 }}>
              {formatTime(conversation.messages[conversation.messages.length - 1]?.timestamp || '')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm, marginBottom: DESIGN.spacing.xs, flexWrap: 'wrap' }}>
            <PhaseBadge phase={conversation.phase} size="sm" />
            <StatusDot status={conversation.status} size={6} />
          </div>
          <p style={{ fontSize: 11, color: DESIGN.colors.fgMuted, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {conversation.messages[conversation.messages.length - 1]?.content || 'No messages'}
          </p>
        </div>
      </div>
    </Card>
  );
};

// Phase Search Bar Widget
const PhaseSearchBarWidget = ({ currentPhase, onPhaseChange, onToolClick, onSearch }: {
  currentPhase: number;
  onPhaseChange: (phase: number) => void;
  onToolClick: (toolName: string) => void;
  onSearch: (query: string, phase: number) => void;
}) => {
  const [query, setQuery] = useState('');
  const [showTools, setShowTools] = useState(false);

  const currentPhaseTools = useMemo(() => TOOLS.filter(t => t.phase === currentPhase), [currentPhase]);
  const phaseColor = getPhaseColor(currentPhase);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query, currentPhase);
        setQuery('');
      }
    }
  };

  return (
    <div style={{
      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
      borderBottom: `1px solid ${DESIGN.colors.border}`,
      backgroundColor: DESIGN.colors.bgElevated,
    }}>
      {/* Phase Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN.spacing.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm }}>
          <PhaseBadge phase={currentPhase} size="md" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.xs }}>
          <Badge variant="info" size="sm">{currentPhaseTools.length} tools</Badge>
          <Button variant="ghost" size="sm" onClick={() => setShowTools(!showTools)} style={{ padding: '4px 8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <Input
          placeholder={`Search Phase ${currentPhase}... (type tool name or query)`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
          style={{ width: '100%' }}
        />
        {query && (
          <Button variant="ghost" size="sm" onClick={() => { onSearch(query, currentPhase); setQuery(''); }} style={{ position: 'absolute', right: DESIGN.spacing.sm, top: '50%', transform: 'translateY(-50%)', padding: '4px 8px', fontSize: 10 }}>
            Run
          </Button>
        )}
      </div>

      {/* Tools Panel */}
      {showTools && currentPhaseTools.length > 0 && (
        <div style={{ marginTop: DESIGN.spacing.sm, padding: DESIGN.spacing.sm, borderTop: `1px solid ${DESIGN.colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN.spacing.sm }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: DESIGN.colors.fgMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: DESIGN.fonts.mono }}>
              Phase {currentPhase} Tools
            </span>
            <Button variant="ghost" size="sm" onClick={() => setShowTools(false)}>Back</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.xs, maxHeight: 300, overflowY: 'auto' }}>
            {currentPhaseTools.map(tool => (
              <Button
                key={tool.name}
                variant="ghost"
                size="sm"
                onClick={() => onToolClick(tool.name)}
                style={{ textAlign: 'left', justifyContent: 'space-between', padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`, backgroundColor: DESIGN.colors.bg, borderColor: DESIGN.colors.border }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.xs, marginBottom: 2 }}>
                    <code style={{ fontSize: 11, color: phaseColor, fontFamily: DESIGN.fonts.mono, fontWeight: 500 }}>{tool.name}</code>
                    <Badge variant="default" size="sm" style={{ backgroundColor: `${phaseColor}20`, borderColor: `${phaseColor}60`, color: phaseColor }}>{tool.category}</Badge>
                  </div>
                  <p style={{ fontSize: 10, color: DESIGN.colors.fgMuted, margin: 0, fontFamily: DESIGN.fonts.sans }}>{tool.description}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: DESIGN.colors.fgDim }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Phase Nav */}
      <div style={{
        padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.lg}px ${DESIGN.spacing.md}px`,
        borderBottom: `1px solid ${DESIGN.colors.border}`,
        backgroundColor: DESIGN.colors.bgElevated,
      }}>
        <div style={{ display: 'flex', gap: DESIGN.spacing.xs, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={() => setShowTools(!showTools)} style={{ padding: '6px 10px', fontSize: 10 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            Tools
          </Button>
          {PHASE_GROUPS.flatMap(g => g.phases).map(p => (
            <Button
              key={p.id}
              variant={currentPhase === p.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPhaseChange(p.id)}
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
    </div>
  );
};

// Message Bubble
const MessageBubble = ({ message }: { message: Message }) => {
  const phaseInfo = getPhaseInfo(message.phase);
  const phaseColor = getPhaseColor(message.phase);
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      gap: DESIGN.spacing.md,
      maxWidth: '85%',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        backgroundColor: isUser ? DESIGN.colors.amber : phaseColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2,
      }}>
        {isUser ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0d12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0d12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        )}
      </div>
      <div style={{
        flex: 1,
        backgroundColor: isUser ? `${DESIGN.colors.amber}15` : DESIGN.colors.bgElevated,
        border: `1px solid ${isUser ? `${DESIGN.colors.amber}40` : DESIGN.colors.border}`,
        borderRadius: DESIGN.radius.lg,
        padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
        minWidth: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm, marginBottom: DESIGN.spacing.xs, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: DESIGN.colors.fgMuted,
            textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: DESIGN.fonts.mono,
          }}>
            {isUser ? 'USER' : 'ASSISTANT'}
          </span>
          {message.tool && (
            <ToolChip name={message.tool} phase={message.phase} size="sm" showPhase={false} />
          )}
          <span style={{ fontSize: 9, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono, marginLeft: 'auto' }}>
            P{message.phase} • {formatFullTime(message.timestamp)}
          </span>
        </div>
        <p style={{ fontSize: 13, color: DESIGN.colors.fg, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: DESIGN.fonts.sans }}>
          {message.content}
        </p>
      </div>
    </div>
  );
};

// Overleaf Flow Button Widget
const OverleafFlowButtonWidget = ({ projectId, status, onSync, onExport }: {
  projectId: string | null;
  status: string;
  onSync: () => void;
  onExport: () => void;
}) => {
  const isProjectCreated = !!projectId;

  if (!isProjectCreated) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: DESIGN.spacing.xl, backgroundColor: DESIGN.colors.bg,
      }}>
        <Card elevated padding="xl" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            backgroundColor: `${DESIGN.colors.amber}20`,
            border: `1px solid ${DESIGN.colors.amber}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: `0 auto ${DESIGN.spacing.lg}px`,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={DESIGN.colors.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: DESIGN.colors.fg, margin: `${DESIGN.spacing.md}px 0 ${DESIGN.spacing.xs}px` }}>
            Connect to Overleaf
          </h2>
          <p style={{ fontSize: 13, color: DESIGN.colors.fgMuted, margin: 0, lineHeight: 1.5 }}>
            Create a new paper project from our IEEE template or sync an existing Overleaf project.
          </p>
          <Button variant="primary" size="lg" onClick={() => console.log('Create project')} style={{ width: '100%', marginTop: DESIGN.spacing.lg, padding: '12px 24px', fontSize: 14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Create New Project
          </Button>
        </Card>
      </div>
    );
  }

  // Project exists - show compact status
  return (
    <div style={{
      padding: DESIGN.spacing.md,
      borderTop: `1px solid ${DESIGN.colors.border}`,
      backgroundColor: DESIGN.colors.bgElevated,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: DESIGN.spacing.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm }}>
          <div style={{
            width: 32, height: 32, borderRadius: DESIGN.radius.md,
            backgroundColor: `${DESIGN.colors.green}20`,
            border: `1px solid ${DESIGN.colors.green}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={DESIGN.colors.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: DESIGN.colors.fg, fontFamily: DESIGN.fonts.mono }}>{projectId}</div>
            <div style={{ fontSize: 10, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>{status}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: DESIGN.spacing.xs }}>
          <Button variant="secondary" size="sm" onClick={onSync} style={{ fontSize: 10 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Sync
          </Button>
          <Button variant="ghost" size="sm" onClick={onExport} style={{ fontSize: 10 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            ZIP
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function ResearchPilotShell() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const isDark = theme === 'dark';
  const sdk = useWidgetSDK();
  const widgetData = sdk.getToolOutput<WidgetData>();

  // Persistent widget state
  const [state, setState] = useWidgetState<WidgetState>(() => ({
    activeConversation: MOCK_CONVERSATIONS[0],
    sidebarCollapsed: false,
    searchQuery: '',
    phaseFilter: null,
    searchBarQuery: '',
    searchBarPhase: MOCK_CONVERSATIONS[0].phase,
    searchBarShowTools: false,
    overleafProjectId: 'fl_proj_1785024096407',
    overleafStatus: 'synced',
    layout: 'full',
  }));

  // Initialize from widget data
  useEffect(() => {
    if (widgetData) {
      setState(prev => ({
        ...prev,
        activeConversation: widgetData.activeConversation,
        sidebarCollapsed: widgetData.sidebarState?.collapsed ?? false,
        searchQuery: widgetData.sidebarState?.searchQuery ?? '',
        phaseFilter: widgetData.sidebarState?.phaseFilter ?? null,
        searchBarQuery: widgetData.searchBarState?.query ?? '',
        searchBarPhase: widgetData.searchBarState?.phase ?? MOCK_CONVERSATIONS[0].phase,
        searchBarShowTools: widgetData.searchBarState?.showTools ?? false,
        overleafProjectId: widgetData.overleafState?.projectId ?? null,
        overleafStatus: widgetData.overleafState?.status ?? 'idle',
      }));
    }
  }, [widgetData]);

  const conversation = state.activeConversation;
  const currentMessages = conversation?.messages || [];
  const currentPhase = conversation?.phase || state.searchBarPhase;
  const phaseInfo = getPhaseInfo(currentPhase);
  const phaseColor = getPhaseColor(currentPhase);

  const handleConversationSelect = useCallback((conv: Conversation) => {
    setState(prev => ({
      ...prev,
      activeConversation: conv,
      searchBarPhase: conv.phase,
      searchBarQuery: '',
    }));
    if (widgetData) {
      sdk.setState({
        ...widgetData,
        activeConversation: conv,
        searchBarState: { ...widgetData.searchBarState, query: '', phase: conv.phase },
      });
    }
  }, [sdk, widgetData]);

  const handleSidebarToggle = useCallback(() => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
    if (widgetData) {
      sdk.setState({ ...widgetData, sidebarState: { ...widgetData.sidebarState, collapsed: !widgetData.sidebarState?.collapsed } });
    }
  }, [sdk, widgetData]);

  const handleSearchChange = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
    if (widgetData) {
      sdk.setState({ ...widgetData, sidebarState: { ...widgetData.sidebarState, searchQuery: query } });
    }
  }, [sdk, widgetData]);

  const handlePhaseFilterChange = useCallback((phase: number | null) => {
    setState(prev => ({ ...prev, phaseFilter: phase }));
    if (widgetData) {
      sdk.setState({ ...widgetData, sidebarState: { ...widgetData.sidebarState, phaseFilter: phase } });
    }
  }, [sdk, widgetData]);

  const handleSearchBarQueryChange = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchBarQuery: query }));
  }, []);

  const handleSearchBarPhaseChange = useCallback((phase: number) => {
    setState(prev => ({ ...prev, searchBarPhase: phase }));
  }, []);

  const handleSearchBarToolsToggle = useCallback(() => {
    setState(prev => ({ ...prev, searchBarShowTools: !prev.searchBarShowTools }));
  }, []);

  const handlePhaseToolClick = useCallback((toolName: string) => {
    console.log('Execute tool:', toolName, 'for phase', currentPhase);
    sdk.callTool(toolName, { phase: currentPhase });
  }, [currentPhase, sdk]);

  const handleSendMessage = useCallback(() => {
    if (!state.searchBarQuery.trim() || !conversation) return;
    console.log('Send message:', state.searchBarQuery);
    sdk.sendFollowUpMessage(state.searchBarQuery);
    setState(prev => ({ ...prev, searchBarQuery: '' }));
  }, [state.searchBarQuery, conversation, currentPhase, sdk]);

  const handleOverleafSync = useCallback(() => {
    console.log('Trigger full Overleaf sync');
    sdk.callTool('push_to_overleaf', { projectId: state.overleafProjectId, syncAll: true });
  }, [state.overleafProjectId, sdk]);

  const handleOverleafExport = useCallback(() => {
    console.log('Export Overleaf ZIP');
    sdk.callTool('export_overleaf_zip', { projectId: state.overleafProjectId });
  }, [state.overleafProjectId, sdk]);

  const handleNewConversation = useCallback(() => {
    console.log('New conversation');
    sdk.sendFollowUpMessage('Start a new research session');
  }, [sdk]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: maxHeight ?? undefined,
        width: '100%',
        backgroundColor: DESIGN.colors.bg,
        fontFamily: DESIGN.fonts.sans,
        color: DESIGN.colors.fg,
        overflow: 'hidden',
      }}
    >
      {/* Global Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.lg}px`,
          backgroundColor: DESIGN.colors.bgElevated,
          borderBottom: `1px solid ${DESIGN.colors.border}`,
          height: 48,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.md }}>
          <Button variant="ghost" size="sm" onClick={handleSidebarToggle} style={{ padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </Button>
          <div style={{
            width: 32, height: 32, borderRadius: DESIGN.radius.md,
            background: `linear-gradient(135deg, ${DESIGN.colors.amber}, ${DESIGN.colors.amberDim})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0d12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: DESIGN.colors.fg, margin: 0, lineHeight: 1.2 }}>
              ScholarPilot
            </h1>
            <span style={{ fontSize: 10, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>
              Research Pilot Shell
            </span>
          </div>
          {conversation && (
            <>
              <Separator orientation="vertical" style={{ height: 24, margin: '0 8px' }} />
              <PhaseBadge phase={conversation.phase} size="sm" />
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm }}>
          {/* Phase Navigator */}
          <div style={{ display: 'flex', gap: DESIGN.spacing.xs }}>
            {PHASE_GROUPS.flatMap(g => g.phases).map(p => (
              <Button
                key={p.id}
                variant={currentPhase === p.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleSearchBarPhaseChange(p.id)}
                style={{
                  padding: '4px 8px', fontSize: 10,
                  borderColor: getPhaseColor(p.id),
                  color: currentPhase === p.id ? DESIGN.colors.bg : getPhaseColor(p.id),
                  backgroundColor: currentPhase === p.id ? getPhaseColor(p.id) : 'transparent',
                }}
              >
                P{p.id}
              </Button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={() => console.log('Settings')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {!state.sidebarCollapsed && (
          <aside
            style={{
              width: 360,
              minWidth: 320,
              maxWidth: 420,
              backgroundColor: DESIGN.colors.bg,
              borderRight: `1px solid ${DESIGN.colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <ChatHistorySidebarWidget
              conversations={MOCK_CONVERSATIONS}
              activeConversation={state.activeConversation}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              searchQuery={state.searchQuery}
              setSearchQuery={handleSearchChange}
              phaseFilter={state.phaseFilter}
              setPhaseFilter={handlePhaseFilterChange}
            />
          </aside>
        )}

        {/* Main Content Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Phase Search Bar */}
          <div style={{ borderBottom: `1px solid ${DESIGN.colors.border}`, flexShrink: 0 }}>
            <PhaseSearchBarWidget
              currentPhase={state.searchBarPhase}
              onPhaseChange={handleSearchBarPhaseChange}
              onToolClick={handlePhaseToolClick}
              onSearch={(query, phase) => console.log('Search:', query, phase)}
            />
          </div>

          {/* Conversation View */}
          <div style={{ flex: 1, overflowY: 'auto', padding: DESIGN.spacing.lg, display: 'flex', flexDirection: 'column' }}>
            {conversation ? (
              <>
                {/* Conversation Header */}
                <div style={{ marginBottom: DESIGN.spacing.lg, paddingBottom: DESIGN.spacing.md, borderBottom: `1px solid ${DESIGN.colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: DESIGN.spacing.md, marginBottom: DESIGN.spacing.sm }}>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: DESIGN.colors.fg, margin: 0, lineHeight: 1.3 }}>
                        {conversation.title}
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm, marginTop: DESIGN.spacing.xs, flexWrap: 'wrap' }}>
                        <PhaseBadge phase={conversation.phase} size="md" />
                        <StatusDot status={conversation.status} size={8} />
                        <span style={{ fontSize: 11, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>
                          {conversation.papers} papers • {conversation.gapsFound} gaps • {conversation.messages.length} messages
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: DESIGN.spacing.xs }}>
                      <Button variant="secondary" size="sm" onClick={handleOverleafSync}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Sync to Overleaf
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => console.log('Draft paper')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        Draft Paper
                      </Button>
                    </div>
                  </div>

                  {conversation.currentGap && (
                    <div style={{
                      padding: DESIGN.spacing.md,
                      backgroundColor: `${phaseColor}15`,
                      border: `1px solid ${phaseColor}40`,
                      borderRadius: DESIGN.radius.md,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.xs, marginBottom: DESIGN.spacing.xs }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={phaseColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span style={{ fontSize: 11, fontWeight: 600, color: phaseColor, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: DESIGN.fonts.mono }}>
                          Current Research Gap
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: DESIGN.colors.fg, margin: 0, lineHeight: 1.5 }}>
                        {conversation.currentGap}
                      </p>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.md, flex: 1 }}>
                  {currentMessages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: DESIGN.spacing.xl }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  backgroundColor: `${DESIGN.colors.amber}20`,
                  border: `1px solid ${DESIGN.colors.amber}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: DESIGN.spacing.lg,
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={DESIGN.colors.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: DESIGN.colors.fg, margin: '0 0 8px' }}>
                  Welcome to ScholarPilot
                </h2>
                <p style={{ fontSize: 14, color: DESIGN.colors.fgMuted, margin: 0, maxWidth: 400, lineHeight: 1.6 }}>
                  Select a conversation from the sidebar or start a new research session to begin your literature review workflow.
                </p>
                <Button variant="primary" size="lg" onClick={handleNewConversation} style={{ marginTop: DESIGN.spacing.lg }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Start New Research Session
                </Button>
              </div>
            )}

          {/* Composer */}
          {conversation && (
            <div style={{
              padding: DESIGN.spacing.lg,
              borderTop: `1px solid ${DESIGN.colors.border}`,
              backgroundColor: DESIGN.colors.bgElevated,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: DESIGN.spacing.sm, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    placeholder={`Ask about Phase ${currentPhase}: ${phaseInfo?.name}... (type tool name to run directly)`}
                    value={state.searchBarQuery}
                    onChange={(e) => handleSearchBarQueryChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    style={{ fontSize: 13 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm, marginTop: DESIGN.spacing.xs }}>
                    <Badge variant="info" size="sm" style={{ fontSize: 9 }}>P{currentPhase} · {phaseInfo?.name}</Badge>
                    <Button variant="ghost" size="sm" onClick={handleSearchBarToolsToggle} style={{ padding: '4px 8px', fontSize: 10 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                      </svg>
                      Tools
                    </Button>
                    <span style={{ fontSize: 10, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>
                      Enter to send · Shift+Enter for newline
                    </span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSendMessage}
                  disabled={!state.searchBarQuery.trim()}
                  style={{ padding: '10px 20px', fontSize: 13, height: 'fit-content' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </Button>
              </div>
            </div>
          )}

          </div>

          {/* Overleaf Flow Button */}
          <OverleafFlowButtonWidget
            projectId={state.overleafProjectId}
            status={state.overleafStatus}
            onSync={handleOverleafSync}
            onExport={handleOverleafExport}
          />
        </main>
      </div>
    </div>
  );
}