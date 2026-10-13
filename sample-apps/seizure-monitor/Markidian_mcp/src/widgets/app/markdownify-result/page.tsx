'use client';

import React, { useState } from 'react';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface MarkdownifyData {
  text: string;
  title?: string;
  type?: string;
  url?: string;
  filepath?: string;
  path?: string;
  branch?: string;
  compress?: boolean;
}

export default function MarkdownifyResult() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [activeTab, setActiveTab] = useState<'preview' | 'raw' | 'details'>('preview');
  const [copied, setCopied] = useState(false);

  const data = getToolOutput<MarkdownifyData>();

  const isDark = theme === 'dark';

  if (!data || !data.text) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#94a3b8' : '#64748b',
        borderRadius: '16px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔄</div>
        <div>Loading Markdownify Output...</div>
      </div>
    );
  }

  const text = data.text || '';
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text.split('\n').length;

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'youtube': return '📺';
      case 'pdf': return '📄';
      case 'bing-search': return '🔍';
      case 'webpage': return '🌐';
      case 'image': return '🖼️';
      case 'audio': return '🎵';
      case 'docx': return '📝';
      case 'xlsx': return '📊';
      case 'pptx': return '📽️';
      case 'git-repo': return '📦';
      default: return '📄';
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'youtube': return 'YouTube Video';
      case 'pdf': return 'PDF Document';
      case 'bing-search': return 'Bing Search';
      case 'webpage': return 'Webpage';
      case 'image': return 'Image';
      case 'audio': return 'Audio Transcript';
      case 'docx': return 'DOCX Document';
      case 'xlsx': return 'XLSX Spreadsheet';
      case 'pptx': return 'PPTX Presentation';
      case 'git-repo': return 'Git Repository';
      default: return 'Markdown Content';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.type || 'converted')}_markdown.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Basic markdown renderer for preview tab
  const renderFormattedMarkdown = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} style={{ fontSize: '22px', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', paddingBottom: '6px', margin: '16px 0 8px' }}>{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} style={{ fontSize: '18px', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', paddingBottom: '4px', margin: '14px 0 6px' }}>{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} style={{ fontSize: '16px', margin: '12px 0 4px' }}>{line.slice(4)}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} style={{ marginLeft: '20px', marginBottom: '4px' }}>{line.slice(2)}</li>;
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} style={{
            borderLeft: '4px solid #6366f1',
            margin: '8px 0',
            paddingLeft: '12px',
            color: isDark ? '#cbd5e1' : '#475569',
            fontStyle: 'italic'
          }}>
            {line.slice(2)}
          </blockquote>
        );
      }
      if (line.startsWith('```')) {
        return (
          <div key={idx} style={{
            background: isDark ? '#0f172a' : '#1e293b',
            color: '#f8fafc',
            padding: '4px 8px',
            borderRadius: '4px 4px 0 0',
            fontSize: '11px',
            fontFamily: 'monospace',
            opacity: 0.8
          }}>
            {line.slice(3) || 'code'}
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} style={{ height: '8px' }} />;
      }
      return <p key={idx} style={{ margin: '4px 0', lineHeight: '1.6' }}>{line}</p>;
    });
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: isDark
        ? 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
      color: isDark ? '#f8fafc' : '#0f172a',
      borderRadius: '16px',
      padding: '20px',
      maxWidth: '700px',
      boxShadow: isDark
        ? '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)'
        : '0 12px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
      transition: 'all 0.3s ease'
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        paddingBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '24px',
            background: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
            padding: '8px 12px',
            borderRadius: '12px'
          }}>
            {getTypeIcon(data.type)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              {data.title || getTypeLabel(data.type)}
            </h2>
            <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
              {getTypeLabel(data.type)} • {wordCount} words ({charCount} chars)
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: copied ? '#22c55e' : (isDark ? '#334155' : '#e2e8f0'),
              color: copied ? '#ffffff' : (isDark ? '#f8fafc' : '#0f172a'),
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button
            onClick={handleDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            📥 Download
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{
        display: 'flex',
        gap: '6px',
        background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)',
        padding: '4px',
        borderRadius: '10px',
        marginBottom: '16px'
      }}>
        <button
          onClick={() => setActiveTab('preview')}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '7px',
            border: 'none',
            background: activeTab === 'preview' ? (isDark ? '#334155' : '#ffffff') : 'transparent',
            color: activeTab === 'preview' ? (isDark ? '#f8fafc' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b'),
            fontWeight: activeTab === 'preview' ? 600 : 400,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: activeTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          👁️ Preview
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '7px',
            border: 'none',
            background: activeTab === 'raw' ? (isDark ? '#334155' : '#ffffff') : 'transparent',
            color: activeTab === 'raw' ? (isDark ? '#f8fafc' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b'),
            fontWeight: activeTab === 'raw' ? 600 : 400,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: activeTab === 'raw' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          💻 Raw Markdown
        </button>
        <button
          onClick={() => setActiveTab('details')}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '7px',
            border: 'none',
            background: activeTab === 'details' ? (isDark ? '#334155' : '#ffffff') : 'transparent',
            color: activeTab === 'details' ? (isDark ? '#f8fafc' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b'),
            fontWeight: activeTab === 'details' ? 600 : 400,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: activeTab === 'details' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          ℹ️ Info & Source
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{
        background: isDark ? '#0f172a' : '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
        maxHeight: '360px',
        overflowY: 'auto'
      }}>
        {activeTab === 'preview' && (
          <div>
            {renderFormattedMarkdown(text)}
          </div>
        )}

        {activeTab === 'raw' && (
          <pre style={{
            margin: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: isDark ? '#e2e8f0' : '#334155'
          }}>
            {text}
          </pre>
        )}

        {activeTab === 'details' && (
          <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Converter Type:</span>
              <span>{getTypeLabel(data.type)}</span>
            </div>
            {data.url && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Source URL:</span>
                <a href={data.url} target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'underline', wordBreak: 'break-all' }}>
                  {data.url}
                </a>
              </div>
            )}
            {(data.filepath || data.path) && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>File Path:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                  {data.filepath || data.path}
                </span>
              </div>
            )}
            {data.branch && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Git Branch:</span>
                <span>{data.branch}</span>
              </div>
            )}
            {data.compress !== undefined && (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Tree-sitter:</span>
                <span>{data.compress ? '⚡ Compressed' : 'Standard'}</span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Output Stats:</span>
              <span>{lineCount} lines • {wordCount} words • {charCount} characters</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '12px',
        fontSize: '11px',
        color: isDark ? '#64748b' : '#94a3b8'
      }}>
        <span>⚡ NitroStack MCP Widget</span>
        <span>Markdownify v1.1.0</span>
      </div>
    </div>
  );
}
