'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme, useWidgetSDK, useWidgetState, useMaxHeight } from '@nitrostack/widgets';
import { DESIGN, PHASE_GROUPS, getPhaseColor, getPhaseInfo, ALL_PHASES, getPhaseGroup } from '../components/design-tokens';
import { PhaseBadge, ToolChip, StatusDot, Card, Input, Button, Badge, Separator } from '../components/ui';

interface Conversation {
  id: string;
  title: string;
  topic: string;
  phase: number;
  status: 'idle' | 'in-progress' | 'completed' | 'review' | 'error';
  messages: number;
  lastMessage: string;
  updatedAt: string;
  papers: number;
  gapsFound: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  phase: number;
  tool?: string;
}

interface WidgetData {
  conversations: Conversation[];
  activeConversation: string | null;
  searchQuery: string;
  phaseFilter: number | null;
  [key: string]: unknown;
}

interface WidgetState {
  conversations: Conversation[];
  activeConversation: string | null;
  searchQuery: string;
  phaseFilter: number | null;
  selectedConversation: Conversation | null;
  expandedConversation: string | null;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-001',
    title: 'Federated Learning Privacy Research',
    topic: 'federated learning privacy',
    phase: 6,
    status: 'completed',
    messages: 24,
    lastMessage: 'Final verdict: PASS — Adaptive DP with dynamic budget allocation',
    updatedAt: '2026-07-25T22:30:00Z',
    papers: 14,
    gapsFound: 5,
  },
  {
    id: 'conv-002',
    title: 'Efficient Attention for Long Sequences',
    topic: 'linear attention mechanisms',
    phase: 3,
    status: 'in-progress',
    messages: 12,
    lastMessage: 'Clustering complete — 5 clusters identified across 18 papers',
    updatedAt: '2026-07-25T18:15:00Z',
    papers: 18,
    gapsFound: 3,
  },
  {
    id: 'conv-003',
    title: 'Byzantine-Robust FL Aggregation',
    topic: 'byzantine federated learning',
    phase: 4,
    status: 'review',
    messages: 18,
    lastMessage: 'Gap proposed: Unified Byzantine+DP framework with formal composition',
    updatedAt: '2026-07-24T14:20:00Z',
    papers: 11,
    gapsFound: 2,
  },
  {
    id: 'conv-004',
    title: 'Cross-Domain Analogues for FL',
    topic: 'cross-domain federated learning',
    phase: 7,
    status: 'completed',
    messages: 8,
    lastMessage: 'Found 3 analogies: gossip protocols, consensus, epidemic modeling',
    updatedAt: '2026-07-23T10:00:00Z',
    papers: 6,
    gapsFound: 1,
  },
  {
    id: 'conv-005',
    title: 'Technical Parameters: GPU Clusters',
    topic: 'distributed training hardware',
    phase: 8,
    status: 'in-progress',
    messages: 5,
    lastMessage: 'Extracting parameters from 12 hardware papers',
    updatedAt: '2026-07-22T16:45:00Z',
    papers: 12,
    gapsFound: 0,
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  'conv-001': [
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
  'conv-002': [
    { id: 'msg-1', role: 'user', content: 'Find papers on linear attention and efficient transformers', timestamp: '2026-07-25T18:00:00Z', phase: 1 },
    { id: 'msg-2', role: 'assistant', content: 'Found 18 papers covering FlashAttention, Linear Attention, Performer, Reformer, and more.', timestamp: '2026-07-25T18:00:30Z', phase: 1, tool: 'search_papers' },
    { id: 'msg-3', role: 'user', content: 'Score relevance for long sequence modeling (>4k tokens)', timestamp: '2026-07-25T18:05:00Z', phase: 1 },
    { id: 'msg-4', role: 'assistant', content: 'Scored 18 papers. Top: FlashAttention-2 (95), Linear Attention (89), Performer (82).', timestamp: '2026-07-25T18:06:00Z', phase: 1, tool: 'score_paper_relevance' },
    { id: 'msg-5', role: 'user', content: 'Extract claims from top 10 papers', timestamp: '2026-07-25T18:10:00Z', phase: 2 },
    { id: 'msg-6', role: 'assistant', content: 'Extracted 34 claims. Methods: 14, Findings: 10, Limitations: 6, Assumptions: 4.', timestamp: '2026-07-25T18:11:30Z', phase: 2, tool: 'extract_paper_claims' },
    { id: 'msg-7', role: 'user', content: 'Cluster by methodology type', timestamp: '2026-07-25T18:15:00Z', phase: 3 },
  ],
  'conv-003': [
    { id: 'msg-1', role: 'user', content: 'Search for Byzantine-robust federated learning aggregation', timestamp: '2026-07-24T14:00:00Z', phase: 1 },
    { id: 'msg-2', role: 'assistant', content: 'Found 11 papers on Krum, Trimmed Mean, Median, Bulyan, and recent variants.', timestamp: '2026-07-24T14:00:45Z', phase: 1, tool: 'search_papers' },
    { id: 'msg-3', role: 'user', content: 'Extract claims and find contradictions', timestamp: '2026-07-24T14:05:00Z', phase: 2 },
    { id: 'msg-4', role: 'assistant', content: '28 claims extracted. 3 contradictions around convergence guarantees under non-IID data.', timestamp: '2026-07-24T14:07:00Z', phase: 3, tool: 'find_contradictory_claims' },
    { id: 'msg-5', role: 'user', content: 'Propose gap: Byzantine + DP combined', timestamp: '2026-07-24T14:10:00Z', phase: 4 },
    { id: 'msg-6', role: 'assistant', content: 'Proposed 2 gaps. Top: Unified Byzantine+DP framework with formal composition (novelty 82, feasibility 75, impact 85).', timestamp: '2026-07-24T14:12:00Z', phase: 4, tool: 'propose_gap' },
    { id: 'msg-7', role: 'user', content: 'Run adversarial review', timestamp: '2026-07-24T14:15:00Z', phase: 5 },
    { id: 'msg-8', role: 'assistant', content: 'Iteration 1 OBJECTION: Composition theorem assumptions may not hold. Iteration 2: Under review...', timestamp: '2026-07-24T14:18:00Z', phase: 5, tool: 'run_gap_review_cycle' },
  ],
  'conv-004': [
    { id: 'msg-1', role: 'user', content: 'Find cross-domain analogies for federated learning privacy', timestamp: '2026-07-23T09:30:00Z', phase: 7 },
    { id: 'msg-2', role: 'assistant', content: 'Searching domains: distributed systems, epidemiology, cryptography, game theory...', timestamp: '2026-07-23T09:31:00Z', phase: 7, tool: 'find_cross_domain_analogs' },
    { id: 'msg-3', role: 'assistant', content: 'Found 3 analogies: 1) Gossip protocols (epidemic spread), 2) Byzantine consensus (fault tolerance), 3) Differential privacy (epidemic privacy).', timestamp: '2026-07-23T09:35:00Z', phase: 7, tool: 'find_cross_domain_analogs' },
    { id: 'msg-4', role: 'user', content: 'Verify technique match for gossip protocols', timestamp: '2026-07-23T09:40:00Z', phase: 7 },
    { id: 'msg-5', role: 'assistant', content: 'Gossip protocols transferable: probabilistic dissemination matches FL round structure. Match confidence: 88%.', timestamp: '2026-07-23T09:42:00Z', phase: 7, tool: 'verify_technique_match' },
  ],
  'conv-005': [
    { id: 'msg-1', role: 'user', content: 'Extract technical parameters for distributed GPU training', timestamp: '2026-07-22T16:30:00Z', phase: 8 },
    { id: 'msg-2', role: 'assistant', content: 'Scanning 12 papers for hardware specs, bandwidth, cluster topology...', timestamp: '2026-07-22T16:31:00Z', phase: 8, tool: 'fetch_and_extract_tech_params' },
    { id: 'msg-3', role: 'assistant', content: 'Extracted from 8 papers. Common: 8xA100, NVLink, 400Gbps InfiniBand, 1-2TB model sizes.', timestamp: '2026-07-22T16:38:00Z', phase: 8, tool: 'extract_technical_parameters' },
    { id: 'msg-4', role: 'user', content: 'Compare parameters across papers', timestamp: '2026-07-22T16:40:00Z', phase: 8 },
    { id: 'msg-5', role: 'assistant', content: 'Parameter comparison complete. Key variance: Interconnect topology (NVLink vs InfiniBand) drives 2-3x throughput difference.', timestamp: '2026-07-22T16:45:00Z', phase: 8, tool: 'compare_technical_parameters' },
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

function getStatusColor(status: Conversation['status']) {
  switch (status) {
    case 'completed': return DESIGN.colors.green;
    case 'in-progress': return DESIGN.colors.blue;
    case 'review': return DESIGN.colors.phaseStretch;
    case 'error': return DESIGN.colors.red;
    default: return DESIGN.colors.fgDim;
  }
}

function ConversationCard({ conversation, isActive, isExpanded, onClick, onToggleExpand }: {
  conversation: Conversation;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggleExpand: () => void;
}) {
  const phaseInfo = getPhaseInfo(conversation.phase);
  const phaseColor = getPhaseColor(conversation.phase);
  const statusColor = getStatusColor(conversation.status);

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
          marginTop: 3,
          flexShrink: 0,
          boxShadow: `0 0 8px ${statusColor}`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: DESIGN.spacing.sm, marginBottom: DESIGN.spacing.xs }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: DESIGN.colors.fg, margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conversation.title}
            </h4>
            <span style={{ fontSize: 10, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono, flexShrink: 0 }}>
              {formatTime(conversation.updatedAt)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm, marginBottom: DESIGN.spacing.xs, flexWrap: 'wrap' }}>
            <PhaseBadge phase={conversation.phase} size="sm" />
            <StatusDot status={conversation.status} size={6} />
          </div>
          <p style={{ fontSize: 11, color: DESIGN.colors.fgMuted, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {conversation.lastMessage}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          style={{ padding: '2px 6px', fontSize: 10 }}
        >
          {isExpanded ? '▲' : '▼'}
        </Button>
      </div>
    </Card>
  );
}

function MessagePreview({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div style={{ display: 'flex', gap: DESIGN.spacing.sm, alignItems: 'flex-start', marginBottom: DESIGN.spacing.sm }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        backgroundColor: isUser ? DESIGN.colors.amber : DESIGN.colors.blue,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
      }}>
        {isUser ? 'U' : 'A'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.xs, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: DESIGN.colors.fg, fontFamily: DESIGN.fonts.mono }}>
            {isUser ? 'User' : 'ScholarPilot'}
          </span>
          {message.tool && (
            <ToolChip name={message.tool} phase={message.phase} size="sm" />
          )}
          {message.phase !== undefined && (
            <PhaseBadge phase={message.phase} size="sm" />
          )}
          <span style={{ fontSize: 9, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>
            {formatTime(message.timestamp)}
          </span>
        </div>
        <p style={{ fontSize: 11, color: DESIGN.colors.fgMuted, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {message.content}
        </p>
      </div>
    </div>
  );
}

export default function ChatHistorySidebar() {
  const theme = useTheme();
  const sdk = useWidgetSDK();
  const [widgetData] = useWidgetState<WidgetData>();
  const maxHeight = useMaxHeight();
  const [state, setState] = useState<WidgetState>({
    conversations: MOCK_CONVERSATIONS,
    activeConversation: null,
    searchQuery: '',
    phaseFilter: null,
    selectedConversation: null,
    expandedConversation: null,
  });

  useEffect(() => {
    if (widgetData) {
      setState(prev => ({
        ...prev,
        conversations: widgetData.conversations || prev.conversations,
        activeConversation: widgetData.activeConversation ?? prev.activeConversation,
        searchQuery: widgetData.searchQuery || prev.searchQuery,
        phaseFilter: widgetData.phaseFilter ?? prev.phaseFilter,
      }));
    }
  }, [widgetData]);

  const filteredConversations = useMemo(() => {
    let result = state.conversations;

    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.topic.toLowerCase().includes(query) ||
        c.lastMessage.toLowerCase().includes(query)
      );
    }

    if (state.phaseFilter !== null) {
      result = result.filter(c => c.phase === state.phaseFilter);
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [state.conversations, state.searchQuery, state.phaseFilter]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, searchQuery: e.target.value }));
    if (widgetData) {
      sdk.setState({ ...widgetData, searchQuery: e.target.value });
    }
  }, [sdk, widgetData]);

  const handlePhaseFilterChange = useCallback((phase: number | null) => {
    setState(prev => ({ ...prev, phaseFilter: phase }));
    if (widgetData) {
      sdk.setState({ ...widgetData, phaseFilter: phase });
    }
  }, [sdk, widgetData]);

  const handleConversationClick = useCallback((conversation: Conversation) => {
    setState(prev => ({
      ...prev,
      activeConversation: conversation.id,
      selectedConversation: conversation,
      expandedConversation: prev.expandedConversation === conversation.id ? null : conversation.id,
    }));
    if (widgetData) {
      sdk.setState({ ...widgetData, activeConversation: conversation.id });
    }
    sdk.callTool('conversation_selected', { conversation });
  }, [sdk, widgetData]);

  const handleToggleExpand = useCallback((conversationId: string) => {
    setState(prev => ({
      ...prev,
      expandedConversation: prev.expandedConversation === conversationId ? null : conversationId,
    }));
  }, []);

  const handleNewConversation = useCallback(() => {
    sdk.sendFollowUpMessage('Start a new research session');
  }, [sdk]);

  const selectedMessages = state.selectedConversation
    ? MOCK_MESSAGES[state.selectedConversation.id] || []
    : [];

  const activePhaseGroups = useMemo(() => {
    const groupIds = new Set<string>();
    state.conversations.forEach(c => {
      const group = getPhaseGroup(c.phase);
      if (group) groupIds.add(group.groupId);
    });
    return Array.from(groupIds).sort((a, b) => {
      const idxA = PHASE_GROUPS.findIndex(g => g.groupId === a);
      const idxB = PHASE_GROUPS.findIndex(g => g.groupId === b);
      return idxA - idxB;
    });
  }, [state.conversations]);

  const phaseColors: Record<string, string> = {
    intake: DESIGN.colors.phaseCore,
    analysis: DESIGN.colors.phaseCore,
    stretch: DESIGN.colors.phaseStretch,
    export: DESIGN.colors.phaseExport,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: maxHeight ?? undefined,
        width: '100%',
        maxWidth: 420,
        backgroundColor: DESIGN.colors.bg,
        color: DESIGN.colors.fg,
        fontFamily: DESIGN.fonts.sans,
        overflow: 'hidden',
      }}
    >
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
            {filteredConversations.length} / {state.conversations.length}
          </Badge>
        </div>
        <Input
          placeholder="Search conversations..."
          value={state.searchQuery}
          onChange={handleSearchChange}
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
            variant={state.phaseFilter === null ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handlePhaseFilterChange(null)}
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
                variant={state.phaseFilter === phaseNum ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handlePhaseFilterChange(phaseNum)}
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  backgroundColor: state.phaseFilter === phaseNum ? phaseColors[groupName as keyof typeof PHASE_GROUPS] : undefined,
                  borderColor: state.phaseFilter === phaseNum ? phaseColors[groupName as keyof typeof PHASE_GROUPS] : undefined,
                  color: state.phaseFilter === phaseNum ? '#0a0d12' : undefined,
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
            <p style={{ margin: DESIGN.spacing.xs, fontSize: 11, color: DESIGN.colors.fgMuted }}>
              {state.searchQuery ? 'Try adjusting your search' : 'Start a new research session'}
            </p>
          </div>
        ) : (
          <>
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                isActive={state.activeConversation === conversation.id}
                isExpanded={state.expandedConversation === conversation.id}
                onClick={() => handleConversationClick(conversation)}
                onToggleExpand={() => handleToggleExpand(conversation.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* Message Preview Panel */}
      {state.selectedConversation && selectedMessages.length > 0 && (
        <div style={{
          borderTop: `1px solid ${DESIGN.colors.border}`,
          backgroundColor: DESIGN.colors.bgElevated,
          maxHeight: 300,
          overflowY: 'auto',
        }}>
          <div style={{
            padding: DESIGN.spacing.sm,
            borderBottom: `1px solid ${DESIGN.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: DESIGN.colors.fg, margin: 0 }}>
              Messages ({selectedMessages.length})
            </h3>
            <PhaseBadge phase={state.selectedConversation.phase} size="sm" />
          </div>
          <div style={{ padding: DESIGN.spacing.sm }}>
            {selectedMessages.map((message) => (
              <MessagePreview key={message.id} message={message} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: DESIGN.spacing.md,
        borderTop: `1px solid ${DESIGN.colors.border}`,
        backgroundColor: DESIGN.colors.bgElevated,
      }}>
        <Button
          variant="default"
          size="sm"
          onClick={handleNewConversation}
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
}