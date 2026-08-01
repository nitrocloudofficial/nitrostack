'use client';

import { Message } from '../../shared/interfaces/Message.interface';


export interface MessageDetailsWidgetProps {
  message: Message;
  onClose?: () => void;
  onSelectSuggestedReply?: (replyText: string) => void;
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

export const MessageDetailsWidget: React.FC<MessageDetailsWidgetProps> = ({
  message,
  onClose,
  onSelectSuggestedReply
}) => {
  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '20px',
        padding: '24px',
        width: '100%',
        boxSizing: 'border-box',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>✉️</span>
          <div>
            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Thread Inspector • {message.platform}
            </div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 700 }}>
              {message.subject || 'Direct Message'}
            </h2>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* AI Agent Attribution Banner */}
      <div
        style={{
          background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🤖</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>
            Multi-Agent Analysis Complete
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', padding: '2px 8px', borderRadius: '10px' }}>
            Priority Scored (0.96)
          </span>
          <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '10px' }}>
            Summary Generated
          </span>
          <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '10px' }}>
            Task Extracted
          </span>
        </div>
      </div>

      {/* Grid Split: Conversation & AI Intelligence Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Full Conversation Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            Conversation Stream
          </h4>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={message.sender.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                alt={message.sender.name}
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #38bdf8' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                  {message.sender.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {message.sender.email || message.platform} • {formatTimeString(message.timestamp)}
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {message.content}
            </p>
          </div>
        </div>

        {/* AI Intelligence & Commitment Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            AI Extracted Insights
          </h4>

          {/* AI Executive Summary */}
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              padding: '14px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
              📝 Executive Summary (Summary Agent)
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
              <li>Prof. Vance requires adjustments to Raft consensus timeout parameters in Section 4.2.</li>
              <li>Requested a 15-minute call today at 3:00 PM prior to final project review.</li>
              <li>Commitment detected: Response required before Monday morning.</li>
            </ul>
          </div>

          {/* Extracted Tasks & Deadlines */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '12px',
              padding: '14px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
              📋 Extracted Action Item (Task Agent)
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
              Adjust Raft Consensus Timeout Parameters
            </div>
            <div style={{ fontSize: '11px', color: '#a7f3d0', marginTop: '4px' }}>
              📅 Detected Deadline: Today at 3:00 PM (15:00 UTC)
            </div>
          </div>

          {/* Suggested Quick Reply Chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
              ⚡ Suggested Responses (Reply Agent)
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                "Hi Dr. Vance, I've reviewed Section 4.2 and adjusted the timeouts. 3 PM works perfectly for me!",
                "Hello Professor, I will review the Raft consensus blueprint right now and confirm before our 3 PM meeting."
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestedReply && onSelectSuggestedReply(chip)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  &quot;{chip}&quot;
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
