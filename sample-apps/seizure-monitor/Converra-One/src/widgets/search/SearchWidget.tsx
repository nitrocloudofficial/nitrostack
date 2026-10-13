'use client';

import React, { useState } from 'react';
import { MOCK_MESSAGES, MOCK_TASKS, MOCK_EVENTS } from '../mockData';
import { PlatformType } from '../../shared/enums/platform.enum';

export interface SearchWidgetProps {
  onOpenMessage?: (messageId: string) => void;
}

interface DemoSearchResultItem {
  id: string;
  platform: PlatformType;
  platformIcon: string;
  sender: string;
  subject: string;
  snippet: string;
  relevanceScore: number;
  timestamp: string;
}

function formatTimeString(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export const SearchWidget: React.FC<SearchWidgetProps> = ({ onOpenMessage }) => {
  const [query, setQuery] = useState<string>('What did my professor say about the project?');
  const [activeQuery, setActiveQuery] = useState<string>('What did my professor say about the project?');

  const sampleQueries = [
    'What did my professor say about the project?',
    'Show memory leak discussion on worker node 3',
    'Find Figma tokens updated by Marcus',
    'List all urgent tasks due today'
  ];

  const getPlatformIcon = (platform: PlatformType): string => {
    switch (platform) {
      case PlatformType.GMAIL: return '✉️';
      case PlatformType.SLACK: return '💬';
      case PlatformType.GITHUB: return '🐙';
      case PlatformType.DISCORD: return '🎮';
      case PlatformType.NOTION: return '📝';
      case PlatformType.CALENDAR: return '📅';
      default: return '💬';
    }
  };

  const performDemoSearch = (searchQuery: string) => {
    const qLower = searchQuery.toLowerCase().trim();
    const terms = qLower.split(/\s+/).filter(Boolean);

    const matches: DemoSearchResultItem[] = [];

    // Search in demo messages
    MOCK_MESSAGES.forEach((msg) => {
      const fullText = `${msg.subject} ${msg.content} ${msg.sender.name} ${msg.sender.email} ${msg.tags?.join(' ')} ${msg.platform}`.toLowerCase();
      let matchCount = 0;

      if (terms.length === 0) {
        matchCount = 1;
      } else {
        terms.forEach((term) => {
          if (fullText.includes(term)) matchCount++;
        });
      }

      if (matchCount > 0) {
        const score = terms.length > 0 ? Math.min(0.99, 0.70 + (matchCount / terms.length) * 0.28) : 0.85;
        matches.push({
          id: msg.id,
          platform: msg.platform,
          platformIcon: getPlatformIcon(msg.platform),
          sender: `${msg.sender.name} (${msg.sender.email || msg.sender.id})`,
          subject: msg.subject || '',
          snippet: msg.content.length > 140 ? `${msg.content.substring(0, 140)}...` : msg.content,
          relevanceScore: parseFloat(score.toFixed(2)),
          timestamp: formatTimeString(msg.timestamp)
        });
      }
    });

    // Search in demo tasks if relevant
    if (qLower.includes('task') || qLower.includes('urgent') || qLower.includes('due') || qLower.includes('raft') || qLower.includes('node')) {
      MOCK_TASKS.forEach((t) => {
        if (!matches.some(m => m.id === t.sourceMessageId)) {
          matches.push({
            id: t.sourceMessageId || t.id,
            platform: t.sourcePlatform || PlatformType.GMAIL,
            platformIcon: getPlatformIcon(t.sourcePlatform || PlatformType.GMAIL),
            sender: `Assignee: ${t.assignee}`,
            subject: `[Task] ${t.title}`,
            snippet: t.description || '',
            relevanceScore: 0.90,
            timestamp: formatTimeString(t.createdAt)
          });
        }
      });
    }

    // Search in demo events
    if (qLower.includes('meeting') || qLower.includes('call') || qLower.includes('schedule') || qLower.includes('prof') || qLower.includes('vance')) {
      MOCK_EVENTS.forEach((e) => {
        matches.push({
          id: 'msg-101',
          platform: PlatformType.CALENDAR,
          platformIcon: '📅',
          sender: e.organizer?.name || 'Unknown',
          subject: `[Event] ${e.title}`,
          snippet: `${e.description || ''} (${e.location || ''})`,
          relevanceScore: 0.95,
          timestamp: formatTimeString(e.startTime)
        });
      });
    }

    // Sort by relevance score descending
    matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Generate dynamic AI synthesized answer
    let synthesizedAnswer = '';
    if (qLower.includes('prof') || qLower.includes('project') || qLower.includes('vance')) {
      synthesizedAnswer = 'Dr. Evelyn Vance sent an urgent email regarding your CS340 Final Project Architecture Blueprint. She requested adjusting the Raft consensus layer timeout parameters in section 4.2 before a 15-minute review call scheduled for today at 3:00 PM.';
    } else if (qLower.includes('memory') || qLower.includes('node') || qLower.includes('leak') || qLower.includes('3')) {
      synthesizedAnswer = 'Sarah Chen (Lead Architect) reported in #engineering-core that the NitroStack v1.4 release candidate encountered a garbage collection memory leak on worker node 3 during stress testing. She requested your review of GC parameters in PR #342.';
    } else if (qLower.includes('figma') || qLower.includes('marcus') || qLower.includes('token') || qLower.includes('design')) {
      synthesizedAnswer = 'Marcus Brody updated the Figma design tokens for dark glassmorphism gradients and frosted card highlights. Details are posted in the #design-system Discord channel.';
    } else if (qLower.includes('task') || qLower.includes('due') || qLower.includes('urgent')) {
      synthesizedAnswer = `Found ${MOCK_TASKS.length} pending items across your channels: 1 URGENT task (Raft consensus parameters for Prof. Vance), 1 HIGH priority item (NitroStack PR #342 memory leak), and 1 Notion deliverable due tomorrow.`;
    } else if (matches.length > 0) {
      synthesizedAnswer = `Scanned ${MOCK_MESSAGES.length} cross-platform communications across Gmail, Slack, GitHub, Discord, and Notion. Found ${matches.length} matching conversations relevant to "${searchQuery}". Top match: "${matches[0].subject}" from ${matches[0].sender}.`;
    } else {
      synthesizedAnswer = `No exact matches found for "${searchQuery}". Showing standard workspace priority items and active communications from your connected channels.`;
    }

    return { matches: matches.length > 0 ? matches : MOCK_MESSAGES.map(msg => ({
      id: msg.id,
      platform: msg.platform,
      platformIcon: getPlatformIcon(msg.platform),
      sender: `${msg.sender.name} (${msg.sender.email || msg.sender.id})`,
      subject: msg.subject,
      snippet: msg.content.substring(0, 140) + '...',
      relevanceScore: 0.75,
      timestamp: 'Today'
    })), synthesizedAnswer };
  };

  const searchResults = performDemoSearch(activeQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setActiveQuery(query);
    }
  };

  const handlePromptClick = (promptText: string) => {
    setQuery(promptText);
    setActiveQuery(promptText);
  };

  return (
    <div
      style={{
        background: 'rgba(19, 25, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '20px',
        padding: '24px',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>🔍</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
            Conversational AI Search & Knowledge Engine
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Powered by Search Agent • Hybrid Vector & Keyword Search across Gmail, Slack, Discord, GitHub, Notion
          </p>
        </div>
      </div>

      {/* Natural Language Input */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your emails, Slack threads, GitHub PRs..."
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '12px',
              padding: '14px 18px',
              color: '#f8fafc',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.15)'
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '0 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
          }}
        >
          Search AI
        </button>
      </form>

      {/* Suggested Quick Prompts */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>Suggested:</span>
        {sampleQueries.map((q) => (
          <button
            key={q}
            onClick={() => handlePromptClick(q)}
            style={{
              background: activeQuery === q ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: activeQuery === q ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '4px 12px',
              color: activeQuery === q ? '#38bdf8' : '#94a3b8',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            &quot;{q}&quot;
          </button>
        ))}
      </div>

      {/* Search Results Display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Synthesized Answer Box */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: '14px',
            padding: '18px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>💡</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                AI Synthesized Answer
              </span>
            </div>
            <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', padding: '2px 8px', borderRadius: '10px', fontFamily: 'monospace' }}>
              🤖 Search Agent (0.04s)
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', lineHeight: 1.6 }}>
            {searchResults.synthesizedAnswer}
          </p>
        </div>

        {/* Sources Section */}
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            Primary Sources & Citations ({searchResults.matches.length} Matches)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {searchResults.matches.map((src) => (
              <div
                key={`${src.id}-${src.subject}`}
                onClick={() => onOpenMessage && onOpenMessage(src.id)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{src.platformIcon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                      {src.subject}
                    </span>
                    <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '1px 6px', borderRadius: '4px' }}>
                      {(src.relevanceScore * 100).toFixed(0)}% Match
                    </span>
                    <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.06)', color: '#94a3b8', padding: '1px 6px', borderRadius: '4px' }}>
                      {src.platform}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    From: {src.sender} • {src.timestamp}
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', fontStyle: 'italic' }}>
                    {src.snippet}
                  </div>
                </div>

                <button
                  style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38bdf8',
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  View Thread
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

